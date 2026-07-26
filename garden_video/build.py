#!/usr/bin/env python3
"""「8月の園芸」3本を生成する(縦型 1080x1920 / 30fps / 日本語ナレーション + BGM)。

構成は specs.py のデータだけで決まる。音声を先に合成して各セリフの開始時刻を確定させ、
その時刻に画面の各段を合わせる(尺はナレーションが決める)。

参考片(intro_video/shotcraft/reference/ref-mood-01)の逐帧分解から採用した文法:
  - 字幕は常設レイヤーとして全編下部に居る。隅に小注記を置く
  - 主体は一つずつ出し、ラベルはさらに遅らせる二段構え
  - 見出しが先に立ち、背景は後から浮上する
  - 関係は横線+中央ラベルで示す
  - 転換点は縦の亀裂で断ち切って大字を叩き込む
  - 明るい地へのハードカットを1本に1回だけ入れる
  - 1ショット内に段を多く積む(境界を速く刻むのではなく、中の段数で密度を出す)

使い方:
    python3 garden_video/build.py            # 3本すべて
    python3 garden_video/build.py --only water
"""

from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "intro_video"))

# 音声の下ごしらえは intro_video 版で作った実装を再利用する(TTS・BGM合成・
# ミックス・ダッキング・コンプレッサはそのまま使える)
from make_audio import (  # noqa: E402
    SR,
    active_rms_db,
    build_bgm,
    compress,
    duck,
    rms_db,
    trim_silence,
    write_wav,
    _add,
    fft_convolve,
    fft_filter,
    make_reverb_ir,
)

from specs import PALETTE, VIDEOS  # noqa: E402

W, H = 1080, 1920
FPS = 30
MARGIN = 92
FONT_DIR = Path(os.environ.get("GARDEN_FONT_DIR", ROOT / "intro_video" / "fonts"))

TTS_SPEED = 1.12
LEAD_IN = 0.40
GAP = 0.24
TAIL = 0.85

C = {k: tuple(v) for k, v in PALETTE.items()}


# ---------------------------------------------------------------- フォント

_FONTS: dict[tuple[str, int, str], ImageFont.FreeTypeFont] = {}


def font(size: int, weight: str = "Bold", family: str = "jp") -> ImageFont.FreeTypeFont:
    key = (family, size, weight)
    if key in _FONTS:
        return _FONTS[key]
    name = {"jp": "NotoSansJP-Bold.ttf", "latin": "Poppins-Bold.ttf"}[family]
    p = FONT_DIR / name
    if not p.exists():
        raise SystemExit(f"フォントがありません: {p}\n先に intro_video/fetch_fonts.sh を実行してください")
    f = ImageFont.truetype(str(p), size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    _FONTS[key] = f
    return f


# ---------------------------------------------------------------- イージング

def clamp01(x: float) -> float:
    return 0.0 if x < 0 else (1.0 if x > 1 else x)


def ease_out(x: float) -> float:
    x = clamp01(x)
    return 1 - (1 - x) ** 3


def ease_land(x: float) -> float:
    """落地隠喻のある動作用。終端でわずかに過冲する。"""
    x = clamp01(x)
    return 1 - (1 - x) ** 3 * (1 - 0.12 * math.sin(math.pi * x))


def appear(t: float, delay: float, dur: float = 0.5) -> float:
    return ease_out((t - delay) / dur)


def rgba(c, a: float):
    return (c[0], c[1], c[2], int(round(255 * clamp01(a))))


def rand(seed: int):
    a = seed & 0xFFFFFFFF

    def nxt() -> float:
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = (a ^ (a >> 15)) * (1 | a) & 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (61 | t) & 0xFFFFFFFF)) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return nxt


# ---------------------------------------------------------------- 文字組み

_NO_START = "、。,.!?)}」』】〉・:;ー…"
_NO_END = "([{「『【〈"


def _tokens(s: str) -> list[str]:
    out, buf = [], ""
    for ch in s:
        if ch.isascii() and (ch.isalnum() or ch in "-_./+#%'"):
            buf += ch
            continue
        if buf:
            out.append(buf)
            buf = ""
        out.append(ch)
    if buf:
        out.append(buf)
    return out


