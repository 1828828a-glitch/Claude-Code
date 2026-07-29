#!/usr/bin/env bash
# start.sh で起動した image-3d / rig-service を止める。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$SCRIPT_DIR/.run"

for name in image-3d rig-service; do
  pidfile="$RUN_DIR/$name.pid"
  if [ ! -f "$pidfile" ]; then
    echo "$name: pid ファイルがありません(未起動?)"
    continue
  fi
  pid="$(cat "$pidfile")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    # SIGTERM で落ちなければ少し待って SIGKILL
    for _ in $(seq 1 10); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 1
    done
    kill -9 "$pid" 2>/dev/null || true
    echo "$name: 停止しました (pid $pid)"
  else
    echo "$name: 既に停止しています (pid $pid)"
  fi
  rm -f "$pidfile"
done
