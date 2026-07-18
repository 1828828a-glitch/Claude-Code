"""ペーパーコラージュ風 解説動画「豊福の器が、crackの未来を動かす」

絵コンテ(約60秒・6シーン)に沿って、紙の切り抜き+マスキングテープ+
破り紙テロップのコラージュアニメーションを生成する。
人物は参照ビジュアル(黒シャツ・黒髪短髪)に寄せたペーパーカット風
イラストで描画。BGM(やわらかいコード進行)を自動生成し、edge-tts
(ja-JP-KeitaNeural)によるナレーション音声をダッキング付きでミックス
する。edge-ttsが使えない環境では自動的にBGMのみになる。

使い方:
    python3 toyofuku_birthday.py [出力ファイル.mp4]
"""

import math
import os
import random
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 720
FPS = 30
DURATION = 69.0
SR = 22050

JP_FONT = "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf"
EN_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

TAPE_COLORS = [
    (240, 180, 190, 205), (170, 210, 230, 205),
    (250, 225, 150, 205), (185, 225, 180, 205),
]


# ---------------------------------------------------------------- 基本素材

def ease_out_back(t):
    c1, c3 = 1.70158, 2.70158
    t -= 1
    return 1 + c3 * t**3 + c1 * t**2


def pop(t, t0, dur=0.45):
    """貼り付けアニメの (scale, alpha, angle_offset)。開始前は None。"""
    dt = t - t0
    if dt < 0:
        return None
    if dt >= dur:
        return (1.0, 1.0, 0.0)
    p = ease_out_back(dt / dur)
    return (0.55 + 0.45 * p, min(1.0, dt / (dur * 0.5)), (1 - p) * 10)


def text_img(text, size, color=(60, 50, 40, 255), font_path=JP_FONT):
    font = ImageFont.truetype(font_path, size)
    d = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    b = d.textbbox((0, 0), text, font=font)
    img = Image.new("RGBA", (b[2] - b[0] + 4, b[3] - b[1] + 4), (0, 0, 0, 0))
    ImageDraw.Draw(img).text((2 - b[0], 2 - b[1]), text, font=font, fill=color)
    return img


def torn_paper(w, h, seed, color=(255, 252, 244, 255)):
    """周囲がギザギザの破り紙。"""
    rng = random.Random(seed)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    pts = []
    step = 13
    for x in range(6, w - 6, step):
        pts.append((x + rng.uniform(-3, 3), 6 + rng.uniform(-4, 4)))
    for y in range(6, h - 6, step):
        pts.append((w - 6 + rng.uniform(-4, 4), y))
    for x in range(w - 6, 6, -step):
        pts.append((x, h - 6 + rng.uniform(-4, 4)))
    for y in range(h - 6, 6, -step):
        pts.append((6 + rng.uniform(-4, 4), y))
    ImageDraw.Draw(img).polygon(pts, fill=color)
    return img


def with_shadow(img, offset=(5, 7), opacity=0.4, blur=6):
    pad = 26
    out = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2),
                    (0, 0, 0, 0))
    shadow = Image.new("RGBA", out.size, (0, 0, 0, 0))
    alpha = img.split()[3].point(lambda a: int(a * opacity))
    shadow.paste((35, 25, 12, 255), (pad + offset[0], pad + offset[1]), alpha)
    out.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(blur)))
    out.alpha_composite(img, (pad, pad))
    return out


def cutout(img, border=6, shadow=True):
    """切り抜き素材らしい白フチ+影を付ける。"""
    pad = border + 2
    base = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2),
                     (0, 0, 0, 0))
    base.alpha_composite(img, (pad, pad))
    dil = base.split()[3].filter(ImageFilter.MaxFilter(border * 2 + 1))
    white = Image.new("RGBA", base.size, (255, 254, 248, 255))
    white.putalpha(dil)
    white.alpha_composite(base)
    return with_shadow(white) if shadow else white


def telop(text, size=38, paper=(255, 252, 244, 255), color=(60, 50, 40, 255),
          pad=24, font_path=JP_FONT):
    ti = text_img(text, size, color, font_path)
    p = torn_paper(ti.width + pad * 2, ti.height + pad * 2,
                   abs(hash(text)) % 9999, paper)
    p.alpha_composite(ti, (pad, pad))
    return with_shadow(p, offset=(4, 5))


def tape(width=100, color=None, seed=0):
    rng = random.Random(seed)
    color = color or rng.choice(TAPE_COLORS)
    t = Image.new("RGBA", (width, 30), color)
    return t.rotate(rng.uniform(-30, 30), expand=True, resample=Image.BICUBIC)


