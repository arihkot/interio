SHELL := /bin/bash

.PHONY: dev backend web

dev:
	./dev.sh

dev-ml:
	INSTALL_ML=1 ./dev.sh

backend:
	cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -U pip && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

web:
	cd web && npm install && npm run dev
