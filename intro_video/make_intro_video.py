#!/usr/bin/env python3
"""Opus 5 の自己紹介ショート動画(縦 1080x1920 / 30fps / 約40秒)を生成する。

非エンジニア向けに、専門用語をできるだけ使わずに構成している。
音声は入っていない(SNS 互換のため無音トラックのみ付与)。

使い方:
    python3 intro_video/make_intro_video.py --out out/opus5_intro.mp4
"""

from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------- 基本設定

W, H = 1080, 1920
FPS = 30
MARGIN = 96

# Anthropic ブランドカラー
DARK = (0x14, 0x14, 0x13)
LIGHT = (0xFA, 0xF9, 0xF5)
MID_GRAY = (0xB0, 0xAE, 0xA5)
ORANGE = (0xD9, 0x77, 0x57)
BLUE = (0x6A, 0x9B, 0xCC)
GREEN = (0x78, 0x8C, 0x5D)
CARD = (0x20, 0x1F, 0x1D)

FONT_DIR = Path(os.environ.get("OPUS5_FONT_DIR", "")) if os.environ.get("OPUS5_FONT_DIR") else None


# ---------------------------------------------------------------- フォント

def _font_path(family: str) -> Path:
    """フォントファイルを探す。OPUS5_FONT_DIR があればそこを優先する。"""
    candidates = {
        "jp": ["NotoSansJP-Bold.ttf", "NotoSansJP-VF.ttf"],
        "latin": ["Poppins-Bold.ttf", "Poppins-SemiBold.ttf"],
    }[family]
    search_dirs = [d for d in (FONT_DIR, Path(__file__).parent / "fonts") if d]
    for d in search_dirs:
        for name in candidates:
            p = d / name
            if p.exists():
                return p
    if family == "jp":
        for p in (
            Path("/usr/share/fonts/truetype/fonts-japanese-gothic.ttf"),
            Path("/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"),
        ):
            if p.exists():
                return p
    raise SystemExit(
        f"{family} フォントが見つかりません。OPUS5_FONT_DIR にフォント置き場を指定してください。"
    )


_FONT_CACHE: dict[tuple[str, int, str], ImageFont.FreeTypeFont] = {}