def card(text, size=30, paper=None, seed=0):
    """小さめのラベル入りカード(相談/ラーメン等)。"""
    rng = random.Random(seed)
    paper = paper or rng.choice([
        (255, 240, 214, 255), (222, 238, 249, 255), (232, 244, 222, 255),
        (250, 227, 231, 255), (245, 238, 220, 255),
    ])
    ti = text_img(text, size)
    c = torn_paper(ti.width + 36, ti.height + 30, seed + 31, paper)
    c.alpha_composite(ti, (18, 15))
    return cutout(c, border=4)


# ---------------------------------------------------------------- 人物

def person(shirt=(32, 32, 37), skin=(243, 209, 180), hair=(20, 18, 17),
           smile=True, arms="down", scale=1.0):
    """ペーパーカット風の人物(正面)。"""
    S = 2
    w, h = 190, 330
    img = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def E(box, fill):
        d.ellipse([v * S for v in box], fill=fill)

    def R(box, fill, r=10):
        d.rounded_rectangle([v * S for v in box], radius=r * S, fill=fill)

    cx = w / 2
    arm = tuple(min(255, v + 26) for v in shirt)
    pants = (24, 24, 27)
    R([cx - 32, 195, cx - 8, 302], pants, r=9)
    R([cx + 8, 195, cx + 32, 302], pants, r=9)
    E([cx - 40, 292, cx - 4, 314], (14, 14, 15))
    E([cx + 4, 292, cx + 40, 314], (14, 14, 15))

    if arms == "up":
        R([cx - 72, 62, cx - 52, 145], arm, r=10)
        R([cx + 52, 62, cx + 72, 145], arm, r=10)
        E([cx - 74, 46, cx - 52, 68], skin)
        E([cx + 52, 46, cx + 74, 68], skin)
    else:
        R([cx - 64, 132, cx - 44, 218], arm, r=10)
        R([cx + 44, 132, cx + 64, 218], arm, r=10)
        E([cx - 63, 208, cx - 45, 228], skin)
        E([cx + 45, 208, cx + 63, 228], skin)

    R([cx - 48, 120, cx + 48, 212], shirt, r=16)
    # インナーTシャツの首元(少し明るい黒)
    d.polygon([(cx - 16) * S, 122 * S, (cx + 16) * S, 122 * S,
               cx * S, 140 * S], fill=(55, 55, 60))

    E([cx - 38, 24, cx + 38, 102], skin)              # 顔
    d.pieslice([(cx - 40) * S, 18 * S, (cx + 40) * S, 88 * S],
               180, 360, fill=hair)                    # 髪
    d.polygon([(cx - 40) * S, 53 * S, (cx - 30) * S, 53 * S,
               (cx - 36) * S, 68 * S], fill=hair)      # もみあげ
    d.polygon([(cx + 30) * S, 53 * S, (cx + 40) * S, 53 * S,
               (cx + 36) * S, 68 * S], fill=hair)

    brow = (45, 33, 27)
    d.line([(cx - 26) * S, 50 * S, (cx - 9) * S, 48 * S], fill=brow, width=3 * S)
    d.line([(cx + 9) * S, 48 * S, (cx + 26) * S, 50 * S], fill=brow, width=3 * S)
    if smile:
        d.arc([(cx - 25) * S, 54 * S, (cx - 8) * S, 68 * S],
              200, 340, fill=brow, width=3 * S)
        d.arc([(cx + 8) * S, 54 * S, (cx + 25) * S, 68 * S],
              200, 340, fill=brow, width=3 * S)
        d.arc([(cx - 14) * S, 68 * S, (cx + 14) * S, 88 * S],
              15, 165, fill=(150, 80, 70), width=4 * S)
    else:
        E([cx - 21, 57, cx - 12, 66], brow)
        E([cx + 12, 57, cx + 21, 66], brow)
        d.line([(cx - 9) * S, 81 * S, (cx + 9) * S, 81 * S],
               fill=(140, 75, 65), width=3 * S)
    E([cx - 32, 68, cx - 22, 76], (247, 180, 160))    # 頬
    E([cx + 22, 68, cx + 32, 76], (247, 180, 160))

    img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    return cutout(img, border=5)


COLLEAGUE_SHIRTS = [(92, 132, 182), (122, 162, 112), (202, 132, 142),
                    (212, 172, 92), (142, 122, 182), (95, 165, 160)]


