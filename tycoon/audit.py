"""監査ログ。

モックの「View audit」がこれ。AIが実務を触る以上、
「誰が・いつ・何を・なぜ」が後から必ず追えないと運用に乗らない。

追記専用の JSONL。1行1イベント。壊れた行が1つあっても残りは読める。
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

DEFAULT_PATH = Path("tycoon_audit.jsonl")


class AuditLog:
    def __init__(self, path: str | Path = DEFAULT_PATH):
        self.path = Path(path)

    def record(self, event: str, *, run_id: str | None = None, **data: Any) -> dict:
        entry = {
            "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "event": event,
            "run_id": run_id,
            **data,
        }
        with self.path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        return entry

    def entries(self, *, run_id: str | None = None, limit: int | None = None) -> list[dict]:
        rows = [e for e in self._iter() if run_id is None or e.get("run_id") == run_id]
        return rows[-limit:] if limit else rows

    def _iter(self) -> Iterator[dict]:
        if not self.path.exists():
            return
        for line in self.path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                # 書き込み中に落ちた行。捨てて先へ進む。
                continue
