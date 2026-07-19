#!/usr/bin/env bash
# MOSS-SoundEffect-v2.0 セットアップスクリプト
# https://huggingface.co/OpenMOSS-Team/MOSS-SoundEffect-v2.0
#
# 使い方:
#   bash moss_soundeffect/setup.sh
#
# - Python 3.12 の仮想環境 (moss_soundeffect/.venv) を作成
# - 公式リポジトリ OpenMOSS/MOSS-TTS を clone
# - NVIDIA GPU があれば CUDA 12.8 版 PyTorch、なければ CPU 版をインストール
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$HERE/.venv"
MOSS_DIR="$HERE/MOSS-TTS"

# Python 3.12 を探す (パッケージが requires-python >= 3.12 のため)
PYTHON=""
for cand in python3.12 python3.13 python3; do
    if command -v "$cand" >/dev/null 2>&1; then
        ver="$("$cand" -c 'import sys; print(sys.version_info[1])')"
        if [ "$ver" -ge 12 ]; then
            PYTHON="$cand"
            break
        fi
    fi
done
if [ -z "$PYTHON" ]; then
    echo "ERROR: Python 3.12 以上が見つかりません。インストールしてから再実行してください。" >&2
    exit 1
fi
echo "Using $PYTHON ($($PYTHON --version))"

if [ ! -d "$VENV_DIR" ]; then
    "$PYTHON" -m venv "$VENV_DIR"
fi
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
pip install --upgrade pip

if [ ! -d "$MOSS_DIR" ]; then
    git clone --depth 1 https://github.com/OpenMOSS/MOSS-TTS.git "$MOSS_DIR"
else
    echo "MOSS-TTS は clone 済み ($MOSS_DIR)"
fi

cd "$MOSS_DIR/moss_soundeffect_v2"

if command -v nvidia-smi >/dev/null 2>&1; then
    echo "NVIDIA GPU を検出: CUDA 12.8 版 PyTorch をインストールします"
    pip install --extra-index-url https://download.pytorch.org/whl/cu128 -e ".[torch-cu128]"
else
    echo "GPU が見つかりません: CPU 版 PyTorch をインストールします (生成はかなり遅くなります)"
    pip install --index-url https://download.pytorch.org/whl/cpu \
        "torch==2.9.0" "torchaudio==2.9.0" "torchvision==0.24.0"
    pip install -e .
fi

echo
echo "セットアップ完了。使い方:"
echo "  source moss_soundeffect/.venv/bin/activate"
echo "  python moss_soundeffect/generate.py --prompt \"A dog barking loudly in a park.\" --output out.wav"
echo "(初回実行時に Hugging Face からモデル (数GB) がダウンロードされます)"
