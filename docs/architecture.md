# Interio System Architecture

## Overview

Interio is a dual-service system:

- `backend/` (FastAPI): parsing, geometry, 3D generation data, material optimization, explainability, pricing, exports.
- `web/` (Next.js): map-first flow, 2D/3D synced viewers, recommendation cards, pricing dashboard, chatbot with voice.

The processing is India-context by default (INR, climate zones, state-level availability).

## Pipeline Stages

1. **Floor Plan Parsing**
   - OpenCV preprocessing + Hough walls + contour rooms.
   - Optional local models:
     - YOLO (openings) via `OpeningDetector`.
     - PaddleOCR (labels) via `OCRService`.

2. **Geometry Reconstruction**
   - Node-edge structural graph from wall endpoints (`GeometryService`).
   - Room spans and structural concerns generation.

3. **2D to 3D Generation**
   - Build simple and minimal interior models for both primary and alternative recommendations.
   - Export JSON and OBJ.

4. **Material Analysis and Tradeoff**
   - India material DB + weather/location adjusted pricing.
   - Element-wise ranking with role-specific weighted score.
   - Total cost, annual maintenance, lifecycle 30-year and average life.

5. **Explainability**
   - Gemini (`gemini-3-flash`) when key is available.
   - Deterministic fallback narrative with cited scores/costs.

## API Endpoints

- `GET /health`
- `POST /api/process` (image upload + location)
- `POST /api/process/manual` (fallback manual coordinates)
- `GET /api/project/{project_id}`
- `GET /api/pricing/{project_id}`
- `POST /api/chat`
- `GET /api/export/pdf/{project_id}`
- `GET /api/export/model/{project_id}/{variant}/{detail}` (JSON)
- `GET /api/export/model-obj/{project_id}/{variant}/{detail}` (OBJ)

## Environment

Use `backend/.env.example` as template:

- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-3-flash`
- `WEATHER_API_KEY`
- `WORLD_BANK_BASE_URL`
- `WORLD_BANK_TIMEOUT_SEC`

## Notes

- If OCR and YOLO are unavailable, system gracefully falls back to CV heuristics.
- LLM-guided primary selection can reorder options based on lifecycle evidence.
- Pricing entries are tagged `observed/proxy/imputed` for transparency.
- World Bank proxy pricing is derived from India CPI + GDP deflator + industry growth indicators; fallback is local baseline if feed fails.
