import { Office3DScene } from './office3d.js';
import { IncidentTracker, SEVERITY, severityInfo } from './severity.js';

const PANIC_THRESHOLD_KEY = 'jarvis-panic-threshold';

const state = {
  team: [],
  departments: [],
  controller: null,
  stages: [],
  tourSteps: [],
  presets: [],
  tourIndex: -1,
  selectedDeskId: 'jarvis',
  activeDepartmentId: null,
  ceoFocus: false,
  voiceEnabled: false,
  listeningAgentId: null,
  officeUpgrades: null,
  draggedTaskPrompt: '',
  currentMission: null,
  activeSource: null,
  agentChats: new Map(),
  typingAgentId: null,
  banterLogs: [],
  tracker: new IncidentTracker(),
  panicThreshold: Math.max(1, Math.min(4, Number(window.localStorage?.getItem(PANIC_THRESHOLD_KEY) || 3))),
  agentFeed: new Map(),
  panickedAgents: new Set(),
  seenMissionLogKeys: new Set(),
  terminalAgentId: null,
  simErrorIdx: 0,
  sessionLlm: {
    apiKey: '',
    baseUrl: '',
    model: ''
  }
};

const els = {
  modePill: document.getElementById('mode-pill'),
  guideStageTag: document.getElementById('guide-stage-tag'),
  jarvisSpeech: document.getElementById('jarvis-speech'),
  tourBtn: document.getElementById('tour-btn'),
  tourControls: document.getElementById('tour-controls'),
  tourProgress: document.getElementById('tour-progress'),
  tourPrev: document.getElementById('tour-prev'),
  tourNext: document.getElementById('tour-next'),
  tourClose: document.getElementById('tour-close'),
  guideAskForm: document.getElementById('guide-ask-form'),
  guideQuestionInput: document.getElementById('guide-question-input'),
  guideAnswerBox: document.getElementById('guide-answer-box'),
  presetList: document.getElementById('preset-list'),
  missionForm: document.getElementById('mission-form'),
  missionPrompt: document.getElementById('mission-prompt'),
  missionError: document.getElementById('mission-error'),
  agentCheckboxes: document.getElementById('agent-checkboxes'),
  dispatchBtn: document.getElementById('dispatch-btn'),
  pipelineSteps: document.getElementById('pipeline-steps'),
  officeActivityBadge: document.getElementById('office-activity-badge'),
  officeFloor: document.getElementById('office-floor'),
  officeCanvas: document.getElementById('office-canvas'),
  officeDock: document.getElementById('office-dock'),
  taskDragBar: document.getElementById('task-drag-bar'),
  dragTaskInput: document.getElementById('drag-task-input'),
  draggableTaskCard: document.getElementById('draggable-task-card'),
  camRotLeft: document.getElementById('cam-rot-left'),
  camRotRight: document.getElementById('cam-rot-right'),
  camZoomIn: document.getElementById('cam-zoom-in'),
  camZoomOut: document.getElementById('cam-zoom-out'),
  camReset: document.getElementById('cam-reset'),
  camCeoFocus: document.getElementById('cam-ceo-focus'),
  camQuality: document.getElementById('cam-quality'),
  camFullscreen: document.getElementById('cam-fullscreen'),
  camCinema: document.getElementById('cam-cinema'),
  officeHud: document.getElementById('office-hud'),
  incidentBanner: document.getElementById('incident-banner'),
  skyBar: document.getElementById('sky-bar'),
  skyMeta: document.getElementById('sky-meta'),
  skySunrise: document.getElementById('sky-sunrise'),
  skySunset: document.getElementById('sky-sunset'),
  skyTimeSlider: document.getElementById('sky-time-slider'),
  skyNowBtn: document.getElementById('sky-now-btn'),
  errorsBadge: document.getElementById('errors-badge'),
  errorsContent: document.getElementById('errors-content'),
  terminalDialog: document.getElementById('terminal-dialog'),
  terminalTitle: document.getElementById('terminal-title'),
  terminalOutput: document.getElementById('terminal-output'),
  terminalClose: document.getElementById('terminal-close'),
  terminalChatBtn: document.getElementById('terminal-chat-btn'),
  terminalCmdForm: document.getElementById('terminal-cmd-form'),
  terminalCmdInput: document.getElementById('terminal-cmd-input'),
  join3dBtn: document.getElementById('join-3d-btn'),
  joinDialog: document.getElementById('join-dialog'),
  joinForm: document.getElementById('join-form'),
  joinCancel: document.getElementById('join-cancel'),
  joinName: document.getElementById('join-name'),
  joinHair: document.getElementById('join-hair'),
  joinSkin: document.getElementById('join-skin'),
  joinGlasses: document.getElementById('join-glasses'),
  joinSwatches: document.getElementById('join-swatches'),
  joinPreviewAvatar: document.getElementById('join-preview-avatar'),
  joinPreviewName: document.getElementById('join-preview-name'),
  officeJoinPrompt: document.getElementById('office-join-prompt'),
  officeControlsHint: document.getElementById('office-controls-hint'),
  deptCamBar: document.getElementById('dept-cam-bar'),
  voiceToggleBtn: document.getElementById('voice-toggle-btn'),
  briefingContent: document.getElementById('briefing-content'),
  deskInspectorContent: document.getElementById('desk-inspector-content'),
  ceoStudioContent: document.getElementById('ceo-studio-content'),
  dagContent: document.getElementById('dag-content'),
  commsLogList: document.getElementById('comms-log-list'),
  settingsBtn: document.getElementById('settings-btn'),
  settingsDialog: document.getElementById('settings-dialog'),
  settingsForm: document.getElementById('settings-form'),
  settingsCloseX: document.getElementById('settings-close-x'),
  settingsClear: document.getElementById('settings-clear'),
  settingApiKey: document.getElementById('setting-api-key'),
  settingBaseUrl: document.getElementById('setting-base-url'),
  settingModel: document.getElementById('setting-model'),
  presetGeminiPro: document.getElementById('preset-gemini-pro'),
  presetGeminiFlash: document.getElementById('preset-gemini-flash'),
  presetOllamaQwen: document.getElementById('preset-ollama-qwen'),
  presetLmStudioQwen: document.getElementById('preset-lmstudio-qwen'),
  detectLocalLlm: document.getElementById('detect-local-llm'),
  localLlmStatus: document.getElementById('local-llm-status')
};

let officeScene = null;

function clearElement(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
}

function switchTab(tabId) {
  const tabButtons = document.querySelectorAll('[role="tab"]');
  const panels = document.querySelectorAll('[role="tabpanel"]');
  for (const btn of tabButtons) {
    const active = btn.id === tabId;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  }
  for (const panel of panels) {
    const controlsId = document.getElementById(tabId)?.getAttribute('aria-controls');
    panel.hidden = panel.id !== controlsId;
  }
}

function updateModePill(serverLlmConfigured) {
  if (/generativelanguage\.googleapis\.com/i.test(state.sessionLlm.baseUrl || '')) {
    els.modePill.textContent = `Gemini (${state.sessionLlm.model || 'gemini-2.5-flash'})`;
    els.modePill.className = 'pill pill-live';
  } else if (state.sessionLlm.baseUrl && /^http:\/\/(localhost|127\.0\.0\.1)/i.test(state.sessionLlm.baseUrl)) {
    els.modePill.textContent = `Local LLM (${state.sessionLlm.model || 'Qwen'})`;
    els.modePill.className = 'pill pill-live';
  } else if (state.sessionLlm.apiKey || serverLlmConfigured) {
    els.modePill.textContent = 'Hybrid LLM Mode';
    els.modePill.className = 'pill pill-live';
  } else {
    els.modePill.textContent = 'Local JARVIS Mode (Offline Ready)';
    els.modePill.className = 'pill pill-live';
  }
}

function selectDesk(deskId, openInspector = true) {
  state.selectedDeskId = deskId;
  renderOfficeFloor();
  renderDeskInspector();
  if (openInspector) {
    switchTab('tab-desk');
  }
}

function renderPresets() {
  clearElement(els.presetList);
  for (const preset of state.presets) {
    const btn = createEl('button', 'chip-btn', preset.label);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      els.missionPrompt.value = preset.prompt;
      els.missionError.hidden = true;
      els.missionPrompt.focus();
    });
    els.presetList.appendChild(btn);
  }
}

function renderAgentFilters() {
  clearElement(els.agentCheckboxes);
  for (const agent of state.team) {
    const label = createEl('label', 'agent-check-label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = agent.id;
    checkbox.checked = true;
    checkbox.name = 'agent';
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(`${agent.name} (${agent.specialty})`));
    els.agentCheckboxes.appendChild(label);
  }
}

function renderPipeline() {
  clearElement(els.pipelineSteps);
  const currentStage = state.currentMission?.currentStage;
  const missionStatus = state.currentMission?.status;
  const currentOrder = state.stages.find((s) => s.id === currentStage)?.order ?? 0;

  for (const stage of state.stages) {
    const li = createEl('li', 'pipeline-step');
    let badgeText = 'Pending';

    if (missionStatus === 'completed') {
      li.classList.add('done');
      badgeText = 'Done';
    } else if (missionStatus === 'running') {
      if (stage.order < currentOrder) {
        li.classList.add('done');
        badgeText = 'Done';
      } else if (stage.order === currentOrder) {
        li.classList.add('active');
        badgeText = 'Active';
      }
    }

    const head = createEl('div', 'pipeline-step-head');
    head.appendChild(createEl('span', '', `${stage.order}. ${stage.name}`));
    head.appendChild(createEl('span', 'tag', badgeText));
    li.appendChild(head);
    li.appendChild(createEl('p', 'pipeline-step-desc', stage.description));
    els.pipelineSteps.appendChild(li);
  }
}

function supportsWebGL() {
  try {
    const testCanvas = document.createElement('canvas');
    return Boolean(testCanvas.getContext('webgl2') || testCanvas.getContext('webgl'));
  } catch {
    return false;
  }
}

async function createOfficeScene(options) {
  const params = new URLSearchParams(window.location.search);
  const forceLegacy = params.has('legacy3d');

  if (!forceLegacy && supportsWebGL()) {
    try {
      const { RealisticOffice3DScene } = await import('./officeRealistic.js');
      return new RealisticOffice3DScene(els.officeCanvas, options);
    } catch (err) {
      console.warn('Realistic 3D initialization failed; falling back to isometric renderer:', err);
      const freshCanvas = els.officeCanvas.cloneNode(false);
      els.officeCanvas.replaceWith(freshCanvas);
      els.officeCanvas = freshCanvas;
      els.officeFloor?.querySelectorAll('.office-label-layer').forEach((node) => node.remove());
    }
  }

  return new Office3DScene(els.officeCanvas, options);
}