def get_font(family: str, size: int, weight: str = "Bold") -> ImageFont.FreeTypeFont:
    key = (family, size, weight)
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]
    f = ImageFont.truetype(str(_font_path(family)), size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass  # 可変フォントでない場合はそのまま使う
    _FONT_CACHE[key] = f
    return f


# ---------------------------------------------------------------- イージング

def clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else (1.0 if x > 1.0 else x)


def ease_out(x: float) -> float:
    x = clamp01(x)
    return 1.0 - (1.0 - x) ** 3


def ease_in_out(x: float) -> float:
    x = clamp01(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def appear(t: float, delay: float, dur: float = 0.55) -> float:
    """delay 秒後から dur 秒かけて 0→1 になる値。"""
    return ease_out((t - delay) / dur)


# ナレーションの各セリフが始まる時刻(シーン開始からの秒数)。
# make_audio.py が書き出した timing JSON から差し込まれる。空なら台本なしの静止尺。
_CUES: list[float] = []


def cue(index: int, fallback: float) -> float:
    """index 番目のセリフの開始時刻。無ければ fallback(無音版のタイミング)を使う。"""
    if 0 <= index < len(_CUES):
        return _CUES[index]
    return fallback


def rgba(color: tuple[int, int, int], alpha: float) -> tuple[int, int, int, int]:
    return (color[0], color[1], color[2], int(round(255 * clamp01(alpha))))


# ---------------------------------------------------------------- 文字組み

_NO_LINE_START = "、。,.!?)}」』】〉・:;ー…"
_NO_LINE_END = "([{「『【〈"


def _tokenize(s: str) -> list[str]:
    """日本語は 1 文字ずつ、英数字は単語ごとにまとめる。"""
    tokens: list[str] = []
    buf = ""
    for ch in s:
        if ch.isascii() and (ch.isalnum() or ch in "-_./+#'"):
            buf += ch
            continue
        if buf:
            tokens.append(buf)
            buf = ""
        tokens.append(ch)
    if buf:
        tokens.append(buf)
    return tokens


def wrap_text(s: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    """max_width に収まるように折り返す。簡易的な禁則処理つき。"""
    out: list[str] = []
    for para in s.split("\n"):
        if not para:
            out.append("")
            continue
        line = ""
        for tok in _tokenize(para):
            trial = line + tok
            if line and font.getlength(trial.strip()) > max_width:
                # 行頭に来てはいけない文字なら前の行に残す
                if tok in _NO_LINE_START:
                    line = trial
                    continue
                while line and line[-1] in _NO_LINE_END:
                    tok = line[-1] + tok
                    line = line[:-1]
                out.append(line.rstrip())
                line = tok.lstrip() if tok != " " else ""
            else:
                line = trial
        if line.strip():
            out.append(line.rstrip())
    return out or [""]


# ---------------------------------------------------------------- 描画土台

class Frame:
    """1 フレーム分の描画バッファ。背景はコピー、前景は RGBA レイヤーに描く。"""

    def __init__(self, background: Image.Image):
        self.base = background.copy()
        self.layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.layer)

    def flatten(self) -> Image.Image:
        self.base.alpha_composite(self.layer)
        return self.base.convert("RGB")


def draw_text(
    f: Frame,
    x: int,
    y: int,
    s: str,
    size: int,
    weight: str = "Bold",
    color: tuple[int, int, int] = LIGHT,
    alpha: float = 1.0,
    align: str = "left",
    max_width: int | None = None,
    line_gap: float = 1.52,
    family: str = "jp",
) -> int:
    """テキストを描いて、占めた高さを返す。y は 1 行目の上端。"""
    if alpha <= 0.003:
        return 0
    font = get_font(family, size, weight)
    lines = wrap_text(s, font, max_width) if max_width else s.split("\n")
    lh = int(size * line_gap)
    anchor = {"left": "la", "center": "ma", "right": "ra"}[align]
    for i, ln in enumerate(lines):
        if ln:
            f.d.text((x, y + i * lh), ln, font=font, fill=rgba(color, alpha), anchor=anchor)
    return len(lines) * lh


def text_height(s: str, size: int, weight: str = "Bold", max_width: int | None = None,
                line_gap: float = 1.52, family: str = "jp") -> int:
    font = get_font(family, size, weight)
    lines = wrap_text(s, font, max_width) if max_width else s.split("\n")
    return len(lines) * int(size * line_gap)


def card(f: Frame, x: int, y: int, w: int, h: int, alpha: float = 1.0,
         accent: tuple[int, int, int] | None = None, radius: int = 30) -> None:
    if alpha <= 0.003:
        return
    f.d.rounded_rectangle([x, y, x + w, y + h], radius,
                          fill=rgba(CARD, 0.95 * alpha),
                          outline=rgba(LIGHT, 0.11 * alpha), width=2)
    if accent:
        f.d.rounded_rectangle([x + 22, y + 26, x + 30, y + h - 26], 4, fill=rgba(accent, 0.95 * alpha))


def pill(f: Frame, cx: int, y: int, label: str, size: int, alpha: float = 1.0,
         color: tuple[int, int, int] = ORANGE, family: str = "jp") -> None:
    if alpha <= 0.003:
        return
    font = get_font(family, size, "Bold")
    tw = font.getlength(label)
    pad_x, pad_y = 34, 18
    w = tw + pad_x * 2
    h = size + pad_y * 2
    f.d.rounded_rectangle([cx - w / 2, y, cx + w / 2, y + h], h / 2,
                          fill=rgba(color, 0.16 * alpha), outline=rgba(color, 0.55 * alpha), width=2)
    f.d.text((cx, y + pad_y), label, font=font, fill=rgba(color, alpha), anchor="ma")


# ---------------------------------------------------------------- 背景

def build_background() -> Image.Image:
    """縦グラデーション + ほのかな暖色グローを焼き込んだ静止背景。

    グローは同心円で描くと縞(バンディング)が出るため、ぼかしてから合成する。
    さらに微細なグレインを乗せて、暗部の階調段差を目立たなくする。
    """
    bg = Image.new("RGBA", (W, H), DARK + (255,))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / (H - 1)
        v = 0x1A - 0x0A * t
        d.line([(0, y), (W, y)], fill=(int(v) + 2, int(v) + 1, int(v) - 1, 255))

    glows = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glows)

    def glow(cx: int, cy: int, r: int, color: tuple[int, int, int], strength: float) -> None:
        steps = 160
        for i in range(steps, 0, -1):
            rr = r * i / steps
            a = strength * (1 - i / steps) ** 2.2
            gd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=rgba(color, a))

    glow(int(W * 0.78), int(H * 0.12), 760, ORANGE, 0.11)
    glow(int(W * 0.12), int(H * 0.86), 700, BLUE, 0.08)
    glows = glows.filter(ImageFilter.GaussianBlur(70))
    bg.alpha_composite(glows)

    # グレインは強くしすぎると H.264 のビットレートを大きく食うので控えめに。
    grain = Image.effect_noise((W, H), 64).convert("L").convert("RGB")
    flat = Image.blend(bg.convert("RGB"), grain, 0.012)
    return flat.convert("RGBA")


