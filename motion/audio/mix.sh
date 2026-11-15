#!/bin/bash
# 声を narration.json の時刻に並べ、BGM を声の下で下げて混ぜ、映像に付ける。
# 使い方: audio/mix.sh 映像.mp4 声のフォルダ bgm.wav 出力.mp4
# 声は gen.py、BGM は bgm.py で作る。gen.py には torch と style-bert-vits2 が要る。
set -euo pipefail
video="$1"; wav="$2"; bgm="$3"; out="$4"; dur=70.5
ffmpeg -v error -y -i "$video" \
  -i "$wav/n0.wav" -i "$wav/n1.wav" -i "$wav/n2.wav" -i "$wav/n3.wav" -i "$wav/n4.wav" -i "$wav/n5.wav" -i "$bgm" \
  -filter_complex "[1]adelay=1700:all=1[a0];[2]adelay=8300:all=1[a1];[3]adelay=23900:all=1[a2];[4]adelay=36600:all=1[a3];[5]adelay=55400:all=1[a4];[6]adelay=64200:all=1[a5];[a0][a1][a2][a3][a4][a5]amix=inputs=6:normalize=0,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=4,aformat=channel_layouts=stereo,apad=whole_dur=$dur,asplit=2[v][vk];[7][vk]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=500[b];[b]volume=0.55[bq];[v][bq]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,atrim=0:$dur[out]" \
  -map 0:v -map "[out]" -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$out"
