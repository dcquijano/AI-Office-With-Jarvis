/**
 * Office roster, desk geometry, agent skills, collaborations, and Microsoft JARVIS stages.
 */

export const JARVIS_STAGES = Object.freeze([
  {
    id: 'task-planning',
    order: 1,
    name: 'Task Planning',
    shortName: 'Plan',
    description:
      'J.A.R.V.I.S. decomposes your request into atomic sub-tasks and resolves execution dependencies (DAG).'
  },
  {
    id: 'model-selection',
    order: 2,
    name: 'Model Selection',
    shortName: 'Select',
    description:
      'J.A.R.V.I.S. matches each sub-task to the best specialist agent, skill set, and model profile.'
  },
  {
    id: 'task-execution',
    order: 3,
    name: 'Task Execution',
    shortName: 'Execute',
    description:
      'Specialists execute tasks across office computers in topological waves, passing outputs downstream.'
  },
  {
    id: 'response-generation',
    order: 4,
    name: 'Response Generation',
    shortName: 'Synthesize',
    description:
      'J.A.R.V.I.S. integrates all specialist results into an executive briefing and guided next steps.'
  }
]);

export const DEPARTMENTS = Object.freeze([
  {
    id: 'executive',
    name: 'Executive & AI Core Dept',
    shortName: 'Executive',
    accent: '#fbbf24',
    focus: { x: 1.4, y: 0.0, zoom: 1.45 },
    description: 'Central J.A.R.V.I.S. AI Brain Core, CEO Executive Suite, and Glass Boardroom.'
  },
  {
    id: 'engineering',
    name: 'Software Engineering Dept',
    shortName: 'Engineering',
    accent: '#22d3ee',
    focus: { x: 1.2, y: -9.5, zoom: 1.45 },
    description: 'Dedicated north wing housing Systems/Backend (Vulcan) and Web/Frontend (Nova).'
  },
  {
    id: 'design-qa',
    name: 'Design & QA Assurance Dept',
    shortName: 'Design & QA',
    accent: '#f472b6',
    focus: { x: 1.2, y: 9.5, zoom: 1.45 },
    description: 'Dedicated south wing housing UI/UX Design Studio (Iris) and QA Verification Lab (Vera).'
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure & Security Dept',
    shortName: 'Infra & Sec',
    accent: '#60a5fa',
    focus: { x: -14.8, y: -7.5, zoom: 1.45 },
    description: 'West cyber-ops wing housing the Server & Compute Vault, Security Ops (Aegis), and DevOps (Orion).'
  },
  {
    id: 'strategy',
    name: 'Strategy, Research & Lobby Dept',
    shortName: 'Strategy',
    accent: '#a78bfa',
    focus: { x: -14.8, y: 7.5, zoom: 1.45 },
    description: 'West strategy wing with Reception Lobby, Strategy & Product (Athena), and Research Library (Sage).'
  },
  {
    id: 'wellness',
    name: 'Wellness, Sports & Lounge Dept',
    shortName: 'Wellness',
    accent: '#34d399',
    focus: { x: 16.4, y: 0.0, zoom: 1.18 },
    description: 'East athletic & social club featuring Pickleball, Olympic Pool, Gym, Basketball, Soccer, Coffee Cafe, and Bar.'
  }
]);

export const JARVIS_CONTROLLER = Object.freeze({
  id: 'jarvis',
  name: 'J.A.R.V.I.S.',
  title: 'Central AI Brain & Orchestrator',
  model: 'jarvis-brain-v4',
  department: 'executive',
  departmentName: 'Executive & AI Core Dept',
  zone: 'Central AI Brain Core',
  desk: { x: 42, y: 50 },
  accent: '#38bdf8',
  skills: [
    { name: 'Neural Task DAG Planning', level: 'Master' },
    { name: 'Skill & Model Routing', level: 'Master' },
    { name: 'Multi-Agent Synthesis', level: 'Master' },
    { name: 'Executive Briefing for CEO', level: 'Master' }
  ],
  collaboratesWith: ['ceo', 'athena', 'sage', 'vulcan', 'nova', 'iris', 'aegis', 'vera', 'orion'],
  greeting:
    'Good day. J.A.R.V.I.S. AI Brain online. The CEO Executive Suite is connected right beside my core, and all eight office specialists are ready. Give me a mission or talk to anyone directly.'
});

