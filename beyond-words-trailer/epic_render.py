"""BEYOND WORDS 予告編(ハリウッド版)の映像を描き、epic_audio.wav と合わせて mp4 にする。

usage: python3 epic_render.py FONT_DIR AUDIO_WAV OUT_MP4 [--preview t1,t2,...]
"""
import math, os, subprocess, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1920, 1080, 30
DUR = 64.0
BAR = 140  # 2.39:1 のシネマスコープ
HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = sys.argv[1] if len(sys.argv) > 1 else "fonts"
POSTER = Image.open(os.path.join(HERE, "poster.jpg")).convert("RGB")
FACES = {"a": (137, 490), "b": (420, 496), "c": (655, 495), "d": (880, 505), "e": (408, 818),
         "f": (664, 826), "g": (200, 979), "h": (522, 1001), "i": (900, 906)}


def smooth(x): x = min(max(x, 0.0), 1.0); return x * x * (3 - 2 * x)
def ease_out(x): x = min(max(x, 0.0), 1.0); return 1 - (1 - x) ** 3
def env(t, a, b, fi=0.6, fo=0.6):
    if t < a or t > b: return 0.0
    return smooth((t - a) / fi if fi else 1) * smooth((b - t) / fo if fo else 1)


# ---------- フォント ----------
_fonts = {}


def font(name, size, wght=None):
    k = (name, size, wght)
    if k not in _fonts:
        f = ImageFont.truetype(os.path.join(FONT_DIR, name + ".ttf"), size)
        if wght: f.set_variation_by_axes([wght])
        _fonts[k] = f
    return _fonts[k]


def mincho(size): return font("ShipporiB1", size)
def cinzel(size, w=700): return font("Cinzel", size, w)
def mont(size, w=800): return font("Montserrat", size, w)
def sans(size, w=500): return font("NotoSansJP", size, w)


# ---------- 金属質の文字 ----------
PALETTES = {
    "silver": [(0, (.50, .52, .56)), (.38, (1, 1, 1)), (.55, (.60, .62, .67)), (1, (.92, .92, .95))],
    "gold": [(0, (.42, .28, .10)), (.38, (1, .90, .64)), (.55, (.58, .40, .15)), (1, (.96, .82, .52))],
    "red": [(0, (.62, .08, .06)), (.38, (1, .52, .45)), (.55, (.80, .12, .09)), (1, (1, .30, .24))],
}
GLOW = {"silver": (.55, .65, .85), "gold": (1, .70, .30), "red": (1, .15, .08)}
_metal = {}


def metal(s, f, style="silver", track=0):
    k = (s, id(f), style, track)
    if k in _metal: return _metal[k]
    widths = [f.getlength(ch) for ch in s]
    asc, desc = f.getmetrics()
    pad = max(60, int(f.size * 0.7))
    tw = int(sum(widths) + track * (len(s) - 1))
    m = Image.new("L", (tw + 2 * pad, asc + desc + 2 * pad))
    d = ImageDraw.Draw(m)
    x = pad
    for ch, w in zip(s, widths):
        d.text((x, pad), ch, font=f, fill=255)
        x += w + track
    a = np.asarray(m, np.float32) / 255
    rows = np.where(a.max(1) > 0.1)[0]
    top, bot = (rows[0], rows[-1]) if len(rows) else (0, a.shape[0])
    y = np.clip((np.arange(a.shape[0]) - top) / max(1, bot - top), 0, 1)
    stops = PALETTES[style]
    grad = np.stack([np.interp(y, [p for p, _ in stops], [c[i] for _, c in stops]) for i in range(3)], 1)
    rgb = np.repeat(grad[:, None, :], a.shape[1], 1)
    blur = np.asarray(m.filter(ImageFilter.GaussianBlur(1.6)), np.float32) / 255
    bevel = np.clip(blur - np.roll(blur, 3, 0), 0, 1)
    rgb = np.clip(rgb + bevel[..., None] * 0.8, 0, 1)
    glow = np.asarray(m.filter(ImageFilter.GaussianBlur(max(6, f.size * 0.22))), np.float32) / 255
    shadow = np.asarray(m.filter(ImageFilter.GaussianBlur(max(4, f.size * 0.12))), np.float32) / 255
    shadow = np.clip(shadow * 1.8, 0, 1)
    out = {"rgb": (rgb * a[..., None]).astype(np.float32), "a": a, "sh": shadow, "glow": glow[..., None] * np.array(GLOW[style]) * 0.9,
           "size": (a.shape[1], a.shape[0])}
    _metal[k] = out
    return out


