import { getAgentById } from './catalog.js';
import { planMission } from './planner.js';
import { saveMissionArtifacts } from './storage.js';
import { computeMissionTokenUsage, measureTokenUsage, resolveLlmEndpoint } from './tokens.js';

const MAX_CONCURRENT_TASKS = 3;
const DEFAULT_STEP_DELAY_MS = 450;

function delay(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

/**
 * Generate structured domain output for a specialist agent in Local JARVIS Mode.
 * @param {object} task
 * @param {string} prompt
 * @param {Array<object>} upstreamOutputs
 */
function synthesizeSpecialistOutput(task, prompt, upstreamOutputs) {
  const agent = getAgentById(task.agentId);
  const depSummary =
    upstreamOutputs.length > 0
      ? `Built upon ${upstreamOutputs.map((u) => `#${u.id} (${u.agentName})`).join(', ')}.`
      : 'Root task initiated directly from user briefing.';

  switch (agent?.specialty) {
    case 'executive':
      return {
        headline: 'CEO Executive Vision & Final Sign-Off',
        summary: `Reviewed all team outputs with J.A.R.V.I.S. Brain and approved strategic alignment. ${depSummary}`,
        deliverables: [
          'Executive Direction: Prioritized high-impact deliverables and user clarity.',
          'Resource Approval: Confirmed engineering, UI, security, and QA alignment.',
          'CEO Sign-Off: Approved for release and stakeholder presentation.'
        ]
      };
    case 'planning':
      return {
        headline: `Mission Scope & Milestones for "${prompt.slice(0, 72)}${prompt.length > 72 ? '...' : ''}"`,
        summary: `Defined 3 execution phases, clear scope boundaries, and dependency handoffs. ${depSummary}`,
        deliverables: [
          'Objective: Deliver a structured, verifiable solution aligned with the user prompt.',
          'Constraints: Modular separation of responsibilities, clear contracts, and explicit failure handling.',
          'Success Criteria: Every specialist deliverable passes Aegis QA & risk verification.'
        ]
      };
    case 'research':
      return {
        headline: 'Comparative Findings & Reference Patterns',
        summary: `Evaluated best-fit patterns and HuggingGPT-style specialist routing for the request. ${depSummary}`,
        deliverables: [
          'Pattern Check: Separate orchestration (controller) from domain execution (specialists).',
          'Trade-off Note: Parallelize independent research/framing tasks before downstream build.',
          'Benchmark Signal: Include measurable acceptance checks and fallback paths.'
        ]
      };
    case 'coding':
      return {
        headline: 'Backend Systems & API Architecture',
        summary: `Drafted clean module boundaries, API/interface contracts, and error-safe backend flow. ${depSummary}`,
        deliverables: [
          'Backend Contract: Controller -> DAG Scheduler -> Isolated Specialist Workers.',
          'Boundary Validation: Reject malformed inputs early; bound concurrency and timeouts.',
          'Observability: Emit structured stage events for real-time 3D office telemetry.'
        ]
      };
    case 'webdev':
      return {
        headline: 'Web Frontend & Interactive Implementation',
        summary: `Structured responsive web components, state management, and SSE event wiring. ${depSummary}`,
        deliverables: [
          'Frontend Architecture: Modular ES modules with accessible semantic HTML & responsive CSS.',
          'Real-time Sync: EventSource stream driving 3D campus animations and live chat state.',
          'Browser Safety: Strict textContent rendering (zero raw HTML injection) and keyboard parity.'
        ]
      };
    case 'design':
      return {
        headline: 'UI Design System & User Experience Flow',
        summary: `Designed clear visual hierarchy, contrast tokens, and progressive disclosure. ${depSummary}`,
        deliverables: [
          'Design System: Cohesive dark-HUD palette, semantic spacing, and readable typography.',
          'User Journey: Guided onboarding, 3D visual feedback, and 1-click specialist inspection.',
          'Accessibility: WCAG AA contrast, focus rings, and prefers-reduced-motion support.'
        ]
      };
    case 'security':
      return {
        headline: 'Cybersecurity & Trust-Boundary Audit',
        summary: `Evaluated ${upstreamOutputs.length} upstream deliverables for injection, SSRF, XSS, and secrets exposure.`,
        deliverables: [
          'SSRF & Input Defense: Enforce URL allowlists, schema limits, and strict MIME headers.',
          'Auth & Secrets: Keep session keys memory-only; never log or persist credentials.',
          'Hardening Status: Security gates verified prior to QA sign-off.'
        ]
      };
    case 'devops':
      return {
        headline: 'CI/CD Pipeline & Deployment Readiness',
        summary: `Defined reproducible startup, health endpoints, and safe rollback steps. ${depSummary}`,
        deliverables: [
          'Health Telemetry: Expose /api/health with active mission counts and readiness checks.',
          'Zero-Downtime Rollback: Stateless modular deploy with bounded in-memory retention.',
          'Automation: Automated syntax + unit + API test gates before release.'
        ]
      };
    case 'qa':
    case 'verification':
    default:
      return {
        headline: 'Quality Test Assurance (QA) Sign-Off',
        summary: `Verified ${upstreamOutputs.length} upstream deliverables across edge cases, boundaries, and regressions.`,
        deliverables: [
          'Test Coverage: Unit tests for logic/cycles + integration tests for HTTP contracts and errors.',
          'Boundary Matrix: Verified empty payloads, invalid IDs, pagination cursors, and timeouts.',
          'QA Verdict: All acceptance checks passed for J.A.R.V.I.S. final briefing.'
        ]
      };
  }
}

/**
 * Optionally execute a single specialist task against an OpenAI-compatible endpoint.
 * @param {object} task
 * @param {string} prompt
 * @param {Array<object>} upstreamOutputs
 * @param {object} options
 */
async function runTaskWithOptionalLlm(task, prompt, upstreamOutputs, options) {
  const endpoint = resolveLlmEndpoint(options, process.env.JARVIS_WORKER_MODEL || 'gpt-4o-mini');
  const contextText = upstreamOutputs
    .map((u) => `Task #${u.id} (${u.agentName}): ${u.output.summary} | ${u.output.deliverables.join('; ')}`)
    .join('\n');
  const userPromptText = `Mission: ${prompt}\nYour Task (#${task.id} - ${task.title}): ${task.instruction}\nUpstream Context:\n${contextText || 'None'}`;

  if (!endpoint) {
    const output = synthesizeSpecialistOutput(task, prompt, upstreamOutputs);
    return {
      output,
      tokenUsage: measureTokenUsage(null, userPromptText, output)
    };
  }

  const { apiKey, baseUrl, model } = endpoint;
  const agent = getAgentById(task.agentId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const systemText = `You are ${agent?.name ?? 'Specialist'}, ${agent?.role ?? 'AI Specialist'} in J.A.R.V.I.S.'s AI Office. Return JSON: {"headline":"...","summary":"...","deliverables":["...","...","..."]}. Keep items concise and concrete.`;

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
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemText },
          { role: 'user', content: userPromptText }
        ]
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(rawContent);
    if (typeof parsed.summary === 'string' && Array.isArray(parsed.deliverables)) {
      const output = {
        headline: typeof parsed.headline === 'string' ? parsed.headline : task.title,
        summary: parsed.summary,
        deliverables: parsed.deliverables.slice(0, 5).map(String)
      };
      return {
        output,
        tokenUsage: measureTokenUsage(data?.usage, `${systemText}\n${userPromptText}`, rawContent)
      };
    }
  } catch {
    // Graceful local specialist fallback on external worker timeout/error
  } finally {
    clearTimeout(timer);
  }

  const fallbackOutput = synthesizeSpecialistOutput(task, prompt, upstreamOutputs);
  return {
    output: fallbackOutput,
    tokenUsage: measureTokenUsage(null, userPromptText, fallbackOutput)
  };
}

