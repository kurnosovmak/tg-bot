#!/usr/bin/env bash
set -euo pipefail

HOST="${HEALTH_HOST:-127.0.0.1}"
PORT="${HEALTH_PORT:-8080}"
BASE="http://${HOST}:${PORT}"

echo "Smoke: GET ${BASE}/health"
curl -fsS "${BASE}/health"
echo

echo "Smoke: GET ${BASE}/ready"
curl -fsS "${BASE}/ready"
echo

echo "Smoke: GET ${BASE}/metrics (first lines)"
curl -fsS "${BASE}/metrics" | head -25

echo "OK: smoke-staging HTTP checks passed."
