#!/usr/bin/env bash
# image-3d と rig-service をバックグラウンド起動して疎通確認する。
# 停止は ./avatar-pipeline/run.sh stop
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repos="$here/repos"
out="$here/out"
mkdir -p "$out"

IMAGE3D_PORT="${IMAGE3D_PORT:-8000}"
RIGSVC_PORT="${RIGSVC_PORT:-8100}"

stop() {
  for name in image3d rigsvc; do
    if [ -f "$out/$name.pid" ]; then
      kill "$(cat "$out/$name.pid")" 2>/dev/null || true
      rm -f "$out/$name.pid"
      echo "stopped: $name"
    fi
  done
}

[ "${1:-}" = "stop" ] && { stop; exit 0; }

[ -d "$repos/image-3d/.venv" ] || { echo "先に ./avatar-pipeline/setup.sh を実行してください。" >&2; exit 1; }

wait_health() { # $1 URL / $2 label
  for _ in $(seq 1 30); do
    if curl -sS --max-time 5 "$1" >/dev/null 2>&1; then
      echo "  $2: $(curl -sS --max-time 5 "$1")"
      return 0
    fi
    sleep 2
  done
  echo "  ! $2 が起動しません。ログ: $out/" >&2
  return 1
}

stop

# exec でサブシェルを置き換える。こうしないと親の bash が残り、
# 呼び出し側の標準出力を掴んだままになる（`run.sh | tail` が返らなくなる）。
# image-3d: GPU と hy3dgen があれば hunyuan3d、無ければ mock に自動フォールバック
(
  cd "$repos/image-3d"
  export IMAGE3D_GENERATOR="${IMAGE3D_GENERATOR:-auto}"
  export IMAGE3D_RIGSVC_URL="${IMAGE3D_RIGSVC_URL:-http://127.0.0.1:$RIGSVC_PORT}"
  exec .venv/bin/python -m uvicorn server.main:app --host 127.0.0.1 --port "$IMAGE3D_PORT"
) > "$out/image3d.log" 2>&1 < /dev/null &
echo $! > "$out/image3d.pid"

# rig-service: bpy が入っていれば bpy エンジン
(
  cd "$repos/rig-service"
  export RIGSVC_ENGINE="${RIGSVC_ENGINE:-auto}"
  exec .venv-rig/bin/python -m uvicorn server.main:app --host 127.0.0.1 --port "$RIGSVC_PORT"
) > "$out/rigsvc.log" 2>&1 < /dev/null &
echo $! > "$out/rigsvc.pid"

echo "==> 起動待ち"
wait_health "http://127.0.0.1:$IMAGE3D_PORT/api/health" "image-3d"
wait_health "http://127.0.0.1:$RIGSVC_PORT/api/health" "rig-service"

echo
echo "Web UI: http://127.0.0.1:$IMAGE3D_PORT"
echo "停止:   ./avatar-pipeline/run.sh stop"
