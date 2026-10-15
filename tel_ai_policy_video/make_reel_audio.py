"""リール版 (reel.html) 用のBGMと効果音を合成して WAV に書き出す。

100BPM・1小節2.4秒で、原則カードの切り替わりを小節の頭にそろえてある。
音色は make_audio.py と同じ作りで、こちらは4つ打ちのキックとサイドチェイン風のうねりを足した。
06 (禁止対象のAI) の3小節だけビートを抜いて暗い和音にする。

    python3 make_reel_audio.py reel_bgm.wav
"""
import subprocess
import sys
import wave

import numpy as np

SR = 48000
DUR = 53.0
N = int(SR * DUR)
BEAT = 0.6           # 100 BPM
BAR = BEAT * 4       # 2.4 秒
rng = np.random.default_rng(20261015)

BUS = {k: np.zeros((2, N)) for k in ("pad", "main")}
SEND = np.zeros((2, N))


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(sec):
    return np.arange(int(sec * SR)) / SR


def put(start, sig, pan=0.0, gain=1.0, rev=0.0, bus="main"):
    i0 = int(round(start * SR))
    if i0 >= N or i0 + len(sig) <= 0:
        return
    pan = np.broadcast_to(np.asarray(pan, dtype=float), sig.shape)
    if i0 < 0:
        sig, pan, i0 = sig[-i0:], pan[-i0:], 0
    sig, pan = sig[: N - i0], pan[: N - i0]
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    seg = slice(i0, i0 + len(sig))
    BUS[bus][0, seg] += sig * gl * gain
    BUS[bus][1, seg] += sig * gr * gain
    if rev:
        SEND[0, seg] += sig * gl * gain * rev
        SEND[1, seg] += sig * gr * gain * rev


# ---------- 音色 ----------
def pad_chord(start, dur, notes, gain=0.16, attack=0.5, release=0.9):
    t = tt(dur + release * 4)
    env = np.minimum(1, t / attack) * np.where(t < dur, 1.0, np.exp(-(t - dur) / release))
    for m in notes:
        f = midi(m)
        for det, pan in ((-0.004, -0.6), (0.004, 0.6)):
            ph = rng.random() * 2 * np.pi
            s = np.zeros_like(t)
            for h, a in ((1, 1.0), (2, 0.36), (3, 0.16), (4, 0.07), (5, 0.03)):
                if f * h < 7000:
                    s += a * np.sin(2 * np.pi * f * (1 + det) * h * t + ph * h)
            put(start, s * env, pan, gain / len(notes) * (0.45 if m < 52 else 1.0), rev=0.8, bus="pad")


def bass_note(start, dur, m, gain):
    f = midi(m)
    t = tt(dur + 0.3)
    env = np.minimum(1, t / 0.006) * np.where(t < dur, np.exp(-t / 0.5), np.exp(-dur / 0.5) * np.exp(-(t - dur) / 0.05))
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.1 * np.sin(6 * np.pi * f * t)
    put(start, s * env, 0, gain, bus="pad")


def pluck(f, decay=0.22):
    t = tt(1.0)
    env = (1 - np.exp(-t / 0.003)) * np.exp(-t / decay)
    s = (np.sin(2 * np.pi * f * t)
         + 0.4 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.1)
         + 0.12 * np.sin(6 * np.pi * f * t) * np.exp(-t / 0.05))
    return s * env


def bell(f, decay=1.0):
    t = tt(3.5)
    env = (1 - np.exp(-t / 0.003)) * np.exp(-t / decay)
    s = (np.sin(2 * np.pi * f * t)
         + 0.35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.4)
         + 0.15 * np.sin(2 * np.pi * 5.40 * f * t) * np.exp(-t / 0.15))
    return s * env


def kick():
    t = tt(0.45)
    f = 48 + 90 * np.exp(-t * 34)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * (1 - np.exp(-t / 0.0015))
    return s + 0.15 * np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 300)


def band_noise(sec, lo, hi):
    n = int(sec * SR)
    X = np.fft.rfft(rng.standard_normal(n))
    fr = np.fft.rfftfreq(n, 1 / SR)
    X *= ((fr > lo) & (fr < hi)) / np.sqrt(np.maximum(fr, 1) / 1000)
    x = np.fft.irfft(X, n)
    return x / np.abs(x).max()


def clap():
    x = band_noise(0.3, 900, 9000)
    t = np.arange(len(x)) / SR
    env = sum(np.exp(-np.maximum(t - d, 0) / 0.006) * (t >= d) for d in (0, 0.011, 0.022)) * 0.4 + np.exp(-t / 0.07) * (t >= 0.022)
    return x * env


def hat():
    n = int(0.08 * SR)
    x = np.diff(rng.standard_normal(n + 2), 2)
    t = np.arange(n) / SR
    return x * (1 - np.exp(-t / 0.002)) * np.exp(-t / 0.02) * 0.3


