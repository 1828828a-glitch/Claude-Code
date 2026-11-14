#!/usr/bin/env python3
"""UserPromptSubmit フック：チャットに貼られた鍵を送信前に止める

APIキーやトークンらしき文字列が入っていたら、その依頼をモデルに渡さずに止める。
止めた依頼は会話に残らないので、鍵を .env に移してから書き直してもらう。
鍵そのものは表示しない。種類だけを伝える。
"""

from __future__ import annotations

import json
import re
import sys

PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("Anthropic のAPIキー", re.compile(r"sk-ant-[A-Za-z0-9_\-]{20,}")),
    ("OpenAI のAPIキー", re.compile(r"\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_\-]{32,}")),
    ("GitHub のトークン", re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})")),
    ("AWS のアクセスキー", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("Google のAPIキー", re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b")),
    ("Slack のトークン", re.compile(r"\bxox[abprs]-[A-Za-z0-9\-]{10,}")),
    ("Stripe の本番キー", re.compile(r"\b[sr]k_live_[A-Za-z0-9]{16,}")),
    ("秘密鍵", re.compile(r"-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----")),
    # KEY=値 の形で、値が長いランダムな英数字になっているもの
    ("鍵らしき値", re.compile(
        r"(?i)\b[A-Z0-9_]*(?:api[_-]?key|secret|token|password|passwd)[A-Z0-9_]*\s*[:=]\s*[\"']?"
        r"(?=[A-Za-z0-9_\-./+]*\d)(?=[A-Za-z0-9_\-./+]*[A-Za-z])[A-Za-z0-9_\-./+]{24,}")),
]


def find_secrets(text: str) -> list[str]:
    kinds = []
    for kind, pattern in PATTERNS:
        if pattern.search(text) and kind not in kinds:
            kinds.append(kind)
    return kinds


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    kinds = find_secrets(payload.get("prompt", "") or "")
    if not kinds:
        return 0
    print(json.dumps({
        "decision": "block",
        "reason": (
            f"{'・'.join(kinds)}らしき文字列が入っていたので、送信を止めました。"
            "鍵はリポジトリ直下の .env に KEY=値 の形で書き、チャットでは名前だけを使ってください。"
            "本物の鍵だった場合は、念のため発行元で作り直すのが安全です。"
        ),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
