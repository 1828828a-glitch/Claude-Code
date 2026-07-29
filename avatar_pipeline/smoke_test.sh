#!/usr/bin/env bash
# smoke_test.py を image-3d の venv で実行する(httpx と Pillow がそこに入っている)。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="$SCRIPT_DIR/repos/image-3d/.venv/bin/python"

[ -x "$PY" ] || { echo "[error] image-3d の venv がありません。先に ./setup.sh を実行してください。" >&2; exit 1; }

exec "$PY" "$SCRIPT_DIR/smoke_test.py" "$@"