/**
 * Build Stage 4 J.A.R.V.I.S. executive response and guided follow-up prompts.
 * @param {object} mission
 */
function buildJarvisBriefing(mission) {
  const completed = mission.tasks.filter((t) => t.status === 'completed');
  const totalMs = completed.reduce((acc, t) => acc + (t.durationMs || 0), 0);

  const highlights = completed.map((task) => {
    const agent = getAgentById(task.agentId);
    return `- **${agent?.name ?? task.agentId} (${task.title})**: ${task.output?.summary ?? 'Completed.'}`;
  });

  const allDeliverables = completed.flatMap((task) =>
    (task.output?.deliverables ?? []).map((item) => ({
      agentId: task.agentId,
      agentName: task.selection?.agentName ?? task.agentId,
      taskTitle: task.title,
      item
    }))
  );

  const summary = [
    `Mission complete, sir/ma'am. I orchestrated ${completed.length} specialist tasks across the office (cumulative specialist work: ${totalMs}ms).`,
    '',
    '### Team Contributions',
    ...highlights
  ].join('\n');

  const guidedNextSteps = [
    'Ask Vulcan to generate concrete starter code or API schemas from this blueprint.',
    'Ask Aegis to stress-test edge cases, security assumptions, and failure recovery.',
    'Click any specialist desk in the office map to inspect their individual reasoning and deliverables.'
  ];

  return {
    headline: `J.A.R.V.I.S. Briefing: ${mission.prompt.slice(0, 64)}${mission.prompt.length > 64 ? '...' : ''}`,
    summary,
    deliverables: allDeliverables,
    guidedNextSteps
  };
}

