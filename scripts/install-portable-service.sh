#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTALL_DIR="$(cd "$APP_ROOT" && pwd)"
SERVICE_NAME="${SERVICE_NAME:-clearcredit}"
SERVICE_USER="${SERVICE_USER:-${SUDO_USER:-$USER}}"
SERVICE_GROUP="${SERVICE_GROUP:-$(id -gn "$SERVICE_USER")}" 
UNIT_TEMPLATE="$APP_ROOT/ops/systemd/clearcredit-portable.service"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
UNIT_PATH="$SYSTEMD_DIR/${SERVICE_NAME}.service"
ACTIVATE_SERVICE="${ACTIVATE_SERVICE:-1}"

if [[ ! -f "$UNIT_TEMPLATE" ]]; then
  echo "Missing unit template: $UNIT_TEMPLATE" >&2
  exit 1
fi

if [[ "$SYSTEMD_DIR" == "/etc/systemd/system" && ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run as root (for example: sudo ./scripts/install-portable-service.sh), or set SYSTEMD_DIR for a dry run/test install." >&2
  exit 1
fi

mkdir -p "$SYSTEMD_DIR"
sed \
  -e "s|__INSTALL_DIR__|$INSTALL_DIR|g" \
  -e "s|__SERVICE_USER__|$SERVICE_USER|g" \
  -e "s|__SERVICE_GROUP__|$SERVICE_GROUP|g" \
  "$UNIT_TEMPLATE" > "$UNIT_PATH"

if [[ "$SYSTEMD_DIR" == "/etc/systemd/system" && "$ACTIVATE_SERVICE" == "1" ]]; then
  systemctl daemon-reload
  systemctl enable --now "$SERVICE_NAME"
  systemctl status "$SERVICE_NAME" --no-pager || true
  echo "Installed and started systemd service: $UNIT_PATH"
  echo "Manage with: sudo systemctl restart $SERVICE_NAME && sudo systemctl status $SERVICE_NAME"
else
  echo "Wrote service file to: $UNIT_PATH"
  echo "To activate later: sudo cp '$UNIT_PATH' /etc/systemd/system/${SERVICE_NAME}.service && sudo systemctl daemon-reload && sudo systemctl enable --now $SERVICE_NAME"
fi
