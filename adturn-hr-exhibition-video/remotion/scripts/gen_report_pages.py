from PIL import Image, ImageDraw, ImageFont
import os

# レポート紙面のプレースホルダ生成(実運用では実レポートのスクショに差し替える)
W, H = 1240, 1754
os.makedirs('public/report', exist_ok=True)

FONT_PATHS = [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJK.ttc',
    '/usr/share/fonts/truetype/noto/NotoSansCJKjp-Regular.otf',
]
FP = next((p for p in FONT_PATHS if os.path.exists(p)), None)

def font(size, bold=False):
    if FP:
        try:
            return ImageFont.truetype(FP, size, index=0)
        except Exception:
            pass
    return ImageFont.load_default()

INK = (30, 32, 38)
GRAY = (120, 124, 132)
LINE = (200, 203, 208)
RED = (196, 60, 48)
BLUE = (36, 84, 160)

def base(title, sub):
    img = Image.new('RGB', (W, H), (250, 250, 248))
    d = ImageDraw.Draw(img)
    d.text((90, 70), '株式会社まつや ｜ 採用戦略レポート〈武器編〉', font=font(28), fill=GRAY)
    d.line([(90, 130), (W - 90, 130)], fill=LINE, width=2)
    d.text((90, 170), title, font=font(44), fill=INK)
    d.text((90, 240), sub, font=font(30), fill=GRAY)
    return img, d

def paragraphs(d, y0, n, x0=90, x1=W - 90):
    y = y0
    for i in range(n):
        w = (x1 - x0) * (0.98 if i % 4 else 0.72)
        d.rectangle([x0, y, x0 + w, y + 16], fill=(212, 214, 218))
        y += 34
        if i % 5 == 4:
            y += 22
    return y

def table(d, y0, rows, cols, verdicts):
    x0, x1 = 90, W - 90
    ch = 84
    cw = (x1 - x0) / cols
    for r in range(rows + 1):
        d.line([(x0, y0 + r * ch), (x1, y0 + r * ch)], fill=LINE, width=2)
    for c in range(cols + 1):
        d.line([(x0 + c * cw, y0), (x0 + c * cw, y0 + rows * ch)], fill=LINE, width=2)
    heads = ['比較軸', '当社', '地域相場・競合', '判定'][:cols]
    for c, h in enumerate(heads):
        d.text((x0 + c * cw + 18, y0 + 24), h, font=font(26), fill=GRAY)
    for r in range(1, rows):
        for c in range(cols - 1):
            d.rectangle([x0 + c * cw + 18, y0 + r * ch + 30, x0 + (c + 1) * cw - 24, y0 + r * ch + 46], fill=(214, 216, 220))
        v = verdicts[(r - 1) % len(verdicts)]
        d.text((x0 + (cols - 1) * cw + 18, y0 + r * ch + 24), v, font=font(26), fill=BLUE if v == '上回る' else RED)
    return y0 + rows * ch

PAGES = [
    ('1.2 給与水準の検証', '「条件で負けている」は誤解である', 'table'),
    ('2.2 求人票の「自己紹介」検証', 'ブランド資産が放棄されている', 'para'),
    ('2.4 価値の翻訳', 'すでにある価値を、求職者に届く言葉へ', 'para'),
    ('3.1 カウンタートーク集', '疑問を打ち消さず、納得で応える', 'para'),
    ('3.3 実行フェーズ表', 'Phase 0-6 ── 現場実装の武器庫', 'table'),
    ('総括 ── エグゼクティブサマリー', 'トップパフォーマーの知性を、組織の武器へ', 'para'),
]

for i, (title, sub, kind) in enumerate(PAGES, 1):
    img, d = base(title, sub)
    if kind == 'table':
        y = table(d, 340, 7, 4, ['上回る', '同等以上', '上回る', '要改善'])
        paragraphs(d, y + 50, 10)
    else:
        y = paragraphs(d, 340, 14)
        d.rectangle([90, y + 20, W - 90, y + 220], outline=LINE, width=2)
        d.text((116, y + 46), '設計意図:', font=font(26), fill=RED)
        paragraphs(d, y + 96, 3, x0=116, x1=W - 116)
        paragraphs(d, y + 300, 8)
    d.text((W - 150, H - 80), f'p.{i + 11}', font=font(26), fill=GRAY)
    img.save(f'public/report/page{i}.png')
print('OK', len(PAGES), 'pages')
