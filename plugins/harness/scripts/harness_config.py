"""プラグイン harness の、リポジトリごとの設定を読む

設定はリポジトリの .claude/harness.json に置く。無ければ既定値で動く。
書ける項目は plugins/harness/README.md を参照。
"""

from __future__ import annotations

import json
import os


def load(project_dir: str) -> dict:
    path = os.path.join(project_dir, ".claude", "harness.json")
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}
