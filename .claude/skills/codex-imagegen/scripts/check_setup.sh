#!/usr/bin/env bash
# codex-imagegen を使う前提が揃っているかを確認する。
set -uo pipefail

ok=0
ng=0
pass() { printf '  \033[32mOK\033[0m   %s\n' "$1"; ok=$((ok + 1)); }
fail() { printf '  \033[31mNG\033[0m   %s\n' "$1"; ng=$((ng + 1)); }
info() { printf '       %s\n' "$1"; }

echo "codex-imagegen setup check"
echo

# 1. codex CLI
if command -v codex >/dev/null 2>&1; then
  pass "codex CLI: $(command -v codex)"
  version="$(codex --version 2>/dev/null | head -1)"
  [[ -n "$version" ]] && info "version: $version"
else
  fail "codex CLI が見つかりません"
  info "npm install -g @openai/codex   (または brew install codex)"
fi

# 2. ログイン状態
if command -v codex >/dev/null 2>&1; then
  if [[ -f "$HOME/.codex/auth.json" ]]; then
    pass "Codex の認証情報あり (~/.codex/auth.json)"
  else
    fail "Codex にログインしていません"
    info "codex login  を実行し、API キーではなく ChatGPT アカウントを選ぶ"
  fi
fi

# 3. 任意項目
if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  info "OPENAI_API_KEY が設定されています (通常は不要。ChatGPT ログインが優先されます)"
fi
if command -v timeout >/dev/null 2>&1; then
  pass "timeout コマンドあり (タイムアウト制御が有効)"
else
  info "timeout コマンドなし — --timeout は無視されます (macOS なら brew install coreutils)"
fi

# 4. スクリプトの実行権限
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for f in gen_image.sh gen_broll.py; do
  if [[ -x "$script_dir/$f" ]]; then
    pass "$f は実行可能"
  else
    fail "$f に実行権限がありません"
    info "chmod +x $script_dir/$f"
  fi
done

echo
if [[ "$ng" -eq 0 ]]; then
  echo "すべて OK ($ok 項目)。次のコマンドで試せます:"
  echo "  $script_dir/gen_image.sh --out /tmp/codex-test.png --aspect 1:1 \"青い折り紙の鶴\""
  exit 0
fi
echo "$ng 件の問題があります。references/setup.md を確認してください。"
exit 1
