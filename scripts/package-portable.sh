#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_NAME="clearcredit"
VERSION="$(node -p "require('./package.json').version")"
BUNDLE_DIR="$ROOT_DIR/dist/${APP_NAME}-${VERSION}"
TAR_PATH="$ROOT_DIR/dist/${APP_NAME}-${VERSION}-portable.tar.gz"
ZIP_PATH="$ROOT_DIR/dist/${APP_NAME}-${VERSION}-portable.zip"
SHA_PATH="$ROOT_DIR/dist/${APP_NAME}-${VERSION}-SHA256SUMS.txt"

rm -rf "$ROOT_DIR/dist"
mkdir -p "$BUNDLE_DIR/.next" "$BUNDLE_DIR/scripts" "$BUNDLE_DIR/prisma"

npx prisma generate
npx prisma db push
npm run build:portable

if [[ ! -d ".next/standalone" ]]; then
  echo "Standalone output not found. Ensure next.config.ts sets output=standalone." >&2
  exit 1
fi

cp -R .next/standalone/. "$BUNDLE_DIR/"
rm -f "$BUNDLE_DIR/.env"
cp -R .next/static "$BUNDLE_DIR/.next/static"
if [[ -d public ]]; then cp -R public "$BUNDLE_DIR/public"; fi

cp README.md LICENSE .env.example package.json "$BUNDLE_DIR/"
cp prisma/schema.prisma prisma/seed.js "$BUNDLE_DIR/prisma/"
cp scripts/run-portable.sh scripts/install-portable.sh "$BUNDLE_DIR/scripts/"
chmod +x "$BUNDLE_DIR/scripts/run-portable.sh" "$BUNDLE_DIR/scripts/install-portable.sh"
printf '%s\n' "$VERSION" > "$BUNDLE_DIR/VERSION"

TAR_NAME="$(basename "$TAR_PATH")"
ZIP_NAME="$(basename "$ZIP_PATH")"
(
  cd "$ROOT_DIR/dist"
  tar -czf "$TAR_NAME" "${APP_NAME}-${VERSION}"
)
python3 - <<'PY'
import pathlib, zipfile
root = pathlib.Path('dist')
version = pathlib.Path('dist').glob('clearcredit-*')
# pick directory only
bundle = next(p for p in root.iterdir() if p.is_dir())
zip_path = root / f"{bundle.name}-portable.zip"
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for path in bundle.rglob('*'):
        zf.write(path, path.relative_to(root))
PY
(
  cd "$ROOT_DIR/dist"
  sha256sum "$(basename "$TAR_PATH")" "$(basename "$ZIP_PATH")" > "$SHA_PATH"
)

echo "Created portable artifacts:"
echo "  $TAR_PATH"
echo "  $ZIP_PATH"
echo "  $SHA_PATH"
