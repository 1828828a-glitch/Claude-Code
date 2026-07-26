"""動作確認用のサンプルデータ。

中身は business.yaml の `sample_data:` に書く。だから業種を差し替えても
サンプルが一緒に付いてくるし、このファイルを直す必要はない。

日付は相対で書ける。`"+21d"` は21日後、`"-13d"` は13日前。
サンプルがいつまでも「放置されたまま」に見えるように、実行日を基準に解決する。
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

from .domain import Business
from .store import Store

_RELATIVE = re.compile(r"^([+-])(\d+)d$")


def _resolve(value: Any) -> Any:
    """"+21d" / "-13d" を実際の日付に変換する。それ以外はそのまま。"""
    if isinstance(value, str):
        match = _RELATIVE.match(value.strip())
        if match:
            sign = 1 if match.group(1) == "+" else -1
            return (date.today() + timedelta(days=sign * int(match.group(2)))).isoformat()
    return value


def _timestamp(days_ago: int) -> str:
    moment = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return moment.isoformat(timespec="seconds")


def seed(store: Store, business: Business) -> int:
    """business.yaml の sample_data を実データとして流し込む。

    すでに案件があれば何もしない。実データを上書きしないため。
    """
    if store.jobs():
        return 0

    sample = business.sample_data
    if not sample:
        return 0

    # 顧客を先に作り、YAML内のキーで参照できるようにする
    by_key: dict[str, str] = {}
    for spec in sample.get("customers", []):
        fields = {k: _resolve(v) for k, v in spec.get("fields", {}).items()}
        customer = store.add_customer(spec["name"], **fields)
        by_key[spec.get("key", spec["name"])] = customer["id"]

    for spec in sample.get("jobs", []):
        stage = spec.get("stage") or business.first_stage.key
        if business.stage(stage) is None:
            raise ValueError(
                f"sample_data の案件「{spec.get('title')}」が未定義の段階 `{stage}` を指しています"
            )

        fields = {k: _resolve(v) for k, v in spec.get("fields", {}).items()}
        job = store.add_job(
            title=spec["title"],
            stage=stage,
            customer_id=by_key.get(spec.get("customer", "")),
            **fields,
        )

        for note in spec.get("notes", []):
            job["notes"].append(
                {"at": _timestamp(spec.get("stale_days", 0)), "by": "オーナー", "text": note}
            )

        for comm in spec.get("communications", []):
            job["communications"].append(
                {
                    "at": _timestamp(comm.get("days_ago", 0)),
                    "direction": comm.get("direction", "out"),
                    "channel": comm.get("channel", "email"),
                    "subject": comm.get("subject", ""),
                    "body": comm.get("body", ""),
                    "sent_by": comm.get("sent_by", "オーナー"),
                }
            )

        # 「何日も放置されている」状態を再現する。取りこぼし監視の的になる。
        job["updated_at"] = _timestamp(spec.get("stale_days", 0))

    store.save()
    return len(store.jobs())