def build_glow_sprite(r: int, color: tuple[int, int, int], strength: float) -> Image.Image:
    sprite = Image.new("RGBA", (r * 2, r * 2), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sprite)
    steps = 60
    for i in range(steps, 0, -1):
        rr = r * i / steps
        a = strength * (1 - i / steps) ** 2.0
        sd.ellipse([r - rr, r - rr, r + rr, r + rr], fill=rgba(color, a))
    return sprite


def draw_particles(f: Frame, t: float, alpha: float = 1.0) -> None:
    """ゆっくり上に流れる細かい光の粒。動きを絶やさないための背景演出。"""
    for i in range(46):
        seed = i * 12.9898
        x = (math.sin(seed) * 0.5 + 0.5) * W
        speed = 12 + (math.sin(seed * 2.3) * 0.5 + 0.5) * 26
        y = (H + 60 - (t * speed + (math.cos(seed * 1.7) * 0.5 + 0.5) * H * 1.6) % (H + 120))
        r = 1.4 + (math.sin(seed * 3.1) * 0.5 + 0.5) * 2.6
        a = (0.05 + (math.sin(seed * 4.7) * 0.5 + 0.5) * 0.16) * alpha
        drift = math.sin(t * 0.5 + seed) * 18
        f.d.ellipse([x + drift - r, y - r, x + drift + r, y + r], fill=rgba(LIGHT, a))


# ---------------------------------------------------------------- 各シーン

