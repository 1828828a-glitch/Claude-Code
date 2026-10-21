#!/bin/bash
# クラウドセッションで、コードで動画を作るツールにコンテナ備え付けの Chromium を使わせる。
# lemo-opuscar は PLAYWRIGHT_CHROME、mg-styles-15 は MG_CHROME、ClaudeAnimationBase は CHROME_PATH を読む。
# 何もインストールしないので起動はほぼ待たせない。ローカルでは何もしない。
set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
[ -n "${CLAUDE_ENV_FILE:-}" ] || exit 0

base=${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}
shell=$(ls -d "$base"/chromium_headless_shell-*/chrome-linux/headless_shell 2>/dev/null | sort -V | tail -n 1 || true)
chrome=$(ls -d "$base"/chromium-*/chrome-linux/chrome 2>/dev/null | sort -V | tail -n 1 || true)

if [ -n "$shell" ] && [ -z "${PLAYWRIGHT_CHROME:-}" ]; then
  echo "export PLAYWRIGHT_CHROME=\"$shell\"" >> "$CLAUDE_ENV_FILE"
fi
if [ -n "$chrome" ]; then
  [ -n "${MG_CHROME:-}" ] || echo "export MG_CHROME=\"$chrome\"" >> "$CLAUDE_ENV_FILE"
  [ -n "${CHROME_PATH:-}" ] || echo "export CHROME_PATH=\"$chrome\"" >> "$CLAUDE_ENV_FILE"
fi
exit 0
