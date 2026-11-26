/**
 * Interactive 3D Isometric AI Office & Multi-Department Campus Engine.
 * Organizes the workspace into 6 spacious, dedicated Departments:
 * 1. Executive & AI Core Dept (J.A.R.V.I.S. AI Brain, CEO Suite, Executive Boardroom)
 * 2. Software Engineering Dept (Systems/Backend Vulcan, Web/Frontend Nova)
 * 3. Design & QA Assurance Dept (UI/UX Iris, QA Lab Vera)
 * 4. Infrastructure & Security Dept (Server & Compute Vault, Security Aegis, DevOps Orion)
 * 5. Strategy, Research & Lobby Dept (Reception Lobby, Strategy Athena, Research Sage)
 * 6. Wellness, Sports & Lounge Dept (Pickleball, Olympic Pool, Gym, Basketball, Soccer, Ping-Pong, Coffee, Bar & Dance)
 */

import {
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  DEPARTMENT_ZONES,
  STATIONS,
  INFRA_ROOMS,
  REC_SLOTS,
  CHARACTER_STYLE,
  BANTER_PAIRS,
  clamp
} from './officeLayout.js';

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
    this.onSelectAgent = options.onSelectAgent || (() => { });
    this.onStatusChange = options.onStatusChange || (() => { });
    this.onBanter = options.onBanter || (() => { });

    this.team = [];
    this.controller = null;
    this.mission = null;
    this.selectedDeskId = 'jarvis';
    this.tourTarget = null;
    this.activeDepartmentId = null;
    this.dragHoverId = null;

    this.yaw = Math.PI * 0.24;
    this.targetYaw = this.yaw;
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.focusOffsetX = 0.0;
    this.targetFocusOffsetX = 0.0;
    this.focusOffsetY = 0.0;
    this.targetFocusOffsetY = 0.0;
    this.tilt = 0.52;
    this.upgrades = {
      deskTier: 1,
      brainLinkTier: 1,
      decorTier: 1,
      uiTheme: 'stark-cyan',
      rooms: {}
    };
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

    this.initRenderer(options);
    this.bindEvents();
    this.start();
  }

  initRenderer() {
    this.ctx = this.canvas.getContext('2d');
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
        this.targetZoom = clamp(this.targetZoom + delta, 0.72, 2.2);
      },
      { passive: false }
    );
  }

  rotateCamera(deltaRad) {
    this.targetYaw += deltaRad;
  }

  adjustZoom(delta) {
    this.targetZoom = clamp(this.targetZoom + delta, 0.72, 2.2);
  }

  focusCeoOffice(enabled) {
    if (enabled) {
      this.activeDepartmentId = 'executive';
      this.targetFocusOffsetX = STATIONS.ceo.x;
      this.targetFocusOffsetY = STATIONS.ceo.y;
      this.targetZoom = 1.95;
      this.targetYaw = Math.PI * 0.22;
    } else {
      this.resetCamera();
    }
  }

  focusDepartment(departmentId) {
    const zone = DEPARTMENT_ZONES.find((z) => z.id === departmentId);
    if (!zone) {
      this.resetCamera();
      return;
    }
    this.activeDepartmentId = zone.id;
    this.targetFocusOffsetX = zone.focus.x;
    this.targetFocusOffsetY = zone.focus.y;
    this.targetZoom = zone.focus.zoom;
  }

  focusRoom(wx, wy, zoom = 1.7) {
    this.activeDepartmentId = null;
    this.targetFocusOffsetX = wx;
    this.targetFocusOffsetY = wy;
    this.targetZoom = zoom;
  }

  resetCamera() {
    this.activeDepartmentId = null;
    this.targetYaw = Math.PI * 0.24;
    this.targetZoom = 1.0;
    this.targetFocusOffsetX = 0.0;
    this.targetFocusOffsetY = 0.0;
  }

  getRoomTier(roomId) {
    const rooms = this.upgrades?.rooms;
    if (!rooms || rooms[roomId] === undefined) return 1;
    return rooms[roomId];
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

  getDropTargetAt(sx, sy) {
    const hit = this.pickAt(sx, sy);
    if (!hit || hit.startsWith('room:')) return null;
    return hit;
  }

  setDragHoverLogical(sx, sy) {
    this.dragHoverId = this.getDropTargetAt(sx, sy);
  }

  clearDragHover() {
    this.dragHoverId = null;
  }

  project(wx, wy, wz = 0) {
    const cx = wx - this.focusOffsetX;
    const cy = wy - this.focusOffsetY;
    const cos = Math.cos(this.yaw);
    const sin = Math.sin(this.yaw);
    const rx = cx * cos - cy * sin;
    const ry = cx * sin + cy * cos;
    const scale = 18.8 * this.zoom;
    return {
      sx: LOGICAL_WIDTH * 0.5 + rx * scale,
      sy: LOGICAL_HEIGHT * 0.54 + ry * scale * this.tilt - wz * scale * 0.95,
      depth: ry
    };
  }

  initActors(team) {
    const initialSpots = {
      ceo: { x: STATIONS.ceo.chairX, y: STATIONS.ceo.chairY, slotKey: 'computer:ceo', activity: 'at-computer', speech: 'Reviewing KPIs w/ JARVIS' },
      athena: { x: STATIONS.athena.chairX, y: STATIONS.athena.chairY, slotKey: 'computer:athena', activity: 'at-computer', speech: 'Roadmap online' },
      vulcan: { x: STATIONS.vulcan.chairX, y: STATIONS.vulcan.chairY, slotKey: 'computer:vulcan', activity: 'working', speech: 'Compiling backend API' },
      nova: { x: STATIONS.nova.chairX, y: STATIONS.nova.chairY, slotKey: 'computer:nova', activity: 'working', speech: 'UI live on localhost' },
      iris: { x: STATIONS.iris.chairX, y: STATIONS.iris.chairY, slotKey: 'computer:iris', activity: 'at-computer', speech: 'Design tokens ready' },
      aegis: { x: STATIONS.aegis.chairX, y: STATIONS.aegis.chairY, slotKey: 'computer:aegis', activity: 'at-computer', speech: 'Security audit green' },
      vera: { x: STATIONS.vera.chairX, y: STATIONS.vera.chairY, slotKey: 'computer:vera', activity: 'at-computer', speech: '10/10 QA suite green' },
      orion: { slot: REC_SLOTS[4] },
      sage: { slot: REC_SLOTS[0] }
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

    if (typeof zoneGroup === 'string' && zoneGroup.startsWith('colleague:')) {
      const targetId = zoneGroup.slice(10);
      const targetSt = STATIONS[targetId];
      if (!targetSt) return;
      actor.slotKey = `colleague:${targetId}`;
      const meetX = (targetSt.chairX ?? targetSt.x) + 0.9;
      const meetY = (targetSt.chairY ?? targetSt.y) + 0.15;
      this.setActorGoal(actor, meetX, meetY, 'colleague-talk', `Syncing w/ ${targetId.toUpperCase()}`);
      this.spawnPacket(agentId, targetId, actor.accent);
      this.onStatusChange();
      return;
    }

    if (zoneGroup === 'computer') {
      if (this.getRoomTier(agentId) === 0) {
        actor.slotKey = `huddle:${agentId}`;
        this.setActorGoal(actor, st.huddleX, st.huddleY, 'briefing', 'Build my office!');
      } else {
        actor.slotKey = `computer:${agentId}`;
        this.setActorGoal(actor, st.chairX, st.chairY, 'at-computer', 'At workstation!');
      }
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

  syncState({ team, controller, mission, selectedDeskId, tourTarget, upgrades }) {
    this.team = team || [];
    this.controller = controller || null;
    this.mission = mission || null;
    this.selectedDeskId = selectedDeskId || 'jarvis';
    this.tourTarget = tourTarget || null;
    if (upgrades) {
      this.upgrades = { ...this.upgrades, ...upgrades };
    }

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
        return 'At Workstation';
      case 'meeting':
        return 'In Boardroom';
      case 'server-ops':
        return 'Server Vault Ops';
      case 'lobby':
        return 'Reception Lobby';
      case 'colleague-talk':
        return 'Talking w/ Teammate';
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
    this.focusOffsetX += (this.targetFocusOffsetX - this.focusOffsetX) * Math.min(1, dt * 10);
    this.focusOffsetY += (this.targetFocusOffsetY - this.focusOffsetY) * Math.min(1, dt * 10);

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
        if (pair.packet) {
          this.spawnPacket(pair.packet[0], pair.packet[1], pair.packet[2]);
        }
        this.showAgentSpeech(first.speaker, first.text, 4.2);
        this.onBanter({ speakerId: first.speaker, text: first.text, zone: pair.spot });
        setTimeout(() => {
          this.showAgentSpeech(second.speaker, second.text, 4.2);
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
          const speed = this.mission?.status === 'running' ? 5.2 : 2.8;
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
          const groupToRoom = {
            boardroom: 'conferenceRoom',
            server: 'serverRoom',
            lobby: 'lobbyRoom',
            pickleball: 'pickleballCourt',
            swim: 'swimmingPool',
            gym: 'gymRoom',
            basketball: 'basketballCourt',
            soccer: 'soccerPitch',
            pingpong: 'barLounge',
            coffee: 'barLounge',
            bar: 'barLounge',
            dance: 'barLounge'
          };
          const availableSlots = REC_SLOTS.filter((slot) => {
            if (occupied.has(slot.key)) return false;
            const roomKey = groupToRoom[slot.group];
            return !roomKey || this.getRoomTier(roomKey) >= 1;
          });
          const allOptions = [];
          if (this.getRoomTier(actor.id) >= 1) {
            allOptions.push({
              key: `computer:${actor.id}`,
              x: st.chairX,
              y: st.chairY,
              activity: 'at-computer',
              msg: 'At workstation'
            });
          } else {
            allOptions.push({
              key: `huddle:${actor.id}`,
              x: st.huddleX,
              y: st.huddleY,
              activity: 'briefing',
              msg: 'Waiting for office!'
            });
          }
          allOptions.push(...availableSlots);
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

  drawFloorQuad(ctx, x1, y1, x2, y2, fill, stroke = null, lineWidth = 1.3) {
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
      ctx.lineWidth = lineWidth;
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

    const bg = ctx.createRadialGradient(
      LOGICAL_WIDTH * 0.5,
      LOGICAL_HEIGHT * 0.45,
      80,
      LOGICAL_WIDTH * 0.5,
      LOGICAL_HEIGHT * 0.5,
      740
    );
    bg.addColorStop(0, '#10213f');
    bg.addColorStop(1, '#060c18');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // 1. Expanded Multi-Department Campus Platform (44.6 x 28.4)
    this.drawBox3D(ctx, 0.0, 0.0, -0.55, 44.6, 28.4, 0.55, '#162138');
    this.drawFloorQuad(ctx, -22.3, -14.2, 22.3, 14.2, '#18243d', 'rgba(56, 189, 248, 0.35)', 1.5);

    for (let gx = -21; gx <= 21; gx += 3) {
      this.drawLine3D(ctx, gx, -14.2, 0.01, gx, 14.2, 0.01, 'rgba(148, 163, 184, 0.07)', 1);
    }
    for (let gy = -12; gy <= 12; gy += 3) {
      this.drawLine3D(ctx, -22.3, gy, 0.01, 22.3, gy, 0.01, 'rgba(148, 163, 184, 0.07)', 1);
    }

    // Luminous Campus Walkways separating Departments
    this.drawFloorQuad(ctx, -7.8, -14.0, -6.7, 14.0, 'rgba(56, 189, 248, 0.12)');
    this.drawFloorQuad(ctx, 9.2, -14.0, 10.2, 14.0, 'rgba(52, 211, 153, 0.14)');
    this.drawFloorQuad(ctx, -21.8, -1.0, -7.8, 1.0, 'rgba(167, 139, 250, 0.1)');
    this.drawLine3D(ctx, 9.25, -14.0, 0.02, 9.25, 14.0, 0.02, 'rgba(56, 189, 248, 0.45)', 1.5);
    this.drawLine3D(ctx, 10.15, -14.0, 0.02, 10.15, 14.0, 0.02, 'rgba(52, 211, 153, 0.45)', 1.5);

    // 1b. Dedicated Department Zones
    for (const dept of DEPARTMENT_ZONES) {
      const focused = this.activeDepartmentId === dept.id;
      this.drawFloorQuad(
        ctx,
        dept.x1,
        dept.y1,
        dept.x2,
        dept.y2,
        dept.fill,
        dept.accent,
        focused ? 2.4 : 1.35
      );
    }

    // 2. Infrastructure Wing Rooms (Server Vault, Reception Lobby, Executive Boardroom)
    const serverTier = this.getRoomTier('serverRoom');
    const lobbyTier = this.getRoomTier('lobbyRoom');
    const confTier = this.getRoomTier('conferenceRoom');

    if (serverTier === 0) {
      this.drawBlueprintPlot(
        ctx,
        INFRA_ROOMS.serverRoom.x1,
        INFRA_ROOMS.serverRoom.y1,
        INFRA_ROOMS.serverRoom.x2,
        INFRA_ROOMS.serverRoom.y2,
        'BUILD: SERVER VAULT',
        'serverRoom'
      );
    } else {
      this.drawFloorQuad(
        ctx,
        INFRA_ROOMS.serverRoom.x1,
        INFRA_ROOMS.serverRoom.y1,
        INFRA_ROOMS.serverRoom.x2,
        INFRA_ROOMS.serverRoom.y2,
        '#0c1a33',
        serverTier >= 2 ? '#38bdf8' : 'rgba(56, 189, 248, 0.55)'
      );
    }

    if (lobbyTier === 0) {
      this.drawBlueprintPlot(
        ctx,
        INFRA_ROOMS.lobbyRoom.x1,
        INFRA_ROOMS.lobbyRoom.y1,
        INFRA_ROOMS.lobbyRoom.x2,
        INFRA_ROOMS.lobbyRoom.y2,
        'BUILD: LOBBY',
        'lobbyRoom'
      );
    } else {
      this.drawFloorQuad(
        ctx,
        INFRA_ROOMS.lobbyRoom.x1,
        INFRA_ROOMS.lobbyRoom.y1,
        INFRA_ROOMS.lobbyRoom.x2,
        INFRA_ROOMS.lobbyRoom.y2,
        '#25203b',
        lobbyTier >= 2 ? '#34d399' : 'rgba(52, 211, 153, 0.55)'
      );
    }

    if (confTier === 0) {
      this.drawBlueprintPlot(
        ctx,
        INFRA_ROOMS.conferenceRoom.x1,
        INFRA_ROOMS.conferenceRoom.y1,
        INFRA_ROOMS.conferenceRoom.x2,
        INFRA_ROOMS.conferenceRoom.y2,
        'BUILD: BOARDROOM',
        'conferenceRoom'
      );
    } else {
      this.drawFloorQuad(
        ctx,
        INFRA_ROOMS.conferenceRoom.x1,
        INFRA_ROOMS.conferenceRoom.y1,
        INFRA_ROOMS.conferenceRoom.x2,
        INFRA_ROOMS.conferenceRoom.y2,
        '#202b47',
        confTier >= 2 ? '#a78bfa' : 'rgba(167, 139, 250, 0.55)'
      );
    }

    // 3. Executive & Specialist Office Suites inside their Departments
    for (const agent of this.team) {
      const st = STATIONS[agent.id];
      if (!st?.box) continue;
      const tier = this.getRoomTier(agent.id);
      if (tier === 0) {
        this.drawBlueprintPlot(
          ctx,
          st.box.x1,
          st.box.y1,
          st.box.x2,
          st.box.y2,
          `BUILD: ${agent.name.toUpperCase()}`,
          agent.id
        );
        continue;
      }

      const isSelected =
        this.selectedDeskId === agent.id || this.tourTarget === agent.id || this.dragHoverId === agent.id;
      this.drawFloorQuad(
        ctx,
        st.box.x1,
        st.box.y1,
        st.box.x2,
        st.box.y2,
        tier >= 3 ? '#293c61' : '#202f4d',
        isSelected || tier >= 2 ? agent.accent : 'rgba(148, 163, 184, 0.45)',
        isSelected ? 2.1 : 1.3
      );
      this.drawFloorQuad(
        ctx,
        st.box.x1 + 0.55,
        st.box.y1 + 0.65,
        st.box.x2 - 0.55,
        st.box.y2 - 0.65,
        st.rugColor,
        'rgba(255,255,255,0.1)'
      );
    }

    // 4. Wellness, Sports & Lounge Dept Zones
    const pbTier = this.getRoomTier('pickleballCourt');
    const gymTier = this.getRoomTier('gymRoom');
    const bballTier = this.getRoomTier('basketballCourt');
    const barTier = this.getRoomTier('barLounge');
    const swimTier = this.getRoomTier('swimmingPool');
    const soccerTier = this.getRoomTier('soccerPitch');

    if (pbTier === 0) {
      this.drawBlueprintPlot(ctx, 11.1, -12.6, 15.9, -7.2, 'BUILD: PICKLEBALL', 'pickleballCourt');
    } else {
      this.drawFloorQuad(ctx, 11.1, -12.6, 15.9, -7.2, '#16a34a', '#bbf7d0');
      this.drawFloorQuad(ctx, 11.5, -11.9, 15.5, -7.9, '#2563eb', '#ffffff');
      this.drawLine3D(ctx, 12.9, -11.9, 0.02, 12.9, -7.9, 0.02, '#ffffff', 1.2);
      this.drawLine3D(ctx, 14.1, -11.9, 0.02, 14.1, -7.9, 0.02, '#ffffff', 1.2);
    }

    if (gymTier === 0) {
      this.drawBlueprintPlot(ctx, 11.1, -5.8, 15.9, -0.8, 'BUILD: GYM', 'gymRoom');
    } else {
      this.drawFloorQuad(ctx, 11.1, -5.8, 15.9, -0.8, '#273244', 'rgba(250, 204, 21, 0.55)');
      this.drawFloorQuad(ctx, 11.5, -2.5, 13.4, -1.4, '#9333ea');
    }

    if (bballTier === 0) {
      this.drawBlueprintPlot(ctx, 11.1, 0.6, 15.9, 6.2, 'BUILD: BASKETBALL', 'basketballCourt');
    } else {
      this.drawFloorQuad(ctx, 11.1, 0.6, 15.9, 6.2, '#c26d27', '#fde68a');
      this.drawFloorQuad(ctx, 14.0, 2.3, 15.8, 4.5, '#9a3412', '#ffffff');
      this.drawLine3D(ctx, 13.3, 0.6, 0.02, 13.3, 6.2, 0.02, '#ffffff', 1.2);
    }

    if (swimTier === 0) {
      this.drawBlueprintPlot(ctx, 16.7, -12.6, 21.5, -4.4, 'BUILD: SWIM POOL', 'swimmingPool');
    } else {
      this.drawFloorQuad(ctx, 16.7, -12.6, 21.5, -4.4, '#cbd5e1', '#e2e8f0');
      const waterColor = !this.reducedMotion && Math.sin(this.clockSec * 2) > 0 ? '#0284c7' : '#0369a1';
      this.drawFloorQuad(ctx, 17.2, -12.1, 21.0, -4.9, waterColor, '#7dd3fc');
      this.drawLine3D(ctx, 18.4, -12.1, 0.05, 18.4, -4.9, 0.05, '#facc15', 1.5);
      this.drawLine3D(ctx, 19.8, -12.1, 0.05, 19.8, -4.9, 0.05, '#f87171', 1.5);
    }

    if (soccerTier === 0) {
      this.drawBlueprintPlot(ctx, 16.7, -3.0, 21.5, 3.0, 'BUILD: SOCCER', 'soccerPitch');
    } else {
      this.drawFloorQuad(ctx, 16.7, -3.0, 21.5, 3.0, '#15803d', '#86efac');
      this.drawFloorQuad(ctx, 17.8, -3.0, 19.0, 3.0, '#166534');
      this.drawFloorQuad(ctx, 20.1, -3.0, 21.5, 3.0, '#166534');
      this.drawLine3D(ctx, 19.0, -3.0, 0.02, 19.0, 3.0, 0.02, '#ffffff', 1.2);
      this.drawFloorQuad(ctx, 20.4, -1.2, 21.5, 1.2, 'rgba(255,255,255,0.06)', '#ffffff');
    }

    if (barTier === 0) {
      this.drawBlueprintPlot(ctx, 11.1, 7.6, 15.9, 12.6, 'BUILD: COFFEE CAFE', 'barLounge');
      this.drawBlueprintPlot(ctx, 16.7, 4.4, 21.5, 12.6, 'BUILD: BAR & DANCE', 'barLounge');
    } else {
      this.drawFloorQuad(ctx, 11.1, 7.6, 15.9, 12.6, '#3b2b28', 'rgba(251, 146, 60, 0.55)');
      this.drawFloorQuad(ctx, 16.7, 4.4, 21.5, 7.2, '#143f32', 'rgba(52, 211, 153, 0.55)');
      this.drawFloorQuad(ctx, 16.7, 8.6, 21.5, 12.6, '#1a1033', 'rgba(232, 121, 249, 0.6)');
      this.drawDanceFloorTiles(ctx);
    }

    // Glowing neural bridge between J.A.R.V.I.S. AI Brain Core & CEO Executive Suite
    const linkTier = this.upgrades.brainLinkTier || 1;
    this.drawLine3D(
      ctx,
      STATIONS.jarvis.x,
      STATIONS.jarvis.y,
      0.08,
      STATIONS.ceo.x,
      STATIONS.ceo.y,
      0.08,
      '#fbbf24',
      linkTier >= 2 ? 3.4 : 2.4
    );
    if (linkTier >= 2) {
      this.drawLine3D(
        ctx,
        STATIONS.jarvis.x,
        STATIONS.jarvis.y - 0.35,
        0.16,
        STATIONS.ceo.x,
        STATIONS.ceo.y - 0.35,
        0.16,
        '#38bdf8',
        2.0
      );
    }

    // 5. Data Conduits from J.A.R.V.I.S. Core to Specialist Offices
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
        active ? '#38bdf8' : 'rgba(125, 211, 252, 0.2)',
        active ? 2.4 : 0.9
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
      if (!st?.box || this.getRoomTier(agent.id) === 0) continue;
      const isWorking = (this.mission?.tasks ?? []).some(
        (t) => t.agentId === agent.id && t.status === 'running'
      );
      pushItem(st.x, st.box.y1, () =>
        this.drawGlassWall3D(ctx, st.box.x1 + 0.15, st.box.y1 + 0.08, st.box.x2 - 0.15, st.box.y1 + 0.08, 1.35)
      );
      pushItem(st.deskX, st.deskY, () => this.drawWorkstation3D(ctx, agent, st, isWorking));
      pushItem(st.x + 1.5, st.y - 1.3, () => this.drawRoomProp3D(ctx, agent.id, st));
    }

    if (serverTier >= 1) pushItem(INFRA_ROOMS.serverRoom.cx, INFRA_ROOMS.serverRoom.cy, () => this.drawServerRoom3D(ctx, serverTier));
    if (confTier >= 1) pushItem(INFRA_ROOMS.conferenceRoom.cx, INFRA_ROOMS.conferenceRoom.cy, () => this.drawConferenceRoom3D(ctx, confTier));
    if (lobbyTier >= 1) pushItem(INFRA_ROOMS.lobbyRoom.cx, INFRA_ROOMS.lobbyRoom.cy, () => this.drawLobbyRoom3D(ctx, lobbyTier));

    if (pbTier >= 1) pushItem(13.5, -9.9, () => this.drawPickleballNetAndBall3D(ctx));
    if (gymTier >= 1) {
      pushItem(12.0, -4.8, () => this.drawTreadmill3D(ctx, 12.0, -4.8));
      pushItem(13.3, -4.8, () => this.drawTreadmill3D(ctx, 13.3, -4.8));
      pushItem(14.9, -4.3, () => this.drawWeightsStation3D(ctx, 14.9, -4.3));
    }
    if (bballTier >= 1) pushItem(15.5, 3.4, () => this.drawBasketballHoopAndBall3D(ctx));
    if (soccerTier >= 1) pushItem(21.3, 0.0, () => this.drawSoccerGoalAndBall3D(ctx));
    if (barTier >= 1) {
      pushItem(18.8, 5.8, () => this.drawPingPongTableAndBall3D(ctx));
      pushItem(20.8, 5.5, () => this.drawTree3D(ctx, 20.8, 5.5));
      pushItem(12.3, 9.4, () => this.drawCoffeeCafe3D(ctx, 12.3, 9.4));
      pushItem(14.7, 9.6, () => this.drawLoungeSofa3D(ctx, 14.7, 9.6));
      pushItem(17.5, 9.4, () => this.drawDrinksBar3D(ctx, 17.5, 9.4));
      pushItem(19.9, 9.4, () => this.drawDiscoBall3D(ctx, 19.9, 9.4));
    }

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

    // 7. Crisp Non-Overlapping Department Banners
    for (const dept of DEPARTMENT_ZONES) {
      const cx = (dept.x1 + dept.x2) / 2;
      this.drawDepartmentBanner(ctx, cx, dept.y1 - 0.35, 0.28, dept.label, dept.accent);
    }

    // 8. Room & Court Labels (positioned cleanly at front edge of each spacious zone)
    if (serverTier >= 1) this.drawZoneLabel(ctx, INFRA_ROOMS.serverRoom.cx, INFRA_ROOMS.serverRoom.y2 + 0.15, 0.15, INFRA_ROOMS.serverRoom.label, INFRA_ROOMS.serverRoom.accent);
    if (confTier >= 1) this.drawZoneLabel(ctx, INFRA_ROOMS.conferenceRoom.cx, INFRA_ROOMS.conferenceRoom.y2 + 0.15, 0.15, INFRA_ROOMS.conferenceRoom.label, INFRA_ROOMS.conferenceRoom.accent);
    if (lobbyTier >= 1) this.drawZoneLabel(ctx, INFRA_ROOMS.lobbyRoom.cx, INFRA_ROOMS.lobbyRoom.y2 + 0.15, 0.15, INFRA_ROOMS.lobbyRoom.label, INFRA_ROOMS.lobbyRoom.accent);

    if (pbTier >= 1) this.drawZoneLabel(ctx, 13.5, -7.0, 0.15, 'PICKLEBALL', '#86efac');
    if (swimTier >= 1) this.drawZoneLabel(ctx, 19.1, -4.2, 0.15, 'SWIMMING POOL', '#7dd3fc');
    if (gymTier >= 1) this.drawZoneLabel(ctx, 13.5, -0.6, 0.15, 'FITNESS GYM', '#fde047');
    if (soccerTier >= 1) this.drawZoneLabel(ctx, 19.1, 3.2, 0.15, 'SOCCER PITCH', '#86efac');
    if (bballTier >= 1) this.drawZoneLabel(ctx, 13.5, 6.4, 0.15, 'BASKETBALL', '#fdba74');
    if (barTier >= 1) {
      this.drawZoneLabel(ctx, 19.1, 7.4, 0.15, 'PING-PONG', '#6ee7b7');
      this.drawZoneLabel(ctx, 13.5, 12.8, 0.15, 'COFFEE & LOUNGE', '#fdba74');
      this.drawZoneLabel(ctx, 19.1, 12.8, 0.15, 'BAR & DANCE', '#f0abfc');
    }

    for (const agent of this.team) {
      const st = STATIONS[agent.id];
      if (!st?.box || this.getRoomTier(agent.id) === 0) continue;
      this.drawZoneLabel(ctx, st.x, st.box.y2 + 0.18, 0.15, st.label.toUpperCase(), agent.accent);
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

    const hubFloor = this.project(cx, cy, 0.03);
    ctx.save();
    ctx.strokeStyle = isRunning ? '#38bdf8' : 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(hubFloor.sx, hubFloor.sy, 46 * this.zoom, 23 * this.zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    for (const [ox, oy] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
      this.drawBox3D(ctx, cx + ox, cy + oy, 0, 0.42, 0.42, 0.28, '#334155');
      this.drawBox3D(ctx, cx + ox, cy + oy, 0.28, 0.46, 0.46, 0.08, '#38bdf8');
    }

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
    const corePt = this.project(cx, cy, floatZ + 0.18);
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(corePt.sx, corePt.sy, 6.5 * this.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const lbl = this.project(cx, cy, 0);
    this.hitBoxes.push({ id: 'jarvis', sx: lbl.sx, sy: lbl.sy - 20, radius: r * 2.1 });
    this.drawZoneLabel(ctx, cx, cy, 2.4, 'J.A.R.V.I.S. AI BRAIN', '#7dd3fc');
  }

  drawMonitorDisplay3D(ctx, cx, cy, z0, w, h, accent, isWorking, phaseSeed = 0) {
    // Dark monitor screen casing + glowing live code/chart display bars
    this.drawBox3D(ctx, cx, cy - 0.04, z0 - 0.02, w + 0.1, 0.1, h + 0.1, '#0b1220');
    this.drawBox3D(ctx, cx, cy + 0.02, z0, w, 0.04, h, '#0f172a', 0);

    const pulse = !this.reducedMotion ? (Math.sin(this.clockSec * (isWorking ? 5 : 2) + phaseSeed) + 1) * 0.5 : 0.5;
    const rows = 3;
    for (let r = 0; r < rows; r += 1) {
      const lineW = w * (0.45 + 0.38 * ((r + phaseSeed + (pulse > 0.5 ? 1 : 0)) % 2 ? 0.9 : 0.55));
      const lineColor = r === 0 ? accent : r === 1 ? '#38bdf8' : '#34d399';
      this.drawBox3D(
        ctx,
        cx - (w - lineW) * 0.4,
        cy + 0.05,
        z0 + h - 0.09 - r * 0.1,
        lineW,
        0.02,
        0.045,
        lineColor,
        0
      );
    }
  }

  drawWorkstation3D(ctx, agent, st, isWorking) {
    // Realistic Executive Ergonomic Chair with caster base, armrests, cushion & high headrest
    this.drawBox3D(ctx, st.chairX, st.chairY, 0.02, 0.42, 0.42, 0.14, '#1e293b');
    this.drawBox3D(ctx, st.chairX, st.chairY, 0.16, 0.62, 0.62, 0.18, '#334155');
    this.drawBox3D(ctx, st.chairX - 0.3, st.chairY, 0.32, 0.08, 0.42, 0.14, '#475569');
    this.drawBox3D(ctx, st.chairX + 0.3, st.chairY, 0.32, 0.08, 0.42, 0.14, '#475569');
    this.drawBox3D(ctx, st.chairX, st.chairY + 0.24, 0.34, 0.54, 0.12, 0.5, '#1e293b');
    this.drawBox3D(ctx, st.chairX, st.chairY + 0.24, 0.72, 0.46, 0.1, 0.14, agent.accent);

    const isCeo = agent.id === 'ceo';
    const deskTier = isCeo ? this.upgrades.deskTier || 1 : 1;
    const roomTier = this.getRoomTier(agent.id);
    const deskColor = isCeo && deskTier === 3 ? '#1e3a5f' : isCeo ? '#78350f' : '#85583a';
    const deskW = isCeo ? (deskTier >= 2 ? 2.65 : 2.25) : roomTier >= 2 ? 2.2 : 1.98;
    const deskD = isCeo ? (deskTier >= 2 ? 1.2 : 1.08) : 1.02;

    // Desk frame legs + main tabletop + accent front trim
    this.drawBox3D(ctx, st.deskX - deskW * 0.44, st.deskY, 0, 0.14, deskD * 0.85, 0.68, '#1e293b');
    this.drawBox3D(ctx, st.deskX + deskW * 0.44, st.deskY, 0, 0.14, deskD * 0.85, 0.68, '#1e293b');
    this.drawBox3D(ctx, st.deskX, st.deskY, 0.64, deskW, deskD, 0.09, deskColor);
    this.drawBox3D(
      ctx,
      st.deskX,
      st.deskY + deskD / 2,
      deskTier === 3 ? 0.06 : 0.65,
      deskW + 0.04,
      0.04,
      0.06,
      isCeo && deskTier === 3 ? '#fbbf24' : agent.accent,
      0
    );

    // Desktop ATX PC Workstation Tower beside right desk leg
    const pcX = st.deskX + deskW * 0.45 + 0.24;
    this.drawBox3D(ctx, pcX, st.deskY - 0.15, 0, 0.34, 0.66, 0.62, '#0f172a');
    this.drawBox3D(ctx, pcX, st.deskY + 0.19, 0.16, 0.22, 0.03, 0.34, isWorking ? '#34d399' : agent.accent, 0);

    if (isCeo && deskTier >= 2) {
      this.drawBox3D(ctx, st.deskX - 1.12, st.deskY + 0.45, 0.64, 0.46, 0.95, 0.09, deskColor);
      this.drawBox3D(ctx, st.deskX - 1.28, st.deskY + 0.78, 0, 0.14, 0.14, 0.64, '#1e293b');
    }

    // Monitor riser stands + glowing realistic multi-monitor screens
    const screenColor = isWorking ? agent.accent : '#38bdf8';
    this.drawBox3D(ctx, st.deskX - 0.46, st.deskY - 0.16, 0.73, 0.1, 0.1, 0.12, '#64748b');
    this.drawBox3D(ctx, st.deskX + 0.46, st.deskY - 0.16, 0.73, 0.1, 0.1, 0.12, '#64748b');
    this.drawMonitorDisplay3D(ctx, st.deskX - 0.46, st.deskY - 0.14, 0.83, 0.66, 0.42, screenColor, isWorking, 0);
    this.drawMonitorDisplay3D(
      ctx,
      st.deskX + 0.46,
      st.deskY - 0.14,
      0.83,
      0.66,
      0.42,
      isWorking ? '#34d399' : agent.accent,
      isWorking,
      1
    );
    if (isCeo || roomTier >= 2) {
      this.drawBox3D(ctx, st.deskX, st.deskY - 0.2, 0.73, 0.1, 0.1, 0.14, '#64748b');
      this.drawMonitorDisplay3D(
        ctx,
        st.deskX,
        st.deskY - 0.18,
        0.85,
        0.56,
        0.46,
        isCeo ? '#fbbf24' : '#38bdf8',
        isWorking,
        2
      );
    }
    if (isCeo && deskTier >= 2) {
      this.drawMonitorDisplay3D(ctx, st.deskX - 0.98, st.deskY - 0.04, 0.82, 0.42, 0.36, '#22d3ee', isWorking, 3);
    }
    if (isCeo && deskTier >= 3) {
      this.drawMonitorDisplay3D(ctx, st.deskX + 0.98, st.deskY - 0.04, 0.82, 0.42, 0.36, '#a78bfa', isWorking, 4);
    }

    // Mechanical keyboard, mouse pad & mouse, ceramic coffee mug, and desk lamp
    this.drawBox3D(ctx, st.deskX - 0.12, st.deskY + 0.22, 0.73, 0.68, 0.22, 0.04, '#1e293b');
    this.drawBox3D(
      ctx,
      st.deskX - 0.12,
      st.deskY + 0.22,
      0.77,
      0.6,
      0.16,
      0.015,
      isWorking ? '#38bdf8' : '#475569',
      0
    );
    this.drawBox3D(ctx, st.deskX + 0.38, st.deskY + 0.22, 0.73, 0.22, 0.24, 0.02, '#0f172a');
    this.drawBox3D(ctx, st.deskX + 0.38, st.deskY + 0.22, 0.75, 0.11, 0.15, 0.04, '#cbd5e1');
    this.drawBox3D(ctx, st.deskX - 0.68, st.deskY + 0.26, 0.73, 0.13, 0.13, 0.14, '#f8fafc');
    this.drawBox3D(ctx, st.deskX + 0.78, st.deskY + 0.18, 0.73, 0.14, 0.14, 0.38, '#fde047');

    const p = this.project(st.deskX, st.deskY, 0.5);
    this.hitBoxes.push({ id: agent.id, sx: p.sx, sy: p.sy, radius: 32 * this.zoom });
  }

  drawRoomProp3D(ctx, agentId, st) {
    const { box } = st;
    const roomTier = this.getRoomTier(agentId);
    const leftX = box.x1 + 0.55;
    const rightX = box.x2 - 0.55;
    const backY = box.y1 + 0.65;
    const frontY = box.y2 - 0.65;

    // Corner potted office plant
    this.drawBox3D(ctx, leftX, backY, 0, 0.36, 0.36, 0.3, '#9a3412');
    this.drawBox3D(ctx, leftX, backY, 0.3, 0.54, 0.54, 0.44, '#22c55e');

    if (agentId === 'ceo') {
      const decorTier = this.upgrades.decorTier || 1;
      const brainTier = this.upgrades.brainLinkTier || 1;

      this.drawBox3D(ctx, rightX - 0.1, frontY - 0.1, 0, 0.46, 0.46, 0.88, '#78350f');
      this.drawBox3D(ctx, rightX - 0.1, frontY - 0.1, 0.88, 0.34, 0.34, 0.34, '#fbbf24');
      this.drawBox3D(ctx, leftX + 0.1, frontY - 0.1, 0, 0.5, 0.5, 0.4, '#b45309');

      if (decorTier >= 2) {
        this.drawBox3D(ctx, st.x, frontY - 0.05, 0, 1.5, 0.58, 0.36, '#6d28d9');
        this.drawBox3D(ctx, st.x, frontY + 0.16, 0.36, 1.5, 0.16, 0.36, '#5b21b6');
        this.drawBox3D(ctx, st.x, frontY - 0.6, 0, 0.8, 0.36, 0.24, '#38bdf8');
      }

      if (decorTier >= 3) {
        this.drawBox3D(ctx, rightX - 0.05, st.y - 0.4, 0, 0.52, 0.95, 0.78, '#451a03');
        this.drawBox3D(ctx, rightX - 0.05, st.y - 0.4, 0.78, 0.34, 0.34, 0.34, '#e2e8f0');
        this.drawBox3D(ctx, box.x1 + 0.18, st.y, 0.55, 0.08, 1.25, 0.82, '#fbbf24');
        this.drawBox3D(ctx, rightX, backY, 0, 0.36, 0.36, 0.3, '#9a3412');
        this.drawBox3D(ctx, rightX, backY, 0.3, 0.54, 0.54, 0.52, '#16a34a');
      }

      if (brainTier >= 3) {
        this.drawBox3D(ctx, leftX + 0.15, st.y + 0.25, 0, 0.7, 0.7, 0.46, '#1e3a8a');
        const holoZ = this.reducedMotion ? 0.88 : 0.88 + Math.sin(this.clockSec * 3) * 0.1;
        const hp = this.project(leftX + 0.15, st.y + 0.25, holoZ);
        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.88)';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(hp.sx, hp.sy, 7.5 * this.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    if (roomTier >= 2) {
      // Side visitor lounge sofa in upgraded department suites
      this.drawBox3D(ctx, rightX - 0.4, frontY - 0.15, 0, 1.25, 0.52, 0.36, '#334155');
    }

    if (agentId === 'sage') {
      this.drawBox3D(ctx, rightX - 0.1, st.y, 0, 0.48, 1.6, 1.45, '#78350f');
      this.drawBox3D(ctx, rightX - 0.1, st.y - 0.35, 0.96, 0.5, 0.32, 0.22, '#34d399');
      this.drawBox3D(ctx, rightX - 0.1, st.y + 0.35, 0.96, 0.5, 0.32, 0.22, '#38bdf8');
    } else if (agentId === 'vulcan' || agentId === 'aegis' || agentId === 'orion') {
      this.drawBox3D(ctx, rightX - 0.1, backY + 0.2, 0, 0.65, 0.65, 1.55, '#1e293b');
      this.drawBox3D(ctx, rightX - 0.1, backY + 0.2, 1.15, 0.68, 0.68, 0.12, '#38bdf8');
      this.drawBox3D(ctx, rightX - 0.1, backY + 0.2, 0.75, 0.68, 0.68, 0.08, '#34d399');
    } else if (agentId === 'athena' || agentId === 'vera') {
      this.drawBox3D(ctx, leftX - 0.15, st.y + 0.2, 0.35, 0.14, 1.5, 1.0, '#f8fafc');
      this.drawBox3D(ctx, leftX - 0.06, st.y - 0.1, 0.92, 0.04, 0.26, 0.22, '#facc15', 0);
      this.drawBox3D(ctx, leftX - 0.06, st.y + 0.35, 0.82, 0.04, 0.26, 0.22, '#34d399', 0);
    } else if (agentId === 'iris') {
      this.drawBox3D(ctx, rightX + 0.05, st.y, 0.35, 0.14, 1.4, 1.0, '#334155');
      this.drawBox3D(ctx, rightX - 0.03, st.y - 0.25, 0.9, 0.04, 0.28, 0.26, '#f472b6', 0);
      this.drawBox3D(ctx, rightX - 0.03, st.y + 0.2, 0.9, 0.04, 0.28, 0.26, '#38bdf8', 0);
    } else {
      this.drawBox3D(ctx, rightX - 0.15, backY + 0.25, 0, 0.5, 0.5, 0.92, '#0891b2');
      this.drawBox3D(ctx, rightX - 0.15, backY + 0.25, 0.92, 0.4, 0.4, 0.14, '#22d3ee');
    }
  }

  drawBlueprintPlot(ctx, x1, y1, x2, y2, label, roomId) {
    this.drawFloorQuad(ctx, x1, y1, x2, y2, 'rgba(56, 189, 248, 0.06)', 'rgba(56, 189, 248, 0.52)');
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    this.drawZoneLabel(ctx, cx, cy, 0.25, label, '#7dd3fc');
    const p = this.project(cx, cy, 0.2);
    this.hitBoxes.push({ id: `room:${roomId}`, sx: p.sx, sy: p.sy, radius: 28 * this.zoom });
  }

  drawServerRoom3D(ctx, tier) {
    const r = INFRA_ROOMS.serverRoom;
    const rackCoords = [
      [r.cx - 1.5, r.cy - 2.6],
      [r.cx + 1.5, r.cy - 2.6],
      [r.cx - 1.5, r.cy],
      [r.cx + 1.5, r.cy],
      [r.cx - 1.5, r.cy + 2.6],
      [r.cx + 1.5, r.cy + 2.6]
    ];
    if (tier >= 2) {
      rackCoords.push([r.cx, r.cy - 2.6], [r.cx, r.cy + 2.6]);
    }
    const blink = !this.reducedMotion && Math.sin(this.clockSec * 5) > 0;
    for (let i = 0; i < rackCoords.length; i += 1) {
      const [rx, ry] = rackCoords[i];
      this.drawBox3D(ctx, rx, ry, 0, 0.78, 0.78, 1.85, '#0f172a');
      this.drawBox3D(ctx, rx, ry + 0.4, 1.38, 0.58, 0.05, 0.14, blink ^ (i % 2 === 0) ? '#38bdf8' : '#34d399', 0);
      this.drawBox3D(ctx, rx, ry + 0.4, 0.9, 0.58, 0.05, 0.1, '#facc15', 0);
    }
    if (tier >= 3) {
      this.drawBox3D(ctx, r.cx, r.cy, 0, 0.85, 0.85, 2.05, '#0369a1');
      this.drawBox3D(ctx, r.cx, r.cy, 2.05, 0.56, 0.56, 0.34, '#38bdf8');
    }
  }

  drawConferenceRoom3D(ctx, tier) {
    const r = INFRA_ROOMS.conferenceRoom;
    this.drawBox3D(ctx, r.cx, r.cy, 0.4, 1.45, 3.3, 0.1, '#38bdf8');
    this.drawBox3D(ctx, r.cx, r.cy, 0, 0.8, 2.2, 0.4, '#1e293b');
    for (const cy of [r.cy - 1.2, r.cy, r.cy + 1.2]) {
      this.drawBox3D(ctx, r.cx - 1.1, cy, 0, 0.42, 0.42, 0.46, '#475569');
      this.drawBox3D(ctx, r.cx + 1.1, cy, 0, 0.42, 0.42, 0.46, '#475569');
    }
    this.drawBox3D(ctx, r.cx, r.y1 + 0.25, 0.75, 2.2, 0.12, 1.05, tier >= 2 ? '#a78bfa' : '#334155');
    if (tier >= 3) {
      this.drawBox3D(ctx, r.cx, r.cy, 0.5, 0.6, 0.6, 0.38, '#fbbf24');
    }
  }

  drawLobbyRoom3D(ctx, tier) {
    const r = INFRA_ROOMS.lobbyRoom;
    this.drawBox3D(ctx, r.cx, r.cy - 2.1, 0, 2.5, 0.85, 0.82, '#78350f');
    this.drawBox3D(ctx, r.cx, r.cy - 2.2, 0.82, 0.72, 0.14, 0.45, '#38bdf8');
    this.drawBox3D(ctx, r.cx - 0.9, r.cy + 2.1, 0, 2.2, 0.8, 0.42, '#10b981');
    this.drawBox3D(ctx, r.cx + 1.6, r.cy + 2.1, 0, 1.5, 0.8, 0.42, '#0ea5e9');
    if (tier >= 2) {
      this.drawBox3D(ctx, r.x1 + 0.3, r.cy, 0.55, 0.14, 2.6, 1.2, '#34d399');
    }
    if (tier >= 3) {
      this.drawTree3D(ctx, r.x1 + 0.7, r.y1 + 0.8);
      this.drawTree3D(ctx, r.x2 - 0.7, r.y2 - 0.8);
    }
  }

  drawPickleballNetAndBall3D(ctx) {
    this.drawBox3D(ctx, 13.5, -11.95, 0, 0.12, 0.12, 0.85, '#f8fafc');
    this.drawBox3D(ctx, 13.5, -7.85, 0, 0.12, 0.12, 0.85, '#f8fafc');
    const n00 = this.project(13.5, -11.9, 0.78);
    const n10 = this.project(13.5, -7.9, 0.78);
    const n11 = this.project(13.5, -7.9, 0.15);
    const n01 = this.project(13.5, -11.9, 0.15);
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
      const bx = 12.1 + cycle * 2.8;
      const by = -9.9 + Math.sin(this.sportsClock * 1.7) * 0.8;
      const bz = 0.25 + Math.abs(Math.sin(this.sportsClock * Math.PI)) * 1.0;
      const ball = this.project(bx, by, bz);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(ball.sx, ball.sy, 4.2 * this.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawBasketballHoopAndBall3D(ctx) {
    this.drawBox3D(ctx, 15.5, 3.4, 0, 0.18, 0.18, 2.35, '#475569');
    this.drawBox3D(ctx, 15.25, 3.4, 1.85, 0.1, 1.15, 0.78, '#f8fafc');
    this.drawBox3D(ctx, 14.95, 3.4, 1.98, 0.42, 0.42, 0.08, '#f97316');

    if (this.hasActivity('basketball')) {
      const t = (this.sportsClock * 0.75) % 1;
      const bx = 12.3 + t * 2.6;
      const by = 2.9 + Math.sin(t * Math.PI) * 0.5;
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
    this.drawBox3D(ctx, 21.3, -1.0, 0, 0.14, 0.14, 1.15, '#ffffff');
    this.drawBox3D(ctx, 21.3, 1.0, 0, 0.14, 0.14, 1.15, '#ffffff');
    this.drawBox3D(ctx, 21.3, 0.0, 1.1, 0.14, 2.14, 0.12, '#ffffff');

    if (this.hasActivity('soccer')) {
      const t = (Math.sin(this.sportsClock * 1.9) + 1) / 2;
      const bx = 17.7 + t * 2.9;
      const by = Math.cos(this.sportsClock * 1.4) * 0.8;
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
    this.drawBox3D(ctx, 18.8, 5.8, 0.55, 1.5, 0.95, 0.12, '#15803d');
    this.drawBox3D(ctx, 18.8, 5.8, 0, 0.9, 0.6, 0.55, '#1e293b');
    this.drawBox3D(ctx, 18.8, 5.8, 0.67, 0.06, 0.95, 0.18, '#f8fafc');

    if (this.hasActivity('pingpong')) {
      const cycle = (Math.sin(this.sportsClock * 3.8) + 1) / 2;
      const bx = 18.15 + cycle * 1.3;
      const bz = 0.78 + Math.abs(Math.sin(this.sportsClock * 3.8)) * 0.35;
      const ball = this.project(bx, 5.8, bz);
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
        const x1 = 18.6 + col * 0.85;
        const y1 = 9.4 + row * 0.85;
        const color = palette[(row * 3 + col + phase) % palette.length];
        this.drawFloorQuad(ctx, x1, y1, x1 + 0.78, y1 + 0.75, color);
      }
    }
  }

  drawDrinksBar3D(ctx, x, y) {
    this.drawBox3D(ctx, x, y, 0, 1.4, 0.72, 0.78, '#312e81');
    this.drawBox3D(ctx, x, y + 0.36, 0.65, 1.42, 0.06, 0.12, '#22d3ee', 0);
    this.drawBox3D(ctx, x - 0.42, y, 0.78, 0.14, 0.14, 0.28, '#f472b6');
    this.drawBox3D(ctx, x - 0.12, y + 0.08, 0.78, 0.14, 0.14, 0.22, '#facc15');
    this.drawBox3D(ctx, x + 0.22, y - 0.04, 0.78, 0.14, 0.14, 0.26, '#34d399');
    this.drawBox3D(ctx, x + 0.48, y + 0.05, 0.78, 0.14, 0.14, 0.2, '#38bdf8');
    this.drawBox3D(ctx, x - 0.35, y + 0.62, 0, 0.3, 0.3, 0.45, '#64748b');
    this.drawBox3D(ctx, x + 0.35, y + 0.62, 0, 0.3, 0.3, 0.45, '#64748b');
  }

  drawDiscoBall3D(ctx, x, y) {
    const p = this.project(x, y, 2.2);
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
    this.drawBox3D(ctx, x, y, 0, 1.7, 0.7, 0.75, '#92400e');
    this.drawBox3D(ctx, x - 0.3, y, 0.75, 0.42, 0.34, 0.4, '#cbd5e1');
    this.drawBox3D(ctx, x + 0.35, y, 0.75, 0.2, 0.2, 0.2, '#f59e0b');
    this.drawBox3D(ctx, x - 1.15, y, 0, 0.55, 0.55, 1.2, '#0ea5e9');
    this.drawBox3D(ctx, x - 1.15, y + 0.28, 0.25, 0.42, 0.05, 0.75, '#bae6fd', 0);
  }

  drawLoungeSofa3D(ctx, x, y) {
    this.drawBox3D(ctx, x, y, 0, 1.65, 0.75, 0.38, '#818cf8');
    this.drawBox3D(ctx, x, y + 0.28, 0.38, 1.65, 0.2, 0.38, '#6366f1');
  }

  drawTree3D(ctx, x, y) {
    this.drawBox3D(ctx, x, y, 0, 0.28, 0.28, 0.6, '#92400e');
    this.drawBox3D(ctx, x, y, 0.6, 0.85, 0.85, 0.75, '#16a34a');
    this.drawBox3D(ctx, x, y, 1.15, 0.52, 0.52, 0.4, '#22c55e');
  }

  drawCharacter3D(ctx, actor) {
    const style = CHARACTER_STYLE[actor.id] || CHARACTER_STYLE.athena;
    const isSwimming = actor.activity === 'swim' && !actor.walking;

    let renderX = actor.x;
    let renderY = actor.y;
    if (isSwimming) {
      renderY = -8.5 + Math.sin(this.clockSec * 1.1 + (actor.id.charCodeAt(0) % 5)) * 2.5;
      const pWater = this.project(renderX, renderY, 0.06);
      const ripple = 10 + (Math.sin(this.clockSec * 5) + 1) * 4;
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.75)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(pWater.sx, pWater.sy, ripple * this.zoom, ripple * 0.48 * this.zoom, 0, 0, Math.PI * 2);
      ctx.stroke();

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

    const isTypingAtComputer =
      (actor.activity === 'at-computer' || actor.activity === 'working') && !actor.walking;
    const armSwing =
      actor.walking && !this.reducedMotion
        ? Math.sin(actor.walkPhase) * 0.18
        : isDancing && !this.reducedMotion
          ? Math.sin(this.clockSec * 9) * 0.35
          : isTypingAtComputer && !this.reducedMotion
            ? Math.sin(actor.actionPhase * 1.4) * 0.09
            : 0;
    const armZ = isDancing ? zBase + 0.85 : isTypingAtComputer ? zBase + 0.56 : zBase + 0.5;
    this.drawBox3D(ctx, renderX - 0.3, renderY - armSwing, armZ, 0.12, 0.12, 0.4, style.suit);
    this.drawBox3D(ctx, renderX + 0.3, renderY + armSwing, armZ, 0.12, 0.12, 0.4, style.suit);

    if (actor.activity === 'meeting' || actor.activity === 'server-ops' || actor.activity === 'colleague-talk') {
      // Official tablet / clipboard while collaborating or inspecting server racks
      this.drawBox3D(ctx, renderX + 0.32, renderY + 0.14, zBase + 0.62, 0.2, 0.06, 0.26, '#38bdf8');
    } else if (actor.activity === 'pickleball' || actor.activity === 'pingpong') {
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
    if (isTypingAtComputer || actor.activity === 'meeting' || actor.activity === 'colleague-talk') {
      // Official comms headset & mic boom for voice/computer calls
      this.drawBox3D(ctx, renderX - 0.19, renderY, zBase + 1.08, 0.05, 0.12, 0.14, '#0f172a');
      this.drawBox3D(ctx, renderX + 0.19, renderY, zBase + 1.08, 0.05, 0.12, 0.14, '#0f172a');
      this.drawBox3D(ctx, renderX + 0.16, renderY + 0.14, zBase + 1.03, 0.12, 0.04, 0.04, actor.speech ? '#34d399' : '#38bdf8', 0);
    }

    const headPt = this.project(renderX, renderY, zBase + 0.85);
    this.hitBoxes.push({ id: actor.id, sx: headPt.sx, sy: headPt.sy, radius: 22 * this.zoom });

    ctx.font = '700 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(actor.name).width + 10;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(shadow.sx - w / 2, shadow.sy + 5, w, 13);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(actor.name, shadow.sx, shadow.sy + 14);
  }

  drawDepartmentBanner(ctx, wx, wy, wz, text, color) {
    const p = this.project(wx, wy, wz);
    ctx.save();
    ctx.font = '800 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(text).width + 14;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(p.sx - w / 2, p.sy - 13, w, 15, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, p.sx, p.sy - 2.5);
    ctx.restore();
  }

  drawZoneLabel(ctx, wx, wy, wz, text, color) {
    const p = this.project(wx, wy, wz);
    ctx.save();
    ctx.font = '700 8px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(text).width + 8;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(p.sx - w / 2, p.sy - 9.5, w, 12);
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
