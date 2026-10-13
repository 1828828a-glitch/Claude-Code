"""解説動画用のBGMと効果音を合成して WAV に書き出す。

映像 (index.html) のタイムラインに合わせ、シーン転換にウーシュ、
項目の出現に短いブリップを置く。06 (禁止対象のAI) の区間だけ暗い和音に切り替える。

    python3 make_audio.py bgm.wav
"""
import subprocess
import sys
import wave

import numpy as np

SR = 48000
DUR = 157.0
N = int(SR * DUR)
BEAT = 0.625          # 96 BPM
BAR = BEAT * 4        # 2.5 秒
rng = np.random.default_rng(20260917)

dry = np.zeros((2, N))
send = np.zeros((2, N))


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(sec):
    return np.arange(int(sec * SR)) / SR


def put(start, sig, pan=0.0, gain=1.0, rev=0.0):
    """モノラル信号を pan (-1..1) で定位させ、dry と reverb send に足す。"""
    i0 = int(round(start * SR))
    if i0 >= N or i0 + len(sig) <= 0:
        return
    pan = np.broadcast_to(np.asarray(pan, dtype=float), sig.shape)
    if i0 < 0:
        sig, pan, i0 = sig[-i0:], pan[-i0:], 0
    sig, pan = sig[: N - i0], pan[: N - i0]
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    seg = slice(i0, i0 + len(sig))
    dry[0, seg] += sig * gl * gain
    dry[1, seg] += sig * gr * gain
    if rev:
        send[0, seg] += sig * gl * gain * rev
        send[1, seg] += sig * gr * gain * rev


# ---------- 音色 ----------
def pad_chord(start, dur, notes, gain=0.16, attack=1.6, release=1.4):
    t = tt(dur + release * 4)
    env = np.minimum(1, t / attack) * np.where(t < dur, 1.0, np.exp(-(t - dur) / release))
    env *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.17 * t + rng.random() * 6)
    for m in notes:
        f = midi(m)
        for det, pan in ((-0.003, -0.55), (0.003, 0.55)):
            ph = rng.random() * 2 * np.pi
            s = np.zeros_like(t)
            for h, a in ((1, 1.0), (2, 0.32), (3, 0.12), (4, 0.05)):
                if f * h < 6000:
                    s += a * np.sin(2 * np.pi * f * (1 + det) * h * t + ph * h)
            put(start, s * env, pan, gain / len(notes) * (0.45 if m < 52 else 1.0), rev=0.9)


def bass(start, dur, m, gain=0.08):
    f = midi(m)
    t = tt(dur + 1.2)
    env = np.minimum(1, t / 0.08) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.35))
    s = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)
    put(start, s * env, 0, gain, rev=0.1)


def pluck(f, decay=0.42):
    t = tt(1.6)
    env = (1 - np.exp(-t / 0.004)) * np.exp(-t / decay)
    s = (np.sin(2 * np.pi * f * t)
         + 0.38 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.18)
         + 0.08 * np.sin(6 * np.pi * f * t) * np.exp(-t / 0.08))
    return s * env


def bell(f, decay=1.2):
    t = tt(4.0)
    env = (1 - np.exp(-t / 0.003)) * np.exp(-t / decay)
    s = (np.sin(2 * np.pi * f * t)
         + 0.35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.45)
         + 0.15 * np.sin(2 * np.pi * 5.40 * f * t) * np.exp(-t / 0.18))
    return s * env


def kick():
    t = tt(0.5)
    f = 46 + 75 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8) * (1 - np.exp(-t / 0.002))


def shaker():
    n = int(0.1 * SR)
    x = np.diff(rng.standard_normal(n + 2), 2)
    t = np.arange(n) / SR
    return x * (1 - np.exp(-t / 0.006)) * np.exp(-t / 0.028) * 0.3


def band_noise(sec, lo, hi):
    n = int(sec * SR)
    X = np.fft.rfft(rng.standard_normal(n))
    fr = np.fft.rfftfreq(n, 1 / SR)
    X *= ((fr > lo) & (fr < hi)) / np.sqrt(np.maximum(fr, 1) / 1000)
    x = np.fft.irfft(X, n)
    return x / np.abs(x).max()


def whoosh(at, gain=0.16, dur=1.1, peak=0.72, lr=True):
    x = band_noise(dur, 300, 7000)
    t = np.arange(len(x)) / SR
    p = peak * dur
    env = np.where(t < p, (t / p) ** 2.4, np.exp(-(t - p) / 0.09))
    pan = np.linspace(-0.7, 0.7, len(x)) if lr else np.linspace(0.7, -0.7, len(x))
    put(at - p, x * env, pan, gain, rev=0.5)


