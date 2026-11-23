import { AGENT_TEAM, JARVIS_CONTROLLER, JARVIS_STAGES } from './catalog.js';

export const GUIDED_TOUR_STEPS = Object.freeze([
  {
    step: 1,
    target: 'jarvis',
    title: 'Meet J.A.R.V.I.S. — The Central AI Brain',
    message:
      'At the center sits J.A.R.V.I.S., the AI Brain of the campus. Right beside my neural core is the CEO Executive Suite—I plan the mission, route tasks to specialists, and deliver executive briefings.'
  },
  {
    step: 2,
    target: 'pipeline',
    title: 'The 4-Stage Microsoft JARVIS Pipeline',
    message:
      'Every request flows through four transparent stages: (1) Task Planning (building a dependency DAG), (2) Model Selection (matching tasks to specialists), (3) Task Execution (parallel & sequential waves), and (4) Response Generation.'
  },
  {
    step: 3,
    target: 'athena',
    title: 'Strategy (Athena), Research (Sage) & UI Design (Iris)',
    message:
      'Independent root tasks run in parallel. Athena frames scope, Sage gathers benchmarks, and Iris crafts the UI design system and user flow.'
  },
  {
    step: 4,
    target: 'nova',
    title: 'Web Dev (Nova), Systems (Vulcan) & Cloud Ops (Orion)',
    message:
      'Nova builds the responsive web frontend alongside Iris, Vulcan engineers backend APIs and logic, and Orion handles CI/CD and deployment readiness.'
  },
  {
    step: 5,
    target: 'vera',
    title: 'Security (Aegis) & Quality Test Assurance (Vera)',
    message:
      'Before anything reaches you, Aegis audits security & trust boundaries and Vera runs QA & regression verification. Then I assemble the final briefing.'
  }
]);

export const PRESET_MISSIONS = Object.freeze([
  {
    id: 'launch-ai-app',
    label: 'Launch an AI SaaS Product',
    prompt: 'Design the architecture, landing page UX, and launch checklist for an AI team workspace app.'
  },
  {
    id: 'api-audit',
    label: 'Audit & Harden a REST API',
    prompt: 'Analyze security risks, refactor bottlenecks, and create a verification plan for a Node.js payment API.'
  },
  {
    id: 'research-brief',
    label: 'Multimodal Agent Research Brief',
    prompt: 'Compare Microsoft JARVIS (HuggingGPT) task planning with modern multi-agent office workflows and summarize key trade-offs.'
  }
]);

/**
 * Generate a helpful J.A.R.V.I.S.-voiced guide answer for user questions.
 * @param {string} rawQuestion
 */
export function answerAsJarvis(rawQuestion) {
  const question = typeof rawQuestion === 'string' ? rawQuestion.trim() : '';
  if (!question) {
    throw new Error('Please enter a question for J.A.R.V.I.S.');
  }

  const lower = question.toLowerCase();

  if (/\b(stage|pipeline|how.*work|hugginggpt|microsoft|jarvis|architecture)\b/.test(lower)) {
    const stageLines = JARVIS_STAGES.map(
      (s) => `${s.order}. **${s.name}**: ${s.description}`
    ).join('\n');
    return {
      speaker: JARVIS_CONTROLLER.name,
      reply: `Certainly. Following Microsoft's JARVIS (HuggingGPT) blueprint, I coordinate the office in four stages:\n${stageLines}\n\nTry launching one of the preset missions below to watch each desk light up in real time.`,
      suggestedPrompts: PRESET_MISSIONS.map((p) => p.prompt)
    };
  }

  if (/\b(team|agent|who|desk|ceo|athena|vulcan|sage|iris|aegis|nova|vera|orion|skill|specialist)\b/.test(lower)) {
    const roster = AGENT_TEAM.map(
      (a) =>
        `- **${a.name}** (${a.role} — ${a.zone}): ${a.bio} Skills: ${(a.skills || []).map((s) => s.name).join(', ')}.`
    ).join('\n');
    return {
      speaker: JARVIS_CONTROLLER.name,
      reply: `Here is our active office roster:\n${roster}\n\nYou can click any specialist desk on the floor plan—or toggle which specialists are invited—before dispatching a mission.`,
      suggestedPrompts: [
        'Which specialist handles security reviews?',
        'Design a dashboard with Vulcan and Iris'
      ]
    };
  }

  if (/\b(api|key|openai|gemini|hugging|model|llm|connect|token)\b/.test(lower)) {
    return {
      speaker: JARVIS_CONTROLLER.name,
      reply:
        'By default, the office runs on the zero-config Local JARVIS Engine so everything works immediately offline. If you wish to connect a live OpenAI-compatible model, set the `OPENAI_API_KEY` (and optional `OPENAI_BASE_URL` / `JARVIS_PLANNER_MODEL`) environment variables before starting the server, or enter a session key in the API Settings drawer (kept strictly in memory, never saved to disk).',
      suggestedPrompts: ['How does the 4-stage pipeline work?']
    };
  }

  return {
    speaker: JARVIS_CONTROLLER.name,
    reply: `At your service. Regarding "${question.slice(0, 100)}": if you would like the full office team to plan, research, engineer, design, and verify this for you, paste it into the **Mission Directive** box above and click **Dispatch Team**. Or ask me about the **4 stages**, the **team roster**, or **connecting live LLM keys**.`,
    suggestedPrompts: PRESET_MISSIONS.map((p) => p.prompt)
  };
}
