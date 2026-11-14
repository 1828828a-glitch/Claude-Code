#!/usr/bin/env python3
"""PostToolUse フック：書いた直後に壊れていないか見る

Edit・Write のあとに走る。
Python と JSON は構文を確かめ、壊れていたらその場で Claude に差し戻す。
.claude/harness.json の rebuild_reminders に書いたパスを触ったときは、
そこに書いた作り直しの知らせを Claude に添える。
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import harness_config  # noqa: E402

def check(path: str, project_dir: str) -> tuple[str | None, str | None]:
    """(差し戻す理由, 添える情報) を返す"""
    if not path or not os.path.isfile(path):
        return None, None
    rel = os.path.relpath(path, project_dir) if project_dir else path

    if path.endswith(".py"):
        try:
            with open(path, encoding="utf-8") as f:
                compile(f.read(), path, "exec")
        except SyntaxError as e:
            return f"{rel}:{e.lineno} に構文エラーがあります（{e.msg}）。直してから先に進んでください。", None
        except UnicodeDecodeError:
            return f"{rel} が UTF-8 で読めません。", None
    elif path.endswith(".json"):
        try:
            with open(path, encoding="utf-8") as f:
                json.load(f)
        except json.JSONDecodeError as e:
            return f"{rel}:{e.lineno} の JSON が壊れています（{e.msg}）。", None

    rel_posix = rel.replace(os.sep, "/")
    for rule in harness_config.load(project_dir)["rebuild_reminders"]:
        if any(rel_posix.startswith(x) for x in rule["paths"]):
            return None, f"{rel} を変えました。{rule.get('message') or '作業の区切りで作り直してください。'}"
    return None, None


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    tool_input = payload.get("tool_input") or {}
    path = tool_input.get("file_path") or tool_input.get("notebook_path") or ""
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or ""
    if path and not os.path.isabs(path) and project_dir:
        path = os.path.join(project_dir, path)

    problem, note = check(path, project_dir)
    if problem:
        print(json.dumps({"decision": "block", "reason": problem}, ensure_ascii=False))
    elif note:
        print(json.dumps({
            "hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": note}
        }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