def _resize(arr, size):
    if arr.ndim == 2:
        return np.asarray(Image.fromarray(arr).resize(size, Image.BILINEAR))
    return np.stack([np.asarray(Image.fromarray(arr[..., c]).resize(size, Image.BILINEAR))
                     for c in range(3)], -1)


def blit(buf, mt, cx, cy, alpha=1.0, scale=1.0, sweep=None, glow=0.8):
    if alpha <= 0.01: return
    rgb, a, g, sh = mt["rgb"], mt["a"], mt["glow"], mt["sh"]
    w, h = mt["size"]
    if abs(scale - 1) > 0.002:
        w, h = int(w * scale), int(h * scale)
        rgb, a, g = _resize(rgb.astype(np.float32), (w, h)), _resize(a, (w, h)), _resize(g.astype(np.float32), (w, h))
        sh = _resize(sh, (w, h))
    if sweep is not None:  # 斜めに走る光沢
        yy, xx = np.mgrid[0:h, 0:w]
        band = np.exp(-(((xx + yy * 0.5) / w - sweep) / 0.06) ** 2)[..., None]
        rgb = rgb + band * a[..., None] * 0.9
    x0, y0 = int(cx - w / 2), int(cy - h / 2)
    xs0, ys0 = max(0, -x0), max(0, -y0)
    xs1, ys1 = min(w, W - x0), min(h, H - y0)
    if xs1 <= xs0 or ys1 <= ys0: return
    region = buf[y0 + ys0 : y0 + ys1, x0 + xs0 : x0 + xs1]
    aa = a[ys0:ys1, xs0:xs1, None] * alpha
    region *= 1 - sh[ys0:ys1, xs0:xs1, None] * alpha * 0.85
    region *= 1 - aa
    region += rgb[ys0:ys1, xs0:xs1] * alpha + g[ys0:ys1, xs0:xs1] * alpha * glow


def card(buf, s, f, style, cx, cy, t, t0, t1, fi=0.8, fo=0.6, track=0, slam=False, sweep=False, glow=0.8):
    if t < t0 or t > t1: return
    a = env(t, t0, t1, 0.08 if slam else fi, fo)
    p = (t - t0) / (t1 - t0)
    if slam:
        sc = 1 + 0.35 * (1 - ease_out((t - t0) / 0.25)) - 0.03 * p
    else:
        sc = 1.07 - 0.07 * ease_out((t - t0) / (t1 - t0 + 1.5))
    sw = (-0.3 + 1.6 * ((t - t0) / 2.2)) if sweep else None
    blit(buf, metal(s, f, style, track), cx, cy, a, sc, sw, glow)


# ---------- 光と塵 ----------
yy_full, xx_full = np.mgrid[0:H, 0:W].astype(np.float32)


def streak(buf, cx, cy, inten, color=(.45, .62, 1.0), length=900):
    """アナモルフィックレンズ風の横一文字のフレア。"""
    if inten <= 0.01: return
    y0, y1 = max(0, int(cy - 90)), min(H, int(cy + 90))
    dy = np.arange(y0, y1) - cy
    v = np.exp(-(dy / 2.5) ** 2) + 0.25 * np.exp(-(dy / 18) ** 2) + 0.06 * np.exp(-(dy / 60) ** 2)
    hx = np.exp(-np.abs(np.arange(W) - cx) / length)
    buf[y0:y1] += (v[:, None] * hx[None, :])[..., None] * np.array(color) * inten
    r0, r1 = max(0, int(cy - 260)), min(H, int(cy + 260))
    c0, c1 = max(0, int(cx - 260)), min(W, int(cx + 260))
    d2 = (yy_full[r0:r1, c0:c1] - cy) ** 2 + (xx_full[r0:r1, c0:c1] - cx) ** 2
    core = np.exp(-d2 / (2 * 22 ** 2)) + 0.35 * np.exp(-d2 / (2 * 90 ** 2))
    buf[r0:r1, c0:c1] += core[..., None] * (0.6 + 0.4 * np.array(color)) * inten


