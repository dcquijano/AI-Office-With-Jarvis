import { getAgentById, JARVIS_CONTROLLER } from './catalog.js';
import { measureTokenUsage, resolveLlmEndpoint } from './tokens.js';

const MAX_CHAT_LENGTH = 1000;
const LLM_TIMEOUT_MS = 15000;

const AGENT_PERSONAS = Object.freeze({
  jarvis: {
    style: 'Composed, witty, attentive Central AI Brain and systems orchestrator',
    specialty: 'acting as the central AI brain, planning the 4-stage pipeline, routing tasks, and advising the CEO'
  },
  ceo: {
    style: 'Decisive, inspiring Chief Executive Officer focused on vision, product impact, and high-level execution',
    specialty: 'company vision, business priorities, executive sign-off, and partnering with J.A.R.V.I.S. Brain'
  },
  athena: {
    style: 'Decisive, clear-headed strategist who likes crisp plans and measurable milestones',
    specialty: 'product roadmapping, breaking down goals, and sequencing work'
  },
  sage: {
    style: 'Curious, analytical researcher who connects patterns and evidence concisely',
    specialty: 'technical research, benchmarking, and clear documentation'
  },
  vulcan: {
    style: 'Hands-on, pragmatic backend & systems programmer who thinks in APIs, databases, and performance',
    specialty: 'backend architecture, Node.js/Python, SQL tuning, and debugging'
  },
  nova: {
    style: 'Energetic full-stack web developer obsessed with fast, responsive, interactive browser apps',
    specialty: 'HTML/CSS/JS, React/TypeScript, 3D canvas, and REST/SSE wiring'
  },
  iris: {
    style: 'Observant, empathetic UI/UX designer focused on visual hierarchy, typography, and WCAG accessibility',
    specialty: 'UI design systems, wireframes, color craft, and interactive flows'
  },
  aegis: {
    style: 'Calm, thorough cybersecurity specialist who audits trust boundaries before anything ships',
    specialty: 'threat modeling, auth & access control, and SSRF/XSS/injection defense'
  },
  vera: {
    style: 'Detail-oriented Quality Test Assurance (QA) lead who hunts regressions and edge cases',
    specialty: 'unit, integration, and E2E testing, bug triage, and boundary verification'
  },
  orion: {
    style: 'Steady DevOps & Cloud automation engineer who keeps builds green and deploys reliable',
    specialty: 'CI/CD pipelines, Docker containers, observability, and rollbacks'
  }
});

function detectMoveIntent(lower) {
  if (/\b(swim|swimming|pool|lap|laps|dive)\b/.test(lower)) {
    return { moveTo: 'swim', zoneLabel: 'Swimming Pool' };
  }
  if (/\b(basketball|bball|hoop|dunk|3-pointer|dribble|shoot)\b/.test(lower)) {
    return { moveTo: 'basketball', zoneLabel: 'Basketball Court' };
  }
  if (/\b(soccer|futsal|football|goal|pitch|kick)\b/.test(lower)) {
    return { moveTo: 'soccer', zoneLabel: 'Soccer Pitch' };
  }
  if (/\b(ping\s*pong|pingpong|table tennis|tennis)\b/.test(lower)) {
    return { moveTo: 'pingpong', zoneLabel: 'Ping-Pong Deck' };
  }
  if (/\b(dance|dancing|party|disco|dj|club|music)\b/.test(lower)) {
    return { moveTo: 'dance', zoneLabel: 'Dance Floor' };
  }
  if (/\b(bar|drink|drinks|cocktail|mocktail|soda|juice|beer|wine|cheers)\b/.test(lower)) {
    return { moveTo: 'bar', zoneLabel: 'Drinks Bar' };
  }
  if (/\b(coffee|espresso|latte|cafe|tea|break|relax|sofa|lounge)\b/.test(lower)) {
    return { moveTo: 'coffee', zoneLabel: 'Coffee Cafe' };
  }
  if (/\b(gym|workout|work out|treadmill|weights|lift|run|exercise)\b/.test(lower)) {
    return { moveTo: 'gym', zoneLabel: 'Fitness Gym' };
  }
  if (/\b(pickleball|court|play|match|rally|paddle)\b/.test(lower)) {
    return { moveTo: 'pickleball', zoneLabel: 'Pickleball Court' };
  }
  if (/\b(work|computer|desk|code|back to work|pc|office|focus)\b/.test(lower)) {
    return { moveTo: 'computer', zoneLabel: 'Computer Desk' };
  }
  return null;
}

