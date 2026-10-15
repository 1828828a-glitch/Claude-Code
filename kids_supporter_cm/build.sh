#!/usr/bin/env bash
# 映像の書き出し → BGM・効果音の合成 → 合成して mp4 → 絵コンテ、を順に行う。
#   ./build.sh          … 30秒版とリール版の両方
#   ./build.sh reel     … リール版だけ（cm30 も指定できる）
set -euo pipefail
cd "$(dirname "$0")"

build_one() {
  local page=$1 name=$2 out=$3
  NODE_PATH="$(npm root -g)" node render.cjs "$page"
  python3 make_audio.py "$name"
  # 合成直後は約 -12 LUFS なので、Web 向けに -16 LUFS 前後へ下げる
  ffmpeg -y -loglevel error -i "build/$name/video.mp4" -i "build/$name/audio.wav" \
    -map 0:v -map 1:a -c:v copy -af volume=-4dB -c:a aac -b:a 192k -ar 48000 \
    -shortest -movflags +faststart "$out.mp4"
  ffmpeg -y -loglevel error -i "build/$name/audio.wav" -af volume=-4dB -c:a aac -b:a 160k -ar 48000 "${out}_audio.m4a"
  if [ -f "build/$name/cover.jpg" ]; then cp "build/$name/cover.jpg" "${out}_cover.jpg"; fi
}

case "${1:-all}" in
  cm30) build_one index.html cm30 kids_supporter_cm ;;
  reel) build_one reel.html reel kids_supporter_reel ;;
  all)  build_one index.html cm30 kids_supporter_cm; build_one reel.html reel kids_supporter_reel ;;
esac
python3 build_storyboard.py
