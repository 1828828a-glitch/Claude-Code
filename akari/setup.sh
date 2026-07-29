#!/usr/bin/env bash
# AKARI Video のヘッドレス書き出し環境を用意する。
#   1. ffmpeg / 日本語フォントの確認（不足していれば apt で導入を試みる）
#   2. AKARI Video 本体を akari/engine へピン留めして clone
#   3. render-cut の依存（puppeteer-core / hyperframes）を npm install
#   4. Chromium の在り処を検出して akari/engine.env に書き出す
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
engine="$here/engine"
repo="https://github.com/AkariLabs/akari-video"
# 動作確認済みのリビジョン。追従したいときはここを上げる。
rev="${AKARI_REV:-d8ecb3c61b1a02deffd791dc21dd7dbc9a27502c}"

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

as_root() {
  if [ "$(id -u)" = 0 ]; then "$@"; elif command -v sudo >/dev/null 2>&1; then sudo "$@"; else
    echo "  ! root 権限がないため '$*' を実行できません。手動で導入してください。" >&2
    return 1
  fi
}

say "1/4 依存コマンドの確認"
missing=()
command -v ffmpeg  >/dev/null 2>&1 || missing+=(ffmpeg)
command -v ffprobe >/dev/null 2>&1 || missing+=(ffmpeg)
command -v node    >/dev/null 2>&1 || { echo "  ! Node.js が必要です（v20 以上）。" >&2; exit 1; }
if ! fc-list :lang=ja 2>/dev/null | grep -qi "noto sans cjk"; then missing+=(fonts-noto-cjk); fi

if [ "${#missing[@]}" -gt 0 ]; then
  echo "  不足: ${missing[*]}"
  if command -v apt-get >/dev/null 2>&1; then
    as_root apt-get update -qq
    as_root apt-get install -y "${missing[@]}"
  else
    echo "  ! apt-get が無い環境です。${missing[*]} を手動で導入してください。" >&2
    exit 1
  fi
else
  echo "  ffmpeg / ffprobe / node / 日本語フォント: OK"
fi

say "2/4 AKARI Video 本体を取得 ($rev)"
if [ -d "$engine/.git" ]; then
  git -C "$engine" fetch --quiet origin "$rev" || git -C "$engine" fetch --quiet origin
  git -C "$engine" checkout --quiet "$rev"
else
  git clone --quiet "$repo" "$engine"
  git -C "$engine" checkout --quiet "$rev"
fi
echo "  $engine @ $(git -C "$engine" rev-parse --short HEAD)"

say "3/4 render-cut の依存を導入"
(cd "$engine/packages/render-cut" && npm install --no-audit --no-fund --loglevel=error)
echo "  OK"

say "4/4 Chromium を検出"
chrome=""
for candidate in \
  "${CHROME_PATH:-}" \
  "${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"/chromium-*/chrome-linux/chrome \
  /usr/bin/chromium /usr/bin/chromium-browser /usr/bin/google-chrome /usr/bin/google-chrome-stable \
  "$HOME/.cache/ms-playwright"/chromium-*/chrome-linux/chrome
do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then chrome="$candidate"; break; fi
done
if [ -z "$chrome" ]; then
  echo "  ! Chromium/Chrome が見つかりません。CHROME_PATH を設定して再実行してください。" >&2
  exit 1
fi
printf 'CHROME_PATH=%s\n' "$chrome" > "$here/engine.env"
echo "  $chrome"

say "セットアップ完了"
echo "サンプルを書き出す: ./akari/render.sh akari/projects/enneagram-short"
