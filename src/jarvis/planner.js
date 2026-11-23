import { AGENT_TEAM, getAgentById } from './catalog.js';
import { measureTokenUsage, resolveLlmEndpoint } from './tokens.js';

const MAX_PROMPT_LENGTH = 2000;
const LLM_TIMEOUT_MS = 15000;

/**
 * Validate a planned task graph (unique integer IDs, valid dependencies, no cycles).
 * @param {Array<object>} tasks
 */
export function validateTaskGraph(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('Task plan must contain at least one task.');
  }

  const seenIds = new Set();
  for (const task of tasks) {
    if (!Number.isInteger(task.id) || task.id < 0) {
      throw new Error(`Invalid task id: ${String(task.id)}`);
    }
    if (seenIds.has(task.id)) {
      throw new Error(`Duplicate task id: ${task.id}`);
    }
    seenIds.add(task.id);
    if (!task.title || typeof task.title !== 'string') {
      throw new Error(`Task ${task.id} is missing a title.`);
    }
    if (!Array.isArray(task.dep)) {
      throw new Error(`Task ${task.id} must define a dependency array.`);
    }
  }

  for (const task of tasks) {
    for (const depId of task.dep) {
      if (depId === -1) continue;
      if (!seenIds.has(depId)) {
        throw new Error(`Task ${task.id} depends on unknown task ${depId}.`);
      }
      if (depId === task.id) {
        throw new Error(`Task ${task.id} cannot depend on itself.`);
      }
    }
  }

  // Kahn's topological check to catch cycles
  const inDegree = new Map();
  const dependents = new Map();
  for (const task of tasks) {
    const realDeps = task.dep.filter((id) => id !== -1);
    inDegree.set(task.id, realDeps.length);
    for (const depId of realDeps) {
      if (!dependents.has(depId)) dependents.set(depId, []);
      dependents.get(depId).push(task.id);
    }
  }

  const queue = [];
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(id);
  }

  let visited = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    visited += 1;
    for (const nextId of dependents.get(current) ?? []) {
      const nextDegree = inDegree.get(nextId) - 1;
      inDegree.set(nextId, nextDegree);
      if (nextDegree === 0) queue.push(nextId);
    }
  }

  if (visited !== tasks.length) {
    throw new Error('Task graph contains a dependency cycle.');
  }

  return true;
}

/**
 * Score specialist agents against a task description (HuggingGPT Stage 2: Model Selection).
 * @param {string} taskType
 * @param {string} description
 * @param {string[]} preferredAgents
 */
export function selectBestAgent(taskType, description, preferredAgents = []) {
  const text = `${taskType} ${description}`.toLowerCase();
  const allowed =
    Array.isArray(preferredAgents) && preferredAgents.length > 0
      ? AGENT_TEAM.filter((agent) => preferredAgents.includes(agent.id))
      : AGENT_TEAM;

  const pool = allowed.length > 0 ? allowed : AGENT_TEAM;
  let best = pool[0];
  let bestScore = -1;
  let matchedKeywords = [];

  for (const agent of pool) {
    let score = agent.specialty === taskType ? 5 : 0;
    const hits = [];
    for (const cap of agent.capabilities) {
      if (text.includes(cap)) {
        score += 2;
        hits.push(cap);
      }
    }
    for (const skill of agent.skills ?? []) {
      const skillWords = skill.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
      if (skillWords.some((word) => text.includes(word))) {
        score += 1.5;
        if (!hits.includes(skill.name)) hits.push(skill.name);
      }
    }
    if (score > bestScore) {
      best = agent;
      bestScore = score;
      matchedKeywords = hits;
    }
  }

  const confidence = Math.min(0.99, Number((0.76 + Math.min(bestScore, 8) * 0.028).toFixed(2)));
  const rationale =
    matchedKeywords.length > 0
      ? `Matched specialty "${best.specialty}" and capabilities (${matchedKeywords.join(', ')}).`
      : `Best fit for "${taskType}" workload using ${best.model}.`;

  return {
    agentId: best.id,
    agentName: best.name,
    role: best.role,
    model: best.model,
    hfEquivalent: best.hfEquivalent,
    confidence,
    rationale
  };
}

/**
 * Classify prompt intent so the local planner builds an appropriate multi-agent DAG.
 * @param {string} prompt
 */
