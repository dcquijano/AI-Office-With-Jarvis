import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_TEAM, getAgentById, JARVIS_CONTROLLER, JARVIS_STAGES } from './jarvis/catalog.js';
import { chatWithAgent } from './jarvis/agentChat.js';
import { runMissionPipeline } from './jarvis/executor.js';
import { answerAsJarvis, GUIDED_TOUR_STEPS, PRESET_MISSIONS } from './jarvis/guide.js';
import { detectLocalLlms } from './jarvis/localLlm.js';
import { applyUpgradePatch, createDefaultUpgrades, serializeUpgrades } from './jarvis/officeUpgrades.js';
import { readMissionArtifact } from './jarvis/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const MAX_BODY_BYTES = 64 * 1024;
const MAX_STORED_MISSIONS = 200;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
});

function sendJson(res, statusCode, payload, requestId) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Request-Id': requestId,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function sendError(res, statusCode, code, message, requestId, details = null) {
  sendJson(
    res,
    statusCode,
    {
      code,
      message,
      details,
      request_id: requestId
    },
    requestId
  );
}

async function readJsonBody(req) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      const err = new Error('Request payload too large.');
      err.statusCode = 413;
      err.code = 'PAYLOAD_TOO_LARGE';
      throw err;
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('JSON body must be an object.');
    }
    return parsed;
  } catch {
    const err = new Error('Malformed JSON request body.');
    err.statusCode = 400;
    err.code = 'INVALID_JSON';
    throw err;
  }
}

function isAllowedLlmBaseUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:') {
      // Block link-local / loopback / private IPv4 literals over https
      const host = parsed.hostname;
      if (/^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
        return false;
      }
      return true;
    }
    // Allow explicit local model servers (e.g. Ollama / LM Studio) only on loopback
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function validateMissionInput(body) {
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return { error: 'Field "prompt" is required and must be a non-empty string.' };
  }
  if (prompt.length > 2000) {
    return { error: 'Field "prompt" must not exceed 2000 characters.' };
  }

  let agents = [];
  if (body.agents !== undefined) {
    if (!Array.isArray(body.agents)) {
      return { error: 'Field "agents" must be an array of specialist IDs.' };
    }
    const invalid = body.agents.filter((id) => typeof id !== 'string' || !getAgentById(id));
    if (invalid.length > 0) {
      return { error: `Unknown specialist agent ID(s): ${invalid.join(', ')}` };
    }
    agents = [...new Set(body.agents)];
  }

  let baseUrl;
  if (body.baseUrl !== undefined && body.baseUrl !== '') {
    if (typeof body.baseUrl !== 'string' || !isAllowedLlmBaseUrl(body.baseUrl)) {
      return { error: 'Field "baseUrl" must be an https:// URL or localhost http:// URL.' };
    }
    baseUrl = body.baseUrl;
  }

  const apiKey = typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey.trim() : undefined;
  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim().slice(0, 80) : undefined;

  return {
    value: { prompt, agents, apiKey, baseUrl, model }
  };
}

function serializeMissionSummary(m) {
  return {
    id: m.id,
    prompt: m.prompt,
    status: m.status,
    currentStage: m.currentStage,
    mode: m.mode,
    taskCount: m.tasks.length,
    tokenUsage: m.tokenUsage || null,
    outputFolder: m.outputFolder || null,
    createdAt: m.createdAt,
    completedAt: m.completedAt
  };
}

/**
 * Create the JARVIS AI Office HTTP application (handler + in-memory mission store).
 * @param {object} options
 */
