/**
 * Shared 3D AI Office & Multi-Department Campus layout constants, coordinates,
 * character styles, banter pairs, and math utilities.
 */

export const LOGICAL_WIDTH = 1200;
export const LOGICAL_HEIGHT = 720;

export const DEPARTMENT_ZONES = [
  {
    id: 'infrastructure',
    label: 'INFRASTRUCTURE & SECURITY DEPT',
    x1: -21.5,
    y1: -13.4,
    x2: -8.2,
    y2: -1.6,
    fill: '#111d36',
    accent: '#60a5fa',
    focus: { x: -14.8, y: -7.5, zoom: 1.45 }
  },
  {
    id: 'strategy',
    label: 'STRATEGY, RESEARCH & LOBBY DEPT',
    x1: -21.5,
    y1: 1.6,
    x2: -8.2,
    y2: 13.4,
    fill: '#171b38',
    accent: '#a78bfa',
    focus: { x: -14.8, y: 7.5, zoom: 1.45 }
  },
  {
    id: 'engineering',
    label: 'SOFTWARE ENGINEERING DEPT',
    x1: -6.3,
    y1: -13.4,
    x2: 8.8,
    y2: -5.8,
    fill: '#10223b',
    accent: '#22d3ee',
    focus: { x: 1.2, y: -9.5, zoom: 1.45 }
  },
  {
    id: 'executive',
    label: 'EXECUTIVE & J.A.R.V.I.S. CORE DEPT',
    x1: -6.3,
    y1: -4.4,
    x2: 8.8,
    y2: 4.4,
    fill: '#19223c',
    accent: '#fbbf24',
    focus: { x: 1.4, y: 0.0, zoom: 1.45 }
  },
  {
    id: 'design-qa',
    label: 'DESIGN & QA ASSURANCE DEPT',
    x1: -6.3,
    y1: 5.8,
    x2: 8.8,
    y2: 13.4,
    fill: '#20183a',
    accent: '#f472b6',
    focus: { x: 1.2, y: 9.5, zoom: 1.45 }
  },
  {
    id: 'wellness',
    label: 'WELLNESS, SPORTS & LOUNGE DEPT',
    x1: 10.6,
    y1: -13.4,
    x2: 21.8,
    y2: 13.4,
    fill: '#122436',
    accent: '#34d399',
    focus: { x: 16.4, y: 0.0, zoom: 1.18 }
  }
];

