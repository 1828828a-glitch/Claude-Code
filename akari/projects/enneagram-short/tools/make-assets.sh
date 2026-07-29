#!/usr/bin/env bash
# 背景素材（AKARI の sources[]）を ffmpeg で生成する。
# 実写素材の代わりに、決定的に再生成できるアニメーショングラデーションを使う。
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="$here/assets"
mkdir -p "$out"

FFMPEG="${FFMPEG:-ffmpeg}"
W=1080
H=1920
FPS=30

# $1: 出力ファイル名 / $2: 秒数 / $3: 開始色 / $4: 終了色 / $5: グラデーション速度
gradient_clip() {
  local name="$1" dur="$2" c0="$3" c1="$4" speed="$5"
  "$FFMPEG" -y -v error \
    -f lavfi -i "gradients=s=${W}x${H}:c0=${c0}:c1=${c1}:x0=0:y0=0:x1=${W}:y1=${H}:d=${dur}:speed=${speed}:seed=7:r=${FPS}" \
    -t "$dur" \
    -vf "noise=alls=6:allf=t+u:all_seed=7,vignette=PI/5" \
    -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r "$FPS" \
    "$out/$name"
  echo "generated: $out/$name (${dur}s)"
}

# 深い藍 → 紫（フック）
gradient_clip bg-hook.mp4 6 0x0d1030 0x2a1b4d 0.015
# 藍 → 青緑（本編）
gradient_clip bg-body.mp4 13 0x101a38 0x123f47 0.010
# 紫 → 琥珀寄りの暗色（結果・CTA）
gradient_clip bg-cta.mp4 10 0x22143c 0x4a2a12 0.012

echo "done."
