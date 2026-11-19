"""crack リール動画ジェネレーター

誰も喜ばない常識あるあるを、ブロック風のドット絵で動かす縦型リール（1080x1920）。
python3 reels/crack/make_reels.py            3本ぶんの動画とサムネイルを書き出す
python3 reels/crack/make_reels.py --preview  確認用の静止画だけを書き出す
"""
import math
import os
import random
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
LOGO = os.path.join(HERE, "assets", "crack_logo.png")
UNI = "/usr/share/fonts/opentype/unifont/unifont_jp.otf"

W, H, S, FPS = 360, 640, 3, 30
FW, FH = W * S, H * S
F16 = ImageFont.truetype(UNI, 16)
F32 = ImageFont.truetype(UNI, 32)
F48 = ImageFont.truetype(UNI, 48)
F64 = ImageFont.truetype(UNI, 64)
F128 = ImageFont.truetype(UNI, 128)
FLOOR = 470
WHITE, BLACK, DARK = (255, 255, 255), (0, 0, 0), (40, 30, 30)
RAINBOW = [(236, 120, 200), (160, 130, 235), (70, 150, 240), (60, 200, 220), (130, 225, 170), (250, 235, 140)]
NO_BUBBLES = False

# 時間割（秒）
T_HOOK, T_PROB, T_BUT, T_CRACK, T_SOL, T_END = 2.5, 6.5, 2.0, 2.0, 5.5, 3.5
G_PROB = T_HOOK
G_BUT = G_PROB + T_PROB
G_CRACK = G_BUT + T_BUT
G_SOL = G_CRACK + T_CRACK
G_END = G_SOL + T_SOL
TOTAL = G_END + T_END
STORY_END = G_BUT


# ---------------------------------------------------------------- 基本道具
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def seg(t, a, b):
    return clamp((t - a) / (b - a))


def ease(p):
    return 1 - (1 - p) ** 3


def back(p):
    c = 1.9
    return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2


def shade(col, k):
    return tuple(int(clamp(v * k, 0, 255)) for v in col)


def D(img):
    d = ImageDraw.Draw(img)
    d.fontmode = "1"
    return d


def R(d, x0, y0, x1, y1, fill):
    if x1 > x0 and y1 > y0:
        d.rectangle([int(x0), int(y0), int(x1) - 1, int(y1) - 1], fill=fill)


def text(d, xy, s, f, fill=WHITE, ol=BLACK, ow=1, anchor="mm"):
    x, y = xy
    if ol:
        for dx in range(-ow, ow + 1):
            for dy in range(-ow, ow + 1):
                if dx or dy:
                    d.text((x + dx, y + dy), s, font=f, fill=ol, anchor=anchor)
    d.text((x, y), s, font=f, fill=fill, anchor=anchor)


def type_line(d, cx, y, s, f, n, **kw):
    """全体の幅で中央寄せしたまま、先頭 n 文字だけ書く（タイプライター）。"""
    if n <= 0:
        return
    x0 = cx - f.getlength(s) / 2
    text(d, (x0, y), s[:n], f, anchor="lm", **kw)


# ---------------------------------------------------------------- 背景
_wall_cache = {}


