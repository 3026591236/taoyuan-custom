#!/usr/bin/env bash
set -Eeuo pipefail

MODE="dry-run"
USE_EXISTING=0
for arg in "$@"; do
  case "$arg" in
    --apply) MODE="apply" ;;
    --dry-run) MODE="dry-run" ;;
    --from-existing) USE_EXISTING=1 ;;
    *) echo "Usage: $0 [--dry-run|--apply] [--from-existing]" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="${TAOYUAN_FRONTEND:-/opt/taoyuan-frontend}"
BACKEND="${TAOYUAN_BACKEND:-/opt/taoyuan-backend/index.mjs}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
KEEP_DAYS="${KEEP_DAYS:-7}"
BUILD_DIR="$(mktemp -d /tmp/taoyuan-build.XXXXXX)"
trap 'rm -rf "$BUILD_DIR"' EXIT

cd "$ROOT"
if (( USE_EXISTING )); then
  echo "[1/6] Verify existing build from $ROOT/docs"
  rm -rf "$BUILD_DIR"
  BUILD_DIR="$ROOT/docs"
  trap - EXIT
  npx vue-tsc -b --noEmit
  node --check backend/index.mjs
else
  echo "[1/6] Type-check and full deterministic build -> $BUILD_DIR"
  npx vue-tsc -b --noEmit
  npx vite build --outDir "$BUILD_DIR" --emptyOutDir
  node --check backend/index.mjs
fi

python3 - "$BUILD_DIR" <<'PY'
from pathlib import Path
import re, sys
root = Path(sys.argv[1])
html = (root / "index.html").read_text(encoding="utf-8")
refs = sorted(set(re.findall(r'(?:\./|/)assets/([^\"\'<>]+)', html)))
missing = [name for name in refs if not (root / "assets" / name).is_file()]
if missing:
    raise SystemExit("index.html references missing assets: " + ", ".join(missing))
print(f"verified index.html entry assets: {len(refs)}")
PY

mkdir -p "$FRONTEND/assets"
echo "[2/6] Frontend delta preview"
rsync -ani --ignore-existing "$BUILD_DIR/assets/" "$FRONTEND/assets/" | sed -n '1,80p'
NEW_COUNT="$(rsync -ani --ignore-existing "$BUILD_DIR/assets/" "$FRONTEND/assets/" | grep -c '^>f' || true)"
NEW_BYTES="$(comm -23 <(find "$BUILD_DIR/assets" -maxdepth 1 -type f -printf '%f\n' | sort) <(find "$FRONTEND/assets" -maxdepth 1 -type f -printf '%f\n' | sort) | while IFS= read -r f; do [[ -n "$f" ]] && stat -c %s "$BUILD_DIR/assets/$f"; done | awk '{s+=$1} END{print s+0}')"
echo "new assets: $NEW_COUNT files, $NEW_BYTES bytes"

BACKEND_CHANGED=0
cmp -s backend/index.mjs "$BACKEND" || BACKEND_CHANGED=1
echo "[3/6] Backend changed: $BACKEND_CHANGED"

if [[ "$MODE" == "dry-run" ]]; then
  echo "DRY RUN complete. No production files changed."
  exit 0
fi

echo "[4/6] Upload immutable assets, then atomically switch entry"
rsync -a --ignore-existing "$BUILD_DIR/assets/" "$FRONTEND/assets/"
rsync -a --exclude assets --exclude index.html --exclude downloads "$BUILD_DIR/" "$FRONTEND/"
INDEX_TMP="$FRONTEND/.index.html.new.$$"
install -m 0644 "$BUILD_DIR/index.html" "$INDEX_TMP"
mv -f "$INDEX_TMP" "$FRONTEND/index.html"

MANIFEST_DIR="$FRONTEND/.release-manifests"
mkdir -p "$MANIFEST_DIR"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short=12 HEAD 2>/dev/null || echo nogit)"
find "$BUILD_DIR/assets" -maxdepth 1 -type f -printf '%f\n' | sort > "$MANIFEST_DIR/$RELEASE_ID.assets"
mapfile -t OLD_MANIFESTS < <(find "$MANIFEST_DIR" -maxdepth 1 -type f -name '*.assets' -printf '%T@ %p\n' | sort -nr | tail -n +$((KEEP_RELEASES + 1)) | cut -d' ' -f2-)
((${#OLD_MANIFESTS[@]} == 0)) || rm -f -- "${OLD_MANIFESTS[@]}"

PROTECTED="$(mktemp)"
find "$MANIFEST_DIR" -maxdepth 1 -type f -name '*.assets' -exec cat {} + | sort -u > "$PROTECTED"
CLEANUP_LOG="$MANIFEST_DIR/$RELEASE_ID.cleanup"
: > "$CLEANUP_LOG"
while IFS= read -r -d '' file; do
  name="${file##*/}"
  if ! grep -Fxq -- "$name" "$PROTECTED"; then
    printf '%s\n' "$name" >> "$CLEANUP_LOG"
    rm -f -- "$file"
  fi
done < <(find "$FRONTEND/assets" -maxdepth 1 -type f -mtime "+$KEEP_DAYS" -print0)
rm -f "$PROTECTED"
echo "removed expired unreferenced assets: $(wc -l < "$CLEANUP_LOG")"

if (( BACKEND_CHANGED )); then
  echo "[5/6] Install changed backend and graceful PM2 reload"
  sudo install -m 0644 backend/index.mjs "$BACKEND"
  pm2 reload taoyuan-api --update-env
  pm2 save >/dev/null
else
  echo "[5/6] Backend unchanged; PM2 untouched"
fi

echo "[6/6] Verify"
curl -fsS -o /dev/null http://127.0.0.1:3001/api/config
curl -fsS -o /dev/null https://taoyuan.9l1.cn/
python3 - "$FRONTEND" <<'PY'
from pathlib import Path
import re, sys
root = Path(sys.argv[1])
html = (root / "index.html").read_text(encoding="utf-8")
missing = [name for name in set(re.findall(r'(?:\./|/)assets/([^\"\'<>]+)', html)) if not (root / "assets" / name).is_file()]
if missing:
    raise SystemExit("deployed index has missing assets: " + ", ".join(sorted(missing)))
print("deployed entry and assets verified")
PY
echo "Incremental deployment complete: $RELEASE_ID"
