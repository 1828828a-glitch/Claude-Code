"""SQLite ストレージ。events テーブルに分単位のイベントを蓄積する。"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime
from pathlib import Path

from .config import DATA_DIR

DB_PATH = DATA_DIR / "events.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    ts      TEXT NOT NULL,           -- ISO8601
    minute  TEXT NOT NULL,           -- 'YYYY-MM-DD HH:MM'
    source  TEXT NOT NULL,           -- screen / claude / slack / notes
    title   TEXT,                    -- ウィンドウ名・プロジェクト名・チャンネル名など
    content TEXT,                    -- 本文 (OCRテキスト、メッセージ抜粋など)
    meta    TEXT                     -- JSON (任意の付加情報)
);
CREATE INDEX IF NOT EXISTS idx_events_minute ON events(minute);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);

-- 収集の進捗 (ファイルオフセット、Slackの最終ts など)
CREATE TABLE IF NOT EXISTS cursors (
    key   TEXT PRIMARY KEY,
    value TEXT
);
"""


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    return conn


def _content_hash(source: str, title: str | None, content: str | None) -> str:
    h = hashlib.sha256()
    h.update((source or "").encode())
    h.update((title or "").encode())
    h.update((content or "").strip().encode())
    return h.hexdigest()


def add_event(
    conn: sqlite3.Connection,
    source: str,
    title: str | None,
    content: str | None,
    meta: dict | None = None,
    ts: datetime | None = None,
    dedup: bool = True,
) -> bool:
    """イベントを1件記録する。直前の同一ソースのイベントと内容が同じならスキップ。"""
    ts = ts or datetime.now()
    digest = _content_hash(source, title, content)
    if dedup:
        cur = conn.execute(
            "SELECT value FROM cursors WHERE key = ?", (f"lasthash:{source}",)
        )
        row = cur.fetchone()
        if row and row[0] == digest:
            return False
    conn.execute(
        "INSERT INTO events (ts, minute, source, title, content, meta) VALUES (?,?,?,?,?,?)",
        (
            ts.isoformat(timespec="seconds"),
            ts.strftime("%Y-%m-%d %H:%M"),
            source,
            title,
            content,
            json.dumps(meta, ensure_ascii=False) if meta else None,
        ),
    )
    conn.execute(
        "INSERT INTO cursors (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (f"lasthash:{source}", digest),
    )
    conn.commit()
    return True


def get_cursor(conn: sqlite3.Connection, key: str) -> str | None:
    row = conn.execute("SELECT value FROM cursors WHERE key = ?", (key,)).fetchone()
    return row[0] if row else None


def set_cursor(conn: sqlite3.Connection, key: str, value: str) -> None:
    conn.execute(
        "INSERT INTO cursors (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )
    conn.commit()


def events_for_day(conn: sqlite3.Connection, date: str) -> list[sqlite3.Row]:
    """date は 'YYYY-MM-DD'。その日の全イベントを時刻順で返す。"""
    conn.row_factory = sqlite3.Row
    return conn.execute(
        "SELECT * FROM events WHERE minute LIKE ? ORDER BY ts", (f"{date}%",)
    ).fetchall()
