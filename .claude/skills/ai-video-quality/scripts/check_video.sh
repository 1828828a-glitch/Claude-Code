#!/usr/bin/env bash
# Usage: check_video.sh final.mp4 [expected_seconds]
set -euo pipefail
f="$1"; exp="${2:-}"
echo "== format =="
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of compact "$f"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
if [ -n "$exp" ]; then echo "duration ${dur}s (expected ${exp}s)"; fi
if ! ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" | grep -q .; then echo "WARN: no audio track"; fi
echo "== silence (>1.5s, -45dB) =="
ffmpeg -hide_banner -nostats -i "$f" -af silencedetect=n=-45dB:d=1.5 -f null - 2>&1 | grep -E "silence_(start|end)" || echo "none"
echo "== black frames (>0.5s) =="
ffmpeg -hide_banner -nostats -i "$f" -vf blackdetect=d=0.5:pix_th=0.10 -an -f null - 2>&1 | grep blackdetect || echo "none"
echo "== contact sheet: ${f%.*}_sheet.jpg =="
ffmpeg -v error -y -i "$f" -vf "fps=1,scale=180:-1,tile=10x5" -frames:v 1 "${f%.*}_sheet.jpg"
