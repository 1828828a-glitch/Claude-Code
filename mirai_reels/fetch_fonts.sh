#!/usr/bin/env bash
# Zen Maru Gothic（SIL Open Font License 1.1）を Google Fonts から取ってきて assets/fonts/ に置く。
# 発注元の assets/fonts/ に同じ書体があれば、そちらを置いてもよい（ファイル名をそろえる）。
set -euo pipefail
cd "$(dirname "$0")/assets/fonts"
declare -A NAME=([500]=Medium [700]=Bold [900]=Black)
for w in 500 700 900; do
  f="ZenMaruGothic-${NAME[$w]}.ttf"
  [ -s "$f" ] && continue
  url=$(curl -sS -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@$w" | grep -o 'https://[^)]*\.ttf' | head -1)
  curl -sSf -o "$f" "$url"
  echo "取得: $f"
done
