# 企画書(2026-10-08)準拠 ラジオ局営業向け生成AI研修 紹介動画
# 75秒本編と30秒短縮版を書き出す。配色は組合ロゴ準拠(make_motion.C)
import subprocess, os, math, random, sys, wave
import numpy as np
from PIL import Image, ImageDraw
from make_motion import C, W, H, FPS, OUT, eo, eio, timg, mark, BG, PTS, ORG

INK = (35, 24, 21); GRAY = (120, 120, 116); LINE = (226, 226, 220); WHITE = (255, 255, 255)
BGR = BG.convert("RGB")

# ---------- 描画ヘルパ(フレームはRGB、半透明はRGBAドローで合成) ----------
def put(fr, im, x, y, a=1.0):
    if a <= 0: return
    if a < 1:
        im = im.copy(); im.putalpha(im.getchannel("A").point(lambda v: int(v * a)))
    fr.paste(im, (int(x), int(y)), im)

def mup(fr, im, x, y, p):
    if p <= 0: return
    dy = int((1 - eo(p)) * im.height)
    if dy >= im.height: return
    c = im.crop((0, 0, im.width, im.height - dy)); fr.paste(c, (int(x), int(y + dy)), c)

def fup(fr, im, x, y, p, dist=30):
    put(fr, im, x, y + (1 - eo(p)) * dist, eo(p))

def ctext(fr, s, size, col, cy, p, mode="mask"):
    im = timg(s, size, col)
    (mup if mode == "mask" else fup)(fr, im, W / 2 - im.width / 2, cy, p)

def wrap(s, n): return [s[i:i + n] for i in range(0, len(s), n)]

def D(fr): return ImageDraw.Draw(fr, "RGBA")
def al(col, a): return col + (int(255 * max(0, min(1, a))),)

def bg(T):
    fr = BGR.copy(); d = D(fr)
    for i, r in enumerate((520, 700, 880)):
        cx, cy = W + 120 + 40 * math.sin(T * .3 + i), H // 2 + 30 * math.cos(T * .25 + i)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(232, 238, 226), width=2)
        a = T * .6 * (1 if i % 2 else -1) + i
        d.arc((cx - r, cy - r, cx + r, cy + r), math.degrees(a), math.degrees(a) + 40, fill=C["acc"], width=6)
    for x, y, s, v in PTS:
        yy = (y - T * v * 40) % H
        d.ellipse((x - s / 2, yy - s / 2, x + s / 2, yy + s / 2), fill=al(C["acc"], .8))
    return fr

def logo(fr, a=1.0):
    mark(fr, 80, 50, 70, a); put(fr, timg(ORG, 30, INK), 208, 66, a)

def heading(fr, t, kicker, title, size=64):
    mup(fr, timg(kicker, 42, C["acc2"]), 120, 178, t / .45)
    mup(fr, timg(title, size, INK), 112, 230, (t - .15) / .5)

def note(fr, s, x, y, a=1.0): put(fr, timg(s, 22, GRAY), x, y, a)

def finger(fr, x, y, tap):
    d = D(fr); d.ellipse((x - 30, y - 30, x + 30, y + 30), fill=(35, 24, 21, 80), outline=(255, 255, 255, 230), width=3)
    if 0 < tap < .6:
        r = 30 + tap * 110; d.ellipse((x - r, y - r, x + r, y + r), outline=al(C["acc2"], 1 - tap / .6), width=5)

def phone(fr, x, y, w, h, scr, a=1.0):
    d = D(fr)
    d.rounded_rectangle((x + 8, y + 14, x + w + 8, y + h + 14), 56, fill=(0, 0, 0, int(28 * a)))
    d.rounded_rectangle((x, y, x + w, y + h), 56, fill=al(INK, a))
    m = Image.new("L", scr.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, scr.width - 1, scr.height - 1), 42, fill=int(255 * a))
    fr.paste(scr, (int(x + 16), int(y + 16)), m)
    d.rounded_rectangle((x + w / 2 - 55, y + 28, x + w / 2 + 55, y + 50), 11, fill=al(INK, a))

def window(fr, x, y, w, h, title, a=1.0):
    d = D(fr); bar = (244, 245, 240)
    d.rounded_rectangle((x + 8, y + 12, x + w + 8, y + h + 12), 22, fill=(0, 0, 0, int(22 * a)))
    d.rounded_rectangle((x, y, x + w, y + h), 22, fill=al(WHITE, a), outline=al(LINE, a), width=2)
    d.rounded_rectangle((x, y, x + w, y + 56), 22, fill=al(bar, a)); d.rectangle((x + 1, y + 34, x + w - 1, y + 56), fill=al(bar, a))
    for i, col in enumerate([(230, 140, 120), (230, 200, 120), (150, 190, 130)]):
        d.ellipse((x + 24 + i * 30, y + 20, x + 40 + i * 30, y + 36), fill=al(col, a))
    put(fr, timg(title, 24, GRAY), x + 130, y + 14, a)

