#!/usr/bin/env bash
# Irodori-TTS を CPU で動かす環境をつくる（narrate_tts.py 用）。リポジトリの外の ../../../aratako に置く。
#   本家の uv sync は GitHub から依存をビルドするので、ここでは PyPI と PyTorch 公式の配布物で組み立てる。
set -euo pipefail
BASE="${IRODORI_BASE:-$(cd "$(dirname "$0")/../../.." && pwd)/aratako}"
mkdir -p "$BASE"
[ -d "$BASE/irodori-tts" ] || GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/Aratako/irodori-tts "$BASE/irodori-tts"
# 音声コーデック。PyPI に無いので Meta のソースをそのまま読み込ませる（irodori_tts/codec.py が ../dacvae を探す）
[ -d "$BASE/dacvae" ] || GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/facebookresearch/dacvae "$BASE/dacvae"
# 透かし。Irodori が指定している Sesame AI 版（PyPI の Sony 版は torch 2.0 以下が前提で動かない）
if [ ! -d "$BASE/silentcipher" ]; then
  git clone https://github.com/SesameAILabs/silentcipher "$BASE/silentcipher"
  git -C "$BASE/silentcipher" checkout -q d46d7d0893a583d8968ab3a6626e2289faec9152
fi
python3 -m venv "$BASE/venv"
PIP="$BASE/venv/bin/pip"
"$PIP" install -q --upgrade pip
"$PIP" install -q "torch==2.10.*" "torchaudio==2.10.*" "torchcodec>=0.10.0,<0.11.0" --index-url https://download.pytorch.org/whl/cpu
"$PIP" install -q numpy "transformers>=5.12.1,<6" "safetensors>=0.7.0" "soundfile>=0.12.0" tqdm "huggingface-hub>=0.34.0" \
  pyyaml tokenizers "sentencepiece>=0.1.99,<0.2" "numba>=0.57.0" "llvmlite>=0.40.0" "argbind>=0.3.7" \
  "descript-audiotools>=0.7.2" einops librosa scipy pyaml pydub audioop-lts
echo "ready: PYTHONPATH=$BASE/silentcipher/src $BASE/venv/bin/python narrate_tts.py narration/voices.json narration/chic.json narration/mojicut.json narration/motion.json"
