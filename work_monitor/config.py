"""設定の読み込み。~/.work_monitor/config.json を読み、無ければデフォルトで生成する。"""

from __future__ import annotations

import json
import os
from pathlib import Path

DATA_DIR = Path(os.environ.get("WORK_MONITOR_HOME", Path.home() / ".work_monitor"))
CONFIG_PATH = DATA_DIR / "config.json"

DEFAULTS = {
    # 収集の間隔 (秒)。画面は毎サイクル、他ソースは slow_every サイクルに1回。
    "interval_seconds": 60,
    "slow_every": 5,
    # 画面キャプチャ
    "screen": {
        "enabled": True,
        # OCR言語 (pytesseract)。日本語は要 tesseract-lang の jpn データ
        "ocr_lang": "jpn+eng",
        # OCRテキストの保存上限文字数
        "max_chars": 2000,
    },
    # Claude Code 会話履歴
    "claude_logs": {
        "enabled": True,
        "projects_dir": str(Path.home() / ".claude" / "projects"),
        "max_chars": 500,
    },
    # Slack (user token: xoxp-... を環境変数 SLACK_TOKEN で渡す)
    "slack": {
        "enabled": False,
        "channels": [],  # チャンネルID のリスト。空なら自分が参加中の全チャンネル
        "max_messages_per_poll": 50,
    },
    # 議事録・メモのフォルダ (更新されたテキスト系ファイルを取り込む)
    "notes": {
        "enabled": True,
        "dirs": [],
        "extensions": [".md", ".txt"],
        "max_chars": 3000,
    },
    # 日報・文脈生成に使う claude CLI コマンド
    "claude_cli": "claude",
    # 除外パターン (ウィンドウタイトルやOCRテキストにこの語が含まれる分は記録しない)
    "exclude_keywords": ["パスワード", "password", "1Password", "秘密鍵"],
}


def _merge(base: dict, override: dict) -> dict:
    out = dict(base)
    for k, v in override.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out


def load_config() -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if CONFIG_PATH.exists():
        try:
            user_cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            user_cfg = {}
        return _merge(DEFAULTS, user_cfg)
    CONFIG_PATH.write_text(
        json.dumps(DEFAULTS, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return dict(DEFAULTS)
