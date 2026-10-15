#!/usr/bin/env bash
# Google Fonts から明朝体などを取ってきて fonts/ に置く（fonts/ はリポジトリに入れていない）
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p fonts
CSS_URL='https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Zen+Kaku+Gothic+New:wght@300;400&family=Noto+Serif+JP:wght@200;300;500;700&family=Shippori+Mincho+B1:wght@700;800&family=Jost:wght@300;400;500&display=swap'
curl -sS -A 'curl/8' "$CSS_URL" > fonts/fonts.css
python3 - <<'PY'
import re, subprocess
css = open('fonts/fonts.css').read()
out = []
for block in re.findall(r'@font-face\s*\{(.*?)\}', css, re.S):
    fam = re.search(r"font-family: '([^']+)'", block).group(1)
    st = re.search(r"font-style: (\w+)", block).group(1)
    w = re.search(r"font-weight: (\d+)", block).group(1)
    url = re.search(r"url\((.*?)\)", block).group(1)
    fn = f"{fam.replace(' ', '')}-{w}{'i' if st == 'italic' else ''}.ttf"
    subprocess.run(['curl', '-sS', '-o', f'fonts/{fn}', url], check=True)
    out.append(f"@font-face{{font-family:'{fam}';font-style:{st};font-weight:{w};src:url('{fn}') format('truetype');}}")
open('fonts/local.css', 'w').write("\n".join(out) + "\n")
PY
echo "fonts ready"
