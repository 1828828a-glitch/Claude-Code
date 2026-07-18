"""コラージュ風動画ジェネレーター

スクラップブック調のコラージュアニメーション動画を生成する。
クラフト紙の背景に、ポラロイド風の写真がマスキングテープで
ペタペタ貼られていくスタイル。

使い方:
    python3 make_collage_video.py [写真フォルダ] [出力ファイル.mp4]

写真フォルダを省略(または空)の場合は、プレースホルダー画像を
自動生成してデモ動画を作る。自分の写真を使うときは、jpg/png を
入れたフォルダを渡すだけでよい。
"""

import math
import os
import random
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 720
FPS = 30
DURATION = 10.0  # 秒

KRAFT = (214, 192, 160)  # クラフト紙の色
JP_FONT = "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf"

TAPE_COLORS = [
    (240, 180, 190, 200),  # ピンク
    (170, 210, 230, 200),  # 水色
    (250, 225, 150, 200),  # 黄色
    (185, 225, 180, 200),  # 黄緑
]


def ease_out_back(t: float) -> float:
    """勢いよく置いて少し戻る、貼り付けらしいイージング。"""
    c1, c3 = 1.70158, 2.70158
    t -= 1
    return 1 + c3 * t**3 + c1 * t**2


def make_paper_background(rng: random.Random) -> Image.Image:
    """ノイズ入りクラフト紙の背景。"""
    noise = np.random.default_rng(rng.randint(0, 9999)).normal(0, 9, (H, W, 1))
    base = np.array(KRAFT, dtype=np.float64) + noise
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB")
    # 薄い繊維っぽい模様
    draw = ImageDraw.Draw(img, "RGBA")
    for _ in range(300):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        a = rng.uniform(0, math.tau)
        r = rng.uniform(4, 18)
        draw.line(
            [x, y, x + r * math.cos(a), y + r * math.sin(a)],
            fill=(255, 255, 255, 14), width=1,
        )
    return img.filter(ImageFilter.GaussianBlur(0.4))


