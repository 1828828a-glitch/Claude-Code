"""BEYOND WORDS 予告編の映像をフレーム単位で描き、ffmpeg に流して mp4 にする。

usage: python3 render.py FONT_DIR AUDIO_WAV OUT_MP4 [--preview t1,t2,...]
"""
import math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1920, 1080, 30
DUR = 52.0
BAR = 104  # シネマスコープ風の上下黒帯
RED = (230, 52, 45)
HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR, AUDIO, OUT = sys.argv[1:4]
POSTER = Image.open(os.path.join(HERE, "poster.jpg")).convert("RGB")

# ポスター上の顔の中心座標
FACES = {"a": (137, 490), "b": (420, 496), "c": (655, 495), "d": (880, 505), "e": (408, 818),
         "f": (664, 826), "g": (200, 979), "h": (522, 1001), "i": (900, 906)}

_fonts = {}


def font(name, size, wght):
    k = (name, size, wght)
    if k not in _fonts:
        f = ImageFont.truetype(os.path.join(FONT_DIR, name + ".ttf"), size)
        f.set_variation_by_axes([wght])
        _fonts[k] = f
    return _fonts[k]


def serif(size, w=600): return font("NotoSerifJP", size, w)
def sans(size, w=500): return font("NotoSansJP", size, w)
def mont(size, w=800): return font("Montserrat", size, w)


def smooth(x): x = min(max(x, 0.0), 1.0); return x * x * (3 - 2 * x)
def ease_out(x): x = min(max(x, 0.0), 1.0); return 1 - (1 - x) ** 3


def env(t, a, b, fi=0.5, fo=0.5):
    if t < a or t > b: return 0.0
    return smooth((t - a) / fi if fi else 1) * smooth((b - t) / fo if fo else 1)


# ---------- テキスト ----------
def text(img, s, f, cx, cy, alpha=1.0, color=(255, 255, 255), track=0, anchor="c", rise=0.0):
    if alpha <= 0.01: return
    widths = [f.getlength(ch) for ch in s]
    tw = sum(widths) + track * (len(s) - 1)
    x = cx - tw / 2 if anchor == "c" else (cx if anchor == "l" else cx - tw)
    asc, desc = f.getmetrics()
    y = cy - (asc + desc) / 2 + rise
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for ch, w in zip(s, widths):
        d.text((x, y), ch, font=f, fill=color + (int(255 * alpha),))
        x += w + track
    img.alpha_composite(layer)


def reveal(img, s, f, cx, cy, t, t0, t1, **kw):
    """文字ごとに少しずつ浮かび上がる表示。"""
    if t < t0 or t > t1: return
    a_out = smooth((t1 - t) / 0.5)
    widths = [f.getlength(ch) for ch in s]
    track = kw.pop("track", 0)
    color = kw.pop("color", (255, 255, 255))
    tw = sum(widths) + track * (len(s) - 1)
    x = cx - tw / 2
    asc, desc = f.getmetrics()
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i, (ch, w) in enumerate(zip(s, widths)):
        p = ease_out((t - t0 - i * 0.045) / 0.6)
        if p > 0:
            d.text((x, cy - (asc + desc) / 2 + (1 - p) * 14), ch, font=f,
                   fill=color + (int(255 * p * a_out),))
        x += w + track
    img.alpha_composite(layer)


# ---------- 背景の赤い波 ----------
def waves(t, strength=1.0):
    sw, sh = W // 2, H // 2
    layer = Image.new("RGB", (sw, sh), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    xs = np.linspace(-20, sw + 20, 90)
    for k in range(26):
        ph = t * 0.35 + k * 0.11
        amp = 70 + 40 * math.sin(k * 0.7 + t * 0.2)
        ys = (sh * 0.55 + amp * np.sin(xs / sw * 5.5 + ph)
              + 35 * np.sin(xs / sw * 11 - ph * 1.7 + k * 0.3) - k * 4)
        c = int((40 + 110 * (k % 5 == 0)) * strength)
        d.line(list(zip(xs, ys)), fill=(c, int(c * 0.12), int(c * 0.1)), width=1)
    return layer.resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.2))


