"""BEYOND WORDS 予告編(ハリウッド版)のスコアを合成する。

低弦、和太鼓、ブラーム、クワイア、シェパードトーンのライザーを重ね、
最後に大きなホール残響をかけて epic_audio.wav に書き出す。
"""
import sys, wave
import numpy as np

SR = 48000
DUR = 64.0
N = int(SR * DUR)
rng = np.random.default_rng(11)
dry = np.zeros((N, 2))
wet = np.zeros((N, 2))  # 残響へ送るバス

NOTE = {"Bb1": 58.27, "C2": 65.41, "D2": 73.42, "F2": 87.31, "G2": 98.0, "A2": 110.0,
        "Bb2": 116.54, "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.0,
        "A3": 220.0, "Bb3": 233.08, "C4": 261.63, "D4": 293.66, "F4": 349.23, "A4": 440.0, "D5": 587.33}


def tt(d): return np.arange(int(d * SR)) / SR


def lp(x, hi, lo=0.0):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X * ((f <= hi) & (f >= lo)), len(x))


def saw(freq, t, ph=0.0): return 2 * ((freq * t + ph) % 1.0) - 1


def put(sig, t0, gain=1.0, pan=0.0, send=0.4):
    i = int(t0 * SR)
    if sig.ndim == 1:
        sig = np.stack([sig * np.sqrt((1 - pan) / 2), sig * np.sqrt((1 + pan) / 2)], 1) * 1.414
    sig = sig[: max(0, N - i)] * gain
    dry[i : i + len(sig)] += sig * (1 - send * 0.5)
    wet[i : i + len(sig)] += sig * send


def envelope(n, attack, release):
    t = np.arange(n) / SR
    d = n / SR
    return np.clip(t / attack, 0, 1) ** 1.5 * np.clip((d - t) / release, 0, 1) ** 1.5


# ---------- 楽器 ----------
def strings(t0, t1, notes, gain=0.12, attack=1.5, release=1.5, bright=1800, trem=0.0):
    t = tt(t1 - t0)
    out = np.zeros((len(t), 2))
    for n in notes:
        f = NOTE[n]
        for v, c in enumerate((-9, -4, 0, 4, 9)):
            ff = f * 2 ** (c / 1200) * (1 + 0.002 * np.sin(2 * np.pi * (4.7 + v * 0.3) * t + v))
            s = saw(1, np.cumsum(ff) / SR, rng.random())
            out[:, v % 2] += s
    out = np.stack([lp(out[:, 0], bright), lp(out[:, 1], bright)], 1)
    if trem:
        out *= (0.65 + 0.35 * np.sin(2 * np.pi * trem * t))[:, None]
    out *= envelope(len(t), attack, release)[:, None] * gain / len(notes)
    put(out, t0, send=0.55)


def choir(t0, t1, notes, gain=0.10, attack=1.2, release=2.0):
    t = tt(t1 - t0)
    out = np.zeros((len(t), 2))
    for n in notes:
        f = NOTE[n]
        for v in range(4):
            vib = 1 + 0.006 * np.sin(2 * np.pi * (5.2 + v * 0.25) * t + v * 1.7)
            ff = f * 2 ** ((v - 1.5) * 5 / 1200) * vib
            out[:, v % 2] += saw(1, np.cumsum(ff) / SR, rng.random())
    # 「アー」の母音に近づけるフォルマント
    for ch in range(2):
        X = np.fft.rfft(out[:, ch])
        fr = np.fft.rfftfreq(len(out), 1 / SR)
        w = (np.exp(-((fr - 700) / 160) ** 2) + 0.7 * np.exp(-((fr - 1150) / 180) ** 2)
             + 0.25 * np.exp(-((fr - 2700) / 300) ** 2) + 0.15 * (fr < 400))
        out[:, ch] = np.fft.irfft(X * w, len(out))
    out *= envelope(len(t), attack, release)[:, None] * gain / len(notes) * 3
    put(out, t0, send=0.8)


def taiko(gain=1.0, size=1.0):
    t = tt(1.6)
    f = 42 * size + 70 * np.exp(-t * 22)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5.5)
    skin = lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 35) * 0.8
    return np.tanh((body + skin) * 1.8) * gain


