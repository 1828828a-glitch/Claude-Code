"""百花繚乱絵巻の設定。環境変数で上書きできる。"""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = Path(os.environ.get("HANA_DATA_DIR", BASE_DIR / "data"))
PLANT_DIR = DATA_DIR / "plants"
GARDEN_FILE = DATA_DIR / "garden.json"

HOST = os.environ.get("HANA_HOST", "0.0.0.0")
PORT = int(os.environ.get("HANA_PORT", "8000"))

# 大画面に表示するQRコードが指す先。会場のLAN内IPを入れる（例 http://192.168.1.20:8000）。
# 未設定ならディスプレイを開いたブラウザのオリジンをそのまま使う。
PUBLIC_URL = os.environ.get("HANA_PUBLIC_URL", "").rstrip("/")

# 庭に同時に生やす株の上限。超えた分は古いものから枯れて土に還る。
MAX_PLANTS = int(os.environ.get("HANA_MAX_PLANTS", "60"))

# 同一端末からの連投を防ぐクールダウン（秒）
SUBMIT_COOLDOWN = float(os.environ.get("HANA_SUBMIT_COOLDOWN", "8"))

# アップロード画像の上限（バイト）
MAX_UPLOAD_BYTES = int(os.environ.get("HANA_MAX_UPLOAD_BYTES", str(12 * 1024 * 1024)))

# 立札の文章をClaudeに書かせる場合のみ使用。未設定ならローカル生成にフォールバック。
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
LABEL_MODEL = os.environ.get("HANA_LABEL_MODEL", "claude-opus-5")
