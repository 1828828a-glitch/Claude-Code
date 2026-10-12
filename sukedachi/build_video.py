"""宣伝助太刀の動画を、episodeのJSONと合成済みの台詞音声から書き出す（モーションコミック版）。

使い方:
  python build_video.py episode01.json --assets <素材> --voices <音声> --out <出力>
  --stills 5:0.4 21:1.0   指定カットの指定秒だけ静止画で書き出して確認する
  --only 5 21             指定カットだけ動画にする（音声つき）

素材フォルダに置くもの:
  kudo.png / naka.png / kv.png  キャラシートとキービジュアル（4倍アップスケール済み）
  NotoSansJP-500.ttf / NotoSansJP-900.ttf / YujiBoku.ttf
  isnetis.onnx                  skytnt/anime-seg（立ち絵の切り抜きに使う。結果は cutouts/ に保存）
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
WW, WH = 2112, 1188  # カメラが動く余白を含めた舞台の大きさ
SCALE = 4  # アップスケール倍率。CROPSは元画像の座標

CROPS = {
    "k_n1": ("kudo", (325, 15, 505, 245)), "k_n2": ("kudo", (500, 15, 722, 245)),
    "k_think": ("kudo", (725, 15, 900, 245)), "k_smile": ("kudo", (1100, 15, 1306, 245)),
    "k_laugh": ("kudo", (1310, 15, 1530, 245)), "k_pc": ("kudo", (345, 255, 640, 497)),
    "k_phone": ("kudo", (640, 255, 842, 497)), "k_glass": ("kudo", (845, 255, 1077, 497)),
    "k_rub": ("kudo", (1080, 255, 1282, 497)), "k_surp": ("kudo", (1285, 255, 1530, 497)),
    "k_type": ("kudo", (1065, 515, 1330, 750)), "k_up": ("kudo", (1372, 770, 1530, 1000)),
    "n_basic": ("naka", (728, 428, 878, 626)), "n_laugh": ("naka", (884, 425, 1034, 628)),
    "n_think": ("naka", (1038, 425, 1188, 628)), "n_angry": ("naka", (1191, 425, 1342, 628)),
    "n_phone": ("naka", (812, 725, 1056, 930)),
}
DEFAULT_IMG = {"K": "k_n2", "N": "n_basic", "NA": "na"}

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
BREAK_AFTER = "、。？！…」　"

# 舞台上の立ち位置（舞台座標）と大きさ
X_POS = {"L": {"med": 660, "two": 600, "close": 760, "lis": 330},
         "R": {"med": 1450, "two": 1510, "close": 1350, "lis": 1790}}
STAND_H = {"med": 1080, "two": 960, "close": 1560, "lis": 860}
STAND_DROP = {"med": 40, "two": 120, "close": 560, "lis": 40}
CAMERA = {"med": (1.0, 1.04), "two": (1.0, 1.03), "close": (1.02, 1.08)}
OTO_COLOR = {"impact": (232, 64, 52), "surprise": (250, 214, 92), "sweat": (170, 214, 244), "laugh": (250, 170, 70)}

LEAD = {"talk": 0.25, "cutin": 0.45, "board": 0.35, "list": 0.3, "mail": 0.6, "kv": 0.6, "summary": 0.5, "cta": 0.5, "next": 0.7}
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


# ---------- 切り抜き ----------

def segment(sess, im):
    from scipy import ndimage
    s = 1024
    w, h = im.size
    r = s / max(w, h)
    rs = im.resize((max(1, int(w * r)), max(1, int(h * r))), Image.LANCZOS)
    canvas = np.zeros((s, s, 3), np.float32)
    ph, pw = (s - rs.height) // 2, (s - rs.width) // 2
    canvas[ph:ph + rs.height, pw:pw + rs.width] = np.asarray(rs, np.float32) / 255
    m = sess.run(None, {sess.get_inputs()[0].name: canvas.transpose(2, 0, 1)[None]})[0][0, 0]
    m = np.clip(m[ph:ph + rs.height, pw:pw + rs.width], 0, 1)
    lab, n = ndimage.label(m > 0.5)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(m), lab, range(1, n + 1))
        keep = ndimage.binary_dilation(lab == int(np.argmax(sizes)) + 1, iterations=4)
        m = m * keep
    a = Image.fromarray((m * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)
    out = im.convert("RGBA")
    out.putalpha(a)
    return out.crop(a.point(lambda v: 255 if v > 24 else 0).getbbox())


def prepare_cutouts(assets):
    folder = os.path.join(assets, "cutouts")
    os.makedirs(folder, exist_ok=True)
    todo = [k for k in CROPS if not os.path.exists(os.path.join(folder, k + ".png"))]
    if not todo:
        return
    import onnxruntime as ort
    sess = ort.InferenceSession(os.path.join(assets, "isnetis.onnx"), providers=["CPUExecutionProvider"])
    sheets = {k: Image.open(os.path.join(assets, k + ".png")).convert("RGB") for k in ("kudo", "naka")}
    for k in todo:
        sheet, box = CROPS[k]
        segment(sess, sheets[sheet].crop(tuple(v * SCALE for v in box))).save(os.path.join(folder, k + ".png"))
        print("cutout", k, flush=True)


# ---------- 背景 ----------

def scene_office(w, h, seed=3):
    rng = np.random.default_rng(seed)
    ys = np.linspace(0, 1, h)
    top, mid, hor = np.array([8, 12, 30]), np.array([28, 30, 72]), np.array([96, 62, 112])
    u = np.clip(ys / 0.62, 0, 1)[:, None]
    col = np.where(u < 0.6, top + (mid - top) * (u / 0.6), mid + (hor - mid) * ((u - 0.6) / 0.4))
    sky = np.repeat(col[:, None, :], w, axis=1)
    im = Image.fromarray(sky.astype(np.uint8))
    d = ImageDraw.Draw(im)
    for _ in range(90):
        x, y = rng.uniform(0, w), rng.uniform(0, h * 0.35)
        c = int(rng.uniform(120, 230))
        d.point((x, y), fill=(c, c, min(255, c + 20)))
    lights = Image.new("RGB", (w, h), (0, 0, 0))
    ld = ImageDraw.Draw(lights)
    horizon = int(h * 0.66)
    for layer, (hmin, hmax, colr, lit, wcol) in enumerate([
            (0.10, 0.28, (44, 46, 86), 0.10, (130, 130, 190)),
            (0.18, 0.45, (24, 26, 50), 0.28, (255, 208, 120))]):
        x = -20
        while x < w:
            bw = int(rng.uniform(60, 170))
            bh = int(h * rng.uniform(hmin, hmax))
            d.rectangle([x, horizon - bh, x + bw, horizon + 40], fill=colr)
            for wy in range(horizon - bh + 14, horizon - 6, 18):
                for wx in range(x + 8, x + bw - 8, 14):
                    if rng.random() < lit:
                        d.rectangle([wx, wy, wx + 6, wy + 9], fill=wcol)
                        ld.rectangle([wx, wy, wx + 6, wy + 9], fill=wcol)
            if layer == 1 and rng.random() < 0.15:
                d.line([(x + bw // 2, horizon - bh), (x + bw // 2, horizon - bh - 40)], fill=colr, width=4)
                d.ellipse([x + bw // 2 - 4, horizon - bh - 46, x + bw // 2 + 4, horizon - bh - 38], fill=(230, 60, 60))
                ld.ellipse([x + bw // 2 - 6, horizon - bh - 48, x + bw // 2 + 6, horizon - bh - 36], fill=(230, 60, 60))
            x += bw + int(rng.uniform(4, 30))
    im = ImageChops.add(im, lights.filter(ImageFilter.GaussianBlur(9)))
    d = ImageDraw.Draw(im)
    frame = (14, 16, 24)
    for mx in range(-60, w + 520, 520):
        d.rectangle([mx, 0, mx + 26, h], fill=frame)
        d.line([(mx + 26, 0), (mx + 26, h)], fill=(44, 48, 64), width=2)
    d.rectangle([0, int(h * 0.15), w, int(h * 0.15) + 18], fill=frame)
    sill = int(h * 0.70)
    for y in range(sill, h):
        c = int(22 - 8 * (y - sill) / (h - sill))
        d.line([(0, y), (w, y)], fill=(c, c + 1, c + 7))
    d.rectangle([0, sill, w, sill + 10], fill=(56, 60, 76))
    pot_x = int(w * 0.06)
    for k in range(9):
        a = math.radians(200 + k * 17)
        d.ellipse([pot_x + 60 + math.cos(a) * 120 - 40, sill - 140 + math.sin(a) * 120 - 18,
                   pot_x + 60 + math.cos(a) * 120 + 40, sill - 140 + math.sin(a) * 120 + 18], fill=(20, 40, 34))
    d.polygon([(pot_x, sill - 10), (pot_x + 120, sill - 10), (pot_x + 100, sill + 90), (pot_x + 20, sill + 90)], fill=(30, 30, 36))
    glow2 = Image.new("RGB", (w, h), (0, 0, 0))
    ImageDraw.Draw(glow2).rectangle([int(w * 0.80), sill - 200, int(w * 0.95), sill - 40], fill=(40, 90, 150))
    im = ImageChops.add(im, glow2.filter(ImageFilter.GaussianBlur(60)))
    vig = Image.new("L", (w, h), 0)
    ImageDraw.Draw(vig).ellipse([-w * 0.2, -h * 0.3, w * 1.2, h * 1.3], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(160))
    return Image.composite(im, ImageEnhance.Brightness(im).enhance(0.45), vig)


def scene_meeting(w, h, seed=5):
    rng = np.random.default_rng(seed)
    im = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        u = y / h
        d.line([(0, y), (w, y)], fill=(int(214 - 30 * u), int(206 - 32 * u), int(190 - 36 * u)))
    bx0, by0, bx1, by1 = int(w * 0.08), int(h * 0.12), int(w * 0.60), int(h * 0.66)
    d.rectangle([bx0 - 14, by0 - 14, bx1 + 14, by1 + 14], fill=(170, 174, 182))
    d.rectangle([bx0, by0, bx1, by1], fill=(246, 247, 248))
    d.rectangle([bx0, by1 + 14, bx1, by1 + 30], fill=(150, 154, 162))
    for k in range(7):
        y = by0 + 60 + k * 62
        x = bx0 + 60 + rng.uniform(0, 80)
        d.line([(x, y), (x + rng.uniform(260, 620), y + rng.uniform(-6, 6))], fill=(186, 192, 204), width=5)
    for k, c in enumerate([(250, 226, 120), (250, 180, 190), (170, 220, 250), (250, 226, 120)]):
        x = bx1 - 380 + (k % 2) * 160 + rng.uniform(-10, 10)
        y = by0 + 70 + (k // 2) * 160
        d.rectangle([x, y, x + 130, y + 130], fill=c)
    wx0 = int(w * 0.66)
    d.rectangle([wx0, int(h * 0.08), w - 40, int(h * 0.72)], fill=(236, 232, 214))
    for y in range(int(h * 0.08), int(h * 0.72), 26):
        d.rectangle([wx0, y + 16, w - 40, y + 25], fill=(204, 196, 176))
    light = Image.new("L", (w, h), 0)
    ImageDraw.Draw(light).polygon([(wx0, int(h * 0.1)), (w, int(h * 0.1)), (int(w * 0.55), h), (int(w * 0.2), h)], fill=60)
    im = Image.composite(Image.new("RGB", (w, h), (255, 248, 224)), im, light.filter(ImageFilter.GaussianBlur(40)))
    d = ImageDraw.Draw(im)
    ty = int(h * 0.80)
    for y in range(ty, h, 6):
        k = (y - ty) / (h - ty)
        d.line([(0, y), (w, y)], fill=(int(110 - 30 * k), int(80 - 24 * k), int(56 - 18 * k)), width=6)
    d.rectangle([0, ty, w, ty + 12], fill=(140, 106, 78))
    return im


SCENES = {"office": scene_office, "meeting": scene_meeting}


# ---------- 素材 ----------

class Ctx:
    def __init__(self, assets):
        self.assets = assets
        self.fonts = {}
        self.cache = {}
        self.kv = Image.open(os.path.join(assets, "kv.png")).convert("RGB").resize((2304, 1296), Image.LANCZOS)
        self.header = make_header(self)

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

    def world(self, scene, blur):
        def make():
            im = self.memo(("scene", scene), lambda: SCENES[scene](WW, WH))
            return im.filter(ImageFilter.GaussianBlur(blur)) if blur else im
        return self.memo(("world", scene, blur), make)

    def backdrop(self, scene, level=0.55):
        """図解や一覧の後ろに敷く、ぼかして暗くした背景。"""
        def make():
            im = self.world(scene, 10).resize((W, H), Image.BILINEAR)
            return ImageEnhance.Brightness(im).enhance(level)
        return self.memo(("backdrop", scene, level), make)

    def cutout(self, key):
        if key == "na":
            return self.memo(("cut", key), lambda: nakano_silhouette(self))
        return self.memo(("cut", key), lambda: Image.open(os.path.join(self.assets, "cutouts", key + ".png")).convert("RGBA"))

    def stand(self, key, h, dark=False):
        """白フチと影をつけた立ち絵。返り値は (画像, 頭の中心x, 口元y)。"""
        def make():
            if dark:
                im, hx, my = self.stand(key, h)
                r, g, b, a = im.split()
                rgb = ImageEnhance.Brightness(Image.merge("RGB", (r, g, b))).enhance(0.55).filter(ImageFilter.GaussianBlur(1.6))
                out = rgb.convert("RGBA")
                out.putalpha(a)
                return out, hx, my
            cut = self.cutout(key)
            s = h / cut.height
            cut = cut.resize((max(1, int(cut.width * s)), h), Image.LANCZOS)
            r = max(5, h // 120)
            pad = r + 30
            a = Image.new("L", (cut.width + pad * 2, cut.height + pad * 2), 0)
            a.paste(cut.split()[3], (pad, pad))
            fuchi = a.filter(ImageFilter.GaussianBlur(r / 1.6)).point(lambda v: 255 if v > 10 else 0).filter(ImageFilter.GaussianBlur(1))
            out = Image.new("RGBA", a.size, (0, 0, 0, 0))
            shadow = Image.new("RGBA", a.size, (0, 0, 0, 0))
            shadow.paste((0, 0, 0, 110), (16, 10), fuchi)
            out.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(12)))
            white = Image.new("RGBA", a.size, (255, 255, 255, 0))
            white.putalpha(fuchi)
            out.alpha_composite(white)
            out.alpha_composite(cut, (pad, pad))
            arr = np.asarray(cut.split()[3]) > 40
            rows = np.where(arr.any(axis=1))[0]
            top = rows[0]
            band = arr[top: top + max(4, int(h * 0.22))]
            xs = np.where(band.any(axis=0))[0]
            hx = pad + (xs.mean() if len(xs) else cut.width / 2)
            my = pad + top + h * 0.24
            return out, hx, my
        return self.memo(("stand", key, h, dark), make)

    def speedlines(self, variant):
        def make():
            rng = np.random.default_rng(variant + 11)
            im = Image.new("RGBA", (WW, WH), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            cx, cy = WW / 2, WH * 0.42
            for _ in range(140):
                a = rng.uniform(0, 2 * math.pi)
                r0 = rng.uniform(420, 620)
                wdt = rng.uniform(0.004, 0.012)
                pts = [(cx + math.cos(a) * r0, cy + math.sin(a) * r0),
                       (cx + math.cos(a - wdt) * 1700, cy + math.sin(a - wdt) * 1700),
                       (cx + math.cos(a + wdt) * 1700, cy + math.sin(a + wdt) * 1700)]
                d.polygon(pts, fill=(255, 255, 255, int(rng.uniform(70, 150))))
            return im
        return self.memo(("speed", variant), make)


def make_header(ctx):
    im = Image.new("RGBA", (W, 90), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(0, 24), (560, 24), (536, 74), (0, 74)], fill=INK + (200,))
    d.text((34, 49), "企画・宣伝協同組合 ／ 宣伝助太刀 第一話", font=ctx.font("b", 26), fill=CREAM, anchor="lm")
    d.rectangle([W - 330, 30, W - 34, 70], fill=RED + (220,))
    d.text((W - 182, 50), "※架空のモデルケースです", font=ctx.font("b", 23), fill="white", anchor="mm")
    return im


def nakano_silhouette(ctx):
    w, h = 900, 1100
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    body = (22, 52, 48, 255)
    d.ellipse([w / 2 - 190, 60, w / 2 + 190, 470], fill=body)
    d.rounded_rectangle([w / 2 - 400, 500, w / 2 + 400, h + 300], radius=300, fill=body)
    d.polygon([(w / 2 - 90, 420), (w / 2 + 90, 420), (w / 2 + 110, 540), (w / 2 - 110, 540)], fill=body)
    d.text((w / 2, 770), "中野", font=ctx.font("b", 180), fill=(220, 236, 230, 255), anchor="mm")
    d.text((w / 2, 920), "立ち絵 差し替え予定", font=ctx.font("r", 54), fill=(190, 214, 206, 255), anchor="mm")
    return im


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
        if ch in BREAK_AFTER:
            tokens.append(cur)
            cur = ""
    if cur:
        tokens.append(cur)
    merged = []
    for tk in tokens:
        if merged and all(c in BREAK_AFTER for c in tk):
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


# ---------- 吹き出し ----------

def make_bubble(ctx, text, kind, box_pos, target, max_w=700, sizes=(50, 46, 42), max_lines=4):
    """吹き出し本体としっぽを1枚にまとめる。box_pos は ('L'|'R'|'free', x, y)。"""
    f, lines = fit_lines(ctx, text, "b", sizes, max_w, max_lines)
    lh = int(f.size * 1.38)
    tw = max(f.getlength(ln) for ln in lines)
    th = lh * len(lines)
    bw, bh = int(tw * 1.28 + 80), int(th * 1.3 + 70)
    mode, ax, ay = box_pos
    x0 = ax if mode == "L" else ax - bw if mode == "R" else ax - bw / 2
    x0 = int(min(max(x0, 30), W - bw - 30))
    y0 = int(min(max(ay, 92), H - bh - 30))
    cx, cy = x0 + bw / 2, y0 + bh / 2
    pad = 90
    lx0, ly0 = min(x0, target[0]) - pad, min(y0, target[1]) - pad
    lx1, ly1 = max(x0 + bw, target[0]) + pad, max(y0 + bh, target[1]) + pad
    size = (int(lx1 - lx0), int(ly1 - ly0))
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    ox, oy = cx - lx0, cy - ly0
    rx, ry = bw / 2, bh / 2
    if kind == "spike":
        rng = np.random.default_rng(len(text))
        pts = []
        n = 26
        for k in range(n * 2):
            a = math.pi * k / n
            rr = (1.18 if k % 2 == 0 else 0.98) * rng.uniform(0.96, 1.04)
            pts.append((ox + math.cos(a) * rx * rr, oy + math.sin(a) * ry * rr))
        d.polygon(pts, fill=255)
    elif kind == "cloud":
        d.ellipse([ox - rx, oy - ry, ox + rx, oy + ry], fill=255)
        for k in range(14):
            a = 2 * math.pi * k / 14
            px, py = ox + math.cos(a) * rx * 0.92, oy + math.sin(a) * ry * 0.92
            r = min(rx, ry) * 0.36
            d.ellipse([px - r, py - r, px + r, py + r], fill=255)
    else:
        d.ellipse([ox - rx, oy - ry, ox + rx, oy + ry], fill=255)
    tx, ty = target[0] - lx0, target[1] - ly0
    ang = math.atan2(ty - oy, tx - ox)
    edge_x, edge_y = ox + math.cos(ang) * rx, oy + math.sin(ang) * ry
    if kind == "cloud":
        for u, r in ((0.35, 22), (0.6, 15), (0.8, 10)):
            px, py = lerp(edge_x, tx, u), lerp(edge_y, ty, u)
            d.ellipse([px - r, py - r, px + r, py + r], fill=255)
    else:
        spread = 0.16
        b1 = (ox + math.cos(ang - spread) * rx * 0.86, oy + math.sin(ang - spread) * ry * 0.86)
        b2 = (ox + math.cos(ang + spread) * rx * 0.86, oy + math.sin(ang + spread) * ry * 0.86)
        tip = (lerp(edge_x, tx, 0.8), lerp(edge_y, ty, 0.8))
        d.polygon([b1, b2, tip], fill=255)
    edge = mask.filter(ImageFilter.GaussianBlur(3.2)).point(lambda v: 255 if v > 6 else 0).filter(ImageFilter.GaussianBlur(0.8))
    im = Image.new("RGBA", size, INK + (0,))
    im.putalpha(edge)
    white = Image.new("RGBA", size, (255, 255, 255, 0))
    white.putalpha(mask.filter(ImageFilter.GaussianBlur(0.8)))
    im.alpha_composite(white)
    return {"img": im, "x": int(lx0), "y": int(ly0), "cx": cx, "cy": cy, "font": f, "lines": lines, "lh": lh, "tw": tw, "th": th}


def draw_bubble(frame, b, t, text_t0, text_dur, pop_t=0.03):
    if t < pop_t:
        return
    k = ease_back((t - pop_t) / 0.2)
    im = b["img"]
    if k < 0.999 and t - pop_t < 0.2:
        s = lerp(0.55, 1, k)
        im = fade(scaled(im, s), clamp01((t - pop_t) / 0.08))
        x = int(b["cx"] + (b["x"] - b["cx"]) * s)
        y = int(b["cy"] + (b["y"] - b["cy"]) * s)
        frame.paste(im, (x, y), im)
        return
    frame.paste(im, (b["x"], b["y"]), im)
    total = sum(len(ln) for ln in b["lines"])
    shown = int(round(total * clamp01((t - text_t0) / max(0.4, text_dur)))) if text_dur else total
    d = ImageDraw.Draw(frame)
    x0 = b["cx"] - b["tw"] / 2
    y0 = b["cy"] - b["th"] / 2 + b["lh"] / 2
    for i, ln in enumerate(b["lines"]):
        part = ln[: max(0, shown)]
        shown -= len(ln)
        if part:
            d.text((x0, y0 + i * b["lh"]), part, font=b["font"], fill=INK, anchor="lm")


def draw_oto(ctx, frame, text, kind, x, y, t, start=0.04):
    if t < start:
        return
    col = OTO_COLOR.get(kind, (255, 255, 255))
    im = ctx.memo(("oto", text, kind), lambda: text_image(ctx, text, "brush", 150, col, 12, INK).rotate(8, expand=True, resample=Image.BICUBIC))
    k = ease_out((t - start) / 0.14)
    jit = 4 * math.sin(t * 40) if t - start < 0.5 else 0
    paste_c(frame, fade(scaled(im, 1.7 - 0.7 * k), k), x + jit, y)


# ---------- 会話 ----------

def cam_center(side, shot):
    if shot == "two":
        return WW / 2
    return lerp(WW / 2, X_POS[side][shot], 0.28)


def stage_layout(ctx, sp_):
    """このカットの口元の位置と吹き出しを決める（カット内で固定）。"""
    def make():
        sh = sp_["sh"]
        side = CHARS[sh["sp"]]["side"]
        shot = sp_["shot"]
        im, hx, my = ctx.stand(sh["img"], STAND_H[shot])
        x = X_POS[side][shot]
        top = WH + STAND_DROP[shot] - im.height
        z = sum(CAMERA[shot]) / 2
        vw, vh = WW / z, WH / z
        cx = min(max(cam_center(side, shot), vw / 2), WW - vw / 2)
        mw = (x - im.width / 2 + hx, top + my)
        mouth = ((mw[0] - (cx - vw / 2)) * W / vw, (mw[1] - (WH / 2 - vh / 2)) * H / vh)
        kind = sh.get("bubble") or ("spike" if sh.get("fx") == "impact" else "cloud" if sh.get("silent") else "round")
        gap = 260 if shot == "close" else 210
        if shot == "two":
            pos = ("free", W / 2, 96)
        else:
            pos = ("L", mouth[0] + gap, 110) if side == "L" else ("R", mouth[0] - gap, 110)
        target = (mouth[0] + (110 if side == "L" else -110), mouth[1] - 20)
        b = make_bubble(ctx, "……" if sh.get("silent") else sh["text"], kind, pos, target, max_w=820, max_lines=3)
        return {"bubble": b, "mouth": mouth}
    return ctx.memo(("layout", sp_["idx"]), make)


def paste_stand(world, im, x, bottom):
    world.paste(im, (int(x - im.width / 2), int(bottom - im.height)), im)


def draw_talk(ctx, sp_, t, T):
    sh = sp_["sh"]
    side = CHARS[sh["sp"]]["side"]
    other = "R" if side == "L" else "L"
    shot = sp_["shot"]
    world = ctx.world(sp_["scene"], 9 if shot == "close" else 2).copy()
    f = min(int(t * FPS), len(sp_["env"]) - 1) if sp_["env"] else 0
    env = sp_["env"][f] if sp_["env"] else 0
    if sp_.get("lis") and shot != "close":
        two = shot == "two"
        lim = ctx.stand(sp_["lis"], STAND_H["two" if two else "lis"], dark=not two)[0]
        lx = X_POS[other]["two" if two else "lis"]
        if sp_["lis_mode"] == "slidein":
            lx += (-1 if other == "L" else 1) * 900 * (1 - ease_out(t / 0.32))
        paste_stand(world, lim, lx, WH + STAND_DROP["two" if two else "lis"])
    if shot == "close":
        sl = ctx.speedlines(int(t * 12) % 3)
        world.paste(sl, (0, 0), sl)
    im = ctx.stand(sh["img"], STAND_H[shot])[0]
    x = X_POS[side][shot]
    bottom = WH + STAND_DROP[shot] - 6 * env
    if sh.get("fx") == "surprise":
        bottom -= 50 * math.sin(math.pi * clamp01(t / 0.3))
    mode = sp_["spk_mode"]
    if mode in ("enter", "swap"):
        if mode == "swap" and t < 0.2:
            paste_stand(world, ctx.stand(sp_["old"], STAND_H[shot])[0], x, bottom + 900 * ease_in(t / 0.2))
        u = ease_back((t - (0.1 if mode == "swap" else 0)) / 0.34)
        if u > 0:
            paste_stand(world, im, x, bottom + 700 * (1 - u))
    elif mode == "expr" and t < 0.16:
        paste_stand(world, ctx.stand(sp_["old"], STAND_H[shot])[0], x, bottom)
        paste_stand(world, fade(im, ease_out(t / 0.16)), x, bottom)
    else:
        paste_stand(world, im, x, bottom)

    z0, z1 = CAMERA[shot]
    z = lerp(z0, z1, ease_io(t / sp_["dur"]))
    if sh.get("fx") == "impact":
        z += 0.1 * (1 - ease_out(t / 0.25))
    whip = sp_.get("whip", 0)
    wu = 1 - ease_out(t / 0.24)
    vw, vh = WW / z, WH / z
    cx = cam_center(side, shot) + whip * 420 * wu
    cx = min(max(cx, vw / 2), WW - vw / 2)
    box = (int(cx - vw / 2), int(WH / 2 - vh / 2), int(cx + vw / 2), int(WH / 2 + vh / 2))
    frame = world.crop(box).resize((W, H), Image.BILINEAR)
    if whip and wu > 0.25:
        blur = frame.resize((W // 10, H), Image.BILINEAR).resize((W, H), Image.BILINEAR)
        frame = Image.blend(frame, blur, min(0.85, wu))

    lay = stage_layout(ctx, sp_)
    draw_bubble(frame, lay["bubble"], t, sp_["lead"], sp_["vlen"] * 0.72, pop_t=0.12 if mode in ("enter", "swap") else 0.04)
    if sh.get("oto"):
        mx, my = lay["mouth"]
        ox = mx - 330 if side == "L" else mx + 330
        draw_oto(ctx, frame, sh["oto"], sh.get("fx", "impact"), min(max(ox, 180), W - 180), max(my - 260, 200), t)
    frame.paste(ctx.header, (0, 0), ctx.header)
    if sh.get("fx") == "impact":
        frame = shake(frame, t, 0, 0.3, 16)
    return frame


def draw_cutin(ctx, sp_, t, T):
    sh = sp_["sh"]
    ch = CHARS[sh["sp"]]
    frame = ctx.backdrop(sp_["scene"], 0.32).copy()
    d = ImageDraw.Draw(frame)
    xo = -W * (1 - ease_out(t / 0.2))
    band = [(0 + xo, 300), (W + xo, 230), (W + xo, 820), (0 + xo, 890)]
    d.polygon(band, fill=ch["cut"])
    rng = np.random.default_rng(sp_["idx"])
    light = tuple(int(c + (255 - c) * 0.35) for c in ch["cut"])
    for k in range(26):
        y = 290 + rng.uniform(0, 560)
        ln = rng.uniform(200, 700)
        x = (rng.uniform(0, W + 800) - 2600 * t) % (W + 800) - 400 + xo
        slope = -70 / W
        d.line([(x, y + slope * x), (x + ln, y + slope * (x + ln))], fill=light, width=int(rng.uniform(3, 9)))
    d.line(band[:2], fill=INK, width=12)
    d.line(band[2:], fill=INK, width=12)
    d.line([(band[0][0], band[0][1] + 18), (band[1][0], band[1][1] + 18)], fill=GOLD, width=4)
    d.line([(band[3][0], band[3][1] - 18), (band[2][0], band[2][1] - 18)], fill=GOLD, width=4)
    im = ctx.stand(sh["img"], 1080)[0]
    u = ease_back((t - 0.05) / 0.3)
    frame.paste(im, (int(lerp(-900, 480 - im.width / 2, u)), H + 130 - im.height), im)

    def make_text():
        f, lines = fit_lines(ctx, sh.get("cut_text", sh["text"]), "b", (100, 90, 80, 70), 900, 3)
        lh = int(f.size * 1.3)
        timg = Image.new("RGBA", (980, lh * len(lines) + 40), (0, 0, 0, 0))
        dd = ImageDraw.Draw(timg)
        for i, ln in enumerate(lines):
            dd.text((20, 20 + i * lh), ln, font=f, fill="white", stroke_width=9, stroke_fill=INK)
        return timg
    txt = ctx.memo(("cuttext", sp_["idx"]), make_text)
    if t > 0.25:
        k = ease_out((t - 0.25) / 0.14)
        paste_c(frame, fade(scaled(txt, 1.35 - 0.35 * k), k), 1380, 560)
        tag = ctx.memo(("cuttag", sh["sp"]), lambda: text_image(ctx, ch["name"], "b", 44, "white", 0))
        tx, ty = 910, int(560 - txt.height / 2 - tag.height - 10)
        d.rectangle([tx - 16, ty - 8, tx + tag.width + 16, ty + tag.height + 8], fill=INK)
        frame.paste(tag, (tx, ty), tag)
    if 0.25 <= t < 0.33:
        frame = Image.blend(frame, Image.new("RGB", (W, H), "white"), 0.4 * (1 - (t - 0.25) / 0.08))
    return shake(frame, t, 0.25, 0.3, 18)


# ---------- 図解・一覧（話者が横で話す） ----------

PANEL_S, PANEL_X, PANEL_Y = 0.84, 34, 70


def presenter(ctx, frame, sp_, t, layer):
    """縮めた図解レイヤーを置き、右下に話者の立ち絵、下に吹き出しを出す。"""
    sh = sp_["sh"]
    small = layer.resize((int(W * PANEL_S), int(H * PANEL_S)), Image.BILINEAR)
    frame.paste(small, (PANEL_X, PANEL_Y), small)
    img = sh.get("img") or DEFAULT_IMG[sh["sp"]]
    im, hx, my = ctx.stand(img, 640)
    u = ease_back((t - 0.1) / 0.35) if sp_.get("telop_in") else 1
    x0 = int(W - im.width + 70)
    y0 = int(H + 30 - im.height + 400 * (1 - u))
    frame.paste(im, (x0, y0), im)

    def make():
        return make_bubble(ctx, sh["text"], "round", ("free", 780, 790), (x0 + hx - 60, H + 30 - im.height + my + 20),
                           max_w=1120, sizes=(44, 40, 36), max_lines=2)
    b = ctx.memo(("pbubble", sp_["idx"]), make)
    draw_bubble(frame, b, t, sp_["lead"], sp_["vlen"] * 0.72, pop_t=0.15)


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
    frame = ctx.backdrop(sp_["scene"]).copy()
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    def panel():
        im = Image.new("RGBA", (1640, 680), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle([10, 10, 1630, 670], radius=26, fill=(10, 14, 22, 245), outline=(80, 150, 200), width=4)
        d.text((60, 70), "AIが出した施策案", font=ctx.font("b", 52), fill=(150, 210, 240), anchor="lm")
        return im
    pn = ctx.memo(("listpanel",), panel)
    build = sh.get("mode") == "build"
    paste_c(layer, scaled(pn, lerp(0.94, 1, ease_out(t / 0.22)) if build else 1), 960, 440)
    d = ImageDraw.Draw(layer)
    n_vis = 0 if build else 32
    scan_t = {}
    if not build:
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
            paste_c(layer, scaled(chip(ctx, i, True), 1.15 - 0.15 * k), x + 186, y + 26)
        else:
            im = chip(ctx, i, False)
            layer.paste(im, (x, y), im)
    stamp_t = 0.35 + 32 * 0.045 + 0.15
    if not build or t >= stamp_t:
        k = ease_out((t - stamp_t) / 0.12) if build else 1
        st = ctx.memo(("stamp32",), lambda: text_image(ctx, "32件", "b", 92, (232, 70, 60), 6, (10, 14, 22)))
        paste_c(layer, scaled(st, 1.8 - 0.8 * k), 1640, 170)
    else:
        d.text((1720, 170), f"{n_vis}件", font=ctx.font("b", 84), fill=(150, 160, 170), anchor="rm")
    presenter(ctx, frame, sp_, t, layer)
    if sh.get("oto") and build and t >= stamp_t:
        draw_oto(ctx, frame, sh["oto"], "impact", 1720, 330, t, stamp_t + 0.05)
    frame.paste(ctx.header, (0, 0), ctx.header)
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
    frame = ctx.backdrop(sp_["scene"]).copy()
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    xo = int((1 - ease_out(t / 0.3)) * 1300)
    pl, px, py = plate_image(ctx, (190, 120, 1730, 860), "board")
    layer.paste(pl, (px + xo, py), pl)
    d = ImageDraw.Draw(layer)
    hf = ctx.font("b", 72)
    d.text((260 + xo, 205), sh["heading"], font=hf, fill=INK, anchor="lm")
    d.line([(260 + xo, 256), (260 + xo + hf.getlength(sh["heading"]), 256)], fill=RED, width=9)
    items = sh["items"]
    n = len(items)
    rh = 560 / n
    hl, prev = sh["hl"], sp_.get("prev_hl")
    if hl >= 0:
        if prev is not None and prev >= 0 and prev != hl:
            yb = lerp(295 + prev * rh, 295 + hl * rh, ease_io((t - 0.3) / 0.3))
            wb = 1.0
        else:
            yb = 295 + hl * rh
            wb = ease_out((t - 0.35) / 0.25)
        if wb > 0:
            d.rectangle([230 + xo, yb + 6, 230 + xo + 1430 * wb, yb + rh - 14], fill=(235, 222, 196))
            d.rectangle([230 + xo, yb + 6, 248 + xo, yb + rh - 14], fill=RED)
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
        y = 295 + i * rh
        lf = ctx.font("b", 54 if n > 2 else 60)
        d.text((285 + xo + dx, y + rh / 2 - 30), label, font=lf, fill=RED if on else col, anchor="lm")
        df, dl = ctx.memo(("desc", desc), lambda: fit_lines(ctx, desc, "r", (46, 42, 38), 1360, 1))
        d.text((305 + xo + dx, y + rh / 2 + 34), dl[0], font=df, fill=col, anchor="lm")
    presenter(ctx, frame, sp_, t, layer)
    frame.paste(ctx.header, (0, 0), ctx.header)
    return frame


# ---------- その他の画面 ----------

def draw_mail(ctx, sp_, t, T):
    sh = sp_["sh"]
    frame = ctx.backdrop(sp_["scene"]).copy()

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
        frame = ctx.world(sp_["scene"], 2).resize((W, H), Image.BILINEAR)
        frame.paste(lay, (int(-W * out_u), 0))
        return frame
    return shake(lay, t, 0.25, 0.22, 10)


def draw_kv(ctx, sp_, t, T):
    dur = sp_["dur"]
    z = 1 + 0.06 * t / dur
    cw, chh = 2304 / z, 1296 / z
    frame = ctx.kv.crop((int(1152 - cw / 2), int(648 - chh / 2), int(1152 + cw / 2), int(648 + chh / 2))).resize((W, H), Image.BILINEAR)
    if sp_["kv_first"] and t < 0.3:
        frame = Image.blend(frame, Image.new("RGB", (W, H), "white"), 0.8 * (1 - t / 0.3))
    if sp_["kv_last"] and t > dur - 1.0:
        frame = Image.blend(frame, Image.new("RGB", (W, H), "black"), ease_io((t - (dur - 1.0)) / 1.0))
    return frame


def draw_summary(ctx, sp_, t, T):
    sh = sp_["sh"]
    frame = ctx.backdrop(sp_["scene"]).copy()
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
    frame = ctx.backdrop(sp_["scene"]).copy()
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
    prev_type, prev_talk_sp = None, None
    seen_board, kv_count = {}, 0
    kv_total = sum(1 for s in ep["shots"] if s["type"] == "kv")
    scene = ep.get("scene", "office")
    T = 0.0
    for i, sh in enumerate(ep["shots"]):
        typ = "cutin" if sh.get("cutin") else sh["type"]
        if typ == "chapter":
            scene = sh.get("scene", scene)
        v = read_wav(voices[str(i)]["wav"]) if str(i) in voices else np.zeros(0, np.float32)
        vlen = len(v) / SR
        lead = LEAD.get(typ, 0.0)
        dur = max(sh.get("dur", 0), MIN_DUR.get(typ, 1.6), lead + vlen + TAIL.get(typ, 0.5) if vlen else 0)
        frames = round(dur * FPS)
        dur = frames / FPS
        sp_ = {"idx": i, "type": typ, "sh": sh, "dur": dur, "frames": frames, "t0": T, "lead": lead, "vlen": vlen,
               "env": voice_env(v, lead, frames) if vlen else [], "scene": scene}
        loc = []
        if typ in ("talk", "cutin"):
            side = CHARS[sh["sp"]]["side"]
            other = "R" if side == "L" else "L"
            slot = state[side]
            if not visible or slot is None:
                mode = "enter"
            elif slot["char"] != sh["sp"]:
                mode = "swap"
            elif slot["img"] != sh["img"]:
                mode = "expr"
            else:
                mode = "same"
            if sh.get("shot"):
                shot = sh["shot"]
            elif sh.get("fx") in ("impact", "surprise"):
                shot = "close"
            elif prev_type == "talk" and prev_talk_sp == sh["sp"]:
                shot = "close"
            elif not visible and state[other]:
                shot = "two"
            else:
                shot = "med"
            sp_.update(spk_mode=mode, old=slot["img"] if slot else None, shot=shot,
                       whip=(1 if side == "R" else -1) if visible and active and active != side else 0)
            if state[other]:
                sp_["lis"] = state[other]["img"]
                sp_["lis_mode"] = "slidein" if not visible else "static"
            state[side] = {"char": sh["sp"], "img": sh["img"]}
            active = side
            if typ == "talk":
                if mode in ("enter", "swap"):
                    loc.append((0.02 if mode == "enter" else 0.12, "pop"))
                elif sp_["whip"]:
                    loc.append((0.0, "whoosh_s"))
                if sh.get("fx") == "surprise":
                    loc.append((0.03, "surprise"))
                if sh.get("fx") == "impact":
                    loc.append((0.0, "impact"))
                if sh.get("oto") and sh.get("fx") not in ("impact", "surprise"):
                    loc.append((0.04, "stamp_s"))
                prev_talk_sp = sh["sp"]
            else:
                loc += [(0.0, "shing"), (0.25, "impact")]
                prev_talk_sp = None
            visible = typ == "talk"
        else:
            visible = False
            prev_talk_sp = None
        if typ == "chapter":
            state, active = {"L": None, "R": None}, None
            loc += [(0.0, "whoosh"), (0.25, "taiko")]
        if typ in ("board", "list"):
            sp_["telop_in"] = prev_type not in ("board", "list")
            if sp_["telop_in"]:
                loc.append((0.1, "pop"))
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
    s["stamp_s"] = s["stamp"] * 0.45
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
    prepare_cutouts(a.assets)
    ep = json.load(open(a.episode, encoding="utf-8"))
    voices = json.load(open(os.path.join(a.voices, "voices.json")))
    specs, se, waves, total = plan(ep, voices)

    if a.stills:
        _init(a.assets)
        for item in a.stills:
            i, t = item.split(":")
            sp_ = specs[int(i)]
            t = min(float(t), sp_["dur"] - 1 / FPS)
            DRAW[sp_["type"]](_CTX, sp_, t, sp_["t0"] + t).convert("RGB").save(f"{a.out}/still_{int(i):03d}_{t:.2f}.png")
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