def boom(at, gain=0.5):
    t = tt(3.5)
    f = 36 + 34 * np.exp(-t * 5)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.4) * (1 - np.exp(-t / 0.004))
    s += 0.25 * band_noise(3.5, 40, 400) * np.exp(-t * 6)
    put(at, s, 0, gain, rev=0.6)


def blip(at, f=1760, gain=0.05, pan=0.0):
    t = tt(0.4)
    s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.06) * (1 - np.exp(-t / 0.002))
    put(at, s, pan, gain, rev=0.6)


# ---------- 和声 ----------
BRIGHT = [  # Dmaj9, Bm9, Gmaj9, Asus
    [50, 57, 61, 64, 66],
    [47, 54, 57, 61, 62],
    [43, 50, 54, 57, 59],
    [45, 52, 57, 59, 62],
]
DARK = [  # Bm(add9), Gmaj7(#11), Em9, F#sus4
    [47, 54, 61, 62, 66],
    [43, 50, 54, 61, 62],
    [40, 47, 54, 55, 62],
    [42, 49, 54, 59, 61],
]

sections = []  # (start, dur, notes)
t = 0.0
i = 0
while t < 80 - 1e-6:
    sections.append((t, 5.0, BRIGHT[i % 4])); t += 5.0; i += 1
for k, (s, d) in enumerate(((80, 5), (85, 5), (90, 5), (95, 2.5))):
    sections.append((s, d, DARK[k]))
t, i = 97.5, 0
while t < 147.5 - 1e-6:
    sections.append((t, 5.0, BRIGHT[i % 4])); t += 5.0; i += 1
sections.append((147.5, 7.5, BRIGHT[0]))

for s, d, notes in sections:
    pad_chord(s, d, notes, gain=0.11 if s < 7 else 0.15)
    root = notes[0] - 12 if notes[0] >= 45 else notes[0]
    if s >= 1.0:
        bass(max(s, 1.15), d - (max(s, 1.15) - s), root, gain=0.075 if 80 <= s < 97.5 else 0.08)
bass(1.15, 3.85, 38, 0.08)


def arp_notes(notes):
    pcs = sorted({n % 12 for n in notes[1:]})
    pool = [p + 12 * o for o in (6, 7) for p in pcs]
    pool = [p for p in pool if 74 <= p <= 90]
    return pool


def chord_at(time):
    for s, d, notes in reversed(sections):
        if time >= s:
            return notes
    return sections[0][2]


PATTERN = [0, 2, 1, 3, 2, 4, 3, 1]
for span in ((1.15, 79.6), (97.5, 147.3)):
    k = 0
    tm = span[0]
    while tm < span[1]:
        pool = arp_notes(chord_at(tm))
        m = pool[PATTERN[k % 8] % len(pool)]
        vel = (0.07 if tm < 16 else 0.1) * (0.85 + 0.3 * rng.random()) * (1.0 if k % 2 == 0 else 0.8)
        put(tm, pluck(midi(m)), 0.35 if k % 2 else -0.35, vel, rev=0.7)
        tm += BEAT / 2
        k += 1

# リズム
for kb in range(int(DUR / BEAT) + 1):
    bt = kb * BEAT
    on = (16.25 <= bt < 79.4) or (98.75 <= bt < 146.9)
    if on and kb % 4 in (0, 2):
        put(bt, kick(), 0, 0.15 if kb % 4 == 0 else 0.1)
    if ((28.75 <= bt < 79.4) or (98.75 <= bt < 146.9)):
        put(bt + BEAT / 2, shaker(), 0.25 if kb % 2 else -0.25, 0.1)
    if 80 <= bt < 97.3:  # 06: 鼓動のような低いパルス
        tp = tt(0.5)
        put(bt, np.sin(2 * np.pi * 61.7 * tp) * np.exp(-tp * 9) * (1 - np.exp(-tp / 0.004)), 0, 0.12 if kb % 4 == 0 else 0.07)

# 06 のベル
for k, bt in enumerate(np.arange(80, 97.3, BAR)):
    notes = chord_at(bt)
    put(bt + 0.02, bell(midi(notes[-1] + 12)), -0.3 if k % 2 else 0.3, 0.07, rev=1.0)
    put(bt + BEAT * 2, bell(midi(notes[-2] + 12)), 0.3 if k % 2 else -0.3, 0.05, rev=1.0)

