# interio

Autonomous Structural Intelligence System

- Floor plan parser
- 2D + 3D model generator
- Material optimizer with explainable recommendations
- India-context pricing, cost, lifecycle and export workflows

## Project Structure

- `backend/` FastAPI engine
- `web/` Next.js interface
- `docs/` architecture docs

## Quick Start

### One-command startup

```bash
./dev.sh
```

or

```bash
make dev
```

This bootstraps missing dependencies (`backend/.venv`, `web/node_modules`, env templates) and starts both backend and frontend together.
If default ports are occupied, `dev.sh` automatically picks the next free ports.

If frontend shows "Failed to fetch" on upload:

- Verify backend is up at `http://localhost:<backend-port>/health`
- Ensure frontend is using the same backend host/port shown by `dev.sh`
- Restart after env changes: stop and rerun `make dev`

Pricing note: live proxy pricing now uses World Bank macro indicators (India CPI, GDP deflator, industry growth). If that feed is unavailable, Interio automatically falls back to local baseline pricing.

If you also want optional local ML detectors (PaddleOCR + YOLO):

```bash
make dev-ml
```

or

```bash
INSTALL_ML=1 ./dev.sh
```

Note: optional ML dependencies can require newer Python versions on some machines.

### 1) Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Python note: core backend dependencies are pinned for Python 3.9 compatibility.
If you use Python 3.10+ you can additionally install `backend/requirements-ml.txt` for richer OCR/opening detection.

### 2) Frontend

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`.

## Core Features Implemented

- Map-first location capture (current geolocation default)
- Upload floor plan and run end-to-end processing
- 2D detected plan and 3D model viewer (synced selection)
- Two recommendation variants:
  - Primary
  - Alternative
- Two 3D detail modes:
  - Structure only
  - Minimal interior assets
- Material cards with:
  - Cost, life, annual maintenance
  - Strength/durability/weather/availability scores
  - Source confidence tags
- Real-time/proxy pricing dashboard page
- Chatbot with voice input/output and project context
- PDF report export
- OBJ model export
- Manual fallback processing endpoint

## Optional Model Dependencies

The backend attempts to use local models if installed:

- PaddleOCR for room labels
- Ultralytics YOLO for opening detection

If unavailable, CV heuristics are used.

## Important Configuration

Set these in `backend/.env` for best results:

- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-3-flash`
- `WEATHER_API_KEY` (WeatherAPI)
- `WORLD_BANK_BASE_URL=https://api.worldbank.org/v2`
- `WORLD_BANK_TIMEOUT_SEC=8`

## API Summary

- `POST /api/process`
- `POST /api/process/manual`
- `GET /api/project/{project_id}`
- `GET /api/pricing/{project_id}`
- `POST /api/chat`
- `GET /api/export/pdf/{project_id}`
- `GET /api/export/model-obj/{project_id}/{variant}/{detail}`

See `docs/architecture.md` for details.
