"""宣伝助太刀の動画を、episodeのJSONと合成済みの台詞音声から書き出す。

使い方:
  python build_video.py episode01.json --assets <素材> --voices <音声> --out <出力>
  --stills 5:0.4 21:1.0   指定カットの指定秒だけ静止画で書き出して確認する
  --only 5 21             指定カットだけ動画にする（音声つき）

素材フォルダに置くもの:
  kudo.png / naka.png / kv.png  キャラシートとキービジュアル（4倍アップスケール済み）
  NotoSansJP-500.ttf / NotoSansJP-900.ttf / YujiBoku.ttf
音声フォルダは synth_voices.py の出力（voices.json）。
"""
import argparse
import json
import math
import os
import subprocess
import wave
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

W, H, FPS, SR = 1920, 1080, 30, 44100
SCALE = 4  # アップスケール倍率。CROPSは元画像の座標

CROPS = {
    "k_n1": ("kudo", (325, 15, 505, 245)), "k_n2": ("kudo", (500, 15, 722, 245)),
    "k_think": ("kudo", (725, 15, 900, 245)), "k_smile": ("kudo", (1100, 15, 1306, 245)),
    "k_laugh": ("kudo", (1310, 15, 1530, 245)), "k_pc": ("kudo", (340, 255, 640, 497)),
    "k_phone": ("kudo", (640, 255, 842, 497)), "k_glass": ("kudo", (845, 255, 1077, 497)),
    "k_rub": ("kudo", (1080, 255, 1282, 497)), "k_surp": ("kudo", (1285, 255, 1530, 497)),
    "k_type": ("kudo", (1065, 515, 1330, 750)), "k_up": ("kudo", (1372, 770, 1530, 1000)),
    "n_basic": ("naka", (728, 428, 878, 626)), "n_laugh": ("naka", (884, 425, 1034, 628)),
    "n_think": ("naka", (1038, 425, 1188, 628)), "n_angry": ("naka", (1191, 425, 1342, 628)),
    "n_phone": ("naka", (812, 725, 1056, 930)), "n_meet": ("naka", (558, 725, 806, 930)),
}

CHARS = {
    "K": {"name": "工藤", "side": "R", "color": (61, 90, 128), "cut": (34, 78, 150)},
    "N": {"name": "中山", "side": "L", "color": (168, 50, 42), "cut": (186, 38, 32)},
    "NA": {"name": "中野", "side": "L", "color": (36, 128, 112), "cut": (24, 130, 110)},
    "S": {"name": "佐伯（ひなた食品）", "side": None, "color": (96, 96, 96), "cut": (96, 96, 96)},
    "NR": {"name": "ナレーション", "side": None, "color": (176, 136, 52), "cut": (176, 136, 52)},
}

AI_IDEAS = [
    "SNS広告", "インフルエンサー起用", "TikTok投稿", "Instagramリール", "Xキャンペーン", "YouTube広告",
    "プレスリリース", "記者発表会", "店頭試食", "店頭POP", "サンプリング", "交通広告", "ラジオCM",
    "テレビCM", "新聞広告", "チラシ", "LINE配信", "メルマガ", "ポップアップストア", "料理研究家コラボ",
    "レシピ動画", "口コミキャンペーン", "ハッシュタグ企画", "プレゼント企画", "ECモール広告",
    "検索連動型広告", "リターゲティング", "公式アカウント開設", "社員SNS発信", "地域イベント出展",
    "ノベルティ配布", "ブランドサイト刷新",
]

INK = (14, 16, 20)
CREAM = (243, 236, 220)
GOLD = (226, 178, 84)
RED = (168, 50, 42)
NO_LINE_START = set("、。，．・：；？！ー）」』】…ぁぃぅぇぉっゃゅょァィゥェォッャュョ")

SLOT = {"L": {"big": (600, 455), "small": (390, 470)}, "R": {"big": (1320, 455), "small": (1480, 470)}}
TILT = {"L": 1.5, "R": -1.5}
BIG, SMALL = (700, 880), (470, 600)
TELOP_TYPES = ("talk", "board", "list")
LEAD = {"talk": 0.22, "cutin": 0.45, "board": 0.35, "list": 0.3, "mail": 0.6, "kv": 0.6, "summary": 0.5, "cta": 0.5, "next": 0.7}
TAIL = {"talk": 0.35, "cutin": 0.7}
MIN_DUR = {"talk": 1.4, "cutin": 2.2, "card": 2.6, "chapter": 2.3, "list": 3.0, "board": 2.0, "mail": 3.0}


# ---------- 補間 ----------

def clamp01(x):
    return 0.0 if x < 0 else 1.0 if x > 1 else x


def ease_out(x):
    x = clamp01(x)
    return 1 - (1 - x) ** 3


def ease_in(x):
    x = clamp01(x)
    return x ** 3


