#!/bin/bash
# SessionStart hook — video-shotcraft スキルをセッション開始時に用意する。
#
# Claude Code on the web のコンテナはセッションごとに作り直されるため、ユーザー
# スキルディレクトリに入れたものは次のセッションには残らない。このフックが
# 毎回入れ直すことで、常に /video-shotcraft が使える状態にする。
#
# 環境変数:
#   VSC_INCLUDE_PREVIEWS=1  gallery/media(約106MB のプレビュー動画)も取得する
#                           既定では除外する。Gallery はオンラインで閲覧できるため。
#   VSC_SKIP_NPM=1          template/ の npm install を省略する
#   VSC_REF=<ref>           取得するブランチ/タグ(既定: main)
#   VSC_FORCE=1             既にインストール済みでも入れ直す
set -uo pipefail

REPO="https://github.com/Vincentwei1021/video-shotcraft.git"
REF="${VSC_REF:-main}"
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
DEST="$SKILLS_DIR/video-shotcraft"

log() { echo "[video-shotcraft] $*"; }

# ローカルの Claude Code では ~/.claude/skills が永続するので、何もしない。
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  log "ローカル環境なのでスキップします(手動導入は intro_video/../README を参照)"
  exit 0
fi

install_skill() {
  if [ -f "$DEST/SKILL.md" ] && [ "${VSC_FORCE:-}" != "1" ]; then
    log "すでに導入済み: $DEST"
    return 0
  fi

  command -v git >/dev/null 2>&1 || { log "git がありません"; return 1; }

  local tmp
  tmp="$(mktemp -d)" || return 1
  # shellcheck disable=SC2064
  trap "rm -rf '$tmp'" RETURN

  log "取得中 ($REF)…"
  if [ "${VSC_INCLUDE_PREVIEWS:-}" = "1" ]; then
    git clone --depth 1 --branch "$REF" "$REPO" "$tmp/src" >/dev/null 2>&1 || return 1
  else
    # 部分クローン + sparse-checkout で、106MB のプレビュー動画を落とさずに済ませる。
    # gallery/api/library.json(カード名の索引)は必要なので gallery 自体は残す。
    git clone --depth 1 --branch "$REF" --filter=blob:none --sparse \
      "$REPO" "$tmp/src" >/dev/null 2>&1 || return 1
    git -C "$tmp/src" sparse-checkout set --no-cone '/*' '!/gallery/media' >/dev/null 2>&1 || return 1
  fi

  [ -f "$tmp/src/SKILL.md" ] || { log "SKILL.md が見つかりません"; return 1; }

  # .git は不要(50MB 超)なので落とす
  rm -rf "$tmp/src/.git"

  mkdir -p "$SKILLS_DIR" || return 1
  rm -rf "$DEST.new" "$DEST"
  mv "$tmp/src" "$DEST" || return 1

  log "導入しました: $DEST ($(du -sh "$DEST" | cut -f1))"
  if [ "${VSC_INCLUDE_PREVIEWS:-}" != "1" ]; then
    log "プレビュー動画は未取得。Gallery: https://vincentwei1021.github.io/video-shotcraft/"
  fi
}

install_template_deps() {
  [ "${VSC_SKIP_NPM:-}" = "1" ] && return 0
  [ -f "$DEST/template/package.json" ] || return 0
  [ -d "$DEST/template/node_modules" ] && return 0
  command -v npm >/dev/null 2>&1 || { log "npm がないので Remotion の依存はスキップ"; return 0; }

  log "Remotion テンプレートの依存を導入中…"
  (cd "$DEST/template" && npm install --no-audit --no-fund --loglevel=error) >/dev/null 2>&1 \
    || { log "npm install に失敗(使用時に手動で実行してください)"; return 0; }
  log "Remotion の依存を導入しました"
}

# フックの失敗でセッション起動を止めたくないので、必ず 0 で終わる
if install_skill; then
  install_template_deps
else
  log "導入に失敗しました。手動: bash .claude/hooks/session-start.sh を再実行してください"
fi

exit 0
