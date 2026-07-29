#!/usr/bin/env bash
# /watch 動作確認用のサンプル動画を組み立てる。
# 6シーン・約39秒・1280x720。シーンごとに絵が変わるのでシーン検出が効き、
# 静止スライドが混ざるので dedup も効く。0:22 付近にだけエラーが出る。
set -euo pipefail

OUT="${1:-sample-demo.mp4}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

FONT=/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf
MONO=/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf
V="-c:v libx264 -pix_fmt yuv420p -r 30 -preset veryfast"
A="-c:a aac -b:a 96k -ar 44100"

# drawtext の text= はエスケープが面倒なので textfile= を使う
t() { printf '%s' "$2" > "$WORK/$1.txt"; echo "$WORK/$1.txt"; }

# --- 1) タイトル (0:00-0:06) ---
ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=0x101828:s=1280x720:d=6" \
  -f lavfi -i "sine=frequency=330:duration=6" \
  -vf "drawtext=fontfile=$FONT:textfile=$(t s1a 'Claude Video デモ'):fontsize=76:fontcolor=white:x=(w-tw)/2:y=250,
       drawtext=fontfile=$FONT:textfile=$(t s1b '/watch のテスト用サンプル動画'):fontsize=36:fontcolor=0x9aa4b2:x=(w-tw)/2:y=370,
       drawtext=fontfile=$MONO:textfile=$(t s1c 'scene 1 / 6'):fontsize=24:fontcolor=0x60a5fa:x=(w-tw)/2:y=450" \
  $V $A -shortest "$WORK/01.mp4"

# --- 2) 静止スライド (0:06-0:13) 箇条書きが順に出る ---
ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=0xf8fafc:s=1280x720:d=7" \
  -f lavfi -i "sine=frequency=392:duration=7" \
  -vf "drawtext=fontfile=$FONT:textfile=$(t s2h 'このスキルがやること'):fontsize=56:fontcolor=0x101828:x=110:y=110,
       drawbox=x=110:y=195:w=200:h=6:color=0x2563eb:t=fill,
       drawtext=fontfile=$FONT:textfile=$(t s2a '1. 字幕をまず無料で取りにいく'):fontsize=40:fontcolor=0x334155:x=140:y=280:enable='gte(t,1)',
       drawtext=fontfile=$FONT:textfile=$(t s2b '2. 画面が動いた瞬間のコマを抜く'):fontsize=40:fontcolor=0x334155:x=140:y=360:enable='gte(t,3)',
       drawtext=fontfile=$FONT:textfile=$(t s2c '3. 似た絵は捨ててトークンを節約'):fontsize=40:fontcolor=0x334155:x=140:y=440:enable='gte(t,5)'" \
  $V $A -shortest "$WORK/02.mp4"

# --- 3) ターミナル風 (0:13-0:20) ---
ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=0x0b0f19:s=1280x720:d=7" \
  -f lavfi -i "sine=frequency=440:duration=7" \
  -vf "drawbox=x=0:y=0:w=1280:h=54:color=0x1f2937:t=fill,
       drawtext=fontfile=$MONO:textfile=$(t s3t 'bash - watch demo'):fontsize=24:fontcolor=0x94a3b8:x=24:y=16,
       drawtext=fontfile=$MONO:textfile=$(t s3a '\$ python3 scripts/watch.py sample-demo.mp4'):fontsize=30:fontcolor=0x4ade80:x=60:y=140,
       drawtext=fontfile=$MONO:textfile=$(t s3b '[watch] using local file...'):fontsize=28:fontcolor=0xe2e8f0:x=60:y=210:enable='gte(t,1.5)',
       drawtext=fontfile=$MONO:textfile=$(t s3c '[watch] extracting scene frames...'):fontsize=28:fontcolor=0xe2e8f0:x=60:y=270:enable='gte(t,3)',
       drawtext=fontfile=$MONO:textfile=$(t s3d 'Frames: 24 selected from 61 candidates'):fontsize=28:fontcolor=0xe2e8f0:x=60:y=330:enable='gte(t,4.5)',
       drawtext=fontfile=$MONO:textfile=$(t s3e 'Duration: 00:39   Detail: balanced'):fontsize=28:fontcolor=0xfbbf24:x=60:y=390:enable='gte(t,5.5)'" \
  $V $A -shortest "$WORK/03.mp4"

