import assert from 'node:assert/strict';
import test from 'node:test';
import { chatWithAgent } from '../src/jarvis/agentChat.js';
import { runMissionPipeline } from '../src/jarvis/executor.js';
import { answerAsJarvis } from '../src/jarvis/guide.js';
import { planMission, selectBestAgent, validateTaskGraph } from '../src/jarvis/planner.js';
import { resolveLlmEndpoint } from '../src/jarvis/tokens.js';

test('validateTaskGraph accepts a valid acyclic DAG', () => {
  const valid = validateTaskGraph([
    { id: 0, title: 'Scope', dep: [-1] },
    { id: 1, title: 'Research', dep: [-1] },
    { id: 2, title: 'Build', dep: [0, 1] }
  ]);
  assert.equal(valid, true);
});

test('validateTaskGraph rejects cycles and invalid dependencies', () => {
  assert.throws(
    () =>
      validateTaskGraph([
        { id: 0, title: 'A', dep: [1] },
        { id: 1, title: 'B', dep: [0] }
      ]),
    /cycle/i
  );

  assert.throws(
    () => validateTaskGraph([{ id: 0, title: 'A', dep: [99] }]),
    /unknown task/i
  );

  assert.throws(
    () => validateTaskGraph([{ id: 0, title: 'A', dep: [0] }]),
    /itself/i
  );
});

test('selectBestAgent routes tasks to matching office specialists', () => {
  const coder = selectBestAgent('coding', 'Refactor backend API and database query');
  assert.equal(coder.agentId, 'vulcan');

  const designer = selectBestAgent('design', 'Design landing page UI wireframes');
  assert.equal(designer.agentId, 'iris');

  const webdev = selectBestAgent('webdev', 'Build React HTML CSS frontend website');
  assert.equal(webdev.agentId, 'nova');

  const sec = selectBestAgent('security', 'Audit SSRF XSS and auth vulnerability');
  assert.equal(sec.agentId, 'aegis');

  const qa = selectBestAgent('qa', 'Write E2E regression tests and edge cases');
  assert.equal(qa.agentId, 'vera');

  const exec = selectBestAgent('executive', 'CEO executive vision and company approval');
  assert.equal(exec.agentId, 'ceo');

  const filtered = selectBestAgent('coding', 'Write API code', ['sage']);
  assert.equal(filtered.agentId, 'sage');
});

test('planMission rejects empty prompts and builds local DAGs', async () => {
  await assert.rejects(() => planMission('   '), /required/i);

  const plan = await planMission('Build a secure Node.js API and dashboard UI', {
    useExternalLlm: false
  });
  assert.equal(plan.mode, 'local-jarvis');
  assert.ok(plan.tasks.length >= 4);
  assert.equal(validateTaskGraph(plan.tasks), true);
});

test('runMissionPipeline completes all 4 stages and generates briefing', async () => {
  const events = [];
  const mission = {
    id: 'msn_test_1',
    prompt: 'Create a launch plan and API spec for an AI office app',
    status: 'queued',
    currentStage: 'task-planning',
    tasks: [],
    logs: [],
    finalResponse: null
  };

  await runMissionPipeline(
    mission,
    (name, data) => events.push({ name, data }),
    { stepDelayMs: 0, useExternalLlm: false }
  );

  assert.equal(mission.status, 'completed');
  assert.equal(mission.currentStage, 'response-generation');
  assert.ok(mission.tasks.every((t) => t.status === 'completed' && t.output && t.tokenUsage));
  assert.ok(mission.tokenUsage.totalTokens > 0);
  assert.ok(mission.tokenUsage.budgetPercent > 0);
  assert.ok(mission.finalResponse?.headline.includes('J.A.R.V.I.S. Briefing'));
  assert.ok(mission.finalResponse?.deliverables.length > 0);
  assert.ok(events.some((e) => e.name === 'completed'));
});