export const STATIONS = {
  jarvis: { x: -3.4, y: 0, z: 0, label: 'J.A.R.V.I.S. AI Brain', accent: '#38bdf8' },
  ceo: {
    x: 1.9,
    y: 0.0,
    deskX: 1.9,
    deskY: -1.1,
    chairX: 1.9,
    chairY: 0.65,
    huddleX: -0.9,
    huddleY: 0.0,
    box: { x1: -0.3, y1: -3.6, x2: 4.1, y2: 3.6 },
    label: 'CEO Executive Suite',
    accent: '#fbbf24',
    rugColor: '#451a03'
  },
  athena: {
    x: -11.25,
    y: 4.7,
    deskX: -11.25,
    deskY: 4.0,
    chairX: -11.25,
    chairY: 5.4,
    huddleX: -4.9,
    huddleY: 0.9,
    box: { x1: -13.8, y1: 2.4, x2: -8.7, y2: 7.0 },
    label: 'Strategy · Athena',
    accent: '#a78bfa',
    rugColor: '#312e81'
  },
  sage: {
    x: -11.25,
    y: 10.1,
    deskX: -11.25,
    deskY: 9.4,
    chairX: -11.25,
    chairY: 10.8,
    huddleX: -4.9,
    huddleY: 1.9,
    box: { x1: -13.8, y1: 7.8, x2: -8.7, y2: 12.4 },
    label: 'Research · Sage',
    accent: '#34d399',
    rugColor: '#064e3b'
  },
  vulcan: {
    x: -2.45,
    y: -9.45,
    deskX: -2.45,
    deskY: -10.35,
    chairX: -2.45,
    chairY: -8.7,
    huddleX: -3.3,
    huddleY: -1.9,
    box: { x1: -5.7, y1: -12.5, x2: 0.8, y2: -6.4 },
    label: 'Systems · Vulcan',
    accent: '#fb923c',
    rugColor: '#431407'
  },
  nova: {
    x: 4.95,
    y: -9.45,
    deskX: 4.95,
    deskY: -10.35,
    chairX: 4.95,
    chairY: -8.7,
    huddleX: -1.6,
    huddleY: -1.9,
    box: { x1: 1.7, y1: -12.5, x2: 8.2, y2: -6.4 },
    label: 'Web Dev · Nova',
    accent: '#22d3ee',
    rugColor: '#083344'
  },
  aegis: {
    x: -11.25,
    y: -10.0,
    deskX: -11.25,
    deskY: -10.7,
    chairX: -11.25,
    chairY: -9.2,
    huddleX: -5.1,
    huddleY: -1.5,
    box: { x1: -13.8, y1: -12.4, x2: -8.7, y2: -7.6 },
    label: 'Security · Aegis',
    accent: '#facc15',
    rugColor: '#422006'
  },
  orion: {
    x: -11.25,
    y: -4.5,
    deskX: -11.25,
    deskY: -5.2,
    chairX: -11.25,
    chairY: -3.7,
    huddleX: -5.1,
    huddleY: -0.2,
    box: { x1: -13.8, y1: -6.8, x2: -8.7, y2: -2.2 },
    label: 'DevOps · Orion',
    accent: '#60a5fa',
    rugColor: '#172554'
  },
  vera: {
    x: -2.45,
    y: 9.45,
    deskX: -2.45,
    deskY: 8.55,
    chairX: -2.45,
    chairY: 10.2,
    huddleX: -3.3,
    huddleY: 1.9,
    box: { x1: -5.7, y1: 6.4, x2: 0.8, y2: 12.5 },
    label: 'QA Lab · Vera',
    accent: '#c084fc',
    rugColor: '#3b0764'
  },
  iris: {
    x: 4.95,
    y: 9.45,
    deskX: 4.95,
    deskY: 8.55,
    chairX: 4.95,
    chairY: 10.2,
    huddleX: -1.6,
    huddleY: 1.9,
    box: { x1: 1.7, y1: 6.4, x2: 8.2, y2: 12.5 },
    label: 'UI Design · Iris',
    accent: '#f472b6',
    rugColor: '#500724'
  }
};

export const INFRA_ROOMS = {
  serverRoom: { x1: -21.0, y1: -12.4, x2: -14.6, y2: -2.4, cx: -17.8, cy: -7.4, label: 'SERVER & COMPUTE VAULT', accent: '#38bdf8' },
  lobbyRoom: { x1: -21.0, y1: 2.4, x2: -14.6, y2: 12.4, cx: -17.8, cy: 7.4, label: 'RECEPTION LOBBY', accent: '#6ee7b7' },
  conferenceRoom: { x1: 4.7, y1: -3.6, x2: 8.3, y2: 3.6, cx: 6.5, cy: 0.0, label: 'EXECUTIVE BOARDROOM', accent: '#c4b5fd' }
};

