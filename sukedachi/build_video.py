"""宣伝助太刀のVコンテ（仮音声つき）を、episodeのJSONから書き出す。

使い方:
  python build_video.py episode01.json --assets <素材フォルダ> --out <出力フォルダ>

素材フォルダに置くもの:
  kudo.png / naka.png / kv.png  キャラシートとキービジュアル（4倍アップスケール済み）
  NotoSansJP-500.ttf / NotoSansJP-900.ttf / YujiBoku.ttf
"""
import argparse
import json
import math
import os
import subprocess
import wave

import numpy as np
import pyopenjtalk
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS, SR = 1920, 1080, 30, 48000
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
    "K": {"name": "工藤", "side": "R", "color": (61, 90, 128), "tone": 0.0, "speed": 1.0},
    "N": {"name": "中山", "side": "L", "color": (168, 50, 42), "tone": -4.0, "speed": 0.92},
    "NA": {"name": "中野", "side": "L", "color": (36, 128, 112), "tone": 3.0, "speed": 1.08},
    "S": {"name": "佐伯（ひなた食品）", "side": None, "color": (96, 96, 96), "tone": 5.0, "speed": 1.0},
    "NR": {"name": "ナレーション", "side": None, "color": (176, 136, 52), "tone": -1.0, "speed": 1.0},
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


class Ctx:
    def __init__(self, assets):
        self.assets = assets
        self.fonts = {}
        self.sheets = {k: Image.open(os.path.join(assets, k + ".png")).convert("RGB") for k in ("kudo", "naka", "kv")}
        self.base = make_base_bg()

    def font(self, kind, size):
        key = (kind, size)
        if key not in self.fonts:
            file = {"b": "NotoSansJP-900.ttf", "r": "NotoSansJP-500.ttf", "brush": "YujiBoku.ttf"}[kind]
            self.fonts[key] = ImageFont.truetype(os.path.join(self.assets, file), size)
        return self.fonts[key]

    def char_image(self, key):
        if key == "na":
            return nakano_placeholder(self)
        sheet, box = CROPS[key]
        return self.sheets[sheet].crop(tuple(v * SCALE for v in box))


