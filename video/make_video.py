# 企画・宣伝協同組合 Grok Bot活用 生成AI研修 紹介動画
# ロゴ配色はPALETTEを差し替えて調整する
import subprocess, os
from PIL import Image, ImageDraw, ImageFont

PALETTE = dict(bg=(18, 32, 64), accent=(230, 72, 40), text=(255, 255, 255), sub=(190, 200, 220), card=(32, 50, 92))
ORG = "企画・宣伝協同組合"
W, H = 1920, 1080
FONT = "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf"
OUT = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(OUT, "logo.png")  # 置けば右上に合成される

def f(s): return ImageFont.truetype(FONT, s)

SCENES = [
    ("cover", "ラジオ営業のための", "Grok Bot活用\n生成AI研修", "複数局合同開催のご案内"),
    ("text", "いま何が変わったか", "Grokが\nXの投稿を拾って答える", "@grok とリプライするだけで、その投稿やスレッドの文脈を読んで回答する。\n検索窓を開かずに、話題の温度を数秒でつかめる。"),
    ("list", "新規営業で使う", "訪問前の5分で仮説を作る", ["見込み先の公式Xと口コミの空気を要約させる", "地域で伸びている話題から番組連動の切り口を出す", "競合のキャンペーン投稿を拾って比較する"]),
    ("list", "既存営業で使う", "提案の鮮度を上げる", ["出稿中クライアントへの反応をリスナー投稿から拾う", "放送後の反響を数字の前に言葉で報告する", "次の季節企画のネタを先回りで持っていく"]),
    ("list", "研修の中身", "半日で手が動くところまで", ["Grok Botの基本操作と、拾える投稿・拾えない投稿", "営業シーン別プロンプトをその場で作る", "誤情報とコンプライアンスの線引き", "局をまたいだグループワークで提案書を1枚作る"]),
    ("text", "合同開催だから", "他局の使い方が\nいちばんの教材になる", "同じ道具でも局ごとに使い方は違う。\nその差を持ち帰れるのが合同研修の強み。"),
    ("cover", "お問い合わせ", ORG, "研修日程・費用はお気軽にご相談ください"),
]

def logo_mark(d, img):
    if os.path.exists(LOGO):
        lg = Image.open(LOGO).convert("RGBA"); lg.thumbnail((360, 110)); img.paste(lg, (W - lg.width - 80, 60), lg)
    else:
        d.rectangle((80, 70, 92, 112), fill=PALETTE["accent"])
        d.text((108, 72), ORG, font=f(34), fill=PALETTE["text"])

def render(i, sc):
    img = Image.new("RGB", (W, H), PALETTE["bg"]); d = ImageDraw.Draw(img)
    d.rectangle((0, H - 14, W, H), fill=PALETTE["accent"])
    kind, kicker, title, body = sc
    if kind == "cover":
        d.text((W // 2, 360), kicker, font=f(48), fill=PALETTE["accent"], anchor="mm")
        d.multiline_text((W // 2, 540), title, font=f(120), fill=PALETTE["text"], anchor="mm", align="center", spacing=24)
        d.text((W // 2, 760), body, font=f(44), fill=PALETTE["sub"], anchor="mm")
        if i == 0: logo_mark(d, img)
    else:
        logo_mark(d, img)
        d.text((160, 220), kicker, font=f(44), fill=PALETTE["accent"])
        d.multiline_text((160, 300), title, font=f(92), fill=PALETTE["text"], spacing=20)
        y = 330 + 120 * (title.count("\n") + 1)
        if kind == "text":
            d.multiline_text((160, y), body, font=f(44), fill=PALETTE["sub"], spacing=22)
        else:
            for n, item in enumerate(body):
                d.rounded_rectangle((160, y, W - 160, y + 110), 18, fill=PALETTE["card"])
                d.text((210, y + 55), f"{n+1:02d}", font=f(48), fill=PALETTE["accent"], anchor="lm")
                d.text((320, y + 55), item, font=f(46), fill=PALETTE["text"], anchor="lm")
                y += 135
    p = os.path.join(OUT, f"scene{i:02d}.png"); img.save(p); return p

paths = [render(i, s) for i, s in enumerate(SCENES)]
DUR, FADE = 5, 0.8
args = ["ffmpeg", "-y"]
for p in paths: args += ["-loop", "1", "-t", str(DUR), "-i", p]
chain, prev, off = [], "0:v", 0
for k in range(1, len(paths)):
    off += DUR - FADE
    chain.append(f"[{prev}][{k}:v]xfade=transition=fade:duration={FADE}:offset={off:.2f}[v{k}]"); prev = f"v{k}"
args += ["-filter_complex", ";".join(chain), "-map", f"[{prev}]", "-pix_fmt", "yuv420p", "-r", "30", os.path.join(OUT, "grok_training_intro.mp4")]
subprocess.run(args, check=True, capture_output=True)
