# J.A.R.V.I.S. AI Office

An interactive **Virtual AI Team Office** web app where **J.A.R.V.I.S.** serves as the central controller and user guide, inspired by [microsoft/JARVIS (HuggingGPT)](https://github.com/microsoft/JARVIS).

## Architecture (Microsoft JARVIS 4-Stage Pipeline)

1. **Task Planning** (`src/jarvis/planner.js`) — Decomposes the user's prompt into an acyclic dependency graph (DAG) of atomic tasks.
2. **Model Selection** (`src/jarvis/planner.js`) — Routes each task to the best-fit specialist desk in the Virtual Office (`Athena`, `Sage`, `Vulcan`, `Iris`, `Aegis`) with confidence scoring and rationale.
3. **Task Execution** (`src/jarvis/executor.js`) — Runs ready tasks in topological waves (parallelizing independent branches with bounded concurrency) and streams real-time desk updates over Server-Sent Events (SSE).
4. **Response Generation** (`src/jarvis/executor.js`) — Synthesizes specialist outputs into a J.A.R.V.I.S. executive briefing and guided next steps.

## Quick Start

Requires **Node.js >= 22** (zero external dependencies):

```bash
node src/server.js
```

Then open `http://127.0.0.1:3000`.

### Optional Live LLM Mode

By default, the app runs out of the box using the built-in **Local JARVIS Engine**. To route planning and specialist execution to an OpenAI-compatible API:

- Set `OPENAI_API_KEY` (and optionally `OPENAI_BASE_URL`, `JARVIS_PLANNER_MODEL`, `JARVIS_WORKER_MODEL`) before starting `node src/server.js`, **or**
- Click **LLM Settings** in the top bar to enter a session-only key in memory.

## Tests

```bash
node --test test/*.test.js
```

## HTTP Endpoints

- `GET /api/health` — Engine status and active mission count
- `GET /api/team` — Virtual office roster, coordinates, and 4 pipeline stages
- `GET /api/guide` — Guided tour steps and preset missions
- `POST /api/guide/ask` — Ask J.A.R.V.I.S. questions as your office guide
- `POST /api/missions` — Dispatch a mission (`202 Accepted`, supports `Idempotency-Key`)
- `GET /api/missions` — Cursor-paginated mission history
- `GET /api/missions/:id` — Full mission state, DAG, logs, and final briefing
- `GET /api/missions/:id/stream` — Live SSE stream for office animations
