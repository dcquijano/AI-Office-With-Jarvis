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

## Realistic 3D Office, Real Sky & Boss Mode (Agent-Office Style)

- **Engine**: Built on Three.js `0.170.0` (MIT License), vendored locally in `public/vendor/three/` — no `npm install` or external CDN required at runtime.
- **Bright Daylight Architecture & Real Sky**: Oak wood floors, white desks, black ergonomic chairs, black-framed glass rooms, and large windows follow the real solar elevation at your time zone (`Auto / Day / Night` + time-of-day scrubber, with warm interior desk lamps & starfield after sunset — computed locally with zero network calls).
- **Error Severity & Alarms**: Mission logs, worker errors, and simulated incidents are graded across `Info`, `Minor`, `Moderate`, `Major`, and `Critical` (`public/severity.js`). Repeated errors escalate, quiet incidents recover over time, desk alarm beacons flash when an agent reaches the panic threshold, and live terminal feeds update on every 3D monitor.
- **Cinema Camera**: Press `C` (or click **Cinema (C)**) to drift through the office and follow active or alerting agents.
- **Controls**:
  - Drag horizontally to orbit, drag vertically to tilt camera pitch, scroll to zoom, or click any AI character/desk for 1-on-1 chat.
  - Use **Quality** in the camera bar to cycle `High` / `Balanced` / `Performance` (persisted in `localStorage`).
  - Use **Fullscreen** to expand the 3D campus view.
- **Fallback**: Append `?legacy3d=1` to the URL to force the classic 2D isometric canvas renderer. If WebGL is unavailable in the browser, the app falls back to the isometric renderer automatically.

## Boss Mode (Walk the Office in 3D)

Press `B` or click **Boss Mode (B)** above the campus view, customize your avatar (name, outfit color, hair, skin tone, glasses), and walk around with your AI team. Your avatar profile is saved in `localStorage`.

| Key | Action |
| --- | --- |
| `B` | Toggle Boss Mode |
| `W` `A` `S` `D` / arrows | Walk (relative to the camera) |
| `Shift` | Run |
| Mouse drag / wheel | Orbit/look and zoom |
| `E` | Open the nearest agent's terminal (or talk to J.A.R.V.I.S.) |
| `V` | Toggle first-person / third-person view |
| `C` | Toggle Cinema camera |
| `Esc` | Close terminal or leave Boss Mode |

Agents greet you when you walk past, turn to face you, and your messages appear as speech bubbles above your avatar. Desks, glass walls, server racks, furniture and the pool are solid, and a live minimap shows where everyone is.