# ---------- 登壇者パネル ----------
_grad = {}


def side_mask(pw, ph, side):
    k = (pw, ph, side)
    if k not in _grad:
        x = np.linspace(0, 1, pw)
        g = np.clip((1 - x if side == "l" else x) / 0.45, 0, 1) ** 1.5  # テキスト側へ黒に溶ける
        y = np.linspace(0, 1, ph)
        v = np.clip(np.minimum(y, 1 - y) / 0.12, 0, 1)
        _grad[k] = Image.fromarray((np.outer(v, g) * 255).astype(np.uint8))
    return _grad[k]


def face_crop(key, pw, ph, zoom, dx=0.0):
    cx, cy = FACES[key]
    sh = 330 / zoom
    sw = sh * pw / ph
    x0 = cx - sw / 2 + dx
    y0 = cy - sh * 0.30
    return POSTER.transform((pw, ph), Image.EXTENT, (x0, y0, x0 + sw, y0 + sh), Image.BICUBIC)


def panel(img, key, side, t, t0, t1, alpha=1.0):
    if t < t0 or t > t1: return
    a = env(t, t0, t1, 0.35, 0.35) * alpha
    p = (t - t0) / (t1 - t0)
    pw, ph = 860, H - 2 * BAR
    im = face_crop(key, pw, ph, 1.0 + 0.07 * p, dx=(p - 0.5) * 10 * (1 if side == "l" else -1))
    m = side_mask(pw, ph, side).point(lambda v: int(v * a))
    img.paste(im, (0 if side == "l" else W - pw, BAR), m)


def full_face(img, key, t, t0, t1, flash=True):
    if t < t0 or t >= t1: return
    p = (t - t0) / (t1 - t0)
    im = face_crop(key, W, H - 2 * BAR, 1.25 + 0.15 * p)
    img.paste(im, (0, BAR))
    if flash and t - t0 < 0.05:
        img.alpha_composite(Image.new("RGBA", img.size, (255, 255, 255, 120)))


def red_line(img, t, t0, t1, y, maxw=900, width=2):
    if t < t0 or t > t1: return
    p = ease_out((t - t0) / 1.2) * smooth((t1 - t) / 0.4)
    w = maxw * p
    d = ImageDraw.Draw(img)
    d.rectangle((W / 2 - w / 2, y - width / 2, W / 2 + w / 2, y + width / 2), fill=RED + (255,))


# ---------- シーン ----------
TX_L, TX_R = 1340, 580  # パネル反対側のテキスト中心x