# エンディングのベル: D メジャー・ペンタトニックで上昇
PENTA = [74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98]
for k, m in enumerate(PENTA):
    put(148.4 + k * 0.12, bell(midi(m), decay=1.6), -0.6 + k * 0.12, 0.05, rev=1.0)
put(150.0, bell(midi(62), decay=3.0), 0, 0.09, rev=1.0)
put(150.0, bell(midi(69), decay=3.0), 0, 0.06, rev=1.0)

# ---------- 効果音 ----------
riser = band_noise(1.3, 400, 9000)
tr = np.arange(len(riser)) / SR
put(-0.15, riser * (tr / tr[-1]) ** 3, np.linspace(-0.5, 0.5, len(riser)), 0.14, rev=0.6)
boom(1.15, 0.3)
boom(79.9, 0.36)
for k, at in enumerate((7, 16, 28, 37, 46, 54, 98, 104, 111, 118, 127, 140, 147)):
    whoosh(at, 0.15, lr=k % 2 == 0)
whoosh(80, 0.2, dur=1.4)
whoosh(97.7, 0.13, lr=False)

for i in range(11):
    blip(37.6 + i * 0.075, f=midi(86 + (i % 3) * 2), gain=0.025, pan=-0.6 + i * 0.12)
for i in range(11):
    blip(41.3 + i * 0.05, f=midi(93), gain=0.018, pan=-0.6 + i * 0.12)
for at in (54.7, 60.3, 66.3, 73.3):
    blip(at, f=midi(90), gain=0.05)
for i in range(5):
    blip(81.1 + i * 0.5, f=midi(78), gain=0.045, pan=0.3)
for i in range(4):
    blip(82.6 + i * 0.12, f=midi(73), gain=0.04, pan=-0.4)
blip(88.05, f=midi(81), gain=0.05)
blip(90.7, f=midi(85), gain=0.05)
for i in range(5):
    blip(99.45 + i * 0.32, f=midi(86 + i), gain=0.035, pan=0.4)
blip(105.5, f=midi(88), gain=0.05)
blip(106.65, f=midi(93), gain=0.04)
for i in range(4):
    blip(113.5 + i * 0.45, f=midi(86 + i * 2), gain=0.035, pan=0.45)
for i in range(6):
    blip(119.3 + i * 0.1, f=midi(86 + (i % 3) * 3), gain=0.03, pan=-0.5 + i * 0.2)
blip(127.9, f=midi(86), gain=0.04)
blip(136.0, f=midi(90), gain=0.04)
for i in range(4):
    blip(140.5 + i * 0.25, f=midi(86 + i * 2), gain=0.035, pan=-0.3 + i * 0.2)

# ---------- リバーブとマスタリング ----------
def make_ir(sec=2.6, tau=0.42):
    n = int(sec * SR)
    t = np.arange(n) / SR
    out = []
    for _ in range(2):
        x = rng.standard_normal(n) * np.exp(-t / tau)
        X = np.fft.rfft(x)
        fr = np.fft.rfftfreq(n, 1 / SR)
        X *= 1 / (1 + (fr / 5000) ** 2)
        x = np.fft.irfft(X, n)
        x[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        out.append(x / np.sqrt(np.sum(x ** 2)))
    return out


def fft_convolve(a, b):
    n = len(a) + len(b) - 1
    size = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(a, size) * np.fft.rfft(b, size), size)[: len(a)]


ir = make_ir()
wet = np.stack([fft_convolve(send[c], ir[c]) for c in range(2)])
mix = dry + 0.55 * wet

# 低域を軽く削り、2〜5kHz を少し持ち上げてスピーカーでも聞き取りやすくする
F = np.fft.rfft(mix, axis=1)
fr = np.fft.rfftfreq(N, 1 / SR)
db = -6 / (1 + (fr / 90) ** 2) + 2.5 * np.exp(-((np.log2(np.maximum(fr, 1) / 3200)) ** 2) / 0.6)
hp = (np.maximum(fr, 1) / 30) ** 2
db += 20 * np.log10(hp / np.sqrt(1 + hp ** 2))  # 30Hz の2次ハイパス
mix = np.fft.irfft(F * 10 ** (db / 20), N, axis=1)

t = np.arange(N) / SR
mix *= np.minimum(1, t / 0.05) * np.clip((DUR - t) / 2.0, 0, 1)
mix /= np.abs(mix).max() / 0.89

out = sys.argv[1] if len(sys.argv) > 1 else "bgm.wav"
raw = out.replace(".wav", "_raw.wav")
with wave.open(raw, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype("<i2").tobytes())

# ラウドネスを -16 LUFS 前後にそろえる
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw,
                "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(SR), out], check=True)
print("wrote", out)
