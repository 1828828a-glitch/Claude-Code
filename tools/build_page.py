#!/usr/bin/env python3
"""Inline a Japanese webfont subset into a single-file HTML page.

Both animated pieces in this repo ship as one self-contained .html: no CDN, no
external font, no network requests at all. That means the Japanese face has to
travel with the page, so this subsets IPAGothic down to exactly the characters
the source uses and drops it in as a woff2 data URI, replacing the
FONT_DATA_URI placeholder.

    python3 tools/build_page.py <src.html> <out.html>

Requires: fonttools[woff] (pip install fonttools brotli)
Font: IPAGothic, IPA Font License Agreement v1.0.
"""

import base64
import io
import pathlib
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf",
    "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
]

# Box-drawing characters used only in source comments as section markers.
IGNORE = set("░▒▓⏸▶│─┌┐└┘")

# Latin, digits and punctuation the face should carry even when a system stack
# would normally serve them.
ALWAYS = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    " .,:;/-—()「」・％℃"
)


def find_font() -> pathlib.Path:
    for path in FONT_CANDIDATES:
        p = pathlib.Path(path)
        if p.exists():
            return p
    sys.exit("no IPAGothic found; install fonts-ipafont-gothic")


def used_glyphs(html: str) -> str:
    return "".join(sorted({c for c in html if ord(c) > 0x7F} - IGNORE | set(ALWAYS)))


def build(src: pathlib.Path, out: pathlib.Path) -> None:
    html = src.read_text(encoding="utf-8")
    if "FONT_DATA_URI" not in html:
        sys.exit(f"{src} has no FONT_DATA_URI placeholder")

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
    uri = "data:font/woff2;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

    out.write_text(html.replace("FONT_DATA_URI", uri), encoding="utf-8")
    print(f"{len(text)} glyphs, {len(buf.getvalue()) / 1024:.1f} KB woff2 "
          f"-> {out} ({out.stat().st_size / 1024:.1f} KB)")

    body = out.read_text(encoding="utf-8")
    for pattern in (r'src=["\']https?://', r'href=["\']https?://[^"\']+\.css'):
        if re.search(pattern, body):
            sys.exit(f"built page references an external resource: {pattern}")


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("usage: python3 tools/build_page.py <src.html> <out.html>")
    build(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]))


if __name__ == "__main__":
    main()