function inferDomainSignals(prompt) {
  const lower = prompt.toLowerCase();
  return {
    hasExecutive: /\b(ceo|executive|business|vision|company|budget|launch|approve|strategy|product)\b/.test(
      lower
    ),
    hasWeb: /\b(web|website|html|css|react|frontend|browser|landing|dashboard|app|ui)\b/.test(lower),
    hasCode: /\b(code|api|app|web|script|backend|frontend|bug|test|refactor|server|database|sql|node|python|program)\b/.test(
      lower
    ),
    hasDesign: /\b(ui|ux|design|office|dashboard|landing|visual|layout|brand|mockup|wireframe|color|typography)\b/.test(
      lower
    ),
    hasResearch: /\b(research|analyze|compare|study|report|market|benchmark|summarize|review|audit|strategy|plan)\b/.test(
      lower
    ),
    hasSecurity: /\b(security|auth|audit|compliance|risk|xss|ssrf|csrf|threat|vulnerability|protect)\b/.test(lower),
    hasDevops: /\b(deploy|docker|ci|cd|cloud|infra|monitoring|scale|release)\b/.test(lower)
  };
}

/**
 * Build a deterministic, domain-aware DAG inspired by microsoft/JARVIS task planning.
 * @param {string} prompt
 * @param {object} options
 */
function buildLocalPlan(prompt, options = {}) {
  const preferred = Array.isArray(options.agents) ? options.agents : [];
  const signals = inferDomainSignals(prompt);
  const rawTasks = [];

  // Root task 0: Athena frames scope & requirements
  rawTasks.push({
    id: 0,
    task: 'planning',
    title: 'Scope & Dependency Framing',
    instruction: `Define crisp objectives, constraints, and acceptance criteria for: "${prompt}"`,
    dep: [-1]
  });

  // Root task 1 (parallel with 0): Sage gathers domain context
  rawTasks.push({
    id: 1,
    task: 'research',
    title: 'Domain Research & Benchmarks',
    instruction: `Synthesize relevant patterns, reference architectures, and trade-offs for: "${prompt}"`,
    dep: [-1]
  });

  // Task 2: UI Design when design/web is relevant
  if (signals.hasDesign || signals.hasWeb) {
    rawTasks.push({
      id: rawTasks.length,
      task: 'design',
      title: 'UI Design System & User Flow',
      instruction: `Craft accessible UI wireframes, visual hierarchy, and layout specifications.`,
      dep: [0]
    });
  }

  // Task 3: Backend Programming vs Web Developer
  if (signals.hasCode || !signals.hasDesign) {
    rawTasks.push({
      id: rawTasks.length,
      task: 'coding',
      title: 'Backend Architecture & Core Logic',
      instruction: `Produce modular backend services, API contracts, and clean data flow.`,
      dep: [0, 1]
    });
  }

  if (signals.hasWeb || !signals.hasCode) {
    const depIds = rawTasks.some((t) => t.task === 'design') ? [0, 2] : [0, 1];
    rawTasks.push({
      id: rawTasks.length,
      task: 'webdev',
      title: 'Web Frontend Implementation Spec',
      instruction: `Build responsive browser components, state wiring, and interactive UI flows.`,
      dep: depIds
    });
  }

  // Optional DevOps if requested
  if (signals.hasDevops) {
    rawTasks.push({
      id: rawTasks.length,
      task: 'devops',
      title: 'CI/CD & Deployment Readiness',
      instruction: `Define build checks, container/runtime setup, health telemetry, and rollback plan.`,
      dep: [rawTasks.length - 1]
    });
  }

  // Dedicated Security audit
  rawTasks.push({
    id: rawTasks.length,
    task: 'security',
    title: 'Security & Trust-Boundary Audit',
    instruction: `Verify input validation, auth boundaries, SSRF/XSS protection, and secrets safety.`,
    dep: rawTasks.slice(1).map((t) => t.id)
  });

  // Dedicated QA Sign-Off
  const qaDeps = rawTasks.slice(1).map((t) => t.id);
  rawTasks.push({
    id: rawTasks.length,
    task: 'qa',
    title: 'Quality Assurance & Test Sign-Off',
    instruction: `Verify unit, integration, boundary, and regression coverage across all deliverables.`,
    dep: qaDeps.length > 0 ? qaDeps : [0]
  });

  if (signals.hasExecutive) {
    rawTasks.push({
      id: rawTasks.length,
      task: 'executive',
      title: 'CEO Executive Review & Approval',
      instruction: `Align final deliverables with business vision, priorities, and executive sign-off.`,
      dep: [rawTasks.length - 1]
    });
  }

  // Stage 2: Model / Agent Selection for each planned node
  const tasks = rawTasks.map((node) => {
    const selection = selectBestAgent(node.task, `${node.title} ${node.instruction}`, preferred);
    return {
      ...node,
      agentId: selection.agentId,
      selection,
      status: 'pending',
      output: null,
      durationMs: 0
    };
  });

  validateTaskGraph(tasks);
  return {
    mode: 'local-jarvis',
    tasks
  };
}