def whoosh(at, gain=0.16, dur=0.9, peak=0.7, lr=True):
    x = band_noise(dur, 300, 8000)
    t = np.arange(len(x)) / SR
    p = peak * dur
    env = np.where(t < p, (t / p) ** 2.4, np.exp(-(t - p) / 0.08))
    put(at - p, x * env, np.linspace(-0.7, 0.7, len(x)) * (1 if lr else -1), gain, rev=0.4)


def riser(end, sec, gain=0.12):
    x = band_noise(sec, 500, 10000)
    t = np.arange(len(x)) / SR
    put(end - sec, x * (t / t[-1]) ** 3, np.linspace(-0.4, 0.4, len(x)), gain, rev=0.5)


def boom(at, gain=0.4):
    t = tt(2.5)
    f = 38 + 40 * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.8) * (1 - np.exp(-t / 0.003))
    s += 0.3 * band_noise(2.5, 60, 2500) * np.exp(-t * 9)
    put(at, s, 0, gain, rev=0.6)


def blip(at, f=1760, gain=0.05, pan=0.0):
    t = tt(0.3)
    s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.045) * (1 - np.exp(-t / 0.0015))
    put(at, s, pan, gain, rev=0.5)


# ---------- 和声（1小節ごと） ----------
D, Bm, G, A = [50, 57, 61, 64, 66], [47, 54, 57, 61, 62], [43, 50, 54, 57, 59], [45, 52, 57, 59, 62]
DK = [[47, 54, 61, 62, 66], [43, 50, 54, 61, 62], [42, 49, 54, 59, 61]]
BARS = [D, Bm, G, A, D, Bm, G, A, D, Bm] + DK + [D, Bm, G, A, D, G, A]
for b, notes in enumerate(BARS):
    pad_chord(b * BAR, BAR, notes, gain=0.12 if b < 2 or b >= 18 else 0.15)
pad_chord(48.0, 4.6, D, gain=0.14, attack=0.3, release=1.2)