function renderOfficeHud() {
  if (!els.officeHud) return;
  clearElement(els.officeHud);

  const rendererName = officeScene?.isRealistic ? 'Realistic 3D' : 'Isometric';
  const liveChip = createEl('span', 'hud-chip', `● LIVE · ${rendererName}`);

  const totalAgents = state.team.length;
  const runningTasks = (state.currentMission?.tasks ?? []).filter((t) => t.status === 'running').length;
  const stageText =
    state.currentMission?.status === 'running'
      ? `Stage: ${state.currentMission.currentStage || 'active'}`
      : state.currentMission?.status === 'completed'
        ? 'Mission completed'
        : 'Free time — agents roaming';

  const statsSpan = createEl(
    'span',
    'hud-stats',
    `${runningTasks}/${totalAgents} working · ${stageText}`
  );
  els.officeHud.append(liveChip, statsSpan);
  if (officeScene?.isPlayerActive?.()) {
    const view = officeScene.getPlayerView?.() === 'first' ? 'First-person' : 'Third-person';
    els.officeHud.appendChild(createEl('span', 'hud-chip', `● You're in · ${view}`));
  }
}

const PLAYER_PROFILE_KEY = 'jarvis-player-profile';

function loadPlayerProfile() {
  try {
    const raw = window.localStorage?.getItem(PLAYER_PROFILE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // Ignore malformed stored profile
  }
  return { name: 'You', color: '#22d3ee', hairStyle: 'short', skin: '#e8b88a', glasses: false };
}

function readJoinForm() {
  const color = els.joinSwatches?.querySelector('input[name="join-color"]:checked')?.value || '#22d3ee';
  return {
    name: (els.joinName?.value || '').trim().slice(0, 24) || 'You',
    color,
    hairStyle: els.joinHair?.value || 'short',
    skin: els.joinSkin?.value || '#e8b88a',
    glasses: Boolean(els.joinGlasses?.checked)
  };
}

function updateJoinPreview() {
  const profile = readJoinForm();
  if (els.joinPreviewAvatar) {
    els.joinPreviewAvatar.textContent = profile.name.charAt(0).toUpperCase();
    els.joinPreviewAvatar.style.setProperty('--join-color', profile.color);
  }
  if (els.joinPreviewName) els.joinPreviewName.textContent = profile.name;
}

function openJoinDialog() {
  const profile = loadPlayerProfile();
  if (els.joinName) els.joinName.value = profile.name === 'You' ? '' : profile.name;
  if (els.joinHair) els.joinHair.value = profile.hairStyle || 'short';
  if (els.joinSkin) els.joinSkin.value = profile.skin || '#e8b88a';
  if (els.joinGlasses) els.joinGlasses.checked = Boolean(profile.glasses);
  const swatch = els.joinSwatches?.querySelector(`input[value="${profile.color}"]`);
  if (swatch) swatch.checked = true;
  updateJoinPreview();
  els.joinDialog?.showModal();
  els.joinName?.focus();
}

function setPlayerPrompt(agentId) {
  if (!els.officeJoinPrompt) return;
  if (!agentId) {
    els.officeJoinPrompt.hidden = true;
    clearElement(els.officeJoinPrompt);
    return;
  }
  const name =
    agentId === 'jarvis'
      ? 'J.A.R.V.I.S.'
      : state.team.find((a) => a.id === agentId)?.name || agentId;
  clearElement(els.officeJoinPrompt);
  const label = agentId === 'jarvis' ? `Talk to ${name}` : `Read ${name}'s terminal`;
  els.officeJoinPrompt.append(createEl('span', 'kbd', 'E'), document.createTextNode(label));
  els.officeJoinPrompt.hidden = false;
}

function updatePlayerUi() {
  const active = Boolean(officeScene?.isPlayerActive?.());
  if (els.join3dBtn) {
    els.join3dBtn.textContent = active ? 'Leave Boss Mode' : 'Boss Mode (B)';
    els.join3dBtn.classList.toggle('is-joined', active);
    els.join3dBtn.setAttribute('aria-pressed', String(active));
  }
  if (els.officeControlsHint) els.officeControlsHint.hidden = !active;
  els.officeFloor?.classList.toggle('player-mode', active);
  if (!active) setPlayerPrompt(null);
  renderOfficeHud();
}

function pushAgentLine(agentId, text, hint) {
  if (!agentId || !text) return;
  const incident = state.tracker.report(agentId, text, { hint });
  const level = incident ? incident.level : 0;
  if (!state.agentFeed.has(agentId)) state.agentFeed.set(agentId, []);
  const lines = state.agentFeed.get(agentId);
  lines.push({ text: String(text), level, time: new Date().toISOString().slice(11, 19) });
  if (lines.length > 40) lines.shift();
}

function ingestMissionTelemetry() {
  const mission = state.currentMission;
  if (!mission) return;
  for (const entry of mission.logs ?? []) {
    const key = `${mission.id}|${entry.timestamp}|${entry.stage}|${entry.message}`;
    if (state.seenMissionLogKeys.has(key)) continue;
    state.seenMissionLogKeys.add(key);
    const targetId = entry.agentId || (entry.stage === 'error' ? 'vulcan' : null);
    if (targetId) {
      pushAgentLine(targetId, entry.message, entry.level);
    }
  }
  for (const task of mission.tasks ?? []) {
    if (task.status === 'running') {
      const rKey = `${mission.id}|run|${task.id}`;
      if (!state.seenMissionLogKeys.has(rKey)) {
        state.seenMissionLogKeys.add(rKey);
        pushAgentLine(task.agentId, `> running task #${task.id}: ${task.title}`);
      }
    } else if (task.status === 'completed') {
      const cKey = `${mission.id}|done|${task.id}`;
      if (!state.seenMissionLogKeys.has(cKey)) {
        state.seenMissionLogKeys.add(cKey);
        pushAgentLine(task.agentId, `✓ completed task #${task.id} (${task.durationMs || 0}ms)`);
      }
    }
  }
}

function syncAgentStatuses() {
  const statusMap = new Map();
  const runningAgents = new Set(
    (state.currentMission?.tasks ?? []).filter((t) => t.status === 'running').map((t) => t.agentId)
  );

  for (const agent of state.team) {
    const level = state.tracker.agentLevel(agent.id);
    const panic = level >= state.panicThreshold;
    const feedLines = state.agentFeed.get(agent.id) || [];
    const defaultLines =
      feedLines.length > 0
        ? feedLines
        : [
            { text: `$ ${agent.id} --watch`, level: 0 },
            { text: `role: ${agent.role}`, level: 0 },
            { text: `model: ${agent.model}`, level: 0 },
            { text: 'status: 0 errors · standing by', level: 0 }
          ];
    statusMap.set(agent.id, {
      level,
      panic,
      feed: {
        title: `${agent.name} — terminal`,
        lines: defaultLines,
        level,
        panic
      }
    });

    if (panic && !state.panickedAgents.has(agent.id)) {
      state.panickedAgents.add(agent.id);
      if (!runningAgents.has(agent.id)) {
        officeScene?.moveAgentTo(agent.id, 'coffee');
      }
      const worst = state.tracker.worstFor(agent.id);
      if (worst) officeScene?.showAgentSpeech(agent.id, `ALERT: ${worst.text.slice(0, 32)}`, 5);
    } else if (!panic && state.panickedAgents.has(agent.id)) {
      state.panickedAgents.delete(agent.id);
    }
  }

  officeScene?.setAgentStatuses?.(statusMap);

  const incidents = state.tracker.list();
  if (els.errorsBadge) {
    els.errorsBadge.textContent = String(incidents.length);
    els.errorsBadge.hidden = incidents.length === 0;
  }

  if (els.incidentBanner) {
    const worst = incidents[0];
    if (!worst) {
      els.incidentBanner.hidden = true;
    } else {
      const info = severityInfo(worst.level);
      const agentName = state.team.find((a) => a.id === worst.agentId)?.name || worst.agentId;
      const mult = worst.count > 1 ? ` (×${worst.count})` : '';
      els.incidentBanner.textContent = `● ${agentName} · ${info.label.toUpperCase()}: ${worst.text.slice(0, 58)}${mult}`;
      els.incidentBanner.style.setProperty('--sev-color', info.color);
      els.incidentBanner.dataset.agentId = worst.agentId;
      els.incidentBanner.hidden = false;
    }
  }
}

function renderErrorsPanel() {
  if (!els.errorsContent) return;
  clearElement(els.errorsContent);

  const card = createEl('div', 'inspector-card');
  const head = createEl('div', 'dept-builder-head');
  head.appendChild(createEl('h3', '', 'Error Severity & Incident Feed'));

  const actions = createEl('div', 'collab-chips');
  const simBtn = createEl('button', 'chip-btn', 'Simulate Incident');
  simBtn.type = 'button';
  simBtn.addEventListener('click', () => {
    const samples = [
      ['vulcan', 'FATAL: password authentication failed for user "app" (db)', 'error'],
      ['nova', "TypeError: Cannot read properties of undefined (reading 'render')", 'error'],
      ['orion', 'ERROR container api restarting (4 times in 2m) — ECONNREFUSED 5432', 'error'],
      ['aegis', 'WARN deprecated TLS 1.1 cipher suite requested by proxy', 'warn']
    ];
    const [aid, msg, hint] = samples[state.simErrorIdx % samples.length];
    state.simErrorIdx += 1;
    pushAgentLine(aid, msg, hint);
    syncAgentStatuses();
    renderErrorsPanel();
    renderOfficeDock();
    if (state.terminalAgentId === aid && els.terminalDialog?.open) renderAgentTerminal();
  });

  const clearBtn = createEl('button', 'chip-btn', 'Clear All');
  clearBtn.type = 'button';
  clearBtn.addEventListener('click', () => {
    state.tracker.clear();
    syncAgentStatuses();
    renderErrorsPanel();
    renderOfficeDock();
    if (els.terminalDialog?.open) renderAgentTerminal();
  });
  actions.append(simBtn, clearBtn);
  head.appendChild(actions);
  card.appendChild(head);

  // Panic threshold selector
  const settingsBox = createEl('div', 'skills-box');
  settingsBox.appendChild(createEl('div', 'deliverable-meta', 'Panic Threshold (alarm light + lounge retreat)'));
  const threshRow = createEl('div', 'studio-tier-row');
  for (const s of SEVERITY.slice(1)) {
    const btn = createEl(
      'button',
      `chip-btn ${state.panicThreshold === s.level ? 'active-chip' : ''}`,
      s.label
    );
    btn.type = 'button';
    btn.style.borderColor = state.panicThreshold === s.level ? s.color : '';
    btn.addEventListener('click', () => {
      state.panicThreshold = s.level;
      try {
        window.localStorage?.setItem(PANIC_THRESHOLD_KEY, String(s.level));
      } catch {
        // Ignore storage errors
      }
      syncAgentStatuses();
      renderErrorsPanel();
      renderOfficeDock();
    });
    threshRow.appendChild(btn);
  }
  settingsBox.appendChild(threshRow);

  const legend = createEl('div', 'collab-chips');
  const counts = state.tracker.counts();
  for (const s of SEVERITY.slice(1)) {
    const pill = createEl('span', 'sev-pill', `${s.label}: ${counts[s.level] || 0}`);
    pill.style.setProperty('--sev-color', s.color);
    legend.appendChild(pill);
  }
  settingsBox.appendChild(legend);
  card.appendChild(settingsBox);

  const incidents = state.tracker.list();
  if (incidents.length === 0) {
    card.appendChild(
      createEl(
        'div',
        'empty-state',
        '0 active incidents. All specialists are healthy. Click "Simulate Incident" to test severity colors, desk alarms, and terminal alerts.'
      )
    );
  } else {
    const list = createEl('ul', 'deliverable-list');
    for (const inc of incidents) {
      const info = severityInfo(inc.level);
      const agentName = state.team.find((a) => a.id === inc.agentId)?.name || inc.agentId;
      const li = createEl('li', 'deliverable-item incident-row');
      li.style.setProperty('--sev-color', info.color);

      const top = createEl('div', 'dept-room-head');
      const left = createEl('span', 'sev-pill', `${info.label}${inc.count > 1 ? ` ×${inc.count}` : ''}`);
      left.style.setProperty('--sev-color', info.color);
      const btns = createEl('div', 'collab-chips');
      const termBtn = createEl('button', 'chip-btn', 'Terminal');
      termBtn.type = 'button';
      termBtn.addEventListener('click', () => openAgentTerminal(inc.agentId));
      const resBtn = createEl('button', 'chip-btn', 'Resolve');
      resBtn.type = 'button';
      resBtn.addEventListener('click', () => {
        state.tracker.resolve(inc.agentId);
        pushAgentLine(inc.agentId, '✓ incidents resolved manually');
        syncAgentStatuses();
        renderErrorsPanel();
        renderOfficeDock();
      });
      btns.append(termBtn, resBtn);
      top.append(left, btns);

      li.appendChild(top);
      li.appendChild(createEl('div', 'deliverable-meta', agentName));
      li.appendChild(createEl('div', 'briefing-summary', inc.text));
      list.appendChild(li);
    }
    card.appendChild(list);
  }

  els.errorsContent.appendChild(card);
}

function renderAgentTerminal() {
  if (!els.terminalOutput || !state.terminalAgentId) return;
  const id = state.terminalAgentId;
  const agent = state.team.find((a) => a.id === id);
  const name = id === 'jarvis' ? 'J.A.R.V.I.S.' : agent?.name || id;
  const level = state.tracker.agentLevel(id);
  const panic = level >= state.panicThreshold;

  if (els.terminalTitle) {
    els.terminalTitle.textContent = `${name} — terminal${panic ? ' [ALERT]' : ''}`;
  }

  clearElement(els.terminalOutput);
  const running = (state.currentMission?.tasks ?? []).find((t) => t.agentId === id && t.status === 'running');
  const headerLine = createEl(
    'div',
    'terminal-line terminal-head-line',
    `role: ${agent?.role || 'AI Controller'} · status: ${running ? `working (${running.title})` : officeScene?.getActorActivityLabel(id) || 'on campus'}`
  );
  els.terminalOutput.appendChild(headerLine);

  const lines = state.agentFeed.get(id) || [
    { text: `$ ${id} --stream`, level: 0, time: 'now' },
    { text: `model=${agent?.model || 'local-jarvis'} · 0 errors`, level: 0, time: 'now' }
  ];
  for (const line of lines) {
    const row = createEl('div', `terminal-line sev-lvl-${line.level || 0}`);
    if (line.time) row.appendChild(createEl('span', 'terminal-ts', `${line.time} `));
    row.appendChild(document.createTextNode(line.text));
    els.terminalOutput.appendChild(row);
  }
  els.terminalOutput.scrollTop = els.terminalOutput.scrollHeight;
}

function openAgentTerminal(agentId) {
  if (agentId === 'jarvis') {
    selectDesk('jarvis', true);
    return;
  }
  state.terminalAgentId = agentId;
  renderAgentTerminal();
  if (!els.terminalDialog?.open) {
    els.terminalDialog?.showModal();
  }
  els.terminalCmdInput?.focus();
}

function updateSkyBarUi(info) {
  if (!info || !els.skyBar) return;
  els.skyBar.hidden = false;
  for (const btn of els.skyBar.querySelectorAll('.sky-btn')) {
    btn.classList.toggle('active', btn.dataset.sky === info.mode);
  }
  if (els.skyMeta) {
    els.skyMeta.textContent = `${info.locationLabel} · ${info.timeText} · Sun ${info.elevation}°`;
  }
  const fmt = (d) =>
    d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '--:--';
  if (els.skySunrise) els.skySunrise.textContent = fmt(info.sunrise);
  if (els.skySunset) els.skySunset.textContent = fmt(info.sunset);
  if (els.skyTimeSlider && document.activeElement !== els.skyTimeSlider) {
    els.skyTimeSlider.value = String(info.timeMinutes ?? 600);
  }
}

function renderOfficeDock() {
  clearElement(els.officeDock);

  const jarvisStatus =
    state.currentMission?.status === 'running'
      ? 'Orchestrating'
      : state.currentMission?.status === 'completed'
        ? 'Briefing Ready'
        : '3D Core Ready';

  const entries = [
    {
      id: 'jarvis',
      name: 'J.A.R.V.I.S.',
      role: 'AI Controller',
      accent: '#38bdf8',
      status: jarvisStatus
    },
    ...state.team.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.title || agent.role || agent.departmentName || '',
      accent: agent.accent,
      status: officeScene ? officeScene.getActorActivityLabel(agent.id) : 'On Campus'
    }))
  ];

  for (const item of entries) {
    const sevLevel = item.id === 'jarvis' ? 0 : state.tracker.agentLevel(item.id);
    const sev = sevLevel >= 1 ? severityInfo(sevLevel) : null;
    const isWorking =
      item.status.includes('Working') ||
      item.status.includes('Coding') ||
      (item.id === 'jarvis' && item.status === 'Orchestrating');
    const isWalking = item.status.includes('Walking');
    const stateCls = isWorking ? 'is-working' : isWalking ? 'is-walking' : '';

    const btn = createEl(
      'button',
      `dock-btn ${state.selectedDeskId === item.id ? 'selected' : ''} ${stateCls} ${sev ? 'has-sev' : ''}`.trim()
    );
    if (sev) btn.style.setProperty('--sev-color', sev.color);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(state.selectedDeskId === item.id));

    const avatar = createEl('span', 'dock-avatar', item.name.charAt(0).toUpperCase());
    avatar.style.setProperty('--dot-color', sev ? sev.color : item.accent);

    const meta = createEl('span', 'dock-meta');
    const head = createEl('span', 'dock-btn-head', item.name);
    const roleEl = createEl('span', 'dock-role', item.role);
    const statusRow = createEl('span', 'dock-btn-status');
    const stateDot = createEl('span', 'state-dot');
    statusRow.append(stateDot, document.createTextNode(sev ? `${sev.label} · ${item.status}` : item.status));

    meta.append(head, roleEl, statusRow);
    btn.append(avatar, meta);

    btn.addEventListener('click', () => selectDesk(item.id, true));
    btn.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
      btn.classList.add('drag-over');
    });
    btn.addEventListener('dragleave', () => {
      btn.classList.remove('drag-over');
    });
    btn.addEventListener('drop', (ev) => {
      ev.preventDefault();
      btn.classList.remove('drag-over');
      const taskText =
        state.draggedTaskPrompt || ev.dataTransfer?.getData('text/plain')?.trim() || '';
      if (taskText) {
        dispatchDroppedTask(item.id, taskText);
      }
    });
    els.officeDock.appendChild(btn);
  }

  renderOfficeHud();
}

