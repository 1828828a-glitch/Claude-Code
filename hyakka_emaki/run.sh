#!/usr/bin/env bash
# 百花繚乱絵巻を起動する。会場のLAN内IPを HANA_PUBLIC_URL に入れるとQRがそこを指す。
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 -m uvicorn hyakka_emaki.server.main:app \
  --host "${HANA_HOST:-0.0.0.0}" --port "${HANA_PORT:-8000}"
