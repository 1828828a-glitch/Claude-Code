"""プラグイン harness の、リポジトリごとの設定を読む

設定はリポジトリの .claude/harness.json に置く。無ければ既定値で動く。
書ける項目は plugins/harness/README.md を参照。書き方が少し違っても、
ここで形をそろえてから各フックに渡す。読めない値は既定値に戻す。
"""

from __future__ import annotations

import json
import os

# Stop フックの登録の timeout（200秒）より短くしておく
MAX_TEST_TIMEOUT = 190


def _str_list(value) -> list[str]:
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    return [str(v).strip() for v in value if isinstance(v, (str, int, float)) and str(v).strip()]


def _path_prefix(p: str) -> str:
    return p[2:] if p.startswith("./") else p


def normalize(data: dict) -> dict:
    out: dict = {}

    command = data.get("test_command")
    if isinstance(command, str) and command.strip():
        out["test_command"] = command.strip()
    elif isinstance(command, list):
        parts = _str_list(command)
        if parts:
            out["test_command"] = parts

    out["test_globs"] = _str_list(data.get("test_globs")) or ["*.py"]

    try:
        timeout = int(data.get("test_timeout") or 180)
    except (TypeError, ValueError):
        timeout = 180
    out["test_timeout"] = max(10, min(timeout, MAX_TEST_TIMEOUT))

    reminders = data.get("rebuild_reminders") or []
    if isinstance(reminders, dict):
        reminders = [reminders]
    out["rebuild_reminders"] = [
        {"paths": [_path_prefix(x) for x in _str_list(r.get("paths"))], "message": str(r.get("message") or "")}
        for r in reminders if isinstance(r, dict) and _str_list(r.get("paths"))
    ] if isinstance(reminders, list) else []
    return out


def load(project_dir: str) -> dict:
    path = os.path.join(project_dir, ".claude", "harness.json")
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        data = {}
    return normalize(data if isinstance(data, dict) else {})


def exists(project_dir: str) -> bool:
    return os.path.isfile(os.path.join(project_dir, ".claude", "harness.json"))
