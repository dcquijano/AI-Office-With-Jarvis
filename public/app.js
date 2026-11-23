import { Office3DScene } from './office3d.js';

const state = {
  team: [],
  controller: null,
  stages: [],
  tourSteps: [],
  presets: [],
  tourIndex: -1,
  selectedDeskId: 'jarvis',
  ceoFocus: false,
  officeUpgrades: null,
  draggedTaskPrompt: '',
  currentMission: null,
  activeSource: null,
  agentChats: new Map(),
  typingAgentId: null,
  banterLogs: [],
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

function renderOfficeDock() {
  clearElement(els.officeDock);

  const jarvisStatus =
    state.currentMission?.status === 'running'
      ? 'Orchestrating'
      : state.currentMission?.status === 'completed'
        ? 'Briefing Ready'
        : '3D Core Ready';

  const entries = [
    { id: 'jarvis', name: 'J.A.R.V.I.S.', accent: '#38bdf8', status: jarvisStatus },
    ...state.team.map((agent) => ({
      id: agent.id,
      name: agent.name,
      accent: agent.accent,
      status: officeScene ? officeScene.getActorActivityLabel(agent.id) : 'On Campus'
    }))
  ];

  for (const item of entries) {
    const btn = createEl('button', `dock-btn ${state.selectedDeskId === item.id ? 'selected' : ''}`);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(state.selectedDeskId === item.id));

    const head = createEl('span', 'dock-btn-head');
    const dot = createEl('span', 'dock-dot');
    dot.style.setProperty('--dot-color', item.accent);
    head.appendChild(dot);
    head.appendChild(document.createTextNode(item.name));

    btn.appendChild(head);
    btn.appendChild(createEl('span', 'dock-btn-status', item.status));
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

function renderCeoStudio() {
  if (!els.ceoStudioContent) return;
  clearElement(els.ceoStudioContent);
  const u = state.officeUpgrades;
  if (!u) {
    els.ceoStudioContent.appendChild(createEl('div', 'empty-state', 'Loading CEO Office Studio...'));
    return;
  }

  const wrap = createEl('div', 'studio-grid');

  const headerCard = createEl('div', 'studio-module-card');
  headerCard.appendChild(
    createEl(
      'div',
      'deliverable-meta',
      `CEO Executive Suite · Level ${u.officeLevel} / ${u.maxLevel}`
    )
  );
  headerCard.appendChild(
    createEl(
      'div',
      'briefing-summary',
      'Upgrade the 3D interior inside the CEO Office (next to J.A.R.V.I.S. AI Brain) and customize the live HUD UI theme.'
    )
  );
  const viewRow = createEl('div', 'studio-tier-row');
  const enterBtn = createEl(
    'button',
    `chip-btn ${state.ceoFocus ? 'active-chip' : ''}`,
    state.ceoFocus ? 'Exit CEO Office (Full Campus)' : 'Enter CEO Office (3D Zoom)'
  );
  enterBtn.type = 'button';
  enterBtn.addEventListener('click', () => toggleCeoOfficeFocus());
  viewRow.appendChild(enterBtn);
  headerCard.appendChild(viewRow);
  wrap.appendChild(headerCard);

  // UI Theme Switcher
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

  // Upgradable 3D Modules inside CEO Office
  for (const modKey of ['deskTier', 'brainLinkTier', 'decorTier']) {
    const mod = u.modules?.[modKey];
    if (!mod) continue;
    const currentTier = u[modKey];
    const activeTierObj = mod.tiers.find((t) => t.tier === currentTier) || mod.tiers[0];

    const card = createEl('div', 'studio-module-card');
    card.appendChild(
      createEl('div', 'deliverable-meta', `${mod.label} · Tier ${currentTier}/3`)
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

async function sendDirectChat(agentId, text) {
  if (!state.agentChats.has(agentId)) state.agentChats.set(agentId, []);
  const history = state.agentChats.get(agentId);
  const priorHistory = history.slice(-8);
  history.push({ role: 'user', sender: 'You', text, time: new Date().toISOString() });
  state.typingAgentId = agentId;
  renderDeskInspector();

  const activity =
    agentId === 'jarvis'
      ? 'Command Core'
      : officeScene?.getActorActivityLabel(agentId) || 'On Campus';

  try {
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
    history.push({
      role: 'agent',
      sender: data.agentName || agentId,
      text: replyText,
      time: new Date().toISOString()
    });
    if (officeScene && agentId !== 'jarvis') {
      if (data.action?.moveTo) {
        officeScene.moveAgentTo(agentId, data.action.moveTo);
      }
      officeScene.showAgentSpeech(agentId, replyText.slice(0, 26), 5);
    }
  } catch {
    history.push({
      role: 'agent',
      sender: agentId,
      text: 'Connection error reaching this AI specialist.',
      time: new Date().toISOString()
    });
  } finally {
    state.typingAgentId = null;
  }

  renderDeskInspector();
  renderOfficeDock();
}

function buildDirectChatSection(agentId, agentName) {
  const wrap = createEl('div', 'agent-chat-box');
  wrap.appendChild(createEl('div', 'deliverable-meta', `Talk Directly to ${agentName} (1-on-1)`));

  // Quick Campus Move / Starter Chips
  if (agentId !== 'jarvis') {
    const actionsBar = createEl('div', 'agent-actions-bar');
    actionsBar.appendChild(createEl('span', 'agent-actions-label', 'Send to:'));
    const zones = [
      { key: 'computer', label: 'Computer' },
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
  }

  const starters = createEl('div', 'agent-actions-bar');
  starters.appendChild(createEl('span', 'agent-actions-label', 'Ask:'));
  for (const promptText of ['What are your skills?', 'Go swim laps', 'Shoot basketball']) {
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
        `Chat naturally with ${agentName}. Ask about their work, or tell them to play pickleball, hit the gym, or head back to their computer.`
      )
    );
  } else {
    for (const msg of history) {
      const bubble = createEl('div', `chat-bubble ${msg.role === 'user' ? 'user' : ''}`);
      bubble.appendChild(createEl('div', 'deliverable-meta', msg.sender));
      bubble.appendChild(createEl('div', '', msg.text));
      historyEl.appendChild(bubble);
    }
  }
  if (state.typingAgentId === agentId) {
    historyEl.appendChild(createEl('div', 'chat-bubble typing', `${agentName} is thinking...`));
  }
  wrap.appendChild(historyEl);

  // Auto-scroll chat history to newest message
  requestAnimationFrame(() => {
    historyEl.scrollTop = historyEl.scrollHeight;
  });

  const form = createEl('form', 'agent-chat-form');
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 1000;
  input.required = true;
  input.placeholder = `Message ${agentName} (e.g. "hi", "go play pickleball", "review our API")...`;
  input.setAttribute('aria-label', `Message ${agentName}`);

  const sendBtn = createEl('button', 'btn btn-primary', 'Send');
  sendBtn.type = 'submit';

  form.appendChild(input);
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
  modelCard.appendChild(createEl('div', 'deliverable-meta', `Zone: ${agent.zone} · Now: ${activity}`));
  modelCard.appendChild(
    createEl('div', '', `Profile: ${agent.model} · HF Equivalent: ${agent.hfEquivalent}`)
  );
  card.appendChild(modelCard);

  card.appendChild(buildSkillsAndCollabsBox(agent));
  card.appendChild(buildDirectChatSection(agent.id, agent.name));

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
  renderPipeline();
  renderOfficeFloor();
  renderDeskInspector();
  renderCeoStudio();
  renderBriefing();
  renderDag();
  renderLogs();
  updateGuideSpeechFromMission();
}

function toggleCeoOfficeFocus(forceState = null) {
  state.ceoFocus = forceState !== null ? forceState : !state.ceoFocus;
  officeScene?.focusCeoOffice(state.ceoFocus);
  if (els.camCeoFocus) {
    els.camCeoFocus.classList.toggle('active-chip', state.ceoFocus);
    els.camCeoFocus.textContent = state.ceoFocus ? 'Exit CEO Office' : 'Enter CEO Office';
  }
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
      refreshFromServer().catch(() => {});
    });
  }

  source.addEventListener('completed', async () => {
    await refreshFromServer();
    els.dispatchBtn.disabled = false;
    source.close();
    state.activeSource = null;
  });

  source.addEventListener('error', async () => {
    await refreshFromServer().catch(() => {});
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
  officeScene = new Office3DScene(els.officeCanvas, {
    onSelectAgent: (id) => selectDesk(id, true),
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
    }
  });

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
  state.stages = teamData.stages;
  state.tourSteps = guideData.tourSteps;
  state.presets = guideData.presets;

  updateModePill(health.llmConfigured);
  els.jarvisSpeech.textContent = state.controller.greeting;
  renderPresets();
  renderAgentFilters();
  renderAll();
  setupDragAndDropTasks();
}

// 3D Camera Controls
els.camCeoFocus.addEventListener('click', () => toggleCeoOfficeFocus());
els.camRotLeft.addEventListener('click', () => officeScene?.rotateCamera(-Math.PI / 6));
els.camRotRight.addEventListener('click', () => officeScene?.rotateCamera(Math.PI / 6));
els.camZoomIn.addEventListener('click', () => officeScene?.adjustZoom(0.14));
els.camZoomOut.addEventListener('click', () => officeScene?.adjustZoom(-0.14));
els.camReset.addEventListener('click', () => {
  state.ceoFocus = false;
  els.camCeoFocus.classList.remove('active-chip');
  els.camCeoFocus.textContent = 'Enter CEO Office';
  officeScene?.resetCamera();
  renderCeoStudio();
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