export const REC_SLOTS = [
  { key: 'boardroom1', group: 'boardroom', x: 5.45, y: -1.1, activity: 'meeting', msg: 'Boardroom review' },
  { key: 'boardroom2', group: 'boardroom', x: 7.55, y: -1.1, activity: 'meeting', msg: 'Syncing roadmap' },
  { key: 'boardroom3', group: 'boardroom', x: 5.45, y: 1.1, activity: 'meeting', msg: 'Architecture sync' },
  { key: 'boardroom4', group: 'boardroom', x: 7.55, y: 1.1, activity: 'meeting', msg: 'Executive brief' },
  { key: 'server1', group: 'server', x: -17.8, y: -4.2, activity: 'server-ops', msg: 'GPU cluster check' },
  { key: 'server2', group: 'server', x: -16.0, y: -6.1, activity: 'server-ops', msg: 'Telemetry nominal' },
  { key: 'lobby1', group: 'lobby', x: -17.8, y: 6.2, activity: 'lobby', msg: 'Visitor briefing' },
  { key: 'pickleballA', group: 'pickleball', x: 12.2, y: -9.9, activity: 'pickleball', msg: 'Serving!' },
  { key: 'pickleballB', group: 'pickleball', x: 14.8, y: -9.9, activity: 'pickleball', msg: 'Ready!' },
  { key: 'swimLane1', group: 'swim', x: 18.1, y: -9.5, activity: 'swim', msg: 'Swimming laps!' },
  { key: 'swimLane2', group: 'swim', x: 20.0, y: -7.2, activity: 'swim', msg: 'Freestyle lap!' },
  { key: 'gymTreadmill1', group: 'gym', x: 12.0, y: -4.0, activity: 'gym-run', msg: 'Cardio run' },
  { key: 'gymTreadmill2', group: 'gym', x: 13.3, y: -4.0, activity: 'gym-run', msg: 'Sprint set' },
  { key: 'gymWeights', group: 'gym', x: 14.9, y: -3.2, activity: 'gym-lift', msg: 'Bench & weights' },
  { key: 'bball1', group: 'basketball', x: 12.1, y: 2.7, activity: 'basketball', msg: '3-pointer!' },
  { key: 'bball2', group: 'basketball', x: 13.6, y: 4.3, activity: 'basketball', msg: 'Dribbling!' },
  { key: 'soccer1', group: 'soccer', x: 17.6, y: -0.6, activity: 'soccer', msg: 'Passing!' },
  { key: 'soccer2', group: 'soccer', x: 19.4, y: 0.8, activity: 'soccer', msg: 'Goal shot!' },
  { key: 'pingpong1', group: 'pingpong', x: 17.8, y: 5.8, activity: 'pingpong', msg: 'Ping-pong!' },
  { key: 'pingpong2', group: 'pingpong', x: 19.8, y: 5.8, activity: 'pingpong', msg: 'Fast rally!' },
  { key: 'coffeeBar', group: 'coffee', x: 12.3, y: 10.6, activity: 'coffee', msg: 'Espresso break' },
  { key: 'loungeSofa', group: 'coffee', x: 14.7, y: 10.8, activity: 'lounge', msg: 'Chilling' },
  { key: 'drinksBar', group: 'bar', x: 17.5, y: 10.4, activity: 'bar', msg: 'Cold drinks!' },
  { key: 'danceFloor1', group: 'dance', x: 19.4, y: 10.2, activity: 'dance', msg: 'Dancing!' },
  { key: 'danceFloor2', group: 'dance', x: 20.6, y: 11.2, activity: 'dance', msg: 'Party mode!' }
];