# --- 4) 不具合シーン (0:20-0:26) 22秒あたりでエラーが出る ---
ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=0x0b0f19:s=1280x720:d=6" \
  -f lavfi -i "sine=frequency=220:duration=6" \
  -vf "drawbox=x=0:y=0:w=1280:h=54:color=0x1f2937:t=fill,
       drawtext=fontfile=$MONO:textfile=$(t s4t 'bash - watch demo'):fontsize=24:fontcolor=0x94a3b8:x=24:y=16,
       drawtext=fontfile=$MONO:textfile=$(t s4a '\$ python3 scripts/watch.py https://youtu.be/xxxx'):fontsize=28:fontcolor=0x4ade80:x=60:y=140,
       drawbox=x=60:y=240:w=1160:h=170:color=0x7f1d1d:t=fill:enable='gte(t,2)',
       drawtext=fontfile=$MONO:textfile=$(t s4b 'ERROR 429: Too Many Requests'):fontsize=40:fontcolor=0xfecaca:x=100:y=275:enable='gte(t,2)',
       drawtext=fontfile=$MONO:textfile=$(t s4c 'yt-dlp: Sign in to confirm you are not a bot'):fontsize=26:fontcolor=0xfca5a5:x=100:y=345:enable='gte(t,2)',
       drawtext=fontfile=$FONT:textfile=$(t s4d 'クラウド環境ではここで止まる'):fontsize=32:fontcolor=0x94a3b8:x=60:y=470:enable='gte(t,3.5)'" \
  $V $A -shortest "$WORK/04.mp4"

# --- 5) 棒グラフ (0:26-0:33) 伸びるバー ---
ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=0xffffff:s=1280x720:d=7" \
  -f lavfi -i "sine=frequency=523:duration=7" \
  -vf "drawtext=fontfile=$FONT:textfile=$(t s5h '検出モード別のフレーム数'):fontsize=48:fontcolor=0x101828:x=110:y=80,
       drawbox=x=110:y=620:w=1060:h=4:color=0xcbd5e1:t=fill,
       drawbox=x=200:y='620-min(t*40\,120)':w=150:h='min(t*40\,120)':color=0x93c5fd:t=fill,
       drawbox=x=470:y='620-min(t*90\,300)':w=150:h='min(t*90\,300)':color=0x60a5fa:t=fill,
       drawbox=x=740:y='620-min(t*120\,400)':w=150:h='min(t*120\,400)':color=0x2563eb:t=fill,
       drawtext=fontfile=$MONO:textfile=$(t s5a 'efficient'):fontsize=28:fontcolor=0x475569:x=200:y=640,
       drawtext=fontfile=$MONO:textfile=$(t s5b 'balanced'):fontsize=28:fontcolor=0x475569:x=470:y=640,
       drawtext=fontfile=$MONO:textfile=$(t s5c 'token-burner'):fontsize=28:fontcolor=0x475569:x=740:y=640,
       drawtext=fontfile=$MONO:textfile=$(t s5d '50'):fontsize=32:fontcolor=0x101828:x=245:y=470:enable='gte(t,3.5)',
       drawtext=fontfile=$MONO:textfile=$(t s5e '100'):fontsize=32:fontcolor=0x101828:x=505:y=280:enable='gte(t,3.9)',
       drawtext=fontfile=$MONO:textfile=$(t s5f '116'):fontsize=32:fontcolor=0x101828:x=775:y=180:enable='gte(t,4.3)'" \
  $V $A -shortest "$WORK/05.mp4"

# --- 6) まとめ (0:33-0:39) ---
ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=0x101828:s=1280x720:d=6" \
  -f lavfi -i "sine=frequency=659:duration=6" \
  -vf "drawtext=fontfile=$FONT:textfile=$(t s6a 'まとめ'):fontsize=64:fontcolor=white:x=(w-tw)/2:y=220,
       drawtext=fontfile=$FONT:textfile=$(t s6b '見た人の説明ではなく、見た本人の答え'):fontsize=38:fontcolor=0x60a5fa:x=(w-tw)/2:y=340,
       drawtext=fontfile=$MONO:textfile=$(t s6c 'github.com/bradautomates/claude-video'):fontsize=26:fontcolor=0x9aa4b2:x=(w-tw)/2:y=440" \
  $V $A -shortest "$WORK/06.mp4"

# --- 連結 ---
for f in 01 02 03 04 05 06; do echo "file '$WORK/$f.mp4'"; done > "$WORK/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$WORK/list.txt" -c copy "$OUT"

ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height \
  -of default=noprint_wrappers=1 "$OUT"
echo "OK -> $OUT"