HAZE = np.exp(-(((xx_full - W / 2) / 700) ** 2 + ((yy_full + 150) / 520) ** 2))[..., None] * np.array([.55, .55, .62])
HAZE_RED = np.exp(-(((xx_full - W / 2) / 900) ** 2 + ((yy_full - H * 0.62) / 260) ** 2))[..., None] * np.array([.7, .08, .05])

prng = np.random.default_rng(5)
NP = 260
P_X, P_Y = prng.random(NP) * W, prng.random(NP) * H
P_VX, P_VY = prng.normal(6, 10, NP), prng.normal(-14, 8, NP)
P_R, P_B, P_PH = prng.uniform(1, 3.2, NP), prng.uniform(0.3, 1, NP), prng.random(NP) * 6.28


def particles(buf, t, inten, color=(1, 1, 1), speed=1.0):
    if inten <= 0.01: return
    layer = Image.new("L", (W, H))
    d = ImageDraw.Draw(layer)
    x = (P_X + P_VX * t * speed + 18 * np.sin(t * 0.4 + P_PH)) % W
    y = (P_Y + P_VY * t * speed) % H
    for xi, yi, r, b, ph in zip(x, y, P_R, P_B, P_PH):
        tw = 0.6 + 0.4 * math.sin(t * 2.3 + ph)
        d.ellipse((xi - r, yi - r, xi + r, yi + r), fill=int(255 * b * tw))
    arr = np.asarray(layer.filter(ImageFilter.GaussianBlur(1.3)), np.float32) / 255
    buf += arr[..., None] * np.array(color) * inten


# ---------- 登壇者ショット ----------
TEAL, WARM = np.array([.78, .93, 1.06]), np.array([1.06, .96, .84])
LOWER = np.clip((yy_full - H * 0.45) / (H * 0.4), 0, 1)[..., None] ** 1.4


def face(buf, key, t, t0, t1, z0=1.0, z1=1.12, dx=0.0, fi=0.4, fo=0.4, shade=0.75):
    if t < t0 or t >= t1: return
    p = (t - t0) / (t1 - t0)
    zoom = z0 + (z1 - z0) * p
    cx, cy = FACES[key]
    sh = 300 / zoom
    sw = sh * W / H
    x0 = min(max(cx - sw / 2 + dx * (p - 0.5), 0), POSTER.width - sw)
    y0 = cy - sh * 0.38
    im = POSTER.transform((W, H), Image.EXTENT, (x0, y0, x0 + sw, y0 + sh), Image.BICUBIC)
    g = np.asarray(im.convert("L"), np.float32) / 255
    g = np.clip((g - 0.05) / 0.88, 0, 1) ** 1.2
    rgb = g[..., None] * (TEAL * (1 - g[..., None]) + WARM * g[..., None])
    a = env(t, t0, t1, fi, fo)
    rgb *= (1 - LOWER * shade)
    buf += rgb * a


def flash(buf, t, t0, amt=1.0, dur=0.12):
    if t0 <= t < t0 + dur:
        buf += (1 - (t - t0) / dur) * amt


def chroma(buf, k):
    k = int(k)
    if k:
        buf[..., 0] = np.roll(buf[..., 0], k, 1)
        buf[..., 2] = np.roll(buf[..., 2], -k, 1)


# ---------- タイムライン ----------
HITS = [16.0, 18.0, 20.0, 29.0, 30.2, 31.4, 32.6, 41.0, 49.3, 55.0]


def montage_cuts():
    cuts, t, iv = [], 43.5, 0.6
    while t < 48.4:
        cuts.append(t)
        t += iv
        iv = max(0.16, iv * 0.86)
    return cuts


CUTS = montage_cuts()
CY = H / 2