def wall_tex():
    if "w" not in _wall_cache:
        img = Image.new("RGB", (W, H))
        d = D(img)
        rnd = random.Random(7)
        for by in range(0, FLOOR, 20):
            for bx in range(0, W, 20):
                j = rnd.randint(-10, 10)
                R(d, bx, by, bx + 20, by + 20, (205 + j, 186 + j, 150 + j))
                R(d, bx, by + 19, bx + 20, by + 20, (178, 160, 128))
                R(d, bx + 19, by, bx + 20, by + 20, (178, 160, 128))
        for y in range(FLOOR, H, 10):
            off = (y // 10) % 2 * 30
            for x in range(-60, W, 60):
                j = rnd.randint(-12, 12)
                R(d, x + off, y, x + off + 60, y + 10, (146 + j, 98 + j, 58 + j))
                R(d, x + off, y + 9, x + off + 60, y + 10, (100, 66, 40))
                R(d, x + off + 59, y, x + off + 60, y + 10, (100, 66, 40))
        R(d, 0, FLOOR, W, FLOOR + 3, (90, 60, 36))
        _wall_cache["w"] = img
    return _wall_cache["w"]


def sky(h):
    if h < 17:
        return (130, 200, 250)
    if h < 18.5:
        return (250, 170, 110)
    if h < 19.5:
        return (130, 90, 160)
    return (25, 25, 60)


def office(c, hour=9.0, clock="9:00", webs=0.0, ff=False, t=0.0):
    c.paste(wall_tex())
    d = D(c)
    # 窓
    R(d, 18, 196, 114, 284, (240, 240, 240))
    R(d, 22, 200, 110, 280, sky(hour))
    if hour >= 19.5:
        for sx, sy in [(34, 212), (70, 226), (92, 208), (52, 250), (98, 262)]:
            R(d, sx, sy, sx + 2, sy + 2, (255, 250, 200))
    R(d, 64, 200, 68, 280, (240, 240, 240))
    R(d, 22, 238, 110, 242, (240, 240, 240))
    # 時計
    if clock:
        R(d, 238, 188, 334, 228, (60, 60, 70))
        R(d, 242, 192, 330, 224, (10, 20, 10))
    if clock:
        text(d, (286, 208), clock, F16, fill=(90, 255, 120), ol=None)
    if ff and int(t * 6) % 2 == 0:
        text(d, (286, 240), "早送り >>", F16, fill=(255, 240, 120))
    # クモの巣
    if webs > 0:
        col = (235, 235, 235)
        for (ox, oy, sx) in [(0, 0, 1), (W - 1, 0, -1)]:
            L = int(70 * webs)
            for k in range(4):
                a = math.radians(10 + k * 25)
                d.line([(ox, oy), (ox + sx * L * math.cos(a), oy + L * math.sin(a))], fill=col, width=1)
            for r in range(14, L, 14):
                pts = [(ox + sx * r * math.cos(math.radians(10 + k * 25)), oy + r * math.sin(math.radians(10 + k * 25))) for k in range(4)]
                d.line(pts, fill=col, width=1)


def desk(c, x, w=84, screen=(90, 190, 255)):
    d = D(c)
    top = FLOOR - 30
    R(d, x + w / 2 - 32, top - 24, x + w / 2 - 2, top - 2, (80, 80, 90))
    R(d, x + w / 2 - 29, top - 21, x + w / 2 - 5, top - 6, screen)
    R(d, x + w / 2 - 16, top - 2, x + w / 2 - 10, top, (80, 80, 90))
    R(d, x - w / 2, top, x + w / 2, top + 8, (170, 115, 65))
    R(d, x - w / 2, top + 8, x + w / 2, FLOOR, (128, 84, 48))
    R(d, x - w / 2 + 4, top + 12, x + w / 2 - 4, FLOOR - 4, (116, 76, 44))


# ---------------------------------------------------------------- キャラクター
TSUMIKI = dict(name="ツミキ", skin=(242, 202, 162), hair=(96, 62, 30), shirt=(64, 112, 204), pants=(44, 44, 84))
MIDORI = dict(name="ミドリ", skin=(250, 212, 178), hair=(36, 30, 30), shirt=(72, 172, 92), pants=(52, 52, 64), long=True)
BUCHO = dict(name="ガンコ部長", skin=(232, 190, 150), hair=(150, 150, 156), shirt=(236, 236, 236), pants=(62, 62, 70), tie=(206, 44, 44), glasses=True)
SHACHO = dict(name="社長", skin=(236, 196, 156), hair=(236, 236, 236), shirt=(46, 46, 60), pants=(36, 36, 46), tie=(240, 196, 40))


def char(c, x, yf=FLOOR, sp=TSUMIKI, expr="n", walk=None, arm=0, bob=0, look=0, sweat=False, hold=None):
    d = D(c)
    x, yf = int(x), int(yf + bob)
    lt, bt = yf - 22, yf - 52
    ht = bt - 28
    hw = 15
    if sp.get("long"):
        R(d, x - hw - 2, ht + 6, x + hw + 2, bt + 16, sp["hair"])
    la = lb = 0
    if walk is not None:
        la = max(0, int(4 * math.sin(walk)))
        lb = max(0, int(-4 * math.sin(walk)))
    for (x0, lift) in [(x - 12, la), (x + 1, lb)]:
        R(d, x0, lt, x0 + 11, yf - lift, sp["pants"])
        R(d, x0, yf - lift - 4, x0 + 11, yf - lift, (50, 40, 36))
    shirt = sp["shirt"]
    R(d, x - 14, bt, x + 14, lt, shirt)
    R(d, x + 10, bt, x + 14, lt, shade(shirt, 0.82))
    if sp.get("tie"):
        R(d, x - 2, bt + 2, x + 2, bt + 20, sp["tie"])
        R(d, x - 3, bt, x + 3, bt + 4, sp["tie"])
    arm_c = shade(shirt, 0.9)
    left_up = arm == 2
    right_up = arm in (1, 2)
    if left_up:
        R(d, x - 21, bt - 24, x - 14, bt + 2, arm_c)
        R(d, x - 21, bt - 29, x - 14, bt - 24, sp["skin"])
    else:
        R(d, x - 21, bt, x - 14, bt + 24, arm_c)
        R(d, x - 21, bt + 24, x - 14, bt + 29, sp["skin"])
    if right_up:
        R(d, x + 14, bt - 24, x + 21, bt + 2, arm_c)
        R(d, x + 14, bt - 29, x + 21, bt - 24, sp["skin"])
    elif arm == 3:
        R(d, x + 14, bt + 2, x + 34, bt + 9, arm_c)
        R(d, x + 34, bt + 2, x + 39, bt + 9, sp["skin"])
    else:
        R(d, x + 14, bt, x + 21, bt + 24, arm_c)
        R(d, x + 14, bt + 24, x + 21, bt + 29, sp["skin"])
    if hold == "box":
        R(d, x - 18, bt + 4, x + 18, bt + 28, (236, 120, 160))
        R(d, x - 2, bt + 4, x + 2, bt + 28, (250, 230, 120))
        R(d, x - 18, bt + 14, x + 18, bt + 18, (250, 230, 120))
    elif hold == "stamp":
        hx = x + 17
        R(d, hx - 4, bt - 40, hx + 4, bt - 28, (170, 120, 70))
        R(d, hx - 6, bt - 30, hx + 6, bt - 24, (210, 40, 40))
    # 頭
    skin = sp["skin"]
    R(d, x - hw, ht, x + hw, bt, skin)
    R(d, x + hw - 4, ht, x + hw, bt, shade(skin, 0.88))
    R(d, x - hw, ht, x + hw, ht + 8, sp["hair"])
    R(d, x - hw, ht + 8, x - hw + 4, ht + 16, sp["hair"])
    R(d, x + hw - 4, ht + 8, x + hw, ht + 16, sp["hair"])
    ey = ht + 13
    for ex in (x - 10, x + 3):
        if expr == "happy":
            R(d, ex, ey + 2, ex + 2, ey + 4, DARK)
            R(d, ex + 2, ey, ex + 4, ey + 2, DARK)
            R(d, ex + 4, ey + 2, ex + 6, ey + 4, DARK)
        elif expr == "tired":
            R(d, ex, ey + 2, ex + 6, ey + 4, DARK)
            R(d, ex, ey + 5, ex + 6, ey + 6, (176, 130, 150))
        elif expr == "shock":
            R(d, ex, ey - 1, ex + 7, ey + 6, WHITE)
            R(d, ex + 2, ey + 1, ex + 5, ey + 4, DARK)
        else:
            R(d, ex, ey, ex + 7, ey + 5, WHITE)
            px = ex + (4 if look > 0 else 0 if look < 0 else 2)
            R(d, px, ey, px + 3, ey + 5, DARK)
        if sp.get("glasses"):
            d.rectangle([ex - 2, ey - 2, ex + 8, ey + 6], outline=(30, 30, 30))
    if sp.get("glasses"):
        R(d, x - 3, ey + 1, x + 3, ey + 2, (30, 30, 30))
    if expr == "happy":
        R(d, x - 6, ht + 20, x + 6, ht + 25, (150, 40, 40))
        R(d, x - 4, ht + 23, x + 4, ht + 25, (230, 110, 110))
    elif expr == "shock":
        R(d, x - 3, ht + 19, x + 3, ht + 26, (80, 20, 20))
    elif expr == "tired":
        R(d, x - 3, ht + 22, x + 3, ht + 24, (120, 60, 50))
    else:
        R(d, x - 4, ht + 21, x + 4, ht + 23, (120, 60, 50))
    if sweat:
        R(d, x + hw + 2, ht + 4, x + hw + 6, ht + 12, (120, 190, 255))
        R(d, x + hw + 3, ht + 2, x + hw + 5, ht + 4, (120, 190, 255))
    return ht


def hibimaru(c, x, y, swing=-40.0, t=0.0, sparkle=True, k=1.5):
    """ヒビ丸：常識にヒビを入れる虹色ブロック。つるはしを持っている。"""
    layer = Image.new("RGBA", (120, 120), (0, 0, 0, 0))
    _hibi(layer, 60, 60, swing, t, sparkle)
    layer = layer.resize((int(120 * k), int(120 * k)), Image.NEAREST)
    c.paste(layer, (int(x - 60 * k), int(y - 60 * k)), layer)


def _hibi(c, x, y, swing, t, sparkle):
    d = D(c)
    x, y = int(x), int(y)
    s = 26
    x0, y0 = x - s // 2, y - s // 2
    for i in range(s):
        for j in range(0, s, 2):
            k = ((i + j) / (2 * s) * len(RAINBOW) + t * 2) % len(RAINBOW)
            R(d, x0 + j, y0 + i, x0 + j + 2, y0 + i + 1, RAINBOW[int(k)])
    d.rectangle([x0 - 1, y0 - 1, x0 + s, y0 + s], outline=BLACK, width=2)
    d.line([(x0 + 15, y0 + 1), (x0 + 19, y0 + 7), (x0 + 16, y0 + 11), (x0 + 22, y0 + 16)], fill=WHITE, width=2)
    R(d, x0 + 6, y0 + 9, x0 + 10, y0 + 16, BLACK)
    R(d, x0 + 14, y0 + 9, x0 + 18, y0 + 16, BLACK)
    R(d, x0 + 7, y0 + 10, x0 + 9, y0 + 12, WHITE)
    R(d, x0 + 15, y0 + 10, x0 + 17, y0 + 12, WHITE)
    R(d, x0 + 10, y0 + 19, x0 + 14, y0 + 21, BLACK)
    # つるはし
    a = math.radians(swing)
    hx, hy = x0 + s + 1, y0 + 16
    ex, ey = hx + 30 * math.cos(a), hy + 30 * math.sin(a)
    d.line([(hx, hy), (ex, ey)], fill=BLACK, width=6)
    d.line([(hx, hy), (ex, ey)], fill=(150, 100, 56), width=3)
    pa = a + math.pi / 2
    p1 = (ex + 13 * math.cos(pa), ey + 13 * math.sin(pa))
    p2 = (ex - 13 * math.cos(pa), ey - 13 * math.sin(pa))
    d.line([p1, p2], fill=BLACK, width=8)
    d.line([p1, p2], fill=(225, 230, 255), width=4)
    if sparkle:
        for k in range(4):
            ang = t * 3 + k * math.pi / 2
            sx, sy = x + 26 * math.cos(ang), y + 26 * math.sin(ang)
            col = RAINBOW[k % len(RAINBOW)]
            R(d, sx - 1, sy - 4, sx + 2, sy + 5, col)
            R(d, sx - 4, sy - 1, sx + 5, sy + 2, col)


# ---------------------------------------------------------------- 吹き出しと帯
def bubble(c, x, y, s, p=1.0, think=False, small=False):
    if NO_BUBBLES or p <= 0:
        return
    d = D(c)
    lines = s.split("\n")
    w = max(F16.getlength(l) for l in lines) + 14
    h = len(lines) * 18 + 8
    x0 = int(clamp(x - w / 2, 4, W - 4 - w))
    y0 = int(y - h)
    if think:
        for (dx, dy, r) in [(0, 4, 3), (3, 11, 2)]:
            R(d, x + dx - r, y + dy - r, x + dx + r, y + dy + r, WHITE)
            d.rectangle([x + dx - r - 1, y + dy - r - 1, x + dx + r, y + dy + r], outline=BLACK)
    d.rectangle([x0, y0, x0 + w, y0 + h], fill=WHITE, outline=BLACK, width=2)
    if not think:
        d.polygon([(x - 6, y - 1), (x + 4, y - 1), (x - 2, y + 9)], fill=WHITE, outline=BLACK)
        R(d, x - 5, y - 3, x + 4, y + 1, WHITE)
    n = int(sum(len(l) for l in lines) * clamp(p * 1.6))
    for i, l in enumerate(lines):
        k = clamp(n, 0, len(l))
        n -= len(l)
        if k > 0:
            d.text((x0 + 7, y0 + 5 + i * 18), l[: int(k)], font=F16, fill=BLACK)


def band(c, lines, label=None, p=1.0, accent=(255, 222, 90)):
    d = D(c)
    h = (26 if label else 0) + len(lines) * 40 + 18
    y0 = 40
    box = (0, y0, W, y0 + h)
    reg = c.crop(box)
    c.paste(Image.blend(reg, Image.new("RGB", reg.size, (14, 14, 24)), 0.82), box)
    R(d, 0, y0, W, y0 + 3, accent)
    R(d, 0, y0 + h - 3, W, y0 + h, accent)
    y = y0 + 16
    if label:
        text(d, (W / 2, y), label, F16, fill=accent, ol=None)
        y += 26
    total = sum(len(l) for l in lines)
    n = int(total * clamp(p * 1.4))
    for l in lines:
        type_line(d, W / 2, y + 12, l, F32, n, ow=2)
        n -= len(l)
        y += 40


def big_pop(c, s, cx, cy, p, col=(255, 230, 60), scale=2):
    if p <= 0:
        return
    k = back(clamp(p * 2.5))
    img = Image.new("RGBA", (int(F32.getlength(s)) + 12, 44), (0, 0, 0, 0))
    dd = D(img)
    text(dd, (img.width / 2, 22), s, F32, fill=col, ow=2)
    sc = max(0.1, scale * k)
    img = img.resize((max(1, int(img.width * sc)), max(1, int(img.height * sc))), Image.NEAREST)
    c.paste(img, (int(cx - img.width / 2), int(cy - img.height / 2)), img)


def confetti(c, ox, oy, t, n=40, seed=3):
    if t <= 0:
        return
    d = D(c)
    rnd = random.Random(seed)
    for i in range(n):
        vx, vy = rnd.uniform(-150, 150), rnd.uniform(-330, -120)
        x = ox + vx * t
        y = oy + vy * t + 0.5 * 520 * t * t
        if y < H:
            col = RAINBOW[i % len(RAINBOW)]
            R(d, x, y, x + 4, y + 3 + (i + int(t * 10)) % 2 * 2, col)


def heart(c, x, y, col=(240, 90, 130)):
    d = D(c)
    for (dx, dy, w) in [(-4, 0, 3), (1, 0, 3), (-5, 2, 10), (-4, 4, 8), (-3, 6, 6), (-2, 8, 4), (-1, 10, 2)]:
        R(d, x + dx, y + dy, x + dx + w, y + dy + 2, col)


# ---------------------------------------------------------------- 第1話 定時に帰れない空気
def ep1_story(c, t):
    if t < 2.6:
        hour, clock = 17.98, "17:59"
    elif t < 5.2:
        hour, clock = 18.0, "18:00"
    else:
        hf = min(21.0, 18 + (t - 5.2) / 0.7)
        hour = hf
        clock = f"{int(hf)}:{int((hf % 1) * 60):02d}" if hf < 21 else "21:00"
    office(c, hour, clock, webs=seg(t, 5.2, 7.4), ff=5.2 <= t < 7.4, t=t)
    people = [(52, TSUMIKI), (162, MIDORI), (272, BUCHO)]
    for i, (x, sp) in enumerate(people):
        typing = int(t * 8 + i * 3) % 2 == 0
        expr, sweat, look = "n", False, 0
        if t > 5.2:
            expr = "tired"
        if i == 0:
            if 2.6 <= t < 4.0:
                expr = "happy"
            elif 4.0 <= t < 5.2:
                look, sweat = (1 if int(t * 3) % 2 else -1), True
        char(c, x, sp=sp, expr=expr, bob=-1 if (typing and not (i == 0 and 2.6 <= t < 5.2)) else 0, look=look, sweat=sweat)
        desk(c, x + 22, screen=(90, 190, 255) if hour < 19.5 else (60, 120, 200))
    if 2.6 <= t < 4.0:
        bubble(c, 52, 380, "おわった！\n帰れる…！", seg(t, 2.6, 3.0), think=True)
    if 4.0 <= t < 5.2:
        bubble(c, 52, 380, "でも 先に帰るの\n気まずい…", seg(t, 4.0, 4.4), think=True)
    if t >= 7.5:
        for i, (x, sp) in enumerate(people):
            bubble(c, x, 380, "だれか先に\n帰って…", seg(t, 7.5 + i * 0.3, 7.9 + i * 0.3), think=True)


def ep1_sol(c, t):
    office(c, 18.0, "18:01")
    d = D(c)
    desk(c, 184)
    desk(c, 294)
    # ドア
    R(d, 318, 380, 360, FLOOR, (110, 70, 40))
    R(d, 322, 384, 360, FLOOR, (60, 40, 26) if t > 3.0 else (150, 100, 58))
    # おさきボタン
    R(d, 118, 432, 182, FLOOR, (120, 120, 130))
    R(d, 118, 432, 182, 436, (160, 160, 170))
    text(d, (150, 452), "おさき", F16, fill=WHITE, ol=None)
    pressed = 1.0 <= t < 1.6
    R(d, 136, 424 if pressed else 418, 164, 432, (220, 40, 40))
    R(d, 140, 424 if pressed else 418, 160, 428 if pressed else 422, (255, 120, 120))
    # バナー
    if t > 1.1:
        by = -60 + 290 * ease(seg(t, 1.1, 1.5))
        R(d, 130, by, 350, by + 50, (255, 240, 170))
        d.rectangle([130, by, 349, by + 49], outline=(200, 140, 40), width=3)
        text(d, (240, by + 16), "本日のヒーロー", F16, fill=(180, 60, 40), ol=None)
        text(d, (240, by + 34), "ツミキ 18:01 退勤", F16, fill=BLACK, ol=None)
    cheer = 1.5 <= t < 3.0
    jump = -abs(int(6 * math.sin(t * 12))) if cheer else 0
    # ツミキ
    if t < 0.9:
        tx = 52 + (106 - 52) * seg(t, 0, 0.9)
        char(c, tx, walk=t * 14, expr="n")
    elif t < 3.0:
        char(c, 106, arm=3 if t < 1.5 else 2, expr="happy" if t > 1.1 else "n", bob=jump)
    else:
        tx = 106 + 320 * ease(seg(t, 3.0, 4.8))
        char(c, tx, walk=t * 14, expr="happy")
    # ミドリ
    if t < 3.6:
        char(c, 210, sp=MIDORI, expr="happy" if t > 1.1 else "n", arm=2 if cheer else 0, bob=jump)
    else:
        char(c, 210 + 260 * seg(t, 3.6, 5.4), sp=MIDORI, walk=t * 14, expr="happy")
    # 部長
    if t < 3.4:
        char(c, 290, sp=BUCHO, expr="happy" if t > 1.1 else "n", arm=2 if cheer else 0, bob=jump)
    else:
        char(c, 290 + 160 * ease(seg(t, 3.4, 4.2)), sp=BUCHO, walk=t * 20, expr="happy")
    big_pop(c, "ポチッ", 150, 380, seg(t, 1.0, 1.8) if t < 1.8 else 0)
    confetti(c, 150, 420, t - 1.0)
    bubble(c, 290, 380, "ナイス退勤！", seg(t, 1.6, 2.0) if t < 3.0 else 0)
    bubble(c, 250, 380, "わたしも\n帰るー！", seg(t, 3.2, 3.6) if t < 4.6 else 0)


# ---------------------------------------------------------------- 第2話 休み明けのおみやげ配り
BOX_COLS = [(236, 120, 160), (120, 170, 240), (250, 200, 90), (140, 210, 140), (200, 140, 230), (240, 150, 90)]


def ep2_story(c, t):
    office(c, 9.0, "9:00")
    d = D(c)
    desk(c, 50, w=70)
    for i, (x, sp) in enumerate([(200, MIDORI), (300, BUCHO)]):
        typing = int(t * 8 + i * 3) % 2 == 0 and t < 2.5
        expr = "n"
        if t > 6.8:
            expr = "shock" if i == 0 else "tired"
        char(c, x, sp=sp, expr=expr, bob=-1 if typing else 0)
        desk(c, x + 20, w=76)
    # 積み上がるおみやげ
    nbox = 0 if t < 4.5 else min(14, int((t - 4.5) / 0.16) + 1)
    wob = math.sin(t * 9) * seg(t, 6.6, 7.2) * 1.0
    for k in range(nbox):
        age = t - 4.5 - k * 0.16
        drop = (1 - ease(clamp(age / 0.18))) * -120
        y = FLOOR - 30 - (k + 1) * 20 + drop
        x = 50 + wob * k * 0.9 + (k % 3 - 1) * 3
        col = BOX_COLS[k % len(BOX_COLS)]
        R(d, x - 26, y, x + 26, y + 20, col)
        R(d, x - 26, y + 17, x + 26, y + 20, shade(col, 0.75))
        R(d, x - 2, y, x + 2, y + 20, (250, 240, 200))
    # ツミキ
    if t < 2.0:
        tx = -20 + 130 * ease(seg(t, 0, 2.0))
        char(c, tx, walk=t * 14, hold="box", expr="happy")
    else:
        expr = "n"
        if t > 6.8:
            expr = "shock"
        char(c, 110, hold="box" if t < 4.5 else None, expr=expr, sweat=2.5 < t < 6.8, look=1 if 2.5 < t < 4.5 else 0)
    if t < 2.6:
        bubble(c, 100, 380, "旅行\nたのしかった〜", seg(t, 0.8, 1.3))
    if 2.5 <= t < 4.5:
        for i, x in enumerate([200, 300]):
            if t > 2.7 + i * 0.4:
                big_pop(c, str(i + 1), x, 360, seg(t, 2.7 + i * 0.4, 3.2 + i * 0.4), scale=1)
        bubble(c, 120, 380, "人数分…\nたりる？" if t < 3.7 else "となりの部署も\n…？", seg(t, 2.6, 3.0) if t < 3.7 else seg(t, 3.7, 4.1), think=True)
    if 4.6 <= t < 6.8:
        bubble(c, 200, 380, "これ\nお返し♪", seg(t, 4.6, 5.0))
        bubble(c, 300, 380, "わたしからも", seg(t, 5.3, 5.7))
    if t >= 6.8:
        bubble(c, 130, 380, "お返しの\nお返しの…", seg(t, 6.8, 7.2))
        bubble(c, 290, 330, "正直 甘いの\n苦手なんだよね", seg(t, 7.7, 8.2), think=True)


def ep2_sol(c, t):
    office(c, 9.0, "9:05")
    d = D(c)
    # 写真ボード
    by = -100 + 340 * ease(seg(t, 0, 0.6))
    R(d, 18, by, 152, by + 90, (250, 250, 250))
    R(d, 24, by + 6, 146, by + 84, (150, 210, 250))
    R(d, 24, by + 54, 146, by + 84, (110, 180, 110))
    d.polygon([(40, by + 60), (78, by + 18), (116, by + 60)], fill=(120, 120, 140))
    R(d, 70, by + 18, 86, by + 26, WHITE)
    R(d, 90, by + 62, 140, by + 80, (120, 200, 230))
    for k in range(3):
        sy = by + 50 - ((t * 20 + k * 6) % 18)
        R(d, 96 + k * 14, sy, 100 + k * 14, sy + 6, (240, 240, 240))
    R(d, 104, by + 52, 120, by + 68, (150, 100, 60))
    R(d, 107, by + 56, 117, by + 66, (240, 190, 160))
    R(d, 109, by + 59, 111, by + 61, BLACK)
    R(d, 113, by + 59, 115, by + 61, BLACK)
    # ステージ
    R(d, 30, FLOOR - 20, 150, FLOOR, (150, 100, 58))
    R(d, 30, FLOOR - 20, 150, FLOOR - 16, (190, 140, 80))
    text(d, (90, FLOOR - 7), "1分トーク", F16, fill=WHITE, ol=None)
    talk = int(t * 6) % 2 == 0 and t < 2.8
    char(c, 90, yf=FLOOR - 20, expr="happy" if t > 2.8 else "n", arm=1 if talk else 0)
    laugh = t > 2.8
    jig = -abs(int(4 * math.sin(t * 14))) if laugh else 0
    char(c, 220, sp=MIDORI, expr="happy" if laugh else "n", bob=jig, arm=2 if laugh and int(t * 4) % 2 else 0)
    char(c, 305, sp=BUCHO, expr="happy" if t > 3.6 else "n", bob=jig if t > 3.6 else 0)
    bubble(c, 150, 372, "露天風呂で\nサルと目が\n合った話", seg(t, 0.7, 1.4) if t < 2.9 else 0)
    bubble(c, 220, 380, "ウケる！\n行きたい！", seg(t, 2.9, 3.3))
    bubble(c, 300, 300, "甘いのより\nこっちがいい", seg(t, 3.7, 4.2))
    for k in range(5):
        ht = t - 3.0 - k * 0.35
        if ht > 0:
            heart(c, 180 + k * 30 + 6 * math.sin(ht * 5), 380 - ht * 50)


# ---------------------------------------------------------------- 第3話 おじぎハンコ
SLOTS = ["社長", "本部長", "部長", "課長", "担当"]


def stamp_img(s, angle):
    img = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
    d = D(img)
    d.ellipse([4, 4, 35, 35], outline=(210, 40, 40), width=3)
    d.text((20, 20), s, font=F16, fill=(210, 40, 40), anchor="mm")
    return img.rotate(angle, resample=Image.NEAREST)


def paper(c, stamps, t):
    d = D(c)
    R(d, 30, 200, 330, 400, (90, 70, 50))
    R(d, 36, 206, 324, 394, (252, 250, 240))
    text(d, (180, 224), "稟議書 No.128", F16, fill=BLACK, ol=None)
    for i, s in enumerate(SLOTS):
        x0 = 50 + i * 54
        d.rectangle([x0, 242, x0 + 50, 314], outline=(60, 60, 60), width=2)
        d.line([(x0, 262), (x0 + 50, 262)], fill=(60, 60, 60), width=2)
        d.text((x0 + 25, 252), s, font=F16, fill=BLACK, anchor="mm")
    for i in range(4):
        R(d, 52, 330 + i * 14, 300 - (i % 2) * 50, 336 + i * 14, (200, 200, 200))
    for slot, (s, ang, t0) in stamps.items():
        if t >= t0:
            k = back(clamp((t - t0) * 4))
            img = stamp_img(s, ang)
            sz = max(1, int(40 * (2 - k) if k < 1 else 40))
            img = img.resize((sz, sz), Image.NEAREST)
            x0 = 50 + SLOTS.index(slot) * 54 + 25
            c.paste(img, (int(x0 - sz / 2), int(288 - sz / 2)), img)


def ep3_story(c, t):
    office(c, 10.0, None)
    stamps = {}
    if t >= 2.6:
        ang = 0 if t < 4.3 else 22 * ease(seg(t, 4.3, 4.9))
        stamps["担当"] = ("ツミ", ang, 2.6)
    for i, (slot, nm) in enumerate([("課長", "課"), ("部長", "ガン"), ("本部長", "本")]):
        stamps[slot] = (nm, 22 + i * 10, 5.2 + i * 0.6)
    paper(c, stamps, t)
    d = D(c)
    if 4.4 <= t < 5.1:
        text(d, (300, 330), "おじぎ角度", F16, fill=(200, 40, 40), ol=WHITE)
        text(d, (300, 348), "22°", F16, fill=(200, 40, 40), ol=WHITE)
    if 5.0 <= t < 7.2:
        day = 1 + min(4, int((t - 5.0) / 0.45))
        R(d, 120, 404, 240, 426, (40, 40, 60))
        text(d, (180, 415), f"承認まで {day}日目", F16, fill=(255, 230, 90), ol=None)
    ts_expr = "n"
    if 3.5 <= t < 5.0 or t > 7.4:
        ts_expr = "shock"
    elif 5.0 <= t < 7.4:
        ts_expr = "tired"
    char(c, 80, hold="stamp" if t < 2.6 else None, arm=1 if t < 2.6 else 0, expr=ts_expr, sweat=3.5 < t < 5.0)
    bu_expr = "shock" if t > 7.4 else "n"
    char(c, 270, sp=BUCHO, expr=bu_expr, look=-1)
    if t > 6.9:
        char(c, -20 + 170 * ease(seg(t, 6.9, 7.5)), sp=SHACHO, walk=t * 14 if t < 7.5 else None)
    bubble(c, 80, 380, "ハンコ押す\nだけだよね？", seg(t, 0.6, 1.1) if t < 2.6 else 0)
    if 3.5 <= t < 5.0:
        bubble(c, 270, 380, "まっすぐは\n失礼だよ？", seg(t, 3.5, 3.9))
    if t >= 7.6:
        bubble(c, 150, 380, "で、これ\n何の書類？", seg(t, 7.6, 8.0))


def ep3_sol(c, t):
    office(c, 10.0, None)
    d = D(c)
    R(d, 30, 200, 330, 400, (60, 60, 70))
    R(d, 36, 206, 324, 394, (24, 34, 60))
    text(d, (180, 228), "稟議 No.128", F16, fill=(180, 200, 240), ol=None)
    done = t > 1.0
    pressed = 0.8 <= t < 1.2
    bx = (110, 260, 250, 310)
    R(d, bx[0], bx[1] + (3 if pressed else 0), bx[2], bx[3] + (3 if pressed else 0), (60, 190, 110) if not done else (90, 90, 110))
    text(d, (180, 286 + (3 if pressed else 0)), "承認する" if not done else "承認済み ✓", F16, fill=WHITE, ol=None)
    # ミニハンコたち
    for k in range(3):
        sx = 220 + k * 34
        if t > 2.6:
            ang = 20 * math.sin(t * 5 + k)
        else:
            ang = 0
        img = Image.new("RGBA", (28, 28), (0, 0, 0, 0))
        dd = D(img)
        R(dd, 9, 2, 19, 12, (170, 120, 70))
        R(dd, 6, 12, 22, 26, (210, 40, 40))
        R(dd, 9, 16, 12, 19, WHITE)
        R(dd, 16, 16, 19, 19, WHITE)
        img = img.rotate(ang, resample=Image.NEAREST)
        c.paste(img, (sx - 14, 360), img)
    char(c, 90, sp=SHACHO, arm=3 if 0.5 < t < 1.4 else 0, expr="happy" if t > 1.2 else "n")
    char(c, 190, expr="shock" if 1.2 < t < 2.4 else ("happy" if t > 2.4 else "n"))
    char(c, 300, sp=BUCHO, expr="happy" if t > 1.4 else "n")
    big_pop(c, "ポチッ", 180, 250, seg(t, 0.8, 1.5) if t < 1.5 else 0)
    big_pop(c, "承認まで 3秒", 180, 330, seg(t, 1.2, 1.8) if t < 2.6 else 0, scale=1.5)
    confetti(c, 180, 300, t - 1.2)
    bubble(c, 76, 380, "浮いた5日で\n何しようか", seg(t, 2.6, 3.0))
    bubble(c, 206, 380, "企画\n考えます！", seg(t, 3.5, 3.9))
    bubble(c, 290, 352, "おつかれ〜", seg(t, 4.2, 4.5))


# ---------------------------------------------------------------- 話の共通部分
EPISODES = [
    dict(slug="01_teiji", no="#01", title=["定時に", "帰れない空気"], story=ep1_story, sol=ep1_sol,
         new=["先に帰る人は", "ヒーロー"], thumb_t=8.6, thumb_title=["定時に", "帰れない", "空気"]),
    dict(slug="02_omiyage", no="#02", title=["休み明けの", "おみやげ配り"], story=ep2_story, sol=ep2_sol,
         new=["モノより", "土産話"], thumb_t=7.0, thumb_title=["休み明けの", "おみやげ", "配り"]),
    dict(slug="03_hanko", no="#03", title=["上司におじぎ", "するハンコ"], story=ep3_story, sol=ep3_sol,
         new=["敬意は角度より", "スピードで"], thumb_t=6.8, thumb_title=["上司に", "おじぎする", "ハンコ"]),
]


def but_frame(ep, lt, with_bubble=True):
    c = Image.new("RGB", (W, H))
    ep["story"](c, STORY_END)
    c = Image.blend(c, Image.new("RGB", c.size, (10, 10, 30)), 0.45 * seg(lt, 0, 0.4))
    p = ease(seg(lt, 0.0, 0.8))
    hx, hy = 400 + (180 - 400) * p, 120 + (300 - 120) * p + 4 * math.sin(lt * 6)
    hibimaru(c, hx, hy, swing=-40, t=lt)
    if with_bubble:
        bubble(c, hx, hy - 36, "その常識、\n割ってみる？", seg(lt, 0.8, 1.3))
    band(c, ["こうしたら", "解決できるかも"], label="でも、それって…", p=seg(lt, 0, 0.9), accent=(140, 220, 255))
    return c


_crack_cache = {}


def crack_paths(seed=11):
    if seed not in _crack_cache:
        rnd = random.Random(seed)
        paths = []
        cx, cy = 200, 320
        for k in range(10):
            a = k / 10 * 2 * math.pi + rnd.uniform(-0.2, 0.2)
            pts = [(cx, cy)]
            x, y = cx, cy
            while -20 < x < W + 20 and -20 < y < H + 20:
                a += rnd.uniform(-0.5, 0.5)
                L = rnd.uniform(14, 30)
                x, y = x + L * math.cos(a), y + L * math.sin(a)
                pts.append((x, y))
            paths.append(pts)
        _crack_cache[seed] = paths
    return _crack_cache[seed]


def draw_cracks(c, p):
    d = D(c)
    for pts in crack_paths():
        n = max(1, int((len(pts) - 1) * p))
        seg_pts = pts[: n + 1]
        if len(seg_pts) > 1:
            d.line(seg_pts, fill=BLACK, width=5)
            d.line(seg_pts, fill=WHITE, width=2)


def crack_frame(ep, lt):
    swing = -40 if lt < 0.15 else (-120 if lt < 0.3 else 60)
    if lt < 0.85:
        c = but_frame(ep, T_BUT, with_bubble=False)
        hibimaru(c, 180, 300, swing=swing, t=lt)
        if lt >= 0.35:
            draw_cracks(c, ease(seg(lt, 0.35, 0.7)))
            if lt < 0.45:
                c = Image.blend(c, Image.new("RGB", c.size, WHITE), 0.6)
            big_pop(c, "パキッ！", 180, 470, seg(lt, 0.35, 0.85), scale=2.5)
            sh = int(5 * math.sin(lt * 90)) if lt < 0.7 else 0
            out = Image.new("RGB", c.size, BLACK)
            out.paste(c, (sh, -sh))
            c = out
        return c
    # 崩れるブロック
    broken = but_frame(ep, T_BUT, with_bubble=False)
    hibimaru(broken, 180, 300, swing=60, t=0.85)
    draw_cracks(broken, 1.0)
    big_pop(broken, "パキッ！", 180, 470, 1.0, scale=2.5)
    nxt = sol_frame(ep, 0.0)
    tt = lt - 0.85
    rnd = random.Random(5)
    tile = 24
    for ty in range(0, H, tile):
        for tx in range(0, W, tile):
            dist = math.hypot(tx - 180, ty - 300) / 420
            delay = dist * 0.45 + rnd.uniform(0, 0.12)
            vx = rnd.uniform(-60, 60)
            if tt < delay:
                nxt.paste(broken.crop((tx, ty, tx + tile, ty + tile)), (tx, ty))
                continue
            k = tt - delay
            y = ty + 0.5 * 1800 * k * k
            if y < H:
                nxt.paste(broken.crop((tx, ty, tx + tile, ty + tile)), (int(tx + vx * k), int(y)))
    return nxt


def sol_frame(ep, lt):
    c = Image.new("RGB", (W, H))
    ep["sol"](c, lt)
    band(c, ep["new"], label="新しい常識", p=seg(lt, 0.2, 1.2), accent=(255, 140, 200))
    return c


def story_frame(ep, t):
    c = Image.new("RGB", (W, H))
    ep["story"](c, t)
    if t < T_HOOK:
        band(c, ["こんなこと", "ありませんか？"], p=seg(t, 0, 0.9))
    else:
        band(c, ep["title"], label="誰も喜ばない常識 " + ep["no"], p=seg(t, T_HOOK, T_HOOK + 0.9))
    return c


# ---------------------------------------------------------------- エンドカード（フル解像度）
_logo = {}


def logo_mask():
    if "m" not in _logo:
        im = np.asarray(Image.open(LOGO).convert("RGB")).astype(np.float32)
        white = im.min(axis=2)
        ys, xs = np.where(white > 242)
        x0, x1, y0, y1 = xs.min() - 3, xs.max() + 4, ys.min() - 3, ys.max() + 4
        crop = Image.fromarray(white[y0:y1, x0:x1].astype(np.uint8))
        scale = 860 / crop.width
        big = crop.resize((int(crop.width * scale), int(crop.height * scale)), Image.LANCZOS)
        m = np.asarray(big).astype(np.float32)
        m = np.clip((m - 205) / 40, 0, 1)
        _logo["m"] = m
    return _logo["m"]


BLOBS = [((0.15, 0.2), (236, 120, 200)), ((0.85, 0.15), (120, 160, 245)), ((0.5, 0.05), (252, 238, 150)),
         ((0.1, 0.75), (170, 120, 230)), ((0.9, 0.7), (40, 170, 230)), ((0.5, 0.95), (150, 235, 200)),
         ((0.5, 0.5), (190, 170, 240))]


def gradient(t):
    gw, gh = 54, 96
    yy, xx = np.mgrid[0:gh, 0:gw]
    xx, yy = xx / gw, yy / gh
    acc = np.zeros((gh, gw, 3), np.float32)
    wsum = np.zeros((gh, gw, 1), np.float32)
    for i, ((bx, by), col) in enumerate(BLOBS):
        cx = bx + 0.08 * math.cos(t * 0.9 + i)
        cy = by + 0.05 * math.sin(t * 0.7 + i * 2)
        w = np.exp(-((xx - cx) ** 2 * 3.2 + (yy - cy) ** 2) / 0.05)[..., None]
        acc += w * np.array(col, np.float32)
        wsum += w
    img = (acc / (wsum + 1e-6)).clip(0, 255).astype(np.uint8)
    return np.asarray(Image.fromarray(img).resize((FW, FH), Image.BICUBIC)).astype(np.float32)


def end_frame(lt):
    bg = gradient(lt)
    m = logo_mask()
    mh, mw = m.shape
    ox, oy = (FW - mw) // 2, 760
    strip = 8
    for xs in range(0, mw, strip):
        q = seg(lt, 0.15 + xs / mw * 0.55, 0.15 + xs / mw * 0.55 + 0.4)
        if q <= 0:
            continue
        off = int(-(1 - back(q)) * 320)
        a = m[:, xs:xs + strip][..., None]
        y0 = oy + off
        ys0, ys1 = max(0, y0), min(FH, y0 + mh)
        if ys1 <= ys0:
            continue
        a = a[ys0 - y0: ys1 - y0]
        region = bg[ys0:ys1, ox + xs: ox + xs + a.shape[1]]
        bg[ys0:ys1, ox + xs: ox + xs + a.shape[1]] = region * (1 - a) + 255 * a
    img = Image.fromarray(bg.clip(0, 255).astype(np.uint8))
    d = D(img)
    tag = "誰も喜ばない常識に、"
    tag2 = "ヒビを入れる。"
    n = int((len(tag) + len(tag2)) * seg(lt, 1.3, 2.3))
    for (s, y, k) in [(tag, 1340, n), (tag2, 1440, n - len(tag))]:
        x0 = FW / 2 - F64.getlength(s) / 2
        if k > 0:
            d.text((x0 + 5, y + 5), s[:k], font=F64, fill=(60, 40, 110), anchor="lm")
            d.text((x0, y), s[:k], font=F64, fill=WHITE, anchor="lm")
    if lt < 0.35:
        img = Image.blend(img, Image.new("RGB", img.size, WHITE), 1 - lt / 0.35)
    return img


# ---------------------------------------------------------------- 1コマを返す
def frame(ep, t):
    if t >= G_END:
        return end_frame(t - G_END)
    if t < G_BUT:
        c = story_frame(ep, t)
    elif t < G_CRACK:
        c = but_frame(ep, t - G_BUT)
    elif t < G_SOL:
        c = crack_frame(ep, t - G_CRACK)
    else:
        c = sol_frame(ep, t - G_SOL)
        if t > G_END - 0.25:
            c = Image.blend(c, Image.new("RGB", c.size, WHITE), seg(t, G_END - 0.25, G_END))
    return c.resize((FW, FH), Image.NEAREST)


# ---------------------------------------------------------------- 音
SR = 32000


def tone(freq, dur, vol=0.2, kind="sq", decay=6.0):
    n = int(SR * dur)
    tt = np.arange(n) / SR
    if kind == "sq":
        w = np.sign(np.sin(2 * np.pi * freq * tt))
    elif kind == "tri":
        w = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * freq * tt))
    else:
        w = np.sin(2 * np.pi * freq * tt)
    env = np.exp(-tt * decay) * np.minimum(1, tt * 400)
    return (w * env * vol).astype(np.float32)


