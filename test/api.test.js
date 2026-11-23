import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createApp } from '../src/server.js';

function createTestClient(missionsDir = null) {
  const { handler } = createApp({ stepDelayMs: 0, useExternalLlm: false, missionsDir });

  async function request(method, urlPath, { headers = {}, body = null } = {}) {
    const rawBody = body === null ? null : typeof body === 'string' ? body : JSON.stringify(body);
    const req = Readable.from(rawBody ? [Buffer.from(rawBody, 'utf8')] : []);
    req.method = method;
    req.url = urlPath;
    req.headers = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
    );

    return new Promise((resolve, reject) => {
      const chunks = [];
      let statusCode = 200;
      let resHeaders = {};

      const res = {
        writeHead(code, hdrs = {}) {
          statusCode = code;
          resHeaders = Object.fromEntries(
            Object.entries(hdrs).map(([k, v]) => [k.toLowerCase(), v])
          );
          return this;
        },
        write(chunk) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
          return true;
        },
        end(chunk) {
          if (chunk) this.write(chunk);
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: statusCode,
            headers: {
              get: (name) => resHeaders[name.toLowerCase()] ?? null
            },
            text: async () => text,
            json: async () => JSON.parse(text)
          });
        }
      };

      Promise.resolve(handler(req, res)).catch(reject);
    });
  }

  return { request };
}

async function pollUntilDone(client, missionId) {
  for (let i = 0; i < 40; i += 1) {
    const res = await client.request('GET', `/api/missions/${missionId}`);
    const data = await res.json();
    if (data.status === 'completed' || data.status === 'failed') {
      return data;
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('Timed out waiting for mission completion.');
}

test('HTTP API serves health, team, guide, static UI, saves folder, and tracks token %', async () => {
  const tempMissionsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jarvis-missions-'));
  const client = createTestClient(tempMissionsDir);

  try {
    const htmlRes = await client.request('GET', '/');
    assert.equal(htmlRes.status, 200);
    assert.equal(htmlRes.headers.get('x-content-type-options'), 'nosniff');
    const html = await htmlRes.text();
    assert.match(html, /J\.A\.R\.V\.I\.S\. AI Office/);

    const healthRes = await client.request('GET', '/api/health');
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, 'ok');

    const teamRes = await client.request('GET', '/api/team');
    assert.equal(teamRes.status, 200);
    const teamJson = await teamRes.json();
    assert.equal(teamJson.team.length, 9);
    assert.ok(teamJson.team.some((a) => a.id === 'ceo'));
    assert.ok(teamJson.team.every((a) => Array.isArray(a.skills) && a.skills.length >= 4));
    assert.equal(teamJson.stages.length, 4);

    // Create mission with idempotency key
    const createRes = await client.request('POST', '/api/missions', {
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idem-test-1'
      },
      body: { prompt: 'Design a modular API and security audit checklist' }
    });
    assert.equal(createRes.status, 202);
    const created = await createRes.json();
    assert.ok(created.missionId.startsWith('msn_'));

    // Repeat with same idempotency key
    const replayRes = await client.request('POST', '/api/missions', {
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idem-test-1'
      },
      body: { prompt: 'Design a modular API and security audit checklist' }
    });
    assert.equal(replayRes.status, 202);
    const replayed = await replayRes.json();
    assert.equal(replayed.missionId, created.missionId);
    assert.equal(replayed.replayed, true);

    const finished = await pollUntilDone(client, created.missionId);
    assert.equal(finished.status, 'completed');
    assert.ok(finished.finalResponse.deliverables.length > 0);
    assert.ok(finished.tokenUsage.totalTokens > 0);
    assert.ok(finished.tokenUsage.budgetPercent > 0);
    assert.ok(finished.savedFiles.includes('briefing.md'));

    // Saved work folder endpoints
    const filesRes = await client.request('GET', `/api/missions/${created.missionId}/files`);
    assert.equal(filesRes.status, 200);
    const filesData = await filesRes.json();
    assert.ok(filesData.files.includes('briefing.md'));

    const briefingRes = await client.request(
      'GET',
      `/api/missions/${created.missionId}/files?file=briefing.md`
    );
    assert.equal(briefingRes.status, 200);
    const briefingDoc = await briefingRes.json();
    assert.match(briefingDoc.content, /Token Usage & Budget Percentage/);

    const traversalArtifact = await client.request(
      'GET',
      `/api/missions/${created.missionId}/files?file=../../package.json`
    );
    assert.equal(traversalArtifact.status, 400);
  } finally {
    await fs.rm(tempMissionsDir, { recursive: true, force: true });
  }
});