# ---------------------------------------------------------------- 背景等

def paper_bg(color, seed):
    rng = random.Random(seed)
    noise = np.random.default_rng(seed).normal(0, 8, (H, W, 1))
    base = np.array(color, dtype=np.float64) + noise
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB")
    d = ImageDraw.Draw(img, "RGBA")
    for _ in range(260):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        a = rng.uniform(0, math.tau)
        r = rng.uniform(4, 16)
        d.line([x, y, x + r * math.cos(a), y + r * math.sin(a)],
               fill=(255, 255, 255, 13), width=1)
    # 白マーカーの手描き飾り
    for _ in range(7):
        x, y = rng.uniform(40, W - 40), rng.uniform(40, H - 40)
        k = rng.random()
        col = (255, 255, 255, 60)
        if k < 0.4:   # 十字のキラキラ
            s = rng.uniform(7, 13)
            d.line([x - s, y, x + s, y], fill=col, width=3)
            d.line([x, y - s, x, y + s], fill=col, width=3)
        elif k < 0.7:
            s = rng.uniform(6, 11)
            d.ellipse([x - s, y - s, x + s, y + s], outline=col, width=3)
        else:
            d.arc([x - 16, y - 8, x + 16, y + 8], 200, 340, fill=col, width=3)
    return img.filter(ImageFilter.GaussianBlur(0.4)).convert("RGBA")


