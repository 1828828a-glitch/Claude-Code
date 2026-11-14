#!/usr/bin/env python3
"""SessionStart フック：作業を始める前に、今の状態を Claude に渡す

ブランチ、未コミットの変更の数、.env に入っている鍵の「名前」を伝える。
鍵の値は読み捨てて、外には出さない。
"""

from __future__ import annotations

import os
import re
import subprocess
import sys


# 鍵を実行時に読み込むラッパー。プラグインの bin/ にある
WITH_ENV = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bin", "with-env")


def git(*args: str, cwd: str) -> str:
    try:
        out = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, timeout=5)
        return out.stdout.strip() if out.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""


def env_key_names(path: str) -> list[str] | None:
    if not os.path.isfile(path):
        return None
    names = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            m = re.match(r"\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S?)", line)
            if m:
                names.append(m.group(1) + ("" if m.group(2) else "（空）"))
    return names


def build_context(project_dir: str) -> str:
    lines = []
    branch = git("rev-parse", "--abbrev-ref", "HEAD", cwd=project_dir)
    if branch:
        changed = [ln for ln in git("status", "--porcelain", cwd=project_dir).splitlines() if ln]
        lines.append(f"ブランチ: {branch}、未コミットの変更: {len(changed)}件")

    names = env_key_names(os.path.join(project_dir, ".env"))
    if names is None:
        lines.append(f".env: なし。鍵が要るときは .env.example を写して作ってもらう。読み込みは {WITH_ENV}")
    elif names:
        lines.append(f".env にある鍵の名前: {', '.join(names)}（値は読まない。使うときは {WITH_ENV} を前に付けて実行する）")
    else:
        lines.append(".env: あるが鍵は空")
    if not os.path.isfile(os.path.join(project_dir, ".claude", "harness.json")):
        lines.append(".claude/harness.json: なし。テストの設定や鍵の置き場を作るなら harness-setup スキルを使う")
    return "\n".join(lines)


def main() -> int:
    try:
        sys.stdin.read()
    except OSError:
        pass
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    print(build_context(project_dir))
    return 0


if __name__ == "__main__":
    sys.exit(main())