export const CHARACTER_STYLE = {
  ceo: {
    hair: '#1e293b',
    skin: '#f1c29b',
    suit: '#b45309',
    shirt: '#fef3c7',
    visor: false,
    hairStyle: 'short',
    pants: '#1f2937',
    shoes: '#111827',
    build: 1.05,
    height: 1.04,
    beard: false,
    glasses: false,
    tie: '#7f1d1d'
  },
  athena: {
    hair: '#4c1d95',
    skin: '#f5cfa0',
    suit: '#8b5cf6',
    shirt: '#ede9fe',
    visor: false,
    hairStyle: 'long',
    pants: '#1e1b4b',
    shoes: '#312e81',
    build: 0.92,
    height: 0.98,
    glasses: true
  },
  sage: {
    hair: '#065f46',
    skin: '#e8b88a',
    suit: '#10b981',
    shirt: '#d1fae5',
    visor: false,
    hairStyle: 'bun',
    pants: '#064e3b',
    shoes: '#1f2937',
    build: 0.95,
    height: 0.97,
    glasses: true
  },
  vulcan: {
    hair: '#7c2d12',
    skin: '#d9a066',
    suit: '#f97316',
    shirt: '#ffedd5',
    visor: true,
    hairStyle: 'buzz',
    pants: '#292524',
    shoes: '#1c1917',
    build: 1.12,
    height: 1.03,
    beard: true
  },
  nova: {
    hair: '#0e7490',
    skin: '#f3cfb3',
    suit: '#06b6d4',
    shirt: '#cffafe',
    visor: true,
    hairStyle: 'ponytail',
    pants: '#164e63',
    shoes: '#f8fafc',
    build: 0.93,
    height: 0.99
  },
  iris: {
    hair: '#9d174d',
    skin: '#f8d8b8',
    suit: '#ec4899',
    shirt: '#fce7f3',
    visor: false,
    hairStyle: 'long',
    pants: '#4a044e',
    shoes: '#831843',
    build: 0.9,
    height: 0.97,
    earrings: true
  },
  aegis: {
    hair: '#1e293b',
    skin: '#c68b59',
    suit: '#eab308',
    shirt: '#fef9c3',
    visor: true,
    hairStyle: 'buzz',
    pants: '#1c1917',
    shoes: '#0c0a09',
    build: 1.1,
    height: 1.05
  },
  vera: {
    hair: '#581c87',
    skin: '#f1c7a5',
    suit: '#a855f7',
    shirt: '#f3e8ff',
    visor: false,
    hairStyle: 'bob',
    pants: '#2e1065',
    shoes: '#1f2937',
    build: 0.92,
    height: 0.96,
    glasses: true
  },
  orion: {
    hair: '#1e3a8a',
    skin: '#deb28a',
    suit: '#3b82f6',
    shirt: '#dbeafe',
    visor: true,
    hairStyle: 'short',
    pants: '#172554',
    shoes: '#1e293b',
    build: 1.0,
    height: 1.01,
    glasses: true
  }
};

export const BANTER_PAIRS = [
  {
    spot: 'engineering-sync',
    packet: ['vulcan', 'nova', '#22d3ee'],
    lines: [
      { speaker: 'vulcan', text: 'API schema & OpenAPI types pushed to main!' },
      { speaker: 'nova', text: 'Confirmed on my screen—wiring the UI components now.' }
    ]
  },
  {
    spot: 'infra-comms',
    packet: ['aegis', 'orion', '#60a5fa'],
    lines: [
      { speaker: 'aegis', text: 'TLS boundaries & SSRF rules verified green.' },
      { speaker: 'orion', text: 'Copy that—Server Vault telemetry & CI checks look clean.' }
    ]
  },
  {
    spot: 'boardroom-brief',
    packet: ['athena', 'ceo', '#fbbf24'],
    lines: [
      { speaker: 'athena', text: 'CEO, Q4 sprint milestones are synced on the board!' },
      { speaker: 'ceo', text: 'Approved—keep Quality & Security sign-off tight.' }
    ]
  },
  {
    spot: 'design-qa-review',
    packet: ['iris', 'vera', '#f472b6'],
    lines: [
      { speaker: 'iris', text: 'Updated high-contrast tokens on my design monitor.' },
      { speaker: 'vera', text: 'Running automated E2E & WCAG checks on it now!' }
    ]
  },
  {
    spot: 'research-coffee',
    lines: [
      { speaker: 'sage', text: 'Benchmark report compiled—grabbing an espresso!' },
      { speaker: 'athena', text: 'Save me a cup, joining right after this review.' }
    ]
  },
  {
    spot: 'athletic-break',
    lines: [
      { speaker: 'vulcan', text: 'Swish from downtown on the break court!' },
      { speaker: 'nova', text: 'My turn—then back to our dual-monitor workstations.' }
    ]
  }
];

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