function renderOfficeFloor() {
  const tourTarget = state.tourIndex >= 0 ? state.tourSteps[state.tourIndex]?.target : null;
  if (officeScene) {
    officeScene.syncState({
      team: state.team,
      controller: state.controller,
      mission: state.currentMission,
      selectedDeskId: state.selectedDeskId,
      tourTarget,
      upgrades: state.officeUpgrades
    });
  }
  renderOfficeDock();
}

function applyUiTheme(themeId) {
  document.documentElement.dataset.theme = themeId || 'stark-cyan';
}

async function saveOfficeUpgrade(patch) {
  try {
    const res = await fetch('/api/office/upgrades', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (!res.ok) return;
    state.officeUpgrades = await res.json();
    applyUiTheme(state.officeUpgrades.uiTheme);
    renderOfficeFloor();
    renderCeoStudio();
  } catch {
    // Ignore transient UI upgrade save failure
  }
}

function renderDepartmentCamBar() {
  if (!els.deptCamBar) return;
  clearElement(els.deptCamBar);
  els.deptCamBar.appendChild(createEl('span', 'agent-actions-label', 'Departments:'));

  const allBtn = createEl(
    'button',
    `chip-btn dept-cam-btn ${state.activeDepartmentId === null && !state.ceoFocus ? 'active-chip' : ''}`,
    'All Campus'
  );
  allBtn.type = 'button';
  allBtn.addEventListener('click', () => focusDepartmentView(null));
  els.deptCamBar.appendChild(allBtn);

  for (const dept of state.departments) {
    const btn = createEl(
      'button',
      `chip-btn dept-cam-btn ${state.activeDepartmentId === dept.id ? 'active-chip' : ''}`
    );
    btn.type = 'button';
    btn.title = dept.description;
    const dot = createEl('span', 'dept-dot');
    dot.style.setProperty('--dept-color', dept.accent);
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(dept.shortName));
    btn.addEventListener('click', () => focusDepartmentView(dept.id));
    els.deptCamBar.appendChild(btn);
  }
}

