#!/bin/bash
# 使い方: ./build.sh a   → out/a.mp4
set -e
cd "$(dirname "$0")"
v=$1
./fetch_fonts.sh
node render.js "$v"
python3 audio.py "out/${v}_cues.json" "out/${v}_audio.wav"
ffmpeg -y -loglevel error -i "out/${v}_video.mp4" -i "out/${v}_audio.wav" -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest "out/${v}.mp4"
echo "built out/${v}.mp4"