def braam(d=4.0, root="D"):
    t = tt(d)
    cluster = {"D": [36.71, 73.42, 110.0, 146.83, 174.61], "Bb": [29.14, 58.27, 116.54, 174.61, 233.08],
               "C": [32.70, 65.41, 98.0, 130.81, 196.0]}[root]
    s = np.zeros(len(t))
    for f in cluster:
        for c in (-12, 0, 12):
            s += saw(f * 2 ** (c / 1200), t, rng.random())
    s = np.tanh(s * 0.9)
    bright, dark = lp(s, 2600), lp(s, 380)
    k = np.exp(-t * 2.2)
    s = bright * k + dark * (1 - k)
    s *= np.clip(t / 0.03, 0, 1) * np.exp(-t * 0.75)
    return s * 0.30


def sub_drop(d=3.0):
    t = tt(d)
    f = 30 + 60 * np.exp(-t * 4)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.2) * np.clip(t / 0.01, 0, 1)


def metal_hit():
    t = tt(2.0)
    return lp(rng.standard_normal(len(t)), 9000, 2200) * np.exp(-t * 9) * 0.35


def reverse_swell(d=1.2):
    t = tt(d)
    return lp(rng.standard_normal(len(t)), 7000, 900) * (t / d) ** 3 * 0.45


def impact(t0, gain=1.0, root="D", swell=True):
    if swell:
        put(reverse_swell(), t0 - 1.2, gain * 0.8, send=0.7)
    put(braam(4.5, root), t0, gain, send=0.5)
    put(sub_drop(), t0, gain * 0.9, send=0.1)
    put(taiko(1.0, 0.8), t0, gain * 0.9, send=0.5)
    put(metal_hit(), t0, gain * 0.7, send=0.9)


def shepard(t0, d, gain=0.35):
    t = tt(d)
    p = t / d
    out = np.zeros(len(t))
    for k in range(7):
        oct_pos = (k + p * 2.5) % 7
        f = 40 * 2 ** oct_pos
        a = np.exp(-((oct_pos - 3.5) / 1.6) ** 2)
        out += np.sin(2 * np.pi * np.cumsum(f) / SR) * a
    tremolo = 0.6 + 0.4 * np.sin(2 * np.pi * (4 + 14 * p ** 2) * t)
    put(out * tremolo * p ** 1.5 * gain, t0, send=0.5)
    put(lp(rng.standard_normal(len(t)), 9000, 1500) * p ** 3 * 0.35 * gain * 2, t0, send=0.6)


def piano(f, d=5.0, gain=0.25):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * f * h * (1 + 0.0004 * h * h) * t) * np.exp(-t * (0.8 + h * 0.5)) / h
            for h in range(1, 8))
    return s * np.clip(t / 0.004, 0, 1) * gain


# ---------- スコア ----------
# 静かな低音のうなり
t = tt(DUR)
drone = (np.sin(2 * np.pi * 36.71 * t) * 0.6 + lp(rng.standard_normal(N), 180, 30) * 0.8)
gate = (np.clip(t / 3, 0, 1) * (t < 34.0) + np.clip((t - 34.8) / 2, 0, 1) * (t < 48.5)
        + np.clip((t - 49.3) / 1, 0, 1) * np.clip((DUR - 2 - t) / 4, 0, 1))
put(drone * gate * 0.10, 0, send=0.3)

put(taiko(0.6, 0.7), 0.5, send=0.9)
put(reverse_swell(2.0), 2.4, 0.5, send=0.8)
put(metal_hit(), 4.4, 0.4, send=1.0)

strings(4.8, 9.4, ["D2", "A2", "D3", "F3"], 0.10, attack=2.5)
strings(9.0, 12.9, ["Bb1", "F2", "D3", "F3"], 0.11)
strings(12.5, 16.3, ["F2", "C3", "A3", "F3"], 0.12)
for k in np.arange(4.8, 16.0, 1.333):  # 鼓動のような遠い太鼓
    put(taiko(0.35, 0.7), k, send=0.8)

for i, (t0, r) in enumerate([(16.0, "D"), (18.0, "Bb"), (20.0, "C")]):
    impact(t0, 1.0 + i * 0.1, r)
strings(16.0, 22.3, ["D2", "A2", "D3", "A3", "D4"], 0.13, attack=0.5, trem=12)

strings(22.0, 25.8, ["Bb1", "F2", "Bb2", "D3", "F3"], 0.14, attack=0.8)
strings(25.5, 29.3, ["C2", "G2", "C3", "E3", "G3"], 0.15, attack=0.8)
choir(22.0, 29.2, ["D4", "F4", "A4"], 0.05, attack=3)
beat = 60 / 92
for k in range(int((29.0 - 22.0) / (beat / 2))):
    tk = 22.0 + k * beat / 2
    if k % 4 == 0 or (tk > 25.5 and k % 2 == 0) or (tk > 27.6):
        put(taiko(0.55 if k % 4 else 0.85, 0.9), tk, pan=0.3 * (-1) ** k, send=0.45)

