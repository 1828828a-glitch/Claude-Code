#!/usr/bin/env bash
# 動画生成に使うフォントを取得する(ライセンスはいずれも SIL Open Font License 1.1)。
#   - Noto Sans JP (Variable) : 日本語の本文・見出し
#   - Poppins Bold            : 英字のワードマーク
set -euo pipefail

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/fonts"
mkdir -p "$dir"

curl -sSfL -o "$dir/NotoSansJP-Bold.ttf" \
  "https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/Variable/TTF/Subset/NotoSansJP-VF.ttf"
curl -sSfL -o "$dir/Poppins-Bold.ttf" \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf"

echo "フォントを取得しました: $dir"
ls -la "$dir"
