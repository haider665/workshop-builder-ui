#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${TARGET_DIR:-/var/www/work.cw.elfbd.com}"

cd "$APP_DIR"

echo "Building workshop-builder-ui..."
npm run build

echo "Replacing $TARGET_DIR..."
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp -a "$APP_DIR/dist/." "$TARGET_DIR/."
chmod -R u=rwX,go=rX "$TARGET_DIR"

test -f "$TARGET_DIR/index.html"

echo "Deploy complete:"
du -sh "$TARGET_DIR"