export function createApp(options = {}) {
  const stepDelayMs = Number.isFinite(options.stepDelayMs) ? options.stepDelayMs : 420;
  const useExternalLlm = options.useExternalLlm !== false;
  const missionsDir =
    options.missionsDir !== undefined ? options.missionsDir : path.resolve(__dirname, '../missions');

  const missions = new Map();
  const missionOrder = [];
  const idempotencyIndex = new Map();
  const subscribers = new Map();
  let officeUpgrades = createDefaultUpgrades();

  function emitMissionEvent(missionId, eventName, data) {
    const clients = subscribers.get(missionId);
    if (!clients || clients.size === 0) return;

    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const clientRes of clients) {
      try {
        clientRes.write(payload);
      } catch {
        clients.delete(clientRes);
      }
    }
  }

  function evictOldestIfNeeded() {
    while (missionOrder.length > MAX_STORED_MISSIONS) {
      const oldestId = missionOrder.shift();
      missions.delete(oldestId);
      subscribers.delete(oldestId);
    }
  }

  async function serveStatic(reqPath, res, requestId) {
    const cleanPath = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
    const resolved = path.resolve(PUBLIC_DIR, cleanPath);

    if (!resolved.startsWith(PUBLIC_DIR + path.sep) && resolved !== path.join(PUBLIC_DIR, 'index.html')) {
      return sendError(res, 403, 'FORBIDDEN', 'Access denied.', requestId);
    }

    try {
      const stat = await fs.stat(resolved);
      if (!stat.isFile()) {
        return sendError(res, 404, 'NOT_FOUND', 'Resource not found.', requestId);
      }
      const ext = path.extname(resolved).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const data = await fs.readFile(resolved);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': data.length,
        'X-Request-Id': requestId,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      });
      res.end(data);
    } catch {
      sendError(res, 404, 'NOT_FOUND', 'Resource not found.', requestId);
    }
  }

  const handler = async (req, res) => {
    const requestId = crypto.randomUUID();
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = url.pathname;

    try {
      // Health check
      if (method === 'GET' && pathname === '/api/health') {
        return sendJson(
          res,
          200,
          {
            status: 'ok',
            service: 'jarvis-ai-office',
            llmConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL),
            activeMissions: [...missions.values()].filter((m) => m.status === 'running').length
          },
          requestId
        );
      }

      // Detect local Ollama / LM Studio runtimes & Qwen models
      if (method === 'GET' && pathname === '/api/llm/local') {
        const localInfo = await detectLocalLlms();
        return sendJson(res, 200, localInfo, requestId);
      }

      // CEO Office upgrades & UI design themes
      if (method === 'GET' && pathname === '/api/office/upgrades') {
        return sendJson(res, 200, serializeUpgrades(officeUpgrades), requestId);
      }

      if (method === 'PUT' && pathname === '/api/office/upgrades') {
        const body = await readJsonBody(req);
        const result = applyUpgradePatch(officeUpgrades, body);
        if (result.error) {
          return sendError(res, 400, 'VALIDATION_ERROR', result.error, requestId);
        }
        officeUpgrades = result.value;
        return sendJson(res, 200, serializeUpgrades(officeUpgrades), requestId);
      }

      // Team & office layout metadata
      if (method === 'GET' && pathname === '/api/team') {
        return sendJson(
          res,
          200,
          {
            controller: JARVIS_CONTROLLER,
            stages: JARVIS_STAGES,
            team: AGENT_TEAM
          },
          requestId
        );
      }

      // Guide as J.A.R.V.I.S. metadata
      if (method === 'GET' && pathname === '/api/guide') {
        return sendJson(
          res,
          200,
          {
            controller: JARVIS_CONTROLLER,
            tourSteps: GUIDED_TOUR_STEPS,
            presets: PRESET_MISSIONS,
            stages: JARVIS_STAGES
          },
          requestId
        );
      }

      // Interactive Ask J.A.R.V.I.S. Guide endpoint
      if (method === 'POST' && pathname === '/api/guide/ask') {
        const body = await readJsonBody(req);
        const question = typeof body.question === 'string' ? body.question.trim() : '';
        if (!question || question.length > 500) {
          return sendError(
            res,
            400,
            'VALIDATION_ERROR',
            'Field "question" must be 1 to 500 characters.',
            requestId
          );
        }
        const answer = answerAsJarvis(question);
        return sendJson(res, 200, answer, requestId);
      }

      // Direct 1-on-1 chat with any individual AI specialist or J.A.R.V.I.S.
      const agentChatMatch = pathname.match(/^\/api\/agents\/([a-zA-Z0-9_-]+)\/chat$/);
      if (method === 'POST' && agentChatMatch) {
        const agentId = agentChatMatch[1];
        if (agentId !== 'jarvis' && !getAgentById(agentId)) {
          return sendError(res, 404, 'NOT_FOUND', `Unknown AI agent "${agentId}".`, requestId);
        }

        const body = await readJsonBody(req);
        const message = typeof body.message === 'string' ? body.message.trim() : '';
        if (!message || message.length > 1000) {
          return sendError(
            res,
            400,
            'VALIDATION_ERROR',
            'Field "message" must be 1 to 1000 characters.',
            requestId
          );
        }

        let baseUrl;
        if (body.baseUrl !== undefined && body.baseUrl !== '') {
          if (typeof body.baseUrl !== 'string' || !isAllowedLlmBaseUrl(body.baseUrl)) {
            return sendError(
              res,
              400,
              'VALIDATION_ERROR',
              'Field "baseUrl" must be an https:// URL or localhost http:// URL.',
              requestId
            );
          }
          baseUrl = body.baseUrl;
        }

        const mission =
          typeof body.missionId === 'string' && missions.has(body.missionId)
            ? missions.get(body.missionId)
            : null;

        const activity =
          typeof body.activity === 'string' ? body.activity.trim().slice(0, 60) : undefined;
        const history = Array.isArray(body.history) ? body.history.slice(-8) : undefined;

        const reply = await chatWithAgent(agentId, message, {
          mission,
          activity,
          history,
          apiKey: typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey.trim() : undefined,
          baseUrl,
          model: typeof body.model === 'string' && body.model.trim() ? body.model.trim().slice(0, 80) : undefined,
          useExternalLlm
        });
        return sendJson(res, 200, reply, requestId);
      }

      // Create & dispatch a mission (202 Accepted)
      if (method === 'POST' && pathname === '/api/missions') {
        const idemKeyHeader = req.headers['idempotency-key'];
        const idemKey = typeof idemKeyHeader === 'string' && idemKeyHeader.trim() ? idemKeyHeader.trim() : null;

        if (idemKey && idempotencyIndex.has(idemKey)) {
          const existingId = idempotencyIndex.get(idemKey);
          const existing = missions.get(existingId);
          if (existing) {
            return sendJson(
              res,
              202,
              {
                missionId: existing.id,
                status: existing.status,
                statusUrl: `/api/missions/${existing.id}`,
                streamUrl: `/api/missions/${existing.id}/stream`,
                replayed: true
              },
              requestId
            );
          }
        }

        const body = await readJsonBody(req);
        const validation = validateMissionInput(body);
        if (validation.error) {
          return sendError(res, 400, 'VALIDATION_ERROR', validation.error, requestId);
        }

        const missionId = `msn_${crypto.randomBytes(6).toString('hex')}`;
        const mission = {
          id: missionId,
          prompt: validation.value.prompt,
          requestedAgents: validation.value.agents,
          status: 'queued',
          currentStage: 'task-planning',
          mode: validation.value.apiKey || process.env.OPENAI_API_KEY ? 'llm-hybrid' : 'local-jarvis',
          plannerModel: null,
          fallbackNotice: null,
          tasks: [],
          logs: [],
          finalResponse: null,
          error: null,
          createdAt: new Date().toISOString(),
          completedAt: null
        };

        missions.set(missionId, mission);
        missionOrder.unshift(missionId);
        if (idemKey) {
          idempotencyIndex.set(idemKey, missionId);
        }
        evictOldestIfNeeded();

        // Start pipeline asynchronously after responding 202
        queueMicrotask(() => {
          runMissionPipeline(
            mission,
            (eventName, data) => emitMissionEvent(missionId, eventName, data),
            {
              agents: validation.value.agents,
              apiKey: validation.value.apiKey,
              baseUrl: validation.value.baseUrl,
              model: validation.value.model,
              stepDelayMs,
              useExternalLlm,
              missionsDir
            }
          );
        });

        return sendJson(
          res,
          202,
          {
            missionId,
            status: mission.status,
            statusUrl: `/api/missions/${missionId}`,
            streamUrl: `/api/missions/${missionId}/stream`
          },
          requestId
        );
      }

      // List missions with cursor pagination
      if (method === 'GET' && pathname === '/api/missions') {
        const limitRaw = Number(url.searchParams.get('limit') || DEFAULT_PAGE_SIZE);
        const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
        const cursor = url.searchParams.get('cursor');

        let startIndex = 0;
        if (cursor) {
          const idx = missionOrder.indexOf(cursor);
          if (idx === -1) {
            return sendError(res, 400, 'INVALID_CURSOR', 'Pagination cursor was not found.', requestId);
          }
          startIndex = idx + 1;
        }

        const sliceIds = missionOrder.slice(startIndex, startIndex + limit);
        const items = sliceIds.map((id) => serializeMissionSummary(missions.get(id))).filter(Boolean);
        const nextCursor =
          startIndex + limit < missionOrder.length ? sliceIds[sliceIds.length - 1] : null;

        return sendJson(res, 200, { items, nextCursor }, requestId);
      }

      // SSE Stream for live office updates
      const streamMatch = pathname.match(/^\/api\/missions\/([a-zA-Z0-9_-]+)\/stream$/);
      if (method === 'GET' && streamMatch) {
        const missionId = streamMatch[1];
        const mission = missions.get(missionId);
        if (!mission) {
          return sendError(res, 404, 'NOT_FOUND', 'Mission not found.', requestId);
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Request-Id': requestId,
          'X-Content-Type-Options': 'nosniff'
        });

        if (!subscribers.has(missionId)) {
          subscribers.set(missionId, new Set());
        }
        subscribers.get(missionId).add(res);

        // Immediately replay current snapshot so late subscribers catch up deterministically
        res.write(`event: snapshot\ndata: ${JSON.stringify(mission)}\n\n`);

        const heartbeat = setInterval(() => {
          try {
            res.write(': keepalive\n\n');
          } catch {
            clearInterval(heartbeat);
          }
        }, 15000);

        req.on('close', () => {
          clearInterval(heartbeat);
          const clients = subscribers.get(missionId);
          if (clients) {
            clients.delete(res);
            if (clients.size === 0) subscribers.delete(missionId);
          }
        });
        return;
      }

      // Read saved mission deliverable files from missions/<missionId>/
      const filesMatch = pathname.match(/^\/api\/missions\/([a-zA-Z0-9_-]+)\/files$/);
      if (method === 'GET' && filesMatch) {
        const mission = missions.get(filesMatch[1]);
        if (!mission) {
          return sendError(res, 404, 'NOT_FOUND', 'Mission not found.', requestId);
        }
        const relFile = url.searchParams.get('file');
        if (relFile) {
          try {
            const doc = await readMissionArtifact(mission.id, relFile, missionsDir);
            if (!doc) {
              return sendError(res, 404, 'NOT_FOUND', 'Artifact storage disabled.', requestId);
            }
            return sendJson(res, 200, doc, requestId);
          } catch (err) {
            return sendError(
              res,
              err.statusCode || 404,
              'ARTIFACT_NOT_FOUND',
              err.message || 'Artifact file not found.',
              requestId
            );
          }
        }
        return sendJson(
          res,
          200,
          {
            missionId: mission.id,
            outputFolder: mission.outputFolder || null,
            files: mission.savedFiles || []
          },
          requestId
        );
      }

      // Fetch single mission
      const missionMatch = pathname.match(/^\/api\/missions\/([a-zA-Z0-9_-]+)$/);
      if (method === 'GET' && missionMatch) {
        const mission = missions.get(missionMatch[1]);
        if (!mission) {
          return sendError(res, 404, 'NOT_FOUND', 'Mission not found.', requestId);
        }
        return sendJson(res, 200, mission, requestId);
      }

      if (pathname.startsWith('/api/')) {
        return sendError(res, 404, 'NOT_FOUND', `No endpoint matches ${method} ${pathname}.`, requestId);
      }

      if (method !== 'GET' && method !== 'HEAD') {
        return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', requestId);
      }

      return serveStatic(pathname, res, requestId);
    } catch (err) {
      const status = err.statusCode || 500;
      const code = err.code || 'INTERNAL_ERROR';
      const message = status >= 500 ? 'Internal server error.' : err.message;
      return sendError(res, status, code, message, requestId);
    }
  };

  const server = http.createServer(handler);

  return { server, handler, missions };
}

const isEntrypoint =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const { server } = createApp();
  server.listen(port, host, () => {
    console.log(`J.A.R.V.I.S. AI Office listening at http://${host}:${port}`);
  });
}
