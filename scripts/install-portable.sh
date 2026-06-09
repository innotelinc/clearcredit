#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${1:-$HOME/.local/share/clearcredit}"

mkdir -p "$TARGET_DIR"
rsync -a --delete \
  --exclude '.env' \
  --exclude 'logs' \
  "$SOURCE_DIR/" "$TARGET_DIR/"

if [[ ! -f "$TARGET_DIR/.env" && -f "$TARGET_DIR/.env.example" ]]; then
  cp "$TARGET_DIR/.env.example" "$TARGET_DIR/.env"
fi

chmod +x "$TARGET_DIR/scripts/run-portable.sh" "$TARGET_DIR/scripts/install-portable.sh"

echo "Installed ClearCredit to $TARGET_DIR"
echo "Next steps:"
echo "  1. Edit $TARGET_DIR/.env"
echo "  2. Start with: cd $TARGET_DIR && ./scripts/run-portable.sh"
echo "  3. Optional systemd install: cd $TARGET_DIR && sudo ./scripts/install-portable-service.sh"
