/**
 * Real WebGL 3D Office renderer extending Office3DScene.
 * Preserves every public method and event contract used by app.js.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  CHARACTER_STYLE,
  DEPARTMENT_ZONES,
  INFRA_ROOMS,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  STATIONS,
  clamp
} from './officeLayout.js';
import { Office3DScene } from './office3d.js';
import { buildCampus } from './realistic/campus.js';
import { animateHumanoid, createHumanoid } from './realistic/humanoid.js';
import { V, createAssetCache, drawScreen } from './realistic/materials.js';
import { estimateLocation, nextSunEvents, skyState, solarPosition } from './realistic/sky.js';
import { SEVERITY } from './severity.js';

const QUALITY_STORAGE_KEY = 'jarvis-office-quality';
const SKY_STORAGE_KEY = 'jarvis-office-sky';
const DANCE_PALETTE = ['#e879f9', '#38bdf8', '#a855f7', '#f472b6', '#facc15', '#34d399'];
const PLAYER_RADIUS = 0.28;
const PLAYER_SPAWN = { x: -7.25, y: 0.0 };
const CAMPUS_BOUNDS = { x1: -21.95, y1: -13.9, x2: 22.05, y2: 13.95 };
const MOVE_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
  'Space'
]);

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true;
}

function circleHitsBox(px, py, r, b) {
  const cx = clamp(px, b.x1, b.x2);
  const cy = clamp(py, b.y1, b.y2);
  return Math.hypot(px - cx, py - cy) < r;
}

function createSkyBackdrop() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { c, ctx, tex, key: '' };
}

function paintSkyBackdrop(skyBg, top, mid, bottom) {
  const key = `${top}|${mid}|${bottom}`;
  if (skyBg.key === key) return;
  skyBg.key = key;
  const g = skyBg.ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, bottom);
  skyBg.ctx.fillStyle = g;
  skyBg.ctx.fillRect(0, 0, 4, 256);
  skyBg.tex.needsUpdate = true;
}

function createStarfield() {
  const count = 360;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const theta = ((i * 137.508) % 360) * (Math.PI / 180);
    const phi = Math.acos(0.15 + (((i * 73) % 85) / 100));
    const r = 130;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: '#e0f2fe',
    size: 0.75,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false
  });
  return { points: new THREE.Points(geo, mat), mat };
}

export class RealisticOffice3DScene extends Office3DScene {
  // IMPORTANT: No class field declarations here because super() invokes initRenderer().

  initRenderer(options = {}) {
    this.isRealistic = true;
    this.onPlayerProximity = options.onPlayerProximity || (() => {});
    this.onPlayerInteract = options.onPlayerInteract || ((id) => this.onSelectAgent(id));
    this.onOpenTerminal = options.onOpenTerminal || this.onPlayerInteract;
    this.onPlayerLeave = options.onPlayerLeave || (() => {});
    this.onBossToggle = options.onBossToggle || (() => {});
    this.onCinemaChange = options.onCinemaChange || (() => {});
    this.onSkyUpdate = options.onSkyUpdate || (() => {});
    this.player = null;
    this.playerHumanoid = null;
    this.playerView = 'third';
    this.playerNearId = null;
    this.playerSpeechTimer = 0;
    this.greetCooldown = new Map();
    this.keysDown = new Set();
    this.colliders = { boxes: [], circles: [] };
    this.followTarget = new THREE.Vector3();
    this.lastMinimapDraw = -1;
    this.cache = createAssetCache();
    this.camPitch = 0.92;
    this.targetPitch = 0.92;
    this._pitchDragging = false;
    this._lastPitchY = 0;
    this.isVisible = true;
    this.campusSig = '';
    this.campusData = null;
    this.humanoids = new Map();
    this.packetPool = [];
    this.staticPickables = [];
    this.actorPickables = [];
    this.lastScreenTick = -1;
    this.agentStatuses = new Map();
    this.cinemaMode = false;
    this.cinemaTimer = 0;
    this.cinemaIdx = 0;

    const savedSky = window.localStorage?.getItem(SKY_STORAGE_KEY);
    this.skyMode = savedSky === 'day' || savedSky === 'night' ? savedSky : 'auto';
    this.skyTimeMinutes = null;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.location = estimateLocation(tz, new Date().getTimezoneOffset());
    this.lastSkyUpdateMs = 0;
    this.lastSkyInfo = null;

    const savedQ = window.localStorage?.getItem(QUALITY_STORAGE_KEY);
    this.quality = savedQ === 'balanced' || savedQ === 'performance' ? savedQ : 'high';

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.skyBackdrop = createSkyBackdrop();
    paintSkyBackdrop(this.skyBackdrop, '#3d8fd6', '#8cc4ef', '#d7ecff');
    this.scene = new THREE.Scene();
    this.scene.background = this.skyBackdrop.tex;
    this.scene.fog = new THREE.Fog('#d7ecff', 85, 195);

    this.starfield = createStarfield();
    this.scene.add(this.starfield.points);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    this.scene.environmentIntensity = 0.72;
    pmrem.dispose();

    const w = this.canvas.clientWidth || LOGICAL_WIDTH;
    const h = this.canvas.clientHeight || LOGICAL_HEIGHT;
    this.camera = new THREE.PerspectiveCamera(38, w / Math.max(1, h), 0.1, 400);

    this.hemiLight = new THREE.HemisphereLight(0xcfe5ff, 0x6b5f50, 0.74);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff6ea, 2.6);
    this.sunLight.position.set(18, 32, 16);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.left = -30;
    this.sunLight.shadow.camera.right = 30;
    this.sunLight.shadow.camera.top = 30;
    this.sunLight.shadow.camera.bottom = -30;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 90;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.moonLight = new THREE.DirectionalLight(0x93c5fd, 0);
    this.moonLight.position.set(-20, 28, -14);
    this.scene.add(this.moonLight);

    // Warm interior ceiling lamps that turn on smoothly at dusk & night
    this.nightLamps = [];
    for (const [lx, ly] of [[-14.8, -7.5], [-14.8, 7.5], [1.2, -9.5], [1.4, 0.0], [1.2, 9.5], [16.0, 0.0]]) {
      const lamp = new THREE.PointLight('#ffcf87', 0, 18, 1.5);
      lamp.position.copy(V(lx, ly, 3.0));
      this.scene.add(lamp);
      this.nightLamps.push(lamp);
    }

    this.actorGroup = new THREE.Group();
    this.packetGroup = new THREE.Group();
    this.scene.add(this.actorGroup, this.packetGroup);

    // Postprocessing
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.4, 0.85);
    this.outputPass = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.outputPass);

    // CSS2D label overlay
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'office-label-layer';
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.inset = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    if (this.canvas.parentElement) {
      this.canvas.parentElement.querySelectorAll('.office-label-layer').forEach((n) => n.remove());
      this.canvas.parentElement.appendChild(this.labelRenderer.domElement);
    }

    this.raycaster = new THREE.Raycaster();
    this.setQuality(this.quality);
    this.syncRendererSize();

    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObs = new ResizeObserver(() => this.syncRendererSize());
      this._resizeObs.observe(this.canvas);
    }
    if (typeof IntersectionObserver !== 'undefined') {
      this._visObs = new IntersectionObserver(
        (entries) => {
          this.isVisible = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0.01 }
      );
      this._visObs.observe(this.canvas);
    }

    // Vertical drag pitch controls (horizontal yaw + wheel zoom handled by parent bindEvents)
    this.canvas.addEventListener('pointerdown', (ev) => {
      this._pitchDragging = true;
      this._lastPitchY = ev.clientY;
      if (this.cinemaMode) this.setCinemaMode(false);
    });
    this.canvas.addEventListener('wheel', () => {
      if (this.cinemaMode) this.setCinemaMode(false);
    }, { passive: true });
    this.canvas.addEventListener('pointermove', (ev) => {
      if (!this._pitchDragging) return;
      const dy = ev.clientY - this._lastPitchY;
      this._lastPitchY = ev.clientY;
      this.targetPitch = clamp(this.targetPitch + dy * 0.006, 0.35, 1.35);
    });
    const endPitch = () => {
      this._pitchDragging = false;
    };
    this.canvas.addEventListener('pointerup', endPitch);
    this.canvas.addEventListener('pointercancel', endPitch);

    // Player keyboard controls (active only while joined)
    this.canvas.addEventListener('pointerdown', () => {
      if (this.player && isTypingTarget(document.activeElement)) {
        document.activeElement.blur();
      }
    });
    window.addEventListener('keydown', (ev) => this.handlePlayerKey(ev, true));
    window.addEventListener('keyup', (ev) => this.handlePlayerKey(ev, false));
    window.addEventListener('blur', () => this.keysDown.clear());

    // Live minimap overlay
    if (this.canvas.parentElement) {
      this.canvas.parentElement.querySelectorAll('.office-minimap').forEach((n) => n.remove());
      this.minimap = document.createElement('canvas');
      this.minimap.className = 'office-minimap';
      this.minimap.width = 380;
      this.minimap.height = 242;
      this.minimap.setAttribute('aria-hidden', 'true');
      this.minimapCtx = this.minimap.getContext('2d');
      this.canvas.parentElement.appendChild(this.minimap);
    }
  }

  // --- Real Sky, Severity Status & Cinema Camera ---

  getSkyMode() {
    return this.skyMode;
  }

  setSkyMode(mode) {
    this.skyMode = mode === 'day' || mode === 'night' ? mode : 'auto';
    if (this.skyMode !== 'auto') this.skyTimeMinutes = null;
    try {
      window.localStorage?.setItem(SKY_STORAGE_KEY, this.skyMode);
    } catch {
      // Ignore storage errors
    }
    this.updateSky(true);
  }

  setSkyTimeMinutes(minutes) {
    this.skyTimeMinutes = minutes === null ? null : clamp(Math.round(minutes), 0, 1439);
    if (this.skyTimeMinutes !== null) this.skyMode = 'auto';
    this.updateSky(true);
  }

  getSkyInfo() {
    return this.lastSkyInfo;
  }

  updateSky(force = false) {
    const nowMs = Date.now();
    if (!force && nowMs - this.lastSkyUpdateMs < 15000) return;
    this.lastSkyUpdateMs = nowMs;

    const date = new Date(nowMs);
    if (this.skyTimeMinutes !== null) {
      date.setHours(Math.floor(this.skyTimeMinutes / 60), this.skyTimeMinutes % 60, 0, 0);
    }

    const pos = solarPosition(date, this.location.lat, this.location.lon);
    const events = nextSunEvents(date, this.location.lat, this.location.lon);
    const elevation = this.skyMode === 'day' ? 42 : this.skyMode === 'night' ? -25 : pos.elevation;
    const azimuth = this.skyMode === 'day' ? 145 : this.skyMode === 'night' ? 320 : pos.azimuth;
    const sky = skyState(elevation);

    paintSkyBackdrop(this.skyBackdrop, sky.bgTop, sky.bgMid, sky.bgBottom);
    this.scene.fog.color.set(sky.fog);
    this.starfield.mat.opacity = sky.starOpacity;

    const azRad = (azimuth * Math.PI) / 180;
    const elRad = (Math.max(8, elevation) * Math.PI) / 180;
    const sunDist = 44;
    this.sunLight.position.set(
      sunDist * Math.cos(elRad) * Math.sin(azRad),
      sunDist * Math.sin(elRad),
      -sunDist * Math.cos(elRad) * Math.cos(azRad)
    );
    this.sunLight.intensity = sky.sunIntensity;
    this.sunLight.color.set(sky.sunColor);
    this.moonLight.intensity = sky.moonIntensity;

    this.hemiLight.color.set(sky.hemiSky);
    this.hemiLight.groundColor.set(sky.hemiGround);
    this.hemiLight.intensity = sky.hemiIntensity;
    this.scene.environmentIntensity = sky.envIntensity;
    this.renderer.toneMappingExposure = sky.exposure;

    if (this.campusData?.dyn?.lampMat) {
      this.campusData.dyn.lampMat.emissiveIntensity = 0.25 + sky.lampFactor * 2.1;
    }
    for (const lamp of this.nightLamps) {
      lamp.intensity = sky.lampFactor * 14;
    }

    const minsNow = date.getHours() * 60 + date.getMinutes();
    this.lastSkyInfo = {
      mode: this.skyMode,
      elevation: Math.round(elevation),
      isNight: sky.isNight,
      lampFactor: sky.lampFactor,
      locationLabel: this.location.label,
      timeMinutes: minsNow,
      timeText: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
      sunrise: events.sunrise,
      sunset: events.sunset
    };
    this.onSkyUpdate(this.lastSkyInfo);
  }

  setAgentStatuses(statusMap) {
    this.agentStatuses = statusMap instanceof Map ? statusMap : new Map(Object.entries(statusMap || {}));
    this.lastScreenTick = -1;
  }

  isCinemaActive() {
    return this.cinemaMode;
  }

  setCinemaMode(enabled) {
    const next = Boolean(enabled);
    if (this.cinemaMode === next) return this.cinemaMode;
    this.cinemaMode = next;
    if (next) {
      if (this.player) this.leavePlayer(false);
      this.cinemaTimer = 0;
      this.targetPitch = 0.72;
    }
    this.onCinemaChange(this.cinemaMode);
    return this.cinemaMode;
  }

  toggleCinemaMode() {
    return this.setCinemaMode(!this.cinemaMode);
  }

  focusDepartment(departmentId) {
    if (this.cinemaMode) this.setCinemaMode(false);
    super.focusDepartment(departmentId);
  }

  focusCeoOffice(enabled) {
    if (this.cinemaMode) this.setCinemaMode(false);
    super.focusCeoOffice(enabled);
  }

  // --- Join-the-office Player Mode ---

  isPlayerActive() {
    return Boolean(this.player);
  }

  getPlayerView() {
    return this.playerView;
  }

  getCameraAzimuth() {
    return -(this.yaw - Math.PI * 0.24) - 0.18;
  }

  joinAsPlayer(profile = {}) {
    if (this.cinemaMode) this.setCinemaMode(false);
    if (this.player) this.leavePlayer(false);
    const name = String(profile.name || 'You').trim().slice(0, 24) || 'You';
    const color = /^#[0-9a-f]{6}$/i.test(profile.color || '') ? profile.color : '#22d3ee';
    const skin = /^#[0-9a-f]{6}$/i.test(profile.skin || '') ? profile.skin : '#e8b88a';
    const hairStyle = ['short', 'buzz', 'long', 'bun', 'ponytail', 'bob'].includes(profile.hairStyle)
      ? profile.hairStyle
      : 'short';

    const style = {
      hair: profile.hair || '#1f2937',
      skin,
      suit: color,
      shirt: '#f8fafc',
      visor: false,
      hairStyle,
      pants: '#1f2937',
      shoes: '#111827',
      build: 1.0,
      height: 1.0,
      glasses: Boolean(profile.glasses)
    };

    this.player = {
      id: 'player',
      name,
      accent: color,
      x: PLAYER_SPAWN.x,
      y: PLAYER_SPAWN.y,
      targetX: PLAYER_SPAWN.x + 1,
      targetY: PLAYER_SPAWN.y,
      walking: false,
      walkPhase: 0,
      actionPhase: 0,
      activity: 'idle',
      slotKey: 'player',
      speech: '',
      speechTimer: 0
    };

    const h = createHumanoid(style, color, name, 'player', this.cache);
    h.tagEl.classList.add('is-player');
    h.actEl.textContent = 'You';
    h.lastActivityText = 'You';
    h.facingYaw = Math.PI / 2;
    this.playerHumanoid = h;
    this.actorGroup.add(h.root);

    // Camera behind the player looking east along the walkway
    this.playerView = 'third';
    const desiredAz = -Math.PI / 2;
    this.targetYaw = Math.PI * 0.24 - desiredAz - 0.18;
    this.yaw = this.targetYaw;
    this.targetPitch = 0.42;
    this.targetZoom = 1.0;
    this.followTarget.copy(V(this.player.x, this.player.y, 1.15));
    this.activeDepartmentId = null;

    this.showPlayerSpeech(`Hi team, ${name} here!`, 3.5);
    this.onStatusChange();
    return true;
  }

  leavePlayer(notify = true) {
    if (!this.player) return;
    const h = this.playerHumanoid;
    if (h) {
      h.tagEl.remove();
      h.bubbleEl.remove();
      this.actorGroup.remove(h.root);
    }
    this.player = null;
    this.playerHumanoid = null;
    this.playerNearId = null;
    this.keysDown.clear();
    this.onPlayerProximity(null);
    this.resetCamera();
    this.targetPitch = 0.92;
    if (notify) this.onPlayerLeave();
    this.onStatusChange();
  }

  togglePlayerView() {
    if (!this.player) return this.playerView;
    this.playerView = this.playerView === 'third' ? 'first' : 'third';
    this.targetPitch = this.playerView === 'first' ? 0.6 : 0.42;
    return this.playerView;
  }

  showPlayerSpeech(text, duration = 4.5) {
    if (!this.player) return;
    this.player.speech = String(text || '');
    this.player.speechTimer = duration;
  }

  handlePlayerKey(ev, down) {
    if (isTypingTarget(ev.target) || document.querySelector('dialog[open]')) return;

    if (down && !ev.repeat) {
      if (ev.code === 'KeyB') {
        ev.preventDefault();
        this.onBossToggle();
        return;
      }
      if (ev.code === 'KeyC') {
        ev.preventDefault();
        this.toggleCinemaMode();
        return;
      }
    }

    if (!this.player) return;

    if (down) {
      if (ev.code === 'KeyE' && !ev.repeat) {
        ev.preventDefault();
        this.playerInteract();
        return;
      }
      if (ev.code === 'KeyV' && !ev.repeat) {
        ev.preventDefault();
        this.togglePlayerView();
        this.onStatusChange();
        return;
      }
      if (ev.code === 'Escape') {
        ev.preventDefault();
        this.leavePlayer(true);
        return;
      }
    }

    if (MOVE_KEYS.has(ev.code)) {
      ev.preventDefault();
      if (down) this.keysDown.add(ev.code);
      else this.keysDown.delete(ev.code);
    }
  }

  playerInteract() {
    if (!this.player || !this.playerNearId) return;
    const id = this.playerNearId;
    if (id !== 'jarvis') {
      const lines = [
        `Hey ${this.player.name}, what do you need?`,
        `Sure ${this.player.name}, let's talk!`,
        `Hi ${this.player.name}! How can I help?`
      ];
      this.showAgentSpeech(id, lines[Math.floor(Math.random() * lines.length)], 4);
    }
    this.onOpenTerminal(id);
  }

  buildColliders() {
    const boxes = [];
    const circles = [];
    const addBox = (cx, cy, w, d) => boxes.push({ x1: cx - w / 2, y1: cy - d / 2, x2: cx + w / 2, y2: cy + d / 2 });
    const addRect = (x1, y1, x2, y2) =>
      boxes.push({ x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2) });
    const tier = (id) => this.getRoomTier(id);

    for (const agent of this.team || []) {
      const st = STATIONS[agent.id];
      if (!st?.box || tier(agent.id) === 0) continue;
      const isCeo = agent.id === 'ceo';
      const deskTier = isCeo ? this.upgrades?.deskTier || 1 : 1;
      const rt = tier(agent.id);
      const deskW = isCeo ? (deskTier >= 2 ? 2.65 : 2.25) : rt >= 2 ? 2.2 : 1.98;
      const deskD = isCeo ? (deskTier >= 2 ? 1.2 : 1.08) : 1.02;
      addBox(st.deskX + 0.15, st.deskY, deskW + 0.55, deskD);
      const b = st.box;
      const t = 0.07;
      addRect(b.x1 + 0.1, b.y1 + 0.06 - t, b.x2 - 0.1, b.y1 + 0.06 + t);
      addRect(b.x1 + 0.06 - t, b.y1 + 0.1, b.x1 + 0.06 + t, b.y2 - 0.4);
      addRect(b.x2 - 0.06 - t, b.y1 + 0.1, b.x2 - 0.06 + t, b.y2 - 0.4);
    }

    circles.push({ x: STATIONS.jarvis.x, y: STATIONS.jarvis.y, r: 1.3 });

    if (tier('serverRoom') >= 1) {
      const r = INFRA_ROOMS.serverRoom;
      const racks = [
        [r.cx - 1.5, r.cy - 2.6],
        [r.cx + 1.5, r.cy - 2.6],
        [r.cx - 1.5, r.cy],
        [r.cx + 1.5, r.cy],
        [r.cx - 1.5, r.cy + 2.6],
        [r.cx + 1.5, r.cy + 2.6]
      ];
      if (tier('serverRoom') >= 2) racks.push([r.cx, r.cy - 2.6], [r.cx, r.cy + 2.6]);
      if (tier('serverRoom') >= 3) racks.push([r.cx, r.cy]);
      for (const [x, y] of racks) addBox(x, y, 0.82, 0.82);
    }
    if (tier('conferenceRoom') >= 1) {
      const r = INFRA_ROOMS.conferenceRoom;
      addBox(r.cx, r.cy, 1.45, 3.3);
      addRect(r.x1 + 0.1, r.y1 + 0.03, r.x2 - 0.1, r.y1 + 0.17);
    }
    if (tier('lobbyRoom') >= 1) {
      const r = INFRA_ROOMS.lobbyRoom;
      addBox(r.cx - 0.9, r.cy + 2.1, 2.2, 0.8);
      addBox(r.cx + 1.6, r.cy + 2.1, 1.5, 0.8);
      addBox(r.cx, r.y1 + 0.35, 2.8, 0.15);
    }
    if (tier('swimmingPool') >= 1) addRect(17.2, -12.1, 21.0, -4.9);
    if (tier('gymRoom') >= 1) {
      addBox(12.0, -4.8, 0.8, 1.35);
      addBox(13.3, -4.8, 0.8, 1.35);
      addBox(14.9, -4.0, 0.5, 0.95);
    }
    if (tier('basketballCourt') >= 1) circles.push({ x: 15.5, y: 3.4, r: 0.15 });
    if (tier('soccerPitch') >= 1) {
      circles.push({ x: 21.3, y: -1.0, r: 0.08 }, { x: 21.3, y: 1.0, r: 0.08 });
    }
    if (tier('barLounge') >= 1) {
      addBox(18.8, 5.8, 1.5, 0.95);
      addBox(12.3, 9.4, 1.7, 0.7);
      addBox(11.15, 9.4, 0.55, 0.55);
      addBox(14.7, 9.7, 1.65, 0.95);
      addBox(17.5, 9.4, 1.4, 0.72);
    }

    this.colliders = { boxes, circles };
  }

  playerBlockedAt(nx, ny, ox, oy) {
    const r = PLAYER_RADIUS;
    if (nx < CAMPUS_BOUNDS.x1 || nx > CAMPUS_BOUNDS.x2 || ny < CAMPUS_BOUNDS.y1 || ny > CAMPUS_BOUNDS.y2) {
      return true;
    }
    for (const b of this.colliders.boxes) {
      if (circleHitsBox(nx, ny, r, b)) return true;
    }
    for (const c of this.colliders.circles) {
      if (Math.hypot(nx - c.x, ny - c.y) < r + c.r) return true;
    }
    for (const a of this.actors.values()) {
      if (a.activity === 'swim' && !a.walking) continue;
      const newD = Math.hypot(nx - a.x, ny - a.y);
      const oldD = Math.hypot(ox - a.x, oy - a.y);
      if (newD < r + 0.3 && newD < oldD) return true;
    }
    return false;
  }

  updatePlayer(dt) {
    const p = this.player;
    if (!p) return;

    if (p.speechTimer > 0) {
      p.speechTimer -= dt;
      if (p.speechTimer <= 0) p.speech = '';
    }

    const k = this.keysDown;
    let f = 0;
    let s = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
    const running = k.has('ShiftLeft') || k.has('ShiftRight');

    const az = this.getCameraAzimuth();
    const fwdX = -Math.sin(az);
    const fwdY = -Math.cos(az);
    const rightX = Math.cos(az);
    const rightY = -Math.sin(az);
    let dx = fwdX * f + rightX * s;
    let dy = fwdY * f + rightY * s;
    const len = Math.hypot(dx, dy);

    if (len > 0.001) {
      dx /= len;
      dy /= len;
      const speed = running ? 6.0 : 3.2;
      const step = speed * dt;
      const ox = p.x;
      const oy = p.y;
      const nx = p.x + dx * step;
      if (!this.playerBlockedAt(nx, p.y, ox, oy)) p.x = nx;
      const ny = p.y + dy * step;
      if (!this.playerBlockedAt(p.x, ny, ox, oy)) p.y = ny;
      p.walking = true;
      p.walkPhase += dt * (running ? 15 : 10);
      p.targetX = p.x + dx;
      p.targetY = p.y + dy;
    } else {
      p.walking = false;
      p.actionPhase += dt * 2;
    }

    // Proximity detection & greetings
    let best = null;
    let bestD = 1.9;
    for (const a of this.actors.values()) {
      if (a.activity === 'swim' && !a.walking) continue;
      const d = Math.hypot(a.x - p.x, a.y - p.y);
      if (d < bestD) {
        best = a.id;
        bestD = d;
      }
      if (d < 2.3 && !this.reducedMotion) {
        const last = this.greetCooldown.get(a.id) ?? -999;
        if (this.clockSec - last > 25) {
          this.greetCooldown.set(a.id, this.clockSec);
          const greets = [`Hi ${p.name}! 👋`, `Welcome in, ${p.name}!`, `Hey ${p.name}, need anything?`];
          this.showAgentSpeech(a.id, greets[Math.floor(Math.random() * greets.length)], 3.5);
        }
      }
    }
    if (!best && Math.hypot(STATIONS.jarvis.x - p.x, STATIONS.jarvis.y - p.y) < 2.7) {
      best = 'jarvis';
    }
    if (best !== this.playerNearId) {
      this.playerNearId = best;
      this.onPlayerProximity(best);
    }
  }

  drawMinimap() {
    const ctx = this.minimapCtx;
    if (!ctx) return;
    const W = this.minimap.width;
    const H = this.minimap.height;
    const pad = 10;
    const sx = (x) => pad + ((x + 22.3) / 44.6) * (W - pad * 2);
    const sy = (y) => pad + ((y + 14.2) / 28.4) * (H - pad * 2);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(sx(-22.3), sy(-14.2), sx(22.3) - sx(-22.3), sy(14.2) - sy(-14.2));

    for (const z of DEPARTMENT_ZONES) {
      ctx.fillStyle = `${z.accent}22`;
      ctx.strokeStyle = this.activeDepartmentId === z.id ? z.accent : `${z.accent}88`;
      ctx.lineWidth = this.activeDepartmentId === z.id ? 3 : 1.5;
      ctx.fillRect(sx(z.x1), sy(z.y1), sx(z.x2) - sx(z.x1), sy(z.y2) - sy(z.y1));
      ctx.strokeRect(sx(z.x1), sy(z.y1), sx(z.x2) - sx(z.x1), sy(z.y2) - sy(z.y1));
    }

    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(sx(STATIONS.jarvis.x), sy(STATIONS.jarvis.y), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    for (const a of this.actors.values()) {
      ctx.fillStyle = a.accent || '#e2e8f0';
      ctx.beginPath();
      ctx.arc(sx(a.x), sy(a.y), 5, 0, Math.PI * 2);
      ctx.fill();
      if (this.selectedDeskId === a.id) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    if (this.player && this.playerHumanoid) {
      const px = sx(this.player.x);
      const py = sy(this.player.y);
      const yaw = this.playerHumanoid.facingYaw;
      const dirX = Math.sin(yaw);
      const dirY = Math.cos(yaw);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.atan2(dirY, dirX));
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = this.player.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(-7, 7);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, -7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  syncRendererSize() {
    if (!this.renderer || !this.canvas) return;
    const w = Math.max(1, this.canvas.clientWidth || LOGICAL_WIDTH);
    const h = Math.max(1, this.canvas.clientHeight || LOGICAL_HEIGHT);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
    this.labelRenderer.setSize(w, h);
  }

  getQuality() {
    return this.quality;
  }

  setQuality(q) {
    const valid = q === 'balanced' || q === 'performance' ? q : 'high';
    this.quality = valid;
    try {
      window.localStorage?.setItem(QUALITY_STORAGE_KEY, valid);
    } catch {
      // Ignore storage quota errors
    }

    const dpr = window.devicePixelRatio || 1;
    if (valid === 'high') {
      this.renderer.setPixelRatio(Math.min(dpr, 2));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(2048, 2048);
      this.useBloom = true;
    } else if (valid === 'balanced') {
      this.renderer.setPixelRatio(Math.min(dpr, 1.25));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(1024, 1024);
      this.useBloom = false;
    } else {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
      this.useBloom = false;
    }

    if (this.sunLight.shadow.map) {
      this.sunLight.shadow.map.dispose();
      this.sunLight.shadow.map = null;
    }
    this.syncRendererSize();
  }

  update(dt) {
    super.update(dt);
    this._lastDt = dt;
    this.camPitch += (this.targetPitch - this.camPitch) * Math.min(1, dt * 10);
    if (this.player) this.updatePlayer(dt);
    if (this.cinemaMode && !this.player) {
      this.targetYaw += dt * 0.14;
      this.cinemaTimer -= dt;
      if (this.cinemaTimer <= 0) {
        this.cinemaTimer = 5.5;
        const busy = [...this.actors.values()].filter(
          (a) => a.activity === 'working' || (this.agentStatuses.get(a.id)?.level ?? 0) >= 1
        );
        const pool = busy.length > 0 ? busy : [...this.actors.values()];
        if (pool.length > 0) {
          const pick = pool[this.cinemaIdx % pool.length];
          this.cinemaIdx += 1;
          this.targetFocusOffsetX = pick.x;
          this.targetFocusOffsetY = pick.y;
          this.targetZoom = 1.48;
        }
      }
    }
    this.updateSky(false);
  }

  pickAt(sx, sy) {
    if (!this.raycaster || !this.camera) return null;
    const ndc = new THREE.Vector2(
      (sx / LOGICAL_WIDTH) * 2 - 1,
      -(sy / LOGICAL_HEIGHT) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets = [...this.actorPickables, ...this.staticPickables];
    const hits = this.raycaster.intersectObjects(targets, false);
    for (const hit of hits) {
      if (hit.object?.userData?.pickId) {
        return hit.object.userData.pickId;
      }
    }
    return null;
  }

  ensureCampus() {
    const sig = JSON.stringify({
      rooms: this.upgrades?.rooms || {},
      deskTier: this.upgrades?.deskTier || 1,
      brainLinkTier: this.upgrades?.brainLinkTier || 1,
      decorTier: this.upgrades?.decorTier || 1,
      team: (this.team || []).map((a) => a.id)
    });
    if (sig === this.campusSig && this.campusData) return;
    this.campusSig = sig;

    if (this.campusData?.group) {
      this.campusData.group.traverse((obj) => {
        if (obj.isCSS2DObject && obj.element) {
          obj.element.remove();
        }
      });
      this.scene.remove(this.campusData.group);
    }

    this.campusData = buildCampus({
      team: this.team || [],
      upgrades: this.upgrades || {},
      getRoomTier: (id) => this.getRoomTier(id),
      cache: this.cache
    });
    this.scene.add(this.campusData.group);
    this.staticPickables = this.campusData.pickables;
    this.buildColliders();
    this.updateSky(true);
  }

  ensureActorHumanoids() {
    for (const actor of this.actors.values()) {
      if (this.humanoids.has(actor.id)) continue;
      const style = CHARACTER_STYLE[actor.id] || CHARACTER_STYLE.athena;
      const h = createHumanoid(style, actor.accent, actor.name, actor.id, this.cache);
      this.humanoids.set(actor.id, h);
      this.actorGroup.add(h.root);
      this.actorPickables.push(h.proxy);
    }
  }

  updateDynamicCampus() {
    const dyn = this.campusData?.dyn;
    if (!dyn) return;
    const t = this.clockSec;
    const isRunning = this.mission?.status === 'running';

    // Department LED strips
    for (const [deptId, mat] of dyn.deptStrips.entries()) {
      mat.emissiveIntensity = this.activeDepartmentId === deptId ? 2.2 : 0.6;
    }

    // Office outlines (severity colour overrides accent when an agent has an active incident)
    for (const [agentId, mat] of dyn.officeOutlines.entries()) {
      const st = this.agentStatuses.get(agentId);
      const sevLevel = st?.level ?? 0;
      const agent = (this.team || []).find((a) => a.id === agentId);
      const baseHex = sevLevel >= 1 ? SEVERITY[sevLevel].color : agent?.accent || '#38bdf8';
      mat.color.set(baseHex);
      mat.emissive.set(baseHex);
      const highlighted =
        this.selectedDeskId === agentId || this.tourTarget === agentId || this.dragHoverId === agentId;
      if (st?.panic && !this.reducedMotion) {
        mat.emissiveIntensity = 1.2 + Math.abs(Math.sin(t * 7)) * 1.4;
      } else {
        mat.emissiveIntensity = sevLevel >= 1 ? 1.55 : highlighted ? 1.9 : 0.35;
      }
    }

    // Panic desk alarm beacons
    for (const [agentId, alarm] of dyn.alarms.entries()) {
      const st = this.agentStatuses.get(agentId);
      const panic = Boolean(st?.panic);
      alarm.mesh.visible = panic;
      if (panic) {
        alarm.mat.emissiveIntensity = this.reducedMotion ? 2.2 : 1.0 + Math.abs(Math.sin(t * 9)) * 2.8;
      }
    }

    // Conduits & working agent screens (real terminal log feed + severity border)
    const workingSet = new Set();
    for (const task of this.mission?.tasks ?? []) {
      if (task.status === 'running') workingSet.add(task.agentId);
    }
    for (const [agentId, mat] of dyn.conduits.entries()) {
      const st = this.agentStatuses.get(agentId);
      const col = st?.level >= 1 ? SEVERITY[st.level].color : '#38bdf8';
      mat.color.set(col);
      mat.emissive.set(col);
      mat.emissiveIntensity = st?.panic ? 1.8 : workingSet.has(agentId) ? 2.1 : 0.25;
    }

    if (t - this.lastScreenTick >= 0.3 || this.lastScreenTick < 0) {
      this.lastScreenTick = t;
      for (const [agentId, screen] of Object.entries(this.cache.screens)) {
        const st = this.agentStatuses.get(agentId);
        drawScreen(screen, t, workingSet.has(agentId), st?.feed || null);
      }
    }

    // JARVIS Core animation
    if (dyn.core) {
      const speed = this.reducedMotion ? 0 : isRunning ? 2.4 : 0.85;
      const bob = this.reducedMotion ? 0 : Math.sin(t * 2.5) * 0.14;
      dyn.core.octa.position.y = dyn.core.baseZ + bob;
      dyn.core.octa.rotation.y = this.reducedMotion ? 0.5 : t * speed;
      dyn.core.torus1.position.y = dyn.core.baseZ + bob;
      dyn.core.torus1.rotation.z = this.reducedMotion ? 0.2 : t * speed * 0.9;
      dyn.core.torus1.rotation.x = this.reducedMotion ? 0.6 : Math.sin(t * 0.7) * 0.6;
      dyn.core.torus2.position.y = dyn.core.baseZ + bob;
      dyn.core.torus2.rotation.y = this.reducedMotion ? 0.4 : -t * speed * 1.1;
      dyn.core.octaMat.emissiveIntensity = isRunning ? 2.4 : 1.5;
      dyn.core.light.intensity = isRunning ? 32 : 22;
    }

    if (dyn.holo) {
      dyn.holo.mesh.position.y = dyn.holo.baseZ + (this.reducedMotion ? 0 : Math.sin(t * 3) * 0.08);
      dyn.holo.mesh.rotation.y = this.reducedMotion ? 0.3 : t * 1.3;
    }

    // Server LEDs
    const blink = !this.reducedMotion && Math.sin(t * 5) > 0;
    dyn.serverLeds.forEach((mat, i) => {
      mat.emissiveIntensity = blink ^ (i % 2 === 0) ? 2.0 : 0.45;
    });

    // Water normal scroll
    if (dyn.water && !this.reducedMotion) {
      dyn.water.offset.x = (t * 0.04) % 1;
      dyn.water.offset.y = (t * 0.03) % 1;
    }

    // Dance tiles & disco ball
    if (dyn.danceTiles.length > 0) {
      const phase = this.reducedMotion ? 0 : Math.floor(t * 3);
      dyn.danceTiles.forEach((mat, i) => {
        const col = DANCE_PALETTE[(i + phase) % DANCE_PALETTE.length];
        mat.color.set(col);
        mat.emissive.set(col);
      });
    }
    if (dyn.disco && !this.reducedMotion) {
      dyn.disco.rotation.y = t * 1.4;
    }

    // Sports balls (mirrored from legacy formulas)
    if (dyn.balls.pickleball) {
      const active = this.getRoomTier('pickleballCourt') >= 1 && this.hasActivity('pickleball');
      dyn.balls.pickleball.visible = active;
      if (active) {
        const cycle = (Math.sin(this.sportsClock * Math.PI) + 1) / 2;
        const bx = 12.1 + cycle * 2.8;
        const by = -9.9 + Math.sin(this.sportsClock * 1.7) * 0.8;
        const bz = 0.25 + Math.abs(Math.sin(this.sportsClock * Math.PI)) * 1.0;
        dyn.balls.pickleball.position.copy(V(bx, by, bz));
      }
    }
    if (dyn.balls.basketball) {
      const active = this.getRoomTier('basketballCourt') >= 1 && this.hasActivity('basketball');
      dyn.balls.basketball.visible = active;
      if (active) {
        const bt = (this.sportsClock * 0.75) % 1;
        const bx = 12.3 + bt * 2.6;
        const by = 2.9 + Math.sin(bt * Math.PI) * 0.5;
        const bz = 0.25 + Math.sin(bt * Math.PI) * 2.15;
        dyn.balls.basketball.position.copy(V(bx, by, bz));
      }
    }
    if (dyn.balls.soccer) {
      const active = this.getRoomTier('soccerPitch') >= 1 && this.hasActivity('soccer');
      dyn.balls.soccer.visible = active;
      if (active) {
        const st = (Math.sin(this.sportsClock * 1.9) + 1) / 2;
        const bx = 17.7 + st * 2.9;
        const by = Math.cos(this.sportsClock * 1.4) * 0.8;
        const bz = 0.22 + Math.abs(Math.sin(this.sportsClock * 3.2)) * 0.4;
        dyn.balls.soccer.position.copy(V(bx, by, bz));
      }
    }
    if (dyn.balls.pingpong) {
      const active = this.getRoomTier('barLounge') >= 1 && this.hasActivity('pingpong');
      dyn.balls.pingpong.visible = active;
      if (active) {
        const cycle = (Math.sin(this.sportsClock * 3.8) + 1) / 2;
        const bx = 18.15 + cycle * 1.3;
        const bz = 0.78 + Math.abs(Math.sin(this.sportsClock * 3.8)) * 0.35;
        dyn.balls.pingpong.position.copy(V(bx, 5.8, bz));
      }
    }
  }

  updatePackets() {
    const needed = this.packets.length;
    while (this.packetPool.length < needed) {
      const grp = new THREE.Group();
      const headMat = new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#38bdf8',
        emissiveIntensity: 2.2
      });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), headMat);
      const t1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), headMat);
      const t2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), headMat);
      grp.add(head, t1, t2);
      this.packetGroup.add(grp);
      this.packetPool.push({ grp, head, t1, t2, mat: headMat });
    }

    for (let i = 0; i < this.packetPool.length; i += 1) {
      const item = this.packetPool[i];
      if (i >= needed) {
        item.grp.visible = false;
        continue;
      }
      const p = this.packets[i];
      item.grp.visible = true;
      item.mat.color.set(p.color);
      item.mat.emissive.set(p.color);

      const posAt = (prog) => {
        const cp = clamp(prog, 0, 1);
        return V(
          p.fromX + (p.toX - p.fromX) * cp,
          p.fromY + (p.toY - p.fromY) * cp,
          0.8 + Math.sin(cp * Math.PI) * 0.9
        );
      };
      item.head.position.copy(posAt(p.progress));
      item.t1.position.copy(posAt(p.progress - 0.06));
      item.t2.position.copy(posAt(p.progress - 0.12));
    }
  }

  render() {
    if (!this.isVisible || !this.renderer) return;

    this.ensureCampus();
    this.ensureActorHumanoids();

    // Camera orbit & target (follows the player when joined)
    const az = this.getCameraAzimuth();
    const cosP = Math.cos(this.camPitch);
    const sinP = Math.sin(this.camPitch);
    const dtCam = this._lastDt || 0.016;

    if (this.player && this.playerView === 'first') {
      const eye = V(this.player.x, this.player.y, 1.55);
      this.followTarget.copy(eye);
      const lookDown = clamp(this.camPitch - 0.6, -0.7, 0.9);
      this.camera.position.copy(eye);
      this.camera.lookAt(
        eye.x - Math.sin(az) * Math.cos(lookDown),
        eye.y - Math.sin(lookDown),
        eye.z - Math.cos(az) * Math.cos(lookDown)
      );
    } else if (this.player) {
      const goal = V(this.player.x, this.player.y, 1.15);
      this.followTarget.lerp(goal, Math.min(1, dtCam * 9));
      const dist = clamp(7 / this.zoom, 2.6, 14);
      const pitch = clamp(this.camPitch, 0.12, 1.35);
      this.camera.position.set(
        this.followTarget.x + dist * Math.cos(pitch) * Math.sin(az),
        this.followTarget.y + dist * Math.sin(pitch),
        this.followTarget.z + dist * Math.cos(pitch) * Math.cos(az)
      );
      this.camera.lookAt(this.followTarget);
    } else {
      const target = V(this.focusOffsetX, this.focusOffsetY, 0.3);
      const dist = Math.max(12, 46 / this.zoom);
      this.camera.position.set(
        target.x + dist * cosP * Math.sin(az),
        target.y + dist * sinP,
        target.z + dist * cosP * Math.cos(az)
      );
      this.camera.lookAt(target);
    }

    this.updateDynamicCampus();
    this.updatePackets();

    // Determine top 3 speaking actors
    const topSpeakers = new Set(
      [...this.actors.values()]
        .filter((a) => a.speech)
        .sort((a, b) => b.speechTimer - a.speechTimer)
        .slice(0, 3)
        .map((a) => a.id)
    );

    const actorsList = [...this.actors.values()];
    for (const actor of actorsList) {
      const h = this.humanoids.get(actor.id);
      if (!h) continue;

      let nearbyTarget = null;
      if (!actor.walking && !actor.slotKey?.startsWith('computer:')) {
        let bestDist = 3.0;
        for (const other of actorsList) {
          if (other.id === actor.id || other.walking) continue;
          const d = Math.hypot(other.x - actor.x, other.y - actor.y);
          if (d < bestDist) {
            bestDist = d;
            nearbyTarget = other;
          }
        }
        if (this.player && Math.hypot(this.player.x - actor.x, this.player.y - actor.y) < 2.6) {
          nearbyTarget = this.player;
        }
      }

      animateHumanoid(h, actor, {
        t: this.clockSec,
        dt: this._lastDt || 0.016,
        reducedMotion: this.reducedMotion,
        activityLabel: this.getActorActivityLabel(actor.id),
        sportsClock: this.sportsClock,
        nearbyTarget
      });

      const st = this.agentStatuses.get(actor.id);
      const sevLevel = st?.level ?? 0;
      const ringHex = sevLevel >= 1 ? SEVERITY[sevLevel].color : actor.accent;
      h.selectionRing.material.color.set(ringHex);
      h.selectionRing.material.emissive.set(ringHex);
      h.selectionRing.visible =
        sevLevel >= 1 ||
        this.selectedDeskId === actor.id ||
        this.tourTarget === actor.id ||
        this.dragHoverId === actor.id;

      const showBubble = topSpeakers.has(actor.id) && Boolean(actor.speech);
      if (showBubble) {
        const clipped = actor.speech.length > 60 ? `${actor.speech.slice(0, 58)}..` : actor.speech;
        if (h.lastBubbleText !== clipped) {
          h.lastBubbleText = clipped;
          h.bubbleEl.textContent = clipped;
        }
        h.bubbleEl.style.display = 'block';
      } else if (h.bubbleEl.style.display !== 'none') {
        h.bubbleEl.style.display = 'none';
      }
    }

    // Player avatar animation, bubble & first-person visibility
    if (this.player && this.playerHumanoid) {
      const ph = this.playerHumanoid;
      animateHumanoid(ph, this.player, {
        t: this.clockSec,
        dt: dtCam,
        reducedMotion: this.reducedMotion,
        activityLabel: this.player.walking ? 'You · Walking' : 'You',
        sportsClock: this.sportsClock,
        nearbyTarget: null
      });
      const fp = this.playerView === 'first';
      ph.root.visible = !fp;
      ph.tagObj.visible = !fp;
      const showBubble = Boolean(this.player.speech) && !fp;
      ph.bubbleObj.visible = showBubble;
      if (showBubble) {
        const clipped = this.player.speech.length > 60 ? `${this.player.speech.slice(0, 58)}..` : this.player.speech;
        if (ph.lastBubbleText !== clipped) {
          ph.lastBubbleText = clipped;
          ph.bubbleEl.textContent = clipped;
        }
        ph.bubbleEl.style.display = 'block';
      } else {
        ph.bubbleEl.style.display = 'none';
      }
    }

    if (this.clockSec - this.lastMinimapDraw >= 0.1 || this.lastMinimapDraw < 0) {
      this.lastMinimapDraw = this.clockSec;
      this.drawMinimap();
    }

    // Detail labels toggle
    const showDetail = this.zoom >= 1.25 || Boolean(this.activeDepartmentId) || Boolean(this.player);
    this.labelRenderer.domElement.classList.toggle('show-detail', showDetail);

    if (this.useBloom) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.labelRenderer.render(this.scene, this.camera);
  }
}

