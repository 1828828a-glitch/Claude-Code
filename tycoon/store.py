"""実データの置き場。

JSON ファイル一枚。単一ユーザーの CLI 前提なので DB は使わない。
後で SQLite や Postgres に差し替えるとき、触るのはこのファイルだけで済むように
外向きの API は「エンティティ単位の関数」に閉じている。
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_PATH = Path("tycoon_data.json")

_EMPTY: dict[str, Any] = {
    "customers": [],
    "jobs": [],
    "tasks": [],
    "proposals": [],
    "runs": [],
}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


class Store:
    def __init__(self, path: str | Path = DEFAULT_PATH):
        self.path = Path(path)
        self._data: dict[str, Any] = json.loads(json.dumps(_EMPTY))
        if self.path.exists():
            self._data = json.loads(self.path.read_text(encoding="utf-8"))
            for key, empty in _EMPTY.items():
                self._data.setdefault(key, json.loads(json.dumps(empty)))

    # ---- 永続化 ----

    def save(self) -> None:
        """一時ファイル経由で書き出す。途中で落ちても既存データを壊さない。"""
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(
            json.dumps(self._data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        os.replace(tmp, self.path)

    # ---- 顧客 ----

    def customers(self) -> list[dict]:
        return self._data["customers"]

    def customer(self, customer_id: str) -> dict | None:
        return next((c for c in self.customers() if c["id"] == customer_id), None)

    def add_customer(self, name: str, **fields: Any) -> dict:
        customer = {"id": new_id("cust"), "name": name, "created_at": now(), **fields}
        self.customers().append(customer)
        return customer

    # ---- 案件 ----

    def jobs(self, stage: str | None = None) -> list[dict]:
        jobs = self._data["jobs"]
        return [j for j in jobs if j["stage"] == stage] if stage else list(jobs)

    def job(self, job_id: str) -> dict | None:
        return next((j for j in self._data["jobs"] if j["id"] == job_id), None)

    def add_job(self, title: str, stage: str, customer_id: str | None = None, **fields) -> dict:
        job = {
            "id": new_id("job"),
            "title": title,
            "stage": stage,
            "customer_id": customer_id,
            "created_at": now(),
            "updated_at": now(),
            "fields": fields,
            "communications": [],
            "notes": [],
        }
        self._data["jobs"].append(job)
        return job

    def touch_job(self, job: dict) -> None:
        job["updated_at"] = now()

    # ---- タスク ----

    def tasks(self, *, open_only: bool = True) -> list[dict]:
        tasks = self._data["tasks"]
        return [t for t in tasks if not t.get("done")] if open_only else list(tasks)

    def add_task(self, title: str, job_id: str | None, due: str | None, owner: str) -> dict:
        task = {
            "id": new_id("task"),
            "title": title,
            "job_id": job_id,
            "due": due,
            "owner": owner,
            "done": False,
            "created_at": now(),
        }
        self._data["tasks"].append(task)
        return task

    # ---- 提案（人間の承認待ち） ----

    def proposals(self, status: str | None = "pending") -> list[dict]:
        props = self._data["proposals"]
        return [p for p in props if p["status"] == status] if status else list(props)

    def proposal(self, proposal_id: str) -> dict | None:
        return next((p for p in self._data["proposals"] if p["id"] == proposal_id), None)

    def add_proposal(
        self, *, run_id: str, agent: str, kind: str, payload: dict, reason: str
    ) -> dict:
        proposal = {
            "id": new_id("prop"),
            "run_id": run_id,
            "agent": agent,
            "kind": kind,
            "payload": payload,
            "reason": reason,
            "status": "pending",
            "created_at": now(),
            "decided_at": None,
            "note": None,
        }
        self._data["proposals"].append(proposal)
        return proposal

    # ---- 実行履歴 ----

    def runs(self, limit: int = 20) -> list[dict]:
        return list(reversed(self._data["runs"]))[:limit]

    def add_run(self, *, agent: str, prompt: str) -> dict:
        run = {
            "id": new_id("run"),
            "agent": agent,
            "prompt": prompt,
            "started_at": now(),
            "finished_at": None,
            "summary": None,
            "usage": None,
        }
        self._data["runs"].append(run)
        return run

    def finish_run(
        self, run: dict, *, summary: str, usage: dict | None = None
    ) -> None:
        run["finished_at"] = now()
        run["summary"] = summary
        run["usage"] = usage
