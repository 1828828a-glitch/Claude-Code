#!/usr/bin/env python3
"""PostToolUse フック：書いた直後に壊れていないか見る

Edit・Write のあとに走る。
Python と JSON は構文を確かめ、壊れていたらその場で Claude に差し戻す。
フリオチLAB の問題バンクや Web版の部品を触ったときは、
Web版（furiochi-lab.html）の作り直しが要ることを伝える。
"""

from __future__ import annotations

import json
import os
import sys

WEB_SOURCES = (
    "furiochi_lab/data/",
    "furiochi_lab/web/src/",
    "furiochi_lab/engine/ai_coach.py",
    "furiochi_lab/engine/rubric.py",
)


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

    if rel.replace(os.sep, "/").startswith(WEB_SOURCES):
        return None, (
            f"{rel} は Web版 に埋め込まれる部品です。"
            "作業の区切りで python furiochi_lab/web/build.py を実行し、Web版を作り直してください。"
        )
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