/**
 * Optionally invoke an OpenAI-compatible chat endpoint for Stage 1 planning.
 * Falls back cleanly to local planning if no key is provided or the call fails.
 * @param {string} prompt
 * @param {object} options
 */
async function tryExternalLlmPlan(prompt, options = {}) {
  const endpoint = resolveLlmEndpoint(
    options,
    process.env.JARVIS_PLANNER_MODEL || 'gpt-4o-mini'
  );
  if (!endpoint) return null;

  const { apiKey, baseUrl, model } = endpoint;

  const rosterSummary = AGENT_TEAM.map(
    (a) =>
      `${a.id} (${a.role}, specialty=${a.specialty}, skills=${(a.skills || []).map((s) => s.name).join(',')})`
  ).join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  const systemPrompt =
    'You are J.A.R.V.I.S. (Microsoft HuggingGPT style AI Brain task planner). Return JSON: {"tasks":[{"id":0,"task":"executive|planning|research|coding|webdev|design|security|qa|devops","title":"...","instruction":"...","dep":[-1],"agentId":"ceo|athena|sage|vulcan|nova|iris|aegis|vera|orion"}]}. Create 4 to 7 non-cyclic tasks.\nOffice Roster:\n' +
    rosterSummary;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!res.ok) {
      throw new Error(`LLM planner responded with HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('Empty response from LLM planner.');
    }

    const parsed = JSON.parse(rawContent);
    if (!Array.isArray(parsed?.tasks)) {
      throw new Error('LLM planner JSON did not include a tasks array.');
    }

    const preferred = Array.isArray(options.agents) ? options.agents : [];
    const normalized = parsed.tasks.slice(0, 6).map((item, idx) => {
      const id = Number.isInteger(item.id) ? item.id : idx;
      const dep = Array.isArray(item.dep) && item.dep.length > 0 ? item.dep : [-1];
      const taskType = typeof item.task === 'string' ? item.task : 'planning';
      const title = typeof item.title === 'string' ? item.title.slice(0, 100) : `Task ${id}`;
      const instruction =
        typeof item.instruction === 'string' ? item.instruction.slice(0, 600) : prompt;

      const explicitAgent =
        typeof item.agentId === 'string' &&
        getAgentById(item.agentId) &&
        (preferred.length === 0 || preferred.includes(item.agentId))
          ? getAgentById(item.agentId)
          : null;

      const selection = explicitAgent
        ? {
            agentId: explicitAgent.id,
            agentName: explicitAgent.name,
            role: explicitAgent.role,
            model: `${model} via ${explicitAgent.role}`,
            hfEquivalent: explicitAgent.hfEquivalent,
            confidence: 0.92,
            rationale: `Assigned directly by J.A.R.V.I.S. LLM planner (${model}).`
          }
        : selectBestAgent(taskType, `${title} ${instruction}`, preferred);

      return {
        id,
        task: taskType,
        title,
        instruction,
        dep,
        agentId: selection.agentId,
        selection,
        status: 'pending',
        output: null,
        durationMs: 0
      };
    });

    validateTaskGraph(normalized);
    return {
      mode: 'llm-hybrid',
      model,
      tokenUsage: measureTokenUsage(data?.usage, `${systemPrompt}\n${prompt}`, rawContent),
      tasks: normalized
    };
  } catch (err) {
    return { fallbackReason: err.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Plan a mission (Stages 1 & 2 of microsoft/JARVIS).
 * @param {string} prompt
 * @param {object} options
 */
export async function planMission(prompt, options = {}) {
  const trimmed = typeof prompt === 'string' ? prompt.trim() : '';
  if (!trimmed) {
    throw new Error('Mission prompt is required.');
  }
  if (trimmed.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Mission prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters.`);
  }

  const external = options.useExternalLlm !== false ? await tryExternalLlmPlan(trimmed, options) : null;
  if (external && Array.isArray(external.tasks)) {
    return {
      mode: external.mode,
      model: external.model,
      fallbackNotice: null,
      tokenUsage: external.tokenUsage,
      tasks: external.tasks
    };
  }

  const local = buildLocalPlan(trimmed, options);
  return {
    mode: local.mode,
    model: 'jarvis-local-planner-v1',
    fallbackNotice: external?.fallbackReason
      ? `External LLM planner unavailable (${external.fallbackReason}); executed with Local JARVIS Engine.`
      : null,
    tokenUsage: measureTokenUsage(null, trimmed, local.tasks),
    tasks: local.tasks
  };
}