def scene(t):
    buf = np.zeros((H, W, 3), np.float32)

    # A オープニング
    if t < 4.7:
        bloom = ease_out((t - 0.5) / 1.6) * env(t, 0.5, 4.7, 0.01, 0.5)
        buf += HAZE * 0.35 * bloom
        streak(buf, W / 2, CY, 1.2 * bloom * (0.85 + 0.15 * math.sin(t * 3)), length=500 + 400 * bloom)
        particles(buf, t, 0.5 * bloom)
        card(buf, "THIS  NOVEMBER", cinzel(78), "gold", W / 2, CY + 120, t, 1.6, 4.6, fi=1.4, track=26, sweep=True)

    # B 問い
    if 4.8 <= t < 9.0:
        buf += HAZE * 0.22 * env(t, 4.8, 9.0, 1.2, 0.5)
        particles(buf, t, 0.45 * env(t, 4.8, 9.0, 1, 0.5))
        card(buf, "言葉は、", mincho(76), "silver", W / 2, CY - 60, t, 5.0, 8.9, track=14)
        card(buf, "人を、つなぐのか。", mincho(76), "silver", W / 2, CY + 50, t, 6.2, 8.9, track=14)

    # C / D 顔と字幕
    face(buf, "b", t, 9.0, 12.6, 1.0, 1.14, 12)
    card(buf, "同じ言葉でも、伝わらないことがある。", mincho(54), "silver", W / 2, H - BAR - 95, t, 9.4, 12.5, track=8, glow=0.4)
    face(buf, "i", t, 12.5, 16.0, 1.15, 1.0, -12)
    card(buf, "言葉が通じなくても、伝わることがある。", mincho(54), "silver", W / 2, H - BAR - 95, t, 12.9, 15.9, track=8, glow=0.4)

    # E 三連打
    for i, (jp, en) in enumerate([("九人の語り手。", "NINE  VOICES"), ("二つの言語。", "TWO  LANGUAGES"),
                                  ("ひとつの舞台。", "ONE  STAGE")]):
        t0 = 16.0 + i * 2
        if t0 <= t < t0 + 2:
            buf += HAZE_RED * 0.5 * env(t, t0, t0 + 2, 0.05, 0.4)
            streak(buf, W / 2, CY + 105, 1.4 * (1 - ease_out((t - t0) / 1.2)) + 0.25, color=(1, .35, .25), length=1100)
            particles(buf, t, 0.4, (1, .55, .4), 1.6)
            card(buf, jp, mincho(104), "silver", W / 2, CY - 40, t, t0, t0 + 1.95, fo=0.35, slam=True, track=18)
            card(buf, en, cinzel(40), "gold", W / 2, CY + 105, t, t0 + 0.25, t0 + 1.95, fi=0.4, fo=0.35, track=24)

    # F / G ルール
    face(buf, "a", t, 22.0, 25.6, 1.0, 1.12, 10)
    card(buf, "海外のリーダーは、", mincho(52), "silver", W / 2, H - BAR - 150, t, 22.3, 25.5, track=10, glow=0.4)
    card(buf, "日本語で語る。", mincho(78), "red", W / 2, H - BAR - 70, t, 23.2, 25.5, track=16, glow=0.6)
    face(buf, "d", t, 25.5, 29.0, 1.12, 1.0, -10)
    card(buf, "日本のリーダーは、", mincho(52), "silver", W / 2, H - BAR - 150, t, 25.8, 28.95, track=10, glow=0.4)
    card(buf, "英語で語る。", mincho(78), "red", W / 2, H - BAR - 70, t, 26.7, 28.95, track=16, glow=0.6)

    # H 言葉も、育ちも、文化も
    for i, (k, s) in enumerate([("c", "言葉も、"), ("g", "育ちも、"), ("h", "文化も、")]):
        t0 = 29.0 + i * 1.2
        face(buf, k, t, t0, t0 + 1.2, 1.35, 1.5, 0, fi=0.02, fo=0.15, shade=0.85)
        card(buf, s, mincho(120), "silver", W / 2, H - BAR - 120, t, t0, t0 + 1.18, fo=0.15, slam=True, track=24)
    if 32.6 <= t < 34.0:
        buf += HAZE_RED * 0.3 * env(t, 32.6, 34.0, 0.02, 0.3)
        streak(buf, W / 2, CY + 110, 1.6 * (1 - ease_out((t - 32.6) / 1.0)) + 0.2, color=(1, .3, .2), length=1200)
        card(buf, "すべてが、違う。", mincho(116), "red", W / 2, CY, t, 32.6, 34.0, fo=0.12, slam=True, track=22)

    # I それでも
    if 34.8 <= t < 39.0:
        e = env(t, 34.8, 39.0, 1.6, 0.6)
        buf += HAZE * 0.45 * e
        particles(buf, t, 0.7 * e, (1, .92, .8), 0.6)
        streak(buf, W / 2, CY - 230, 0.35 * e, color=(1, .85, .6), length=700)
        card(buf, "それでも、", mincho(60), "silver", W / 2, CY - 60, t, 35.0, 38.9, fi=1.2, track=16, glow=0.5)
        card(buf, "人は、つながる。", mincho(96), "gold", W / 2, CY + 60, t, 36.3, 38.9, fi=1.4, track=20, sweep=True)

    # J 英語で語る
    if 39.0 <= t < 43.5:
        buf += HAZE * 0.25 * env(t, 39.0, 43.5, 0.8, 0.4)
        particles(buf, t, 0.45, (1, .9, .85), 0.6)
        card(buf, "英語は、話せない。", mincho(64), "silver", W / 2, CY - 80, t, 39.2, 43.4, track=14, glow=0.5)
        if t >= 41.0:
            buf += HAZE_RED * 0.25 * env(t, 41.0, 43.5, 0.05, 0.4)
            streak(buf, W / 2, CY + 165, 1.2 * (1 - ease_out((t - 41.0) / 1.2)), color=(1, .3, .2), length=1000)
        card(buf, "だから、英語で語る。", mincho(92), "red", W / 2, CY + 60, t, 41.0, 43.4, slam=True, track=18)

    # K 最後のモンタージュ
    if 43.5 <= t < 48.5:
        i = max(j for j, c in enumerate(CUTS) if c <= t)
        nxt = CUTS[i + 1] if i + 1 < len(CUTS) else 48.5
        face(buf, "abcdefghi"[i % 9], t, CUTS[i], nxt, 1.25, 1.4, 0, fi=0.0, fo=0.0, shade=0.6)
        flash(buf, t, CUTS[i], 0.5, 0.07)
        words = [("PEOPLE", 43.5, 45.1), ("IDEAS", 45.1, 46.7), ("CONNECTIONS", 46.7, 48.45)]
        for wd, a, b in words:
            card(buf, wd, cinzel(120, 800), "gold", W / 2, CY, t, a, b, fi=0.15, fo=0.1, track=30, glow=1.0)
        streak(buf, W / 2, CY, 0.5 + 0.9 * (t - 43.5) / 5, color=(1, .5, .3), length=1300)

    # M タイトル
    if 49.3 <= t < 55.0:
        lt = t - 49.3
        e = env(t, 49.3, 55.0, 0.01, 0.5)
        buf += HAZE_RED * 0.55 * e + HAZE * 0.15 * e
        particles(buf, t, 0.9 * e, (1, .35, .18), 2.2)
        sc = 1.0 + 0.05 * ease_out(lt / 5.7)
        sw = -0.3 + 1.6 * (lt / 2.0)
        blit(buf, metal("BEYOND", mont(230), "silver", 10), W / 2, CY - 120, e, sc, sw, 0.7)
        blit(buf, metal("WORDS", mont(230), "red", 10), W / 2, CY + 95, e, sc, sw - 0.15, 1.0)
        fx = W * (0.15 + 0.7 * ease_out(lt / 3.5))
        streak(buf, fx, CY - 10, 1.6 * (1 - ease_out(lt / 2.5)) + 0.25 * e, color=(.5, .6, 1), length=1300)
        card(buf, "PEOPLE  ×  IDEAS  ×  CONNECTIONS", mont(34, 500), "gold", W / 2, CY + 240, t, 50.8, 54.95, fi=1.0, fo=0.5, track=14, glow=0.5)
        card(buf, "言葉を越えて、つながる。", mincho(44), "silver", W / 2, CY + 315, t, 52.0, 54.95, fi=1.0, fo=0.5, track=16, glow=0.4)

    # N 開催情報
    if 55.0 <= t < 61.5:
        bg = POSTER.transform((W, H), Image.EXTENT, (0, 400 + (t - 55) * 5, 1050, 991 + (t - 55) * 5), Image.BICUBIC)
        g = np.asarray(bg.convert("L").filter(ImageFilter.GaussianBlur(4)), np.float32) / 255
        buf += g[..., None] * np.array([.5, .32, .3]) * 0.22 * env(t, 55.0, 61.5, 0.8, 0.5)
        particles(buf, t, 0.5, (1, .5, .3), 1.5)
        e1 = env(t, 55.0, 58.6, 0.05, 0.4)
        streak(buf, W / 2, CY - 40, 1.4 * (1 - ease_out((t - 55.0) / 1.5)) * e1 + 0.15 * e1, color=(1, .75, .4), length=1100)
        card(buf, "11.22", cinzel(210, 800), "gold", W / 2, CY - 50, t, 55.0, 58.6, fo=0.4, slam=True, track=10, sweep=True)
        card(buf, "SUNDAY    14:00 – 16:00", cinzel(40), "silver", W / 2, CY + 115, t, 55.8, 58.6, fi=0.6, fo=0.4, track=12, glow=0.4)
        card(buf, "原宿 HOW’z Cafe", sans(76, 800), "silver", W / 2, CY - 90, t, 58.5, 61.4, fi=0.5, track=6, glow=0.4)
        card(buf, "東急プラザ原宿 3F", sans(32, 500), "silver", W / 2, CY - 10, t, 58.8, 61.4, fi=0.5, track=10, glow=0.2)
        card(buf, "参加費 5,500円", sans(60, 800), "gold", W / 2, CY + 90, t, 59.3, 61.4, fi=0.5, track=6, glow=0.5)
        card(buf, "軽食・ドリンク付き", sans(30, 500), "silver", W / 2, CY + 158, t, 59.5, 61.4, fi=0.5, track=10, glow=0.2)

    # O 締め
    if t >= 61.5:
        e = env(t, 61.5, DUR, 0.8, 1.6)
        buf += HAZE * 0.2 * e
        particles(buf, t, 0.4 * e, (1, .9, .8), 0.5)
        blit(buf, metal("BEYOND WORDS", mont(64), "silver", 6), W / 2, CY - 50, e, 1.0, None, 0.4)
        card(buf, "英語が得意じゃなくても、大丈夫。", mincho(42), "silver", W / 2, CY + 60, t, 61.9, DUR, fi=0.8, fo=1.6, track=12, glow=0.3)

    # ヒット時の閃光・揺れ・色収差
    for h0 in HITS:
        flash(buf, t, h0, 0.9 if h0 == 49.3 else 0.55, 0.14)
    kick = max([max(0.0, 1 - (t - h0) / 0.3) for h0 in HITS if t >= h0] + [0.0])
    if kick > 0:
        chroma(buf, 8 * kick)
        sx, sy = int(14 * kick * math.sin(t * 97)), int(10 * kick * math.cos(t * 83))
        buf = np.roll(buf, (sy, sx), (0, 1))
    return buf


