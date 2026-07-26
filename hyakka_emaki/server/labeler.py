"""立札に添える一文を用意する。

ANTHROPIC_API_KEY があれば Claude に書かせ、なければ手元の言葉で組み立てる。
どちらの経路でも失敗しない（最悪でも植物名だけの札になる）。
"""

from __future__ import annotations

import asyncio
import random
import unicodedata

from . import config

SYSTEM_PROMPT = """あなたは架空の植物図鑑をつくる書き手です。
来場者が描いた草花に添える「立札」の一文を書きます。

規則:
- 日本語で、20〜40字ちょうど一文。改行しない。
- 植物名と説明を踏まえ、その草花の佇まいや育ち方を風流に言い切る。
- 花鳥画の画賛のような、静かで具体的な言葉を選ぶ。
- 説明が短くても勝手に別の植物にしない。書かれた特徴を活かす。
- 前置き・鉤括弧・絵文字・句点以外の記号は使わない。
- 本文だけを出力する。"""

# API を使わないときの下地。植物名を主語にして繋げる。
_CLOSINGS = (
    "朝の光を待って静かにひらく。",
    "風の通り道にだけ根を張るという。",
    "夕暮れどきにいちばん濃く香る。",
    "水辺の石のあいだから伸びてくる。",
    "手をかけぬほどよく育つと伝わる。",
    "雨の翌朝、葉先に露をためている。",
    "陽の傾きにあわせて向きを変える。",
    "冬を越すたび丈をひとつ増すという。",
)

MAX_LABEL_LENGTH = 60


def normalize(text: str, *, limit: int) -> str:
    """全角空白や改行をならし、長さを詰める。"""
    cleaned = " ".join(unicodedata.normalize("NFKC", text).split())
    return cleaned[:limit]


def local_label(name: str, description: str) -> str:
    """手元で組み立てる立札の一文。"""
    seed = sum(ord(character) for character in f"{name}{description}")
    closing = _CLOSINGS[seed % len(_CLOSINGS)]

    if description:
        head = description.rstrip("。").split("。")[0]
        sentence = f"{head}。{closing}"
    else:
        sentence = f"{name}。{closing}"

    return normalize(sentence, limit=MAX_LABEL_LENGTH)


async def claude_label(name: str, description: str) -> str | None:
    """Claude に立札の一文を書かせる。使えない場合は None を返す。"""
    if not config.ANTHROPIC_API_KEY:
        return None

    try:
        import anthropic
    except ImportError:
        return None

    client = anthropic.AsyncAnthropic(api_key=config.ANTHROPIC_API_KEY)
    request = (
        f"植物名: {name}\n"
        f"来場者による説明: {description or '（説明なし）'}\n\n"
        "この草花の立札に添える一文を書いてください。"
    )

    try:
        response = await client.messages.create(
            model=config.LABEL_MODEL,
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            output_config={"effort": "low"},
            messages=[{"role": "user", "content": request}],
        )
    except Exception:
        # 会場では止まらないことが最優先。失敗はローカル生成に委ねる。
        return None
    finally:
        await client.close()

    if response.stop_reason == "refusal":
        return None

    text = "".join(block.text for block in response.content if block.type == "text")
    label = normalize(text, limit=MAX_LABEL_LENGTH)
    return label or None


async def refined_label(name: str, description: str, *, timeout: float = 20.0) -> str | None:
    """Claude が書いた立札を返す。使えない・間に合わないときは None。

    株はローカル生成の立札で先に庭へ出しているので、ここは失敗しても構わない。
    """
    if not config.ANTHROPIC_API_KEY:
        return None
    try:
        return await asyncio.wait_for(claude_label(name, description), timeout)
    except (asyncio.TimeoutError, asyncio.CancelledError):
        return None
