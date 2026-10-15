#!/usr/bin/env bash
# 映像の書き出し → BGM・効果音の合成 → 合成して mp4 → 絵コンテ、を順に行う。
set -euo pipefail
cd "$(dirname "$0")"

NODE_PATH="$(npm root -g)" node render.cjs
python3 make_audio.py
# 合成直後は約 -12 LUFS なので、Web 向けに -16 LUFS 前後へ下げる
ffmpeg -y -loglevel error -i build/video.mp4 -i build/audio.wav \
  -map 0:v -map 1:a -c:v copy -af volume=-4dB -c:a aac -b:a 192k -ar 48000 \
  -shortest -movflags +faststart kids_supporter_cm.mp4
ffmpeg -y -loglevel error -i build/audio.wav -af volume=-4dB -c:a aac -b:a 160k -ar 48000 kids_supporter_cm_audio.m4a
python3 build_storyboard.py
