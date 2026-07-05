#!/bin/sh
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCS="$ROOT/docs"
OUT="$ROOT/client-dist"
ZIP="$OUT/web.zip"
MANIFEST="$OUT/manifest.json"
VERSION="$(node -e 'const p=require("./package.json"); console.log(p.version)')"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [ ! -f "$DOCS/index.html" ]; then
  echo "docs/index.html not found, run npm run build first" >&2
  exit 1
fi
rm -rf "$OUT"
mkdir -p "$OUT"
( cd "$DOCS" && zip -qr "$ZIP" . )
SHA="$(sha256sum "$ZIP" | awk '{print $1}')"
SIZE="$(wc -c < "$ZIP" | tr -d ' ')"
cat > "$MANIFEST" <<EOF
{
  "version": "$VERSION",
  "build": "$COMMIT",
  "builtAt": "$BUILD_TIME",
  "entry": "index.html",
  "zipUrl": "/api/client/web.zip",
  "sha256": "$SHA",
  "size": $SIZE,
  "required": true
}
EOF
printf 'client bundle ready: version=%s build=%s size=%s sha256=%s
' "$VERSION" "$COMMIT" "$SIZE" "$SHA"
