#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="${HOME}/.cache/clearcredit/llm-api-key-proxy"
SERVICE_DIR="${HOME}/.config/systemd/user"
CONFIG_DIR="${HOME}/.config/clearcredit"
ENV_FILE="${CONFIG_DIR}/llm-proxy.env"
UNIT_NAME="clearcredit-llm-proxy.service"

mkdir -p "$CACHE_DIR" "$SERVICE_DIR" "$CONFIG_DIR"

if [[ ! -d "$CACHE_DIR/.git" ]]; then
  git clone --depth 1 https://github.com/Mirrowel/LLM-API-Key-Proxy "$CACHE_DIR"
else
  git -C "$CACHE_DIR" pull --ff-only
fi

if [[ ! -d "$CACHE_DIR/.venv" ]]; then
  uv venv --python /usr/bin/python3 "$CACHE_DIR/.venv"
fi

(
  cd "$CACHE_DIR"
  uv pip install --python "$CACHE_DIR/.venv/bin/python" -r requirements.txt
)

if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<'EOF'
PROXY_API_KEY=replace-with-random-proxy-key
OPENROUTER_API_KEY_1=replace-with-openrouter-key
SKIP_OAUTH_INIT_CHECK=true
OPENROUTER_API_BASE=https://openrouter.ai/api/v1
EOF
fi

ln -sfn "$ENV_FILE" "$CACHE_DIR/.env"

install -m 0644 "$REPO_DIR/ops/systemd/$UNIT_NAME" "$SERVICE_DIR/$UNIT_NAME"

echo "Installed $UNIT_NAME to $SERVICE_DIR"
echo "Config file: $ENV_FILE"
echo "If your environment supports a user bus, enable with:"
echo "  systemctl --user daemon-reload"
echo "  systemctl --user enable --now $UNIT_NAME"
