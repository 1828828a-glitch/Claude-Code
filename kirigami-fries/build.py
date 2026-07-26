#!/usr/bin/env python3
"""Build kirigami-fries/index.html from src/page.html.

The page is a self-contained, single-file artifact: no CDN, no external font.
This script subsets IPAGothic down to exactly the characters the page uses and
inlines it as a woff2 data URI in place of the FONT_DATA_URI placeholder.

Requires: fonttools[woff] (pip install fonttools brotli)
Font: IPAGothic (/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf),
      IPA Font License Agreement v1.0.
"""

import base64
import io
import pathlib
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

HERE = pathlib.Path(__file__).parent
SRC = HERE / "src" / "page.html"
OUT = HERE / "index.html"
FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf",
    "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
]

# Box-drawing characters used only in HTML comments as scene markers.
IGNORE = set("░⏸▶")


def find_font() -> pathlib.Path:
    for path in FONT_CANDIDATES:
        p = pathlib.Path(path)
        if p.exists():
            return p
    sys.exit("no IPAGothic found; install fonts-ipafont-gothic")


def used_glyphs(html: str) -> str:
    """Every character the page can render, minus ASCII we never fall back for."""
    chars = {c for c in html if ord(c) > 0x7F} - IGNORE
    # keep latin + digits + common punctuation so the face can carry a label
    # on its own if a system stack ever fails to resolve.
    chars |= set(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;/-—()「」・％"
    )
    return "".join(sorted(chars))


def main() -> None:
    html = SRC.read_text(encoding="utf-8")
    if "FONT_DATA_URI" not in html:
        sys.exit("src/page.html has no FONT_DATA_URI placeholder")

    text = used_glyphs(html)
    font = TTFont(find_font())
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.desubroutinize = True
    options.drop_tables += ["DSIG"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)

    buf = io.BytesIO()
    font.flavor = "woff2"
    font.save(buf)
    payload = base64.b64encode(buf.getvalue()).decode("ascii")
    uri = f"data:font/woff2;base64,{payload}"

    OUT.write_text(html.replace("FONT_DATA_URI", uri), encoding="utf-8")
    print(f"{len(text)} glyphs, {len(buf.getvalue()) / 1024:.1f} KB woff2 "
          f"-> {OUT.relative_to(HERE.parent)} ({OUT.stat().st_size / 1024:.1f} KB)")

    # the built page must stay self-contained
    body = OUT.read_text(encoding="utf-8")
    for pattern in (r'src=["\']https?://', r'href=["\']https?://[^"\']+\.css'):
        if re.search(pattern, body):
            sys.exit(f"built page references an external resource: {pattern}")


if __name__ == "__main__":
    main()
