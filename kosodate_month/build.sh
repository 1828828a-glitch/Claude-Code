#!/usr/bin/env bash
# かながわこども・子育て支援月間リール：映像の書き出し → BGM・効果音の合成 → 合成して mp4
set -euo pipefail
cd "$(dirname "$0")"

NODE_PATH="$(npm root -g)" node render.cjs reel.html
python3 make_audio.py
# 合成直後は約 -14.7 LUFS なので、Web 向けに -16〜-17 LUFS 前後へ下げる（キッズサポーター版とそろえる）
ffmpeg -y -loglevel error -i build/reel/video.mp4 -i build/reel/audio.wav \
  -map 0:v -map 1:a -c:v copy -af volume=-2dB -c:a aac -b:a 192k -ar 48000 \
  -shortest -movflags +faststart kosodate_month_reel.mp4
ffmpeg -y -loglevel error -i build/reel/audio.wav -af volume=-2dB -c:a aac -b:a 160k -ar 48000 kosodate_month_reel_audio.m4a
cp build/reel/cover.jpg kosodate_month_reel_cover.jpg