def ease_io(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def ease_back(x, s=1.6):
    x = clamp01(x) - 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2


def lerp(a, b, u):
    return a + (b - a) * u


# ---------- 素材 ----------

class Ctx:
    def __init__(self, assets):
        self.assets = assets
        self.fonts = {}
        self.cache = {}
        self.sheets = {k: Image.open(os.path.join(assets, k + ".png")).convert("RGB") for k in ("kudo", "naka")}
        self.kv = Image.open(os.path.join(assets, "kv.png")).convert("RGB").resize((2304, 1296), Image.LANCZOS)
        self.base = make_base_bg(2000, 1125)
        self.base_dark = ImageEnhance.Brightness(self.base).enhance(0.45)
        self.header = make_header(self)
        self.bar = make_telop_bar()

    def font(self, kind, size):
        key = (kind, size)
        if key not in self.fonts:
            file = {"b": "NotoSansJP-900.ttf", "r": "NotoSansJP-500.ttf", "brush": "YujiBoku.ttf"}[kind]
            self.fonts[key] = ImageFont.truetype(os.path.join(self.assets, file), size)
        return self.fonts[key]

    def memo(self, key, fn):
        if key not in self.cache:
            self.cache[key] = fn()
        return self.cache[key]

    def char_image(self, key):
        if key == "na":
            return self.memo(("crop", key), lambda: nakano_placeholder(self))
        sheet, box = CROPS[key]
        return self.memo(("crop", key), lambda: self.sheets[sheet].crop(tuple(v * SCALE for v in box)))

    def panel(self, key, side, size="big", dim=False):
        def make():
            if dim:
                return darken(self.panel(key, side, size), 0.55)
            h, w = BIG if size == "big" else SMALL
            return framed(self.char_image(key), h, w, TILT[side])
        return self.memo(("panel", key, side, size, dim), make)

    def bg(self, T, dark=False):
        ox = int(40 + 30 * math.sin(2 * math.pi * T / 37))
        oy = int(22 + 15 * math.sin(2 * math.pi * T / 51))
        return (self.base_dark if dark else self.base).crop((ox, oy, ox + W, oy + H))


def make_base_bg(w, h):
    im = Image.new("RGB", (w, h), (29, 31, 36))
    d = ImageDraw.Draw(im)
    sx = w / W
    d.polygon([(1050 * sx, 0), (w, 0), (w, h), (920 * sx, h)], fill=(58, 70, 86))
    over = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    o = ImageDraw.Draw(over)
    cx, cy = 500, 540
    for i in range(72):
        t = i / 72 * 2 * math.pi
        o.line([(cx + math.cos(t) * 260, cy + math.sin(t) * 260),
                (cx + math.cos(t) * 1700, cy + math.sin(t) * 1700)], fill=GOLD + (34,), width=2)
    for y in range(0, h, 24):
        for x in range(0, w, 24):
            left = x < (1050 - 130 * y / h) * sx
            r = 2.4 if (x // 24 + y // 24) % 2 == 0 else 1.6
            o.ellipse([x - r, y - r, x + r, y + r], fill=(GOLD + (46,)) if left else (CREAM + (34,)))
    for bx, bw, bh in [(1220, 110, 330), (1350, 80, 230), (1450, 130, 420), (1600, 90, 280), (1720, 150, 380), (1890, 90, 300)]:
        o.rectangle([bx, h - bh, bx + bw, h], outline=CREAM + (40,), width=3)
        for wy in range(h - bh + 24, h - 20, 34):
            for wx in range(bx + 16, bx + bw - 16, 26):
                o.rectangle([wx, wy, wx + 10, wy + 14], outline=CREAM + (36,), width=2)
    im = Image.alpha_composite(im.convert("RGBA"), over)
    d = ImageDraw.Draw(im)
    d.polygon([(1037 * sx, 0), (1063 * sx, 0), (933 * sx, h), (907 * sx, h)], fill=GOLD)
    return im.convert("RGB")


def make_header(ctx):
    im = Image.new("RGBA", (W, 100), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(0, 26), (720, 26), (690, 92), (0, 92)], fill=INK + (235,))
    d.text((44, 59), "企画・宣伝協同組合 ／ 宣伝助太刀 第一話", font=ctx.font("b", 32), fill=CREAM, anchor="lm")
    d.rectangle([W - 380, 36, W - 40, 84], fill=RED + (235,))
    d.text((W - 210, 60), "※架空のモデルケースです", font=ctx.font("b", 26), fill="white", anchor="mm")
    return im


BAR_Y = 760


def make_telop_bar():
    im = Image.new("RGBA", (W, H - BAR_Y), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = [(70, 846), (1850, 826), (1834, 1046), (86, 1056)]
    d.polygon([(x, y - BAR_Y) for x, y in pts], fill=INK + (238,), outline=CREAM + (255,))
    return im


def nakano_placeholder(ctx):
    w, h = 720, 880
    im = Image.new("RGB", (w, h), (36, 128, 112))
    d = ImageDraw.Draw(im)
    for y in range(h):
        c = int(30 * y / h)
        d.line([(0, y), (w, y)], fill=(36 + c, 128 - c, 112 - c))
    d.ellipse([w / 2 - 150, 150, w / 2 + 150, 470], fill=(18, 40, 38))
    d.rounded_rectangle([w / 2 - 300, 480, w / 2 + 300, h + 200], radius=220, fill=(18, 40, 38))
    d.text((w / 2, 640), "中野", font=ctx.font("b", 150), fill=CREAM, anchor="mm")
    d.text((w / 2, 770), "立ち絵 差し替え予定", font=ctx.font("r", 44), fill=CREAM, anchor="mm")
    return im


def framed(img, target_h, max_w, tilt):
    s = target_h / img.height
    if img.width * s > max_w:
        s = max_w / img.width
    img = img.resize((int(img.width * s), int(img.height * s)), Image.LANCZOS)
    b = 14
    card = Image.new("RGBA", (img.width + b * 2 + 8, img.height + b * 2 + 8), INK + (255,))
    card.paste(Image.new("RGB", (img.width + b * 2, img.height + b * 2), CREAM), (4, 4))
    card.paste(img, (b + 4, b + 4))
    card = card.rotate(tilt, resample=Image.BICUBIC, expand=True)
    shadow = Image.new("RGBA", (card.width + 60, card.height + 60), (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 150), (30 + 14, 30 + 18), card.split()[3])
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    shadow.alpha_composite(card, (30, 30))
    return shadow


def darken(im, amount):
    r, g, b, a = im.split()
    rgb = ImageEnhance.Brightness(Image.merge("RGB", (r, g, b))).enhance(1 - amount)
    out = rgb.convert("RGBA")
    out.putalpha(a)
    return out


def fade(im, alpha):
    if alpha >= 0.999:
        return im
    out = im.copy()
    out.putalpha(im.split()[3].point(lambda v: int(v * alpha)))
    return out


def scaled(im, s):
    if abs(s - 1) < 1e-3:
        return im
    return im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.BILINEAR)


def paste_c(frame, im, cx, cy):
    x, y = int(cx - im.width / 2), int(cy - im.height / 2)
    frame.paste(im, (x, y), im)
    return x, y, x + im.width, y + im.height


def wrap(text, font, max_w):
    lines, cur = [], ""
    for ch in text:
        if ch == "\n":
            lines.append(cur)
            cur = ""
            continue
        if font.getlength(cur + ch) > max_w and cur:
            if ch in NO_LINE_START:
                cur += ch
                continue
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines


def wrap_phrases(text, font, max_w):
    """句読点の後ろで改行する。収まらない句だけ文字単位で折る。"""
    tokens, cur = [], ""
    for ch in text:
        cur += ch
        if ch in "、。？！…」　" and not (ch == "…" and False):
            tokens.append(cur)
            cur = ""
    if cur:
        tokens.append(cur)
    merged = []
    for tk in tokens:
        if merged and all(c in "、。？！…」　" for c in tk):
            merged[-1] += tk
        else:
            merged.append(tk)
    lines, line = [], ""
    for tk in merged:
        if font.getlength(line + tk) <= max_w:
            line += tk
        elif font.getlength(tk) <= max_w:
            if line:
                lines.append(line)
            line = tk
        else:
            parts = wrap(line + tk, font, max_w)
            lines += parts[:-1]
            line = parts[-1]
    if line:
        lines.append(line)
    return [ln.rstrip("　") for ln in lines]


def fit_lines(ctx, text, kind, sizes, max_w, max_lines):
    if "\n" in text:
        lines = text.split("\n")
        for size in sizes:
            f = ctx.font(kind, size)
            if all(f.getlength(ln) <= max_w for ln in lines):
                break
        return f, lines
    for size in sizes:
        f = ctx.font(kind, size)
        lines = wrap_phrases(text, f, max_w)
        if len(lines) <= max_lines:
            return f, lines
    for size in sizes:
        f = ctx.font(kind, size)
        lines = wrap(text, f, max_w)
        if len(lines) <= max_lines:
            return f, lines
    return f, lines


def shake(frame, t, start, length=0.3, amp=14):
    u = (t - start) / length
    if not 0 <= u < 1:
        return frame
    a = amp * (1 - u)
    return ImageChops.offset(frame, int(a * math.sin(t * 97)), int(a * math.cos(t * 71)))


def text_image(ctx, text, kind, size, fill, stroke=0, stroke_fill=INK):
    f = ctx.font(kind, size)
    l, t, r, b = f.getbbox(text, stroke_width=stroke)
    im = Image.new("RGBA", (r - l + 8, b - t + 8), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((4 - l, 4 - t), text, font=f, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)
    return im


# ---------- テロップ ----------

def draw_telop(ctx, frame, sp, t, text, lead, vlen, telop_in, name_wipe, note=None):
    yoff = int((1 - ease_out(t / 0.22)) * 300) if telop_in else 0
    frame.paste(ctx.bar, (0, BAR_Y + yoff), ctx.bar)
    ch = CHARS[sp]

    def tag():
        nf = ctx.font("b", 46)
        nw = int(nf.getlength(ch["name"])) + 64
        im = Image.new("RGBA", (nw + 10, 80), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.polygon([(0, 6), (nw, 0), (nw - 8, 72), (4, 76)], fill=ch["color"] + (255,))
        d.text((32, 38), ch["name"], font=nf, fill="white", anchor="lm")
        return im
    tg = ctx.memo(("tag", sp), tag)
    if name_wipe:
        w = int(tg.width * ease_out((t - 0.04) / 0.18))
        if w > 0:
            part = tg.crop((0, 0, w, tg.height))
            frame.paste(part, (96, 780 + yoff), part)
    else:
        frame.paste(tg, (96, 780 + yoff), tg)
    d = ImageDraw.Draw(frame)
    if note:
        a = ease_out((t - 0.2) / 0.4)
        c = int(40 + 160 * a)
        d.text((W / 2, 950 + yoff), note, font=ctx.font("r", 52), fill=(c, c, c), anchor="mm")
        return
    f, lines = ctx.memo(("telop", text), lambda: fit_lines(ctx, text, "b", (60, 54, 48), 1640, 2))
    total = sum(len(x) for x in lines)
    shown = int(round(total * clamp01((t - lead) / max(0.5, vlen * 0.7)))) if vlen else total
    lh = int(f.size * 1.42)
    y0 = 946 - lh * (len(lines) - 1) / 2 + yoff
    for i, ln in enumerate(lines):
        part = ln[: max(0, shown)]
        shown -= len(ln)
        if part:
            d.text((130, y0 + i * lh), part, font=f, fill="white", anchor="lm", stroke_width=2, stroke_fill=INK)


# ---------- 各レイアウト ----------

def fx_marks(ctx, frame, kind, side, box, t):
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(frame)
    inner_x = x1 - 60 if side == "L" else x0 + 60
    sgn = 1 if side == "L" else -1
    if kind == "surprise" and t > 0.05:
        k = ease_back((t - 0.05) / 0.15)
        for dx, dy in ((1.0, -0.25), (0.75, -0.85), (0.25, -1.1)):
            px, py = inner_x + sgn * 10, y0 + 80
            qx, qy = px + sgn * dx * 90 * k, py + dy * 90 * k
            d.line([(px, py), (qx, qy)], fill="white", width=20)
            d.line([(px, py), (qx, qy)], fill=INK, width=11)
    elif kind == "sweat":
        cx = inner_x - sgn * 40
        cy = y0 + 110 + 40 * ease_io(t / 1.2)
        d.ellipse([cx - 20, cy - 4, cx + 20, cy + 36], fill=(170, 214, 244), outline=INK, width=4)
        d.polygon([(cx - 17, cy + 8), (cx + 17, cy + 8), (cx, cy - 34)], fill=(170, 214, 244))
        d.line([(cx - 18, cy + 8), (cx, cy - 34), (cx + 18, cy + 8)], fill=INK, width=4)
    elif kind == "think":
        bx = x0 - 200 if side == "R" else x1 + 30
        by = y0 + 60
        if t > 0.1:
            d.rounded_rectangle([bx, by, bx + 170, by + 70], radius=34, fill=CREAM, outline=INK, width=4)
            for k in range(3):
                if t > 0.25 + k * 0.25:
                    d.ellipse([bx + 34 + k * 44, by + 26, bx + 52 + k * 44, by + 44], fill=INK)


def draw_talk(ctx, sp_, t, T):
    sh = sp_["sh"]
    side = CHARS[sh["sp"]]["side"]
    other = "R" if side == "L" else "L"
    frame = ctx.bg(T)
    f = min(int(t * FPS), len(sp_["env"]) - 1) if sp_["env"] else 0
    env = sp_["env"][f] if sp_["env"] else 0
    lis = sp_.get("lis")
    if lis:
        mode = sp_["lis_mode"]
        (bx, by), (sx, sy) = SLOT[other]["big"], SLOT[other]["small"]
        if mode == "shrink" and t < 0.25:
            u = ease_io(t / 0.25)
            im = scaled(ctx.panel(lis, other), lerp(1, SMALL[0] / BIG[0], u))
            paste_c(frame, darken(im, 0.55 * u), lerp(bx, sx, u), lerp(by, sy, u))
        else:
            im = ctx.panel(lis, other, "small", dim=True)
            if mode == "fadein":
                im = fade(im, ease_out(t / 0.25))
            paste_c(frame, im, sx, sy)
    (cx, cy), (scx, scy) = SLOT[side]["big"], SLOT[side]["small"]
    cy -= 7 * env
    mode = sp_["spk_mode"]
    img = sh["img"]
    big = ctx.panel(img, side)
    off = -W / 2 - 300 if side == "L" else W / 2 + 300
    if sh.get("fx") == "surprise":
        cy -= 40 * math.sin(math.pi * clamp01(t / 0.3))
    if mode == "enter":
        u = ease_back(t / 0.34)
        box = paste_c(frame, big, cx + off * (1 - u), cy)
    elif mode == "swap":
        if t < 0.22:
            paste_c(frame, ctx.panel(sp_["old"], side), cx, cy + 900 * ease_in(t / 0.22))
        u = ease_back((t - 0.12) / 0.34)
        box = paste_c(frame, big, cx + off * (1 - u), cy)
    elif sp_["grow"] and t < 0.25:
        u = ease_io(t / 0.25)
        im = darken(scaled(big, lerp(SMALL[0] / BIG[0], 1, u)), 0.55 * (1 - u))
        box = paste_c(frame, im, lerp(scx, cx, u), lerp(scy, cy, u))
    elif mode == "expr" and t < 0.16:
        paste_c(frame, ctx.panel(sp_["old"], side), cx, cy)
        box = paste_c(frame, fade(big, ease_out(t / 0.16)), cx, cy - 10 * (1 - t / 0.16))
    else:
        s = 1.12 - 0.12 * ease_out(t / 0.2) if sh.get("fx") == "impact" else 1
        box = paste_c(frame, scaled(big, s), cx, cy)
    if sh.get("fx") in ("surprise", "sweat", "think"):
        fx_marks(ctx, frame, sh["fx"], side, box, t)
    frame.paste(ctx.header, (0, 0), ctx.header)
    draw_telop(ctx, frame, sh["sp"], t, sh["text"], sp_["lead"], sp_["vlen"], sp_["telop_in"], sp_["name_wipe"], sh.get("telop_note"))
    if sh.get("fx") == "impact":
        frame = shake(frame, t, 0, 0.3, 16)
    return frame


def draw_cutin(ctx, sp_, t, T):
    sh = sp_["sh"]
    ch = CHARS[sh["sp"]]
    side = ch["side"]
    frame = ctx.bg(T, dark=True)
    d = ImageDraw.Draw(frame)
    xo = -W * (1 - ease_out(t / 0.2))
    top = [(0, 250), (W, 180)]
    bot = [(W, 770), (0, 840)]
    band = [(x + xo, y) for x, y in top + bot]
    d.polygon(band, fill=ch["cut"])
    rng = np.random.default_rng(sp_["idx"])
    light = tuple(int(c + (255 - c) * 0.35) for c in ch["cut"])
    for k in range(26):
        y = 240 + rng.uniform(0, 560)
        ln = rng.uniform(200, 700)
        x = (rng.uniform(0, W + 800) - 2600 * t) % (W + 800) - 400 + xo
        slope = -70 / W
        d.line([(x, y + slope * x), (x + ln, y + slope * (x + ln))], fill=light, width=int(rng.uniform(3, 9)))
    d.line([(p[0], p[1]) for p in band[:2]], fill=INK, width=12)
    d.line([(p[0], p[1]) for p in band[2:]], fill=INK, width=12)
    d.line([(band[0][0], band[0][1] + 18), (band[1][0], band[1][1] + 18)], fill=GOLD, width=4)
    d.line([(band[3][0], band[3][1] - 18), (band[2][0], band[2][1] - 18)], fill=GOLD, width=4)
    face = ctx.memo(("cutface", sh["img"]), lambda: framed(ctx.char_image(sh["img"]), 640, 760, 3 if side == "L" else -3))
    u = ease_back((t - 0.05) / 0.3)
    paste_c(frame, face, lerp(-500, 470, u), 510)

    def make_text():
        f, lines = fit_lines(ctx, sh.get("cut_text", sh["text"]), "b", (100, 90, 80, 70), 940, 3)
        lh = int(f.size * 1.3)
        im = Image.new("RGBA", (1000, lh * len(lines) + 40), (0, 0, 0, 0))
        dd = ImageDraw.Draw(im)
        for i, ln in enumerate(lines):
            dd.text((20, 20 + i * lh), ln, font=f, fill="white", stroke_width=9, stroke_fill=INK)
        return im
    txt = ctx.memo(("cuttext", sp_["idx"]), make_text)
    if t > 0.25:
        k = ease_out((t - 0.25) / 0.14)
        paste_c(frame, fade(scaled(txt, 1.35 - 0.35 * k), k), 1330, 515)
        tag = ctx.memo(("cuttag", sh["sp"]), lambda: text_image(ctx, ch["name"], "b", 44, "white", 0))
        tx, ty = 850, int(515 - txt.height / 2 - tag.height - 10)
        d.rectangle([tx - 16, ty - 8, tx + tag.width + 16, ty + tag.height + 8], fill=INK)
        frame.paste(tag, (tx, ty), tag)
    if 0.25 <= t < 0.33:
        frame = Image.blend(frame, Image.new("RGB", (W, H), "white"), 0.4 * (1 - (t - 0.25) / 0.08))
    return shake(frame, t, 0.25, 0.3, 18)


def chip(ctx, i, hl):
    def make():
        im = Image.new("RGBA", (372, 52), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        if hl:
            d.rounded_rectangle([0, 0, 371, 51], radius=10, fill=(250, 214, 92), outline=(255, 245, 200), width=3)
            d.text((18, 26), f"{i + 1:02d}  {AI_IDEAS[i]}", font=ctx.font("b", 30), fill=INK, anchor="lm")
        else:
            d.rounded_rectangle([0, 0, 371, 51], radius=10, fill=(26, 40, 58), outline=(60, 100, 140), width=2)
            d.text((18, 26), f"{i + 1:02d}  {AI_IDEAS[i]}", font=ctx.font("r", 30), fill=(220, 232, 240), anchor="lm")
        return im
    return ctx.memo(("chip", i, hl), make)


def draw_list(ctx, sp_, t, T):
    sh = sp_["sh"]
    frame = ctx.bg(T)

    def panel():
        im = Image.new("RGBA", (1640, 680), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle([10, 10, 1630, 670], radius=26, fill=(10, 14, 22), outline=(80, 150, 200), width=4)
        d.text((60, 70), "AIが出した施策案", font=ctx.font("b", 52), fill=(150, 210, 240), anchor="lm")
        return im
    pn = ctx.memo(("listpanel",), panel)
    build = sh.get("mode") == "build"
    s = lerp(0.94, 1, ease_out(t / 0.22)) if build else 1
    paste_c(frame, scaled(pn, s), 960, 440)
    d = ImageDraw.Draw(frame)
    n_vis = 32
    scan_t = {}
    if build:
        n_vis = 0
    else:
        for k, idx in enumerate(sh.get("scan", [])):
            scan_t[idx] = sp_["lead"] + sp_["vlen"] * 0.85 * (k + 0.2) / len(sh["scan"])
    for i in range(32):
        c, r = i % 4, i // 4
        x, y = 190 + c * 392, 240 + r * 64
        if build:
            ti = 0.35 + i * 0.045
            if t < ti:
                continue
            n_vis += 1
            y += int(16 * (1 - ease_out((t - ti) / 0.1)))
        if i in scan_t and t >= scan_t[i]:
            k = ease_out((t - scan_t[i]) / 0.12)
            im = scaled(chip(ctx, i, True), 1.15 - 0.15 * k)
            paste_c(frame, im, x + 186, y + 26)
        else:
            im = chip(ctx, i, False)
            frame.paste(im, (x, y), im)
    stamp_t = 0.35 + 32 * 0.045 + 0.15
    if not build or t >= stamp_t:
        k = ease_out((t - stamp_t) / 0.12) if build else 1
        st = ctx.memo(("stamp32",), lambda: text_image(ctx, "32件", "b", 92, (232, 70, 60), 6, (10, 14, 22)))
        paste_c(frame, scaled(st, 1.8 - 0.8 * k), 1640, 170)
    else:
        d.text((1720, 170), f"{n_vis}件", font=ctx.font("b", 84), fill=(150, 160, 170), anchor="rm")
    frame.paste(ctx.header, (0, 0), ctx.header)
    draw_telop(ctx, frame, sh["sp"], t, sh["text"], sp_["lead"], sp_["vlen"], sp_["telop_in"], sp_["name_wipe"])
    return shake(frame, t, stamp_t, 0.25, 12) if build else frame


def plate_image(ctx, box, key):
    def make():
        x0, y0, x1, y1 = box
        im = Image.new("RGBA", (x1 - x0 + 160, y1 - y0 + 80), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        ox, oy = 80, 20
        d.polygon([(ox + 30, oy + 16), (ox + x1 - x0 + 16, oy + 30), (ox + x1 - x0 - 10, oy + y1 - y0 + 18), (ox + 10, oy + y1 - y0 + 10)], fill=(0, 0, 0, 120))
        d.polygon([(ox + 18, oy), (ox + x1 - x0, oy + 14), (ox + x1 - x0 - 22, oy + y1 - y0), (ox, oy + y1 - y0 - 8)], fill=CREAM, outline=INK, width=8)
        for i in range(6):
            d.line([(ox - 60, oy + 70 + i * 26), (ox + 40, oy + 46 + i * 26)], fill=RED, width=7)
        return im, x0 - ox, y0 - oy
    return ctx.memo(("plate", key), make)


def draw_board(ctx, sp_, t, T):
    sh = sp_["sh"]
    frame = ctx.bg(T)
    xo = int((1 - ease_out(t / 0.3)) * 1300)
    pl, px, py = plate_image(ctx, (190, 120, 1730, 760), "board")
    frame.paste(pl, (px + xo, py), pl)
    d = ImageDraw.Draw(frame)
    hf = ctx.font("b", 66)
    d.text((260 + xo, 200), sh["heading"], font=hf, fill=INK, anchor="lm")
    d.line([(260 + xo, 248), (260 + xo + hf.getlength(sh["heading"]), 248)], fill=RED, width=8)
    items = sh["items"]
    n = len(items)
    rh = 470 / n
    hl, prev = sh["hl"], sp_.get("prev_hl")
    if hl >= 0:
        if prev is not None and prev >= 0 and prev != hl:
            yb = lerp(290 + prev * rh, 290 + hl * rh, ease_io((t - 0.3) / 0.3))
            wb = 1.0
        else:
            yb = 290 + hl * rh
            wb = ease_out((t - 0.35) / 0.25)
        if wb > 0:
            d.rectangle([230 + xo, yb + 6, 230 + xo + 1430 * wb, yb + rh - 14], fill=(235, 222, 196))
            d.rectangle([230 + xo, yb + 6, 246 + xo, yb + rh - 14], fill=RED)
    for i, (label, desc) in enumerate(items):
        if sp_["first"]:
            ti = sp_["lead"] + sp_["vlen"] * 0.75 * i / n if hl < 0 else 0.25 + 0.08 * i
        else:
            ti = 0
        if t < ti:
            continue
        on = hl < 0 or hl == i
        col = INK if on else (170, 165, 155)
        dx = int(40 * (1 - ease_out((t - ti) / 0.18))) if ti > 0 else 0
        y = 290 + i * rh
        lf = ctx.font("b", 46 if n > 2 else 52)
        d.text((280 + xo + dx, y + rh / 2 - 26), label, font=lf, fill=RED if on else col, anchor="lm")
        df, dl = ctx.memo(("desc", desc), lambda: fit_lines(ctx, desc, "r", (40, 36), 1340, 1))
        d.text((300 + xo + dx, y + rh / 2 + 30), dl[0], font=df, fill=col, anchor="lm")
    frame.paste(ctx.header, (0, 0), ctx.header)
    draw_telop(ctx, frame, sh["sp"], t, sh["text"], sp_["lead"], sp_["vlen"], sp_["telop_in"], sp_["name_wipe"])
    return frame


def draw_mail(ctx, sp_, t, T):
    sh = sp_["sh"]
    frame = ctx.bg(T)

    def window():
        im = Image.new("RGBA", (1420, 680), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle([10, 10, 1410, 670], radius=18, fill=(250, 250, 248), outline=INK, width=6)
        d.rounded_rectangle([10, 10, 1410, 90], radius=18, fill=(225, 228, 232))
        d.rectangle([10, 70, 1410, 90], fill=(225, 228, 232))
        for i, c in enumerate([(230, 90, 80), (240, 190, 70), (90, 190, 110)]):
            d.ellipse([50 + i * 44, 36, 76 + i * 44, 62], fill=c)
        d.text((710, 50), "受信トレイ", font=ctx.font("b", 30), fill=(90, 90, 90), anchor="mm")
        d.text((70, 140), "差出人　" + sh["from"], font=ctx.font("r", 34), fill=(80, 80, 80), anchor="lm")
        d.text((70, 200), "件名　" + sh["subject"], font=ctx.font("b", 44), fill=INK, anchor="lm")
        d.line([(70, 245), (1350, 245)], fill=(210, 210, 210), width=3)
        return im
    win = ctx.memo(("mail",), window)
    k = ease_back(t / 0.3)
    x0, y0, _, _ = paste_c(frame, fade(scaled(win, lerp(0.88, 1, k)), clamp01(t / 0.15)), 960, 460)
    if t >= 0.3:
        f, lines = ctx.memo(("mailbody",), lambda: fit_lines(ctx, sh["text"], "r", (42,), 1260, 8))
        total = sum(len(x) for x in lines)
        shown = int(total * clamp01((t - sp_["lead"]) / max(0.5, sp_["vlen"] * 0.95)))
        d = ImageDraw.Draw(frame)
        for i, ln in enumerate(lines):
            part = ln[: max(0, shown)]
            shown -= len(ln)
            if part:
                d.text((x0 + 70, y0 + 300 + i * 70), part, font=f, fill=(40, 40, 40), anchor="lm")
    ch = CHARS[sh["sp"]]
    tag = ctx.memo(("voicetag", sh["sp"]), lambda: text_image(ctx, ch["name"] + "の声", "b", 40, "white"))
    tx = int(lerp(-tag.width - 80, 126, ease_out((t - 0.3) / 0.25)))
    ImageDraw.Draw(frame).rectangle([tx - 30, 858, tx + tag.width + 30, 932], fill=ch["color"])
    frame.paste(tag, (tx, 870), tag)
    frame.paste(ctx.header, (0, 0), ctx.header)
    return frame


def card_number(t):
    return int(round(30 - 16 * ease_out(t / 0.9)))


def draw_card(ctx, sp_, t, T):
    sh = sp_["sh"]
    frame = Image.new("RGB", (W, H), (10, 10, 12))
    d = ImageDraw.Draw(frame)
    c = int(225 * ease_out((t - 0.05) / 0.35))
    d.text((W / 2, 330), sh["sub"], font=ctx.font("b", 90), fill=(c, c, c), anchor="mm")
    if t < 0.9:
        d.text((W / 2, 610), f"{card_number(t)}日", font=ctx.font("b", 320), fill=(120, 120, 124), anchor="mm")
    else:
        big = ctx.memo(("cardbig",), lambda: text_image(ctx, sh["big"], "b", 320, (205, 42, 38)))
        paste_c(frame, scaled(big, 1.5 - 0.5 * ease_out((t - 0.9) / 0.12)), W / 2, 640)
    return shake(frame, t, 0.9, 0.3, 18)


def draw_chapter(ctx, sp_, t, T):
    sh = sp_["sh"]
    dur = sp_["dur"]
    lay = Image.new("RGB", (W, H), (20, 21, 25))
    d = ImageDraw.Draw(lay)
    xr = W * ease_out(t / 0.3)
    if xr > 0:
        d.polygon([(0, 420), (xr, 420 - 90 * xr / W), (xr, 780 - 90 * xr / W), (0, 780)], fill=RED)
    for i in range(10):
        d.line([(0, 400 - i * 34), (xr, 400 - i * 34 - 90 * xr / W)], fill=(70, 62, 46), width=2)
    if t > 0.25:
        no = ctx.memo(("chno", sh["no"]), lambda: text_image(ctx, sh["no"], "brush", 190, CREAM))
        k = ease_out((t - 0.25) / 0.15)
        paste_c(lay, fade(scaled(no, 1.6 - 0.6 * k), k), W / 2, 250)
    if t > 0.45:
        ti = ctx.memo(("chti", sh["title"]), lambda: text_image(ctx, sh["title"], "b", 130, "white", 6))
        paste_c(lay, ti, W / 2 + 900 * (1 - ease_out((t - 0.45) / 0.3)), 565)
    out_u = ease_in((t - (dur - 0.3)) / 0.3)
    if out_u > 0:
        frame = ctx.bg(T)
        frame.paste(lay, (int(-W * out_u), 0))
        return frame
    return shake(lay, t, 0.25, 0.22, 10)


def draw_kv(ctx, sp_, t, T):
    dur = sp_["dur"]
    z = 1 + 0.06 * t / dur
    cw, chh = 2304 / z / 1.0, 1296 / z / 1.0
    cx, cy = 1152, 648
    frame = ctx.kv.crop((int(cx - cw / 2), int(cy - chh / 2), int(cx + cw / 2), int(cy + chh / 2))).resize((W, H), Image.BILINEAR)
    if sp_["kv_first"] and t < 0.3:
        frame = Image.blend(frame, Image.new("RGB", (W, H), "white"), 0.8 * (1 - t / 0.3))
    if sp_["kv_last"] and t > dur - 1.0:
        frame = Image.blend(frame, Image.new("RGB", (W, H), "black"), ease_io((t - (dur - 1.0)) / 1.0))
    return frame


def draw_summary(ctx, sp_, t, T):
    sh = sp_["sh"]
    frame = ctx.bg(T)
    pl, px, py = plate_image(ctx, (190, 120, 1730, 880), "summary")
    yo = int(-900 * (1 - ease_back(t / 0.4)))
    frame.paste(pl, (px, py + yo), pl)
    if t > 0.3:
        hd = ctx.memo(("sumhead",), lambda: text_image(ctx, sh["heading"], "brush", 110, RED))
        k = ease_out((t - 0.3) / 0.15)
        paste_c(frame, fade(scaled(hd, 1.5 - 0.5 * k), k), W / 2, 230 + yo)
    d = ImageDraw.Draw(frame)
    for i, item in enumerate(sh["items"]):
        ti = sp_["seg_t"][i + 1] if i + 1 < len(sp_["seg_t"]) else 1 + i
        if t < ti:
            continue
        y = 410 + i * 150 + yo
        k = ease_back((t - ti) / 0.2)
        r = 46 * k
        d.ellipse([336 - r, y - r, 336 + r, y + r], fill=INK)
        d.text((336, y), str(i + 1), font=ctx.font("b", int(56 * max(k, 0.1))), fill=CREAM, anchor="mm")
        im = ctx.memo(("sumitem", i), lambda: text_image(ctx, item, "b", 58, INK))
        w = int(im.width * ease_out((t - ti) / 0.35))
        if w > 0:
            part = im.crop((0, 0, w, im.height))
            frame.paste(part, (416, int(y - im.height / 2)), part)
    return frame


def draw_cta(ctx, sp_, t, T):
    sh = sp_["sh"]
    frame = ctx.bg(T)
    pl, px, py = plate_image(ctx, (230, 220, 1690, 700), "cta")
    k = ease_back(t / 0.35)
    paste_c(frame, fade(scaled(pl, lerp(0.85, 1, k)), clamp01(t / 0.12)), px + pl.width / 2, py + pl.height / 2)
    d = ImageDraw.Draw(frame)
    if t > 0.2:
        d.text((W / 2, 400), sh["big"], font=ctx.font("b", 104), fill=INK, anchor="mm")
        wl = 1080 * ease_out((t - 0.4) / 0.3)
        d.line([(420, 480), (420 + wl, 480)], fill=RED, width=8)
        d.text((W / 2, 580), sh["sub"], font=ctx.font("r", 46), fill=(60, 60, 60), anchor="mm")
    by = 800 + 14 * abs(math.sin(2 * math.pi * t * 0.8))
    d.polygon([(1340, by), (1460, by), (1400, by + 80)], fill=GOLD)
    d.text((1400, 960), "概要欄のリンクから", font=ctx.font("b", 48), fill=CREAM, anchor="mm")
    return frame


def draw_next(ctx, sp_, t, T):
    sh = sp_["sh"]
    frame = Image.new("RGB", (W, H), (20, 21, 25))
    if t > 0.1:
        hd = ctx.memo(("nexthead",), lambda: text_image(ctx, "次回予告", "brush", 140, GOLD))
        k = ease_out((t - 0.1) / 0.15)
        paste_c(frame, fade(scaled(hd, 1.6 - 0.6 * k), k), W / 2, 220)
    for i, ln in enumerate(sh["big"].split("\n")):
        ti = sp_["lead"] + 0.3 + i * 0.6
        if t < ti:
            continue
        im = ctx.memo(("nextln", i), lambda: text_image(ctx, ln, "b", 110, "white", 5))
        w = int(im.width * ease_out((t - ti) / 0.45))
        if w > 0:
            part = im.crop((0, 0, w, im.height))
            frame.paste(part, (int(W / 2 - im.width / 2), int(520 + i * 160 - im.height / 2)), part)
    if t > 1.6:
        x = int(lerp(W, 760, ease_out((t - 1.6) / 0.3)))
        d = ImageDraw.Draw(frame)
        d.rectangle([x, 880, x + 400, 940], fill=RED)
        d.text((x + 200, 910), "第二話", font=ctx.font("b", 40), fill="white", anchor="mm")
    return shake(frame, t, 0.1, 0.2, 10)


DRAW = {"talk": draw_talk, "cutin": draw_cutin, "list": draw_list, "board": draw_board, "mail": draw_mail,
        "card": draw_card, "chapter": draw_chapter, "kv": draw_kv, "summary": draw_summary, "cta": draw_cta, "next": draw_next}


# ---------- 段取り ----------

def read_wav(path):
    with wave.open(path) as w:
        assert w.getframerate() == SR and w.getnchannels() == 1
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768.0


def voice_env(v, lead, frames):
    env = []
    win = SR // FPS
    for f in range(frames):
        s = int((f / FPS - lead) * SR)
        seg = v[max(s, 0): max(s + win, 0)] if s + win > 0 else v[:0]
        env.append(float(np.sqrt((seg ** 2).mean())) if len(seg) else 0.0)
    env = np.array(env)
    ref = np.percentile(env[env > 0], 90) if (env > 0).any() else 1
    env = np.clip(env / max(ref, 1e-6), 0, 1)
    out, acc = [], 0.0
    for e in env:
        acc = acc * 0.6 + e * 0.4
        out.append(round(acc, 3))
    return out


def plan(ep, voices):
    specs, se, waves = [], [], []
    state, active, visible = {"L": None, "R": None}, None, False
    prev_telop_sp, prev_type = None, None
    seen_board, kv_count = {}, 0
    kv_total = sum(1 for s in ep["shots"] if s["type"] == "kv")
    T = 0.0
    for i, sh in enumerate(ep["shots"]):
        typ = "cutin" if sh.get("cutin") else sh["type"]
        v = read_wav(voices[str(i)]["wav"]) if str(i) in voices else np.zeros(0, np.float32)
        vlen = len(v) / SR
        lead = LEAD.get(typ, 0.0)
        dur = max(sh.get("dur", 0), MIN_DUR.get(typ, 1.6), lead + vlen + TAIL.get(typ, 0.5) if vlen else 0)
        frames = round(dur * FPS)
        dur = frames / FPS
        sp_ = {"idx": i, "type": typ, "sh": sh, "dur": dur, "frames": frames, "t0": T, "lead": lead, "vlen": vlen,
               "env": voice_env(v, lead, frames) if vlen else []}
        loc = []
        if typ in ("talk", "cutin"):
            side = CHARS[sh["sp"]]["side"]
            other = "R" if side == "L" else "L"
            slot = state[side]
            old = slot["img"] if slot else None
            if not visible or slot is None:
                mode = "enter"
            elif slot["char"] != sh["sp"]:
                mode = "swap"
            elif slot["img"] != sh["img"]:
                mode = "expr"
            else:
                mode = "same"
            sp_.update(spk_mode=mode, old=old, grow=mode in ("expr", "same") and active != side)
            if state[other]:
                sp_["lis"] = state[other]["img"]
                sp_["lis_mode"] = "fadein" if not visible else ("shrink" if active == other else "static")
            if sp_["grow"] and mode == "expr":
                sp_["spk_mode"] = "grow"
            state[side] = {"char": sh["sp"], "img": sh["img"]}
            active = side
            if typ == "talk":
                if mode in ("enter", "swap"):
                    loc.append((0.02 if mode == "enter" else 0.12, "pop"))
                if sh.get("fx") == "surprise":
                    loc.append((0.03, "surprise"))
                if sh.get("fx") == "impact":
                    loc.append((0.0, "impact"))
            else:
                loc += [(0.0, "shing"), (0.25, "impact")]
            visible = typ == "talk"
        else:
            visible = False
        if typ == "chapter":
            state, active = {"L": None, "R": None}, None
            loc += [(0.0, "whoosh"), (0.25, "taiko")]
        if typ in TELOP_TYPES:
            sp_["telop_in"] = prev_type not in TELOP_TYPES
            sp_["name_wipe"] = sp_["telop_in"] or prev_telop_sp != sh["sp"]
            prev_telop_sp = sh["sp"]
        else:
            prev_telop_sp = None
        if typ == "board":
            sp_["first"] = sh["heading"] not in seen_board
            sp_["prev_hl"] = seen_board.get(sh["heading"])
            seen_board[sh["heading"]] = sh["hl"]
            loc.append((0.0, "whoosh_s"))
            n = len(sh["items"])
            if sp_["first"]:
                for k in range(n):
                    loc.append((lead + vlen * 0.75 * k / n if sh["hl"] < 0 else 0.25 + 0.08 * k, "pop_s"))
        if typ == "list":
            if sh.get("mode") == "build":
                loc += [(0.35 + k * 0.09, "tick") for k in range(16)]
                loc.append((0.35 + 32 * 0.045 + 0.15, "stamp"))
            else:
                for k in range(len(sh.get("scan", []))):
                    loc.append((lead + vlen * 0.85 * (k + 0.2) / len(sh["scan"]), "pop_s"))
        if typ == "mail":
            loc.append((0.1, "chime"))
        if typ == "card":
            prev_n = None
            for f in range(int(0.9 * FPS)):
                n_ = card_number(f / FPS)
                if n_ != prev_n:
                    loc.append((f / FPS, "tick"))
                    prev_n = n_
            loc.append((0.9, "impact"))
        if typ == "kv":
            kv_count += 1
            sp_["kv_first"], sp_["kv_last"] = kv_count == 1, kv_count == kv_total
            if sp_["kv_first"]:
                loc.append((0.0, "shing"))
        if typ == "summary":
            segs = [s for s in sh["text"].split("。") if s]
            total = sum(len(s) for s in segs)
            acc, seg_t = 0, []
            for s in segs:
                seg_t.append(lead + vlen * acc / total)
                acc += len(s)
            sp_["seg_t"] = seg_t
            loc.append((0.3, "stamp"))
            loc += [(x, "pop_s") for x in seg_t[1:]]
        if typ == "cta":
            loc.append((0.05, "pop"))
        if typ == "next":
            loc += [(0.0, "whoosh"), (0.1, "taiko")]
        se += [(T + a, k) for a, k in loc]
        if vlen:
            waves.append((T + lead, v))
        specs.append(sp_)
        prev_type = typ
        T += dur
    return specs, se, waves, T


# ---------- 音 ----------

def _env(n, rate):
    return np.exp(-np.arange(n) / SR * rate).astype(np.float32)


def _noise(n, seed=0):
    return np.random.default_rng(seed).standard_normal(n).astype(np.float32)


def _lp(x, k):
    return np.convolve(x, np.ones(k, np.float32) / k, "same")


def _reverb(x, amt=0.35):
    out = x.copy()
    for d, g in ((0.037, 0.5), (0.071, 0.35), (0.113, 0.25), (0.167, 0.15), (0.229, 0.08)):
        s = int(d * SR)
        out[s:] += x[:-s] * g * amt / 0.35
    return out


def _sine_sweep(f0, f1, dur, rate):
    n = int(dur * SR)
    f = np.linspace(f0, f1, n)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(n, rate)).astype(np.float32)


def taiko(dur=0.9, seed=0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 58 + 75 * np.exp(-t * 18)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)
    skin = _lp(_noise(n, seed), 6) * np.exp(-t * 45) * 0.5
    return (body + skin).astype(np.float32)


def make_sfx():
    s = {}
    s["pop"] = np.concatenate([_sine_sweep(520, 1150, 0.09, 30) * 0.45, np.zeros(200, np.float32)])
    s["pop_s"] = _sine_sweep(850, 1450, 0.06, 45) * 0.22
    s["surprise"] = np.concatenate([_sine_sweep(900, 1900, 0.05, 5), _sine_sweep(1900, 1900, 0.09, 40)]) * 0.25
    n = int(0.55 * SR)
    sw = np.sin(np.pi * np.clip(np.arange(n) / n, 0, 1)) ** 2
    s["whoosh"] = (_lp(_noise(n, 3), 24) * 2.2 - _lp(_noise(n, 3), 60) * 1.2) * sw * 0.35
    n2 = int(0.3 * SR)
    s["whoosh_s"] = _lp(_noise(n2, 4), 18) * 1.8 * (np.sin(np.pi * np.arange(n2) / n2) ** 2) * 0.22
    s["taiko"] = _reverb(taiko(1.2, 5)) * 0.85
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(40 + 50 * np.exp(-t * 12)) / SR) * np.exp(-t * 4.5)
    crack = _lp(_noise(n, 6), 3) * np.exp(-t * 28) * 0.5
    s["impact"] = _reverb((boom + crack).astype(np.float32)) * 0.8
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    ring = sum(np.sin(2 * np.pi * fr * t + k) * np.exp(-t * (2.5 + k * 1.2)) / (k + 1) for k, fr in enumerate([1830, 2690, 3940, 5270, 7180]))
    att = np.clip(t / 0.004, 0, 1)
    s["shing"] = (ring * att * 0.35 + _lp(_noise(n, 7), 2) * np.exp(-t * 30) * 0.15).astype(np.float32)
    n = int(0.03 * SR)
    s["tick"] = (np.sin(2 * np.pi * 2100 * np.arange(n) / SR) * _env(n, 220) * 0.22).astype(np.float32)
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    s["stamp"] = _reverb((np.sin(2 * np.pi * 85 * t) * np.exp(-t * 14) * 0.7 + _lp(_noise(n, 8), 4) * np.exp(-t * 45) * 0.4).astype(np.float32)) * 0.7
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    tone = lambda f: np.sin(2 * np.pi * f * t) * np.exp(-t * 5) + 0.3 * np.sin(4 * np.pi * f * t) * np.exp(-t * 8)
    ch = np.zeros(n + int(0.12 * SR), np.float32)
    ch[:n] += tone(1318.5)
    ch[int(0.12 * SR):] += tone(987.8)
    s["chime"] = ch * 0.18
    return s


def ks(freq, dur, decay=0.996, seed=0):
    N = max(2, int(round(SR / freq)))
    n = int(dur * SR)
    buf = np.zeros(n + N + 1, np.float32)
    buf[1:N + 1] = _lp(np.random.default_rng(seed).uniform(-1, 1, N).astype(np.float32), 3)
    i = N + 1
    while i < n + N + 1:
        j = min(i + N, n + N + 1)
        buf[i:j] = decay * 0.5 * (buf[i - N:j - N] + buf[i - N - 1:j - N - 1])
        i = j
    out = buf[1:n + 1]
    out[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return out


def make_bgm(total):
    """和の仮BGM。太鼓・撥弦・持続音を手続き的に鳴らす。本番は権利処理済みの曲に差し替える。"""
    beat = 60 / 92
    n = int(total * SR) + SR * 2
    out = np.zeros(n, np.float32)
    D4, Eb4, G4, A4, Bb4, D5, Eb5 = 293.66, 311.13, 392.0, 440.0, 466.16, 587.33, 622.25
    notes = {f: ks(f, 1.6, 0.993, int(f)) for f in (D4, Eb4, G4, A4, Bb4, D5, Eb5)}
    bass = {f: ks(f, 2.2, 0.997, int(f)) for f in (73.42, 98.0, 110.0)}
    drum, rim = taiko(0.9, 1), (_lp(_noise(int(0.05 * SR), 2), 2) - _lp(_noise(int(0.05 * SR), 2), 8)) * _env(int(0.05 * SR), 90)
    shaker = (_noise(int(0.06 * SR), 9) - _lp(_noise(int(0.06 * SR), 9), 4)) * _env(int(0.06 * SR), 70)
    riffA = {0: D5, 2: A4, 3: Bb4, 4: A4, 6: G4, 8: A4, 10: Eb5, 11: D5, 14: A4}
    riffB = {0: D5, 3: A4, 4: G4, 6: Eb4, 8: D4, 12: G4, 13: A4}
    bass_line = [73.42, 73.42, 98.0, 110.0]

    def put(sig, t, g):
        s = int(t * SR)
        if s >= n:
            return
        e = min(n, s + len(sig))
        out[s:e] += sig[: e - s] * g

    bars = int(total / (beat * 4)) + 2
    for b in range(bars):
        t0 = b * beat * 4
        section = (b // 8) % 2
        put(drum, t0, 0.55)
        put(drum, t0 + beat * 2, 0.4)
        if section:
            put(drum, t0 + beat * 3.5, 0.28)
        put(rim, t0 + beat * 3, 0.12)
        for k in range(8):
            put(shaker, t0 + k * beat / 2, 0.04 if k % 2 else 0.025)
        put(bass[bass_line[b % 4]], t0, 0.32)
        put(bass[bass_line[b % 4]], t0 + beat * 2.5, 0.2)
        riff = riffA if (b % 2 == 0) else riffB
        if section or b % 4 < 2:
            for slot, f in riff.items():
                if slot < 8:
                    put(notes[f], t0 + slot * beat / 2, 0.16)
    t = np.arange(n) / SR
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * t / 7.3)
    pad = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((146.83, 0.5), (220.0, 0.35), (293.66, 0.15))) * lfo
    out += pad.astype(np.float32) * 0.05
    return out[: int(total * SR)]


def mix_audio(se, waves, total, specs):
    n = int(round(total * SR))
    voice = np.zeros(n, np.float32)
    for t, v in waves:
        s = int(t * SR)
        e = min(n, s + len(v))
        voice[s:e] += v[: e - s]
    sfx = make_sfx()
    fx = np.zeros(n, np.float32)
    for t, k in se:
        s = int(t * SR)
        e = min(n, s + len(sfx[k]))
        fx[s:e] += sfx[k][: e - s]
    bgm = make_bgm(total)
    bgm = bgm / (np.sqrt((bgm ** 2).mean()) + 1e-9) * 0.03
    act = (np.abs(voice) > 0.01).astype(np.float32)
    k = int(0.25 * SR)
    act = np.clip(np.convolve(act, np.ones(k, np.float32) / k * 6, "same"), 0, 1)
    gain = 1 - 0.55 * act
    for sp_ in specs:
        if sp_["type"] == "cutin":
            s, e = int((sp_["t0"] + 0.2) * SR), int((sp_["t0"] + 1.0) * SR)
            gain[s:e] *= 0.25
    mix = voice + fx * 0.6 + bgm * gain
    peak = np.abs(mix).max()
    if peak > 0.98:
        mix = np.tanh(mix / peak * 1.4) / np.tanh(1.4) * 0.97
    return mix


# ---------- 書き出し ----------

_CTX = None


def _init(assets):
    global _CTX
    _CTX = Ctx(assets)


def render_spec(args):
    sp_, path = args
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-threads", "2", path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in range(sp_["frames"]):
        t = f / FPS
        frame = DRAW[sp_["type"]](_CTX, sp_, t, sp_["t0"] + t)
        p.stdin.write(frame.convert("RGB").tobytes())
    p.stdin.close()
    assert p.wait() == 0
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--assets", required=True)
    ap.add_argument("--voices", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--stills", nargs="*")
    ap.add_argument("--only", type=int, nargs="*")
    ap.add_argument("--workers", type=int, default=3)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    ep = json.load(open(a.episode, encoding="utf-8"))
    voices = json.load(open(os.path.join(a.voices, "voices.json")))
    specs, se, waves, total = plan(ep, voices)

    if a.stills:
        _init(a.assets)
        for item in a.stills:
            i, t = item.split(":")
            sp_ = specs[int(i)]
            t = min(float(t), sp_["dur"] - 1 / FPS)
            DRAW[sp_["type"]](_CTX, sp_, t, sp_["t0"] + t).save(f"{a.out}/still_{int(i):03d}_{t:.2f}.png")
        return

    targets = [s for s in specs if a.only is None or s["idx"] in a.only]
    jobs = [(s, f"{a.out}/shot{s['idx']:03d}.mp4") for s in targets]
    with ProcessPoolExecutor(a.workers, initializer=_init, initargs=(a.assets,)) as ex:
        for k, path in enumerate(ex.map(render_spec, jobs)):
            print(f"[{k + 1}/{len(jobs)}] {os.path.basename(path)}", flush=True)

    if a.only is not None:
        t_off = targets[0]["t0"]
        sub_total = sum(s["dur"] for s in targets)
        idxs = {s["idx"] for s in targets}
        se = [(t - t_off, k) for t, k in se if any(s["t0"] <= t < s["t0"] + s["dur"] for s in targets)]
        waves = [(t - t_off, v) for (t, v), s in zip(waves, [s for s in specs if s["vlen"]]) if s["idx"] in idxs]
        total, specs = sub_total, [dict(s, t0=s["t0"] - t_off) for s in targets]
    with open(f"{a.out}/list.txt", "w") as f:
        f.writelines(f"file '{os.path.abspath(p)}'\n" for _, p in jobs)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{a.out}/list.txt",
                    "-c", "copy", f"{a.out}/video_only.mp4"], check=True)
    mix = mix_audio(se, waves, total, specs)
    with wave.open(f"{a.out}/mix.wav", "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
    name = "episode.mp4" if a.only is None else "partial.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{a.out}/video_only.mp4", "-i", f"{a.out}/mix.wav",
                    "-af", "loudnorm=I=-15:TP=-1.5:LRA=11", "-ar", str(SR), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-shortest", f"{a.out}/{name}"], check=True)
    with open(f"{a.out}/timeline.txt", "w", encoding="utf-8") as f:
        for s in specs:
            t = s["t0"]
            f.write(f"{int(t // 60)}:{t % 60:05.2f}  #{s['idx']:02d} {s['type']:<8}{CHARS.get(s['sh'].get('sp'), {}).get('name', '')}  {s['sh'].get('text', '')}\n")
    print(f"total {total:.1f}s -> {a.out}/{name}")


if __name__ == "__main__":
    main()