for i, t0 in enumerate([29.0, 30.2, 31.4]):
    impact(t0, 0.8 + i * 0.1, "D", swell=False)
for k in np.arange(29.0, 32.6, 0.15):
    put(taiko(0.25 + 0.4 * (k - 29) / 3.6, 1.1), k, pan=0.4 * np.sin(k * 9), send=0.4)
strings(29.0, 34.0, ["D2", "A2", "D3", "F3", "A3"], 0.15, attack=0.3, trem=16, bright=2600)
impact(32.6, 1.3, "D", swell=False)

# 無音のあと、希望のクワイア
choir(34.8, 39.4, ["F4", "A4", "C4"], 0.09, attack=2.0)
strings(34.8, 39.4, ["F2", "C3", "A3"], 0.07, attack=2.5)
put(piano(NOTE["A4"]), 36.3, send=0.8)
put(piano(NOTE["F4"]), 36.9, 0.8, send=0.8)
choir(39.0, 43.8, ["D4", "F4", "A4"], 0.08)
strings(39.0, 43.8, ["Bb1", "F2", "D3", "F3"], 0.08)
put(piano(NOTE["D4"]), 39.2, send=0.8)
impact(41.0, 0.75, "Bb")

# 最後のモンタージュ: 加速する太鼓とシェパードトーン
tk, iv = 43.5, 0.5
while tk < 48.3:
    put(taiko(0.5 + 0.5 * (tk - 43.5) / 4.8, 1.0), tk, pan=0.35 * np.sin(tk * 7), send=0.4)
    tk += iv
    iv = max(0.075, iv * 0.93)
shepard(43.5, 4.9, 0.4)
strings(43.5, 48.5, ["D2", "A2", "D3", "F3", "A3", "D4"], 0.16, attack=1.0, trem=18, bright=3200)
choir(43.5, 48.5, ["D4", "F4", "A4", "D5"], 0.08, attack=2.5, release=0.05)

# タイトル
impact(49.3, 1.6, "D", swell=False)
put(taiko(1.0, 0.6), 49.3, send=0.8)
choir(49.3, 55.5, ["D4", "F4", "A4", "D5"], 0.22, attack=0.15, release=2.5)
strings(49.3, 55.5, ["D2", "A2", "D3", "F3", "A3", "D4"], 0.30, attack=0.1, release=2.5, bright=3000)
impact(55.0, 1.2, "Bb")
strings(55.0, 58.8, ["Bb1", "F2", "Bb2", "D3", "F3", "Bb3"], 0.24, attack=0.2)
choir(55.0, 58.8, ["D4", "F4", "Bb3"], 0.16, attack=0.3)
strings(58.5, 63.5, ["F2", "C3", "F3", "A3", "C4"], 0.20, attack=0.6, release=3.5)
choir(58.5, 63.5, ["F4", "A4", "C4"], 0.09, attack=0.6, release=3.5)
put(taiko(0.8, 0.7), 58.5, send=0.8)
put(piano(NOTE["F4"], 6), 61.5, 1.0, send=0.9)
put(piano(NOTE["A4"], 6), 61.75, 0.7, send=0.9)

# ---------- ホール残響 ----------
ir_t = tt(3.4)
ir = np.stack([lp(rng.standard_normal(len(ir_t)), 6000) * np.exp(-ir_t * 1.9) for _ in range(2)], 1)
ir[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
L = 1 << int(np.ceil(np.log2(N + len(ir))))
rev = np.stack([np.fft.irfft(np.fft.rfft(wet[:, c], L) * np.fft.rfft(ir[:, c], L), L)[:N] for c in range(2)], 1)
rev /= np.abs(rev).max() + 1e-9
mix = dry / (np.abs(dry).max() + 1e-9) + rev * 0.55

# 予告編らしい「溜め」の無音を切り出す
tm = np.arange(N) / SR
for a, b in [(34.0, 34.8), (48.5, 49.3)]:
    mix *= (np.clip((a - tm) / 0.12, 0, 1) + np.clip((tm - b) / 0.01, 0, 1))[:, None]
mix = np.tanh(mix * 1.3)
mix /= np.abs(mix).max() / 0.9
mix *= np.clip((DUR - np.arange(N) / SR) / 1.5, 0, 1)[:, None]
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "epic_audio.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
