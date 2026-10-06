"""BEYOND WORDS 予告編用のサウンドトラックを合成して trailer_audio.wav に書き出す。"""
import sys, wave
import numpy as np

SR = 48000
DUR = 52.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
out = np.zeros((N, 2))


def fft_filter(x, lo=0.0, hi=None):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = f >= lo
    if hi is not None:
        m &= f <= hi
    return np.fft.irfft(X * m, len(x))


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    sig = sig[: max(0, N - i)]
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    out[i : i + len(sig), 0] += sig * gain * l * 1.414
    out[i : i + len(sig), 1] += sig * gain * r * 1.414


def tt(d):
    return np.arange(int(d * SR)) / SR


def boom(d=3.0, big=False):
    t = tt(d)
    f = 38 + 90 * np.exp(-t * 10)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (1.6 if big else 2.6))
    n = fft_filter(rng.standard_normal(len(t)), hi=2500) * np.exp(-t * 28) * 0.6
    s = s + n
    if big:  # 金管っぽい braam を重ねる
        br = sum(np.sign(np.sin(2 * np.pi * fr * t + k)) * a for fr, k, a in
                 [(55, 0, .5), (82.4, 1, .35), (110, 2, .3), (164.8, 3, .15)])
        br = fft_filter(br, hi=900) * np.minimum(t / 0.04, 1) * np.exp(-t * 0.9)
        s = s + 0.9 * br
    return np.tanh(s * 1.4) * 0.9


def tick():
    t = tt(0.25)
    return fft_filter(rng.standard_normal(len(t)), lo=1500) * np.exp(-t * 60) * 0.35


def note(freq, d=4.0):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * freq * h * t) / h ** 1.6 for h in range(1, 6))
    return s * np.exp(-t * 1.1) * np.minimum(t / 0.008, 1) * 0.22


def riser(d):
    t = tt(d)
    p = t / d
    f = 180 + 1400 * p ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    noise = fft_filter(rng.standard_normal(len(t)), lo=800)
    return (tone * 0.25 + noise * 0.35) * p ** 2.5


# 低いドローン（全編、ポスターの暗い赤い波のイメージ）
t = tt(DUR)
lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.08 * t)
drone = (np.sin(2 * np.pi * 55 * t) * 0.5 + np.sin(2 * np.pi * 82.41 * t) * 0.3
         + np.sin(2 * np.pi * 110.3 * t) * 0.15) * lfo
air = fft_filter(rng.standard_normal(len(t)), lo=200, hi=900) * 0.05
env = np.clip(t / 3, 0, 1) * np.clip((35.0 - t) / 0.3, 0, 1)  # タイトル直前で一瞬無音に
env2 = np.clip((t - 35.4) / 2, 0, 1) * np.clip((DUR - 1.5 - t) / 3, 0, 1)
bed = (drone + air) * 0.22
out[:, 0] += bed * (env + env2 * 1.2)
out[:, 1] += bed * (env + env2 * 1.2)

# 心拍のようなパルス（問いかけパート）
for k in np.arange(1.6, 12.0, 0.9):
    add(boom(0.6) * 0.25, k)

for t0, big, g in [(5.0, False, .7), (8.5, False, .6), (12.0, True, 1.0), (13.0, False, .5),
                   (16.5, False, .6), (20.0, False, .8), (21.2, False, .8), (22.4, False, .9),
                   (23.6, True, .9), (27.5, False, .6), (29.5, True, .8),
                   (35.4, True, 1.2), (41.0, False, .6), (45.0, True, .8)]:
    add(boom(4.0, big), t0, g)

# 感情パートのピアノ（Am - F - C - G）
chords = [(220.0, 261.6, 329.6), (174.6, 220.0, 261.6), (196.0, 261.6, 329.6), (196.0, 246.9, 293.7)]
for i, ch in enumerate(chords):
    for j, fr in enumerate(ch):
        add(note(fr), 24.0 + i * 2.0 + j * 0.22, 1.0, pan=(j - 1) * 0.4)
        add(note(fr * 2, 3), 24.0 + i * 2.0 + j * 0.22 + 0.66, 0.5, pan=-(j - 1) * 0.4)
# エンディングのピアノ
for i, ch in enumerate(chords):
    for j, fr in enumerate(ch):
        add(note(fr), 41.0 + i * 2.2 + j * 0.25, 0.9, pan=(j - 1) * 0.4)

# モンタージュのチック音とライザー
for k in np.arange(32.0, 35.0, 1 / 3):
    add(tick(), k, 1.0, pan=0.5 if int(k * 3) % 2 else -0.5)
add(riser(3.4), 31.6, 0.9)

out = np.tanh(out * 1.1)
out /= np.abs(out).max() / 0.89
fade = np.clip((DUR - np.arange(N) / SR) / 2.5, 0, 1)
out *= fade[:, None]
pcm = (out * 32767).astype("<i2")
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "trailer_audio.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