function focusDepartmentView(departmentId) {
  state.ceoFocus = false;
  if (els.camCeoFocus) {
    els.camCeoFocus.classList.remove('active-chip');
    els.camCeoFocus.textContent = 'Enter CEO Office';
  }
  state.activeDepartmentId = departmentId;
  if (departmentId) {
    officeScene?.focusDepartment(departmentId);
  } else {
    officeScene?.resetCamera();
  }
  renderDepartmentCamBar();
}

function renderCeoStudio() {
  if (!els.ceoStudioContent) return;
  clearElement(els.ceoStudioContent);
  const u = state.officeUpgrades;
  if (!u) {
    els.ceoStudioContent.appendChild(createEl('div', 'empty-state', 'Loading Department Office Builder...'));
    return;
  }

  const wrap = createEl('div', 'studio-grid');

  // 1. Campus & 1-by-1 Office Builder Overview
  const headerCard = createEl('div', 'studio-module-card');
  headerCard.appendChild(
    createEl(
      'div',
      'deliverable-meta',
      `Multi-Department Builder · ${u.builtCount}/${u.totalRooms} Rooms Built (${u.totalRoomLevels}/${u.maxRoomLevels} Upgrades)`
    )
  );
  const progressTrack = createEl('div', 'token-bar-track');
  const progressFill = createEl('div', 'token-bar-fill');
  progressFill.style.width = `${Math.round((u.totalRoomLevels / Math.max(1, u.maxRoomLevels)) * 100)}%`;
  progressTrack.appendChild(progressFill);
  headerCard.appendChild(progressTrack);

  headerCard.appendChild(
    createEl(
      'div',
      'briefing-summary',
      'Build rooms 1-by-1 across each Department or manage an entire wing at once. Click any Tier 0 blueprint plot on the 3D campus to construct it.'
    )
  );

  const presetRow = createEl('div', 'studio-tier-row');
  const plotBtn = createEl('button', 'chip-btn', 'Build 1-by-1 (Reset to Plots)');
  plotBtn.type = 'button';
  plotBtn.addEventListener('click', () => saveOfficeUpgrade({ preset: 'blueprint' }));

  const starterBtn = createEl('button', 'chip-btn', 'Build All (Tier 1)');
  starterBtn.type = 'button';
  starterBtn.addEventListener('click', () => saveOfficeUpgrade({ preset: 'starter' }));

  const maxBtn = createEl('button', 'chip-btn', 'Max All (Tier 3)');
  maxBtn.type = 'button';
  maxBtn.addEventListener('click', () => saveOfficeUpgrade({ preset: 'max' }));

  const enterBtn = createEl(
    'button',
    `chip-btn ${state.ceoFocus ? 'active-chip' : ''}`,
    state.ceoFocus ? 'Exit CEO Office' : 'Enter CEO Office'
  );
  enterBtn.type = 'button';
  enterBtn.addEventListener('click', () => toggleCeoOfficeFocus());

  presetRow.append(plotBtn, starterBtn, maxBtn, enterBtn);
  headerCard.appendChild(presetRow);
  wrap.appendChild(headerCard);

  // 2. Department Wings & Room-by-Room Controls
  const departments = u.departments || state.departments || [];
  const roomsCatalog = u.roomCatalog || [];

  for (const dept of departments) {
    const deptRooms = roomsCatalog.filter((r) => r.department === dept.id);
    if (deptRooms.length === 0) continue;

    const deptBuilt = deptRooms.filter((r) => (u.rooms?.[r.id] ?? 1) >= 1).length;
    const deptCard = createEl('div', 'studio-module-card');

    const head = createEl('div', 'dept-builder-head');
    head.appendChild(createEl('div', 'deliverable-meta', `${dept.name} · ${deptBuilt}/${deptRooms.length} Built`));

    const deptActions = createEl('div', 'studio-tier-row');
    const viewBtn = createEl('button', 'chip-btn', 'View Wing');
    viewBtn.type = 'button';
    viewBtn.addEventListener('click', () => focusDepartmentView(dept.id));

    const buildDeptBtn = createEl('button', 'chip-btn', 'Build Dept');
    buildDeptBtn.type = 'button';
    buildDeptBtn.addEventListener('click', () =>
      saveOfficeUpgrade({ departmentPreset: { departmentId: dept.id, tier: 1 } })
    );

    const maxDeptBtn = createEl('button', 'chip-btn', 'Max Dept');
    maxDeptBtn.type = 'button';
    maxDeptBtn.addEventListener('click', () =>
      saveOfficeUpgrade({ departmentPreset: { departmentId: dept.id, tier: 3 } })
    );

    deptActions.append(viewBtn, buildDeptBtn, maxDeptBtn);
    head.appendChild(deptActions);
    deptCard.appendChild(head);
    deptCard.appendChild(createEl('div', 'briefing-summary', dept.description));

    for (const room of deptRooms) {
      const currentTier = u.rooms?.[room.id] ?? 1;
      const roomBox = createEl('div', 'dept-room-item');
      const roomHead = createEl('div', 'dept-room-head');
      roomHead.appendChild(createEl('strong', '', room.name));
      const statusText =
        currentTier === 0 ? 'Plot (Unbuilt)' : `Tier ${currentTier}/3`;
      roomHead.appendChild(createEl('span', 'tag', statusText));
      roomBox.appendChild(roomHead);
      roomBox.appendChild(createEl('div', 'briefing-summary', room.summary));

      const tierRow = createEl('div', 'studio-tier-row');
      for (const opt of [
        { tier: 0, label: 'Plot (0)' },
        { tier: 1, label: 'Build (T1)' },
        { tier: 2, label: 'Upgrade (T2)' },
        { tier: 3, label: 'Max (T3)' }
      ]) {
        const btn = createEl(
          'button',
          `chip-btn ${currentTier === opt.tier ? 'active-chip' : ''}`,
          opt.label
        );
        btn.type = 'button';
        btn.addEventListener('click', () =>
          saveOfficeUpgrade({ rooms: { [room.id]: opt.tier } })
        );
        tierRow.appendChild(btn);
      }
      roomBox.appendChild(tierRow);
      deptCard.appendChild(roomBox);
    }

    wrap.appendChild(deptCard);
  }

  // 3. UI Theme Switcher
  const themeCard = createEl('div', 'studio-module-card');
  themeCard.appendChild(createEl('div', 'deliverable-meta', 'UI Design Theme'));
  const themeRow = createEl('div', 'studio-tier-row');
  for (const theme of u.themes || []) {
    const btn = createEl(
      'button',
      `chip-btn ${u.uiTheme === theme.id ? 'active-chip' : ''}`,
      theme.name
    );
    btn.type = 'button';
    btn.addEventListener('click', () => saveOfficeUpgrade({ uiTheme: theme.id }));
    themeRow.appendChild(btn);
  }
  themeCard.appendChild(themeRow);
  wrap.appendChild(themeCard);

  // 4. Upgradable 3D Modules inside CEO Executive Suite
  for (const modKey of ['deskTier', 'brainLinkTier', 'decorTier']) {
    const mod = u.modules?.[modKey];
    if (!mod) continue;
    const currentTier = u[modKey];
    const activeTierObj = mod.tiers.find((t) => t.tier === currentTier) || mod.tiers[0];

    const card = createEl('div', 'studio-module-card');
    card.appendChild(
      createEl('div', 'deliverable-meta', `CEO Suite · ${mod.label} · Tier ${currentTier}/3`)
    );
    card.appendChild(createEl('strong', '', activeTierObj.name));
    card.appendChild(createEl('div', 'briefing-summary', activeTierObj.summary));

    const tierRow = createEl('div', 'studio-tier-row');
    for (const t of mod.tiers) {
      const btn = createEl(
        'button',
        `chip-btn ${currentTier === t.tier ? 'active-chip' : ''}`,
        `Tier ${t.tier}: ${t.name.split(' ')[0]}`
      );
      btn.type = 'button';
      btn.addEventListener('click', () => saveOfficeUpgrade({ [modKey]: t.tier }));
      tierRow.appendChild(btn);
    }
    card.appendChild(tierRow);
    wrap.appendChild(card);
  }

  els.ceoStudioContent.appendChild(wrap);
}

const VOICE_PROFILES = {
  jarvis: { pitch: 0.92, rate: 1.03 },
  ceo: { pitch: 0.86, rate: 0.98 },
  athena: { pitch: 1.12, rate: 1.02 },
  sage: { pitch: 1.04, rate: 0.98 },
  vulcan: { pitch: 0.88, rate: 1.04 },
  nova: { pitch: 1.15, rate: 1.06 },
  iris: { pitch: 1.2, rate: 1.0 },
  aegis: { pitch: 0.9, rate: 0.97 },
  vera: { pitch: 1.1, rate: 1.02 },
  orion: { pitch: 0.95, rate: 1.01 }
};

function speakText(agentId, text, force = false) {
  if (!force && !state.voiceEnabled) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(String(text).slice(0, 320));
    const prof = VOICE_PROFILES[agentId] || VOICE_PROFILES.jarvis;
    utter.pitch = prof.pitch;
    utter.rate = prof.rate;
    window.speechSynthesis.speak(utter);
  } catch {
    // Ignore browser speech synthesis failures
  }
}

function toggleVoiceMode() {
  state.voiceEnabled = !state.voiceEnabled;
  if (!state.voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancel errors
    }
  }
  if (els.voiceToggleBtn) {
    els.voiceToggleBtn.textContent = state.voiceEnabled ? 'AI Voice: On' : 'AI Voice: Off';
    els.voiceToggleBtn.setAttribute('aria-pressed', String(state.voiceEnabled));
    els.voiceToggleBtn.classList.toggle('btn-voice-active', state.voiceEnabled);
  }
}

