#!/usr/bin/env bash
# HyperFrames をローカルレンダリングできる状態にする（冪等）。
#
#   bash scripts/setup-hyperframes.sh
#
# コンテナは使い捨てなので、新しいセッションでレンダリングする前に一度実行する。
# スキル自体はリポジトリに同梱済みなので、このスクリプトが用意するのは
# レンダリングに必要なバイナリ（ffmpeg / Chrome Headless Shell）だけ。
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
  SUDO="sudo"
fi

if command -v ffmpeg >/dev/null 2>&1 && command -v ffprobe >/dev/null 2>&1; then
  echo "==> ffmpeg / ffprobe: すでにインストール済み"
else
  echo "==> ffmpeg / ffprobe をインストール中"
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update -qq
    $SUDO apt-get install -y -qq ffmpeg
  elif command -v brew >/dev/null 2>&1; then
    brew install ffmpeg
  else
    echo "ffmpeg を自動インストールできない。手動で入れてから再実行する。" >&2
    exit 1
  fi
fi

echo "==> Chrome Headless Shell を確認中"
npx --yes hyperframes@latest browser ensure

echo "==> hyperframes doctor"
npx --yes hyperframes@latest doctor || true

cat <<'EOS'

準備完了。whisper-cpp / Kokoro / MusicGen が Not found でもレンダリングは通る
（文字起こし・ローカル音声生成を使うときだけ必要）。

次のステップ:
  npx hyperframes init <名前> --example blank --non-interactive
  cd <名前> && npm run dev     # ブラウザでプレビュー
  cd <名前> && npm run render  # MP4 に書き出し
EOS