def make_placeholder_photo(i: int, rng: random.Random) -> Image.Image:
    """写真が無いときに使う抽象的なプレースホルダー画像。"""
    w, h = 360, 300
    palettes = [
        [(255, 140, 105), (255, 200, 120)],
        [(100, 160, 220), (170, 220, 240)],
        [(140, 200, 140), (230, 240, 180)],
        [(200, 140, 200), (250, 200, 220)],
        [(240, 200, 100), (250, 240, 190)],
        [(120, 130, 200), (200, 210, 250)],
    ]
    c1, c2 = palettes[i % len(palettes)]
    grad = np.linspace(0, 1, h)[:, None, None]
    arr = (np.array(c1) * (1 - grad) + np.array(c2) * grad).astype(np.uint8)
    img = Image.fromarray(np.broadcast_to(arr, (h, w, 3)).copy(), "RGB")
    draw = ImageDraw.Draw(img, "RGBA")
    # 適当な図形で「写真らしさ」を出す
    for _ in range(6):
        x, y = rng.uniform(0, w), rng.uniform(0, h)
        r = rng.uniform(15, 70)
        col = (255, 255, 255, rng.randint(30, 90))
        if rng.random() < 0.5:
            draw.ellipse([x - r, y - r, x + r, y + r], fill=col)
        else:
            draw.rectangle([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=col)
    return img


def load_photos(folder: str | None, rng: random.Random, n: int = 6) -> list[Image.Image]:
    photos = []
    if folder and os.path.isdir(folder):
        for name in sorted(os.listdir(folder)):
            if name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                photos.append(Image.open(os.path.join(folder, name)).convert("RGB"))
    if not photos:
        photos = [make_placeholder_photo(i, rng) for i in range(n)]
    return photos[:n]


def make_polaroid(photo: Image.Image, rng: random.Random) -> Image.Image:
    """写真をポラロイド風フレーム+マスキングテープ付きのRGBA素材にする。"""
    pw = 340
    ph = int(pw * 0.82)
    photo = photo.copy()
    photo.thumbnail((pw * 2, ph * 2))
    # 中央クロップ
    photo = photo.resize(
        (pw, ph),
        Image.LANCZOS,
        box=_center_crop_box(photo.size, pw / ph),
    )
    m, bottom = 16, 52
    card = Image.new("RGBA", (pw + m * 2, ph + m + bottom), (252, 250, 244, 255))
    card.paste(photo, (m, m))

    # マスキングテープを上部に1〜2枚
    tape_color = rng.choice(TAPE_COLORS)
    for cx in ([card.width // 2] if rng.random() < 0.5
               else [int(card.width * 0.18), int(card.width * 0.82)]):
        tape = Image.new("RGBA", (110, 34), tape_color)
        tape = tape.rotate(rng.uniform(-25, 25), expand=True,
                           resample=Image.BICUBIC)
        card.alpha_composite(tape, (cx - tape.width // 2, -6))
    return card


def _center_crop_box(size, aspect):
    w, h = size
    if w / h > aspect:
        nw = int(h * aspect)
        return ((w - nw) // 2, 0, (w + nw) // 2, h)
    nh = int(w / aspect)
    return (0, (h - nh) // 2, w, (h + nh) // 2)


def make_title(text: str) -> Image.Image:
    """破いた紙の上にタイトル文字を載せた素材。"""
    font = ImageFont.truetype(JP_FONT, 44)
    tmp = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    bbox = tmp.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = 30
    img = Image.new("RGBA", (tw + pad * 2, th + pad * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # ギザギザの紙
    rng = random.Random(7)
    pts = []
    for x in range(0, img.width + 1, 14):
        pts.append((x, rng.uniform(2, 10)))
    for x in range(img.width, -1, -14):
        pts.append((x, img.height - rng.uniform(2, 10)))
    draw.polygon(pts, fill=(255, 253, 245, 255))
    draw.text((pad - bbox[0], pad - bbox[1]), text,
              font=font, fill=(70, 60, 50, 255))
    return img


def with_shadow(img: Image.Image, offset=(6, 8)) -> Image.Image:
    """RGBA素材にドロップシャドウを付ける。"""
    pad = 30
    out = Image.new("RGBA",
                    (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", out.size, (0, 0, 0, 0))
    alpha = img.split()[3].point(lambda a: int(a * 0.45))
    shadow.paste((30, 20, 10, 255), (pad + offset[0], pad + offset[1]),
                 alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    out.alpha_composite(shadow)
    out.alpha_composite(img, (pad, pad))
    return out


def main():
    photo_dir = sys.argv[1] if len(sys.argv) > 1 else None
    out_path = sys.argv[2] if len(sys.argv) > 2 else "collage.mp4"
    rng = random.Random(42)

    bg = make_paper_background(rng)
    photos = load_photos(photo_dir, rng)

    # 各素材の配置(位置・角度・登場時刻)
    slots = [(215, 200), (640, 165), (1065, 210),
             (240, 520), (660, 545), (1060, 500)]
    elements = []
    for i, photo in enumerate(photos):
        card = with_shadow(make_polaroid(photo, rng))
        elements.append({
            "img": card,
            "pos": (slots[i][0] + rng.randint(-25, 25),
                    slots[i][1] + rng.randint(-20, 20)),
            "angle": rng.uniform(-9, 9),
            "t0": 0.7 + i * 1.05,
            "wobble": rng.uniform(0, math.tau),
        })
    title = with_shadow(make_title("わたしのコラージュ"), offset=(4, 5))
    elements.append({
        "img": title, "pos": (W // 2, 368),
        "angle": -2.5, "t0": 7.4, "wobble": 0.0,
    })

    ffmpeg = _find_ffmpeg()
    proc = subprocess.Popen(
        [ffmpeg, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20",
         "-movflags", "+faststart", out_path],
        stdin=subprocess.PIPE, stderr=subprocess.DEVNULL,
    )

    n_frames = int(DURATION * FPS)
    for f in range(n_frames):
        t = f / FPS
        frame = bg.convert("RGBA")
        for el in elements:
            dt = t - el["t0"]
            if dt < 0:
                continue
            appear = 0.45  # 登場アニメーションの長さ(秒)
            if dt < appear:
                p = ease_out_back(dt / appear)
                scale = 1.6 - 0.6 * p
                angle = el["angle"] + (1 - p) * 14
                alpha = min(1.0, dt / (appear * 0.4))
            else:
                scale, angle, alpha = 1.0, el["angle"], 1.0
            # 貼られた後もわずかに揺れる
            angle += 0.5 * math.sin(t * 1.2 + el["wobble"])

            img = el["img"]
            if scale != 1.0:
                img = img.resize((int(img.width * scale),
                                  int(img.height * scale)), Image.BICUBIC)
            img = img.rotate(angle, expand=True, resample=Image.BICUBIC)
            if alpha < 1.0:
                img = img.copy()
                img.putalpha(img.split()[3].point(lambda a: int(a * alpha)))
            frame.alpha_composite(
                img, (el["pos"][0] - img.width // 2,
                      el["pos"][1] - img.height // 2))

        # 全体をゆっくりズームインして手作り感の中に動きを出す
        zoom = 1.0 + 0.035 * (f / n_frames)
        zw, zh = int(W / zoom), int(H / zoom)
        frame = frame.crop(((W - zw) // 2, (H - zh) // 2,
                            (W + zw) // 2, (H + zh) // 2))
        frame = frame.resize((W, H), Image.BICUBIC).convert("RGB")
        proc.stdin.write(frame.tobytes())
        if f % FPS == 0:
            print(f"  {t:.0f}s / {DURATION:.0f}s")

    proc.stdin.close()
    proc.wait()
    print(f"完成: {out_path}")


def _find_ffmpeg() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return "ffmpeg"


if __name__ == "__main__":
    main()