def bubble(text, size=34, tail="down"):
    ti = text_img(text, size)
    w, h = ti.width + 56, ti.height + 44
    img = Image.new("RGBA", (w, h + 26), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([2, 2, w - 2, h - 2], radius=24,
                        fill=(255, 254, 248, 255))
    if tail == "down":
        d.polygon([w * 0.42, h - 6, w * 0.58, h - 6, w * 0.46, h + 22],
                  fill=(255, 254, 248, 255))
    img.alpha_composite(ti, (28, 22))
    return with_shadow(img, offset=(4, 5))


def place(frame, img, center, t, seed=1, angle=0.0, scale=1.0, alpha=1.0,
          wobble=True):
    """要素をコマ撮り風の微妙な揺れ付きで貼る。"""
    if wobble:
        step = int(t * 6)
        r = random.Random(seed * 7919 + step)
        angle += r.uniform(-1.1, 1.1)
        dx, dy = r.randint(-2, 2), r.randint(-2, 2)
    else:
        dx = dy = 0
    if scale != 1.0:
        img = img.resize((max(1, int(img.width * scale)),
                          max(1, int(img.height * scale))), Image.BICUBIC)
    if angle:
        img = img.rotate(angle, expand=True, resample=Image.BICUBIC)
    if alpha < 1.0:
        img = img.copy()
        img.putalpha(img.split()[3].point(lambda a: int(a * alpha)))
    frame.alpha_composite(img, (int(center[0] - img.width / 2 + dx),
                                int(center[1] - img.height / 2 + dy)))


def popped(frame, img, center, t, t0, seed=1, angle=0.0, dur=0.45):
    st = pop(t, t0, dur)
    if st:
        place(frame, img, center, t, seed, angle + st[2], st[0], st[1])


# ---------------------------------------------------------------- ナレーション

NARRATION = [
    (0.5, 7.5, "crackという会社には、人一倍、大きな器を持つ男がいる。"),
    (8.3, 13.0, "誰かの失敗も、迷いも、弱さも、すぐには否定しない。"),
    (13.0, 17.7, "事情まで想像して、まず受け止めてくれる。"),
    (18.3, 23.0, "その許容力が、人を守り、挑戦する余白をつくり、"),
    (23.0, 27.7, "crackらしい温度を育ててきた。"),
    (28.3, 33.2, "でも、何でも入る大きな器には、つい入れすぎてしまう。"),
    (33.2, 37.9, "思いも、決断も、次の一歩も、豊福の中で渋滞する。"),
    (38.3, 44.4, "だからこれからの一年は、受け止めたものを形にする一年であってほしい。"),
    (44.4, 49.8, "完璧になる前に出す。決めたら動く。そして、仲間に任せる。"),
    (50.3, 55.2, "これまで、crackも、社外も、何度も豊福に受け止めてもらった。"),
    (55.2, 58.4, "今度は私たちが、その大きな器を支える番だ。"),
    (58.4, 62.3, "豊福の決断が、crackの未来を動かす一年になりますように。"),
]

SHOUT_T = 62.5
SHOUT_TEXT = "豊福、誕生日おめでとう！"


def make_subtitles():
    subs = []
    for s, e, txt in NARRATION:
        ti = text_img(txt, 25, (255, 255, 252, 255))
        box = Image.new("RGBA", (ti.width + 34, ti.height + 18), (0, 0, 0, 0))
        ImageDraw.Draw(box).rounded_rectangle(
            [0, 0, box.width - 1, box.height - 1], radius=12,
            fill=(50, 42, 34, 200))
        box.alpha_composite(ti, (17, 9))
        subs.append((s, e, box))
    return subs


# ---------------------------------------------------------------- 音声

def make_music(dur=DURATION):
    t = np.arange(int(SR * dur)) / SR
    audio = np.zeros_like(t)
    # C - G - Am - F をやわらかい音色で
    chords = [(261.6, 329.6, 392.0), (196.0, 246.9, 392.0),
              (220.0, 261.6, 329.6), (174.6, 220.0, 349.2)]
    beat = 2.0
    for i in range(int(dur / beat) + 1):
        chord = chords[i % 4]
        start = i * beat
        seg = (t >= start) & (t < start + beat)
        ts = t[seg] - start
        env = np.minimum(ts / 0.5, 1) * np.exp(-ts / 1.7) * 0.11
        for f in chord:
            audio[seg] += env * np.sin(2 * math.pi * f * ts)
            audio[seg] += 0.28 * env * np.sin(2 * math.pi * f * 2 * ts)
        audio[seg] += 0.14 * np.exp(-ts / 1.3) * np.sin(
            2 * math.pi * chord[0] / 2 * ts)
    # ラストのキラキラ
    rng = np.random.default_rng(3)
    for _ in range(35):
        st = 50.5 + rng.uniform(0, dur - 52.5)
        f = rng.uniform(900, 2600)
        seg = (t >= st) & (t < st + 0.5)
        ts = t[seg] - st
        audio[seg] += 0.05 * np.exp(-ts / 0.12) * np.sin(2 * math.pi * f * ts)
    return audio


def _decode_audio(path):
    raw = subprocess.run(
        [find_ffmpeg(), "-i", path, "-f", "s16le", "-ac", "1",
         "-ar", str(SR), "-"],
        capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768


def synth_narration(cache_dir):
    """edge-ttsでナレーション音声を生成する(キャッシュあり)。

    ネットワークやパッケージが無い環境では None を返し、BGMのみになる。
    戻り値: [(開始秒, 最大尺, mp3パス), ...]
    """
    try:
        import asyncio
        import edge_tts
    except ImportError:
        print("※ edge-tts が無いためナレーションなし (pip install edge-tts)")
        return None
    os.makedirs(cache_dir, exist_ok=True)
    starts = [s for s, _, _ in NARRATION] + [SHOUT_T, DURATION - 1.2]
    items = []
    for i, (s, _, text) in enumerate(NARRATION):
        items.append((s, starts[i + 1] - s - 0.15, text, "-4%"))
    items.append((SHOUT_T, DURATION - 1.2 - SHOUT_T, SHOUT_TEXT, "+8%"))

    async def gen(text, rate, path):
        c = edge_tts.Communicate(text, voice="ja-JP-KeitaNeural", rate=rate)
        await c.save(path)

    result = []
    for i, (s, max_len, text, rate) in enumerate(items):
        path = os.path.join(cache_dir, f"line{i:02d}.mp3")
        if not os.path.exists(path) or os.path.getsize(path) == 0:
            try:
                asyncio.run(gen(text, rate, path))
            except Exception as e:
                print(f"※ ナレーション生成に失敗: {e}")
                return None
        result.append((s, max_len, path))
    return result


def build_audio(path):
    """BGM+ナレーションをミックスしてwavに書き出す。"""
    n = int(SR * DURATION)
    music = make_music(DURATION)[:n]
    narr = np.zeros(n)
    duck = np.ones(n)
    cache = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         "narration_cache")
    items = synth_narration(cache)
    if items:
        for s, max_len, p in items:
            seg = _decode_audio(p)
            dur = len(seg) / SR
            if dur > max_len:  # 枠に収まらない行は少しだけ早口に
                tempo = min(1.4, dur / max_len)
                fit = p + ".fit.wav"
                subprocess.run([find_ffmpeg(), "-y", "-i", p, "-filter:a",
                                f"atempo={tempo:.3f}", fit],
                               capture_output=True)
                seg = _decode_audio(fit)
                os.remove(fit)
            i0 = int(s * SR)
            i1 = min(n, i0 + len(seg))
            narr[i0:i1] += seg[:i1 - i0]
            duck[i0:i1] = 0.42
        k = int(SR * 0.25)
        duck = np.convolve(duck, np.ones(k) / k, "same")
    fade = np.minimum(1, np.minimum(np.arange(n) / SR / 1.5,
                                    (DURATION - np.arange(n) / SR) / 2.0))
    mix = np.tanh(music * 0.8 * duck + narr * 1.15) * 0.9 * fade
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())