def wrap(s: str, f, max_w: int) -> list[str]:
    res: list[str] = []
    for para in s.split("\n"):
        line = ""
        for tok in _tokens(para):
            trial = line + tok
            if line and f.getlength(trial.strip()) > max_w:
                if tok in _NO_START:
                    line = trial
                    continue
                while line and line[-1] in _NO_END:
                    tok, line = line[-1] + tok, line[:-1]
                res.append(line.rstrip())
                line = tok.lstrip() if tok != " " else ""
            else:
                line = trial
        if line.strip():
            res.append(line.rstrip())
    return res or [""]


class Frame:
    def __init__(self, bg: Image.Image):
        self.base = bg.copy()
        self.layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.layer)

    def flat(self) -> Image.Image:
        self.base.alpha_composite(self.layer)
        return self.base.convert("RGB")


def text(f: Frame, x: int, y: int, s: str, size: int, color, a: float = 1.0,
         weight: str = "Bold", align: str = "left", max_w: int | None = None,
         gap: float = 1.5, family: str = "jp") -> int:
    if a <= 0.004:
        return 0
    ft = font(size, weight, family)
    lines = wrap(s, ft, max_w) if max_w else s.split("\n")
    lh = int(size * gap)
    anchor = {"left": "la", "center": "ma", "right": "ra"}[align]
    for i, ln in enumerate(lines):
        if ln:
            f.d.text((x, y + i * lh), ln, font=ft, fill=rgba(color, a), anchor=anchor)
    return len(lines) * lh


def card(f: Frame, x: int, y: int, w: int, h: int, a: float, accent=None, r: int = 26,
         surface=None) -> None:
    if a <= 0.004:
        return
    f.d.rounded_rectangle([x, y, x + w, y + h], r, fill=rgba(surface or C["surface"], 0.96 * a),
                          outline=rgba(C["fg"], 0.10 * a), width=2)
    if accent:
        f.d.rounded_rectangle([x + 20, y + 22, x + 27, y + h - 22], 4, fill=rgba(accent, 0.95 * a))


# ---------------------------------------------------------------- 背景

def make_bg(light: bool = False) -> Image.Image:
    """暗場の葉陰。明転用は別に作る。"""
    base = C["light_bg"] if light else C["bg"]
    img = Image.new("RGBA", (W, H), base + (255,))
    d = ImageDraw.Draw(img)
    if not light:
        for y in range(H):
            t = y / (H - 1)
            v = (int(base[0] + 8 - 6 * t), int(base[1] + 9 - 7 * t), int(base[2] + 7 - 5 * t))
            d.line([(0, y), (W, y)], fill=v + (255,))
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        for cx, cy, r, col, s in (
            (int(W * 0.80), int(H * 0.13), 740, C["accent"], 0.11),
            (int(W * 0.14), int(H * 0.87), 700, C["accent2"], 0.08),
        ):
            for i in range(150, 0, -1):
                rr = r * i / 150
                gd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=rgba(col, s * (1 - i / 150) ** 2.2))
        img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(70)))
    grain = Image.effect_noise((W, H), 64).convert("L").convert("RGB")
    return Image.blend(img.convert("RGB"), grain, 0.012).convert("RGBA")


def leaves(f: Frame, t: float, a: float = 1.0) -> None:
    """葉影のようにゆっくり漂う粒。暗場に動きを絶やさないため。"""
    r = rand(9001)
    pts = [(r(), r(), r()) for _ in range(34)]
    for i, (sx, sp, sz) in enumerate(pts):
        x = sx * W
        speed = 9 + sp * 20
        y = (H + 60 - (t * speed + sx * H * 1.7) % (H + 120))
        rr = 1.3 + sz * 2.4
        al = (0.05 + sz * 0.13) * a
        dx = math.sin(t * 0.42 + i) * 16
        f.d.ellipse([x + dx - rr, y - rr, x + dx + rr, y + rr], fill=rgba(C["fg"], al))


# ---------------------------------------------------------------- シーン描画