async function sendDirectChat(agentId, text) {
  if (!state.agentChats.has(agentId)) state.agentChats.set(agentId, []);
  const history = state.agentChats.get(agentId);
  const priorHistory = history.slice(-8);
  history.push({ role: 'user', sender: 'You', text, time: new Date().toISOString() });
  officeScene?.showPlayerSpeech?.(text, 4.5);
  state.typingAgentId = agentId;
  renderDeskInspector();

  const activity =
    agentId === 'jarvis'
      ? 'Command Core'
      : officeScene?.getActorActivityLabel(agentId) || 'On Campus';

  try {
    pushAgentLine(agentId, `> ${text}`);
    const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: priorHistory,
        activity,
        missionId: state.currentMission?.id,
        apiKey: state.sessionLlm.apiKey || undefined,
        baseUrl: state.sessionLlm.baseUrl || undefined,
        model: state.sessionLlm.model || undefined
      })
    });
    const data = await res.json();
    const replyText = res.ok ? data.reply : data.message || 'Unable to reply right now.';
    pushAgentLine(agentId, replyText.split('\n')[0], res.ok ? undefined : 'error');
    history.push({
      role: 'agent',
      sender: data.agentName || agentId,
      text: replyText,
      time: new Date().toISOString()
    });
    speakText(agentId, replyText, false);
    if (officeScene && agentId !== 'jarvis') {
      if (data.action?.moveTo) {
        officeScene.moveAgentTo(agentId, data.action.moveTo);
      }
      officeScene.showAgentSpeech(agentId, replyText.slice(0, 26), 5);
    }
  } catch {
    pushAgentLine(agentId, 'Connection error reaching this AI specialist.', 'error');
    history.push({
      role: 'agent',
      sender: agentId,
      text: 'Connection error reaching this AI specialist.',
      time: new Date().toISOString()
    });
  } finally {
    state.typingAgentId = null;
  }

  syncAgentStatuses();
  renderDeskInspector();
  renderErrorsPanel();
  renderOfficeDock();
  if (state.terminalAgentId === agentId && els.terminalDialog?.open) renderAgentTerminal();
}

function buildDirectChatSection(agentId, agentName, collaborators = []) {
  const wrap = createEl('div', 'agent-chat-box');
  wrap.appendChild(createEl('div', 'deliverable-meta', `Talk Directly to ${agentName} (Text or Voice)`));

  // Quick Campus Move / Workplace & Recreation Chips
  if (agentId !== 'jarvis') {
    const actionsBar = createEl('div', 'agent-actions-bar');
    actionsBar.appendChild(createEl('span', 'agent-actions-label', 'Send to:'));
    const zones = [
      { key: 'computer', label: 'Computer' },
      { key: 'boardroom', label: 'Boardroom' },
      { key: 'server', label: 'Server Vault' },
      { key: 'lobby', label: 'Lobby' },
      { key: 'pickleball', label: 'Pickleball' },
      { key: 'basketball', label: 'Basketball' },
      { key: 'swim', label: 'Swim Pool' },
      { key: 'gym', label: 'Gym' },
      { key: 'soccer', label: 'Soccer' },
      { key: 'pingpong', label: 'Ping-Pong' },
      { key: 'coffee', label: 'Coffee' },
      { key: 'bar', label: 'Drinks Bar' },
      { key: 'dance', label: 'Dance' }
    ];
    for (const z of zones) {
      const btn = createEl('button', 'chip-btn', z.label);
      btn.type = 'button';
      btn.addEventListener('click', () => {
        officeScene?.moveAgentTo(agentId, z.key);
        renderDeskInspector();
      });
      actionsBar.appendChild(btn);
    }
    wrap.appendChild(actionsBar);

    const teamTalkBar = createEl('div', 'agent-actions-bar');
    teamTalkBar.appendChild(createEl('span', 'agent-actions-label', 'Walk & Talk w/:'));
    for (const partnerId of collaborators.filter((cid) => cid !== 'jarvis')) {
      const partner = state.team.find((a) => a.id === partnerId);
      if (!partner) continue;
      const chip = createEl('button', 'chip-btn', partner.name);
      chip.type = 'button';
      chip.addEventListener('click', () => {
        officeScene?.moveAgentTo(agentId, `colleague:${partner.id}`);
        officeScene?.showAgentSpeech(agentId, `Syncing w/ ${partner.name}`, 4);
        renderDeskInspector();
      });
      teamTalkBar.appendChild(chip);
    }
    if (teamTalkBar.children.length > 1) {
      wrap.appendChild(teamTalkBar);
    }
  }

  const starters = createEl('div', 'agent-actions-bar');
  starters.appendChild(createEl('span', 'agent-actions-label', 'Ask:'));
  for (const promptText of ['What is on your computer?', 'Meet in boardroom', 'Go back to computer']) {
    const chip = createEl('button', 'chip-btn', promptText);
    chip.type = 'button';
    chip.addEventListener('click', () => sendDirectChat(agentId, promptText));
    starters.appendChild(chip);
  }
  wrap.appendChild(starters);

  const historyEl = createEl('div', 'agent-chat-history');
  const history = state.agentChats.get(agentId) || [];
  if (history.length === 0) {
    historyEl.appendChild(
      createEl(
        'div',
        'log-empty',
        `Talk officially with ${agentName} at their workstation. Ask for status, send them to the Boardroom/Server Vault, or talk to a teammate.`
      )
    );
  } else {
    for (const msg of history) {
      const bubble = createEl('div', `chat-bubble ${msg.role === 'user' ? 'user' : ''}`);
      const head = createEl('div', 'chat-bubble-head');
      head.appendChild(createEl('div', 'deliverable-meta', msg.sender));
      if (msg.role !== 'user') {
        const speakBtn = createEl('button', 'btn-speak-mini', 'Speak');
        speakBtn.type = 'button';
        speakBtn.title = `Listen to ${msg.sender}`;
        speakBtn.addEventListener('click', () => speakText(agentId, msg.text, true));
        head.appendChild(speakBtn);
      }
      bubble.appendChild(head);
      bubble.appendChild(createEl('div', '', msg.text));
      historyEl.appendChild(bubble);
    }
  }
  if (state.typingAgentId === agentId) {
    historyEl.appendChild(createEl('div', 'chat-bubble typing', `${agentName} is responding...`));
  }
  wrap.appendChild(historyEl);

  requestAnimationFrame(() => {
    historyEl.scrollTop = historyEl.scrollHeight;
  });

  const form = createEl('form', 'agent-chat-form');
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 1000;
  input.required = true;
  input.placeholder = `Talk to ${agentName} (e.g. "meet in boardroom", "talk to nova", "status")...`;
  input.setAttribute('aria-label', `Message ${agentName}`);

  const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (SpeechRec) {
    const micBtn = createEl(
      'button',
      `btn btn-secondary ${state.listeningAgentId === agentId ? 'btn-voice-active' : ''}`,
      state.listeningAgentId === agentId ? 'Listening...' : 'Mic'
    );
    micBtn.type = 'button';
    micBtn.title = `Speak to ${agentName} with microphone`;
    micBtn.addEventListener('click', () => {
      try {
        const rec = new SpeechRec();
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        state.listeningAgentId = agentId;
        renderDeskInspector();
        rec.onresult = (ev) => {
          const transcript = ev.results?.[0]?.[0]?.transcript?.trim();
          state.listeningAgentId = null;
          if (transcript) {
            sendDirectChat(agentId, transcript);
          } else {
            renderDeskInspector();
          }
        };
        rec.onerror = () => {
          state.listeningAgentId = null;
          renderDeskInspector();
        };
        rec.onend = () => {
          if (state.listeningAgentId === agentId) {
            state.listeningAgentId = null;
            renderDeskInspector();
          }
        };
        rec.start();
      } catch {
        state.listeningAgentId = null;
        renderDeskInspector();
      }
    });
    form.appendChild(input);
    form.appendChild(micBtn);
  } else {
    form.appendChild(input);
  }

  const sendBtn = createEl('button', 'btn btn-primary', 'Send');
  sendBtn.type = 'submit';
  form.appendChild(sendBtn);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    sendDirectChat(agentId, val);
  });

  wrap.appendChild(form);
  return wrap;
}

function buildSkillsAndCollabsBox(entity) {
  const box = createEl('div', 'skills-box');

  if (Array.isArray(entity.skills) && entity.skills.length > 0) {
    box.appendChild(createEl('div', 'deliverable-meta', 'Core Skills'));
    const skillRow = createEl('div', 'skill-badges');
    for (const sk of entity.skills) {
      const badge = createEl('span', 'skill-badge');
      badge.appendChild(document.createTextNode(sk.name));
      badge.appendChild(createEl('span', 'skill-level', sk.level));
      skillRow.appendChild(badge);
    }
    box.appendChild(skillRow);
  }

  if (Array.isArray(entity.collaboratesWith) && entity.collaboratesWith.length > 0) {
    box.appendChild(createEl('div', 'deliverable-meta', 'Teams Up With'));
    const collabRow = createEl('div', 'collab-chips');
    for (const partnerId of entity.collaboratesWith) {
      const partner = state.team.find((a) => a.id === partnerId);
      if (!partner) continue;
      const chip = createEl('button', 'chip-btn', `${partner.name} · ${partner.role}`);
      chip.type = 'button';
      chip.addEventListener('click', () => selectDesk(partner.id, true));
      collabRow.appendChild(chip);
    }
    box.appendChild(collabRow);
  }

  return box;
}

