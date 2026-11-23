/**
 * Interactive 3D Isometric AI Office & Multi-Sport Campus Engine.
 * Includes:
 * - 8-Specialist 3D Office Suites + J.A.R.V.I.S. 3D Core
 * - Pickleball Court (3D net + rallying ball + paddles)
 * - Olympic Swimming Pool (water shimmer, lane ropes, lap swimming & splash rings)
 * - Basketball Court (hardwood court, 3D hoop/backboard, shooting arc ball)
 * - Fitness Gym (treadmills, squat/bench rack with animated lifting, yoga mat)
 * - Futsal / Soccer Pitch (3D goalposts, striped turf, passing ball)
 * - Table Tennis (Ping-Pong) & Rooftop Garden + Coffee & Lounge Cafe
 */

const LOGICAL_WIDTH = 960;
const LOGICAL_HEIGHT = 580;

const STATIONS = {
  jarvis: { x: -4.4, y: 0, z: 0, label: 'J.A.R.V.I.S. AI Brain', accent: '#38bdf8' },
  ceo: {
    x: -0.7,
    y: 0.0,
    deskX: -0.7,
    deskY: -0.6,
    chairX: -0.7,
    chairY: 0.65,
    huddleX: -2.4,
    huddleY: 0.0,
    label: 'CEO Office',
    accent: '#fbbf24',
    rugColor: '#451a03'
  },
  athena: {
    x: -8.2,
    y: -6.0,
    deskX: -8.7,
    deskY: -6.6,
    chairX: -8.1,
    chairY: -5.4,
    huddleX: -5.6,
    huddleY: -1.4,
    label: 'Strategy · Athena',
    accent: '#a78bfa',
    rugColor: '#312e81'
  },
  vulcan: {
    x: -2.8,
    y: -6.0,
    deskX: -2.8,
    deskY: -6.6,
    chairX: -2.8,
    chairY: -5.4,
    huddleX: -4.0,
    huddleY: -1.7,
    label: 'Systems · Vulcan',
    accent: '#fb923c',
    rugColor: '#431407'
  },
  nova: {
    x: 2.2,
    y: -6.0,
    deskX: 2.2,
    deskY: -6.6,
    chairX: 2.2,
    chairY: -5.4,
    huddleX: -2.9,
    huddleY: -1.4,
    label: 'Web Dev · Nova',
    accent: '#22d3ee',
    rugColor: '#083344'
  },
  aegis: {
    x: -8.2,
    y: 0.0,
    deskX: -8.8,
    deskY: 0.0,
    chairX: -7.8,
    chairY: 0.2,
    huddleX: -6.0,
    huddleY: 0.0,
    label: 'Security · Aegis',
    accent: '#facc15',
    rugColor: '#422006'
  },
  orion: {
    x: 2.5,
    y: 0.0,
    deskX: 2.9,
    deskY: 0.0,
    chairX: 1.9,
    chairY: 0.2,
    huddleX: 1.2,
    huddleY: 0.0,
    label: 'DevOps · Orion',
    accent: '#60a5fa',
    rugColor: '#172554'
  },
  sage: {
    x: -8.2,
    y: 6.0,
    deskX: -8.7,
    deskY: 6.6,
    chairX: -8.1,
    chairY: 5.4,
    huddleX: -5.6,
    huddleY: 1.4,
    label: 'Research · Sage',
    accent: '#34d399',
    rugColor: '#064e3b'
  },
  vera: {
    x: -2.8,
    y: 6.0,
    deskX: -2.8,
    deskY: 6.6,
    chairX: -2.8,
    chairY: 5.4,
    huddleX: -4.0,
    huddleY: 1.7,
    label: 'QA Lab · Vera',
    accent: '#c084fc',
    rugColor: '#3b0764'
  },
  iris: {
    x: 2.2,
    y: 6.0,
    deskX: 2.2,
    deskY: 6.6,
    chairX: 2.2,
    chairY: 5.4,
    huddleX: -2.9,
    huddleY: 1.4,
    label: 'UI Design · Iris',
    accent: '#f472b6',
    rugColor: '#500724'
  }
};

const REC_SLOTS = [
  { key: 'pickleballA', group: 'pickleball', x: 5.8, y: -6.6, activity: 'pickleball', msg: 'Serving!' },
  { key: 'pickleballB', group: 'pickleball', x: 9.0, y: -6.6, activity: 'pickleball', msg: 'Ready!' },
  { key: 'swimLane1', group: 'swim', x: 11.7, y: -7.0, activity: 'swim', msg: 'Swimming laps!' },
  { key: 'swimLane2', group: 'swim', x: 13.5, y: -4.5, activity: 'swim', msg: 'Freestyle lap!' },
  { key: 'gymTreadmill1', group: 'gym', x: 5.8, y: -1.8, activity: 'gym-run', msg: 'Cardio run' },
  { key: 'gymTreadmill2', group: 'gym', x: 7.2, y: -1.8, activity: 'gym-run', msg: 'Sprint set' },
  { key: 'gymWeights', group: 'gym', x: 8.9, y: -1.3, activity: 'gym-lift', msg: 'Bench & weights' },
  { key: 'bball1', group: 'basketball', x: 6.3, y: 2.5, activity: 'basketball', msg: '3-pointer!' },
  { key: 'bball2', group: 'basketball', x: 7.8, y: 4.1, activity: 'basketball', msg: 'Dribbling!' },
  { key: 'soccer1', group: 'soccer', x: 11.6, y: 0.1, activity: 'soccer', msg: 'Passing!' },
  { key: 'soccer2', group: 'soccer', x: 13.2, y: 1.5, activity: 'soccer', msg: 'Goal shot!' },
  { key: 'pingpong1', group: 'pingpong', x: 11.4, y: 4.8, activity: 'pingpong', msg: 'Ping-pong!' },
  { key: 'pingpong2', group: 'pingpong', x: 13.4, y: 4.8, activity: 'pingpong', msg: 'Fast rally!' },
  { key: 'coffeeBar', group: 'coffee', x: 6.2, y: 7.7, activity: 'coffee', msg: 'Espresso break' },
  { key: 'loungeSofa', group: 'coffee', x: 8.7, y: 7.8, activity: 'lounge', msg: 'Chilling' },
  { key: 'drinksBar', group: 'bar', x: 11.1, y: 8.0, activity: 'bar', msg: 'Cold drinks!' },
  { key: 'danceFloor1', group: 'dance', x: 12.8, y: 7.7, activity: 'dance', msg: 'Dancing!' },
  { key: 'danceFloor2', group: 'dance', x: 14.0, y: 8.3, activity: 'dance', msg: 'Party mode!' }
];

const CHARACTER_STYLE = {
  ceo: { hair: '#1e293b', skin: '#f1c29b', suit: '#b45309', shirt: '#fef3c7', visor: false },
  athena: { hair: '#4c1d95', skin: '#f5cfa0', suit: '#8b5cf6', shirt: '#ede9fe', visor: false },
  sage: { hair: '#065f46', skin: '#e8b88a', suit: '#10b981', shirt: '#d1fae5', visor: false },
  vulcan: { hair: '#7c2d12', skin: '#d9a066', suit: '#f97316', shirt: '#ffedd5', visor: true },
  nova: { hair: '#0e7490', skin: '#f3cfb3', suit: '#06b6d4', shirt: '#cffafe', visor: true },
  iris: { hair: '#9d174d', skin: '#f8d8b8', suit: '#ec4899', shirt: '#fce7f3', visor: false },
  aegis: { hair: '#1e293b', skin: '#c68b59', suit: '#eab308', shirt: '#fef9c3', visor: true },
  vera: { hair: '#581c87', skin: '#f1c7a5', suit: '#a855f7', shirt: '#f3e8ff', visor: false },
  orion: { hair: '#1e3a8a', skin: '#deb28a', suit: '#3b82f6', shirt: '#dbeafe', visor: true }
};

