"""チャンネル設定と保存先

チャンネルの方針（語り口・冒頭と締めの言葉・避ける題材）は channel.json で上書きできる。
置き場所は作業フォルダ（既定は ./sleep_projects、環境変数 SLEEP_CHANNEL_DIR で変更）。
"""

from dataclasses import asdict, dataclass, field, fields
import json
import os
from pathlib import Path

DEFAULT_MODEL = "claude-opus-5-5"
DEFAULT_EFFORT = "medium"
# server-side fallbacks の "default" 形式を受け付けるモデル
FALLBACK_MODELS = {"claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"}
FALLBACK_BETA = "server-side-fallback-2026-07-01"

# ゆっくりした日本語ナレーションの1分あたり文字数の目安。音声の速さを変えたら合わせて調整する
DEFAULT_CHARS_PER_MINUTE = 270


def data_dir() -> Path:
    return Path(os.environ.get("SLEEP_CHANNEL_DIR", Path.cwd() / "sleep_projects"))


def chars_per_minute() -> int:
    try:
        return int(os.environ.get("SLEEP_CPM", DEFAULT_CHARS_PER_MINUTE))
    except ValueError:
        return DEFAULT_CHARS_PER_MINUTE


@dataclass
class Channel:
    name: str = "眠りの歴史帖"
    concept: str = (
        "歴史の中の人々の暮らし、仕事、道具、制度を、静かな語りで少しずつ解説する。"
        "合戦や事件の盛り上がりより、当時の一日の過ごし方、食べ物、町の音、季節の移ろいを描く。"
    )
    narrator: str = "落ち着いた低めの声の語り手。聞き手に語りかけるが、感情の起伏は小さく、急がない。"
    intro: str = "今夜は、{theme}についてお話しします。灯りを落として、楽な姿勢でお聞きください。"
    outro: str = "今夜のお話はここまでです。最後までお付き合いいただき、ありがとうございました。よい眠りを。"
    avoid: list[str] = field(default_factory=lambda: [
        "残酷な場面や病状の生々しい描写",
        "現代の政治や宗教をめぐる論争",
        "俗説や創作を史実のように断定すること",
    ])
    hashtags: list[str] = field(default_factory=lambda: ["睡眠用", "歴史", "朗読", "作業用"])

    def intro_for(self, theme: str) -> str:
        return self.intro.replace("{theme}", theme)


def load_channel(root: Path | None = None) -> Channel:
    path = (root or data_dir()) / "channel.json"
    if not path.exists():
        return Channel()
    raw = json.loads(path.read_text(encoding="utf-8"))
    known = {f.name for f in fields(Channel)}
    return Channel(**{k: v for k, v in raw.items() if k in known})


def save_channel(channel: Channel, root: Path | None = None) -> Path:
    root = root or data_dir()
    root.mkdir(parents=True, exist_ok=True)
    path = root / "channel.json"
    path.write_text(json.dumps(asdict(channel), ensure_ascii=False, indent=2), encoding="utf-8")
    return path