def noise(dur, vol=0.4, decay=8.0, smooth=1):
    n = int(SR * dur)
    w = np.random.default_rng(1).uniform(-1, 1, n).astype(np.float32)
    if smooth > 1:
        w = np.convolve(w, np.ones(smooth) / smooth, mode="same") * math.sqrt(smooth)
    tt = np.arange(n) / SR
    return w * np.exp(-tt * decay) * vol


def sfx(kind):
    if kind == "pop":
        return np.concatenate([tone(880, 0.05, 0.12), tone(1320, 0.08, 0.12)])
    if kind == "blip":
        return tone(1046, 0.06, 0.08)
    if kind == "tick":
        return noise(0.03, 0.25, 60)
    if kind == "ding":
        return tone(1568, 0.6, 0.18, "sin", 5) + tone(2093, 0.6, 0.08, "sin", 6)
    if kind == "whoosh":
        return noise(0.5, 0.18, 4, smooth=12)
    if kind == "swing":
        return noise(0.18, 0.2, 10, smooth=4)
    if kind == "crack":
        return noise(0.4, 0.7, 12) + tone(70, 0.4, 0.5, "sin", 8)
    if kind == "rumble":
        return noise(1.0, 0.35, 3, smooth=40)
    if kind == "stack":
        return tone(220, 0.07, 0.15)
    if kind == "jingle":
        out = np.zeros(int(SR * 1.6), np.float32)
        for i, f in enumerate([523, 659, 784, 1047]):
            s = tone(f, 1.0, 0.13, "sq", 3)
            st = int(i * 0.12 * SR)
            out[st: st + len(s)] += s[: len(out) - st]
        return out
    if kind == "fanfare":
        out = np.zeros(int(SR * 1.0), np.float32)
        for i, f in enumerate([784, 988, 1175, 1568]):
            s = tone(f, 0.4, 0.1, "sq", 5)
            st = int(i * 0.08 * SR)
            out[st: st + len(s)] += s
        return out
    raise ValueError(kind)