def sc_title(f: Frame, t: float, sc: dict, cues: list[float]) -> None:
    """手法E: 見出しが先に立ち、背景が後から浮上する。"""
    c0 = cues[0] if cues else 0.1
    c1 = cues[1] if len(cues) > 1 else c0 + 1.4
    a0 = appear(t, c0, 0.6)
    # 背景の帯は見出しより 0.5s 遅れて出る(順序が逆だと字が負ける)
    ab = appear(t, c0 + 0.5, 0.9)
    if ab > 0.004:
        band = Image.new("RGBA", (W, 560), (0, 0, 0, 0))
        bd = ImageDraw.Draw(band)
        for i in range(560):
            bd.line([(0, i), (W, i)], fill=rgba(C["accent3"], 0.13 * ab * math.sin(math.pi * i / 560)))
        f.layer.alpha_composite(band, (0, int(640 + (1 - ab) * 40)))
    text(f, MARGIN, int(700 + (1 - a0) * 30), sc["heading"], 104, C["fg"], a0,
         max_w=W - MARGIN * 2, gap=1.32)
    a1 = appear(t, c1, 0.6)
    text(f, MARGIN, int(980 + (1 - a1) * 22), sc["sub"], 52, C["muted"], a1,
         weight="Medium", max_w=W - MARGIN * 2, gap=1.5)


def sc_steps(f: Frame, t: float, sc: dict, cues: list[float]) -> None:
    """手法I: 主体を一つずつ出し、ラベルはさらに遅らせる二段構え。"""
    a0 = appear(t, cues[0] if cues else 0.1, 0.5)
    text(f, MARGIN, int(430 + (1 - a0) * 18), sc["kicker"], 40, C["accent"], a0, weight="Medium")
    y = 560
    ch = 300
    for i, (label, key, sub) in enumerate(sc["items"]):
        c = cues[i + 1] if len(cues) > i + 1 else 0.9 + i * 1.4
        ia = appear(t, c, 0.55)
        cy = int(y + (1 - ia) * 34)
        card(f, MARGIN, cy, W - MARGIN * 2, ch, ia, C[key])
        text(f, MARGIN + 62, cy + 60, label, 64, C["fg"], ia, max_w=W - MARGIN * 2 - 120)
        # ラベルは本体よりさらに 0.45s 遅れる。ここが参考片の二段構え
        la = appear(t, c + 0.45, 0.4)
        ft = font(32, "Medium")
        tw = ft.getlength(sub) + 40
        if la > 0.004:
            f.d.rounded_rectangle([MARGIN + 62, cy + 176, MARGIN + 62 + tw, cy + 176 + 62], 31,
                                  fill=rgba(C[key], 0.16 * la), outline=rgba(C[key], 0.5 * la), width=2)
            f.d.text((MARGIN + 62 + tw / 2, cy + 190), sub, font=ft, fill=rgba(C[key], la), anchor="ma")
        y += ch + 26