def scene(t):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))

    # S1 問いかけ
    if t < 5.0:
        img.paste(waves(t, 0.6 * env(t, 0, 5.0, 2.0, 0.6)), (0, 0))
        red_line(img, t, 0.4, 4.9, H / 2 + 70, 520)
        reveal(img, "人は、本当に", serif(64), W / 2, H / 2 - 70, t, 1.4, 4.9, track=10)
        reveal(img, "言葉で つながっているのか。", serif(64), W / 2, H / 2 + 10, t, 2.4, 4.9, track=10)

    # S2 / S3
    panel(img, "b", "r", t, 5.0, 8.6)
    reveal(img, "同じ言葉を話していても、", serif(54), TX_R, H / 2 - 45, t, 5.4, 8.5, track=6)
    reveal(img, "伝わらないことがある。", serif(54), TX_R, H / 2 + 35, t, 6.3, 8.5, track=6)
    panel(img, "i", "l", t, 8.5, 12.0)
    reveal(img, "言葉が通じなくても、", serif(54), TX_L, H / 2 - 45, t, 8.9, 11.9, track=6)
    reveal(img, "なぜか、強く伝わることがある。", serif(54), TX_L, H / 2 + 35, t, 9.8, 11.9, track=6)

    # S4 ブリッジ
    if 12.0 <= t < 13.0:
        a = env(t, 12.0, 13.0, 0.05, 0.3)
        text(img, "11.22  HARAJUKU", mont(40, 500), W / 2, H / 2, a, track=18)
        red_line(img, t, 12.0, 13.0, H / 2 + 50, 300)

    # S5 / S6 ルール
    panel(img, "a", "l", t, 13.0, 16.6)
    reveal(img, "海外のビジネスリーダーは、", serif(54), TX_L, H / 2 - 45, t, 13.3, 16.5, track=6)
    reveal(img, "日本語で。", serif(84, 700), TX_L, H / 2 + 60, t, 14.3, 16.5, track=14, color=RED)
    panel(img, "d", "r", t, 16.5, 20.0)
    reveal(img, "日本のビジネスリーダーは、", serif(54), TX_R, H / 2 - 45, t, 16.8, 19.95, track=6)
    reveal(img, "英語で。", serif(84, 700), TX_R, H / 2 + 60, t, 17.8, 19.95, track=14, color=RED)

    # S7 三連打
    for i, (k, s) in enumerate([("c", "言葉も違う。"), ("g", "育ちも違う。"), ("h", "文化も違う。")]):
        t0 = 20.0 + i * 1.2
        if t0 <= t < t0 + 1.2:
            full_face(img, k, t, t0, t0 + 1.2)
            img.alpha_composite(Image.new("RGBA", img.size, (0, 0, 0, 120)))
            text(img, s, serif(96, 700), W / 2, H - BAR - 150, smooth((t - t0) / 0.12), track=20)

    # S8 それでも
    if 23.6 <= t < 27.5:
        img.paste(waves(t, 0.35 * env(t, 23.6, 27.5, 1.0, 0.5)), (0, 0))
        reveal(img, "それでも、", serif(56), W / 2, H / 2 - 70, t, 23.8, 27.4, track=12)
        reveal(img, "人と人が、本当につながる瞬間はある。", serif(64), W / 2, H / 2 + 20, t, 24.8, 27.4, track=10)

    # S9 英語で話す
    panel(img, "e", "l", t, 27.5, 32.0, 0.9)
    reveal(img, "英語は、全然話せない。", serif(54), TX_L, H / 2 - 60, t, 27.8, 31.9, track=8)
    reveal(img, "だから、英語で話す。", serif(70, 700), TX_L, H / 2 + 40, t, 29.5, 31.9, track=12, color=RED)
    if 29.5 <= t < 31.9:
        text(img, "言葉を自由に操れないとき、何が伝わるのか。", sans(28, 400), TX_L, H / 2 + 140,
             env(t, 30.3, 31.9, 0.6, 0.4) * 0.75, track=4)

    # S10 モンタージュ
    if 32.0 <= t < 35.0:
        keys = "abcdefghi"
        i = int((t - 32.0) * 3)
        full_face(img, keys[i], t, 32.0 + i / 3, 32.0 + (i + 1) / 3)
        words = ["PEOPLE", "IDEAS", "CONNECTIONS"]
        text(img, words[min(i // 3, 2)], mont(110, 800), W / 2, H / 2 + 260, 0.9, track=30)

    # S11 タイトル
    if 35.4 <= t < 41.0:
        lt = t - 35.4
        img.paste(waves(t, env(t, 35.4, 41.0, 1.2, 0.5)), (0, 0))
        shake = (math.sin(lt * 90) * 14 * max(0, 1 - lt / 0.35)) if lt < 0.35 else 0
        a = env(t, 35.4, 41.0, 0.02, 0.5)
        sc = 1 + 0.04 * (1 - ease_out(lt / 5.6))
        text(img, "BEYOND", mont(int(210 * sc), 800), W / 2 + shake, H / 2 - 150, a, track=6)
        text(img, "WORDS", mont(int(210 * sc), 800), W / 2 - shake, H / 2 + 40, a, color=RED, track=6)
        if lt < 0.12:
            img.alpha_composite(Image.new("RGBA", img.size, (255, 255, 255, int(200 * (1 - lt / 0.12)))))
        text(img, "PEOPLE  ×  IDEAS  ×  CONNECTIONS", mont(34, 500), W / 2, H / 2 + 200,
             env(t, 36.4, 41.0, 0.8, 0.5), track=12)
        text(img, "言葉を越えて、つながる。", serif(40), W / 2, H / 2 + 290, env(t, 37.4, 41.0, 0.8, 0.5), track=14)

    # S12 コピー
    if 41.0 <= t < 45.0:
        red_line(img, t, 41.0, 44.9, H / 2 + 120, 200)
        reveal(img, "違うから、出会える。", serif(64), W / 2, H / 2 - 60, t, 41.2, 44.9, track=14)
        reveal(img, "出会うから、世界が広がる。", serif(64), W / 2, H / 2 + 30, t, 42.4, 44.9, track=14)

    # S13 開催情報
    if t >= 45.0:
        a = env(t, 45.0, DUR + 1, 0.4, 0.1) * smooth((DUR - 0.3 - t) / 2.2)
        bg = POSTER.transform((W, H), Image.EXTENT, (0, 380 + (t - 45) * 6, 1050, 380 + 591 + (t - 45) * 6), Image.BICUBIC)
        bg = bg.filter(ImageFilter.GaussianBlur(3))
        img.paste(Image.blend(Image.new("RGB", (W, H)), bg, 0.28 * a), (0, 0))
        text(img, "BEYOND", mont(96), W / 2 - 12, 270, a, anchor="r", track=4)
        text(img, "WORDS", mont(96), W / 2 + 12, 270, a, anchor="l", color=RED, track=4)
        text(img, "11.22 SUN", mont(76, 700), W / 2, 450, a, track=6)
        text(img, "14:00 – 16:00", mont(44, 500), W / 2, 530, a, track=8)
        d = ImageDraw.Draw(img)
        d.rectangle((W / 2 - 1, 610, W / 2 + 1, 760), fill=RED + (int(255 * a),))
        text(img, "原宿 HOW’z Cafe", sans(50, 700), W / 2 - 60, 655, a, anchor="r", track=2)
        text(img, "東急プラザ原宿 3F", sans(28, 400), W / 2 - 60, 720, a * 0.8, anchor="r", track=4)
        text(img, "参加費 5,500円", sans(50, 700), W / 2 + 60, 655, a, anchor="l", track=2)
        text(img, "軽食・ドリンク付き", sans(28, 400), W / 2 + 60, 720, a * 0.8, anchor="l", track=4)
        text(img, "英語が得意じゃなくても、大丈夫。", serif(36), W / 2, 855, a * env(t, 46.2, DUR + 1, 0.8, 0.1), track=10)

    # 黒帯
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, BAR), fill=(0, 0, 0, 255))
    d.rectangle((0, H - BAR, W, H), fill=(0, 0, 0, 255))
    return img


# ---------- 仕上げ（グレイン・ビネット） ----------
rng = np.random.default_rng(3)
GRAIN = [rng.normal(0, 7, (H, W, 1)).astype(np.float32) for _ in range(6)]
yy, xx = np.mgrid[0:H, 0:W]
VIG = (1 - 0.35 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) ** 1.2)[..., None].astype(np.float32)


def finish(img, n):
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    a = a * VIG + GRAIN[n % 6]
    return np.clip(a, 0, 255).astype(np.uint8)


def main():
    if "--preview" in sys.argv:
        ts = [float(x) for x in sys.argv[sys.argv.index("--preview") + 1].split(",")]
        for t in ts:
            Image.fromarray(finish(scene(t), 0)).resize((960, 540)).save(f"{OUT}_{t:05.1f}.png")
        return
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-i", AUDIO, "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for n in range(int(DUR * FPS)):
        p.stdin.write(finish(scene(n / FPS), n).tobytes())
    p.stdin.close()
    p.wait()


if __name__ == "__main__":
    main()
