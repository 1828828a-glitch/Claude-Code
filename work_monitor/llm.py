"""claude CLI (claude -p) 経由でテキスト生成する薄いラッパー。

API キー管理を増やさないため、ローカルにインストール済みの Claude Code CLI を
そのまま使う。CLI が無い環境では None を返し、呼び出し側がフォールバックする。
"""

from __future__ import annotations

import subprocess


def generate(prompt: str, claude_cli: str = "claude", timeout: int = 300) -> str | None:
    try:
        result = subprocess.run(
            [claude_cli, "-p", "--output-format", "text"],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except FileNotFoundError:
        print(f"[warn] '{claude_cli}' コマンドが見つかりません。Claude Code CLI をインストールしてください。")
        return None
    except subprocess.TimeoutExpired:
        print("[warn] claude CLI がタイムアウトしました。")
        return None
    if result.returncode != 0:
        print(f"[warn] claude CLI がエラー終了しました: {result.stderr[:500]}")
        return None
    text = result.stdout.strip()
    return text or None
