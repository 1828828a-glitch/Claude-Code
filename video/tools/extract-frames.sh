#!/usr/bin/env bash
#
# 参考動画からフレームを抜き出して、Claude に「雰囲気」を学習させるためのツール。
#
# 動画は結局フレームの集まりなので、真似したいアニメーションがあるときは
# 言葉で説明するより、フレームを並べて見せた方が圧倒的に速く正確に伝わる。
#
# 使い方:
#   ./tools/extract-frames.sh <URL または動画ファイル> [出力先] [枚数]
#
# 例:
#   ./tools/extract-frames.sh "https://www.youtube.com/watch?v=xxxx" refs/opening 40
#   ./tools/extract-frames.sh ~/Downloads/sample.mp4
#
# 出力:
#   <出力先>/frame-001.jpg ...   個別フレーム
#   <出力先>/contact-sheet.jpg   全フレームを1枚に並べたコンタクトシート
#
# 必要なもの: ffmpeg（URL を渡す場合は yt-dlp も）
set -euo pipefail

SOURCE="${1:-}"
OUT_DIR="${2:-refs/$(date +%Y%m%d-%H%M%S)}"
FRAME_COUNT="${3:-32}"

if [[ -z "$SOURCE" ]]; then
  # 先頭のコメントブロックをそのまま使い方として出す
  awk 'NR > 1 { if (!/^#/) exit; sub(/^# ?/, ""); print }' "$0"
  exit 1
fi

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "エラー: $1 が見つかりません。" >&2
    echo "  macOS:  brew install $2" >&2
    echo "  Ubuntu: sudo apt install $2" >&2
    exit 1
  fi
}

need ffmpeg ffmpeg
need ffprobe ffmpeg

mkdir -p "$OUT_DIR"

# URL なら一旦ダウンロードする
VIDEO="$SOURCE"
TMP_DIR=""
if [[ "$SOURCE" =~ ^https?:// ]]; then
  need yt-dlp yt-dlp
  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "$TMP_DIR"' EXIT
  echo "▸ ダウンロード中: $SOURCE"
  # 1080p 以下に抑える（フレーム抽出には十分で、DL が速い）
  yt-dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" \
    -o "$TMP_DIR/source.%(ext)s" "$SOURCE"
  VIDEO="$(find "$TMP_DIR" -type f -name 'source.*' | head -1)"
fi

if [[ ! -f "$VIDEO" ]]; then
  echo "エラー: 動画が見つかりません: $VIDEO" >&2
  exit 1
fi

DURATION="$(ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 "$VIDEO")"
echo "▸ 尺: ${DURATION}秒 / ${FRAME_COUNT}枚を等間隔で抽出"

# 尺全体から等間隔で抜く。冒頭に寄せると同じような絵ばかりになる。
#
# fps フィルタを使う手もあるが、最小構成の ffmpeg ビルドには fps や tile が
# 入っていないことがある（Remotion 同梱のものがまさにそう）。
# 1枚ずつシークして取る方式なら scale だけで済み、枚数もぴったり揃う。
for i in $(seq 0 $((FRAME_COUNT - 1))); do
  TS="$(awk -v i="$i" -v n="$FRAME_COUNT" -v d="$DURATION" \
    'BEGIN { printf "%.3f", d * (i + 0.5) / n }')"
  ffmpeg -loglevel error -y -ss "$TS" -i "$VIDEO" \
    -frames:v 1 -vf "scale=960:-2" -q:v 3 \
    "$OUT_DIR/frame-$(printf '%03d' "$i").jpg"
done

ACTUAL="$(find "$OUT_DIR" -name 'frame-*.jpg' | wc -l | tr -d ' ')"
echo "▸ ${ACTUAL}枚を書き出しました: $OUT_DIR"

# コンタクトシート（全フレームを1枚のタイル画像に）。
# Claude に「動画全体の流れ」を一度に見せるのに使う。
# tile フィルタが無いビルドもあるので、失敗しても本体の処理は止めない。
COLS=4
ROWS=$(( (ACTUAL + COLS - 1) / COLS ))
if (( ACTUAL > 0 )) && ffmpeg -loglevel error -y -i "$OUT_DIR/frame-%03d.jpg" \
  -vf "scale=480:-2,tile=${COLS}x${ROWS}" -frames:v 1 -q:v 3 \
  "$OUT_DIR/contact-sheet.jpg" 2>/dev/null; then
  echo "▸ コンタクトシート: $OUT_DIR/contact-sheet.jpg"
else
  echo "▸ コンタクトシートは作れませんでした（tile フィルタ無しの ffmpeg）。"
  echo "  個別フレームを直接読ませてください。"
fi

cat <<EOF

次の一手 — Claude Code にこう投げてください:

  $OUT_DIR/contact-sheet.jpg と個別フレームを見て、この動画のアニメーションの
  雰囲気を分析してください。以下を言語化してから、video/src/scripts/ に
  同じ雰囲気の台本 JSON を書いてください。

    - 配色（背景・文字・アクセントの3色）
    - 1カットの長さとカット割りのテンポ
    - 文字の出方（1文字ずつ / 単語ごと / 一気に）
    - カットの繋ぎ方（ハードカット / フラッシュ / スライド）
    - 画面のどこに文字を置いているか

EOF
