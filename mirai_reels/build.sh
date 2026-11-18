#!/usr/bin/env bash
# みらキャン リールを書き出す。
#   ./build.sh            … R01〜R09 をすべて
#   ./build.sh R03 R09    … 指定したものだけ
# 出力は out/（MP4・カバーPNG・確認用の静止画）。安全領域からはみ出した文字があれば一覧を出して、終了コード2で終わる。
set -euo pipefail
cd "$(dirname "$0")"
./fetch_fonts.sh
NODE_PATH="$(npm root -g)" node render.cjs "${@:-all}"
