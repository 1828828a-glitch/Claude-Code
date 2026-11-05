#!/usr/bin/env bash
# 本家 Irodori-TTS を手元にインストールして、irodori.py の local バックエンドを使えるようにする。
#
# 使い方:
#   bash setup_local.sh            # GPU を自動判定 (NVIDIA があれば cu128、なければ cpu)
#   bash setup_local.sh cpu        # 明示的に選ぶ: cpu | cu128 | rocm | xpu
#   bash setup_local.sh --webui    # インストール後、ブラウザ用 UI (Gradio) を起動
#
# インストール先は $IRODORI_HOME (既定: ~/.cache/irodori-tts)。
# 必要なもの: git, uv (https://docs.astral.sh/uv/), 空き容量 10GB 程度。
set -euo pipefail

REPO_URL="https://github.com/Aratako/Irodori-TTS.git"
# 動作を確認した本家のコミット。新しい版を試すときは IRODORI_REV=main で上書きする。
REV="${IRODORI_REV:-7ed4374eaf49355279db51307e8141984f900836}"
IRODORI_HOME="${IRODORI_HOME:-$HOME/.cache/irodori-tts}"
DIR="$IRODORI_HOME/Irodori-TTS"

EXTRA=""
WEBUI=0
for arg in "$@"; do
  case "$arg" in
    cpu|cu128|rocm|xpu) EXTRA="$arg" ;;
    --webui) WEBUI=1 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "不明な引数: $arg" >&2; exit 1 ;;
  esac
done

for cmd in git uv; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "$cmd が見つかりません。" >&2
    if [ "$cmd" = uv ]; then
      echo "インストール方法: https://docs.astral.sh/uv/getting-started/installation/" >&2
    fi
    exit 1
  fi
done

if [ -z "$EXTRA" ]; then
  if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi -L >/dev/null 2>&1; then
    EXTRA=cu128
  elif [ "$(uname -s)" = Linux ] && command -v rocminfo >/dev/null 2>&1; then
    EXTRA=rocm
  else
    EXTRA=cpu
  fi
fi
echo "[setup] バックエンド: $EXTRA / インストール先: $DIR"

mkdir -p "$IRODORI_HOME"
if [ ! -d "$DIR/.git" ]; then
  git clone --filter=blob:none "$REPO_URL" "$DIR"
fi
git -C "$DIR" fetch --quiet origin
git -C "$DIR" checkout --quiet "$REV"
echo "[setup] Irodori-TTS $(git -C "$DIR" rev-parse --short HEAD)"

(cd "$DIR" && uv sync --extra "$EXTRA")
echo "$EXTRA" > "$IRODORI_HOME/backend"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cat <<EOF

[setup] 完了しました。試しに1文読ませるには:
  python3 "$SCRIPT_DIR/irodori.py" "こんにちは。今日はいい天気ですね。" --backend local
EOF
if [ "$EXTRA" = cpu ]; then
  cat <<EOF
CPU ならサンプリングが40ステップから4ステップに減る MeanFlow 版が向いています:
  python3 "$SCRIPT_DIR/irodori.py" "こんにちは。" --backend local --model Aratako/Irodori-TTS-v4.1-Small-MF
EOF
fi

if [ "$WEBUI" = 1 ]; then
  echo "[setup] Web UI を起動します: http://localhost:7861"
  cd "$DIR" && exec uv run --no-sync python gradio_app_voicedesign.py --server-name 127.0.0.1 --server-port 7861
fi