function renderDeskInspector() {
  clearElement(els.deskInspectorContent);
  const card = createEl('div', 'inspector-card');

  if (state.selectedDeskId === 'jarvis' && state.controller) {
    card.appendChild(createEl('h3', '', `${state.controller.name} — ${state.controller.title}`));
    card.appendChild(createEl('p', 'briefing-summary', state.controller.greeting));
    const meta = createEl('div', 'deliverable-item');
    meta.appendChild(createEl('div', 'deliverable-meta', 'Controller Model'));
    meta.appendChild(createEl('div', '', state.currentMission?.plannerModel || state.controller.model));
    card.appendChild(meta);
    card.appendChild(buildSkillsAndCollabsBox(state.controller));
    card.appendChild(buildDirectChatSection('jarvis', state.controller.name));
    els.deskInspectorContent.appendChild(card);
    return;
  }

  const agent = state.team.find((a) => a.id === state.selectedDeskId);
  if (!agent) return;

  const activity = officeScene ? officeScene.getActorActivityLabel(agent.id) : 'On Campus';
  card.appendChild(createEl('h3', '', `${agent.name} — ${agent.role}`));
  card.appendChild(createEl('p', 'briefing-summary', agent.bio));

  const modelCard = createEl('div', 'deliverable-item');
  const deptLabel = agent.departmentName ? `${agent.departmentName} · ` : '';
  modelCard.appendChild(
    createEl('div', 'deliverable-meta', `${deptLabel}Room: ${agent.zone} · Now: ${activity}`)
  );
  modelCard.appendChild(
    createEl('div', '', `Profile: ${agent.model} · HF Equivalent: ${agent.hfEquivalent}`)
  );
  card.appendChild(modelCard);

  const monitorBox = createEl('div', 'workstation-monitor');
  const monitorBar = createEl('div', 'workstation-monitor-bar');
  const roomTier = state.officeUpgrades?.rooms?.[agent.id] ?? 1;
  monitorBar.appendChild(createEl('span', '', `PC-${agent.id.toUpperCase()} · Dual/Triple Display`));
  monitorBar.appendChild(createEl('span', '', `Suite T${roomTier}/3 · Voice Comms Ready`));
  monitorBox.appendChild(monitorBar);
  const runningTask = (state.currentMission?.tasks ?? []).find(
    (t) => t.agentId === agent.id && t.status === 'running'
  );
  monitorBox.appendChild(
    createEl(
      'div',
      '',
      runningTask
        ? `> active_task: ${runningTask.title}`
        : `> session: ${activity} · model=${agent.model}`
    )
  );
  card.appendChild(monitorBox);

  card.appendChild(buildSkillsAndCollabsBox(agent));
  card.appendChild(buildDirectChatSection(agent.id, agent.name, agent.collaboratesWith || []));

  const agentTasks = (state.currentMission?.tasks ?? []).filter((t) => t.agentId === agent.id);
  if (agentTasks.length > 0) {
    for (const task of agentTasks) {
      const box = createEl('div', 'deliverable-item');
      box.appendChild(
        createEl(
          'div',
          'deliverable-meta',
          `Task #${task.id} · ${task.status.toUpperCase()} (${Math.round(task.selection.confidence * 100)}% match)`
        )
      );
      box.appendChild(createEl('strong', '', task.title));
      box.appendChild(createEl('p', 'briefing-summary', task.selection.rationale));
      if (task.output) {
        box.appendChild(createEl('p', 'briefing-summary', task.output.summary));
        const list = createEl('ul', 'deliverable-list');
        for (const item of task.output.deliverables) {
          list.appendChild(createEl('li', '', `• ${item}`));
        }
        box.appendChild(list);
      }
      card.appendChild(box);
    }
  }

  els.deskInspectorContent.appendChild(card);
}

function renderBriefing() {
  clearElement(els.briefingContent);
  const mission = state.currentMission;

  if (!mission) {
    els.briefingContent.className = 'empty-state';
    els.briefingContent.textContent =
      'Dispatch a mission above or click any AI character in the 3D campus (Office, Pickleball Court, Gym, Coffee Cafe, Arcade) to chat 1-on-1.';
    return;
  }

  els.briefingContent.className = 'briefing-card';

  if (mission.status === 'failed') {
    els.briefingContent.appendChild(createEl('h3', '', 'Mission Halted'));
    els.briefingContent.appendChild(
      createEl('p', 'field-error', mission.error || 'An error occurred during execution.')
    );
    return;
  }

  if (mission.status !== 'completed' || !mission.finalResponse) {
    els.briefingContent.appendChild(createEl('h3', '', 'Mission In Progress...'));
    els.briefingContent.appendChild(
      createEl(
        'p',
        'briefing-summary',
        `J.A.R.V.I.S. is coordinating ${mission.tasks.length || 'specialist'} tasks across the 3D office. Watch the team sprint from the campus to their computers.`
      )
    );
    return;
  }

  const final = mission.finalResponse;
  els.briefingContent.appendChild(createEl('h3', '', final.headline));
  if (mission.fallbackNotice) {
    const warn = createEl('div', 'deliverable-item');
    warn.appendChild(createEl('div', 'deliverable-meta', 'Engine Notice'));
    warn.appendChild(createEl('div', '', mission.fallbackNotice));
    els.briefingContent.appendChild(warn);
  }

  // Token Usage & Percentage Breakdown Card
  if (mission.tokenUsage) {
    const tu = mission.tokenUsage;
    const tokenCard = createEl('div', 'token-card');
    tokenCard.appendChild(
      createEl(
        'div',
        'deliverable-meta',
        `Token Usage (${tu.source.toUpperCase()}) · ${tu.totalTokens} tokens (${tu.budgetPercent}% of ${tu.budgetTokens} budget)`
      )
    );
    const budgetTrack = createEl('div', 'token-bar-track');
    const budgetFill = createEl('div', 'token-bar-fill');
    budgetFill.style.width = `${Math.min(100, tu.budgetPercent)}%`;
    budgetTrack.appendChild(budgetFill);
    tokenCard.appendChild(budgetTrack);
    tokenCard.appendChild(
      createEl(
        'div',
        'briefing-summary',
        `Prompt: ${tu.totalPromptTokens} tok · Completion: ${tu.totalCompletionTokens} tok · J.A.R.V.I.S. Planner: ${tu.plannerTokens} tok (${tu.plannerPercent}%)`
      )
    );

    for (const task of mission.tasks) {
      if (!task.tokenUsage) continue;
      const row = createEl('div', 'token-agent-row');
      const head = createEl('div', 'token-agent-head');
      head.appendChild(createEl('span', '', `#${task.id} ${task.selection.agentName} (${task.title})`));
      head.appendChild(
        createEl('span', '', `${task.tokenUsage.totalTokens} tok · ${task.tokenUsage.sharePercent}%`)
      );
      const track = createEl('div', 'token-bar-track');
      const fill = createEl('div', 'token-bar-fill');
      fill.style.width = `${Math.min(100, task.tokenUsage.sharePercent)}%`;
      track.appendChild(fill);
      row.appendChild(head);
      row.appendChild(track);
      tokenCard.appendChild(row);
    }
    els.briefingContent.appendChild(tokenCard);
  }

  // Saved Work Folder & Deliverable Files Browser
  if (mission.outputFolder && Array.isArray(mission.savedFiles) && mission.savedFiles.length > 0) {
    const folderCard = createEl('div', 'work-folder-card');
    folderCard.appendChild(
      createEl('div', 'deliverable-meta', `Saved Work Folder: ${mission.outputFolder}/`)
    );
    const filesRow = createEl('div', 'collab-chips');
    const previewPre = createEl('pre', 'artifact-preview', '');
    previewPre.hidden = true;

    for (const relFile of mission.savedFiles) {
      const btn = createEl('button', 'chip-btn', relFile);
      btn.type = 'button';
      btn.addEventListener('click', async () => {
        previewPre.hidden = false;
        previewPre.textContent = `Loading ${relFile}...`;
        try {
          const res = await fetch(
            `/api/missions/${encodeURIComponent(mission.id)}/files?file=${encodeURIComponent(relFile)}`
          );
          const data = await res.json();
          previewPre.textContent = res.ok ? data.content : data.message || 'Could not load file.';
        } catch {
          previewPre.textContent = 'Error reading saved file.';
        }
      });
      filesRow.appendChild(btn);
    }
    folderCard.appendChild(filesRow);
    folderCard.appendChild(previewPre);
    els.briefingContent.appendChild(folderCard);
  }

  els.briefingContent.appendChild(createEl('p', 'briefing-summary', final.summary));

  const list = createEl('ul', 'deliverable-list');
  for (const d of final.deliverables) {
    const li = createEl('li', 'deliverable-item');
    li.appendChild(createEl('div', 'deliverable-meta', `${d.agentName} · ${d.taskTitle}`));
    li.appendChild(createEl('div', '', d.item));
    list.appendChild(li);
  }
  els.briefingContent.appendChild(list);

  if (Array.isArray(final.guidedNextSteps) && final.guidedNextSteps.length > 0) {
    const guideBox = createEl('div', 'deliverable-item');
    guideBox.appendChild(createEl('div', 'deliverable-meta', 'J.A.R.V.I.S. Guided Next Steps'));
    for (const step of final.guidedNextSteps) {
      guideBox.appendChild(createEl('div', '', `→ ${step}`));
    }
    els.briefingContent.appendChild(guideBox);
  }
}

function renderDag() {
  clearElement(els.dagContent);
  const tasks = state.currentMission?.tasks ?? [];
  if (tasks.length === 0) {
    els.dagContent.className = 'empty-state';
    els.dagContent.textContent = 'No task dependency graph planned yet.';
    return;
  }

  els.dagContent.className = 'dag-card';
  for (const task of tasks) {
    const node = createEl('div', 'dag-node-card');
    const deps = task.dep.includes(-1) ? 'Root (Parallel)' : `Depends on #${task.dep.join(', #')}`;
    node.appendChild(
      createEl(
        'div',
        'deliverable-meta',
        `#${task.id} · ${task.selection.agentName} (${task.selection.model}) · ${task.status.toUpperCase()}`
      )
    );
    node.appendChild(createEl('strong', '', task.title));
    node.appendChild(createEl('div', 'briefing-summary', `${deps} · ${task.selection.rationale}`));
    els.dagContent.appendChild(node);
  }
}

function renderLogs() {
  clearElement(els.commsLogList);
  const logs = state.currentMission?.logs ?? [];
  const combined = [
    ...state.banterLogs,
    ...logs.map((entry) => ({
      timestamp: entry.timestamp,
      tag: entry.stage,
      message: entry.message
    }))
  ].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  if (combined.length === 0) {
    els.commsLogList.appendChild(createEl('li', 'log-empty', 'Waiting for AI chatter or mission telemetry...'));
    return;
  }

  for (const entry of combined.slice(0, 60)) {
    const li = createEl('li', 'log-entry');
    const time = entry.timestamp ? entry.timestamp.slice(11, 19) : '';
    li.appendChild(createEl('span', 'log-time', `[${time}] [${entry.tag}]`));
    li.appendChild(document.createTextNode(entry.message));
    els.commsLogList.appendChild(li);
  }
}

function updateGuideSpeechFromMission() {
  if (state.tourIndex >= 0) return;
  const mission = state.currentMission;
  if (!mission) return;

  if (mission.status === 'running') {
    const stageObj = state.stages.find((s) => s.id === mission.currentStage);
    els.guideStageTag.textContent = stageObj ? `Stage ${stageObj.order}: ${stageObj.name}` : 'Active';
    els.jarvisSpeech.textContent = stageObj?.description || 'Orchestrating team...';
    els.officeActivityBadge.textContent = 'Executing Mission';
  } else if (mission.status === 'completed') {
    els.guideStageTag.textContent = 'Mission Complete';
    els.jarvisSpeech.textContent =
      'All specialists have reported in. Your briefing is ready—and the team is free to hit the Pickleball court, Gym, or Coffee Cafe. Click any AI to chat 1-on-1!';
    els.officeActivityBadge.textContent = 'Complete';
  } else if (mission.status === 'failed') {
    els.guideStageTag.textContent = 'Halted';
    els.jarvisSpeech.textContent = `A fault occurred: ${mission.error}`;
    els.officeActivityBadge.textContent = 'Error';
  }
}