def scene_hook(f: Frame, t: float) -> None:
    c_mark, c_what, c_sub = cue(0, 0.75), cue(1, 1.5), cue(2, 2.3)
    a1 = appear(t, 0.15, 0.7)
    a2 = appear(t, c_mark, 0.6)
    a3 = appear(t, c_what, 0.6)
    a4 = appear(t, c_sub, 0.6)

    cx = W // 2
    # ラベルは実際の尺から作る(ナレーション有無で総尺が変わるため)
    label = f"{int(round(TOTAL))}秒でわかる自己紹介" if TOTAL < 55 else "1分でわかる自己紹介"
    pill(f, cx, int(560 + (1 - a1) * 24), label, 38, a1)

    # ワードマーク(英字は Poppins)
    y = 700
    scale = 0.94 + 0.06 * ease_out((t - c_mark) / 0.9)
    size = int(200 * scale)
    fnt = get_font("latin", size, "Bold")
    f.d.text((cx, int(y + (1 - a2) * 40)), "Opus 5", font=fnt, fill=rgba(LIGHT, a2), anchor="ma")

    draw_text(f, cx, int(960 + (1 - a3) * 30), "って、なに?", 96, "Bold", ORANGE, a3, align="center")

    draw_text(
        f, cx, int(1190 + (1 - a4) * 24),
        "エンジニアじゃなくても\nわかるように話します。",
        50, "Medium", MID_GRAY, a4, align="center", line_gap=1.55,
    )

    # アクセントの下線
    lw = int(150 * ease_out((t - c_what - 0.4) / 0.8))
    if lw > 2:
        f.d.rounded_rectangle([cx - lw // 2, 1108, cx + lw // 2, 1114], 3, fill=rgba(ORANGE, 0.9))


def scene_who(f: Frame, t: float) -> None:
    c_hi, c_head, c_card, c_tail = cue(0, 0.1), cue(1, 0.55), cue(2, 1.4), cue(3, 2.6)
    a0 = appear(t, c_hi, 0.6)
    a1 = appear(t, c_head, 0.6)
    a2 = appear(t, c_card, 0.6)

    draw_text(f, MARGIN, int(430 + (1 - a0) * 20), "はじめまして。", 58, "Medium", MID_GRAY, a0)
    draw_text(
        f, MARGIN, int(540 + (1 - a1) * 28),
        "私は、文章を読んで\n考えて、書けるAIです。",
        82, "Bold", LIGHT, a1, line_gap=1.42,
    )

    # プロフィールカード
    cy = int(940 + (1 - a2) * 34)
    ch = 560
    card(f, MARGIN, cy, W - MARGIN * 2, ch, a2, ORANGE)

    rows = [
        ("なまえ", "Opus 5", "latin"),
        ("うまれ", "Anthropic(米国のAI企業)", "jp"),
        ("しゅるい", "大規模言語モデル", "jp"),
        ("正式な名前", "claude-opus-5", "latin"),
    ]
    ry = cy + 58
    for i, (k, v, fam) in enumerate(rows):
        ra = appear(t, c_card + 0.2 + i * 0.16, 0.5)
        draw_text(f, MARGIN + 60, ry, k, 34, "Medium", MID_GRAY, ra * a2)
        draw_text(f, MARGIN + 60, ry + 48, v, 52, "Bold", LIGHT, ra * a2, family=fam)
        ry += 130

    a3 = appear(t, c_tail, 0.6)
    draw_text(
        f, MARGIN, int(1580 + (1 - a3) * 20),
        "Claude(クロード)という\nAIシリーズの、いちばん力のある担当です。",
        44, "Medium", MID_GRAY, a3, max_width=W - MARGIN * 2, line_gap=1.55,
    )


def scene_can_do(f: Frame, t: float) -> None:
    a0 = appear(t, cue(0, 0.1), 0.6)
    draw_text(f, MARGIN, int(360 + (1 - a0) * 20), "できること", 44, "Medium", ORANGE, a0)
    draw_text(f, MARGIN, int(430 + (1 - a0) * 24), "ざっくり3つ。", 82, "Bold", LIGHT, a0)

    items = [
        (BLUE, "読む・まとめる", "100ページの資料でも、要点だけ\n3行にして渡せます。"),
        (ORANGE, "考える・調べる", "手順に分けて考えます。必要なら\n自分で検索して確かめます。"),
        (GREEN, "つくる", "メール・企画書・表・グラフ、\nそしてプログラムまで。"),
    ]
    y = 620
    ch = 330
    for i, (accent, title, body) in enumerate(items):
        ia = appear(t, cue(i + 1, 0.5 + i * 0.45), 0.65)
        cy = int(y + (1 - ia) * 40)
        card(f, MARGIN, cy, W - MARGIN * 2, ch, ia, accent)
        draw_text(f, MARGIN + 68, cy + 52, f"0{i + 1}", 34, "Bold", accent, ia, family="latin")
        draw_text(f, MARGIN + 68, cy + 108, title, 60, "Bold", LIGHT, ia)
        draw_text(f, MARGIN + 68, cy + 196, body, 42, "Medium", MID_GRAY, ia,
                  max_width=W - MARGIN * 2 - 130, line_gap=1.5)
        y += ch + 34


def scene_where(f: Frame, t: float) -> None:
    c_chat, c_code = cue(1, 0.7), cue(2, 1.5)
    a0 = appear(t, cue(0, 0.1), 0.6)
    draw_text(f, MARGIN, int(400 + (1 - a0) * 20), "どこで会える?", 44, "Medium", ORANGE, a0)
    draw_text(f, MARGIN, int(470 + (1 - a0) * 24), "話しかける場所は\n選べます。", 82, "Bold", LIGHT, a0,
              line_gap=1.42)

    a1 = appear(t, c_chat, 0.65)
    cy = int(760 + (1 - a1) * 36)
    card(f, MARGIN, cy, W - MARGIN * 2, 300, a1, BLUE)
    draw_text(f, MARGIN + 68, cy + 60, "チャットで相談する", 58, "Bold", LIGHT, a1)
    draw_text(f, MARGIN + 68, cy + 150, "Claude のアプリやブラウザで、\nふつうに話しかけるだけ。", 42,
              "Medium", MID_GRAY, a1, max_width=W - MARGIN * 2 - 130, line_gap=1.5)

    a2 = appear(t, c_code, 0.65)
    cy2 = int(1100 + (1 - a2) * 36)
    card(f, MARGIN, cy2, W - MARGIN * 2, 470, a2, ORANGE)
    draw_text(f, MARGIN + 68, cy2 + 56, "Claude Code", 58, "Bold", LIGHT, a2, family="latin")
    draw_text(f, MARGIN + 68, cy2 + 146,
              "パソコンの中に入って、実際に\nファイルを開いて作業する私。", 42, "Medium", MID_GRAY, a2,
              max_width=W - MARGIN * 2 - 130, line_gap=1.5)
    tags = ["ターミナル", "デスクトップ", "ブラウザ", "エディタ"]
    tx = MARGIN + 68
    ty = cy2 + 320
    tf = get_font("jp", 34, "Medium")
    for i, tg in enumerate(tags):
        ta = appear(t, c_code + 0.5 + i * 0.13, 0.45) * a2
        tw = tf.getlength(tg) + 44
        if tx + tw > W - MARGIN - 40:
            tx = MARGIN + 68
            ty += 76
        if ta > 0.003:
            f.d.rounded_rectangle([tx, ty, tx + tw, ty + 62], 31,
                                  fill=rgba(ORANGE, 0.14 * ta), outline=rgba(ORANGE, 0.4 * ta), width=2)
            f.d.text((tx + tw / 2, ty + 14), tg, font=tf, fill=rgba(LIGHT, 0.9 * ta), anchor="ma")
        tx += tw + 18


def scene_family(f: Frame, t: float) -> None:
    a0 = appear(t, cue(0, 0.1), 0.6)
    draw_text(f, MARGIN, int(400 + (1 - a0) * 20), "なかま", 44, "Medium", ORANGE, a0)
    draw_text(f, MARGIN, int(470 + (1 - a0) * 24), "用事の大きさで\n使い分けます。", 82, "Bold", LIGHT, a0,
              line_gap=1.42)

    members = [
        (ORANGE, "Opus 5", "いちばん賢い", "むずかしい相談や、長い作業はこの子。"),
        (BLUE, "Sonnet 5", "ちょうどいい", "速さと賢さのバランス型。ふだん使いに。"),
        (GREEN, "Haiku 4.5", "とても速い", "かんたんな用事をサッと片づける係。"),
    ]
    y = 790
    ch = 290
    for i, (accent, name, tag, body) in enumerate(members):
        ia = appear(t, cue(i + 1, 0.55 + i * 0.42), 0.65)
        cy = int(y + (1 - ia) * 40)
        card(f, MARGIN, cy, W - MARGIN * 2, ch, ia, accent)
        draw_text(f, MARGIN + 68, cy + 52, name, 62, "Bold", LIGHT, ia, family="latin")
        nf = get_font("latin", 62, "Bold")
        tagx = MARGIN + 68 + int(nf.getlength(name)) + 28
        tf = get_font("jp", 32, "Bold")
        tw = tf.getlength(tag) + 36
        if ia > 0.003:
            f.d.rounded_rectangle([tagx, cy + 66, tagx + tw, cy + 66 + 54], 27, fill=rgba(accent, 0.18 * ia))
            f.d.text((tagx + tw / 2, cy + 78), tag, font=tf, fill=rgba(accent, ia), anchor="ma")
        draw_text(f, MARGIN + 68, cy + 158, body, 42, "Medium", MID_GRAY, ia,
                  max_width=W - MARGIN * 2 - 130, line_gap=1.5)
        y += ch + 30

    a3 = appear(t, cue(4, 2.3), 0.6)
    draw_text(f, W // 2, int(1700 + (1 - a3) * 20),
              "同じ性格、ちがう体力。", 44, "Medium", MID_GRAY, a3, align="center")


def scene_honest(f: Frame, t: float) -> None:
    c_good, c_bad, c_note = cue(1, 0.7), cue(2, 1.5), cue(3, 2.3)
    a0 = appear(t, cue(0, 0.1), 0.6)
    draw_text(f, MARGIN, int(420 + (1 - a0) * 20), "正直なところ", 44, "Medium", ORANGE, a0)
    draw_text(f, MARGIN, int(490 + (1 - a0) * 24), "得意も、苦手も\nあります。", 82, "Bold", LIGHT, a0,
              line_gap=1.42)

    a1 = appear(t, c_good, 0.65)
    cy = int(800 + (1 - a1) * 36)
    card(f, MARGIN, cy, W - MARGIN * 2, 300, a1, GREEN)
    draw_text(f, MARGIN + 68, cy + 54, "得意", 34, "Bold", GREEN, a1)
    draw_text(f, MARGIN + 68, cy + 112, "面倒で長い作業を、\n最後までやり切ること。", 52, "Bold", LIGHT, a1,
              line_gap=1.45)

    a2 = appear(t, c_bad, 0.65)
    cy2 = int(1150 + (1 - a2) * 36)
    card(f, MARGIN, cy2, W - MARGIN * 2, 300, a2, ORANGE)
    draw_text(f, MARGIN + 68, cy2 + 54, "苦手", 34, "Bold", ORANGE, a2)
    draw_text(f, MARGIN + 68, cy2 + 112, "自信たっぷりに\n間違えることがある。", 52, "Bold", LIGHT, a2,
              line_gap=1.45)

    a3 = appear(t, c_note, 0.6)
    draw_text(f, MARGIN, int(1540 + (1 - a3) * 20),
              "だから、大事な数字や事実は\n必ず確認してください。", 46, "Medium", MID_GRAY, a3,
              max_width=W - MARGIN * 2, line_gap=1.55)
    a4 = appear(t, c_note + 0.6, 0.6)
    draw_text(f, MARGIN, int(1700 + (1 - a4) * 18),
              "知っているのは 2026年5月ごろまでの話。", 38, "Medium", MID_GRAY, a4 * 0.85,
              max_width=W - MARGIN * 2)


def scene_close(f: Frame, t: float) -> None:
    cx = W // 2
    c_head, c_sub = cue(0, 0.15), cue(1, 0.85)
    a0 = appear(t, c_head, 0.7)
    a1 = appear(t, c_sub, 0.7)
    a2 = appear(t, c_sub + 1.2, 0.7)

    draw_text(f, cx, int(720 + (1 - a0) * 28), "むずかしいことは、\nこちらで。", 86, "Bold", LIGHT, a0,
              align="center", line_gap=1.42)
    draw_text(f, cx, int(1020 + (1 - a1) * 24),
              'あなたは「やりたいこと」を\n話すだけでいい。', 50, "Medium", MID_GRAY, a1,
              align="center", line_gap=1.55)

    lw = int(160 * ease_out((t - c_sub - 0.55) / 0.8))
    if lw > 2:
        f.d.rounded_rectangle([cx - lw // 2, 1210, cx + lw // 2, 1216], 3, fill=rgba(ORANGE, 0.9))

    fnt = get_font("latin", 128, "Bold")
    f.d.text((cx, int(1320 + (1 - a2) * 30)), "Opus 5", font=fnt, fill=rgba(LIGHT, a2), anchor="ma")
    draw_text(f, cx, int(1490 + (1 - a2) * 20), "by Anthropic", 42, "Medium", ORANGE, a2 * 0.9,
              align="center", family="latin")


# (尺[秒], 描画関数, 縦オフセット)
# オフセットは各シーンの内容を画面中央に揃えるための微調整値。
SCENES: list[tuple[float, callable, int]] = [
    (4.0, scene_hook, 20),
    (5.8, scene_who, -108),
    (6.6, scene_can_do, -63),
    (6.2, scene_where, -28),
    (6.0, scene_family, -118),
    (6.2, scene_honest, -124),
    (5.2, scene_close, -179),
]

TOTAL = sum(s[0] for s in SCENES)
FADE = 0.32  # シーン間のクロスフェード時間

# シーンごとのキュー(ナレーション各セリフの開始時刻)。timing JSON があれば埋まる。
CUES_BY_SCENE: list[list[float]] = [[] for _ in SCENES]

# 合成音声を使う版では、音声のライセンス(CC BY 3.0)に従って末尾に出典を出す。
VOICE_CREDIT: str | None = None


def apply_timing(path: str) -> None:
    """make_audio.py が書き出した timing JSON で、尺とキューを上書きする。"""
    global TOTAL
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    scenes = data["scenes"]
    if len(scenes) != len(SCENES):
        raise SystemExit(f"timing のシーン数({len(scenes)})が映像側({len(SCENES)})と一致しません")
    for i, sc in enumerate(scenes):
        dur, fn, offset = SCENES[i]
        SCENES[i] = (float(sc["dur"]), fn, offset)
        CUES_BY_SCENE[i] = [float(c) for c in sc.get("cues", [])]
    TOTAL = sum(s[0] for s in SCENES)


# ---------------------------------------------------------------- レンダリング

def render_frame(bg: Image.Image, t: float) -> Image.Image:
    global _CUES
    f = Frame(bg)
    draw_particles(f, t, 1.0)

    # 上部の進行バー
    p = clamp01(t / TOTAL)
    f.d.rectangle([0, 0, W, 8], fill=rgba(LIGHT, 0.10))
    if p > 0:
        f.d.rectangle([0, 0, int(W * p), 8], fill=rgba(ORANGE, 0.95))

    # 該当シーンを探す
    acc = 0.0
    last = len(SCENES) - 1
    for idx, (dur, fn, offset) in enumerate(SCENES):
        if t < acc + dur or idx == last:
            local = t - acc
            fade_in = ease_in_out(local / FADE)
            fade_out = ease_in_out((dur - local) / FADE)
            alpha = clamp01(min(fade_in, fade_out))
            sub = Frame(Image.new("RGBA", (W, H), (0, 0, 0, 0)))
            _CUES = CUES_BY_SCENE[idx]
            fn(sub, local)
            layer = sub.layer
            if offset:
                shifted = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                shifted.paste(layer, (0, offset))
                layer = shifted
            if alpha < 0.999:
                layer.putalpha(layer.getchannel("A").point(lambda v: int(v * alpha)))
            f.layer.alpha_composite(layer)
            # 出典は本文と別扱いなので、シーンの縦オフセットをかけず画面下に固定する
            if VOICE_CREDIT and idx == last:
                ca = appear(local, 2.6, 1.0) * alpha
                draw_text(f, W // 2, 1806, VOICE_CREDIT, 26, "Medium", MID_GRAY, ca * 0.6,
                          align="center", max_width=W - MARGIN, line_gap=1.4)
            break
        acc += dur

    return f.flatten()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="out/opus5_intro.mp4")
    ap.add_argument("--poster", default="out/opus5_intro_poster.jpg")
    ap.add_argument("--fps", type=int, default=FPS)
    ap.add_argument("--crf", type=int, default=20)
    ap.add_argument("--timing", help="make_audio.py が出力した timing JSON(尺とキューを同期させる)")
    ap.add_argument("--audio", help="多重化する音声ファイル。省略すると無音トラックになる")
    args = ap.parse_args()

    if args.timing:
        apply_timing(args.timing)
        print(f"タイミングを読み込みました: {args.timing}")

    if args.audio:
        global VOICE_CREDIT
        VOICE_CREDIT = 'Voice: HTS Voice "Mei" — Nagoya Institute of Technology / CC BY 3.0'

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    ffmpeg = os.environ.get("FFMPEG_BIN")
    if not ffmpeg:
        try:
            import imageio_ffmpeg

            ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            ffmpeg = "ffmpeg"

    total_frames = int(round(TOTAL * args.fps))
    print(f"背景を作成中… ({W}x{H})")
    bg = build_background()

    if args.audio:
        audio_in = ["-i", args.audio]
        audio_enc = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000"]
    else:
        # 音声トラックがないと再生できないプレイヤーがあるため、無音でも用意しておく
        audio_in = ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]
        audio_enc = ["-c:a", "aac", "-b:a", "64k"]

    cmd = [
        ffmpeg, "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(args.fps), "-i", "pipe:0",
        *audio_in,
        "-shortest",
        "-c:v", "libx264", "-preset", "medium", "-crf", str(args.crf),
        "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.1",
        "-g", str(args.fps * 2), "-movflags", "+faststart",
        *audio_enc,
        str(out),
    ]
    print(f"エンコード開始: {total_frames} フレーム / {TOTAL:.1f} 秒")
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin is not None

    poster_at = int(1.9 * args.fps)
    for i in range(total_frames):
        t = i / args.fps
        img = render_frame(bg, t)
        if i == poster_at and args.poster:
            Path(args.poster).parent.mkdir(parents=True, exist_ok=True)
            img.save(args.poster, quality=92)
        proc.stdin.write(img.tobytes())
        if i % 60 == 0:
            pct = 100 * i / total_frames
            print(f"  {i:4d}/{total_frames}  ({pct:5.1f}%)", flush=True)

    proc.stdin.close()
    rc = proc.wait()
    if rc != 0:
        print("ffmpeg が失敗しました", file=sys.stderr)
        return rc
    print(f"完成: {out}  ({out.stat().st_size / 1e6:.2f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