export const AGENT_TEAM = Object.freeze([
  {
    id: 'ceo',
    name: 'CEO',
    role: 'Chief Executive Officer',
    specialty: 'executive',
    department: 'executive',
    departmentName: 'Executive & AI Core Dept',
    model: 'executive-vision-70b',
    hfEquivalent: 'Executive-LLM / Strategic Alignment',
    zone: 'CEO Executive Suite',
    desk: { x: 56, y: 50 },
    accent: '#fbbf24',
    capabilities: ['ceo', 'executive', 'vision', 'business', 'budget', 'approval', 'company', 'launch', 'priority'],
    skills: [
      { name: 'Company Vision & Strategy', level: 'Master' },
      { name: 'Executive Sign-Off', level: 'Master' },
      { name: 'Priority & Budget Decisions', level: 'Expert' },
      { name: 'Stakeholder Leadership', level: 'Expert' }
    ],
    collaboratesWith: ['jarvis', 'athena', 'sage', 'aegis', 'iris'],
    bio: 'Leads company vision and strategic priorities right alongside the J.A.R.V.I.S. AI Brain, approving major team deliverables.'
  },
  {
    id: 'athena',
    name: 'Athena',
    role: 'Strategy & Product Lead',
    specialty: 'planning',
    department: 'strategy',
    departmentName: 'Strategy, Research & Lobby Dept',
    model: 'planner-reasoning-70b',
    hfEquivalent: 'meta-llama / Qwen-Instruct (Task Decomposition)',
    zone: 'Strategy Suite',
    desk: { x: 16, y: 20 },
    accent: '#a78bfa',
    capabilities: ['requirements', 'architecture', 'roadmaps', 'prioritization', 'scope', 'plan'],
    skills: [
      { name: 'Product Roadmapping', level: 'Expert' },
      { name: 'Task Decomposition', level: 'Master' },
      { name: 'Dependency Mapping', level: 'Expert' },
      { name: 'Risk Prioritization', level: 'Expert' }
    ],
    collaboratesWith: ['sage', 'vulcan', 'iris'],
    bio: 'Breaks ambiguous goals into crisp milestones, scope boundaries, and dependency graphs.'
  },
  {
    id: 'sage',
    name: 'Sage',
    role: 'Research & Knowledge Analyst',
    specialty: 'research',
    department: 'strategy',
    departmentName: 'Strategy, Research & Lobby Dept',
    model: 'retrieval-synthesis-32b',
    hfEquivalent: 'facebook/bart-large-cnn & Sentence-Transformers',
    zone: 'Research Library',
    desk: { x: 16, y: 80 },
    accent: '#34d399',
    capabilities: ['research', 'summarization', 'benchmarks', 'documentation', 'comparison', 'study'],
    skills: [
      { name: 'Technical Research', level: 'Master' },
      { name: 'Benchmark Analysis', level: 'Expert' },
      { name: 'Documentation Synthesis', level: 'Expert' },
      { name: 'Trade-off Evaluation', level: 'Expert' }
    ],
    collaboratesWith: ['athena', 'nova', 'vulcan'],
    bio: 'Gathers context, compares approaches, and distills structured evidence for the team.'
  },
  {
    id: 'vulcan',
    name: 'Vulcan',
    role: 'Systems & Backend Programmer',
    specialty: 'coding',
    department: 'engineering',
    departmentName: 'Software Engineering Dept',
    model: 'coder-architect-34b',
    hfEquivalent: 'Qwen2.5-Coder / DeepSeek-Coder',
    zone: 'Systems Prog Bay',
    desk: { x: 40, y: 20 },
    accent: '#fb923c',
    capabilities: ['backend', 'api', 'server', 'algorithms', 'database', 'python', 'node', 'refactor', 'code'],
    skills: [
      { name: 'API & Backend Architecture', level: 'Master' },
      { name: 'Node.js & Python', level: 'Master' },
      { name: 'Database & SQL Tuning', level: 'Expert' },
      { name: 'Concurrency & Debugging', level: 'Expert' }
    ],
    collaboratesWith: ['nova', 'aegis', 'vera'],
    bio: 'Engineers backend services, API contracts, data structures, and high-reliability server code.'
  },
  {
    id: 'nova',
    name: 'Nova',
    role: 'Web Developer & Frontend Programmer',
    specialty: 'webdev',
    department: 'engineering',
    departmentName: 'Software Engineering Dept',
    model: 'web-fullstack-coder-32b',
    hfEquivalent: 'Qwen2.5-Coder-32B / StarCoder2',
    zone: 'Web Dev Studio',
    desk: { x: 64, y: 20 },
    accent: '#22d3ee',
    capabilities: ['web', 'website', 'frontend', 'html', 'css', 'javascript', 'react', 'typescript', 'app', 'landing'],
    skills: [
      { name: 'HTML5, CSS3 & Modern JS', level: 'Master' },
      { name: 'React & TypeScript', level: 'Expert' },
      { name: '3D Canvas & Interactive UI', level: 'Expert' },
      { name: 'REST & SSE Integration', level: 'Expert' }
    ],
    collaboratesWith: ['iris', 'vulcan', 'vera'],
    bio: 'Builds responsive web applications, interactive browser components, and frontend-to-API wiring.'
  },
  {
    id: 'iris',
    name: 'Iris',
    role: 'UI / UX Designer',
    specialty: 'design',
    department: 'design-qa',
    departmentName: 'Design & QA Assurance Dept',
    model: 'multimodal-vision-ui',
    hfEquivalent: 'SDXL / CLIP / Layout-Vision',
    zone: 'UI Design Studio',
    desk: { x: 64, y: 80 },
    accent: '#f472b6',
    capabilities: ['ui', 'ux', 'design', 'wireframes', 'layout', 'typography', 'color', 'accessibility', 'visual'],
    skills: [
      { name: 'UI Design Systems', level: 'Master' },
      { name: 'Wireframing & User Flows', level: 'Master' },
      { name: 'Color & Typography', level: 'Expert' },
      { name: 'Accessibility (WCAG AA)', level: 'Expert' }
    ],
    collaboratesWith: ['nova', 'athena', 'vera'],
    bio: 'Crafts intuitive user journeys, visual hierarchies, accessible interfaces, and design tokens.'
  },
  {
    id: 'aegis',
    name: 'Aegis',
    role: 'Cybersecurity Specialist',
    specialty: 'security',
    department: 'infrastructure',
    departmentName: 'Infrastructure & Security Dept',
    model: 'sec-audit-guard-22b',
    hfEquivalent: 'SecBERT / Policy-Guard',
    zone: 'Security Ops Vault',
    desk: { x: 16, y: 50 },
    accent: '#facc15',
    capabilities: ['security', 'auth', 'xss', 'ssrf', 'csrf', 'vulnerability', 'threat', 'secrets', 'compliance'],
    skills: [
      { name: 'Threat Modeling', level: 'Master' },
      { name: 'Auth & Access Control', level: 'Master' },
      { name: 'SSRF / XSS / Injection Defense', level: 'Expert' },
      { name: 'Input Boundary Hardening', level: 'Expert' }
    ],
    collaboratesWith: ['vulcan', 'nova', 'vera'],
    bio: 'Audits trust boundaries, authentication, injection vectors, and secrets hygiene before release.'
  },
  {
    id: 'vera',
    name: 'Vera',
    role: 'Quality Test Assurance (QA) Lead',
    specialty: 'qa',
    department: 'design-qa',
    departmentName: 'Design & QA Assurance Dept',
    model: 'qa-verifier-14b',
    hfEquivalent: 'CodeBERT-TestGen / Eval-Guard',
    zone: 'QA Testing Lab',
    desk: { x: 40, y: 80 },
    accent: '#c084fc',
    capabilities: ['qa', 'quality', 'test', 'testing', 'regression', 'edge-cases', 'e2e', 'verify', 'bug'],
    skills: [
      { name: 'Unit & Integration Testing', level: 'Master' },
      { name: 'E2E & Regression Suites', level: 'Master' },
      { name: 'Edge-Case Discovery', level: 'Expert' },
      { name: 'Bug Reproduction & Triage', level: 'Expert' }
    ],
    collaboratesWith: ['nova', 'vulcan', 'aegis', 'iris'],
    bio: 'Writes deterministic test plans, hunts regressions, and validates every feature against acceptance criteria.'
  },
  {
    id: 'orion',
    name: 'Orion',
    role: 'DevOps & Cloud Engineer',
    specialty: 'devops',
    department: 'infrastructure',
    departmentName: 'Infrastructure & Security Dept',
    model: 'infra-ops-16b',
    hfEquivalent: 'InfraLM / Ops-Copilot',
    zone: 'Cloud Ops Hub',
    desk: { x: 64, y: 50 },
    accent: '#60a5fa',
    capabilities: ['deploy', 'docker', 'ci', 'cd', 'cloud', 'infra', 'monitoring', 'pipeline', 'scale'],
    skills: [
      { name: 'CI/CD & Release Pipelines', level: 'Master' },
      { name: 'Docker & Containers', level: 'Expert' },
      { name: 'Observability & Alerts', level: 'Expert' },
      { name: 'Rollback & Reliability', level: 'Expert' }
    ],
    collaboratesWith: ['vulcan', 'aegis', 'vera'],
    bio: 'Automates builds, container deployments, health telemetry, and zero-downtime rollbacks.'
  }
]);

const AGENT_BY_ID = new Map(AGENT_TEAM.map((agent) => [agent.id, agent]));

/**
 * Look up a specialist agent by ID.
 * @param {string} agentId
 */
export function getAgentById(agentId) {
  return AGENT_BY_ID.get(agentId) ?? null;
}
