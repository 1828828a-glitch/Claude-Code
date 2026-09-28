#!/usr/bin/env python3
"""index.html で使う文字だけを含むフォントを作り、base64 で HTML に埋め込む。

テロップやナレーションの文言を変えたら、このスクリプトをもう一度実行する。
    pip install fonttools brotli
    python3 tools/embed_fonts.py

元フォント（Google Fonts / SIL Open Font License）は tools/.fonts/ に置く。
無ければ github.com/google/fonts から取得する。
"""
from __future__ import annotations

import base64
import io
import re
import sys
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"
CACHE = Path(__file__).resolve().parent / ".fonts"
BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl"
SOURCES = {
    "ZenKakuGothicNew-Black.ttf": f"{BASE}/zenkakugothicnew/ZenKakuGothicNew-Black.ttf",
    "ZenKakuGothicNew-Bold.ttf": f"{BASE}/zenkakugothicnew/ZenKakuGothicNew-Bold.ttf",
    "Syne-VF.ttf": f"{BASE}/syne/Syne%5Bwght%5D.ttf",
}
BEGIN, END = "/* FONTS:BEGIN */", "/* FONTS:END */"


def source(name: str) -> Path:
    path = CACHE / name
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        print(f"download {name}")
        with urllib.request.urlopen(SOURCES[name]) as r:
            path.write_bytes(r.read())
    return path


def charset(html: str) -> str:
    body = re.sub(re.escape(BEGIN) + r".*?" + re.escape(END), "", html, flags=re.S)
    chars = set(body)
    chars |= {chr(c) for c in range(0x20, 0x7F)}      # ASCII
    chars |= {chr(c) for c in range(0x3000, 0x3040)}  # 和文の記号
    chars |= {chr(c) for c in range(0x3041, 0x3097)}  # ひらがな
    chars |= {chr(c) for c in range(0x30A0, 0x3100)}  # カタカナ
    chars |= {chr(c) for c in range(0xFF01, 0xFF5F)}  # 全角英数と記号
    chars |= set("・ー―…※〜“”‘’")
    return "".join(sorted(c for c in chars if c.isprintable() or c == " "))


def subset_woff2(font: TTFont, text: str) -> bytes:
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["kern", "palt", "liga", "calt"]
    opts.hinting = False
    opts.desubroutinize = True
    opts.name_IDs = ["*"]
    sub = subset.Subsetter(options=opts)
    sub.populate(text=text)
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = "woff2"
    font.save(buf)
    return buf.getvalue()


def face(family: str, weight: int, data: bytes) -> str:
    b64 = base64.b64encode(data).decode("ascii")
    return (
        f"@font-face{{font-family:'{family}';font-weight:{weight};font-style:normal;font-display:block;"
        f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}"
    )


def main() -> int:
    html = HTML.read_text(encoding="utf-8")
    if BEGIN not in html or END not in html:
        print("index.html に FONTS マーカーがありません", file=sys.stderr)
        return 1
    text = charset(html)
    rules = []
    for weight, name in ((900, "ZenKakuGothicNew-Black.ttf"), (700, "ZenKakuGothicNew-Bold.ttf")):
        data = subset_woff2(TTFont(source(name)), text)
        rules.append(face("ZKG Local", weight, data))
        print(f"ZKG Local {weight}: {len(data) / 1024:.0f} KB")
    latin = "".join(chr(c) for c in range(0x20, 0x7F)) + "“”‘’"
    for weight in (800,):
        vf = TTFont(source("Syne-VF.ttf"))
        static = instancer.instantiateVariableFont(vf, {"wght": weight})
        data = subset_woff2(static, latin)
        rules.append(face("Syne Local", weight, data))
        print(f"Syne Local {weight}: {len(data) / 1024:.0f} KB")
    block = BEGIN + "\n" + "\n".join(rules) + "\n" + END
    html = re.sub(re.escape(BEGIN) + r".*?" + re.escape(END), lambda _: block, html, flags=re.S)
    HTML.write_text(html, encoding="utf-8")
    print(f"index.html: {HTML.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
