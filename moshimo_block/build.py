"""もしもブロック劇場を1枚のHTMLにまとめる

src/ の部品を shell.html に流し込んで dist/moshimo-block.html を作る。
この1枚が claude.ai の Artifact としてそのまま公開でき、render.cjs の動画書き出しにも使われる。
使い方: python moshimo_block/build.py
"""
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "dist" / "moshimo-block.html"

# JS はひとつの即時関数の中でスコープを共有する。順番に意味がある（部品 → 回 → プレイヤー）
CSS_FILES = ["style.css"]
JS_FILES = ["voxel.js", "props.js", "audio.js", "overlay.js", "kit.js"]
JS_FILES += [f"episodes/{p.name}" for p in sorted((SRC / "episodes").glob("*.js"))]
JS_FILES += ["player.js"]


def build() -> Path:
    shell = (SRC / "shell.html").read_text(encoding="utf-8")
    for marker in ("/*__CSS__*/", "/*__JS__*/"):
        assert shell.count(marker) == 1, marker
    css = "\n".join((SRC / f).read_text(encoding="utf-8") for f in CSS_FILES)
    js = "\n".join(f"/* ---- {f} ---- */\n" + (SRC / f).read_text(encoding="utf-8") for f in JS_FILES)
    js = "(function () {\n'use strict';\n" + js + "\n})();"
    assert "</script" not in js, "JS の中に </script が入っている"
    html = shell.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    return OUT


if __name__ == "__main__":
    out = build()
    print(f"wrote {out} ({out.stat().st_size // 1024} KB)")