def chord_at(time):
    b = int(time // BAR)
    return BARS[b] if b < len(BARS) else D


def in_beat(time):
    return 4.8 <= time < 24.0 or 31.2 <= time < 43.2


# ベース: ビート区間は裏拍の8分、それ以外は小節頭に長く
for kb in range(int(DUR / BEAT * 2)):
    tm = kb * BEAT / 2
    root = chord_at(tm)[0]
    root = root - 12 if root >= 45 else root
    if in_beat(tm) and kb % 2 == 1:
        bass_note(tm, BEAT / 2 * 0.9, root, 0.11)
    elif (2.4 <= tm < 4.8 or 43.2 <= tm < 52) and kb % 8 == 0:
        bass_note(tm, BAR * 0.9, root, 0.08)

# アルペジオ: 16分
PATTERN = [0, 2, 1, 3, 2, 4, 3, 1, 0, 3, 2, 4, 1, 3, 2, 0]
k = 0
for tm in np.arange(0, 48.0, BEAT / 4):
    if 24.0 <= tm < 31.2:
        continue
    pcs = sorted({n % 12 for n in chord_at(tm)[1:]})
    pool = [p for p in (p + 12 * o for o in (6, 7) for p in pcs) if 74 <= p <= 91]
    m = pool[PATTERN[k % 16] % len(pool)]
    lvl = 0.055 if (tm < 4.8 or tm >= 43.2) else 0.075
    put(tm, pluck(midi(m)), 0.4 if k % 2 else -0.4, lvl * (0.8 + 0.35 * rng.random()) * (1 if k % 4 == 0 else 0.75), rev=0.6)
    k += 1

# ドラム
for kb in range(int(DUR / BEAT)):
    bt = kb * BEAT
    if in_beat(bt):
        put(bt, kick(), 0, 0.42)
        if kb % 2 == 1:
            put(bt, clap(), 0.05, 0.13, rev=0.3)
        put(bt + BEAT / 2, hat(), 0.3, 0.11)
        put(bt + BEAT / 4, hat(), -0.3, 0.045)
        put(bt + BEAT * 3 / 4, hat(), -0.3, 0.045)
    elif 24.0 <= bt < 31.2:  # 06: 鼓動のような低いパルス
        tp = tt(0.5)
        put(bt, np.sin(2 * np.pi * 61.7 * tp) * np.exp(-tp * 9) * (1 - np.exp(-tp / 0.004)), 0, 0.3 if kb % 2 == 0 else 0.18)
# 06 から戻る直前のクラップのフィル
for i, tm in enumerate(np.arange(30.0, 31.2, BEAT / 4)):
    put(tm, clap(), 0, 0.04 + 0.06 * i / 8, rev=0.3)

# サイドチェイン風のうねり: キックのたびに pad バスを沈める
t = np.arange(N) / SR
pump = np.ones(N)
for kb in range(int(DUR / BEAT)):
    bt = kb * BEAT
    if in_beat(bt):
        i0, i1 = int(bt * SR), min(N, int((bt + BEAT) * SR))
        pump[i0:i1] = 1 - 0.55 * np.exp(-(t[i0:i1] - bt) / 0.13)
BUS["pad"] *= pump

# 06 のベル
for k, bt in enumerate(np.arange(24.0, 31.2, BAR)):
    notes = chord_at(bt)
    put(bt + 0.01, bell(midi(notes[-1] + 12)), 0.3 if k % 2 else -0.3, 0.08, rev=1.0)
    put(bt + BEAT * 2, bell(midi(notes[-2] + 12)), -0.3 if k % 2 else 0.3, 0.06, rev=1.0)
# クロージングのベル
for k, bt in enumerate((43.2, 44.4, 45.6, 46.8)):
    put(bt, bell(midi([81, 78, 83, 85][k])), 0.25 * (-1) ** k, 0.06, rev=1.0)
# エンドカード: ダイの点灯に合わせて D メジャー・ペンタトニックで上昇
for i, m in enumerate([74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98]):
    put(48.6 + i * 0.1, bell(midi(m), decay=1.4), -0.6 + i * 0.12, 0.05, rev=1.0)
put(49.8, bell(midi(62), decay=2.6), 0, 0.09, rev=1.0)
put(49.8, bell(midi(69), decay=2.6), 0, 0.06, rev=1.0)

# ---------- 効果音 ----------
boom(0.0, 0.32)
put(0.0, pluck(midi(86), decay=0.6), 0, 0.12, rev=0.8)
riser(2.4, 0.9, 0.1)
boom(2.4, 0.26)
for at, lr in ((4.8, True), (7.2, False), (9.6, True)):
    whoosh(at, 0.11, dur=0.6, lr=lr)
for k, at in enumerate((12.0, 14.4, 24.0, 31.2, 38.4, 43.2)):
    whoosh(at, 0.17, lr=k % 2 == 0)
riser(24.0, 1.2, 0.08)
boom(24.0, 0.36)
riser(31.2, 1.2, 0.1)
riser(48.0, 1.0, 0.07)
for at in (16.8, 19.2, 21.6, 33.6, 36.0, 40.8):
    whoosh(at, 0.07, dur=0.45, lr=at % 4.8 < 2.4)
for i in range(11):
    blip(9.85 + i * 0.06, f=midi(86 + (i % 3) * 2), gain=0.03, pan=-0.6 + i * 0.12)
for i in range(4):
    blip(24.9 + i * 0.1, f=midi(73), gain=0.045, pan=-0.3 + i * 0.2)
for i in range(5):
    blip(26.5 + i * 0.2, f=midi(78), gain=0.04, pan=0.3)
blip(29.55, f=midi(81), gain=0.05)


# ---------- リバーブとマスタリング ----------
def make_ir(sec=2.2, tau=0.36):
    n = int(sec * SR)
    tt_ = np.arange(n) / SR
    out = []
    for _ in range(2):
        x = rng.standard_normal(n) * np.exp(-tt_ / tau)
        X = np.fft.rfft(x)
        X *= 1 / (1 + (np.fft.rfftfreq(n, 1 / SR) / 5500) ** 2)
        x = np.fft.irfft(X, n)
        x[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
        out.append(x / np.sqrt(np.sum(x ** 2)))
    return out


def fft_convolve(a, b):
    size = 1 << (len(a) + len(b) - 2).bit_length()
    return np.fft.irfft(np.fft.rfft(a, size) * np.fft.rfft(b, size), size)[: len(a)]


ir = make_ir()
wet = np.stack([fft_convolve(SEND[c], ir[c]) for c in range(2)])
mix = BUS["pad"] + BUS["main"] + 0.5 * wet

# 低域を軽く削り、2〜5kHz を少し持ち上げる（スマホのスピーカー向け）
F = np.fft.rfft(mix, axis=1)
fr = np.fft.rfftfreq(N, 1 / SR)
db = -5 / (1 + (fr / 90) ** 2) + 3 * np.exp(-((np.log2(np.maximum(fr, 1) / 3200)) ** 2) / 0.6)
hp = (np.maximum(fr, 1) / 32) ** 2
db += 20 * np.log10(hp / np.sqrt(1 + hp ** 2))  # 32Hz の2次ハイパス
mix = np.fft.irfft(F * 10 ** (db / 20), N, axis=1)

mix *= np.minimum(1, t / 0.01) * np.clip((DUR - t) / 1.0, 0, 1)
mix /= np.abs(mix).max() / 0.89

out = sys.argv[1] if len(sys.argv) > 1 else "reel_bgm.wav"
raw = out.replace(".wav", "_raw.wav")
with wave.open(raw, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype("<i2").tobytes())

# リール向けにラウドネスを -14 LUFS 前後へ
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw,
                "-af", "loudnorm=I=-14:TP=-1.2:LRA=9", "-ar", str(SR), out], check=True)
print("wrote", out)
