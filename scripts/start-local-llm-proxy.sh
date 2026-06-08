#!/usr/bin/env bash
set -euo pipefail

PROXY_DIR="${PROXY_DIR:-/tmp/llm-api-key-proxy}"
ENV_FILE="${ENV_FILE:-${PROXY_DIR}/.env}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"

if [[ ! -d "$PROXY_DIR" ]]; then
  git clone --depth 1 https://github.com/Mirrowel/LLM-API-Key-Proxy "$PROXY_DIR"
fi

if [[ ! -d "$PROXY_DIR/.venv" ]]; then
  uv venv --python /usr/bin/python3 "$PROXY_DIR/.venv"
fi

(
  cd "$PROXY_DIR"
  uv pip install --python "$PROXY_DIR/.venv/bin/python" -r requirements.txt
)

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing proxy env file: $ENV_FILE" >&2
  exit 1
fi

ln -sfn "$ENV_FILE" "$PROXY_DIR/.env"

cd "$PROXY_DIR"
set -a
. "$ENV_FILE"
set +a
exec "$PROXY_DIR/.venv/bin/python" src/proxy_app/main.py --host "$HOST" --port "$PORT"