test('HTTP API enforces validation, SSRF baseUrl guard, 404s, and cursor pagination', async () => {
  const client = createTestClient();

  const emptyPromptRes = await client.request('POST', '/api/missions', {
    headers: { 'Content-Type': 'application/json' },
    body: { prompt: '   ' }
  });
  assert.equal(emptyPromptRes.status, 400);
  const emptyErr = await emptyPromptRes.json();
  assert.equal(emptyErr.code, 'VALIDATION_ERROR');
  assert.ok(emptyErr.request_id);

  const malformedRes = await client.request('POST', '/api/missions', {
    headers: { 'Content-Type': 'application/json' },
    body: '{bad json'
  });
  assert.equal(malformedRes.status, 400);
  assert.equal((await malformedRes.json()).code, 'INVALID_JSON');

  const badAgentRes = await client.request('POST', '/api/missions', {
    headers: { 'Content-Type': 'application/json' },
    body: { prompt: 'Build app', agents: ['unknown-agent'] }
  });
  assert.equal(badAgentRes.status, 400);

  const ssrfRes = await client.request('POST', '/api/missions', {
    headers: { 'Content-Type': 'application/json' },
    body: {
      prompt: 'Build app',
      baseUrl: 'http://169.254.169.254/latest/meta-data'
    }
  });
  assert.equal(ssrfRes.status, 400);

  const traversalRes = await client.request('GET', '/../package.json');
  assert.equal(traversalRes.status, 404);

  const notFoundRes = await client.request('GET', '/api/missions/msn_missing');
  assert.equal(notFoundRes.status, 404);

  // Create 2 missions to check cursor pagination
  await client.request('POST', '/api/missions', {
    headers: { 'Content-Type': 'application/json' },
    body: { prompt: 'First mission' }
  });
  await client.request('POST', '/api/missions', {
    headers: { 'Content-Type': 'application/json' },
    body: { prompt: 'Second mission' }
  });

  const page1 = await (await client.request('GET', '/api/missions?limit=1')).json();
  assert.equal(page1.items.length, 1);
  assert.ok(page1.nextCursor);

  const page2 = await (
    await client.request('GET', `/api/missions?limit=1&cursor=${encodeURIComponent(page1.nextCursor)}`)
  ).json();
  assert.equal(page2.items.length, 1);
  assert.notEqual(page2.items[0].id, page1.items[0].id);

  const guideRes = await client.request('POST', '/api/guide/ask', {
    headers: { 'Content-Type': 'application/json' },
    body: { question: 'Who is in the office?' }
  });
  assert.equal(guideRes.status, 200);
  const guideData = await guideRes.json();
  assert.match(guideData.reply, /Athena/);

  // Direct 1-on-1 agent chat endpoint with activity + move action
  const agentChatRes = await client.request('POST', '/api/agents/iris/chat', {
    headers: { 'Content-Type': 'application/json' },
    body: {
      message: 'go play pickleball',
      activity: 'Design Studio',
      history: [{ role: 'user', text: 'hi' }]
    }
  });
  assert.equal(agentChatRes.status, 200);
  const agentChatData = await agentChatRes.json();
  assert.equal(agentChatData.agentId, 'iris');
  assert.equal(agentChatData.action?.moveTo, 'pickleball');
  assert.match(agentChatData.reply, /pickleball/i);

  const unknownAgentChat = await client.request('POST', '/api/agents/nonexistent/chat', {
    headers: { 'Content-Type': 'application/json' },
    body: { message: 'hi' }
  });
  assert.equal(unknownAgentChat.status, 404);
});