function buildNaturalLocalReply(agent, persona, message, options) {
  const lower = message.toLowerCase();
  const activity = options.activity || 'On Campus';
  const history = Array.isArray(options.history) ? options.history : [];
  const mission = options.mission || null;
  const moveIntent = agent.id === 'jarvis' ? null : detectMoveIntent(lower);

  if (moveIntent) {
    const zoneText = {
      swim: `Heading to the Swimming Pool now! Nothing beats a few freestyle laps to reset focus.`,
      basketball: `Walking over to the Basketball Court! Watch me sink a three-pointer from the arc.`,
      soccer: `Heading to the Soccer Pitch! Ready to pass and score a few goals.`,
      pingpong: `Heading over to the Ping-Pong Deck for a fast table tennis rally!`,
      pickleball: `Heading to the Pickleball Court now! Grabbing a paddle—watch out for my cross-court dink.`,
      gym: `Walking over to the Fitness Gym for a quick workout reset. Keeps focus sharp!`,
      coffee: `Heading to the Coffee Cafe for an espresso—ping me anytime you need my ${persona.specialty}.`,
      bar: `Walking over to the Drinks Bar now! Grabbing a cold drink—cheers!`,
      dance: `Heading straight to the Neon Dance Floor! Time to celebrate with some music!`,
      computer: `Heading right back to my ${agent.zone || 'Office'} computer! Drop your task or specs and let's go.`
    };
    return {
      reply: zoneText[moveIntent.moveTo] || `Heading over to the ${moveIntent.zoneLabel} now!`,
      action: moveIntent
    };
  }

  // Skills / Team Collaboration inquiry
  if (/\b(skill|skills|can you do|good at|specialty|collaborat|team|partner|work with)\b/.test(lower)) {
    const skillNames = (agent.skills || []).map((s) => `${s.name} (${s.level})`).join(', ');
    const partnerNames = (agent.collaboratesWith || [])
      .map((id) => getAgentById(id)?.name || id)
      .join(', ');
    return {
      reply: `My core skills are ${skillNames || persona.specialty}. On team missions I collaborate most closely with ${partnerNames || 'the whole office'}—for instance handing off specs and verifying work together.`,
      action: null
    };
  }

  if (/^(hi|hello|hey|yo|sup|good morning|good afternoon|how are you|what'?s up)\b/.test(lower)) {
    const locationLine =
      activity === 'On Campus' || activity === 'Ready'
        ? `I'm in the ${agent.zone || 'Command Core'}`
        : `I'm currently ${activity.toLowerCase()}`;
    return {
      reply: `Hey! ${locationLine}. As ${agent.role || agent.title}, I specialize in ${persona.specialty}. What would you like to work on, or should I hit the pickleball court?`,
      action: null
    };
  }

  if (/\b(doing|where are you|status|busy|free)\b/.test(lower)) {
    const missionNote = mission
      ? ` Most recently we handled "${mission.prompt.slice(0, 50)}".`
      : ' No active mission right now, so I am recharging on campus.';
    return {
      reply: `Right now I'm ${activity.toLowerCase()}.${missionNote} Want me at my computer or on the pickleball court?`,
      action: null
    };
  }

  const turnCount = history.filter((m) => m.role === 'user').length;
  const missionTasks = (mission?.tasks ?? []).filter((t) =>
    agent.id === 'jarvis' ? true : t.agentId === agent.id
  );

  if (mission && missionTasks.length > 0 && /\b(mission|task|plan|result|output|brief|this)\b/.test(lower)) {
    const latest = missionTasks[missionTasks.length - 1];
    if (agent.id === 'jarvis') {
      return {
        reply: `On "${mission.prompt.slice(0, 60)}", ${mission.tasks.filter((t) => t.status === 'completed').length}/${mission.tasks.length} tasks finished (${mission.status}). Click any specialist card to inspect their deliverables or ask follow-ups.`,
        action: null
      };
    }
    return {
      reply: `My contribution was Task #${latest.id} ("${latest.title}"): ${latest.output?.summary || latest.instruction} Want me to refine anything in that output?`,
      action: null
    };
  }

  const followUpTag = turnCount > 0 ? 'Following up on that: ' : '';
  const tailored = {
    jarvis: `${followUpTag}As the office AI Brain, I can route "${message.slice(0, 65)}" across the CEO and all 8 specialists—just enter it in Mission Directive above.`,
    ceo: `${followUpTag}Looking at "${message.slice(0, 60)}" from the executive desk next to J.A.R.V.I.S.: let's prioritize user impact, keep scope sharp, and get Security + QA sign-off before launch.`,
    athena: `${followUpTag}For "${message.slice(0, 60)}", I'd define clear milestones first, run Iris (UI) and Sage (Research) in parallel, then hand off to Nova and Vulcan.`,
    sage: `${followUpTag}Looking at "${message.slice(0, 60)}", I'd benchmark two proven patterns on complexity and latency before Nova or Vulcan writes code.`,
    vulcan: `${followUpTag}On "${message.slice(0, 60)}", I'll keep backend boundaries clean—typed contracts, bounded concurrency, and zero silent errors—while pairing with Nova on the API.`,
    nova: `${followUpTag}For "${message.slice(0, 60)}", I can wire up responsive HTML/CSS/JS components and real-time SSE updates right alongside Iris's UI design tokens.`,
    iris: `${followUpTag}Looking at "${message.slice(0, 60)}", I'd prioritize clear visual hierarchy, high-contrast WCAG AA controls, and smooth feedback before Nova builds it.`,
    aegis: `${followUpTag}Before shipping "${message.slice(0, 60)}", I audit input boundaries, SSRF/XSS vectors, auth checks, and make sure zero secrets touch logs or client code.`,
    vera: `${followUpTag}For "${message.slice(0, 60)}", I'll build unit and integration tests covering happy paths, empty/malformed inputs, and regression edge cases before sign-off.`,
    orion: `${followUpTag}On "${message.slice(0, 60)}", I'll automate CI checks, health probes, and a one-step rollback path so every deploy stays boring and safe.`
  };

  return {
    reply: tailored[agent.id] || `Got it — let's tackle "${message.slice(0, 80)}".`,
    action: null
  };
}

/**
 * Have a direct 1-on-1 conversation with J.A.R.V.I.S. or any office specialist.
 * @param {string} agentId
 * @param {string} rawMessage
 * @param {object} options
 */
export async function chatWithAgent(agentId, rawMessage, options = {}) {
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : '';
  if (!message) {
    throw new Error('Message is required.');
  }
  if (message.length > MAX_CHAT_LENGTH) {
    throw new Error(`Message must not exceed ${MAX_CHAT_LENGTH} characters.`);
  }

  const agent = agentId === 'jarvis' ? JARVIS_CONTROLLER : getAgentById(agentId);
  if (!agent) {
    const err = new Error(`Unknown agent "${agentId}".`);
    err.statusCode = 404;
    throw err;
  }

  const persona = AGENT_PERSONAS[agent.id] || AGENT_PERSONAS.jarvis;
  const moveIntent = agent.id === 'jarvis' ? null : detectMoveIntent(message.toLowerCase());
  const endpoint = resolveLlmEndpoint(options, process.env.JARVIS_WORKER_MODEL || 'gpt-4o-mini');

  if (endpoint) {
    const { apiKey, baseUrl, model } = endpoint;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    try {
      const historyMsgs = Array.isArray(options.history)
        ? options.history
            .slice(-8)
            .filter(
              (h) =>
                h &&
                (h.role === 'user' || h.role === 'assistant' || h.role === 'agent') &&
                typeof h.text === 'string'
            )
            .map((h) => ({
              role: h.role === 'user' ? 'user' : 'assistant',
              content: h.text.slice(0, 400)
            }))
        : [];

      const skillList = (agent.skills || []).map((s) => s.name).join(', ');
      const missionContext = options.mission
        ? `Current mission: "${options.mission.prompt}" (status: ${options.mission.status}).`
        : 'No mission running right now.';
      const activityContext = options.activity
        ? `You are currently ${options.activity} on the 3D AI Office & Wellness Campus.`
        : '';
      const sysPrompt = `You are ${agent.name} (${agent.role || agent.title}). Personality: ${persona.style}. Skills: ${skillList}. ${activityContext} ${missionContext} Speak naturally in 1-3 sentences.`;

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          messages: [
            { role: 'system', content: sysPrompt },
            ...historyMsgs,
            { role: 'user', content: message }
          ]
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();
        if (reply) {
          return {
            agentId: agent.id,
            agentName: agent.name,
            role: agent.role || agent.title,
            mode: 'llm-hybrid',
            reply,
            action: moveIntent,
            tokenUsage: measureTokenUsage(data?.usage, `${sysPrompt}\n${message}`, reply),
            timestamp: new Date().toISOString()
          };
        }
      }
    } catch {
      // Fall back cleanly to local conversational engine
    } finally {
      clearTimeout(timer);
    }
  }

  const local = buildNaturalLocalReply(agent, persona, message, options);
  return {
    agentId: agent.id,
    agentName: agent.name,
    role: agent.role || agent.title,
    mode: 'local-jarvis',
    reply: local.reply,
    action: local.action,
    tokenUsage: measureTokenUsage(null, message, local.reply),
    timestamp: new Date().toISOString()
  };
}