# ---------- 仕上げ ----------
grng = np.random.default_rng(3)
GRAIN = [grng.normal(0, 0.016, (H, W, 1)).astype(np.float32) for _ in range(6)]
VIG = (1 - 0.42 * (((xx_full - W / 2) / (W / 2)) ** 2 + ((yy_full - H / 2) / (H / 2)) ** 2) ** 1.3)[..., None]


def frame(n):
    t = n / FPS
    buf = scene(t)
    buf = buf * VIG + GRAIN[n % 6]
    buf = buf / (1 + np.maximum(buf - 0.85, 0) * 1.2)  # ハイライトを柔らかく丸める
    buf[:BAR] = 0
    buf[H - BAR :] = 0
    return (np.clip(buf, 0, 1) * 255).astype(np.uint8)


def main():
    out = sys.argv[3]
    if "--preview" in sys.argv:
        for t in [float(x) for x in sys.argv[sys.argv.index("--preview") + 1].split(",")]:
            Image.fromarray(frame(int(round(t * FPS)))).resize((960, 540)).save(f"{out}_{t:05.1f}.png")
        return
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-i", sys.argv[2], "-c:v", "libx264", "-preset", "medium",
           "-b:v", "5M", "-maxrate", "8M", "-bufsize", "10M", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(os.cpu_count()) as pool:
        for fr in pool.imap(frame, range(int(DUR * FPS)), chunksize=4):
            p.stdin.write(fr.tobytes())
    p.stdin.close()
    p.wait()


if __name__ == "__main__":
    main()