/**
 * Execute all 4 microsoft/JARVIS stages on a mission object and emit live progress events.
 * @param {object} mission
 * @param {Function} emitEvent
 * @param {object} options
 */
export async function runMissionPipeline(mission, emitEvent = () => {}, options = {}) {
  const stepDelayMs = Number.isFinite(options.stepDelayMs) ? options.stepDelayMs : DEFAULT_STEP_DELAY_MS;

  const pushLog = (stage, message, meta = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      stage,
      message,
      ...meta
    };
    mission.logs.push(entry);
    emitEvent('log', entry);
  };

  try {
    // Stage 1: Task Planning
    mission.status = 'running';
    mission.currentStage = 'task-planning';
    emitEvent('stage', { stage: 'task-planning', status: 'active' });
    pushLog('task-planning', 'J.A.R.V.I.S. is decomposing your prompt into a dependency graph...');
    await delay(stepDelayMs);

    const plan = await planMission(mission.prompt, options);
    mission.mode = plan.mode;
    mission.plannerModel = plan.model;
    mission.plannerTokenUsage = plan.tokenUsage;
    mission.fallbackNotice = plan.fallbackNotice;
    mission.tasks = plan.tasks;

    if (plan.fallbackNotice) {
      pushLog('task-planning', plan.fallbackNotice, { level: 'warn' });
    }
    pushLog('task-planning', `Planned ${mission.tasks.length} tasks with verified acyclic dependencies.`, {
      taskCount: mission.tasks.length
    });
    emitEvent('plan', { tasks: mission.tasks, mode: mission.mode, fallbackNotice: mission.fallbackNotice });

    // Stage 2: Model / Agent Selection
    mission.currentStage = 'model-selection';
    emitEvent('stage', { stage: 'model-selection', status: 'active' });
    pushLog('model-selection', 'Matching each sub-task to the optimal office specialist & model profile...');
    await delay(stepDelayMs);

    for (const task of mission.tasks) {
      pushLog(
        'model-selection',
        `Assigned Task #${task.id} "${task.title}" -> ${task.selection.agentName} (${task.selection.model}, confidence ${Math.round(task.selection.confidence * 100)}%)`,
        { taskId: task.id, agentId: task.agentId }
      );
    }

    // Stage 3: Task Execution (Topological DAG waves, bounded concurrency)
    mission.currentStage = 'task-execution';
    emitEvent('stage', { stage: 'task-execution', status: 'active' });
    pushLog('task-execution', 'Dispatching tasks to office desks in topological order...');

    const taskById = new Map(mission.tasks.map((t) => [t.id, t]));
    const completedIds = new Set();

    while (completedIds.size < mission.tasks.length) {
      const readyTasks = mission.tasks.filter(
        (task) =>
          task.status === 'pending' &&
          task.dep.every((depId) => depId === -1 || completedIds.has(depId))
      );

      if (readyTasks.length === 0) {
        throw new Error('Scheduler stalled: unresolved task dependencies.');
      }

      const wave = readyTasks.slice(0, MAX_CONCURRENT_TASKS);
      await Promise.all(
        wave.map(async (task) => {
          const startedAt = Date.now();
          task.status = 'running';
          emitEvent('task', {
            taskId: task.id,
            agentId: task.agentId,
            status: 'running',
            title: task.title
          });
          pushLog(
            'task-execution',
            `${task.selection.agentName} started Task #${task.id}: "${task.title}".`,
            { taskId: task.id, agentId: task.agentId }
          );

          await delay(stepDelayMs + Math.min(350, task.id * 90));

          const upstreamOutputs = task.dep
            .filter((depId) => depId !== -1)
            .map((depId) => taskById.get(depId))
            .filter(Boolean)
            .map((u) => ({
              id: u.id,
              agentName: u.selection.agentName,
              output: u.output
            }));

          const execResult = await runTaskWithOptionalLlm(task, mission.prompt, upstreamOutputs, options);
          task.output = execResult.output;
          task.tokenUsage = execResult.tokenUsage;
          task.durationMs = Date.now() - startedAt;
          task.status = 'completed';
          completedIds.add(task.id);

          emitEvent('task', {
            taskId: task.id,
            agentId: task.agentId,
            status: 'completed',
            title: task.title,
            output: task.output,
            durationMs: task.durationMs
          });
          pushLog(
            'task-execution',
            `${task.selection.agentName} completed Task #${task.id} in ${task.durationMs}ms.`,
            { taskId: task.id, agentId: task.agentId }
          );
        })
      );
    }

    // Stage 4: Response Generation
    mission.currentStage = 'response-generation';
    emitEvent('stage', { stage: 'response-generation', status: 'active' });
    pushLog('response-generation', 'J.A.R.V.I.S. is synthesizing specialist outputs into your briefing...');
    await delay(Math.round(stepDelayMs * 0.7));

    mission.tokenUsage = computeMissionTokenUsage(mission, options.budgetTokens);
    mission.finalResponse = buildJarvisBriefing(mission);
    mission.completedAt = new Date().toISOString();

    if (options.missionsDir) {
      const saved = await saveMissionArtifacts(
        { ...mission, status: 'completed' },
        options.missionsDir
      );
      if (saved) {
        mission.outputFolder = saved.relativeFolder;
        mission.savedFiles = saved.savedFiles;
      }
    }

    mission.status = 'completed';

    pushLog(
      'response-generation',
      `Briefing ready (${mission.tokenUsage.totalTokens} tokens, ${mission.tokenUsage.budgetPercent}% of budget).`
    );
    emitEvent('completed', {
      missionId: mission.id,
      status: mission.status,
      tokenUsage: mission.tokenUsage,
      outputFolder: mission.outputFolder || null,
      finalResponse: mission.finalResponse
    });
  } catch (err) {
    mission.status = 'failed';
    mission.error = err.message;
    mission.completedAt = new Date().toISOString();
    pushLog('error', `Pipeline halted: ${err.message}`, { level: 'error' });
    emitEvent('error', { missionId: mission.id, message: err.message });
  }

  return mission;
}
