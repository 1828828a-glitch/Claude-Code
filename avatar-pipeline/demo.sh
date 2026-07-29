#!/usr/bin/env bash
# 画像 → 3Dモデル → 自動リグ → VRM を一本で通すデモ。
# 使い方: ./avatar-pipeline/demo.sh [入力画像]
#   画像を省略すると samples/tpose.png（Tポーズのシルエット）を使う。
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="$here/out"
mkdir -p "$out"

IMAGE3D="http://127.0.0.1:${IMAGE3D_PORT:-8000}"
RIGSVC="http://127.0.0.1:${RIGSVC_PORT:-8100}"
input="${1:-$here/samples/tpose.png}"

[ -f "$input" ] || { echo "入力画像がありません: $input" >&2; exit 1; }
curl -sS --max-time 10 "$IMAGE3D/api/health" >/dev/null || { echo "image-3d が起動していません。./avatar-pipeline/run.sh を実行してください。" >&2; exit 1; }
curl -sS --max-time 10 "$RIGSVC/api/health"  >/dev/null || { echo "rig-service が起動していません。./avatar-pipeline/run.sh を実行してください。" >&2; exit 1; }

jq_field() { python3 -c "import json,sys;print(json.load(sys.stdin).get('$1') or '')"; }

poll() { # $1 ジョブURL / $2 ラベル
  for _ in $(seq 1 120); do
    local body status
    body="$(curl -sS --max-time 20 "$1")"
    status="$(printf '%s' "$body" | jq_field status)"
    case "$status" in
      completed) echo "  $2: completed"; return 0 ;;
      failed)    echo "  $2: failed — $(printf '%s' "$body" | jq_field error)" >&2; return 1 ;;
      *)         sleep 2 ;;
    esac
  done
  echo "  $2: タイムアウト" >&2
  return 1
}

echo "==> 使用中のジェネレータ"
curl -sS --max-time 10 "$IMAGE3D/api/health"; echo

echo "==> 1/3 画像から3Dモデルを生成: $(basename "$input")"
job="$(curl -sS --max-time 120 -F "image=@$input" "$IMAGE3D/api/jobs" | jq_field job_id)"
[ -n "$job" ] || { echo "ジョブ作成に失敗" >&2; exit 1; }
poll "$IMAGE3D/api/jobs/$job" "image-3d"
for fmt in glb stl; do
  curl -sS --max-time 120 -o "$out/model.$fmt" "$IMAGE3D/api/jobs/$job/download?format=$fmt"
  echo "  -> out/model.$fmt ($(stat -c%s "$out/model.$fmt") bytes)"
done

echo "==> 2/3 自動リグ + VRM 化"
rig="$(curl -sS --max-time 120 -F "model=@$out/model.glb" "$RIGSVC/api/rig" | jq_field job_id)"
[ -n "$rig" ] || { echo "リグジョブ作成に失敗" >&2; exit 1; }
poll "$RIGSVC/api/rig/jobs/$rig" "rig-service"
for fmt in glb vrm; do
  curl -sS --max-time 180 -o "$out/rigged.$fmt" "$RIGSVC/api/rig/jobs/$rig/download?format=$fmt"
  echo "  -> out/rigged.$fmt ($(stat -c%s "$out/rigged.$fmt") bytes)"
done

echo "==> 3/3 プレビュー画像"
curl -sS --max-time 240 -o "$out/preview.png" "$RIGSVC/api/rig/jobs/$rig/preview.png"
echo "  -> out/preview.png ($(stat -c%s "$out/preview.png") bytes)"

echo
echo "完了。out/ に model.glb / rigged.glb / rigged.vrm / preview.png が出ています。"
echo "同梱モーション一覧: curl -s $RIGSVC/api/motions"