test('resolveLlmEndpoint allows localhost Qwen endpoints without API key', () => {
  const local = resolveLlmEndpoint({
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen2.5:7b'
  });
  assert.equal(local?.baseUrl, 'http://127.0.0.1:11434/v1');
  assert.equal(local?.model, 'qwen2.5:7b');
  assert.equal(local?.apiKey, 'local-llm');

  const remoteNoKey = resolveLlmEndpoint({ baseUrl: 'https://api.openai.com/v1' });
  assert.equal(remoteNoKey, null);
});

test('answerAsJarvis validates input and responds to stage and team questions', () => {
  assert.throws(() => answerAsJarvis(''), /question/i);

  const stageReply = answerAsJarvis('How does the 4-stage pipeline work?');
  assert.equal(stageReply.speaker, 'J.A.R.V.I.S.');
  assert.match(stageReply.reply, /Task Planning/);
  assert.match(stageReply.reply, /Response Generation/);

  const teamReply = answerAsJarvis('Who is on the team?');
  assert.match(teamReply.reply, /Athena/);
  assert.match(teamReply.reply, /Vulcan/);
});

test('chatWithAgent validates agent/message, tracks context, and emits move actions', async () => {
  await assert.rejects(() => chatWithAgent('vulcan', '   '), /required/i);
  await assert.rejects(() => chatWithAgent('nobody', 'hello'), /unknown agent/i);

  const playReply = await chatWithAgent('vulcan', 'play pickleball', {
    activity: 'Gym: Treadmill',
    useExternalLlm: false
  });
  assert.equal(playReply.agentId, 'vulcan');
  assert.equal(playReply.action?.moveTo, 'pickleball');
  assert.match(playReply.reply, /pickleball/i);

  const greetReply = await chatWithAgent('athena', 'hi there', {
    activity: 'Playing Pickleball',
    useExternalLlm: false
  });
  assert.match(greetReply.reply, /playing pickleball/i);

  const skillReply = await chatWithAgent('vera', 'What are your skills?', {
    useExternalLlm: false
  });
  assert.match(skillReply.reply, /Unit & Integration Testing/);
  assert.match(skillReply.reply, /Nova/);

  const swimReply = await chatWithAgent('athena', 'go swim laps', { useExternalLlm: false });
  assert.equal(swimReply.action?.moveTo, 'swim');

  const bballReply = await chatWithAgent('vulcan', 'shoot basketball', { useExternalLlm: false });
  assert.equal(bballReply.action?.moveTo, 'basketball');

  const soccerReply = await chatWithAgent('orion', 'play soccer', { useExternalLlm: false });
  assert.equal(soccerReply.action?.moveTo, 'soccer');

  const barReply = await chatWithAgent('sage', 'grab drinks at the bar', { useExternalLlm: false });
  assert.equal(barReply.action?.moveTo, 'bar');

  const danceReply = await chatWithAgent('iris', 'lets go dancing', { useExternalLlm: false });
  assert.equal(danceReply.action?.moveTo, 'dance');

  const ceoReply = await chatWithAgent('ceo', 'What is our vision?', { useExternalLlm: false });
  assert.equal(ceoReply.agentId, 'ceo');
  assert.match(ceoReply.reply, /J\.A\.R\.V\.I\.S\./);

  const boardroomReply = await chatWithAgent('athena', 'meet in the boardroom', { useExternalLlm: false });
  assert.equal(boardroomReply.action?.moveTo, 'boardroom');

  const serverReply = await chatWithAgent('orion', 'inspect the server vault', { useExternalLlm: false });
  assert.equal(serverReply.action?.moveTo, 'server');

  const lobbyReply = await chatWithAgent('iris', 'check the reception lobby', { useExternalLlm: false });
  assert.equal(lobbyReply.action?.moveTo, 'lobby');

  const colleagueReply = await chatWithAgent('vulcan', 'go talk to nova', { useExternalLlm: false });
  assert.equal(colleagueReply.action?.moveTo, 'colleague:nova');
  assert.equal(colleagueReply.action?.targetAgentId, 'nova');
});