def sc_relation(f: Frame, t: float, sc: dict, cues: list[float]) -> None:
    """手法J: 二者を置き、横線を引いて中央にラベルを載せる。"""
    c0 = cues[0] if cues else 0.1
    # 箱は大きめに取り、線とラベルが載る間隔を確保する。小さいと余白ばかりになる
    bw, bh = 330, 214
    ly = ry = 812
    lx, rx = MARGIN, W - MARGIN - bw
    la = appear(t, c0, 0.5)
    ra = appear(t, c0 + 0.35, 0.5)
    card(f, lx, ly, bw, bh, la, C["accent2"])
    text(f, lx + bw // 2, ly + 72, sc["left"], 62, C["fg"], la, align="center")
    card(f, rx, ry, bw, bh, ra, C["warn"])
    text(f, rx + bw // 2, ry + 72, sc["right"], 62, C["fg"], ra, align="center")
    # 線は両者が出てから引く
    line_t = ease_out((t - (c0 + 0.75)) / 0.6)
    y0 = ly + bh // 2
    x0, x1 = lx + bw + 16, rx - 16
    if line_t > 0:
        f.d.line([(x0, y0), (x0 + (x1 - x0) * line_t, y0)], fill=rgba(C["muted"], 0.75), width=4)
    lab = appear(t, c0 + 1.25, 0.45)
    if lab > 0.004:
        ft = font(34, "Bold")
        tw = ft.getlength(sc["label"]) + 44
        cx = (x0 + x1) / 2
        f.d.rounded_rectangle([cx - tw / 2, y0 - 34, cx + tw / 2, y0 + 34], 12,
                              fill=rgba(C["bg"], 0.98 * lab), outline=rgba(C["muted"], 0.55 * lab), width=2)
        f.d.text((cx, y0 - 20), sc["label"], font=ft, fill=rgba(C["fg"], lab), anchor="ma")


def sc_break(f: Frame, t: float, sc: dict, cues: list[float]) -> None:
    """手法K: 画面を縦の亀裂で断ち切り、大字を叩き込む。"""
    c0 = cues[0] if cues else 0.1
    a0 = appear(t, c0, 0.5)
    text(f, MARGIN, 700, sc["before"], 76, C["muted"], a0 * 0.85, max_w=W - MARGIN * 2)

    # 亀裂は画面の左寄り、大字はその右。参考片も「裂け目の横に大字」で、
    # 裂け目の上に字を重ねると線がグリフを横切って読みにくくなる
    crack_x = 0.34
    crack_at = c0 + 0.85
    ct = ease_land((t - crack_at) / 0.42)
    # 亀裂は before の行より下から始める。全高に走らせると上の行をグリフごと横切る
    crack_top = 840
    if ct > 0:
        r = rand(4242)
        pts = []
        seg = 26
        span = H - crack_top
        for i in range(seg + 1):
            yy = crack_top + span * i / seg
            jitter = (r() - 0.5) * 130
            pts.append((W * crack_x + jitter * (0.35 + 0.65 * math.sin(math.pi * i / seg)), yy))
        top = int(crack_top + span * (1 - ct))
        vis = [(x, y) for x, y in pts if y >= top - 1]
        if len(vis) > 1:
            f.d.line(vis, fill=rgba(C["bg"], 0.98), width=34, joint="curve")
            f.d.line(vis, fill=rgba(C["warn"], 0.92), width=7, joint="curve")

    at = appear(t, crack_at + 0.12, 0.34)
    if at > 0.004:
        # 叩き込むので、落地の過冲を効かせる
        sc_ = 1.22 - 0.22 * ease_land((t - crack_at - 0.12) / 0.34)
        ft = font(int(112 * sc_), "Bold")
        f.d.text((int(W * (crack_x + 0.06)), int(940 - (1 - at) * 14)), sc["after"], font=ft,
                 fill=rgba(C["warn"], at), anchor="la")

    a2 = appear(t, cues[1] if len(cues) > 1 else crack_at + 1.6, 0.55)
    text(f, MARGIN, 1210, sc["tail"], 48, C["fg"], a2, weight="Medium",
         max_w=W - MARGIN * 2, gap=1.52)


def sc_bright(f: Frame, t: float, sc: dict, cues: list[float]) -> None:
    """手法H: 明るい地へのハードカット。1本に1回だけ。地と字が反転する。"""
    c0 = cues[0] if cues else 0.1
    a0 = appear(t, c0, 0.5)
    text(f, MARGIN, int(800 + (1 - a0) * 24), sc["heading"], 96, C["light_fg"], a0,
         max_w=W - MARGIN * 2, gap=1.34)
    a1 = appear(t, cues[1] if len(cues) > 1 else c0 + 1.5, 0.5)
    text(f, MARGIN, 1060, sc["sub"], 48, (0x4A, 0x55, 0x4C), a1, weight="Medium",
         max_w=W - MARGIN * 2, gap=1.5)
    ru = ease_out((t - c0 - 0.4) / 0.6)
    if ru > 0:
        f.d.rounded_rectangle([MARGIN, 990, MARGIN + int(150 * ru), 996], 3, fill=rgba(C["accent"], 0.9))


def sc_outro(f: Frame, t: float, sc: dict, cues: list[float]) -> None:
    """手法C: 字標が着地し、着地の瞬間に光が飛ぶ。"""
    c0 = cues[0] if cues else 0.15
    land = c0 + 0.28
    lt = ease_land((t - c0) / 0.5)
    scale = 1.35 - 0.35 * lt
    a0 = clamp01(lt * 1.6)

    # 着地フラッシュは字より**先**に描く。後に描くと、白いフラッシュに白い字標が
    # 溶けて一瞬消える(実測で確認: 0.30 の白を上に乗せると見出しが読めなくなった)
    flash = 1 - clamp01((t - land) / 0.15)
    if t >= land and flash > 0:
        f.d.rectangle([0, 0, W, H], fill=rgba(C["fg"], 0.20 * flash))

    ft = font(int(96 * scale), "Bold")
    f.d.text((W // 2, 830), sc["heading"], font=ft, fill=rgba(C["fg"], a0), anchor="ma")

    a1 = appear(t, c0 + 0.7, 0.6)
    text(f, W // 2, 1010, sc["sub"], 46, C["accent"], a1, weight="Medium", align="center",
         max_w=W - MARGIN * 2, gap=1.5)


KINDS = {
    "title": sc_title, "steps": sc_steps, "relation": sc_relation,
    "break": sc_break, "bright": sc_bright, "outro": sc_outro,
}


# ---------------------------------------------------------------- 音声

def synth(spec: dict, out_wav: Path, voice_wav: Path) -> dict:
    import pyopenjtalk

    clips: list[tuple[float, np.ndarray]] = []
    scenes: list[dict] = []
    cursor = 0.0
    for si, sc in enumerate(spec["scenes"]):
        cues: list[float] = []
        t = cursor + LEAD_IN
        for line in sc["lines"]:
            wav, sr = pyopenjtalk.tts(line, speed=TTS_SPEED)
            assert sr == SR
            audio = trim_silence(np.asarray(wav, dtype=np.float64) / 32768.0)
            pk = np.abs(audio).max()
            if pk > 0:
                audio = audio / pk * 0.85
            cues.append(round(t - cursor, 3))
            clips.append((t, audio))
            t += len(audio) / SR + GAP
        dur = max(sc["min_dur"], (t - GAP) + TAIL - cursor)
        scenes.append(dict(index=si, kind=sc["kind"], dur=round(dur, 3), cues=cues))
        cursor += dur
        print(f"  S{si + 1} {sc['kind']:<8} {dur:5.2f}s cues={cues}")

    total = cursor
    buf = np.zeros(int(total * SR) + SR)
    for start, a in clips:
        _add(buf, start, a)
    voice = buf[: int(total * SR)]
    voice = fft_filter(voice, 95, "high")
    ir, _ = make_reverb_ir(decay=0.28, length=0.55, seed=3)
    voice = voice * 0.93 + fft_convolve(voice, ir) * 0.07
    voice = compress(voice)
    voice *= 0.90 / (np.abs(voice).max() + 1e-12)

    starts, acc = [], 0.0
    for s in scenes:
        starts.append(acc)
        acc += s["dur"]
    bl, br = build_bgm(total, starts)
    g = 10 ** ((active_rms_db(voice) - 12.0 - rms_db((bl + br) * 0.5)) / 20)
    depth = 1 - 10 ** (-9.0 / 20)
    bl = duck(bl * g, voice, depth)
    br = duck(br * g, voice, depth)

    write_wav(out_wav, bl + voice, br + voice)
    write_wav(voice_wav, voice, voice)
    print(f"  総尺 {total:.2f}s / 声 {active_rms_db(voice):.1f}dBFS / BGM {rms_db((bl + br) * 0.5):.1f}dBFS")
    return dict(total=round(total, 3), scenes=scenes)


# ---------------------------------------------------------------- 合成

def render(spec: dict, timing: dict, audio: Path, out: Path, crf: int = 20) -> None:
    dark = make_bg(False)
    light = make_bg(True)
    total_f = int(round(timing["total"] * FPS))
    bounds = []
    acc = 0.0
    for s in timing["scenes"]:
        bounds.append((acc, acc + s["dur"], s))
        acc += s["dur"]

    ffmpeg = os.environ.get("FFMPEG_BIN") or __import__("imageio_ffmpeg").get_ffmpeg_exe()
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [ffmpeg, "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "pipe:0",
           "-i", str(audio), "-shortest",
           "-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
           "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.1",
           "-g", str(FPS * 2), "-movflags", "+faststart",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(out)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin

    FADE = 0.3
    for i in range(total_f):
        t = i / FPS
        cur = bounds[-1]
        for b in bounds:
            if t < b[1]:
                cur = b
                break
        s0, s1, sc = cur
        local = t - s0
        spec_sc = spec["scenes"][sc["index"]]
        is_light = sc["kind"] == "bright"

        f = Frame(light if is_light else dark)
        if not is_light:
            leaves(f, t)

        alpha = clamp01(min(ease_out(local / FADE), ease_out((s1 - s0 - local) / FADE)))
        sub = Frame(Image.new("RGBA", (W, H), (0, 0, 0, 0)))
        KINDS[sc["kind"]](sub, local, spec_sc, sc["cues"])
        lay = sub.layer
        if alpha < 0.999:
            lay.putalpha(lay.getchannel("A").point(lambda v: int(v * alpha)))
        f.layer.alpha_composite(lay)

        # --- 常設レイヤー: 進行バー・字幕・小注記(手法G) ---
        fg = C["light_fg"] if is_light else C["fg"]
        f.d.rectangle([0, 0, W, 7], fill=rgba(fg, 0.10))
        f.d.rectangle([0, 0, int(W * clamp01(t / timing["total"])), 7], fill=rgba(C["accent"], 0.95))

        line = current_line(spec_sc, sc["cues"], local)
        if line:
            ft = font(40, "Medium")
            lines = wrap(line, ft, W - MARGIN * 2)
            box_h = 34 + len(lines) * 58
            f.d.rounded_rectangle([MARGIN - 26, H - 40 - box_h, W - MARGIN + 26, H - 40], 20,
                                  fill=rgba(C["bg"] if not is_light else (0xE2, 0xE6, 0xDC), 0.72))
            for k, ln in enumerate(lines):
                f.d.text((W // 2, H - 40 - box_h + 20 + k * 58), ln, font=ft,
                         fill=rgba(fg, 0.95), anchor="ma")
        if spec.get("note"):
            f.d.text((W - MARGIN + 26, 40), spec["note"], font=font(26, "Medium"),
                     fill=rgba(C["muted"], 0.7), anchor="ra")

        proc.stdin.write(f.flat().tobytes())
        if i % 120 == 0:
            print(f"    {i:4d}/{total_f}", flush=True)

    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit("ffmpeg が失敗しました")
    print(f"  完成: {out} ({out.stat().st_size / 1e6:.2f} MB)")


def current_line(spec_sc: dict, cues: list[float], local: float) -> str | None:
    """常設字幕: いま読まれているセリフを返す。"""
    line = None
    for i, c in enumerate(cues):
        if local >= c - 0.12 and i < len(spec_sc["lines"]):
            line = spec_sc["lines"][i]
    return line


# ---------------------------------------------------------------- CLI

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="slug を指定して1本だけ作る")
    ap.add_argument("--outdir", default="out/garden")
    ap.add_argument("--crf", type=int, default=20)
    args = ap.parse_args()

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    targets = [v for v in VIDEOS if not args.only or v["slug"] == args.only]
    if not targets:
        raise SystemExit(f"該当なし: {args.only}")

    for v in targets:
        print(f"\n=== {v['title']} ({v['slug']}) ===")
        mix = outdir / f"{v['slug']}_audio.wav"
        voice = outdir / f"{v['slug']}_voice.wav"
        timing = synth(v, mix, voice)
        (outdir / f"{v['slug']}_timing.json").write_text(
            json.dumps(timing, ensure_ascii=False, indent=2), encoding="utf-8")
        render(v, timing, mix, outdir / f"{v['slug']}.mp4", crf=args.crf)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
