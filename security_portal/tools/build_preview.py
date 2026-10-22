"""確認用の1ファイル版を作る（CSS・JS・データを index.html に埋め込む）

公開用のサイトは site/ をそのまま置けばよい。これは、サーバーなしで開いて確かめたいとき用。
使い方: python3 security_portal/tools/build_preview.py [出力先]（既定は security_portal/dist/preview.html）
"""
import base64
import json
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / "site"
html = (SITE / "index.html").read_text(encoding="utf-8")

data = {n: json.loads((SITE / "data" / f"{n}.json").read_text(encoding="utf-8"))
        for n in ("questions", "scenes", "cases", "risks", "actions", "news", "config", "sitecheck")}
blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

css = (SITE / "assets" / "style.css").read_text(encoding="utf-8")
mark = "data:image/svg+xml;base64," + base64.b64encode((SITE / "assets" / "mark.svg").read_bytes()).decode()


def inline_script(m):
    src = (SITE / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
    return f"<script>\n{src}\n</script>"


html = html.replace('<link rel="stylesheet" href="assets/style.css">', f"<style>\n{css}\n</style>")
html = html.replace('src="assets/mark.svg"', f'src="{mark}"').replace('href="assets/mark.svg"', f'href="{mark}"')
html = html.replace('<script src="assets/scoring.js"></script>',
                    f'<script id="portal-data" type="application/json">{blob}</script>\n<script src="assets/scoring.js"></script>')
html = re.sub(r'<script src="(assets/[a-z]+\.js)"></script>', inline_script, html)
assert "assets/style.css" not in html and 'src="assets/' not in html

out = Path(sys.argv[1]) if len(sys.argv) > 1 else SITE.parent / "dist" / "preview.html"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding="utf-8")
print(out, len(out.read_bytes()), "bytes")