const BANTER_PAIRS = [
  {
    spot: 'swim',
    lines: [
      { speaker: 'athena', text: 'Water feels great—4 laps down!' },
      { speaker: 'sage', text: 'Swimming resets focus fast.' }
    ]
  },
  {
    spot: 'basketball',
    lines: [
      { speaker: 'vulcan', text: 'Swish from downtown! Nothing but net.' },
      { speaker: 'nova', text: 'Check the ball—my turn from the arc!' }
    ]
  },
  {
    spot: 'pickleball',
    lines: [
      { speaker: 'iris', text: 'Cross-court dink! Point to UI Design.' },
      { speaker: 'vera', text: 'Line call verified—good shot!' }
    ]
  },
  {
    spot: 'soccer',
    lines: [
      { speaker: 'orion', text: 'Top-corner goal on the futsal pitch!' },
      { speaker: 'aegis', text: 'Solid defense, almost blocked it.' }
    ]
  },
  {
    spot: 'bar-dance',
    lines: [
      { speaker: 'iris', text: 'Iced latte at the bar, then hitting the dance floor!' },
      { speaker: 'nova', text: 'DJ lights look crisp—let’s dance!' }
    ]
  }
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function shadeHex(hex, factor) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = clamp(Math.round(((num >> 16) & 255) * factor), 0, 255);
  const g = clamp(Math.round(((num >> 8) & 255) * factor), 0, 255);
  const b = clamp(Math.round((num & 255) * factor), 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

export class Office3DScene {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSelectAgent = options.onSelectAgent || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onBanter = options.onBanter || (() => {});

    this.team = [];
    this.controller = null;
    this.mission = null;
    this.selectedDeskId = 'jarvis';
    this.tourTarget = null;

    this.yaw = Math.PI * 0.24;
    this.targetYaw = this.yaw;
    this.zoom = 0.92;
    this.targetZoom = 0.92;
    this.tilt = 0.52;
    this.isDragging = false;
    this.dragMoved = false;
    this.lastPointerX = 0;

    this.actors = new Map();
    this.packets = [];
    this.hitBoxes = [];
    this.lastPlanKey = null;
    this.lastCompletedTaskIds = new Set();

    this.sportsClock = 0;
    this.banterTimer = 4.5;
    this.banterPairIdx = 0;

    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.lastFrameMs = performance.now();
    this.clockSec = 0;

    this.bindEvents();
    this.start();
  }

  bindEvents() {
    this.canvas.addEventListener('pointerdown', (ev) => {
      this.isDragging = true;
      this.dragMoved = false;
      this.lastPointerX = ev.clientX;
      this.canvas.setPointerCapture?.(ev.pointerId);
    });

    this.canvas.addEventListener('pointermove', (ev) => {
      if (this.isDragging) {
        const dx = ev.clientX - this.lastPointerX;
        if (Math.abs(dx) > 2) this.dragMoved = true;
        this.lastPointerX = ev.clientX;
        this.targetYaw += dx * 0.008;
        this.yaw = this.targetYaw;
      }
      const pt = this.toLogicalPoint(ev);
      const hit = this.pickAt(pt.x, pt.y);
      this.canvas.style.cursor = this.isDragging ? 'grabbing' : hit ? 'pointer' : 'grab';
    });

    this.canvas.addEventListener('pointerup', (ev) => {
      const wasClick = !this.dragMoved;
      this.isDragging = false;
      if (wasClick) {
        const pt = this.toLogicalPoint(ev);
        const hit = this.pickAt(pt.x, pt.y);
        if (hit) this.onSelectAgent(hit);
      }
    });

    this.canvas.addEventListener(
      'wheel',
      (ev) => {
        ev.preventDefault();
        const delta = ev.deltaY > 0 ? -0.08 : 0.08;
        this.targetZoom = clamp(this.targetZoom + delta, 0.65, 1.55);
      },
      { passive: false }
    );
  }

  rotateCamera(deltaRad) {
    this.targetYaw += deltaRad;
  }

  adjustZoom(delta) {
    this.targetZoom = clamp(this.targetZoom + delta, 0.65, 1.55);
  }

  resetCamera() {
    this.targetYaw = Math.PI * 0.24;
    this.targetZoom = 0.92;
  }

  toLogicalPoint(ev) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((ev.clientX - rect.left) / Math.max(1, rect.width)) * LOGICAL_WIDTH,
      y: ((ev.clientY - rect.top) / Math.max(1, rect.height)) * LOGICAL_HEIGHT
    };
  }

  pickAt(sx, sy) {
    for (let i = this.hitBoxes.length - 1; i >= 0; i -= 1) {
      const hb = this.hitBoxes[i];
      if (Math.hypot(sx - hb.sx, sy - hb.sy) <= hb.radius) {
        return hb.id;
      }
    }
    return null;
  }

  project(wx, wy, wz = 0) {
    // Shift world center slightly east (+2.0) so the entire Office + Dual Sports Columns center nicely
    const cx = wx - 2.0;
    const cy = wy;
    const cos = Math.cos(this.yaw);
    const sin = Math.sin(this.yaw);
    const rx = cx * cos - cy * sin;
    const ry = cx * sin + cy * cos;
    const scale = 20.5 * this.zoom;
    return {
      sx: LOGICAL_WIDTH * 0.5 + rx * scale,
      sy: LOGICAL_HEIGHT * 0.54 + ry * scale * this.tilt - wz * scale * 0.95,
      depth: ry
    };
  }

  initActors(team) {
    const initialSpots = {
      ceo: { x: STATIONS.ceo.chairX, y: STATIONS.ceo.chairY, slotKey: 'computer:ceo', activity: 'at-computer', speech: 'Syncing w/ JARVIS' },
      nova: { slot: REC_SLOTS[0] },
      iris: { slot: REC_SLOTS[1] },
      athena: { slot: REC_SLOTS[2] },
      vulcan: { slot: REC_SLOTS[7] },
      orion: { slot: REC_SLOTS[9] },
      sage: { slot: REC_SLOTS[13] },
      aegis: { x: STATIONS.aegis.chairX, y: STATIONS.aegis.chairY, slotKey: 'computer:aegis', activity: 'at-computer', speech: 'Security scan' },
      vera: { x: STATIONS.vera.chairX, y: STATIONS.vera.chairY, slotKey: 'computer:vera', activity: 'at-computer', speech: 'QA suite green' }
    };

    for (const agent of team) {
      if (this.actors.has(agent.id)) continue;
      const preset = initialSpots[agent.id];
      const slot = preset?.slot;
      const startX = slot?.x ?? preset?.x ?? STATIONS[agent.id]?.chairX ?? 0;
      const startY = slot?.y ?? preset?.y ?? STATIONS[agent.id]?.chairY ?? 0;

      this.actors.set(agent.id, {
        id: agent.id,
        name: agent.name,
        accent: agent.accent,
        x: startX,
        y: startY,
        targetX: startX,
        targetY: startY,
        slotKey: slot?.key ?? preset?.slotKey ?? `computer:${agent.id}`,
        activity: slot?.activity ?? preset?.activity ?? 'at-computer',
        speech: slot?.msg ?? preset?.speech ?? '',
        speechTimer: 4.0,
        idleTimer: 5 + Math.random() * 7,
        walkPhase: Math.random() * Math.PI * 2,
        actionPhase: Math.random() * Math.PI * 2,
        walking: false
      });
    }
  }

  showAgentSpeech(agentId, text, duration = 4.5) {
    const actor = this.actors.get(agentId);
    if (!actor) return;
    actor.speech = text;
    actor.speechTimer = duration;
  }

  moveAgentTo(agentId, zoneGroup) {
    const actor = this.actors.get(agentId);
    const st = STATIONS[agentId];
    if (!actor || !st) return;

    if (zoneGroup === 'computer') {
      actor.slotKey = `computer:${agentId}`;
      this.setActorGoal(actor, st.chairX, st.chairY, 'at-computer', 'Back at desk!');
      this.onStatusChange();
      return;
    }

    const occupied = new Set(
      [...this.actors.values()].filter((a) => a.id !== agentId).map((a) => a.slotKey)
    );
    const candidates = REC_SLOTS.filter((s) => s.group === zoneGroup);
    const free = candidates.find((s) => !occupied.has(s.key)) || candidates[0];
    if (!free) return;

    actor.slotKey = free.key;
    this.setActorGoal(actor, free.x, free.y, free.activity, free.msg);
    this.onStatusChange();
  }

  setActorGoal(actor, x, y, activity, speech = '') {
    actor.targetX = x;
    actor.targetY = y;
    actor.activity = activity;
    if (speech) {
      actor.speech = speech;
      actor.speechTimer = 4.2;
    }
  }

  spawnPacket(fromId, toId, color) {
    if (this.reducedMotion) return;
    const fromSt = STATIONS[fromId] || STATIONS.jarvis;
    const toSt = STATIONS[toId] || STATIONS.jarvis;
    this.packets.push({
      fromX: fromSt.deskX ?? fromSt.x,
      fromY: fromSt.deskY ?? fromSt.y,
      toX: toSt.deskX ?? toSt.x,
      toY: toSt.deskY ?? toSt.y,
      progress: 0,
      color
    });
  }

  syncState({ team, controller, mission, selectedDeskId, tourTarget }) {
    this.team = team || [];
    this.controller = controller || null;
    this.mission = mission || null;
    this.selectedDeskId = selectedDeskId || 'jarvis';
    this.tourTarget = tourTarget || null;

    this.initActors(this.team);

    const tasks = mission?.tasks ?? [];
    if (mission && mission.currentStage === 'model-selection' && this.lastPlanKey !== mission.id && tasks.length > 0) {
      this.lastPlanKey = mission.id;
      for (const t of tasks) {
        this.spawnPacket('jarvis', t.agentId, '#38bdf8');
      }
    }

    for (const t of tasks) {
      if (t.status === 'completed' && !this.lastCompletedTaskIds.has(t.id)) {
        this.lastCompletedTaskIds.add(t.id);
        const downstream = tasks.filter((other) => other.dep?.includes(t.id));
        if (downstream.length > 0) {
          for (const next of downstream) {
            this.spawnPacket(t.agentId, next.agentId, '#34d399');
          }
        } else {
          this.spawnPacket(t.agentId, 'jarvis', '#34d399');
        }
      }
    }

    if (!mission || (mission.id !== this.lastPlanKey && mission.status === 'queued')) {
      this.lastCompletedTaskIds.clear();
    }

    if (!mission) return;

    for (const agent of this.team) {
      const actor = this.actors.get(agent.id);
      const st = STATIONS[agent.id];
      if (!actor || !st) continue;

      const agentTasks = tasks.filter((t) => t.agentId === agent.id);
      const runningTask = agentTasks.find((t) => t.status === 'running');
      const allDone = agentTasks.length > 0 && agentTasks.every((t) => t.status === 'completed');

      if (mission.status === 'running' && mission.currentStage === 'task-planning') {
        actor.slotKey = `huddle:${agent.id}`;
        this.setActorGoal(actor, st.huddleX, st.huddleY, 'briefing', 'Planning DAG');
      } else if (mission.status === 'running' && mission.currentStage === 'model-selection') {
        actor.slotKey = `computer:${agent.id}`;
        this.setActorGoal(actor, st.chairX, st.chairY, 'at-computer', 'Heading to PC');
      } else if (runningTask) {
        actor.slotKey = `computer:${agent.id}`;
        this.setActorGoal(actor, st.chairX, st.chairY, 'working', runningTask.title.slice(0, 20));
      } else if (mission.status === 'running' && mission.currentStage === 'response-generation') {
        actor.slotKey = `huddle:${agent.id}`;
        this.setActorGoal(actor, st.huddleX, st.huddleY, 'briefing', 'Syncing results');
      } else if (allDone && mission.status === 'running') {
        actor.slotKey = `computer:${agent.id}`;
        this.setActorGoal(actor, st.chairX, st.chairY, 'done', 'Task Done!');
      }
    }
  }

  getActorActivityLabel(agentId) {
    const actor = this.actors.get(agentId);
    if (!actor) return 'Standby';
    if (actor.walking) return 'Walking';
    switch (actor.activity) {
      case 'working':
        return 'Coding / Working';
      case 'at-computer':
        return 'At Computer';
      case 'pickleball':
        return 'Playing Pickleball';
      case 'swim':
        return 'Swimming Laps';
      case 'basketball':
        return 'Playing Basketball';
      case 'soccer':
        return 'Playing Soccer';
      case 'pingpong':
        return 'Playing Ping-Pong';
      case 'gym-run':
        return 'Gym: Treadmill';
      case 'gym-lift':
        return 'Gym: Weights';
      case 'coffee':
        return 'Coffee Cafe';
      case 'bar':
        return 'Drinks Bar';
      case 'dance':
        return 'Dancing!';
      case 'lounge':
        return 'Lounge Sofa';
      case 'briefing':
        return 'In Briefing';
      case 'done':
        return 'Done';
      default:
        return 'On Campus';
    }
  }

  hasActivity(activityName) {
    for (const actor of this.actors.values()) {
      if (actor.activity === activityName && !actor.walking) return true;
    }
    return false;
  }

  start() {
    const tick = (now) => {
      const dt = Math.min(0.05, (now - this.lastFrameMs) / 1000);
      this.lastFrameMs = now;
      this.clockSec += dt;

      this.update(dt);
      this.render();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  update(dt) {
    this.yaw += (this.targetYaw - this.yaw) * Math.min(1, dt * 10);
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 10);

    for (let i = this.packets.length - 1; i >= 0; i -= 1) {
      this.packets[i].progress += dt * 1.1;
      if (this.packets[i].progress >= 1) this.packets.splice(i, 1);
    }

    const isFreeTime = !this.mission || this.mission.status === 'completed';
    let stateChanged = false;

    if (!this.reducedMotion) {
      this.sportsClock += dt * 1.4;
    }

    if (isFreeTime && !this.reducedMotion) {
      this.banterTimer -= dt;
      if (this.banterTimer <= 0) {
        this.banterTimer = 8.0;
        const pair = BANTER_PAIRS[this.banterPairIdx % BANTER_PAIRS.length];
        this.banterPairIdx += 1;
        const first = pair.lines[0];
        const second = pair.lines[1];
        this.showAgentSpeech(first.speaker, first.text, 4.0);
        this.onBanter({ speakerId: first.speaker, text: first.text, zone: pair.spot });
        setTimeout(() => {
          this.showAgentSpeech(second.speaker, second.text, 4.0);
          this.onBanter({ speakerId: second.speaker, text: second.text, zone: pair.spot });
        }, 2000);
      }
    }

    for (const actor of this.actors.values()) {
      if (actor.speechTimer > 0) {
        actor.speechTimer -= dt;
        if (actor.speechTimer <= 0) actor.speech = '';
      }

      const dx = actor.targetX - actor.x;
      const dy = actor.targetY - actor.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.08) {
        if (this.reducedMotion) {
          actor.x = actor.targetX;
          actor.y = actor.targetY;
          actor.walking = false;
          stateChanged = true;
        } else {
          const speed = this.mission?.status === 'running' ? 4.8 : 2.5;
          const step = Math.min(dist, speed * dt);
          actor.x += (dx / dist) * step;
          actor.y += (dy / dist) * step;
          actor.walking = true;
          actor.walkPhase += dt * 11;
        }
      } else {
        if (actor.walking) {
          actor.walking = false;
          stateChanged = true;
        }
        actor.actionPhase += dt * (actor.activity === 'gym-run' || actor.activity === 'swim' ? 11 : actor.activity === 'working' ? 14 : 4);
      }

      if (isFreeTime && !this.reducedMotion && !actor.walking) {
        actor.idleTimer -= dt;
        if (actor.idleTimer <= 0) {
          actor.idleTimer = 8 + Math.random() * 8;
          const occupied = new Set(
            [...this.actors.values()].filter((a) => a.id !== actor.id).map((a) => a.slotKey)
          );
          const st = STATIONS[actor.id];
          const allOptions = [
            { key: `computer:${actor.id}`, x: st.chairX, y: st.chairY, activity: 'at-computer', msg: 'At workstation' },
            ...REC_SLOTS.filter((slot) => !occupied.has(slot.key))
          ];
          const pick = allOptions[Math.floor(Math.random() * allOptions.length)];
          actor.slotKey = pick.key;
          this.setActorGoal(actor, pick.x, pick.y, pick.activity, pick.msg);
          stateChanged = true;
        }
      }
    }

    if (stateChanged) {
      this.onStatusChange();
    }
  }

  // --- 3D Primitives ---

  drawBox3D(ctx, cx, cy, z0, sx, sy, sz, colorHex, strokeAlpha = 0.25) {
    const hx = sx / 2;
    const hy = sy / 2;
    const topZ = z0 + sz;

    const p00 = this.project(cx - hx, cy - hy, topZ);
    const p10 = this.project(cx + hx, cy - hy, topZ);
    const p11 = this.project(cx + hx, cy + hy, topZ);
    const p01 = this.project(cx - hx, cy + hy, topZ);

    const b00 = this.project(cx - hx, cy - hy, z0);
    const b10 = this.project(cx + hx, cy - hy, z0);
    const b11 = this.project(cx + hx, cy + hy, z0);
    const b01 = this.project(cx - hx, cy + hy, z0);

    const faces = [
      { pts: [p00, p10, b10, b00], depth: (p00.depth + p10.depth) / 2, shade: 0.74 },
      { pts: [p10, p11, b11, b10], depth: (p10.depth + p11.depth) / 2, shade: 0.6 },
      { pts: [p11, p01, b01, b11], depth: (p11.depth + p01.depth) / 2, shade: 0.85 },
      { pts: [p01, p00, b00, b01], depth: (p01.depth + p00.depth) / 2, shade: 0.68 }
    ];

    faces.sort((a, b) => a.depth - b.depth);
    for (let i = 2; i < 4; i += 1) {
      const f = faces[i];
      ctx.fillStyle = shadeHex(colorHex, f.shade);
      ctx.beginPath();
      ctx.moveTo(f.pts[0].sx, f.pts[0].sy);
      for (let j = 1; j < 4; j += 1) ctx.lineTo(f.pts[j].sx, f.pts[j].sy);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = shadeHex(colorHex, 1.0);
    ctx.beginPath();
    ctx.moveTo(p00.sx, p00.sy);
    ctx.lineTo(p10.sx, p10.sy);
    ctx.lineTo(p11.sx, p11.sy);
    ctx.lineTo(p01.sx, p01.sy);
    ctx.closePath();
    ctx.fill();
    if (strokeAlpha > 0) {
      ctx.strokeStyle = `rgba(15, 23, 42, ${strokeAlpha})`;
      ctx.lineWidth = 0.65;
      ctx.stroke();
    }
  }

  drawGlassWall3D(ctx, x1, y1, x2, y2, height, tint = 'rgba(56, 189, 248, 0.14)') {
    const a = this.project(x1, y1, 0);
    const b = this.project(x2, y2, 0);
    const c = this.project(x2, y2, height);
    const d = this.project(x1, y1, height);

    ctx.fillStyle = tint;
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.lineTo(c.sx, c.sy);
    ctx.lineTo(d.sx, d.sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawFloorQuad(ctx, x1, y1, x2, y2, fill, stroke = null) {
    const a = this.project(x1, y1, 0);
    const b = this.project(x2, y1, 0);
    const c = this.project(x2, y2, 0);
    const d = this.project(x1, y2, 0);

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.lineTo(c.sx, c.sy);
    ctx.lineTo(d.sx, d.sy);
    ctx.closePath();
    ctx.fill();

    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  }

  drawLine3D(ctx, x1, y1, z1, x2, y2, z2, color, width = 1.5) {
    const p1 = this.project(x1, y1, z1);
    const p2 = this.project(x2, y2, z2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.stroke();
  }

  render() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = LOGICAL_WIDTH * dpr;
    const targetH = LOGICAL_HEIGHT * dpr;
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    const ctx = this.ctx;
    this.hitBoxes = [];

    ctx.save();
    ctx.scale(dpr, dpr);

    const bg = ctx.createRadialGradient(LOGICAL_WIDTH * 0.5, LOGICAL_HEIGHT * 0.45, 60, LOGICAL_WIDTH * 0.5, LOGICAL_HEIGHT * 0.5, 580);
    bg.addColorStop(0, '#10213f');
    bg.addColorStop(1, '#060c18');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // 1. Campus Platform (Office Wing + 2-Column Sports & Aquatics Wing)
    this.drawBox3D(ctx, 2.2, 0, -0.45, 26.8, 19.6, 0.45, '#1b2944');
    this.drawFloorQuad(ctx, -11.2, -9.8, 15.6, 9.8, '#1d2b46', 'rgba(56, 189, 248, 0.35)');

    // Office Atrium Luxury Flooring & Luminous Runway Lines
    this.drawFloorQuad(ctx, -10.8, -9.4, 4.1, 9.4, '#18243d', 'rgba(56, 189, 248, 0.35)');
    for (let gx = -10; gx <= 4; gx += 2) {
      this.drawLine3D(ctx, gx, -9.4, 0.01, gx, 9.4, 0.01, 'rgba(148, 163, 184, 0.09)', 1);
    }
    for (let gy = -9; gy <= 9; gy += 2) {
      this.drawLine3D(ctx, -10.8, gy, 0.01, 4.1, gy, 0.01, 'rgba(148, 163, 184, 0.09)', 1);
    }

    // Center Walkway Spine with glowing LED edge strips
    this.drawFloorQuad(ctx, 4.0, -9.4, 4.9, 9.4, 'rgba(56, 189, 248, 0.16)');
    this.drawLine3D(ctx, 4.05, -9.4, 0.02, 4.05, 9.4, 0.02, 'rgba(56, 189, 248, 0.55)', 1.6);
    this.drawLine3D(ctx, 4.85, -9.4, 0.02, 4.85, 9.4, 0.02, 'rgba(52, 211, 153, 0.45)', 1.6);

    // 2. 8 Bespoke Specialist Office Suites with warm ambient accents
    for (const agent of this.team) {
      const st = STATIONS[agent.id];
      if (!st) continue;
      const isSelected = this.selectedDeskId === agent.id || this.tourTarget === agent.id;
      this.drawFloorQuad(
        ctx,
        st.x - 1.85,
        st.y - 1.85,
        st.x + 1.85,
        st.y + 1.85,
        '#21314f',
        isSelected ? agent.accent : 'rgba(148, 163, 184, 0.42)'
      );
      this.drawFloorQuad(ctx, st.x - 1.35, st.y - 1.15, st.x + 1.35, st.y + 1.15, st.rugColor, 'rgba(255,255,255,0.12)');
    }

    // 3. East Column 1: Pickleball, Gym, Basketball, Coffee Cafe
    // Pickleball Court (y: -9.1 .. -4.2)
    this.drawFloorQuad(ctx, 5.1, -9.1, 9.7, -4.2, '#16a34a', '#bbf7d0');
    this.drawFloorQuad(ctx, 5.4, -8.5, 9.4, -4.8, '#2563eb', '#ffffff');
    this.drawLine3D(ctx, 6.8, -8.5, 0.02, 6.8, -4.8, 0.02, '#ffffff', 1.2);
    this.drawLine3D(ctx, 8.0, -8.5, 0.02, 8.0, -4.8, 0.02, '#ffffff', 1.2);

    // Fitness Gym (y: -3.5 .. +0.3)
    this.drawFloorQuad(ctx, 5.1, -3.5, 9.7, 0.3, '#273244', 'rgba(250, 204, 21, 0.55)');
    this.drawFloorQuad(ctx, 5.5, -0.8, 7.2, 0.0, '#9333ea'); // yoga mat

    // Basketball Court (y: +1.0 .. +5.5)
    this.drawFloorQuad(ctx, 5.1, 1.0, 9.7, 5.5, '#c26d27', '#fde68a');
    this.drawFloorQuad(ctx, 8.0, 2.3, 9.6, 4.2, '#9a3412', '#ffffff'); // painted key
    this.drawLine3D(ctx, 7.2, 1.0, 0.02, 7.2, 5.5, 0.02, '#ffffff', 1.2);

    // Coffee & Lounge Cafe (y: +6.2 .. +9.2)
    this.drawFloorQuad(ctx, 5.1, 6.2, 9.7, 9.2, '#3b2b28', 'rgba(251, 146, 60, 0.55)');

    // 4. East Column 2: Swimming Pool, Soccer/Futsal Pitch, Ping-Pong & Garden
    // Olympic Swimming Pool (x: 10.3..14.9, y: -9.1..-2.5)
    this.drawFloorQuad(ctx, 10.3, -9.1, 14.9, -2.5, '#cbd5e1', '#e2e8f0'); // tiled deck
    const waterColor = !this.reducedMotion && Math.sin(this.clockSec * 2) > 0 ? '#0284c7' : '#0369a1';
    this.drawFloorQuad(ctx, 10.8, -8.6, 14.4, -3.0, waterColor, '#7dd3fc'); // pool water
    // Pool Lane Dividers (3 lanes)
    this.drawLine3D(ctx, 12.0, -8.6, 0.05, 12.0, -3.0, 0.05, '#facc15', 1.5);
    this.drawLine3D(ctx, 13.2, -8.6, 0.05, 13.2, -3.0, 0.05, '#f87171', 1.5);

    // Futsal / Soccer Mini-Pitch (x: 10.3..14.9, y: -1.8..+3.2)
    this.drawFloorQuad(ctx, 10.3, -1.8, 14.9, 3.2, '#15803d', '#86efac');
    this.drawFloorQuad(ctx, 11.4, -1.8, 12.6, 3.2, '#166534'); // turf stripe
    this.drawFloorQuad(ctx, 13.7, -1.8, 14.9, 3.2, '#166534');
    this.drawLine3D(ctx, 12.6, -1.8, 0.02, 12.6, 3.2, 0.02, '#ffffff', 1.2);
    this.drawFloorQuad(ctx, 13.9, -0.4, 14.9, 1.8, 'rgba(255,255,255,0.06)', '#ffffff');

    // Table Tennis (Ping-Pong) & Garden (x: 10.3..14.9, y: +3.9..+6.1)
    this.drawFloorQuad(ctx, 10.3, 3.9, 14.9, 6.1, '#143f32', 'rgba(52, 211, 153, 0.55)');

    // Drinks Bar & Neon LED Dance Floor (x: 10.3..14.9, y: +6.4..+9.3)
    this.drawFloorQuad(ctx, 10.3, 6.4, 14.9, 9.3, '#1a1033', 'rgba(232, 121, 249, 0.6)');
    this.drawDanceFloorTiles(ctx);

    // Glowing golden-cyan neural bridge connecting J.A.R.V.I.S. AI Brain directly to CEO Suite!
    this.drawLine3D(
      ctx,
      STATIONS.jarvis.x,
      STATIONS.jarvis.y,
      0.08,
      STATIONS.ceo.x,
      STATIONS.ceo.y,
      0.08,
      '#fbbf24',
      2.6
    );

    // 5. Data Conduits from JARVIS Brain to all specialist desks
    for (const agent of this.team) {
      const st = STATIONS[agent.id];
      if (!st) continue;
      const active = (this.mission?.tasks ?? []).some(
        (t) => t.agentId === agent.id && t.status === 'running'
      );
      this.drawLine3D(
        ctx,
        STATIONS.jarvis.x,
        STATIONS.jarvis.y,
        0.04,
        st.deskX,
        st.deskY,
        0.04,
        active ? '#38bdf8' : 'rgba(125, 211, 252, 0.25)',
        active ? 2.4 : 1.0
      );
    }

    // 6. Depth-sorted 3D Objects & Characters
    const drawables = [];
    const pushItem = (wx, wy, fn) => {
      const p = this.project(wx, wy, 0);
      drawables.push({ depth: p.depth, fn });
    };

    pushItem(STATIONS.jarvis.x, STATIONS.jarvis.y, () => this.drawJarvisCore3D(ctx));

    for (const agent of this.team) {
      const st = STATIONS[agent.id];
      if (!st) continue;
      const isWorking = (this.mission?.tasks ?? []).some(
        (t) => t.agentId === agent.id && t.status === 'running'
      );
      pushItem(st.x, st.y - 1.75, () =>
        this.drawGlassWall3D(ctx, st.x - 1.7, st.y - 1.73, st.x + 1.7, st.y - 1.73, 1.25)
      );
      pushItem(st.deskX, st.deskY, () => this.drawWorkstation3D(ctx, agent, st, isWorking));
      pushItem(st.x + 1.25, st.y - 1.15, () => this.drawRoomProp3D(ctx, agent.id, st));
    }

    // Sports Equipment & Animated Balls
    pushItem(7.4, -6.65, () => this.drawPickleballNetAndBall3D(ctx));
    pushItem(5.8, -2.5, () => this.drawTreadmill3D(ctx, 5.8, -2.5));
    pushItem(7.2, -2.5, () => this.drawTreadmill3D(ctx, 7.2, -2.5));
    pushItem(8.9, -2.1, () => this.drawWeightsStation3D(ctx, 8.9, -2.1));
    pushItem(9.4, 3.25, () => this.drawBasketballHoopAndBall3D(ctx));
    pushItem(14.7, 0.7, () => this.drawSoccerGoalAndBall3D(ctx));
    pushItem(12.4, 4.8, () => this.drawPingPongTableAndBall3D(ctx));
    pushItem(14.3, 4.5, () => this.drawTree3D(ctx, 14.3, 4.5));
    pushItem(6.2, 6.9, () => this.drawCoffeeCafe3D(ctx, 6.2, 6.9));
    pushItem(8.6, 7.0, () => this.drawLoungeSofa3D(ctx, 8.6, 7.0));
    pushItem(11.1, 7.1, () => this.drawDrinksBar3D(ctx, 11.1, 7.1));
    pushItem(13.5, 7.0, () => this.drawDiscoBall3D(ctx, 13.5, 7.0));

    for (const actor of this.actors.values()) {
      pushItem(actor.x, actor.y, () => this.drawCharacter3D(ctx, actor));
    }

    drawables.sort((a, b) => a.depth - b.depth);
    for (const d of drawables) d.fn();

    for (const p of this.packets) {
      const px = p.fromX + (p.toX - p.fromX) * p.progress;
      const py = p.fromY + (p.toY - p.fromY) * p.progress;
      const pz = 0.8 + Math.sin(p.progress * Math.PI) * 0.9;
      const pt = this.project(px, py, pz);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Zone labels
    this.drawZoneLabel(ctx, 7.4, -9.3, 0.15, 'PICKLEBALL', '#86efac');
    this.drawZoneLabel(ctx, 12.6, -9.3, 0.15, 'SWIMMING POOL', '#7dd3fc');
    this.drawZoneLabel(ctx, 7.4, -3.7, 0.15, 'FITNESS GYM', '#fde047');
    this.drawZoneLabel(ctx, 12.6, -2.0, 0.15, 'SOCCER PITCH', '#86efac');
    this.drawZoneLabel(ctx, 7.4, 0.8, 0.15, 'BASKETBALL', '#fdba74');
    this.drawZoneLabel(ctx, 12.6, 3.7, 0.15, 'PING-PONG', '#6ee7b7');
    this.drawZoneLabel(ctx, 7.4, 6.0, 0.15, 'COFFEE & DRINKS', '#fdba74');
    this.drawZoneLabel(ctx, 12.6, 6.3, 0.15, 'BAR & DANCE FLOOR', '#f0abfc');

    for (const agent of this.team) {
      const st = STATIONS[agent.id];
      if (!st) continue;
      this.drawZoneLabel(ctx, st.x, st.y + 1.8, 0.15, st.label.toUpperCase(), agent.accent);
    }

    const placedBubbles = [];
    const speakingActors = [...this.actors.values()]
      .filter((a) => a.speech)
      .sort((a, b) => b.speechTimer - a.speechTimer)
      .slice(0, 3);

    for (const actor of speakingActors) {
      const sp = this.project(actor.x, actor.y, 1.95);
      this.drawDeoverlappedSpeechBubble(ctx, sp.sx, sp.sy, actor.speech, actor.accent, placedBubbles);
    }

    ctx.restore();
  }

  drawJarvisCore3D(ctx) {
    const cx = STATIONS.jarvis.x;
    const cy = STATIONS.jarvis.y;
    const isRunning = this.mission?.status === 'running';

    // Glowing atrium floor halo
    const hubFloor = this.project(cx, cy, 0.03);
    ctx.save();
    ctx.strokeStyle = isRunning ? '#38bdf8' : 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(hubFloor.sx, hubFloor.sy, 46 * this.zoom, 23 * this.zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 4 Surrounding Briefing Holo-Stools
    for (const [ox, oy] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
      this.drawBox3D(ctx, cx + ox, cy + oy, 0, 0.42, 0.42, 0.28, '#334155');
      this.drawBox3D(ctx, cx + ox, cy + oy, 0.28, 0.46, 0.46, 0.08, '#38bdf8');
    }

    // Two-tier Neural AI Brain Dais
    this.drawBox3D(ctx, cx, cy, 0, 2.2, 2.2, 0.22, '#0f294a');
    this.drawBox3D(ctx, cx, cy, 0.22, 1.6, 1.6, 0.18, '#1d4ed8');
    this.drawBox3D(ctx, cx, cy, 0.4, 1.1, 1.1, 0.12, '#38bdf8');

    const floatZ = this.reducedMotion ? 1.25 : 1.25 + Math.sin(this.clockSec * 2.5) * 0.15;
    const top = this.project(cx, cy, floatZ + 0.72);
    const bot = this.project(cx, cy, floatZ - 0.36);
    const r = 16 * this.zoom;
    const angle = this.reducedMotion ? 0.5 : this.clockSec * (isRunning ? 2.5 : 0.9);

    const midPts = [];
    for (let i = 0; i < 4; i += 1) {
      const a = angle + (i * Math.PI) / 2;
      midPts.push(this.project(cx + Math.cos(a) * 0.65, cy + Math.sin(a) * 0.65, floatZ + 0.18));
    }

    ctx.save();
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = isRunning ? 24 : 15;
    for (let i = 0; i < 4; i += 1) {
      const p1 = midPts[i];
      const p2 = midPts[(i + 1) % 4];
      ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.85)' : 'rgba(167, 139, 250, 0.62)';
      ctx.beginPath();
      ctx.moveTo(top.sx, top.sy);
      ctx.lineTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(14, 116, 144, 0.72)';
      ctx.beginPath();
      ctx.moveTo(bot.sx, bot.sy);
      ctx.lineTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.closePath();
      ctx.fill();
    }
    // Glowing inner Neural Brain Sphere
    const corePt = this.project(cx, cy, floatZ + 0.18);
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(corePt.sx, corePt.sy, 6.5 * this.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const lbl = this.project(cx, cy, 0);
    this.hitBoxes.push({ id: 'jarvis', sx: lbl.sx, sy: lbl.sy - 20, radius: r * 2.1 });
    this.drawZoneLabel(ctx, cx, cy, 2.35, 'J.A.R.V.I.S. AI BRAIN', '#7dd3fc');
  }

  drawWorkstation3D(ctx, agent, st, isWorking) {
    // Executive ergonomic chair with headrest accent
    this.drawBox3D(ctx, st.chairX, st.chairY, 0.2, 0.6, 0.6, 0.24, '#334155');
    this.drawBox3D(ctx, st.chairX, st.chairY + 0.22, 0.44, 0.52, 0.14, 0.42, agent.accent);

    // Executive walnut/chrome desk (CEO gets grand mahogany + gold triple-monitor setup)
    const isCeo = agent.id === 'ceo';
    this.drawBox3D(ctx, st.deskX, st.deskY, 0, isCeo ? 2.15 : 1.85, isCeo ? 1.05 : 0.94, 0.7, isCeo ? '#78350f' : '#925e38');
    this.drawBox3D(ctx, st.deskX, st.deskY + (isCeo ? 0.51 : 0.46), 0.64, isCeo ? 2.17 : 1.87, 0.04, 0.06, agent.accent, 0);

    // Warm glowing desk lamp
    this.drawBox3D(ctx, st.deskX + 0.75, st.deskY + 0.22, 0.7, 0.14, 0.14, 0.36, '#fde047');

    // Dual/Triple glowing curved monitors
    const screenColor = isWorking ? agent.accent : '#38bdf8';
    this.drawBox3D(ctx, st.deskX - 0.42, st.deskY - 0.15, 0.7, 0.68, 0.14, 0.48, '#0f172a');
    this.drawBox3D(ctx, st.deskX - 0.42, st.deskY - 0.07, 0.76, 0.58, 0.05, 0.36, screenColor, 0);
    this.drawBox3D(ctx, st.deskX + 0.42, st.deskY - 0.15, 0.7, 0.68, 0.14, 0.48, '#0f172a');
    this.drawBox3D(ctx, st.deskX + 0.42, st.deskY - 0.07, 0.76, 0.58, 0.05, 0.36, isWorking ? '#34d399' : agent.accent, 0);
    if (isCeo) {
      this.drawBox3D(ctx, st.deskX, st.deskY - 0.18, 0.7, 0.56, 0.14, 0.52, '#0f172a');
      this.drawBox3D(ctx, st.deskX, st.deskY - 0.1, 0.76, 0.48, 0.05, 0.4, '#fbbf24', 0);
    }
    this.drawBox3D(ctx, st.deskX, st.deskY + 0.2, 0.7, 0.74, 0.22, 0.04, '#1e293b');

    const p = this.project(st.deskX, st.deskY, 0.5);
    this.hitBoxes.push({ id: agent.id, sx: p.sx, sy: p.sy, radius: 28 * this.zoom });
  }

  drawRoomProp3D(ctx, agentId, st) {
    // Every office gets a lush potted plant + its signature bespoke furniture!
    this.drawBox3D(ctx, st.x - 1.35, st.y - 1.2, 0, 0.34, 0.34, 0.28, '#9a3412');
    this.drawBox3D(ctx, st.x - 1.35, st.y - 1.2, 0.28, 0.5, 0.5, 0.42, '#22c55e');

    if (agentId === 'ceo') {
      // Gold trophy/globe pedestal + visitor chairs
      this.drawBox3D(ctx, st.x + 1.25, st.y + 1.05, 0, 0.45, 0.45, 0.85, '#78350f');
      this.drawBox3D(ctx, st.x + 1.25, st.y + 1.05, 0.85, 0.32, 0.32, 0.32, '#fbbf24');
      this.drawBox3D(ctx, st.x - 1.15, st.y + 1.05, 0, 0.48, 0.48, 0.38, '#b45309');
    } else if (agentId === 'sage') {
      // Packed multi-colored research bookshelf
      this.drawBox3D(ctx, st.x + 1.25, st.y + 1.1, 0, 1.0, 0.44, 1.4, '#78350f');
      this.drawBox3D(ctx, st.x + 1.1, st.y + 1.1, 0.92, 0.25, 0.46, 0.2, '#34d399');
      this.drawBox3D(ctx, st.x + 1.4, st.y + 1.1, 0.92, 0.25, 0.46, 0.2, '#38bdf8');
    } else if (agentId === 'vulcan' || agentId === 'aegis' || agentId === 'orion') {
      // Glowing compute/security rack
      this.drawBox3D(ctx, st.x + 1.25, st.y - 1.1, 0, 0.6, 0.6, 1.45, '#1e293b');
      this.drawBox3D(ctx, st.x + 1.25, st.y - 1.1, 1.1, 0.64, 0.64, 0.12, '#38bdf8');
      this.drawBox3D(ctx, st.x + 1.25, st.y - 1.1, 0.72, 0.64, 0.64, 0.08, '#34d399');
    } else if (agentId === 'athena' || agentId === 'vera') {
      // Strategy / QA Kanban Whiteboard with colorful sticky cards
      this.drawBox3D(ctx, st.x - 1.32, st.y + 1.05, 0.32, 0.12, 1.15, 0.95, '#f8fafc');
      this.drawBox3D(ctx, st.x - 1.25, st.y + 0.85, 0.85, 0.04, 0.22, 0.2, '#facc15', 0);
      this.drawBox3D(ctx, st.x - 1.25, st.y + 1.2, 0.75, 0.04, 0.22, 0.2, '#34d399', 0);
    } else if (agentId === 'iris') {
      // UI Color Swatch Studio Wall
      this.drawBox3D(ctx, st.x + 1.22, st.y + 1.0, 0.35, 0.14, 1.05, 0.95, '#334155');
      this.drawBox3D(ctx, st.x + 1.14, st.y + 0.8, 0.85, 0.04, 0.24, 0.24, '#f472b6', 0);
      this.drawBox3D(ctx, st.x + 1.14, st.y + 1.15, 0.85, 0.04, 0.24, 0.24, '#38bdf8', 0);
    } else {
      // Nova: Dual studio speaker & warm desk plant
      this.drawBox3D(ctx, st.x + 1.22, st.y + 1.05, 0, 0.46, 0.46, 0.85, '#0891b2');
      this.drawBox3D(ctx, st.x + 1.22, st.y + 1.05, 0.85, 0.38, 0.38, 0.14, '#22d3ee');
    }
  }

  drawPickleballNetAndBall3D(ctx) {
    this.drawBox3D(ctx, 7.4, -8.55, 0, 0.12, 0.12, 0.85, '#f8fafc');
    this.drawBox3D(ctx, 7.4, -4.75, 0, 0.12, 0.12, 0.85, '#f8fafc');
    const n00 = this.project(7.4, -8.5, 0.78);
    const n10 = this.project(7.4, -4.8, 0.78);
    const n11 = this.project(7.4, -4.8, 0.15);
    const n01 = this.project(7.4, -8.5, 0.15);
    ctx.fillStyle = 'rgba(248, 250, 252, 0.35)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(n00.sx, n00.sy);
    ctx.lineTo(n10.sx, n10.sy);
    ctx.lineTo(n11.sx, n11.sy);
    ctx.lineTo(n01.sx, n01.sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (this.hasActivity('pickleball')) {
      const cycle = (Math.sin(this.sportsClock * Math.PI) + 1) / 2;
      const bx = 5.8 + cycle * 3.1;
      const by = -6.65 + Math.sin(this.sportsClock * 1.7) * 0.7;
      const bz = 0.25 + Math.abs(Math.sin(this.sportsClock * Math.PI)) * 1.0;
      const ball = this.project(bx, by, bz);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(ball.sx, ball.sy, 4.2 * this.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawBasketballHoopAndBall3D(ctx) {
    // 3D Pole, Backboard, and Orange Rim at (9.35, 3.25)
    this.drawBox3D(ctx, 9.45, 3.25, 0, 0.18, 0.18, 2.35, '#475569');
    this.drawBox3D(ctx, 9.2, 3.25, 1.85, 0.1, 1.15, 0.78, '#f8fafc');
    this.drawBox3D(ctx, 8.92, 3.25, 1.98, 0.42, 0.42, 0.08, '#f97316');

    if (this.hasActivity('basketball')) {
      const t = (this.sportsClock * 0.75) % 1;
      const bx = 6.5 + t * 2.4;
      const by = 2.8 + Math.sin(t * Math.PI) * 0.45;
      const bz = 0.25 + Math.sin(t * Math.PI) * 2.15;
      const shadow = this.project(bx, by, 0.02);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(shadow.sx, shadow.sy, 4.5 * this.zoom, 2 * this.zoom, 0, 0, Math.PI * 2);
      ctx.fill();

      const ball = this.project(bx, by, bz);
      ctx.fillStyle = '#ea580c';
      ctx.strokeStyle = '#431407';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ball.sx, ball.sy, 5.2 * this.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  drawSoccerGoalAndBall3D(ctx) {
    // 3D Goalposts at x = 14.7, y = -0.2 .. +1.6
    this.drawBox3D(ctx, 14.65, -0.2, 0, 0.14, 0.14, 1.15, '#ffffff');
    this.drawBox3D(ctx, 14.65, 1.6, 0, 0.14, 0.14, 1.15, '#ffffff');
    this.drawBox3D(ctx, 14.65, 0.7, 1.1, 0.14, 1.94, 0.12, '#ffffff');

    if (this.hasActivity('soccer')) {
      const t = (Math.sin(this.sportsClock * 1.9) + 1) / 2;
      const bx = 11.7 + t * 2.6;
      const by = 0.2 + Math.cos(this.sportsClock * 1.4) * 0.75;
      const bz = 0.22 + Math.abs(Math.sin(this.sportsClock * 3.2)) * 0.4;
      const ball = this.project(bx, by, bz);
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(ball.sx, ball.sy, 4.6 * this.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  drawPingPongTableAndBall3D(ctx) {
    this.drawBox3D(ctx, 12.4, 4.8, 0.55, 1.5, 0.95, 0.12, '#15803d');
    this.drawBox3D(ctx, 12.4, 4.8, 0, 0.9, 0.6, 0.55, '#1e293b');
    this.drawBox3D(ctx, 12.4, 4.8, 0.67, 0.06, 0.95, 0.18, '#f8fafc');

    if (this.hasActivity('pingpong')) {
      const cycle = (Math.sin(this.sportsClock * 3.8) + 1) / 2;
      const bx = 11.75 + cycle * 1.3;
      const bz = 0.78 + Math.abs(Math.sin(this.sportsClock * 3.8)) * 0.35;
      const ball = this.project(bx, 4.8, bz);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.sx, ball.sy, 2.8 * this.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawDanceFloorTiles(ctx) {
    const palette = ['#e879f9', '#38bdf8', '#a855f7', '#f472b6', '#facc15', '#34d399'];
    const phase = this.reducedMotion ? 0 : Math.floor(this.clockSec * 3);
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const x1 = 12.2 + col * 0.85;
        const y1 = 6.9 + row * 0.72;
        const color = palette[(row * 3 + col + phase) % palette.length];
        this.drawFloorQuad(ctx, x1, y1, x1 + 0.78, y1 + 0.65, color);
      }
    }
  }

  drawDrinksBar3D(ctx, x, y) {
    // 3D Bar counter with glowing cyan trim + colorful bottles & drinks
    this.drawBox3D(ctx, x, y, 0, 1.4, 0.72, 0.78, '#312e81');
    this.drawBox3D(ctx, x, y + 0.36, 0.65, 1.42, 0.06, 0.12, '#22d3ee', 0);
    // Drink glasses & bottles on bar top
    this.drawBox3D(ctx, x - 0.42, y, 0.78, 0.14, 0.14, 0.28, '#f472b6');
    this.drawBox3D(ctx, x - 0.12, y + 0.08, 0.78, 0.14, 0.14, 0.22, '#facc15');
    this.drawBox3D(ctx, x + 0.22, y - 0.04, 0.78, 0.14, 0.14, 0.26, '#34d399');
    this.drawBox3D(ctx, x + 0.48, y + 0.05, 0.78, 0.14, 0.14, 0.2, '#38bdf8');
    // 2 Bar stools
    this.drawBox3D(ctx, x - 0.35, y + 0.62, 0, 0.3, 0.3, 0.45, '#64748b');
    this.drawBox3D(ctx, x + 0.35, y + 0.62, 0, 0.3, 0.3, 0.45, '#64748b');
  }

  drawDiscoBall3D(ctx, x, y) {
    const p = this.project(x, y, 2.1);
    const r = 10 * this.zoom;
    const glow = this.reducedMotion ? 0.6 : (Math.sin(this.clockSec * 5) + 1) * 0.3 + 0.4;
    ctx.save();
    ctx.fillStyle = `rgba(240, 171, 252, ${glow})`;
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawTreadmill3D(ctx, x, y) {
    this.drawBox3D(ctx, x, y, 0, 0.8, 1.35, 0.16, '#475569');
    this.drawBox3D(ctx, x, y - 0.55, 0.16, 0.7, 0.16, 0.88, '#64748b');
    this.drawBox3D(ctx, x, y - 0.55, 0.98, 0.6, 0.22, 0.16, '#38bdf8');
  }

  drawWeightsStation3D(ctx, x, y) {
    this.drawBox3D(ctx, x - 0.5, y - 0.25, 0, 0.15, 0.15, 1.25, '#94a3b8');
    this.drawBox3D(ctx, x + 0.5, y - 0.25, 0, 0.15, 0.15, 1.25, '#94a3b8');
    this.drawBox3D(ctx, x, y + 0.3, 0, 0.5, 0.95, 0.34, '#ef4444');
    this.drawBox3D(ctx, x, y - 0.25, 1.05, 1.4, 0.08, 0.08, '#e2e8f0');
    this.drawBox3D(ctx, x - 0.65, y - 0.25, 0.9, 0.12, 0.34, 0.34, '#facc15');
    this.drawBox3D(ctx, x + 0.65, y - 0.25, 0.9, 0.12, 0.34, 0.34, '#facc15');
  }

  drawCoffeeCafe3D(ctx, x, y) {
    // Espresso counter + cold drinks cooler fridge
    this.drawBox3D(ctx, x, y, 0, 1.7, 0.7, 0.75, '#92400e');
    this.drawBox3D(ctx, x - 0.3, y, 0.75, 0.42, 0.34, 0.4, '#cbd5e1');
    this.drawBox3D(ctx, x + 0.35, y, 0.75, 0.2, 0.2, 0.2, '#f59e0b');
    // Cold drinks glass cooler beside counter
    this.drawBox3D(ctx, x - 1.15, y, 0, 0.55, 0.55, 1.2, '#0ea5e9');
    this.drawBox3D(ctx, x - 1.15, y + 0.28, 0.25, 0.42, 0.05, 0.75, '#bae6fd', 0);
  }

  drawLoungeSofa3D(ctx, x, y) {
    this.drawBox3D(ctx, x, y, 0, 1.65, 0.75, 0.38, '#818cf8');
    this.drawBox3D(ctx, x, y + 0.28, 0.38, 1.65, 0.2, 0.38, '#6366f1');
  }

  drawArcade3D(ctx, x, y) {
    this.drawBox3D(ctx, x, y, 0, 0.75, 0.68, 1.35, '#9333ea');
    this.drawBox3D(ctx, x, y + 0.18, 0.78, 0.56, 0.3, 0.38, '#38bdf8');
  }

  drawTree3D(ctx, x, y) {
    this.drawBox3D(ctx, x, y, 0, 0.28, 0.28, 0.6, '#92400e');
    this.drawBox3D(ctx, x, y, 0.6, 0.85, 0.85, 0.75, '#16a34a');
    this.drawBox3D(ctx, x, y, 1.15, 0.52, 0.52, 0.4, '#22c55e');
  }

  drawCharacter3D(ctx, actor) {
    const style = CHARACTER_STYLE[actor.id] || CHARACTER_STYLE.athena;
    const isSwimming = actor.activity === 'swim' && !actor.walking;

    // Animated swimming laps in the pool!
    let renderX = actor.x;
    let renderY = actor.y;
    if (isSwimming) {
      renderY = -5.8 + Math.sin(this.clockSec * 1.1 + (actor.id.charCodeAt(0) % 5)) * 2.1;
      const pWater = this.project(renderX, renderY, 0.06);
      const ripple = 10 + (Math.sin(this.clockSec * 5) + 1) * 4;
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.75)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(pWater.sx, pWater.sy, ripple * this.zoom, ripple * 0.48 * this.zoom, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Swim cap + head + freestyle arms above water
      this.drawBox3D(ctx, renderX, renderY, 0.04, 0.45, 0.75, 0.18, style.suit);
      this.drawBox3D(ctx, renderX, renderY + 0.35, 0.14, 0.34, 0.34, 0.3, style.skin);
      this.drawBox3D(ctx, renderX, renderY + 0.35, 0.36, 0.36, 0.36, 0.12, '#38bdf8');
      const armReach = this.reducedMotion ? 0 : Math.sin(actor.actionPhase) * 0.25;
      this.drawBox3D(ctx, renderX - 0.32, renderY + armReach, 0.12, 0.14, 0.32, 0.14, style.skin);
      this.drawBox3D(ctx, renderX + 0.32, renderY - armReach, 0.12, 0.14, 0.32, 0.14, style.skin);

      const headPt = this.project(renderX, renderY, 0.45);
      this.hitBoxes.push({ id: actor.id, sx: headPt.sx, sy: headPt.sy, radius: 22 * this.zoom });
      ctx.font = '700 9px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e0f2fe';
      ctx.fillText(actor.name, pWater.sx, pWater.sy + 18);
      return;
    }

    const isDancing = actor.activity === 'dance' && !actor.walking;
    const danceSway = isDancing && !this.reducedMotion ? Math.sin(this.clockSec * 7) * 0.18 : 0;
    renderX += danceSway;

    const bob =
      actor.walking && !this.reducedMotion
        ? Math.abs(Math.sin(actor.walkPhase)) * 0.14
        : (actor.activity === 'gym-run' || isDancing) && !this.reducedMotion
          ? Math.abs(Math.sin(isDancing ? this.clockSec * 7 : actor.actionPhase)) * 0.15
          : 0;
    const zBase = (actor.activity === 'gym-run' ? 0.18 : 0) + bob;

    const shadow = this.project(renderX, renderY, 0.02);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(shadow.sx, shadow.sy, 10 * this.zoom, 5 * this.zoom, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.selectedDeskId === actor.id || this.tourTarget === actor.id) {
      ctx.strokeStyle = actor.accent;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(shadow.sx, shadow.sy, 15 * this.zoom, 7.5 * this.zoom, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const legSwing =
      (actor.walking || actor.activity === 'gym-run') && !this.reducedMotion
        ? Math.sin(actor.walking ? actor.walkPhase : actor.actionPhase) * 0.15
        : 0;

    this.drawBox3D(ctx, renderX - 0.11, renderY + legSwing, zBase, 0.16, 0.18, 0.1, '#0f172a');
    this.drawBox3D(ctx, renderX + 0.11, renderY - legSwing, zBase, 0.16, 0.18, 0.1, '#0f172a');
    this.drawBox3D(ctx, renderX - 0.11, renderY + legSwing, zBase + 0.1, 0.14, 0.14, 0.34, '#334155');
    this.drawBox3D(ctx, renderX + 0.11, renderY - legSwing, zBase + 0.1, 0.14, 0.14, 0.34, '#334155');

    this.drawBox3D(ctx, renderX, renderY, zBase + 0.44, 0.46, 0.3, 0.52, style.suit);
    this.drawBox3D(ctx, renderX, renderY + 0.07, zBase + 0.74, 0.18, 0.18, 0.18, style.shirt, 0);

    const armSwing =
      actor.walking && !this.reducedMotion
        ? Math.sin(actor.walkPhase) * 0.18
        : isDancing && !this.reducedMotion
          ? Math.sin(this.clockSec * 9) * 0.35
          : actor.activity === 'working' && !this.reducedMotion
            ? Math.sin(actor.actionPhase) * 0.1
            : 0;
    const armZ = isDancing ? zBase + 0.85 : zBase + 0.5;
    this.drawBox3D(ctx, renderX - 0.3, renderY - armSwing, armZ, 0.12, 0.12, 0.4, style.suit);
    this.drawBox3D(ctx, renderX + 0.3, renderY + armSwing, armZ, 0.12, 0.12, 0.4, style.suit);

    if (actor.activity === 'pickleball' || actor.activity === 'pingpong') {
      const paddleSwing = this.reducedMotion ? 0 : Math.sin(this.clockSec * 5) * 0.14;
      this.drawBox3D(
        ctx,
        renderX + 0.4,
        renderY + 0.18 + paddleSwing,
        zBase + 0.6,
        0.08,
        0.26,
        0.28,
        actor.activity === 'pingpong' ? '#ef4444' : '#38bdf8'
      );
    } else if (actor.activity === 'coffee') {
      this.drawBox3D(ctx, renderX + 0.35, renderY + 0.14, zBase + 0.64, 0.12, 0.12, 0.14, '#f8fafc');
    } else if (actor.activity === 'bar') {
      this.drawBox3D(ctx, renderX + 0.35, renderY + 0.14, zBase + 0.64, 0.12, 0.12, 0.18, '#f472b6');
    } else if (actor.activity === 'gym-lift' && !this.reducedMotion) {
      const liftZ = zBase + 0.92 + Math.abs(Math.sin(actor.actionPhase)) * 0.38;
      this.drawBox3D(ctx, renderX, renderY + 0.22, liftZ, 0.85, 0.1, 0.1, '#facc15');
    }

    if (isDancing) {
      const notePt = this.project(renderX + 0.3, renderY, zBase + 1.65);
      ctx.font = '700 12px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#f0abfc';
      ctx.fillText('♪', notePt.sx, notePt.sy);
    }

    this.drawBox3D(ctx, renderX, renderY, zBase + 0.98, 0.34, 0.32, 0.32, style.skin);
    this.drawBox3D(ctx, renderX, renderY, zBase + 1.25, 0.38, 0.36, 0.14, style.hair);
    if (style.visor) {
      this.drawBox3D(ctx, renderX, renderY + 0.16, zBase + 1.12, 0.26, 0.06, 0.08, '#38bdf8', 0);
    }

    const headPt = this.project(renderX, renderY, zBase + 0.85);
    this.hitBoxes.push({ id: actor.id, sx: headPt.sx, sy: headPt.sy, radius: 20 * this.zoom });

    ctx.font = '700 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(actor.name).width + 10;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(shadow.sx - w / 2, shadow.sy + 5, w, 13);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(actor.name, shadow.sx, shadow.sy + 14);
  }

  drawZoneLabel(ctx, wx, wy, wz, text, color) {
    const p = this.project(wx, wy, wz);
    ctx.save();
    ctx.font = '700 8.5px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(text).width + 8;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
    ctx.fillRect(p.sx - w / 2, p.sy - 10, w, 12.5);
    ctx.fillStyle = color;
    ctx.fillText(text, p.sx, p.sy - 0.5);
    ctx.restore();
  }

  drawDeoverlappedSpeechBubble(ctx, sx, sy, text, accent, placedBubbles) {
    ctx.save();
    ctx.font = '600 9.5px Inter, system-ui, sans-serif';
    const clipped = text.length > 24 ? `${text.slice(0, 22)}..` : text;
    const w = Math.max(48, ctx.measureText(clipped).width + 12);
    const h = 20;
    const bx = clamp(sx - w / 2, 8, LOGICAL_WIDTH - w - 8);
    let by = clamp(sy - 12, 8, LOGICAL_HEIGHT - 28);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const collides = placedBubbles.some(
        (b) => bx < b.x + b.w + 4 && bx + w + 4 > b.x && by < b.y + b.h + 4 && by + h + 4 > b.y
      );
      if (!collides) break;
      by = Math.max(8, by - (h + 5));
    }

    placedBubbles.push({ x: bx, y: by, w, h });

    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(clipped, bx + w / 2, by + 13);
    ctx.restore();
  }
}
