"""Slack 履歴の差分取り込み。環境変数 SLACK_TOKEN (xoxp- ユーザートークン) が必要。

標準ライブラリのみで Slack Web API を叩く。チャンネルごとに最終取得 ts を
cursors に保存し、新着メッセージだけをイベント化する。
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from datetime import datetime

from .. import db

API = "https://slack.com/api"


def _call(method: str, token: str, params: dict) -> dict:
    qs = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    req = urllib.request.Request(
        f"{API}/{method}?{qs}", headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _my_channels(token: str) -> list[dict]:
    channels, cursor = [], None
    for _ in range(10):  # 最大10ページ
        data = _call(
            "users.conversations",
            token,
            {"types": "public_channel,private_channel,im,mpim", "limit": 200,
             "cursor": cursor},
        )
        if not data.get("ok"):
            break
        channels.extend(data.get("channels", []))
        cursor = (data.get("response_metadata") or {}).get("next_cursor")
        if not cursor:
            break
    return channels


def collect(conn, cfg: dict) -> int:
    token = os.environ.get("SLACK_TOKEN")
    if not token:
        return 0
    scfg = cfg["slack"]
    channel_ids = scfg["channels"]
    names: dict[str, str] = {}
    if not channel_ids:
        chans = _my_channels(token)
        channel_ids = [c["id"] for c in chans]
        names = {c["id"]: c.get("name") or c.get("user") or c["id"] for c in chans}
    added = 0
    for cid in channel_ids:
        key = f"slack:last_ts:{cid}"
        oldest = db.get_cursor(conn, key)
        try:
            data = _call(
                "conversations.history",
                token,
                {"channel": cid, "oldest": oldest,
                 "limit": scfg["max_messages_per_poll"]},
            )
        except OSError:
            continue
        if not data.get("ok"):
            continue
        msgs = data.get("messages", [])
        if not msgs:
            continue
        for m in reversed(msgs):  # 古い順に記録
            if m.get("subtype") or not m.get("text"):
                continue
            ts = datetime.fromtimestamp(float(m["ts"]))
            if db.add_event(
                conn,
                "slack",
                f"#{names.get(cid, cid)}",
                m["text"][:1000],
                meta={"user": m.get("user")},
                ts=ts,
                dedup=False,
            ):
                added += 1
        db.set_cursor(conn, key, max(m["ts"] for m in msgs))
    return added
