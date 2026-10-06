"""BEYOND WORDS 予告編(ハリウッド版)の縦長 1080x1920 版。ポスターをサムネイル兼オープニングに使う。

usage: python3 epic_vertical.py FONT_DIR AUDIO_WAV OUT_MP4 [--preview t1,t2,...]
       python3 epic_vertical.py FONT_DIR - THUMB_JPG --thumb
"""
import os, subprocess, sys
os.environ["VERTICAL"] = "1"
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageFilter
import epic_render as E
from epic_render import (W, H, FPS, DUR, POSTER, CUTS, HAZE, HAZE_RED, card, blit, metal, streak, particles,
                         face, flash, chroma, hline, ink_width, env, ease_out, mincho, cinzel, mont, sans)
import math

CX, CY = W / 2, H / 2

# ポスター: 横幅いっぱいに置き、上下の余白はぼかしたポスターで埋める
_fit_h = int(POSTER.height * W / POSTER.width)
POSTER_FIT = POSTER.resize((W, _fit_h), Image.LANCZOS)
_cover = POSTER.resize((int(POSTER.width * H / POSTER.height), H), Image.LANCZOS)
_cover = _cover.crop(((_cover.width - W) // 2, 0, (_cover.width - W) // 2 + W, H)).filter(ImageFilter.GaussianBlur(40))
POSTER_BG = np.asarray(_cover, np.float32) / 255 * 0.35


def poster(buf, a, zoom=1.0):
    if a <= 0.01: return
    w, h = int(W * zoom), int(_fit_h * zoom)
    im = np.asarray(POSTER_FIT.resize((w, h), Image.BICUBIC), np.float32) / 255
    x0, y0 = (w - W) // 2, (h - H) // 2
    layer = POSTER_BG.copy()
    if y0 >= 0:
        layer[:] = im[y0 : y0 + H, x0 : x0 + W]
    else:
        layer[-y0 : -y0 + h, :] = im[:, x0 : x0 + W]
    buf[:] = buf * (1 - a) + layer * a


def scene(t):
    buf = np.zeros((H, W, 3), np.float32)

    # 0 サムネイルのポスター → 閃光でトレーラーへ
    if t < 1.7:
        poster(buf, env(t, -1, 1.7, 0.01, 0.35), 1.0 + 0.04 * t)

    # A
    if 1.4 <= t < 4.7:
        bloom = ease_out((t - 1.4) / 1.2) * env(t, 1.4, 4.7, 0.3, 0.5)
        buf += HAZE * 0.35 * bloom
        streak(buf, CX, CY, 1.2 * bloom * (0.85 + 0.15 * math.sin(t * 3)), length=350 + 250 * bloom)
        particles(buf, t, 0.5 * bloom)
        card(buf, "THIS  NOVEMBER", cinzel(60), "gold", CX, CY + 110, t, 1.8, 4.6, fi=1.2, track=18, sweep=True)

    # B 縦書きの問い
    if 4.8 <= t < 9.0:
        buf += HAZE * 0.22 * env(t, 4.8, 9.0, 1.2, 0.5)
        particles(buf, t, 0.45 * env(t, 4.8, 9.0, 1, 0.5))
        card(buf, "言葉は、", mincho(58), "silver", 820, 470, t, 5.0, 8.9, track=8, anchor="t", vertical=True)
        card(buf, "人を、つなぐのか。", mincho(100), "silver", 620, 560, t, 6.2, 8.9, track=4, anchor="t", vertical=True)

    # C / D
    face(buf, "b", t, 9.0, 12.6, 1.0, 1.12, 8)
    card(buf, "同じ言葉でも、", mincho(56), "silver", 90, 1290, t, 9.4, 12.5, track=8, glow=0.4, anchor="l")
    card(buf, "伝わらないことがある。", mincho(70), "silver", 990, 1400, t, 10.2, 12.5, track=6, glow=0.5, anchor="r")
    face(buf, "i", t, 12.5, 16.0, 1.12, 1.0, -8)
    card(buf, "言葉が通じなくても、", mincho(54), "silver", 90, 1290, t, 12.9, 15.9, track=6, glow=0.4, anchor="l")
    card(buf, "伝わることがある。", mincho(78), "silver", 990, 1400, t, 13.6, 15.9, track=8, glow=0.5, anchor="r")

    # E 三連打: 縦書き → 左寄せ → 中央
    for i, (jp, en) in enumerate([("九人の語り手。", "NINE  VOICES"), ("二つの言語。", "TWO  LANGUAGES"),
                                  ("ひとつの舞台。", "ONE  STAGE")]):
        t0 = 16.0 + i * 2
        if t0 <= t < t0 + 2:
            buf += HAZE_RED * 0.45 * env(t, t0, t0 + 2, 0.05, 0.4)
            particles(buf, t, 0.4, (1, .55, .4), 1.6)
            hit = 1.4 * (1 - ease_out((t - t0) / 1.2)) + 0.25
            if i == 0:
                streak(buf, CX, 1470, hit, color=(1, .35, .25), length=700)
                card(buf, jp, mincho(128), "silver", CX, 380, t, t0, t0 + 1.95, fo=0.35, slam=True, track=4, anchor="t", vertical=True)
                card(buf, en, cinzel(40), "gold", CX, 1470, t, t0 + 0.25, t0 + 1.95, fi=0.4, fo=0.35, track=20)
            elif i == 1:
                streak(buf, 380, 960, hit, color=(1, .35, .25), length=700)
                card(buf, jp, mincho(130), "silver", 90, 830, t, t0, t0 + 1.95, fo=0.35, slam=True, track=10, anchor="l")
                card(buf, en, cinzel(40), "gold", 98, 960, t, t0 + 0.25, t0 + 1.95, fi=0.4, fo=0.35, track=20, anchor="l")
            else:
                streak(buf, CX, 1090, hit, color=(1, .35, .25), length=700)
                card(buf, jp, mincho(118), "silver", CX, 960, t, t0, t0 + 1.95, fo=0.35, slam=True, track=6)
                card(buf, en, cinzel(40), "gold", CX, 1090, t, t0 + 0.25, t0 + 1.95, fi=0.4, fo=0.35, track=20)

    # F / G
    face(buf, "a", t, 22.0, 25.6, 1.0, 1.1, 6)
    card(buf, "海外のリーダーは、", mincho(52), "silver", 90, 1280, t, 22.3, 25.5, track=8, glow=0.4, anchor="l")
    card(buf, "日本語で語る。", mincho(112), "red", 80, 1410, t, 23.2, 25.5, track=10, glow=0.6, anchor="l")
    face(buf, "d", t, 25.5, 29.0, 1.1, 1.0, -6)
    card(buf, "日本のリーダーは、", mincho(52), "silver", 990, 1280, t, 25.8, 28.95, track=8, glow=0.4, anchor="r")
    card(buf, "英語で語る。", mincho(120), "red", 1000, 1410, t, 26.7, 28.95, track=10, glow=0.6, anchor="r")

    # H 巨大な縦書きを左右交互に
    for i, (k, s, x) in enumerate([("c", "言葉も、", 880), ("g", "育ちも、", 880), ("h", "文化も、", 200)]):
        t0 = 29.0 + i * 1.2
        face(buf, k, t, t0, t0 + 1.2, 1.15, 1.25, 0, fi=0.02, fo=0.15, shade=0.5)
        card(buf, s, mincho(150), "silver", x, 1080, t, t0, t0 + 1.18, fo=0.15, slam=True, track=0, anchor="t", vertical=True)
    if 32.6 <= t < 34.0:
        buf += HAZE_RED * 0.3 * env(t, 32.6, 34.0, 0.02, 0.3)
        streak(buf, CX, 1160, 1.6 * (1 - ease_out((t - 32.6) / 1.0)) + 0.2, color=(1, .3, .2), length=800)
        card(buf, "すべてが、", mincho(60), "silver", 110, 740, t, 32.6, 34.0, fo=0.12, track=14, anchor="l")
        card(buf, "違う。", mincho(290), "red", CX, 980, t, 32.72, 34.0, fo=0.12, slam=True, track=10)

    # I
    if 34.8 <= t < 39.0:
        e = env(t, 34.8, 39.0, 1.6, 0.6)
        buf += HAZE * 0.45 * e
        particles(buf, t, 0.7 * e, (1, .92, .8), 0.6)
        streak(buf, CX, 380, 0.35 * e, color=(1, .85, .6), length=500)
        card(buf, "それでも、", mincho(52), "silver", CX + 130, 520, t, 35.0, 38.9, fi=1.2, track=8,
             glow=0.5, anchor="t", vertical=True)
        card(buf, "人は、つながる。", mincho(92), "gold", CX - 40, 580, t, 36.3, 38.9, fi=1.4, track=2,
             sweep=True, anchor="t", vertical=True)

    # J
    if 39.0 <= t < 43.5:
        buf += HAZE * 0.25 * env(t, 39.0, 43.5, 0.8, 0.4)
        particles(buf, t, 0.45, (1, .9, .85), 0.6)
        card(buf, "英語は、話せない。", mincho(56), "silver", 100, 640, t, 39.2, 43.4, track=12, glow=0.5, anchor="l")
        if t >= 41.0:
            buf += HAZE_RED * 0.25 * env(t, 41.0, 43.5, 0.05, 0.4)
            streak(buf, CX, 1390, 1.2 * (1 - ease_out((t - 41.0) / 1.2)), color=(1, .3, .2), length=800)
        card(buf, "だから、", mincho(74), "red", 100, 800, t, 41.0, 43.4, slam=True, track=12, anchor="l")
        card(buf, "英語で", mincho(190), "red", 990, 1020, t, 41.15, 43.4, slam=True, track=10, anchor="r")
        card(buf, "語る。", mincho(190), "red", 990, 1240, t, 41.3, 43.4, slam=True, track=10, anchor="r")

    # K
    if 43.5 <= t < 48.5:
        i = max(j for j, c in enumerate(CUTS) if c <= t)
        nxt = CUTS[i + 1] if i + 1 < len(CUTS) else 48.5
        face(buf, "abcdefghi"[i % 9], t, CUTS[i], nxt, 1.15, 1.25, 0, fi=0.0, fo=0.0, shade=0.5)
        flash(buf, t, CUTS[i], 0.5, 0.07)
        for wd, a, b, anc, x, y, sz in [("PEOPLE", 43.5, 45.1, "l", 70, 1430, 110),
                                        ("IDEAS", 45.1, 46.7, "r", W - 70, 420, 120),
                                        ("CONNECTIONS", 46.7, 48.45, "", CX, 1430, 76)]:
            if a <= t <= b:
                card(buf, wd, cinzel(sz, 800), "gold", x, y, t, a, b, fi=0.15, fo=0.1, track=16, glow=1.0, anchor=anc)
                streak(buf, CX, y, 0.5 + 0.9 * (t - 43.5) / 5, color=(1, .5, .3), length=900)

    # M タイトル
    if 49.3 <= t < 55.0:
        lt = t - 49.3
        e = env(t, 49.3, 55.0, 0.01, 0.5)
        buf += HAZE_RED * 0.55 * e + HAZE * 0.15 * e
        particles(buf, t, 0.9 * e, (1, .35, .18), 2.2)
        sc = 1.0 + 0.05 * ease_out(lt / 5.7)
        sw = -0.3 + 1.6 * (lt / 2.0)
        blit(buf, metal("BEYOND", mont(178), "silver", 6), CX - 40, CY - 100, e, sc, sw, 0.7)
        blit(buf, metal("WORDS", mont(178), "red", 6), CX + 50, CY + 70, e, sc, sw - 0.15, 1.0)
        streak(buf, W * (0.1 + 0.8 * ease_out(lt / 3.5)), CY - 15, 1.6 * (1 - ease_out(lt / 2.5)) + 0.25 * e,
               color=(.5, .6, 1), length=900)
        right = CX + 50 + ink_width("WORDS", mont(178), 6) / 2 * sc
        left = CX - 40 - ink_width("BEYOND", mont(178), 6) / 2 * sc
        card(buf, "言葉を越えて、つながる。", mincho(40), "silver", left, CY - 225, t, 52.0, 54.95, fi=1.0, fo=0.5,
             track=12, glow=0.4, anchor="l")
        card(buf, "PEOPLE × IDEAS × CONNECTIONS", mont(26, 500), "gold", right, CY + 185, t, 50.8, 54.95,
             fi=1.0, fo=0.5, track=8, glow=0.5, anchor="r")

    # N 開催情報
    if 55.0 <= t < 61.5:
        g = POSTER_BG.mean(-1, keepdims=True) * np.array([1.0, .7, .65]) * 0.9
        buf += g * env(t, 55.0, 61.5, 0.8, 0.5)
        particles(buf, t, 0.5, (1, .5, .3), 1.5)
        e1 = env(t, 55.0, 58.6, 0.05, 0.4)
        streak(buf, CX, 1060, 1.4 * (1 - ease_out((t - 55.0) / 1.5)) * e1 + 0.15 * e1, color=(1, .75, .4), length=800)
        card(buf, "11.22", cinzel(250, 800), "gold", CX, 880, t, 55.0, 58.6, fo=0.4, slam=True, track=6, sweep=True)
        card(buf, "SUNDAY", cinzel(50), "silver", 140, 1080, t, 55.8, 58.6, fi=0.6, fo=0.4, track=14, glow=0.4, anchor="l")
        card(buf, "14:00 – 16:00", cinzel(50), "silver", W - 140, 1160, t, 56.1, 58.6, fi=0.6, fo=0.4, track=6, glow=0.4, anchor="r")
        e2 = env(t, 58.5, 61.4, 0.5, 0.5)
        hline(buf, 90, 90 + (W - 180) * ease_out((t - 58.5) / 0.9), 960, e2)
        card(buf, "東急プラザ原宿 3F", sans(34, 500), "silver", 95, 790, t, 58.8, 61.4, fi=0.5, track=10, glow=0.2, anchor="l")
        card(buf, "原宿 HOW’z Cafe", sans(80, 800), "silver", 90, 880, t, 58.5, 61.4, fi=0.5, track=4, glow=0.4, anchor="l")
        card(buf, "参加費 5,500円", sans(72, 800), "gold", W - 90, 1050, t, 59.3, 61.4, fi=0.5, track=4, glow=0.5, anchor="r")
        card(buf, "軽食・ドリンク付き", sans(34, 500), "silver", W - 92, 1135, t, 59.5, 61.4, fi=0.5, track=10, glow=0.2, anchor="r")

    # O 締め → 最後はポスターに戻る（ループ再生でもつながる）
    if 61.5 <= t < 63.2:
        e = env(t, 61.5, 63.2, 0.6, 0.4)
        buf += HAZE * 0.2 * e
        particles(buf, t, 0.4 * e, (1, .9, .8), 0.5)
        card(buf, "英語が得意じゃなくても、", mincho(52), "silver", CX, CY - 50, t, 61.6, 63.2, fi=0.6, fo=0.4, track=10, glow=0.3)
        card(buf, "大丈夫。", mincho(84), "gold", CX, CY + 60, t, 62.0, 63.2, fi=0.6, fo=0.4, track=14, glow=0.5)
    if t >= 62.9:
        poster(buf, env(t, 62.9, DUR + 1, 0.5, 0.1), 1.04 - 0.04 * (t - 62.9) / 1.1)

    for h0 in E.HITS + [1.6]:
        flash(buf, t, h0, 0.9 if h0 in (49.3, 1.6) else 0.55, 0.14)
    kick = max([max(0.0, 1 - (t - h0) / 0.3) for h0 in E.HITS if t >= h0] + [0.0])
    if kick > 0:
        chroma(buf, 8 * kick)
        buf = np.roll(buf, (int(10 * kick * math.cos(t * 83)), int(12 * kick * math.sin(t * 97))), (0, 1))
    return buf


GRAIN = E.GRAIN
VIG = E.VIG


def frame(n):
    t = n / FPS
    buf = scene(t)
    poster_only = t < 1.3 or t > 63.5
    buf = buf if poster_only else buf * VIG + GRAIN[n % 6]
    if not poster_only:
        buf = buf / (1 + np.maximum(buf - 0.85, 0) * 1.2)
    return (np.clip(buf, 0, 1) * 255).astype(np.uint8)


def main():
    out = sys.argv[3]
    if "--thumb" in sys.argv:
        Image.fromarray(frame(0)).save(out, quality=92)
        return
    if "--preview" in sys.argv:
        for t in [float(x) for x in sys.argv[sys.argv.index("--preview") + 1].split(",")]:
            Image.fromarray(frame(int(round(t * FPS)))).resize((540, 960)).save(f"{out}_{t:05.1f}.png")
        return
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-i", sys.argv[2], "-c:v", "libx264", "-preset", "medium",
           "-b:v", "3200k", "-maxrate", "5M", "-bufsize", "8M", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(os.cpu_count()) as pool:
        for fr in pool.imap(frame, range(int(DUR * FPS)), chunksize=4):
            p.stdin.write(fr.tobytes())
    p.stdin.close()
    p.wait()


if __name__ == "__main__":
    main()
