"""議事録・メモフォルダの収集。前回スキャン以降に更新されたファイルを取り込む。"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from .. import db


def collect(conn, cfg: dict) -> int:
    ncfg = cfg["notes"]
    exts = {e.lower() for e in ncfg["extensions"]}
    max_chars = ncfg["max_chars"]
    added = 0
    for d in ncfg["dirs"]:
        root = Path(d).expanduser()
        if not root.is_dir():
            continue
        key = f"notes:last_scan:{root}"
        last_scan = float(db.get_cursor(conn, key) or 0)
        newest = last_scan
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in exts:
                continue
            try:
                mtime = path.stat().st_mtime
            except OSError:
                continue
            if mtime <= last_scan:
                continue
            newest = max(newest, mtime)
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            if db.add_event(
                conn,
                "notes",
                path.name,
                text.strip()[:max_chars],
                meta={"path": str(path)},
                ts=datetime.fromtimestamp(mtime),
                dedup=False,
            ):
                added += 1
        if newest > last_scan:
            db.set_cursor(conn, key, str(newest))
    return added
