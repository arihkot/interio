# Interio - Autonomous Structural Intelligence System

## Description
Interio is an autonomous structural intelligence system that streamlines architectural planning. It acts as a floor plan parser, 2D and 3D model generator, and a material optimizer providing explainable recommendations. It incorporates India-context pricing, cost lifecycle analysis, and comprehensive export workflows, making structural planning more intuitive and data-driven.

## Vision
To revolutionize the architectural and construction planning process by providing an intelligent, automated tool that bridges the gap between raw floor plans and actionable, cost-optimized, and context-aware 3D models with transparent material and pricing recommendations.

## Key Features
- Map-first location capture (current geolocation default)
- Upload floor plan and run end-to-end processing
- 2D detected plan and 3D model viewer (synced selection)
- Two recommendation variants (Primary, Alternative)
- Two 3D detail modes (Structure only, Minimal interior assets)
- Material cards with cost, life, annual maintenance, strength/durability/weather/availability scores, and source confidence tags
- Real-time/proxy pricing dashboard page (using World Bank macro indicators)
- Chatbot with voice input/output and project context
- PDF report and OBJ model exports
- Manual fallback processing endpoint
- **Web3 Bonus:** Mint 3D models + cost metrics as an NFT strictly on Stellar (Soroban contracts included)

## Demo Video
https://drive.google.com/file/d/1q6ymjfGxYkm3AkBGouhpVZocU9KEVkev/view?usp=drive_link

## Deployed Website URL
https://interio-eight.vercel.app/

## Deployed Smartcontract Details
- **Contract ID:** CD2V73KLOFGWJTQNKTBIHQMPXKHE5MPYOA4QCH422M365XXKACDRM76W
- **Screenshot of the blockexplorer showing the deployed contract details:**
<img width="1406" height="866" alt="image" src="https://github.com/user-attachments/assets/140217f9-df39-44ba-ab85-31210390a6a5" />
<img width="1409" height="860" alt="image" src="https://github.com/user-attachments/assets/41ca76fd-604c-4391-8502-2ad769ceb72a" />

## Tests
<img width="811" height="225" alt="image" src="https://github.com/user-attachments/assets/b61faf5f-35f8-4ecd-b7d5-ac3f7c3ab65d" />
<img width="1314" height="410" alt="image" src="https://github.com/user-attachments/assets/a2022d60-b71e-4738-b858-2aef9be2d6af" />


## Project Setup Guide

### One-command startup
```bash
./dev.sh
# or
make dev
```
This bootstraps missing dependencies (`backend/.venv`, `web/node_modules`, env templates) and starts both backend and frontend together. If default ports are occupied, `dev.sh` automatically picks the next free ports.

If frontend shows "Failed to fetch" on upload:
- Verify backend is up at `http://localhost:<backend-port>/health`
- Ensure frontend is using the same backend host/port shown by `dev.sh`
- Restart after env changes: stop and rerun `make dev`

### Manual Setup
**1) Backend**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
*Note: Python 3.9 compatibility is pinned. Optional ML dependencies (PaddleOCR + YOLO) can be installed via `backend/requirements-ml.txt` if using Python 3.10+.*

**2) Frontend**
```bash
cd web
npm install
npm run dev
```
Open `http://localhost:3000`.

### Important Configuration
Set these in `backend/.env` for best results:
- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-3-flash`
- `WEATHER_API_KEY` (WeatherAPI)
- `WORLD_BANK_BASE_URL=https://api.worldbank.org/v2`
- `WORLD_BANK_TIMEOUT_SEC=8`

## Future Scope
<!-- Detail what features or improvements you plan to add in the future. -->
- Expand proxy pricing integration to additional regions globally
- Enhance 3D interior asset generation options
- Improve local ML model accuracy for more complex floor plan variations
- Expand Web3 integration capabilities
