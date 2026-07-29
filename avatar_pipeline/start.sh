#!/usr/bin/env bash
# image-3d と rig-service を起動して繋ぐ。
#
# image-3d 側に IMAGE3D_RIGSVC_URL を渡すのが要点で、これがあると生成完了ジョブに
# 「リグ/VRM化」ボタンが出る(上流 image-3d の Phase R4 連携)。
# 2つは HTTP だけで繋がる疎結合なので、片方だけ起動しても単体で使える。
#
# 使い方:
#   ./start.sh              # 両方を起動 (バックグラウンド)
#   ./start.sh --fg rig     # rig-service だけをフォアグラウンドで
#   ./start.sh --fg image   # image-3d だけをフォアグラウンドで
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOS_DIR="$SCRIPT_DIR/repos"
RUN_DIR="$SCRIPT_DIR/.run"

IMAGE3D_HOST="${IMAGE3D_HOST:-127.0.0.1}"
IMAGE3D_PORT="${IMAGE3D_PORT:-8020}"
RIGSVC_HOST="${RIGSVC_HOST:-127.0.0.1}"
RIGSVC_PORT="${RIGSVC_PORT:-8100}"
# auto: GPU と hy3dgen があれば hunyuan3d、無ければ mock 形状に自動で落ちる
IMAGE3D_GENERATOR="${IMAGE3D_GENERATOR:-auto}"
# auto: bpy モジュールが使えれば bpy、無ければ Blender CLI
RIGSVC_ENGINE="${RIGSVC_ENGINE:-auto}"
# image-3d から見た rig-service の位置。これが「リグ/VRM化」ボタンの有無を決める
IMAGE3D_RIGSVC_URL="${IMAGE3D_RIGSVC_URL:-http://${RIGSVC_HOST}:${RIGSVC_PORT}}"

FG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --fg) FG="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "不明な引数: $1" >&2; exit 2 ;;
  esac
done

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

[ -x "$REPOS_DIR/image-3d/.venv/bin/python" ] || die "image-3d の venv がありません。先に ./setup.sh を実行してください。"
[ -x "$REPOS_DIR/rig-service/.venv-rig/bin/python" ] || die "rig-service の venv がありません。先に ./setup.sh を実行してください。"

mkdir -p "$RUN_DIR"

start_image3d_fg() {
  cd "$REPOS_DIR/image-3d"
  export IMAGE3D_GENERATOR IMAGE3D_HOST IMAGE3D_PORT IMAGE3D_RIGSVC_URL
  exec .venv/bin/python -m uvicorn server.main:app --host "$IMAGE3D_HOST" --port "$IMAGE3D_PORT"
}

start_rig_fg() {
  cd "$REPOS_DIR/rig-service"
  export RIGSVC_ENGINE RIGSVC_HOST RIGSVC_PORT
  exec .venv-rig/bin/python -m uvicorn server.main:app --host "$RIGSVC_HOST" --port "$RIGSVC_PORT"
}

case "$FG" in
  image) start_image3d_fg ;;
  rig)   start_rig_fg ;;
  "")    ;;
  *)     die "--fg には image か rig を指定してください。" ;;
esac

# wait_health <url> <label> <tries>
# bpy の初期化に時間がかかるため、決め打ちの sleep ではなく health を見て待つ。
wait_health() {
  local url="$1" label="$2" tries="${3:-40}"
  for _ in $(seq 1 "$tries"); do
    if curl -sf -m 5 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "[error] $label が $url で応答しません。ログ: $RUN_DIR/${label}.log" >&2
  tail -20 "$RUN_DIR/${label}.log" >&2 || true
  return 1
}

log "rig-service を起動 (${RIGSVC_HOST}:${RIGSVC_PORT}, engine=${RIGSVC_ENGINE})"
(
  cd "$REPOS_DIR/rig-service"
  RIGSVC_ENGINE="$RIGSVC_ENGINE" RIGSVC_HOST="$RIGSVC_HOST" RIGSVC_PORT="$RIGSVC_PORT" \
    nohup .venv-rig/bin/python -m uvicorn server.main:app \
      --host "$RIGSVC_HOST" --port "$RIGSVC_PORT" > "$RUN_DIR/rig-service.log" 2>&1 &
  echo $! > "$RUN_DIR/rig-service.pid"
)

log "image-3d を起動 (${IMAGE3D_HOST}:${IMAGE3D_PORT}, generator=${IMAGE3D_GENERATOR})"
(
  cd "$REPOS_DIR/image-3d"
  IMAGE3D_GENERATOR="$IMAGE3D_GENERATOR" IMAGE3D_HOST="$IMAGE3D_HOST" IMAGE3D_PORT="$IMAGE3D_PORT" \
  IMAGE3D_RIGSVC_URL="$IMAGE3D_RIGSVC_URL" \
    nohup .venv/bin/python -m uvicorn server.main:app \
      --host "$IMAGE3D_HOST" --port "$IMAGE3D_PORT" > "$RUN_DIR/image-3d.log" 2>&1 &
  echo $! > "$RUN_DIR/image-3d.pid"
)

wait_health "http://${RIGSVC_HOST}:${RIGSVC_PORT}/api/health" rig-service
wait_health "http://${IMAGE3D_HOST}:${IMAGE3D_PORT}/api/health" image-3d

log "起動しました"
echo "  image-3d    http://${IMAGE3D_HOST}:${IMAGE3D_PORT}   $(curl -sf -m 5 "http://${IMAGE3D_HOST}:${IMAGE3D_PORT}/api/health")"
echo "  rig-service http://${RIGSVC_HOST}:${RIGSVC_PORT}   $(curl -sf -m 5 "http://${RIGSVC_HOST}:${RIGSVC_PORT}/api/health")"
echo
echo "ブラウザで http://${IMAGE3D_HOST}:${IMAGE3D_PORT} を開いてTポーズの立ち絵をアップロードしてください。"
echo "停止: ./stop.sh"