def shimmer(fr, x, y, widths, t, gap=60):
    d = D(fr)
    for j, w in enumerate(widths):
        v = int(236 + 10 * math.sin(t * 8 - j))
        d.rounded_rectangle((x, y + j * gap, x + w, y + j * gap + 28), 10, fill=(v, v, v - 4))

def steps_panel(fr, t, steps, y0=420, x1=1120):
    d = D(fr); cur = max([i for i, (st, _) in enumerate(steps) if t >= st] or [-1])
    for i, (st, txt) in enumerate(steps):
        p = eo((t - st) / .5)
        if p <= 0: continue
        y = y0 + i * 120; on = i == cur
        d.rounded_rectangle((120, y, x1, y + 96), 20, fill=al(C["acc"] if on else C["card"], p))
        d.ellipse((144, y + 20, 200, y + 76), fill=al(INK if on else C["acc2"], p))
        put(fr, timg(str(i + 1), 32, WHITE), 162, y + 22, p)
        put(fr, timg(txt, 36, INK), 230 + (1 - p) * 30, y + 24, p)

def arrow(fr, x0, y0, x1, y1, p, col=None, w=6):
    if p <= 0: return
    col = col or C["acc2"]; d = D(fr)
    xe, ye = x0 + (x1 - x0) * p, y0 + (y1 - y0) * p
    d.line((x0, y0, xe, ye), fill=col, width=w)
    if p > .85:
        ang = math.atan2(y1 - y0, x1 - x0); s = 16
        pts = [(xe, ye), (xe - s * math.cos(ang - .5), ye - s * math.sin(ang - .5)), (xe - s * math.cos(ang + .5), ye - s * math.sin(ang + .5))]
        d.polygon(pts, fill=col)