def make_base_bg():
    im = Image.new("RGB", (W, H), (29, 31, 36))
    d = ImageDraw.Draw(im)
    d.polygon([(1010, 0), (W, 0), (W, H), (880, H)], fill=(58, 70, 86))
    over = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    o = ImageDraw.Draw(over)
    cx, cy = 470, 520
    for i in range(72):
        t = i / 72 * 2 * math.pi
        o.line([(cx + math.cos(t) * 260, cy + math.sin(t) * 260),
                (cx + math.cos(t) * 1600, cy + math.sin(t) * 1600)], fill=GOLD + (34,), width=2)
    for y in range(0, H, 24):
        for x in range(0, W, 24):
            left = x < 1010 - (130 * y / H)
            r = 2.4 if (x // 24 + y // 24) % 2 == 0 else 1.6
            o.ellipse([x - r, y - r, x + r, y + r], fill=(GOLD + (46,)) if left else (CREAM + (34,)))
    for i, (bx, bw, bh) in enumerate([(1180, 110, 330), (1310, 80, 230), (1410, 130, 420), (1560, 90, 280), (1680, 150, 380)]):
        o.rectangle([bx, H - bh, bx + bw, H], outline=CREAM + (40,), width=3)
        for wy in range(H - bh + 24, H - 20, 34):
            for wx in range(bx + 16, bx + bw - 16, 26):
                o.rectangle([wx, wy, wx + 10, wy + 14], outline=CREAM + (36,), width=2)
    im = Image.alpha_composite(im.convert("RGBA"), over)
    d = ImageDraw.Draw(im)
    d.polygon([(997, 0), (1023, 0), (893, H), (867, H)], fill=GOLD)
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


def fit_lines(ctx, text, kind, sizes, max_w, max_lines):
    for size in sizes:
        f = ctx.font(kind, size)
        lines = wrap(text, f, max_w)
        if len(lines) <= max_lines:
            return f, lines
    return f, lines


def header(ctx, fg, episode_tag=True):
    d = ImageDraw.Draw(fg)
    d.polygon([(0, 26), (720, 26), (690, 92), (0, 92)], fill=INK + (235,))
    d.text((44, 59), "企画・宣伝協同組合 ／ 宣伝助太刀 第一話", font=ctx.font("b", 32), fill=CREAM, anchor="lm")
    if episode_tag:
        d.rectangle([W - 380, 36, W - 40, 84], fill=RED + (235,))
        d.text((W - 210, 60), "※架空のモデルケースです", font=ctx.font("b", 26), fill="white", anchor="mm")


def telop(ctx, fg, sp, text, note=None):
    d = ImageDraw.Draw(fg)
    d.polygon([(70, 846), (1850, 826), (1834, 1046), (86, 1056)], fill=INK + (238,), outline=CREAM + (255,))
    ch = CHARS[sp]
    nf = ctx.font("b", 46)
    nw = int(nf.getlength(ch["name"])) + 64
    d.polygon([(96, 786), (96 + nw, 780), (96 + nw - 8, 852), (100, 856)], fill=ch["color"] + (255,))
    d.text((128, 818), ch["name"], font=nf, fill="white", anchor="lm")
    if note:
        d.text((W / 2, 950), note, font=ctx.font("r", 52), fill=(200, 200, 200), anchor="mm")
        return
    f, lines = fit_lines(ctx, text, "b", (60, 54, 48), 1640, 2)
    lh = int(f.size * 1.42)
    y0 = 946 - lh * (len(lines) - 1) / 2
    for i, ln in enumerate(lines):
        d.text((130, y0 + i * lh), ln, font=f, fill="white", anchor="lm", stroke_width=2, stroke_fill=INK)


def layers_talk(ctx, sh, state):
    bg = ctx.base.copy()
    me = CHARS[sh["sp"]]
    side = me["side"]
    other = "R" if side == "L" else "L"
    if state.get(other):
        lis = framed(ctx.char_image(state[other]), 470, 560, -2 if other == "L" else 2)
        dark = Image.new("RGBA", lis.size, (10, 12, 16, 150))
        dark.putalpha(Image.eval(lis.split()[3], lambda a: min(a, 150)))
        lis.alpha_composite(dark)
        x = 1460 - lis.width // 2 if other == "R" else 180
        bg.alpha_composite(lis, (x, 210))
    spk = framed(ctx.char_image(sh["img"]), 700, 880, 1.5 if side == "L" else -1.5)
    cx = 600 if side == "L" else 1320
    bg.alpha_composite(spk, (cx - spk.width // 2, 455 - spk.height // 2))
    state[side] = sh["img"]
    fg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    header(ctx, fg)
    telop(ctx, fg, sh["sp"], sh["text"], sh.get("telop_note"))
    return bg, fg


def plate(ctx, bg, box):
    d = ImageDraw.Draw(bg)
    x0, y0, x1, y1 = box
    d.polygon([(x0 + 30, y0 + 16), (x1 + 16, y0 + 30), (x1 - 10, y1 + 18), (x0 + 10, y1 + 10)], fill=(0, 0, 0, 120))
    d.polygon([(x0 + 18, y0), (x1, y0 + 14), (x1 - 22, y1), (x0, y1 - 8)], fill=CREAM, outline=INK, width=8)
    for i in range(6):
        d.line([(x0 - 60, y0 + 70 + i * 26), (x0 + 40, y0 + 46 + i * 26)], fill=RED, width=7)


def layers_board(ctx, sh, state):
    bg = ctx.base.copy()
    plate(ctx, bg, (190, 120, 1730, 760))
    d = ImageDraw.Draw(bg)
    d.text((260, 200), sh["heading"], font=ctx.font("b", 66), fill=INK, anchor="lm")
    hw = ctx.font("b", 66).getlength(sh["heading"])
    d.line([(260, 248), (260 + hw, 248)], fill=RED, width=8)
    items = sh["items"]
    rh = 470 / len(items)
    for i, (label, desc) in enumerate(items):
        y = 290 + i * rh
        on = sh["hl"] < 0 or sh["hl"] == i
        col = INK if on else (170, 165, 155)
        if sh["hl"] == i:
            d.rectangle([230, y + 6, 1660, y + rh - 14], fill=(235, 222, 196))
            d.rectangle([230, y + 6, 246, y + rh - 14], fill=RED)
        lf = ctx.font("b", 46 if len(items) > 2 else 52)
        d.text((280, y + rh / 2 - 26), label, font=lf, fill=RED if on else col, anchor="lm")
        df, dl = fit_lines(ctx, desc, "r", (40, 36), 1340, 1)
        d.text((300, y + rh / 2 + 30), dl[0], font=df, fill=col, anchor="lm")
    fg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    header(ctx, fg)
    telop(ctx, fg, sh["sp"], sh["text"])
    return bg, fg


def layers_list(ctx, sh, state):
    bg = ctx.base.copy()
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle([150, 110, 1770, 770], radius=26, fill=(10, 14, 22), outline=(80, 150, 200), width=4)
    d.text((200, 170), "AIが出した施策案", font=ctx.font("b", 52), fill=(150, 210, 240), anchor="lm")
    d.text((1720, 170), "32件", font=ctx.font("b", 84), fill=(230, 80, 70), anchor="rm")
    f = ctx.font("r", 30)
    for i, idea in enumerate(AI_IDEAS):
        c, r = i % 4, i // 4
        x, y = 190 + c * 392, 240 + r * 64
        d.rounded_rectangle([x, y, x + 372, y + 52], radius=10, fill=(26, 40, 58), outline=(60, 100, 140), width=2)
        d.text((x + 18, y + 26), f"{i + 1:02d}  {idea}", font=f, fill=(220, 232, 240), anchor="lm")
    fg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    header(ctx, fg)
    telop(ctx, fg, sh["sp"], sh["text"])
    return bg, fg


def layers_mail(ctx, sh, state):
    bg = ctx.base.copy()
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle([260, 130, 1660, 790], radius=18, fill=(250, 250, 248), outline=INK, width=6)
    d.rounded_rectangle([260, 130, 1660, 210], radius=18, fill=(225, 228, 232))
    d.rectangle([260, 190, 1660, 210], fill=(225, 228, 232))
    for i, c in enumerate([(230, 90, 80), (240, 190, 70), (90, 190, 110)]):
        d.ellipse([300 + i * 44, 156, 326 + i * 44, 182], fill=c)
    d.text((960, 170), "受信トレイ", font=ctx.font("b", 30), fill=(90, 90, 90), anchor="mm")
    d.text((320, 260), "差出人　" + sh["from"], font=ctx.font("r", 34), fill=(80, 80, 80), anchor="lm")
    d.text((320, 320), "件名　" + sh["subject"], font=ctx.font("b", 44), fill=INK, anchor="lm")
    d.line([(320, 365), (1600, 365)], fill=(210, 210, 210), width=3)
    f, lines = fit_lines(ctx, sh["text"], "r", (42,), 1260, 8)
    for i, ln in enumerate(lines):
        d.text((320, 420 + i * 70), ln, font=f, fill=(40, 40, 40), anchor="lm")
    fg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    header(ctx, fg)
    fd = ImageDraw.Draw(fg)
    ch = CHARS[sh["sp"]]
    fd.rectangle([96, 860, 96 + ctx.font("b", 40).getlength(ch["name"] + "の声") + 60, 930], fill=ch["color"] + (255,))
    fd.text((126, 895), ch["name"] + "の声", font=ctx.font("b", 40), fill="white", anchor="lm")
    return bg, fg


def layers_card(ctx, sh, state):
    bg = Image.new("RGBA", (W, H), (10, 10, 12, 255))
    d = ImageDraw.Draw(bg)
    d.text((W / 2, 330), sh["sub"], font=ctx.font("b", 90), fill=(225, 225, 225), anchor="mm")
    d.text((W / 2, 610), sh["big"], font=ctx.font("b", 320), fill=(205, 42, 38), anchor="mm")
    return bg, None


def layers_chapter(ctx, sh, state):
    bg = Image.new("RGBA", (W, H), (20, 21, 25, 255))
    d = ImageDraw.Draw(bg)
    d.polygon([(0, 420), (W, 330), (W, 690), (0, 780)], fill=RED)
    for i in range(10):
        d.line([(0, 400 - i * 34), (W, 310 - i * 34)], fill=GOLD + (60,), width=2)
    d.text((W / 2, 250), sh["no"], font=ctx.font("brush", 190), fill=CREAM, anchor="mm")
    d.text((W / 2, 560), sh["title"], font=ctx.font("b", 130), fill="white", anchor="mm", stroke_width=6, stroke_fill=INK)
    return bg, None


def layers_kv(ctx, sh, state):
    return ctx.sheets["kv"].resize((W, H), Image.LANCZOS).convert("RGBA"), None


def layers_summary(ctx, sh, state):
    bg = ctx.base.copy()
    plate(ctx, bg, (190, 120, 1730, 880))
    d = ImageDraw.Draw(bg)
    d.text((W / 2, 230), sh["heading"], font=ctx.font("brush", 110), fill=RED, anchor="mm")
    for i, item in enumerate(sh["items"]):
        y = 410 + i * 150
        d.ellipse([290, y - 46, 382, y + 46], fill=INK)
        d.text((336, y), str(i + 1), font=ctx.font("b", 56), fill=CREAM, anchor="mm")
        d.text((420, y), item, font=ctx.font("b", 58), fill=INK, anchor="lm")
    return bg, None


def layers_cta(ctx, sh, state):
    bg = ctx.base.copy()
    plate(ctx, bg, (230, 220, 1690, 700))
    d = ImageDraw.Draw(bg)
    d.text((W / 2, 400), sh["big"], font=ctx.font("b", 104), fill=INK, anchor="mm")
    d.line([(420, 480), (1500, 480)], fill=RED, width=8)
    d.text((W / 2, 580), sh["sub"], font=ctx.font("r", 46), fill=(60, 60, 60), anchor="mm")
    d.polygon([(1340, 800), (1460, 800), (1400, 880)], fill=GOLD)
    d.text((1400, 950), "概要欄のリンクから", font=ctx.font("b", 48), fill=CREAM, anchor="mm")
    return bg, None


def layers_next(ctx, sh, state):
    bg = Image.new("RGBA", (W, H), (20, 21, 25, 255))
    d = ImageDraw.Draw(bg)
    d.rectangle([0, 0, W, H], fill=(20, 21, 25))
    d.text((W / 2, 220), "次回予告", font=ctx.font("brush", 140), fill=GOLD, anchor="mm")
    for i, ln in enumerate(sh["big"].split("\n")):
        d.text((W / 2, 520 + i * 160), ln, font=ctx.font("b", 110), fill="white", anchor="mm", stroke_width=5, stroke_fill=INK)
    d.rectangle([760, 880, 1160, 940], fill=RED)
    d.text((W / 2, 910), "第二話", font=ctx.font("b", 40), fill="white", anchor="mm")
    return bg, None


LAYOUTS = {"talk": layers_talk, "board": layers_board, "list": layers_list, "mail": layers_mail, "card": layers_card,
           "chapter": layers_chapter, "kv": layers_kv, "summary": layers_summary, "cta": layers_cta, "next": layers_next}


def voice(sh):
    sp = sh.get("sp")
    if not sp or sh.get("silent") or not sh.get("text"):
        return np.zeros(0, np.float32)
    ch = CHARS[sp]
    x, sr = pyopenjtalk.tts(sh.get("yomi", sh["text"]), speed=ch["speed"], half_tone=ch["tone"])
    assert sr == SR
    return (x / 32768.0).astype(np.float32)


def sfx(kind, n):
    t = np.arange(n) / SR
    rng = np.random.default_rng(1)
    if kind == "whoosh":
        noise = rng.standard_normal(n).astype(np.float32)
        env = np.sin(np.pi * np.clip(t / 0.7, 0, 1)) ** 2
        k = np.ones(40) / 40
        return np.convolve(noise, k, "same") * env * 0.35
    if kind == "hit":
        return (np.sin(2 * np.pi * 55 * t) * np.exp(-t * 5) * 0.6 + rng.standard_normal(n) * np.exp(-t * 30) * 0.15).astype(np.float32)
    return np.zeros(n, np.float32)


def render_shot(path_bg, path_fg, frames, zoom, out, fade):
    vf = f"[0]scale=3840:2160,zoompan=z='1+{zoom}*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}"
    vf += f",fade=t=in:d=0.25,fade=t=out:st={frames / FPS - 0.25:.3f}:d=0.25" if fade else ""
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", path_bg]
    if path_fg:
        cmd += ["-loop", "1", "-i", path_fg]
        vf += "[b];[b][1]overlay=0:0:shortest=1"
    vf += ",format=yuv420p"
    cmd += ["-filter_complex", vf, "-frames:v", str(frames), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", out]
    subprocess.run(cmd, check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--assets", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", type=int, nargs="*", help="指定番号のカットだけ静止画で書き出す")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    ep = json.load(open(a.episode, encoding="utf-8"))
    ctx = Ctx(a.assets)
    state, parts, audio, log = {}, [], [], []
    t = 0.0
    for i, sh in enumerate(ep["shots"]):
        bg, fg = LAYOUTS[sh["type"]](ctx, sh, state)
        pbg, pfg = f"{a.out}/shot{i:03d}_bg.png", (f"{a.out}/shot{i:03d}_fg.png" if fg else None)
        bg.convert("RGB").save(pbg)
        if fg:
            fg.save(pfg)
        if a.only is not None:
            if i in a.only:
                prev = bg.copy()
                if fg:
                    prev.alpha_composite(fg)
                prev.convert("RGB").save(f"{a.out}/preview{i:03d}.png")
            continue
        v = voice(sh)
        lead, tail = 0.3, 0.5
        dur = max(sh.get("dur", 0), lead + len(v) / SR + tail, 1.6 if sh["type"] != "chapter" else 2.2)
        frames = round(dur * FPS)
        n = round(frames / FPS * SR)
        track = np.zeros(n, np.float32)
        s0 = int(lead * SR)
        track[s0:s0 + len(v)] += v[: n - s0]
        if sh["type"] == "chapter":
            track += sfx("whoosh", n)
        if sh["type"] == "card":
            track += sfx("hit", n)
        audio.append(track)
        mp4 = f"{a.out}/shot{i:03d}.mp4"
        render_shot(pbg, pfg, frames, 0.035 if sh["type"] in ("talk", "kv") else 0.015, mp4,
                    sh["type"] in ("chapter", "card", "kv", "next"))
        parts.append(mp4)
        log.append(f"{int(t // 60)}:{t % 60:05.2f}  #{i:02d} {sh['type']:<8}{CHARS.get(sh.get('sp'), {}).get('name', '')}  {sh.get('text', '')}")
        t += frames / FPS
        print(log[-1], flush=True)
    if a.only is not None:
        return
    with open(f"{a.out}/list.txt", "w") as f:
        f.writelines(f"file '{os.path.abspath(p)}'\n" for p in parts)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{a.out}/list.txt",
                    "-c", "copy", f"{a.out}/video_only.mp4"], check=True)
    mix = np.concatenate(audio)
    mix = mix / max(1.0, np.abs(mix).max() / 0.95)
    with wave.open(f"{a.out}/voice.wav", "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{a.out}/video_only.mp4", "-i", f"{a.out}/voice.wav",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", f"{a.out}/episode.mp4"], check=True)
    open(f"{a.out}/timeline.txt", "w", encoding="utf-8").write("\n".join(log) + "\n")
    print(f"total {t:.1f}s")


if __name__ == "__main__":
    main()
