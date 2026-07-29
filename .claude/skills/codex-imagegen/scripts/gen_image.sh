#!/usr/bin/env bash
# Claude Code から Codex CLI を起こして画像を 1 枚生成する。
# Codex の組み込み image_gen ツール ($imagegen) を使うので、画像用の API キーは不要
# (ChatGPT サブスクのログイントークンで gpt-image-2 が動く)。
set -euo pipefail

usage() {
  cat <<'EOF'
usage: gen_image.sh --out PATH [options] "<画像の説明>"

required:
  --out PATH          出力先 PNG。相対パスは cwd 基準で絶対パスに変換される

options:
  --aspect A:B        アスペクト比 (16:9 / 1:1 / 9:16 など)。default: 16:9
  --style TEXT        画風・トーンの指定
  --retries N         失敗時のリトライ回数。default: 2
  --timeout SEC       1 枚あたりのタイムアウト秒。default: 300
  --force             出力先が既に存在しても上書きする
  --dry-run           codex を実行せず、組み立てたコマンドを表示するだけ
  --api-fallback      ChatGPT ログインではなく OPENAI_API_KEY 経由を明示的に許可する
  -h, --help          このヘルプ

example:
  gen_image.sh --out assets/hero.png --aspect 16:9 \
    --style "フラットデザイン、パステルカラー、文字なし" \
    "ターミナルの前でコーヒーを飲む開発者"
EOF
}

OUT=""
ASPECT="16:9"
STYLE=""
RETRIES=2
TIMEOUT=300
FORCE=0
DRY_RUN=0
API_FALLBACK=0
DESC=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out)          OUT="${2:?--out needs a value}"; shift 2 ;;
    --aspect)       ASPECT="${2:?--aspect needs a value}"; shift 2 ;;
    --style)        STYLE="${2:?--style needs a value}"; shift 2 ;;
    --retries)      RETRIES="${2:?--retries needs a value}"; shift 2 ;;
    --timeout)      TIMEOUT="${2:?--timeout needs a value}"; shift 2 ;;
    --force)        FORCE=1; shift ;;
    --dry-run)      DRY_RUN=1; shift ;;
    --api-fallback) API_FALLBACK=1; shift ;;
    -h|--help)      usage; exit 0 ;;
    --) shift; DESC="${DESC:+$DESC }$*"; break ;;
    -*) echo "gen_image.sh: unknown option: $1" >&2; usage >&2; exit 2 ;;
    *)  DESC="${DESC:+$DESC }$1"; shift ;;
  esac
done

if [[ -z "$OUT" ]]; then
  echo "gen_image.sh: --out is required" >&2; usage >&2; exit 2
fi
if [[ -z "$DESC" ]]; then
  echo "gen_image.sh: 画像の説明が空です" >&2; usage >&2; exit 2
fi

if ! command -v codex >/dev/null 2>&1; then
  cat >&2 <<'EOF'
gen_image.sh: `codex` コマンドが見つかりません。

  npm install -g @openai/codex   # または brew install codex
  codex login                    # ChatGPT アカウントでログイン

詳細は .claude/skills/codex-imagegen/references/setup.md を参照。
EOF
  exit 127
fi

# 相対パス -> 絶対パス。$imagegen は絶対パスでないと保存先を取り違える。
case "$OUT" in
  /*) ABS_OUT="$OUT" ;;
  *)  ABS_OUT="$PWD/$OUT" ;;
esac
OUT_DIR="$(dirname "$ABS_OUT")"
mkdir -p "$OUT_DIR"

if [[ -e "$ABS_OUT" && "$FORCE" -eq 0 ]]; then
  echo "skip (already exists): $ABS_OUT"
  exit 0
fi

PROMPT="\$imagegen ${DESC}"
[[ -n "$STYLE" ]] && PROMPT="${PROMPT} スタイル: ${STYLE}。"
PROMPT="${PROMPT} アスペクト比は ${ASPECT} にしてください。"
PROMPT="${PROMPT} 生成した画像は必ず ${ABS_OUT} に保存してください。"
PROMPT="${PROMPT} 画像の生成と保存以外のファイル作成・編集・コマンド実行は行わないでください。"

CODEX_ARGS=(exec --sandbox workspace-write --skip-git-repo-check)
if [[ "$API_FALLBACK" -eq 1 ]]; then
  if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    echo "gen_image.sh: --api-fallback が指定されましたが OPENAI_API_KEY が未設定です" >&2
    exit 2
  fi
else
  # ChatGPT ログイン経由を既定にする。API キーが環境に残っていても課金側に流さない。
  unset OPENAI_API_KEY || true
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  printf 'codex'
  printf ' %q' "${CODEX_ARGS[@]}" "$PROMPT"
  printf ' < /dev/null\n'
  exit 0
fi

run_codex() {
  if command -v timeout >/dev/null 2>&1; then
    timeout "$TIMEOUT" codex "${CODEX_ARGS[@]}" "$PROMPT" </dev/null
  else
    codex "${CODEX_ARGS[@]}" "$PROMPT" </dev/null
  fi
}

attempt=0
while :; do
  attempt=$((attempt + 1))
  echo "generating (attempt ${attempt}/$((RETRIES + 1))): $ABS_OUT" >&2

  status=0
  run_codex || status=$?

  # codex が成功を報告しても保存されていないことがあるので、必ずファイルの実在で判定する。
  if [[ -s "$ABS_OUT" ]]; then
    echo "$ABS_OUT"
    exit 0
  fi

  if [[ "$status" -eq 124 ]]; then
    echo "gen_image.sh: タイムアウト (${TIMEOUT}s)" >&2
  elif [[ "$status" -ne 0 ]]; then
    echo "gen_image.sh: codex exec が exit ${status} で終了" >&2
  else
    echo "gen_image.sh: codex は成功したが ${ABS_OUT} が生成されていません" >&2
  fi

  if [[ "$attempt" -gt "$RETRIES" ]]; then
    echo "gen_image.sh: 生成に失敗しました: $ABS_OUT" >&2
    exit 1
  fi
  sleep $((attempt * 5))
done
