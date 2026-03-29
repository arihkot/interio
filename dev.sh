#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
WEB_DIR="${ROOT_DIR}/web"

BACKEND_PORT="${BACKEND_PORT:-8000}"
WEB_PORT="${WEB_PORT:-3000}"
INSTALL_ML="${INSTALL_ML:-0}"

BACKEND_PID=""
WEB_PID=""
CLEANED_UP="0"

cleanup() {
  if [[ "${CLEANED_UP}" == "1" ]]; then
    return
  fi
  CLEANED_UP="1"

  echo
  echo "Stopping Interio dev services..."

  if [[ -n "${BACKEND_PID}" ]]; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
  if [[ -n "${WEB_PID}" ]]; then
    kill "${WEB_PID}" 2>/dev/null || true
  fi

  wait "${BACKEND_PID}" 2>/dev/null || true
  wait "${WEB_PID}" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

require_command() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Error: '${cmd}' is required but not installed."
    exit 1
  fi
}

port_in_use() {
  local port="$1"
  lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
}

next_free_port() {
  local preferred="$1"
  local port="${preferred}"
  while port_in_use "${port}"; do
    port="$((port + 1))"
  done
  echo "${port}"
}

bootstrap_backend() {
  if [[ ! -d "${BACKEND_DIR}/.venv" ]]; then
    echo "Creating backend virtual environment..."
    python3 -m venv "${BACKEND_DIR}/.venv"
  fi

  if [[ ! -f "${BACKEND_DIR}/.env" && -f "${BACKEND_DIR}/.env.example" ]]; then
    cp "${BACKEND_DIR}/.env.example" "${BACKEND_DIR}/.env"
    echo "Created backend/.env from .env.example"
  fi

  if [[ ! -x "${BACKEND_DIR}/.venv/bin/uvicorn" ]]; then
    echo "Installing backend dependencies..."
    "${BACKEND_DIR}/.venv/bin/pip" install -U pip
    "${BACKEND_DIR}/.venv/bin/pip" install -r "${BACKEND_DIR}/requirements.txt"
  fi

  if [[ "${INSTALL_ML}" == "1" && -f "${BACKEND_DIR}/requirements-ml.txt" ]]; then
    echo "Installing optional ML dependencies..."
    "${BACKEND_DIR}/.venv/bin/pip" install -r "${BACKEND_DIR}/requirements-ml.txt"
  fi
}

bootstrap_web() {
  if [[ ! -f "${WEB_DIR}/.env.local" && -f "${WEB_DIR}/.env.local.example" ]]; then
    cp "${WEB_DIR}/.env.local.example" "${WEB_DIR}/.env.local"
    echo "Created web/.env.local from .env.local.example"
  fi

  if [[ ! -d "${WEB_DIR}/node_modules" ]]; then
    echo "Installing frontend dependencies..."
    (cd "${WEB_DIR}" && npm install)
  fi
}

start_services() {
  local requested_backend_port="${BACKEND_PORT}"
  local requested_web_port="${WEB_PORT}"

  BACKEND_PORT="$(next_free_port "${BACKEND_PORT}")"
  WEB_PORT="$(next_free_port "${WEB_PORT}")"

  if [[ "${BACKEND_PORT}" != "${requested_backend_port}" ]]; then
    echo "Port ${requested_backend_port} is busy. Using backend port ${BACKEND_PORT}."
  fi
  if [[ "${WEB_PORT}" != "${requested_web_port}" ]]; then
    echo "Port ${requested_web_port} is busy. Using frontend port ${WEB_PORT}."
  fi

  echo "Starting backend on http://localhost:${BACKEND_PORT} ..."
  (
    cd "${BACKEND_DIR}"
    exec "${BACKEND_DIR}/.venv/bin/uvicorn" app.main:app --reload --port "${BACKEND_PORT}"
  ) &
  BACKEND_PID="$!"

  echo "Starting frontend on http://localhost:${WEB_PORT} ..."
  (
    cd "${WEB_DIR}"
    NEXT_PUBLIC_API_BASE="http://localhost:${BACKEND_PORT}" exec npm run dev -- --port "${WEB_PORT}"
  ) &
  WEB_PID="$!"

  echo
  echo "Interio is running:"
  echo "  Frontend: http://localhost:${WEB_PORT}"
  echo "  Backend:  http://localhost:${BACKEND_PORT}"
  echo
  echo "Press Ctrl+C to stop both services."

  while true; do
    if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
      echo "Backend process exited."
      break
    fi
    if ! kill -0 "${WEB_PID}" 2>/dev/null; then
      echo "Frontend process exited."
      break
    fi
    sleep 1
  done
}

require_command python3
require_command npm

bootstrap_backend
bootstrap_web
start_services