# ---------------------------------------------------------------- 各シーン

class Assets:
    def __init__(self):
        self.bg = [
            paper_bg((214, 192, 160), 11), paper_bg((238, 228, 205), 22),
            paper_bg((232, 214, 185), 33), paper_bg((207, 214, 217), 44),
            paper_bg((241, 231, 201), 55), paper_bg((219, 196, 168), 66),
        ]
        self.main = person(smile=True)
        self.main_serious = person(smile=False)
        self.main_up = person(smile=True, arms="up")
        self.colleagues = [person(shirt=c, hair=(40, 30, 24), scale=0.82)
                           for c in COLLEAGUE_SHIRTS]
        self.colleagues_up = [person(shirt=c, hair=(40, 30, 24), arms="up",
                                     scale=0.82) for c in COLLEAGUE_SHIRTS]
        # S1: 名前・肩書き
        self.t_name = telop("豊福竜大", 56)
        self.t_title = telop("crack株式会社 取締役", 30)
        # 写真フレーム風カード(人物入り)
        fr = torn_paper(300, 400, 5, (255, 253, 246, 255))
        p = person(scale=1.0)
        fr.alpha_composite(p.resize((int(p.width * 0.78),
                                     int(p.height * 0.78)), Image.LANCZOS),
                           (28, 30))
        fr.alpha_composite(tape(120, seed=2), (95, -8))
        self.photo_card = with_shadow(fr)
        # S2
        self.t_thanks = telop("いつも、許容してくれてありがとう。", 36)
        self.bub_dots = bubble("……", 30)
        self.bub_bang = bubble("！", 30)
        self.heart = self._heart()
        # S3
        self.t_kyoyo = telop("人を許せる会社は、人が挑戦できる会社。", 34)
        self.s3_cards = [card(s, 26, seed=100 + i) for i, s in enumerate(
            ["挑戦", "失敗", "迷い", "相談", "新規案件", "アイデア", "夢", "人"])]
        self.circle = self._big_circle()
        # S4
        self.s4_labels = ["相談", "仕事", "コーラ", "ポテチ",
                          "ラーメン", "アイデア", "判断", "焼肉"]
        self.s4_cards = [card(s, 28, seed=200 + i)
                         for i, s in enumerate(self.s4_labels)]
        self.t_max = telop("許容力、最大。", 40)
        self.t_zanryo = telop("空き容量、残りわずか。", 40,
                              color=(180, 50, 40, 255))
        self.bowl = self._bowl(500, 240)
        self.bowl_s = self._bowl(360, 175)
        # S5
        self.t_kess = telop("許容から、決断へ。", 40)
        self.t_out = telop("蓄積から、アウトプットへ。", 40)
        self.s5_cards = [card(s, 32, seed=300 + i) for i, s in enumerate(
            ["言葉", "企画", "決断", "行動"])]
        self.orb = self._orb()
        # S6
        self.bub_hb = bubble("豊福、誕生日おめでとう！", 40)
        self.t_fin1 = telop("抱える役員から、未来を放つ役員へ。", 36)
        self.t_hb = telop("HAPPY BIRTHDAY TOYOFUKU", 52,
                          color=(200, 90, 60, 255), font_path=EN_FONT)
        self.confetti = self._confetti()
        self.subs = make_subtitles()

    @staticmethod
    def _heart():
        img = Image.new("RGBA", (90, 90), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.ellipse([10, 14, 46, 50], fill=(235, 110, 120, 255))
        d.ellipse([44, 14, 80, 50], fill=(235, 110, 120, 255))
        d.polygon([13, 40, 77, 40, 45, 82], fill=(235, 110, 120, 255))
        return cutout(img, border=4)

    @staticmethod
    def _big_circle():
        s = 560
        img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        ImageDraw.Draw(img).ellipse([6, 6, s - 6, s - 6],
                                    fill=(250, 214, 130, 120),
                                    outline=(235, 185, 90, 220), width=10)
        return img

    @staticmethod
    def _bowl(w, h):
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.pieslice([4, -h + 30, w - 4, h - 4], 0, 180, fill=(172, 122, 86, 255))
        d.ellipse([4, 8, w - 4, 62], fill=(120, 82, 55, 255))
        d.ellipse([4, 8, w - 4, 62], outline=(196, 148, 108, 255), width=8)
        return cutout(img, border=6)

    @staticmethod
    def _orb():
        img = Image.new("RGBA", (90, 90), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.ellipse([15, 15, 75, 75], fill=(255, 235, 140, 230))
        img = img.filter(ImageFilter.GaussianBlur(7))
        d = ImageDraw.Draw(img)
        d.ellipse([30, 30, 60, 60], fill=(255, 250, 210, 255))
        return img

    @staticmethod
    def _confetti():
        rng = random.Random(9)
        pieces = []
        for _ in range(70):
            pieces.append({
                "x": rng.uniform(0, W), "speed": rng.uniform(70, 160),
                "phase": rng.uniform(0, H), "size": rng.uniform(6, 13),
                "color": rng.choice([(235, 110, 120), (250, 214, 110),
                                     (120, 190, 160), (120, 160, 220),
                                     (240, 170, 120)]),
                "sway": rng.uniform(20, 45), "w": rng.uniform(1, 3),
            })
        return pieces


def scene1(A, frame, t):
    popped(frame, A.photo_card, (330, 350), t, 0.6, seed=11, angle=-3)
    popped(frame, A.t_name, (870, 300), t, 1.8, seed=12, angle=-2)
    popped(frame, A.t_title, (880, 400), t, 2.4, seed=13, angle=1.5)


def scene2(A, frame, t):
    lt = t - 8.0
    popped(frame, A.colleagues[0], (300, 430), t, 8.3, seed=21, angle=-2)
    popped(frame, A.colleagues[1], (480, 450), t, 8.6, seed=22, angle=2)
    nod = 2.2 * math.sin(lt * 2.2)
    popped(frame, A.main, (900, 420), t, 8.9, seed=23, angle=nod)
    if lt > 1.6 and (int(lt / 1.4) % 2 == 0):
        place(frame, A.bub_dots, (330, 240), t, seed=24)
    elif lt > 1.6:
        place(frame, A.bub_bang, (510, 260), t, seed=25)
    popped(frame, A.heart, (760, 250), t, 12.0, seed=26, angle=8)
    popped(frame, A.t_thanks, (640, 110), t, 13.6, seed=27, angle=-1.5)


def scene3(A, frame, t):
    lt = t - 18.0
    pulse = 1.0 + 0.03 * math.sin(lt * 1.8)
    st = pop(t, 18.4, 0.6)
    if st:
        place(frame, A.circle, (640, 330), t, seed=31,
              scale=st[0] * pulse, alpha=st[1], wobble=False)
    rng = random.Random(8)
    for i, c in enumerate(A.s3_cards):
        t0 = 19.0 + i * 0.7
        ang0 = i * math.tau / len(A.s3_cards) + rng.uniform(-0.25, 0.25)
        angc = rng.uniform(-8, 8)
        r1 = 105 + (i % 3) * 48
        dt = t - t0
        if dt < 0:
            continue
        # 画面外から円の内側へ吸い込まれ、そのまま包まれて留まる
        p = min(1.0, dt / 2.0)
        p = 1 - (1 - p) ** 2
        r = 620 * (1 - p) + r1 * p
        x = 640 + r * math.cos(ang0)
        y = 330 + r * 0.72 * math.sin(ang0)
        place(frame, c, (x, y), t, seed=32 + i, angle=angc)
    popped(frame, A.t_kyoyo, (640, 600), t, 23.4, seed=39, angle=-1)


def scene4(A, frame, t):
    lt = t - 28.0
    popped(frame, A.bowl, (560, 545), t, 28.2, seed=41, dur=0.5)
    tilt = min(6.0, max(0.0, (lt - 2.0)) * 1.1)
    popped(frame, A.main_serious, (1010, 430), t, 28.4, seed=42, angle=tilt)

    slots = [(430, 500), (530, 485), (640, 495), (720, 480),
             (470, 425), (580, 415), (680, 420), (560, 350)]
    landed = 0
    for i, c in enumerate(A.s4_cards):
        t0 = 29.2 + i * 0.85
        dt = t - t0
        if dt < 0:
            continue
        fall = 0.55
        sx, sy = slots[i]
        if dt < fall:
            p = (dt / fall) ** 2
            y = -60 + (sy + 60) * p
            place(frame, c, (sx, y), t, seed=43 + i, angle=(1 - p) * 15 - 5)
        else:
            landed += 1
            place(frame, c, (sx, sy), t, seed=43 + i, angle=(-6 + i * 2))
    # 空き容量ゲージ
    gauge = Image.new("RGBA", (86, 320), (0, 0, 0, 0))
    d = ImageDraw.Draw(gauge)
    d.rounded_rectangle([18, 8, 68, 312], radius=14,
                        fill=(255, 252, 244, 235),
                        outline=(120, 100, 80, 255), width=4)
    frac = landed / len(A.s4_cards)
    if frac > 0:
        hpx = int(292 * frac)
        col = (int(90 + 150 * frac), int(180 - 120 * frac), 70, 255)
        d.rounded_rectangle([24, 306 - hpx, 62, 306], radius=10, fill=col)
    st = pop(t, 28.8, 0.4)
    if st:
        place(frame, with_shadow(gauge, offset=(3, 4)), (1180, 430), t,
              seed=49, scale=st[0], alpha=st[1])
        lab = text_img("空き容量", 22, (70, 58, 46, 255))
        place(frame, lab, (1180, 240), t, seed=50, alpha=st[1])
    popped(frame, A.t_max, (250, 130), t, 31.0, seed=51, angle=-2)
    popped(frame, A.t_zanryo, (295, 220), t, 34.2, seed=52, angle=1.5)


def scene5(A, frame, t):
    lt = t - 38.0
    popped(frame, A.bowl_s, (250, 560), t, 38.2, seed=61, dur=0.5)
    popped(frame, A.main, (110, 450), t, 38.4, seed=62, angle=-2)
    # 光の柱
    glow_a = int(120 * min(1.0, max(0.0, lt - 0.8)))
    if glow_a > 0:
        gl = Image.new("RGBA", (200, 360), (0, 0, 0, 0))
        ImageDraw.Draw(gl).polygon([60, 360, 140, 360, 190, 0, 10, 0],
                                   fill=(255, 240, 160, glow_a))
        gl = gl.filter(ImageFilter.GaussianBlur(16))
        frame.alpha_composite(gl, (150, 140))
    targets = [(640, 250), (860, 380), (1080, 250), (960, 550)]
    for i, c in enumerate(A.s5_cards):
        t0 = 39.5 + i * 1.5
        dt = t - t0
        if dt < 0:
            continue
        fly = 1.1
        if dt < fly:
            p = dt / fly
            p2 = 1 - (1 - p) ** 2
            x0, y0 = 250, 430
            x1, y1 = targets[i]
            x = x0 + (x1 - x0) * p2
            y = y0 + (y1 - y0) * p2 - 180 * math.sin(math.pi * p)
            place(frame, A.orb, (x, y), t, seed=63 + i, wobble=False,
                  scale=1.0 + 0.2 * math.sin(t * 9))
        else:
            st = pop(t, t0 + fly, 0.4)
            if st:
                place(frame, c, targets[i], t, seed=63 + i,
                      angle=(-4 + i * 3) + st[2], scale=st[0], alpha=st[1])
    popped(frame, A.t_kess, (350, 120), t, 44.2, seed=68, angle=-2)
    popped(frame, A.t_out, (860, 120), t, 46.2, seed=69, angle=1.5)


def scene6(A, frame, t):
    lt = t - 50.0
    # 背景の器(大きな円)とヒビ+光
    circle = Image.new("RGBA", (560, 560), (0, 0, 0, 0))
    d = ImageDraw.Draw(circle)
    d.ellipse([10, 10, 550, 550], fill=(150, 106, 74, 255))
    crack_pts = [(280, 20), (300, 120), (255, 210), (295, 300), (265, 390)]
    light_a = int(min(255, max(0, (lt - 1.5) * 130)))
    if light_a > 0:
        d.line(crack_pts, fill=(255, 245, 180, light_a), width=10)
        for px, py in crack_pts[1:4]:
            d.line([px, py, px + 36, py - 18],
                   fill=(255, 245, 180, int(light_a * 0.7)), width=6)
    circle = cutout(circle, border=6)
    st = pop(t, 50.2, 0.5)
    if st:
        place(frame, circle, (640, 330), t, seed=71, scale=st[0],
              alpha=st[1], wobble=False)
    # 光線
    ray_a = int(min(110, max(0, (lt - 2.2) * 70)))
    if ray_a > 0:
        rays = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        rd = ImageDraw.Draw(rays)
        for k in range(10):
            a = k * math.tau / 10 + lt * 0.15
            x1 = 640 + 800 * math.cos(a)
            y1 = 330 + 800 * math.sin(a)
            rd.line([640, 330, x1, y1], fill=(255, 240, 170, ray_a), width=26)
        frame.alpha_composite(rays.filter(ImageFilter.GaussianBlur(10)))
    # 集合
    popped(frame, A.colleagues_up[0], (250, 480), t, 50.9, seed=72, angle=-3)
    popped(frame, A.colleagues_up[1], (430, 510), t, 51.1, seed=73, angle=2)
    popped(frame, A.main_up, (640, 460), t, 50.6, seed=74)
    popped(frame, A.colleagues_up[2], (850, 510), t, 51.3, seed=75, angle=-2)
    popped(frame, A.colleagues_up[3], (1030, 480), t, 51.5, seed=76, angle=3)
    # 紙吹雪
    if lt > 1.0:
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d2 = ImageDraw.Draw(layer)
        for pc in A.confetti:
            y = (pc["phase"] + (lt - 1.0) * pc["speed"]) % (H + 60) - 30
            x = pc["x"] + pc["sway"] * math.sin(lt * pc["w"] + pc["phase"])
            s = pc["size"]
            d2.rectangle([x, y, x + s, y + s * 0.7],
                         fill=pc["color"] + (235,))
        frame.alpha_composite(layer)
    popped(frame, A.bub_hb, (640, 130), t, SHOUT_T, seed=77, dur=0.5)
    # エンディングカード
    if t > 64.6:
        ov = min(1.0, (t - 64.6) / 0.8)
        overlay = Image.new("RGBA", (W, H),
                            (244, 234, 214, int(215 * ov)))
        frame.alpha_composite(overlay)
        popped(frame, A.t_fin1, (640, 460), t, 65.0, seed=78, angle=-1.5)
        st2 = pop(t, 65.8, 0.55)
        if st2:
            place(frame, A.t_hb, (640, 300), t, seed=79,
                  scale=st2[0] * 1.05, alpha=st2[1], angle=st2[2] * 0.3 - 1)


SCENES = [(0, 8, 0, scene1), (8, 18, 1, scene2), (18, 28, 2, scene3),
          (28, 38, 3, scene4), (38, 50, 4, scene5), (50, 69.5, 5, scene6)]


# ---------------------------------------------------------------- メイン

def find_ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return "ffmpeg"


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "toyofuku_birthday.mp4"
    print("素材を準備中...")
    A = Assets()
    music_path = os.path.join(os.path.dirname(os.path.abspath(out_path)) or ".",
                              "_bgm_tmp.wav")
    print("ナレーションとBGMを準備中...")
    build_audio(music_path)

    ffmpeg = find_ffmpeg()
    proc = subprocess.Popen(
        [ffmpeg, "-y",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-",
         "-i", music_path,
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20",
         "-c:a", "aac", "-b:a", "128k", "-shortest",
         "-movflags", "+faststart", out_path],
        stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)

    n_frames = int(DURATION * FPS)
    for f in range(n_frames):
        t = f / FPS
        frame = None
        for s, e, bg_i, fn in SCENES:
            if s <= t < e:
                frame = A.bg[bg_i].copy()
                fn(A, frame, t)
                break
        if frame is None:
            frame = A.bg[-1].copy()
        # 字幕
        for s, e, box in A.subs:
            if s <= t < e:
                a = min(1.0, (t - s) / 0.25, max(0.0, (e - t) / 0.25))
                place(frame, box, (W // 2, 688), t, seed=999,
                      alpha=a, wobble=False)
                break
        # 冒頭フェードイン / 最後フェードアウト
        fade = min(1.0, t / 0.6, max(0.0, (DURATION - t) / 0.7))
        if fade < 1.0:
            white = Image.new("RGBA", (W, H),
                              (248, 242, 230, int(255 * (1 - fade))))
            frame.alpha_composite(white)
        proc.stdin.write(frame.convert("RGB").tobytes())
        if f % (FPS * 5) == 0:
            print(f"  {t:5.1f}s / {DURATION:.0f}s")

    proc.stdin.close()
    proc.wait()
    os.remove(music_path)
    print(f"完成: {out_path}")


if __name__ == "__main__":
    main()
