#!/usr/bin/env bash
# 動画の描画に使うフォントと GSAP を assets/ に取得する
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p assets
for w in 300 400 500 700 900; do
  f="assets/noto-jp-$w.woff2"
  [ -s "$f" ] || curl -fsSL -o "$f" "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.19/files/noto-sans-jp-japanese-$w-normal.woff2"
done
[ -s assets/gsap.min.js ] || curl -fsSL -o assets/gsap.min.js https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js
echo "assets ready"
