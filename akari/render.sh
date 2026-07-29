#!/usr/bin/env bash
# AKARI プロジェクトを lint → MP4 書き出しの順で処理する。
# 使い方: ./akari/render.sh <プロジェクトディレクトリ> [render-cut への追加引数...]
#   例:   ./akari/render.sh akari/projects/enneagram-short --out exports/enneagram-short.mp4
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
engine="$here/engine"

if [ "$#" -lt 1 ]; then
  echo "usage: $(basename "$0") <project-dir> [render-cut args...]" >&2
  exit 2
fi

project="$(cd "$1" && pwd)"; shift
[ -d "$engine" ] || { echo "engine が未セットアップです。先に ./akari/setup.sh を実行してください。" >&2; exit 1; }
[ -f "$project/edit.json" ] || { echo "$project/edit.json がありません。" >&2; exit 1; }

# 素材が未生成なら生成する
if [ -x "$project/tools/make-assets.sh" ] && [ -z "$(ls -A "$project/assets" 2>/dev/null)" ]; then
  echo "==> 素材を生成中"
  "$project/tools/make-assets.sh"
fi

# shellcheck disable=SC1091
[ -f "$here/engine.env" ] && . "$here/engine.env"
export CHROME_PATH="${CHROME_PATH:?CHROME_PATH が未設定です。./akari/setup.sh を実行してください}"

echo "==> edit-lint"
mkdir -p "$project/.akari"
if ! node "$engine/packages/edit-lint/bin/edit-lint.mjs" "$project" --json > "$project/.akari/lint.json"; then
  echo "lint FAIL — .akari/lint.json を確認してください。" >&2
  cat "$project/.akari/lint.json" >&2
  exit 1
fi
echo "  PASS"

echo "==> render-cut"
node "$engine/packages/render-cut/bin/render-cut.mjs" "$project" "$@"
