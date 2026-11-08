#!/usr/bin/env python3
"""Stop フック：Python を変えたまま「終わりました」と言わせない

作業を終える直前に走る。未コミットの .py があるときだけテストを回し、
落ちていたら止まらせずに Claude へ差し戻す。
同じ差分で前回通っていれば回さない。同じ失敗で2回差し戻したら、
堂々めぐりを避けるためにそれ以上は止めない（報告は Claude に任せる）。
pytest が入っていない環境では何もしない。
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys

MAX_BOUNCES = 2


def run(cmd: list[str], cwd: str, timeout: int = 10) -> subprocess.CompletedProcess[str] | None:
    try:
        return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    except (OSError, subprocess.SubprocessError):
        return None


def python_diff_hash(project_dir: str) -> str | None:
    status = run(["git", "status", "--porcelain", "--", "*.py"], project_dir)
    if status is None or status.returncode != 0 or not status.stdout.strip():
        return None
    h = hashlib.sha256()
    diff = run(["git", "diff", "HEAD", "--", "*.py"], project_dir)
    h.update((diff.stdout if diff else "").encode())
    for line in status.stdout.splitlines():
        if line.startswith("??"):
            path = os.path.join(project_dir, line[3:].strip())
            if os.path.isfile(path):
                with open(path, "rb") as f:
                    h.update(f.read())
    return h.hexdigest()


def load_state(path: str) -> dict:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}


def save_state(path: str, state: dict) -> None:
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(state, f)
    except OSError:
        pass


def main() -> int:
    try:
        json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        pass
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    if not os.path.isdir(os.path.join(project_dir, "tests")):
        return 0
    digest = python_diff_hash(project_dir)
    if digest is None:
        return 0

    state_path = os.path.join(project_dir, ".claude", "state", "stop_tests.json")
    state = load_state(state_path)
    if state.get("green") == digest:
        return 0
    if state.get("red") == digest and state.get("bounces", 0) >= MAX_BOUNCES:
        return 0

    probe = run([sys.executable, "-c", "import pytest"], project_dir)
    if probe is None or probe.returncode != 0:
        return 0

    result = run([sys.executable, "-m", "pytest", "-q", "-x", "--no-header", "-p", "no:cacheprovider", "tests"],
                 project_dir, timeout=180)
    if result is None:
        return 0
    if result.returncode == 0:
        save_state(state_path, {"green": digest})
        return 0

    bounces = state.get("bounces", 0) + 1 if state.get("red") == digest else 1
    save_state(state_path, {"red": digest, "bounces": bounces})
    tail = "\n".join((result.stdout + result.stderr).strip().splitlines()[-25:])
    print(json.dumps({
        "decision": "block",
        "reason": f"Python を変えたあとのテストが落ちています。直してから終えてください。\n{tail}",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
