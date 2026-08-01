"""Claude Code の会話履歴 (~/.claude/projects/**/*.jsonl) を差分取り込みする。

各 JSONL ファイルの読み取り済みオフセットを cursors に保存し、
新しく追記された行 (user / assistant メッセージ) だけをイベント化する。
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from .. import db


def _extract_text(message: dict) -> str:
    content = message.get("content")
    if isinstance(content, str):
        return content
    parts = []
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
    return "\n".join(parts)


def _project_name(path: Path, projects_dir: Path) -> str:
    try:
        rel = path.relative_to(projects_dir)
        # ディレクトリ名は '-home-user-my-project' のようなエンコード形式
        return rel.parts[0].lstrip("-").replace("-", "/")
    except ValueError:
        return path.parent.name


def collect(conn, cfg: dict) -> int:
    ccfg = cfg["claude_logs"]
    projects_dir = Path(ccfg["projects_dir"]).expanduser()
    if not projects_dir.is_dir():
        return 0
    max_chars = ccfg["max_chars"]
    added = 0
    for jsonl in projects_dir.glob("*/*.jsonl"):
        key = f"offset:claude:{jsonl}"
        offset = int(db.get_cursor(conn, key) or 0)
        try:
            size = jsonl.stat().st_size
        except OSError:
            continue
        if size <= offset:
            continue
        project = _project_name(jsonl, projects_dir)
        try:
            with jsonl.open("r", encoding="utf-8", errors="replace") as f:
                f.seek(offset)
                for line in f:
                    try:
                        rec = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if rec.get("type") not in ("user", "assistant"):
                        continue
                    text = _extract_text(rec.get("message") or {})
                    if not text.strip():
                        continue
                    ts = None
                    if rec.get("timestamp"):
                        try:
                            ts = datetime.fromisoformat(
                                rec["timestamp"].replace("Z", "+00:00")
                            ).astimezone()
                            ts = ts.replace(tzinfo=None)
                        except ValueError:
                            ts = None
                    role = "自分" if rec["type"] == "user" else "Claude"
                    if db.add_event(
                        conn,
                        "claude",
                        f"{project} ({role})",
                        text.strip()[:max_chars],
                        ts=ts,
                        dedup=False,
                    ):
                        added += 1
                offset = f.tell()
        except OSError:
            continue
        db.set_cursor(conn, key, str(offset))
    return added
