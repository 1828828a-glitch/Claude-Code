"""イベント列から1日のタイムライン (Markdown) を組み立てる。"""

from __future__ import annotations

import sqlite3
from collections import Counter

from . import db


def _blocks(events: list[sqlite3.Row]) -> list[dict]:
    """screen イベントを「同じウィンドウで作業していた連続時間帯」にまとめる。"""
    blocks: list[dict] = []
    for ev in events:
        title = ev["title"] or "(不明なウィンドウ)"
        if blocks and blocks[-1]["title"] == title:
            blocks[-1]["end"] = ev["minute"][-5:]
            if ev["content"]:
                blocks[-1]["samples"].append(ev["content"])
        else:
            blocks.append(
                {
                    "start": ev["minute"][-5:],
                    "end": ev["minute"][-5:],
                    "title": title,
                    "samples": [ev["content"]] if ev["content"] else [],
                }
            )
    return blocks


def build_day_markdown(date: str, max_len: int = 40000) -> str:
    """date ('YYYY-MM-DD') の全ソースのイベントをタイムラインMarkdownにする。"""
    conn = db.connect()
    events = db.events_for_day(conn, date)
    if not events:
        return f"# {date} の作業ログ\n\n(記録なし)\n"

    by_source: dict[str, list] = {}
    for ev in events:
        by_source.setdefault(ev["source"], []).append(ev)

    lines = [f"# {date} の作業ログ", ""]

    screen = by_source.get("screen", [])
    if screen:
        lines.append("## 画面アクティビティ (分単位)")
        for b in _blocks(screen):
            span = b["start"] if b["start"] == b["end"] else f"{b['start']}〜{b['end']}"
            lines.append(f"- **{span}** {b['title']}")
            if b["samples"]:
                # ブロック内の代表的なOCRテキストを1つだけ添える
                sample = max(b["samples"], key=len)[:300].replace("\n", " / ")
                lines.append(f"  - 画面内容: {sample}")
        lines.append("")

    claude_ev = by_source.get("claude", [])
    if claude_ev:
        lines.append("## Claude での作業")
        for ev in claude_ev:
            snippet = (ev["content"] or "").replace("\n", " ")[:200]
            lines.append(f"- {ev['minute'][-5:]} [{ev['title']}] {snippet}")
        lines.append("")

    slack_ev = by_source.get("slack", [])
    if slack_ev:
        lines.append("## Slack")
        for ev in slack_ev:
            snippet = (ev["content"] or "").replace("\n", " ")[:200]
            lines.append(f"- {ev['minute'][-5:]} {ev['title']} {snippet}")
        lines.append("")

    notes_ev = by_source.get("notes", [])
    if notes_ev:
        lines.append("## 議事録・メモの更新")
        for ev in notes_ev:
            lines.append(f"### {ev['title']} ({ev['minute'][-5:]} 更新)")
            lines.append(ev["content"] or "")
            lines.append("")

    md = "\n".join(lines)
    if len(md) > max_len:
        md = md[:max_len] + "\n\n(※ ログが長いため以降は省略)\n"
    return md


def day_summary_stats(date: str) -> dict:
    conn = db.connect()
    events = db.events_for_day(conn, date)
    counts = Counter(ev["source"] for ev in events)
    minutes = len({ev["minute"] for ev in events if ev["source"] == "screen"})
    return {"counts": dict(counts), "active_minutes": minutes, "total": len(events)}