function renderAll() {
  ingestMissionTelemetry();
  syncAgentStatuses();
  renderPipeline();
  renderOfficeFloor();
  renderDeskInspector();
  renderErrorsPanel();
  renderCeoStudio();
  renderBriefing();
  renderDag();
  renderLogs();
  updateGuideSpeechFromMission();
  if (els.terminalDialog?.open) renderAgentTerminal();
}

function toggleCeoOfficeFocus(forceState = null) {
  state.ceoFocus = forceState !== null ? forceState : !state.ceoFocus;
  state.activeDepartmentId = state.ceoFocus ? 'executive' : null;
  officeScene?.focusCeoOffice(state.ceoFocus);
  if (els.camCeoFocus) {
    els.camCeoFocus.classList.toggle('active-chip', state.ceoFocus);
    els.camCeoFocus.textContent = state.ceoFocus ? 'Exit CEO Office' : 'Enter CEO Office';
  }
  renderDepartmentCamBar();
  if (state.ceoFocus) {
    selectDesk('ceo', false);
    switchTab('tab-ceo-studio');
  }
  renderCeoStudio();
}

function updateTourUi() {
  if (state.tourIndex < 0 || state.tourSteps.length === 0) {
    els.tourControls.hidden = true;
    els.guideStageTag.textContent = state.currentMission ? els.guideStageTag.textContent : 'Standing By';
    if (!state.currentMission && state.controller) {
      els.jarvisSpeech.textContent = state.controller.greeting;
    }
    renderOfficeFloor();
    return;
  }

  const step = state.tourSteps[state.tourIndex];
  els.tourControls.hidden = false;
  els.tourProgress.textContent = `Tour Step ${state.tourIndex + 1} of ${state.tourSteps.length}`;
  els.guideStageTag.textContent = step.title;
  els.jarvisSpeech.textContent = step.message;
  els.tourPrev.disabled = state.tourIndex === 0;
  els.tourNext.textContent = state.tourIndex === state.tourSteps.length - 1 ? 'Finish Tour' : 'Next Step';
  renderOfficeFloor();
}

function subscribeToMission(streamUrl, missionId) {
  if (state.activeSource) {
    state.activeSource.close();
    state.activeSource = null;
  }

  const source = new EventSource(streamUrl);
  state.activeSource = source;

  const refreshFromServer = async () => {
    const res = await fetch(`/api/missions/${missionId}`);
    if (res.ok) {
      state.currentMission = await res.json();
      renderAll();
    }
  };

  source.addEventListener('snapshot', (ev) => {
    state.currentMission = JSON.parse(ev.data);
    renderAll();
  });

  for (const eventName of ['stage', 'plan', 'task', 'log']) {
    source.addEventListener(eventName, () => {
      refreshFromServer().catch(() => { });
    });
  }

  source.addEventListener('completed', async () => {
    await refreshFromServer();
    els.dispatchBtn.disabled = false;
    source.close();
    state.activeSource = null;
  });

  source.addEventListener('error', async () => {
    await refreshFromServer().catch(() => { });
    els.dispatchBtn.disabled = false;
    source.close();
    state.activeSource = null;
  });
}

async function dispatchDroppedTask(targetId, rawPrompt) {
  const prompt = typeof rawPrompt === 'string' ? rawPrompt.trim() : '';
  if (!prompt) {
    els.missionError.textContent = 'Type a task or drag one of the preset task chips onto an AI.';
    els.missionError.hidden = false;
    els.dragTaskInput?.focus();
    return;
  }

  els.missionError.hidden = true;
  els.missionPrompt.value = prompt;
  els.dispatchBtn.disabled = true;

  const isTeamDrop = targetId === 'jarvis';
  if (!isTeamDrop && officeScene) {
    officeScene.moveAgentTo(targetId, 'computer');
    officeScene.showAgentSpeech(targetId, `Task: ${prompt.slice(0, 20)}`, 5);
  }
  selectDesk(targetId, false);

  try {
    const res = await fetch('/api/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        agents: isTeamDrop ? undefined : [targetId],
        directTask: !isTeamDrop,
        apiKey: state.sessionLlm.apiKey || undefined,
        baseUrl: state.sessionLlm.baseUrl || undefined,
        model: state.sessionLlm.model || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      els.missionError.textContent = data.message || 'Failed to assign dropped task.';
      els.missionError.hidden = false;
      els.dispatchBtn.disabled = false;
      return;
    }

    switchTab('tab-briefing');
    subscribeToMission(data.streamUrl, data.missionId);
  } catch {
    els.missionError.textContent = 'Network error while assigning dropped task.';
    els.missionError.hidden = false;
    els.dispatchBtn.disabled = false;
  }
}

function setupDragAndDropTasks() {
  if (els.draggableTaskCard) {
    els.draggableTaskCard.addEventListener('dragstart', (ev) => {
      const prompt =
        els.dragTaskInput?.value.trim() ||
        els.missionPrompt.value.trim() ||
        'Design and build a focused deliverable for the CEO';
      state.draggedTaskPrompt = prompt;
      if (ev.dataTransfer) {
        ev.dataTransfer.effectAllowed = 'copy';
        ev.dataTransfer.setData('text/plain', prompt);
      }
      els.draggableTaskCard.classList.add('dragging');
    });

    els.draggableTaskCard.addEventListener('dragend', () => {
      state.draggedTaskPrompt = '';
      els.draggableTaskCard.classList.remove('dragging');
      els.officeFloor?.classList.remove('drag-over');
      officeScene?.clearDragHover();
    });
  }

  for (const chip of document.querySelectorAll('.drag-task-chip')) {
    chip.addEventListener('dragstart', (ev) => {
      const prompt = chip.getAttribute('data-task-prompt') || chip.textContent || '';
      state.draggedTaskPrompt = prompt;
      if (ev.dataTransfer) {
        ev.dataTransfer.effectAllowed = 'copy';
        ev.dataTransfer.setData('text/plain', prompt);
      }
      chip.classList.add('dragging');
    });

    chip.addEventListener('dragend', () => {
      state.draggedTaskPrompt = '';
      chip.classList.remove('dragging');
      els.officeFloor?.classList.remove('drag-over');
      officeScene?.clearDragHover();
    });

    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-task-prompt') || '';
      if (els.dragTaskInput) els.dragTaskInput.value = prompt;
      els.missionPrompt.value = prompt;
    });
  }

  if (els.officeCanvas) {
    els.officeCanvas.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
      els.officeFloor?.classList.add('drag-over');
      if (officeScene) {
        const pt = officeScene.toLogicalPoint(ev);
        officeScene.setDragHoverLogical(pt.x, pt.y);
      }
    });

    els.officeCanvas.addEventListener('dragleave', () => {
      els.officeFloor?.classList.remove('drag-over');
      officeScene?.clearDragHover();
    });

    els.officeCanvas.addEventListener('drop', (ev) => {
      ev.preventDefault();
      els.officeFloor?.classList.remove('drag-over');
      const targetId = officeScene
        ? officeScene.getDropTargetAt(
          officeScene.toLogicalPoint(ev).x,
          officeScene.toLogicalPoint(ev).y
        ) || 'jarvis'
        : 'jarvis';
      officeScene?.clearDragHover();
      const taskText =
        state.draggedTaskPrompt || ev.dataTransfer?.getData('text/plain')?.trim() || '';
      dispatchDroppedTask(targetId, taskText);
    });
  }
}

async function init() {
  const sceneOptions = {
    onSelectAgent: (id) => {
      if (typeof id === 'string' && id.startsWith('room:')) {
        const roomId = id.slice(5);
        const currentTier = state.officeUpgrades?.rooms?.[roomId] ?? 0;
        switchTab('tab-ceo-studio');
        if (currentTier === 0) {
          saveOfficeUpgrade({ rooms: { [roomId]: 1 } });
        }
        return;
      }
      selectDesk(id, true);
    },
    onStatusChange: () => renderOfficeDock(),
    onBanter: ({ speakerId, text, zone }) => {
      const name =
        speakerId === 'jarvis'
          ? 'J.A.R.V.I.S.'
          : state.team.find((a) => a.id === speakerId)?.name || speakerId;
      state.banterLogs.push({
        timestamp: new Date().toISOString(),
        tag: `chatter:${zone}`,
        message: `${name}: "${text}"`
      });
      if (state.banterLogs.length > 30) state.banterLogs.shift();
      renderLogs();
    },
    onPlayerProximity: (agentId) => setPlayerPrompt(agentId),
    onPlayerInteract: (agentId) => {
      selectDesk(agentId, true);
      requestAnimationFrame(() => {
        els.deskInspectorContent?.querySelector('.agent-chat-form input')?.focus();
      });
    },
    onOpenTerminal: (agentId) => openAgentTerminal(agentId),
    onBossToggle: () => els.join3dBtn?.click(),
    onCinemaChange: (active) => {
      if (els.camCinema) {
        els.camCinema.classList.toggle('active-chip', Boolean(active));
        els.camCinema.textContent = active ? 'Cinema: On (C)' : 'Cinema (C)';
      }
    },
    onSkyUpdate: (info) => updateSkyBarUi(info),
    onPlayerLeave: () => updatePlayerUi()
  };

  officeScene = await createOfficeScene(sceneOptions);
  if (officeScene?.joinAsPlayer && els.join3dBtn) {
    els.join3dBtn.hidden = false;
  }
  if (officeScene?.toggleCinemaMode && els.camCinema) {
    els.camCinema.hidden = false;
  }
  if (officeScene?.getSkyInfo?.()) {
    updateSkyBarUi(officeScene.getSkyInfo());
  }
  if (officeScene?.setQuality && els.camQuality) {
    const q = officeScene.getQuality();
    els.camQuality.hidden = false;
    els.camQuality.textContent = `Quality: ${q.charAt(0).toUpperCase()}${q.slice(1)}`;
  }

  setInterval(() => {
    if (state.tracker.tick()) {
      syncAgentStatuses();
      renderErrorsPanel();
      renderOfficeDock();
    }
  }, 10000);

  const [healthRes, teamRes, guideRes, upgradesRes] = await Promise.all([
    fetch('/api/health'),
    fetch('/api/team'),
    fetch('/api/guide'),
    fetch('/api/office/upgrades')
  ]);

  const health = await healthRes.json();
  const teamData = await teamRes.json();
  const guideData = await guideRes.json();
  state.officeUpgrades = upgradesRes.ok ? await upgradesRes.json() : null;
  if (state.officeUpgrades?.uiTheme) {
    applyUiTheme(state.officeUpgrades.uiTheme);
  }

  state.controller = teamData.controller;
  state.team = teamData.team;
  state.departments = teamData.departments || [];
  state.stages = teamData.stages;
  state.tourSteps = guideData.tourSteps;
  state.presets = guideData.presets;

  updateModePill(health.llmConfigured);
  els.jarvisSpeech.textContent = state.controller.greeting;
  renderDepartmentCamBar();
  renderPresets();
  renderAgentFilters();
  renderAll();
  setupDragAndDropTasks();
}