def bgm(total):
    out = np.zeros(int(SR * total), np.float32)
    step = 60 / 132 / 2
    prog = [(262, 330, 392), (220, 262, 330), (175, 220, 262), (196, 247, 294)]
    i = 0
    t = 0.0
    while t < total:
        chord = prog[(i // 8) % 4]
        f = chord[[0, 1, 2, 1][i % 4]] * 2
        s = tone(f, step * 0.9, 0.045, "sq", 9)
        st = int(t * SR)
        out[st: st + len(s)] += s[: len(out) - st]
        if i % 2 == 0:
            b = tone(chord[0] / 2, step * 1.8, 0.09, "tri", 3)
            out[st: st + len(b)] += b[: len(out) - st]
        i += 1
        t += step
    # 「でも…」からヒビまでは止める
    a, b = int(G_BUT * SR), int((G_SOL - 0.1) * SR)
    out[a:b] *= 0.0
    out[int(G_END * SR):] *= 0.0
    return out


SFX_COMMON = [(0.05, "pop"), (G_PROB, "pop"), (G_BUT, "pop"), (G_BUT + 0.1, "whoosh"), (G_CRACK + 0.15, "swing"),
              (G_CRACK + 0.35, "crack"), (G_CRACK + 0.85, "rumble"), (G_SOL, "ding"), (G_END, "jingle")]
SFX_EP = {
    "01_teiji": [(2.6, "ding"), (2.6, "blip"), (4.0, "blip")] + [(5.2 + k * 0.233, "tick") for k in range(10)]
    + [(7.5, "blip"), (7.8, "blip"), (8.1, "blip"), (G_SOL + 1.0, "pop"), (G_SOL + 1.05, "fanfare"), (G_SOL + 1.6, "blip"), (G_SOL + 3.2, "blip")],
    "02_omiyage": [(0.8, "blip"), (2.7, "blip"), (3.1, "blip"), (3.7, "blip")] + [(4.5 + k * 0.16, "stack") for k in range(14)]
    + [(4.6, "blip"), (5.3, "blip"), (6.8, "blip"), (7.7, "blip"), (G_SOL + 0.7, "blip"), (G_SOL + 2.9, "fanfare"), (G_SOL + 3.7, "blip")],
    "03_hanko": [(0.6, "blip"), (2.6, "stack"), (3.5, "blip"), (5.2, "stack"), (5.8, "stack"), (6.4, "stack"), (7.6, "blip"),
                 (G_SOL + 0.8, "pop"), (G_SOL + 1.2, "fanfare"), (G_SOL + 2.6, "blip"), (G_SOL + 3.5, "blip"), (G_SOL + 4.2, "blip")],
}


def write_audio(ep, path):
    out = bgm(TOTAL)
    for (t, k) in SFX_COMMON + SFX_EP[ep["slug"]]:
        s = sfx(k)
        st = int(t * SR)
        end = min(len(out), st + len(s))
        out[st:end] += s[: end - st]
    out = np.clip(out, -1, 1)
    pcm = (out * 32000).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ---------------------------------------------------------------- サムネイル
def thumbnail(ep, path):
    global NO_BUBBLES
    NO_BUBBLES = True
    c = Image.new("RGB", (W, H))
    try:
        ep["story"](c, ep["thumb_t"])
    finally:
        NO_BUBBLES = False
    c = Image.blend(c, Image.new("RGB", c.size, (12, 10, 30)), 0.72)
    hibimaru(c, 60, 92, swing=-60, t=0.3, sparkle=False)
    img = c.resize((FW, FH), Image.NEAREST)
    d = D(img)
    text(d, (FW / 2, 420), "誰も喜ばない常識 " + ep["no"], F64, fill=(255, 222, 90), ow=4)
    y = 620
    for line in ep["thumb_title"]:
        text(d, (FW / 2, y), line, F128, fill=WHITE, ow=6)
        y += 160
    # 文字の上を走るヒビ
    rnd = random.Random(ep["no"])
    x, yy = 60, 560 + rnd.randint(0, 80)
    pts = [(x, yy)]
    while x < FW - 60:
        x += rnd.randint(40, 90)
        yy += rnd.randint(-60, 60)
        pts.append((x, yy))
    d.line(pts, fill=BLACK, width=16)
    d.line(pts, fill=WHITE, width=6)
    logo = Image.open(LOGO).convert("RGB").resize((220, 220), Image.LANCZOS)
    img.paste(logo, (FW - 260, FH - 560))
    text(d, (FW / 2, 1120), "それ、割ってみない？", F64, fill=(140, 220, 255), ow=4)
    img.save(path)


# ---------------------------------------------------------------- 書き出し
def render(ep):
    os.makedirs(OUT, exist_ok=True)
    wav = os.path.join(OUT, ep["slug"] + ".wav")
    mp4 = os.path.join(OUT, f"crack_{ep['slug']}.mp4")
    write_audio(ep, wav)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{FW}x{FH}", "-r", str(FPS),
           "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", mp4]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(int(TOTAL * FPS)):
        p.stdin.write(frame(ep, i / FPS).tobytes())
    p.stdin.close()
    if p.wait() != 0:
        raise SystemExit("ffmpeg の書き出しに失敗しました: " + mp4)
    os.remove(wav)
    thumbnail(ep, os.path.join(OUT, f"crack_{ep['slug']}_thumb.png"))
    print("done", mp4)


def preview():
    pdir = os.path.join(OUT, "preview")
    os.makedirs(pdir, exist_ok=True)
    times = [1.5, 4.5, 6.5, 8.6, G_BUT + 1.6, G_CRACK + 0.5, G_CRACK + 1.3, G_SOL + 1.4, G_SOL + 3.8, G_END + 2.8]
    for ep in EPISODES:
        tiles = [frame(ep, t).resize((270, 480)) for t in times]
        sheet = Image.new("RGB", (270 * 5, 480 * 2))
        for i, im in enumerate(tiles):
            sheet.paste(im, ((i % 5) * 270, (i // 5) * 480))
        sheet.save(os.path.join(pdir, f"{ep['slug']}_sheet.png"))
        thumbnail(ep, os.path.join(pdir, f"{ep['slug']}_thumb.png"))


if __name__ == "__main__":
    if "--preview" in sys.argv:
        preview()
    else:
        only = [a for a in sys.argv[1:] if not a.startswith("-")]
        for ep in EPISODES:
            if not only or ep["slug"] in only:
                render(ep)