# ---------- S1 ラジオブース、情報に埋もれる ----------
def card_doc(title):
    im = Image.new("RGBA", (330, 210), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((10, 14, 320, 204), 16, fill=(0, 0, 0, 30))
    d.rounded_rectangle((0, 0, 310, 190), 16, fill=WHITE, outline=LINE, width=2)
    d.rectangle((0, 0, 310, 12), fill=C["acc2"])
    im.alpha_composite(timg(title, 26, INK), (22, 30))
    for j, w in enumerate((250, 200, 230)): d.rounded_rectangle((22, 92 + j * 30, 22 + w, 106 + j * 30), 6, fill=(232, 232, 228))
    return im

def card_sns(name, text):
    im = Image.new("RGBA", (400, 160), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((10, 14, 390, 154), 18, fill=(0, 0, 0, 30))
    d.rounded_rectangle((0, 0, 380, 140), 18, fill=WHITE, outline=LINE, width=2)
    d.ellipse((20, 20, 66, 66), fill=C["acc"])
    im.alpha_composite(timg(name, 22, GRAY), (80, 26))
    im.alpha_composite(timg(text, 28, INK), (22, 80))
    return im

random.seed(7)
PILE_SRC = [card_doc("営業資料_最新版.pdf"), card_sns("生活者", "新商品、もう買った？"), card_doc("前年出稿実績.xlsx"),
            card_sns("企業公式", "キャンペーン開始！"), card_doc("競合の動き_メモ"), card_sns("リスナー", "朝の番組で聴いた"),
            card_doc("提案書_下書き(3).pptx"), card_sns("生活者", "#地元グルメ 行列"), card_sns("企業公式", "駅前店オープン")]
PILE = []
for i, im in enumerate(PILE_SRC):
    rot = im.rotate(random.uniform(-9, 9), resample=Image.BICUBIC, expand=True)
    tx, ty = random.uniform(80, W - 480), random.uniform(160, 640)
    ang = random.uniform(0, 2 * math.pi)
    PILE.append((rot, tx, ty, tx + math.cos(ang) * 1400, ty + math.sin(ang) * 900, 1.2 + i * .38))

def s1(fr, t):
    d = D(fr); mx, my = 520, 380
    # マイク
    d.rounded_rectangle((mx - 80, my - 170, mx + 80, my + 150), 80, fill=INK)
    for yy in range(my - 130, my + 10, 22): d.line((mx - 62, yy, mx + 62, yy), fill=(84, 76, 74), width=4)
    d.rectangle((mx - 80, my + 30, mx + 80, my + 56), fill=C["acc2"])
    d.rectangle((mx - 12, my + 150, mx + 12, my + 330), fill=INK)
    d.rounded_rectangle((mx - 130, my + 320, mx + 130, my + 350), 14, fill=INK)
    for k in range(3):
        ph = (t * .7 + k / 3) % 1; r = 120 + ph * 260
        d.arc((mx - r, my - 40 - r, mx + r, my - 40 + r), -40, 40, fill=al(C["acc2"], .8 * (1 - ph)), width=6)
    # ON AIR
    glow = .5 + .5 * math.sin(t * 4)
    d.rounded_rectangle((960 - 14, 190 - 14, 1260 + 14, 280 + 14), 30, fill=al(C["acc"], .5 * glow))
    d.rounded_rectangle((960, 190, 1260, 280), 22, fill=INK)
    put(fr, timg("ON AIR", 52, C["acc"]), 1022, 200)
    # ミキサー
    d.rounded_rectangle((900, 420, 1700, 820), 26, fill=(60, 52, 50))
    for k in range(8):
        x = 970 + k * 92; d.rectangle((x - 4, 470, x + 4, 760), fill=(110, 100, 98))
        v = .5 + .4 * math.sin(t * 1.6 + k * .9)
        y = 760 - v * 290; d.rounded_rectangle((x - 30, y - 18, x + 30, y + 18), 8, fill=C["acc"] if k % 3 else WHITE)
    # 資料と投稿が積み重なる
    for im, tx, ty, sx, sy, st in PILE:
        p = eo((t - st) / .7)
        if p <= 0: continue
        drift = math.sin(t + tx) * 6
        put(fr, im, sx + (tx - sx) * p, sy + (ty - sy) * p + drift)
    v = eo((t - 5.0) / .5)
    if v > 0:
        d.rectangle((0, 0, W, H), fill=(255, 255, 255, int(215 * v)))
        ctext(fr, "情報は、多い。", 110, INK, 330, (t - 5.2) / .5)
        ctext(fr, "時間は、少ない。", 110, C["acc2"], 500, (t - 5.9) / .5)

# ---------- S2 Grok Botで声を整理する(操作画面) ----------
CHIPS = ["まちのパン工房", "朝限定カレーパン", "#朝活", "「7時に完売」", "駅前店オープン", "通勤前に寄った"]
CHIP_POS = [(130, 420), (560, 450), (280, 570), (700, 610), (160, 730), (580, 770)]
_chip = {}
def chip(s):
    if s not in _chip:
        ti = timg(s, 30, INK); w, h = ti.width + 56, 72
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle((0, 0, w - 1, h - 1), 36, fill=WHITE, outline=C["acc2"], width=3)
        im.alpha_composite(ti, (28, 12)); _chip[s] = im
    return _chip[s]

GX, GY, GW, GH = 1270, 150, 460, 810
Q = "@grok まちのパン工房の最近の投稿と、お客さんの声を整理して"
GROUPS = [("企業の発信", ["朝限定の新商品を毎日告知", "駅前店のオープンを予告"]),
          ("生活者の声", ["通勤前に寄ったという投稿", "7時に完売で買えない声も"]),
          ("話題の傾向", ["朝の時間帯の投稿に反応"])]

def s2(fr, t):
    heading(fr, t, "Grok Bot", "企業と生活者の声を、整理する。")
    for i, s in enumerate(CHIPS):
        im = chip(s); x0, y0 = CHIP_POS[i]
        app = eo((t - .3 - i * .12) / .5); fly = eio((t - 2.2 - i * .1) / .7)
        if fly >= 1: continue
        tx, ty = GX + GW / 2 - im.width / 2, GY + 300
        x = x0 + (tx - x0) * fly; y = y0 + math.sin(t * 2 + i) * 8 + (ty - y0) * fly - (1 - app) * 30
        put(fr, im, x, y, app * (1 - fly))
    steps_panel(fr, t, [(3.0, "@grok に整理を頼む"), (5.6, "投稿の傾向がまとまる"), (7.6, "ここから課題仮説をつくる")])
    TYPE, CH = 3.0, .05; TS = TYPE + len(Q) * CH; SEND = TS + .25
    scr = Image.new("RGB", (GW - 32, GH - 32), WHITE); s = D(scr); SW, SH = scr.size
    s.rectangle((0, 0, SW, 100), fill=(248, 248, 245)); s.line((0, 100, SW, 100), fill=LINE, width=2)
    s.ellipse((24, 50, 64, 90), fill=INK); put(scr, timg("G", 24, WHITE), 37, 54); put(scr, timg("Grok", 28, INK), 78, 52)
    y = 120
    if t > SEND:
        a = eo((t - SEND) / .3); ls = wrap(Q, 13); bh = 24 + len(ls) * 34
        s.rounded_rectangle((80, y, SW - 18, y + bh), 20, fill=al(C["acc"], a))
        for k, ln in enumerate(ls): put(scr, timg(ln, 24, INK), 98, y + 10 + k * 34, a)
        y += bh + 22
        if t > SEND + .3:
            s.ellipse((18, y, 54, y + 36), fill=INK); put(scr, timg("Grok", 22, GRAY), 64, y + 4); y += 50
            if t < SEND + 1.1:
                for k in range(3):
                    r = 7 + 4 * abs(((t * 3 + k * .33) % 1) - .5); cx = 40 + k * 30
                    s.ellipse((cx - r, y + 16 - r, cx + r, y + 16 + r), fill=GRAY)
            else:
                for k, (lab, lines) in enumerate(GROUPS):
                    p = eo((t - SEND - 1.1 - k * .6) / .4)
                    if p > 0:
                        lab_im = timg(lab, 22, WHITE)
                        s.rounded_rectangle((18, y, 18 + lab_im.width + 28, y + 36), 18, fill=al(C["acc2"], p))
                        put(scr, lab_im, 32, y + 3, p)
                        for j, ln in enumerate(lines): fup(scr, timg(ln, 24, INK), 24, y + 46 + j * 36, p, 10)
                    y += 46 + len(lines) * 36 + 16
    cy = SH - 100
    s.line((0, cy, SW, cy), fill=LINE, width=2)
    s.rounded_rectangle((16, cy + 20, SW - 96, cy + 80), 30, fill=(244, 244, 240))
    if TYPE <= t < SEND:
        n = min(len(Q), int((t - TYPE) / CH)); vis = Q[:n][-12:] + ("|" if int(t * 3) % 2 else "")
        put(scr, timg(vis, 24, INK), 34, cy + 34)
    else:
        put(scr, timg("Grokに質問する", 24, (170, 170, 166)), 34, cy + 34)
    s.ellipse((SW - 80, cy + 20, SW - 20, cy + 80), fill=C["acc2"]); put(scr, timg("送信", 20, WHITE), SW - 70, cy + 36)
    ox = (1 - eo(t / .7)) * 600
    phone(fr, GX + ox, GY, GW, GH, scr)
    note(fr, "※画面はイメージです", GX + 120, GY - 40, eo(t / .7))
    bx, by = GX + 16 + SW - 50, GY + 16 + cy + 50
    if TS - .7 < t < SEND + .8:
        p = eio((t - TS + .7) / .6); finger(fr, bx + (1 - p) * 120, by + (1 - p) * 200, t - SEND)

# ---------- S3 課題仮説→ラジオ企画→提案骨子 ----------
CARDS = [("課題仮説", ["・朝の来店は好調", "・新商品の認知は", "　常連客どまり", "・通勤層との接点が", "　まだ弱い"]),
         ("ラジオ企画", ["朝7時台ミニコーナー", "『今朝の焼きたて』", "・毎週の新作を紹介", "・リスナー投稿で", "　食べた感想を募集"]),
         ("提案骨子", ["目的　朝の新規来店", "枠　　平日朝帯×4週", "連動　X投稿で参加", "測定　店頭の合言葉"])]
CXS = [120, 710, 1300]; CW = 500

def s3(fr, t):
    heading(fr, t, "Grok Botの整理から", "課題仮説 → ラジオ企画 → 提案骨子", 58)
    note(fr, "例：地元ベーカリーへの提案　※AIの出力は下書き。事実確認と最終判断は営業担当が行います", 120, 320, eo((t - .5) / .5))
    for k, (lab, lines) in enumerate(CARDS):
        st = .6 + k * 3.6; p = eo((t - st) / .6)
        if p <= 0: continue
        x = CXS[k]; y = 370 + (1 - p) * 40; d = D(fr)
        d.rounded_rectangle((x + 6, y + 10, x + CW + 6, y + 490 + 10), 24, fill=(0, 0, 0, int(20 * p)))
        d.rounded_rectangle((x, y, x + CW, y + 490), 24, fill=al(WHITE, p), outline=al(LINE, p), width=3)
        d.rounded_rectangle((x, y, x + CW, y + 86), 24, fill=al(C["acc"], p)); d.rectangle((x + 2, y + 60, x + CW - 2, y + 86), fill=al(C["acc"], p))
        d.ellipse((x + 24, y + 18, x + 74, y + 68), fill=al(INK, p)); put(fr, timg(str(k + 1), 30, WHITE), x + 40, y + 20, p)
        put(fr, timg(lab, 36, INK), x + 92, y + 20, p)
        if st + .6 < t < st + 1.5:
            shimmer(fr, x + 36, y + 128, [380, 420, 300, 360], t, 66); note(fr, "生成中…", x + CW - 120, y + 98)
        elif t >= st + 1.5:
            for j, ln in enumerate(lines): fup(fr, timg(ln, 30, INK), x + 36, y + 118 + j * 66, (t - st - 1.5 - j * .3) / .4, 12)
        if k < 2: arrow(fr, x + CW + 14, 615, CXS[k + 1] - 14, 615, eo((t - st - 2.8) / .5))
    p = eo((t - 11.6) / .5)
    if p > 0:
        im = timg("→ そのまま提案書の下書きへ", 34, WHITE); w = im.width + 80; x = W / 2 - w / 2; y = 884 + (1 - p) * 20
        D(fr).rounded_rectangle((x, y, x + w, y + 64), 32, fill=al(C["acc2"], p)); put(fr, im, x + 40, y + 10, p)

# ---------- S4 Pody 音声→記事→SNS ----------
PXS = [130, 560, 990, 1420]; PY0 = 440; PWD = 380; PHT = 450

def panel(fr, k, lab, p):
    x = PXS[k]; y = PY0 + (1 - p) * 30; d = D(fr)
    d.rounded_rectangle((x, y, x + PWD, y + PHT), 18, fill=al(C["card"], p))
    put(fr, timg(lab, 26, INK), x + 20, y + 16, p)
    return x, y

def s4(fr, t):
    heading(fr, t, "関連事例　Pody", "話した言葉を、記事とSNSへ。")
    note(fr, "※Podyは独立した外部サービス（現在招待制）。素材の利用範囲は案件ごとに確認が必要です", 120, 320, eo((t - .5) / .5))
    window(fr, 100, 370, 1720, 560, "Podcast → 記事・SNS（画面はイメージ）", eo(t / .5))
    d = D(fr)
    p = eo((t - .6) / .5)
    if p > 0:
        x, y = panel(fr, 0, "① 番組音声（RSS）", p)
        put(fr, timg("朝のパン特集 #12", 24, GRAY), x + 20, y + 70, p)
        head = ((t - .6) * .12) % 1
        for i in range(30):
            bx = x + 24 + i * 11; hh = 16 + 90 * abs(math.sin(i * .7 + t * 3)) * (.4 + .6 * abs(math.sin(i * .31)))
            d.rectangle((bx, y + 240 - hh / 2, bx + 6, y + 240 + hh / 2), fill=al(C["acc2"] if i / 30 < head else (200, 205, 195), p))
        d.line((x + 24 + head * 330, y + 170, x + 24 + head * 330, y + 310), fill=al(INK, p), width=3)
        put(fr, timg("RSSを登録するだけ", 24, INK), x + 20, y + 380, p)
    TR = [("00:12", "今朝はパン工房の"), ("", "店主さんをお迎えして"), ("00:31", "朝7時に焼き上がる"), ("", "新作の話を伺いました"), ("00:58", "リスナーの感想も")]
    st = 2.4; p = eo((t - st) / .5)
    if p > 0:
        x, y = panel(fr, 1, "② 文字起こし", p)
        if t < st + 1.0: shimmer(fr, x + 20, y + 80, [300, 260, 320, 280], t)
        else:
            for j, (ts, ln) in enumerate(TR):
                q = (t - st - 1.0 - j * .3) / .4
                if ts: fup(fr, timg(ts, 20, GRAY), x + 20, y + 84 + j * 60, q, 10)
                fup(fr, timg(ln, 24, INK), x + 96, y + 80 + j * 60, q, 10)
    st = 5.0; p = eo((t - st) / .5)
    if p > 0:
        x, y = panel(fr, 2, "③ 記事の下書き", p)
        if t < st + 1.0: shimmer(fr, x + 20, y + 80, [340, 280, 320, 260, 300], t)
        else:
            q = eo((t - st - 1.0) / .5)
            d.rounded_rectangle((x + 20, y + 70, x + 360, y + 190), 12, fill=al(C["acc"], q))
            mark(fr, x + 130, y + 90, 76, q)
            fup(fr, timg("朝7時の焼きたてを", 28, INK), x + 20, y + 206, (t - st - 1.3) / .4, 10)
            fup(fr, timg("届けるパン工房", 28, INK), x + 20, y + 246, (t - st - 1.5) / .4, 10)
            for j, w in enumerate((330, 300, 320, 220)):
                r = eo((t - st - 1.8 - j * .2) / .5)
                if r > 0: d.rounded_rectangle((x + 20, y + 306 + j * 32, x + 20 + w * r, y + 320 + j * 32), 6, fill=(205, 210, 200))
    st = 7.6; p = eo((t - st) / .5)
    if p > 0:
        x, y = panel(fr, 3, "④ SNS投稿文", p)
        if t < st + 1.0: shimmer(fr, x + 20, y + 80, [320, 280, 300, 240], t)
        else:
            q = eo((t - st - 1.0) / .4)
            d.rounded_rectangle((x + 20, y + 70, x + 360, y + 420), 16, fill=al(WHITE, q), outline=al(LINE, q), width=2)
            d.ellipse((x + 38, y + 88, x + 78, y + 128), fill=al(C["acc"], q)); put(fr, timg("番組公式", 22, GRAY), x + 90, y + 96, q)
            for j, ln in enumerate(["今朝の放送で紹介した", "朝限定カレーパン。", "店主のこだわりを", "記事にまとめました"]):
                fup(fr, timg(ln, 24, INK), x + 40, y + 148 + j * 44, (t - st - 1.2 - j * .25) / .4, 10)
            fup(fr, timg("#朝ラジオ #焼きたて", 24, C["acc2"]), x + 40, y + 330, (t - st - 2.3) / .4, 10)
    for k in range(3):
        ap = eo((t - [2.0, 4.6, 7.2][k]) / .4)
        if ap > 0:
            gx = PXS[k] + PWD + 25; gy = PY0 + PHT / 2
            d.polygon([(gx - 12, gy - 22), (gx + 14, gy), (gx - 12, gy + 22)], fill=al(C["acc2"], ap))

# ---------- S5 2画面から業務フローへ ----------
def thumb_phone(fr, cx, cy, s, a=1.0):
    d = D(fr); w, h = 120 * s, 220 * s
    d.rounded_rectangle((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), 18 * s, fill=al(INK, a))
    d.rounded_rectangle((cx - w / 2 + 7 * s, cy - h / 2 + 7 * s, cx + w / 2 - 7 * s, cy + h / 2 - 7 * s), 13 * s, fill=al(WHITE, a))
    d.rounded_rectangle((cx - 10 * s, cy - h / 2 + 30 * s, cx + w / 2 - 14 * s, cy - h / 2 + 62 * s), 8 * s, fill=al(C["acc"], a))
    for j in range(4):
        d.rounded_rectangle((cx - w / 2 + 16 * s, cy - h / 2 + (80 + j * 24) * s, cx + (20 - j * 8) * s, cy - h / 2 + (92 + j * 24) * s), 4 * s, fill=al((215, 215, 210), a))

def thumb_win(fr, cx, cy, s, a=1.0):
    d = D(fr); w, h = 260 * s, 170 * s; x, y = cx - w / 2, cy - h / 2
    d.rounded_rectangle((x, y, x + w, y + h), 12 * s, fill=al(WHITE, a), outline=al(INK, a), width=max(2, int(3 * s)))
    d.rectangle((x + 2, y + 2, x + w - 2, y + 24 * s), fill=al((244, 245, 240), a))
    for k in range(4):
        px = x + (12 + k * 61) * s; d.rounded_rectangle((px, y + 40 * s, px + 52 * s, y + h - 14 * s), 6 * s, fill=al(C["acc"] if k % 2 == 0 else C["card"], a))

NODES = ["調べる", "声を拾う", "企画にする", "提案する", "放送する", "広げる"]
NX = [200 + i * 304 for i in range(6)]

def s5(fr, t):
    heading(fr, t, "ラジオ営業の流れで使う", "調べる。企画する。放送の外へ広げる。")
    m = eio((t - 2.4) / 1.4)
    gx, gy, gs = 760 + ((NX[0] + NX[2]) / 2 - 760) * m, 590 + (405 - 590) * m, 1.5 + (.55 - 1.5) * m
    px, py, ps = 1160 + (NX[5] - 1160) * m, 590 + (410 - 590) * m, 1.4 + (.6 - 1.4) * m
    a0 = eo((t - .2) / .5)
    thumb_phone(fr, gx, gy, gs, a0); thumb_win(fr, px, py, ps, a0)
    lab_g, lab_p = timg("Grok Bot", int(34 - 8 * m), INK), timg("Pody", int(34 - 8 * m), INK)
    put(fr, lab_g, gx + 70 * gs, gy - 20, a0); put(fr, lab_p, px + 140 * ps, py - 20, a0)
    d = D(fr)
    for i, n in enumerate(NODES):
        p = eo((t - 3.2 - i * .28) / .45)
        if p <= 0: continue
        x = NX[i]; y = 520 + (1 - p) * 20; hot = i < 3 or i == 5
        d.rounded_rectangle((x - 110, y, x + 110, y + 84), 42, fill=al(C["acc"] if hot else C["card"], p), outline=al(C["acc2"] if hot else LINE, p), width=3)
        im = timg(n, 32, INK); put(fr, im, x - im.width / 2, y + 18, p)
        if i < 5: arrow(fr, x + 116, 562, NX[i + 1] - 116, 562, eo((t - 3.4 - i * .28) / .4), w=4)
    if t > 4.8:
        a = eo((t - 4.8) / .5)
        d.line((NX[0] - 110, 498, NX[2] + 110, 498), fill=al(C["acc2"], a), width=4)
        d.line((NX[5] - 110, 498, NX[5] + 110, 498), fill=al(C["acc2"], a), width=4)
    SEG = [("導入", 10), ("Grok Bot実演", 15), ("企画化デモ", 10), ("参加型ワーク", 20), ("まとめ", 5)]
    fup(fr, timg("研修は60分", 34, INK), 120, 650, (t - 6.8) / .5)
    x = 120
    for k, (lab, mnt) in enumerate(SEG):
        w = 1680 * mnt / 60; p = eo((t - 7.2 - k * .45) / .5)
        if p > 0:
            col = C["acc2"] if k in (1, 3) else C["acc"]
            d.rectangle((x + 2, 710, x + 2 + (w - 4) * p, 780), fill=col)
            im = timg(f"{lab} {mnt}分", 26, INK); put(fr, im, x + w / 2 - im.width / 2, 796, p)
        x += w

# ---------- S6 ワークショップ ----------
LXS = [330, 770, 1210, 1650]

def s6(fr, t):
    heading(fr, t, "参加型ワーク 20分", "営業先を題材に、その場で企画骨子をつくる。", 56)
    d = D(fr)
    for i, cx in enumerate(LXS):
        p = eo((t - .4 - i * .15) / .5)
        if p <= 0: continue
        y0 = 400 + (1 - p) * 30
        d.rounded_rectangle((cx - 180, y0, cx + 180, y0 + 240), 14, fill=al(INK, p))
        d.rectangle((cx - 166, y0 + 14, cx + 166, y0 + 226), fill=al(WHITE, p))
        d.rounded_rectangle((cx - 210, y0 + 240, cx + 210, y0 + 266), 10, fill=al((90, 82, 80), p))
        im = timg(f"{'ABCD'[i]}局", 32, INK); put(fr, im, cx - im.width / 2, y0 + 284, p)
        for k in range(3):
            q = eo((t - 1.2 - i * .35 - k * 1.1) / .5)
            if q <= 0: continue
            x = cx - 160 + k * 108
            d.rounded_rectangle((x, y0 + 40, x + 96, y0 + 200), 8, fill=al(C["card"], q))
            d.rectangle((x, y0 + 40, x + 96, y0 + 56), fill=al(C["acc2"], q))
            for j in range(4):
                r = eo((t - 1.5 - i * .35 - k * 1.1 - j * .15) / .3)
                if r > 0: d.rounded_rectangle((x + 10, y0 + 72 + j * 30, x + 10 + (70 - j * 9) * r, y0 + 84 + j * 30), 4, fill=(190, 196, 184))
        if int(t * 3) % 2 and t < 5.5: d.rectangle((cx + 150, y0 + 190, cx + 154, y0 + 214), fill=INK)
        ap = eo((t - 5.6 - i * .15) / .5)
        if ap > 0:
            arrow(fr, cx, 730, cx, 800, ap, w=5)
            tag = timg("自局の提案へ", 28, WHITE); w = tag.width + 48
            d.rounded_rectangle((cx - w / 2, 812, cx + w / 2, 870), 29, fill=al(C["acc2"], ap)); put(fr, tag, cx - tag.width / 2, 822, ap)

# ---------- S7 タイトルカードとCTA ----------
def make_end(title, size, presents=True):
    def f(fr, t):
        ctext(fr, "AIで、ラジオの可能性を広げる。", 50, C["acc2"], 150, t / .5)
        if presents: ctext(fr, ORG + " presents", 32, GRAY, 232, (t - .2) / .5, "fade")
        ctext(fr, title, size, INK, 290, (t - .3) / .6)
        ctext(fr, "60分で、営業に持ち帰れるAI活用を体験。", 46, INK, 300 + size * 1.4, (t - .7) / .6)
        d = D(fr); p = eo((t - 1.0) / .6); uy = 300 + size * 1.4 + 72
        d.rectangle((W / 2 - 440 * p, uy, W / 2 + 440 * p, uy + 8), fill=C["acc"])
        for k, (lab, val) in enumerate([("開催日時", "○月○日（○）○○:○○〜"), ("申込方法", "○○○○○○"), ("お問い合わせ", "○○○○○○")]):
            q = eo((t - 1.3 - k * .2) / .5)
            if q <= 0: continue
            x = 120 + k * 580; y = 610 + (1 - q) * 20
            d.rounded_rectangle((x, y, x + 520, y + 140), 20, fill=al(C["card"], q))
            put(fr, timg(lab, 26, C["acc2"]), x + 28, y + 18, q); put(fr, timg(val, 36, INK), x + 28, y + 64, q)
        q = eo((t - 2.0) / .6)
        if q > 0:
            org = timg(ORG, 40, INK); tw = 112 + 20 + org.width; x0 = W / 2 - tw / 2
            mark(fr, x0, 800, 70, q, t); put(fr, org, x0 + 132, 806, q)
    return f

s7 = make_end("ラジオ局営業向け 生成AI研修", 96)
s7s = make_end("ラジオ局営業のための生成AI研修", 84, presents=False)

# ---------- 構成 ----------
MAIN = [(s1, 8, "スポンサーへの次の提案、何から考えていますか？", 1),
        (s2, 10, "AIが、企業と生活者の声から、営業のヒントを探す。", 1),
        (s3, 14, "調査から企画づくりまで。提案の初動を、もっと速く。", 1),
        (s4, 13, "さらに、話した言葉を記事に。音声の価値を、放送・配信の外へ。", 1),
        (s5, 13, "最新ツールを、ラジオ局の営業目線で学ぶ60分。", 1),
        (s6, 10, "その場で試す。自局の営業に持ち帰る。", 1),
        (s7, 7, "企画・宣伝協同組合 presents｜ラジオ局営業向け生成AI研修", 1)]
SHORT = [(s1, 6, "スポンサー提案、もっと速く・深く。", 8 / 6),
         (s2, 4.5, "投稿を調べ、課題仮説からラジオ企画へ。", 2.0),
         (s3, 4.5, "投稿を調べ、課題仮説からラジオ企画へ。", 2.6),
         (s4, 8, "音声を記事・SNSへ再活用する可能性も。", 1.6),
         (s7s, 7, "ラジオ局営業のための生成AI研修｜60分", 1)]
WIPE = .45

def subtitle(fr, text, a):
    im = timg(text, 40, INK); w = im.width + 80; x = W / 2 - w / 2; y = 976
    D(fr).rounded_rectangle((x, y, x + w, y + 70), 35, fill=(255, 255, 255, int(235 * a)), outline=al(C["acc2"], a), width=2)
    put(fr, im, x + 40, y + 9, a)

def frame(T, SC):
    acc = 0
    for i, (fn, dur, sub, sp) in enumerate(SC):
        if T < acc + dur or i == len(SC) - 1:
            t = T - acc; fr = bg(T)
            if fn not in (s7, s7s): logo(fr)
            fn(fr, t * sp)
            subtitle(fr, sub, eo(t / .3))
            d = ImageDraw.Draw(fr)
            if i < len(SC) - 1 and t > dur - WIPE:
                p = eio((t - (dur - WIPE)) / WIPE); d.polygon([(0, 0), (W * 1.2 * p, 0), (W * 1.2 * p - 300, H), (0, H)], fill=C["acc"])
            if i > 0 and t < WIPE:
                p = eio(t / WIPE); x0 = W * 1.2 * p; d.polygon([(x0, 0), (W + 400, 0), (W + 400, H), (x0 - 300, H)], fill=C["acc"])
            if i == len(SC) - 1 and t > dur - .6:
                fr = Image.blend(fr, Image.new("RGB", (W, H), WHITE), eo((t - (dur - .6)) / .6))
            return fr
        acc += dur

# ---------- 音(チューニングSE→ビート、場面転換にウーシュ) ----------
def audio(SC, path):
    sr = 44100; total = sum(s[1] for s in SC); n = int(total * sr); out = np.zeros(n)
    rng = np.random.default_rng(1)
    def add(sig, at):
        i = int(at * sr); j = min(n, i + len(sig)); out[i:j] += sig[:j - i]
    tt = np.arange(int(1.4 * sr)) / sr
    env = np.clip(tt / .1, 0, 1) * np.clip((1.4 - tt) / .4, 0, 1)
    sweep = np.sin(2 * np.pi * np.cumsum(900 + 700 * np.sin(tt * 9)) / sr)
    noise = np.convolve(rng.standard_normal(len(tt)), np.ones(6) / 6, "same")
    add(env * (.10 * noise + .05 * sweep), 0)
    bpm = 100; b = 60 / bpm; start = 1.2
    chords = [[130.81, 164.81, 196.0, 246.94], [110.0, 130.81, 164.81, 196.0], [87.31, 110.0, 130.81, 164.81], [98.0, 123.47, 146.83, 196.0]]
    k_t = np.arange(int(.35 * sr)) / sr
    kick = np.sin(2 * np.pi * np.cumsum(45 + 75 * np.exp(-k_t * 30)) / sr) * np.exp(-k_t * 14) * .45
    h_t = np.arange(int(.08 * sr)) / sr
    hat = np.diff(rng.standard_normal(len(h_t) + 1)) * np.exp(-h_t * 70) * .05
    beat = 0
    while start + beat * b < total - 1.0:
        at = start + beat * b; ch = chords[(beat // 8) % 4]
        add(kick, at); add(hat, at + b / 2)
        if beat % 8 == 0:
            L = 8 * b; pt = np.arange(int(L * sr)) / sr
            penv = np.clip(pt / .5, 0, 1) * np.clip((L - pt) / .5, 0, 1)
            add(sum(np.sin(2 * np.pi * f * pt) + .3 * np.sin(4 * np.pi * f * pt) for f in ch) * penv * .03, at)
        if beat % 2 == 0:
            bt = np.arange(int(.6 * sr)) / sr; add(np.sin(2 * np.pi * ch[0] / 2 * bt) * np.exp(-bt * 5) * .16, at)
        for h in range(2):
            f = ch[(beat * 2 + h) % 4] * 2; pt = np.arange(int(.3 * sr)) / sr
            add(np.sin(2 * np.pi * f * pt) * np.exp(-pt * 12) * .045, at + h * b / 2)
        beat += 1
    acc = 0
    for _, dur, _, _ in SC[:-1]:
        acc += dur; wt = np.arange(int(.6 * sr)) / sr
        wn = np.convolve(rng.standard_normal(len(wt)), np.ones(30) / 30, "same")
        add(wn * np.sin(np.pi * wt / .6) ** 2 * .35, acc - .45)
    fade = np.clip((total - np.arange(n) / sr) / 2.0, 0, 1)
    out = np.tanh(out * fade * 1.4) / 1.4; out /= max(1e-9, np.abs(out).max()) / .8
    with wave.open(path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((out * 32767).astype(np.int16).tobytes())

def render(SC, name):
    total = sum(s[1] for s in SC); wav = os.path.join(OUT, name + ".wav"); audio(SC, wav)
    out = os.path.join(OUT, name + ".mp4")
    pr = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
                           "-c:a", "aac", "-b:a", "192k", "-shortest", out], stdin=subprocess.PIPE)
    for k in range(int(total * FPS)): pr.stdin.write(frame(k / FPS, SC).tobytes())
    pr.stdin.close(); pr.wait(); os.remove(wav)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "pv":
        for s in map(float, sys.argv[2:]): frame(s, MAIN).save(os.path.join(OUT, f"pv_{s:05.1f}.png"))
    else:
        render(MAIN, "grok_pody_training_75s"); render(SHORT, "grok_pody_training_30s")
        frame(70.5, MAIN).save(os.path.join(OUT, "thumbnail.png"))