// 3D Camera Controls
els.camCeoFocus.addEventListener('click', () => toggleCeoOfficeFocus());
els.voiceToggleBtn?.addEventListener('click', () => toggleVoiceMode());
els.camRotLeft.addEventListener('click', () => officeScene?.rotateCamera(-Math.PI / 6));
els.camRotRight.addEventListener('click', () => officeScene?.rotateCamera(Math.PI / 6));
els.camZoomIn.addEventListener('click', () => officeScene?.adjustZoom(0.14));
els.camZoomOut.addEventListener('click', () => officeScene?.adjustZoom(-0.14));
els.camReset.addEventListener('click', () => focusDepartmentView(null));
els.camQuality?.addEventListener('click', () => {
  if (!officeScene?.setQuality) return;
  const order = ['high', 'balanced', 'performance'];
  const next = order[(order.indexOf(officeScene.getQuality()) + 1) % order.length];
  officeScene.setQuality(next);
  els.camQuality.textContent = `Quality: ${next.charAt(0).toUpperCase()}${next.slice(1)}`;
});
els.camFullscreen?.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    els.officeFloor?.requestFullscreen?.().catch(() => { });
  } else {
    document.exitFullscreen?.().catch(() => { });
  }
});
document.addEventListener('fullscreenchange', () => {
  if (!els.camFullscreen) return;
  const active = document.fullscreenElement === els.officeFloor;
  els.camFullscreen.textContent = active ? 'Exit Fullscreen' : 'Fullscreen';
  els.camFullscreen.classList.toggle('active-chip', active);
});

els.camCinema?.addEventListener('click', () => {
  officeScene?.toggleCinemaMode?.();
});

els.incidentBanner?.addEventListener('click', () => {
  const aid = els.incidentBanner.dataset.agentId;
  if (aid) openAgentTerminal(aid);
});

els.skyBar?.addEventListener('click', (ev) => {
  const btn = ev.target.closest?.('.sky-btn');
  if (btn && btn.dataset.sky) {
    officeScene?.setSkyMode?.(btn.dataset.sky);
  }
});

els.skyTimeSlider?.addEventListener('input', () => {
  officeScene?.setSkyTimeMinutes?.(Number(els.skyTimeSlider.value));
});

els.skyNowBtn?.addEventListener('click', () => {
  officeScene?.setSkyTimeMinutes?.(null);
});

els.terminalClose?.addEventListener('click', () => els.terminalDialog?.close());
els.terminalChatBtn?.addEventListener('click', () => {
  const aid = state.terminalAgentId;
  els.terminalDialog?.close();
  if (aid) selectDesk(aid, true);
});
els.terminalCmdForm?.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const val = els.terminalCmdInput?.value.trim();
  const aid = state.terminalAgentId;
  if (!val || !aid) return;
  els.terminalCmdInput.value = '';
  sendDirectChat(aid, val);
});

// Join the 3D office as a player avatar
els.join3dBtn?.addEventListener('click', () => {
  if (!officeScene?.joinAsPlayer) return;
  if (officeScene.isPlayerActive()) {
    officeScene.leavePlayer(false);
    updatePlayerUi();
    return;
  }
  openJoinDialog();
});

els.joinCancel?.addEventListener('click', () => els.joinDialog?.close());
els.joinName?.addEventListener('input', updateJoinPreview);
els.joinSwatches?.addEventListener('change', updateJoinPreview);

els.joinForm?.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const profile = readJoinForm();
  try {
    window.localStorage?.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
  els.joinDialog?.close();
  state.activeDepartmentId = null;
  state.ceoFocus = false;
  renderDepartmentCamBar();
  officeScene?.joinAsPlayer(profile);
  updatePlayerUi();
  els.officeFloor?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Tabs
for (const tabBtn of document.querySelectorAll('[role="tab"]')) {
  tabBtn.addEventListener('click', () => switchTab(tabBtn.id));
}

els.tourBtn.addEventListener('click', () => {
  state.tourIndex = 0;
  updateTourUi();
});

els.tourPrev.addEventListener('click', () => {
  if (state.tourIndex > 0) {
    state.tourIndex -= 1;
    updateTourUi();
  }
});

els.tourNext.addEventListener('click', () => {
  if (state.tourIndex < state.tourSteps.length - 1) {
    state.tourIndex += 1;
    updateTourUi();
  } else {
    state.tourIndex = -1;
    updateTourUi();
  }
});

els.tourClose.addEventListener('click', () => {
  state.tourIndex = -1;
  updateTourUi();
});

els.guideAskForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const question = els.guideQuestionInput.value.trim();
  if (!question) return;

  els.guideAnswerBox.hidden = false;
  els.guideAnswerBox.textContent = 'J.A.R.V.I.S. is formulating guidance...';

  try {
    const res = await fetch('/api/guide/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    if (!res.ok) {
      els.guideAnswerBox.textContent = data.message || 'Unable to process question.';
      return;
    }
    els.guideAnswerBox.textContent = data.reply;
    els.guideQuestionInput.value = '';
  } catch {
    els.guideAnswerBox.textContent = 'Connection error while contacting J.A.R.V.I.S.';
  }
});

els.missionForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const prompt = els.missionPrompt.value.trim();
  if (!prompt) {
    els.missionError.textContent = 'Please enter a mission directive for the AI team.';
    els.missionError.hidden = false;
    els.missionPrompt.focus();
    return;
  }

  els.missionError.hidden = true;
  els.dispatchBtn.disabled = true;
  state.tourIndex = -1;
  updateTourUi();

  const selectedAgents = [...els.agentCheckboxes.querySelectorAll('input[type="checkbox"]:checked')].map(
    (box) => box.value
  );

  try {
    const res = await fetch('/api/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        agents: selectedAgents.length > 0 ? selectedAgents : undefined,
        apiKey: state.sessionLlm.apiKey || undefined,
        baseUrl: state.sessionLlm.baseUrl || undefined,
        model: state.sessionLlm.model || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      els.missionError.textContent = data.message || 'Failed to dispatch mission.';
      els.missionError.hidden = false;
      els.dispatchBtn.disabled = false;
      return;
    }

    switchTab('tab-briefing');
    subscribeToMission(data.streamUrl, data.missionId);
  } catch {
    els.missionError.textContent = 'Network error while dispatching mission.';
    els.missionError.hidden = false;
    els.dispatchBtn.disabled = false;
  }
});

// Settings dialog
els.settingsBtn.addEventListener('click', () => {
  els.settingApiKey.value = state.sessionLlm.apiKey;
  els.settingBaseUrl.value = state.sessionLlm.baseUrl;
  els.settingModel.value = state.sessionLlm.model;
  els.settingsDialog.showModal();
});

els.settingsCloseX.addEventListener('click', () => {
  els.settingsDialog.close();
});

els.settingsClear.addEventListener('click', () => {
  state.sessionLlm = { apiKey: '', baseUrl: '', model: '' };
  els.settingApiKey.value = '';
  els.settingBaseUrl.value = '';
  els.settingModel.value = '';
  updateModePill(false);
  els.settingsDialog.close();
});

els.settingsForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  state.sessionLlm = {
    apiKey: els.settingApiKey.value.trim(),
    baseUrl: els.settingBaseUrl.value.trim(),
    model: els.settingModel.value.trim()
  };
  updateModePill(Boolean(state.sessionLlm.apiKey || state.sessionLlm.baseUrl));
  els.settingsDialog.close();
});

els.presetGeminiPro?.addEventListener('click', () => {
  els.settingBaseUrl.value = 'https://generativelanguage.googleapis.com/v1beta/openai';
  els.settingModel.value = 'gemini-2.5-pro';
  els.settingApiKey.focus();
});

els.presetGeminiFlash?.addEventListener('click', () => {
  els.settingBaseUrl.value = 'https://generativelanguage.googleapis.com/v1beta/openai';
  els.settingModel.value = 'gemini-2.5-flash';
  els.settingApiKey.focus();
});

els.presetOllamaQwen.addEventListener('click', () => {
  els.settingApiKey.value = '';
  els.settingBaseUrl.value = 'http://127.0.0.1:11434/v1';
  els.settingModel.value = 'qwen2.5:7b';
});

els.presetLmStudioQwen.addEventListener('click', () => {
  els.settingApiKey.value = '';
  els.settingBaseUrl.value = 'http://127.0.0.1:1234/v1';
  els.settingModel.value = 'qwen2.5-7b-instruct';
});

els.detectLocalLlm.addEventListener('click', async () => {
  els.localLlmStatus.hidden = false;
  els.localLlmStatus.textContent = 'Scanning localhost ports 11434 (Ollama) and 1234 (LM Studio)...';
  try {
    const res = await fetch('/api/llm/local');
    const info = await res.json();
    const parts = [];
    if (info.ollama?.running) {
      parts.push(
        `Ollama running (${info.ollama.models.length ? info.ollama.models.join(', ') : 'no models pulled yet'})`
      );
      if (info.ollama.models.length > 0) {
        els.settingBaseUrl.value = info.ollama.baseUrl;
        els.settingModel.value = info.ollama.models[0];
      }
    } else {
      parts.push('Ollama not detected on port 11434');
    }

    if (info.lmStudio?.running) {
      parts.push(
        `LM Studio running (${info.lmStudio.models.length ? info.lmStudio.models.join(', ') : 'no model loaded'})`
      );
    } else {
      parts.push('LM Studio not detected on port 1234');
    }

    if (!info.ollama?.running && !info.lmStudio?.running) {
      parts.push('Install Ollama (ollama.com) and run: ollama pull qwen2.5:7b');
    }
    els.localLlmStatus.textContent = parts.join(' · ');
  } catch {
    els.localLlmStatus.textContent = 'Could not check local LLM ports.';
  }
});

init().catch(() => {
  els.jarvisSpeech.textContent = 'Unable to connect to the J.A.R.V.I.S. office server.';
});
