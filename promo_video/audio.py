"""Synthesises the soundtrack for the promo video (no samples, numpy/scipy only).

    python3 audio.py out.wav
"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
DUR = 50.0
N = int(SR * DUR)
rng = np.random.default_rng(1201)
dry = np.zeros((N, 2))   # goes straight to the mix
wet = np.zeros((N, 2))   # goes through the reverb as well

NOTE = {n: 440 * 2 ** ((i - 57) / 12) for i, n in enumerate(
    [f"{p}{o}" for o in range(0, 8) for p in ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]])}


def put(buf, sig, t0, pan=0.0, amp=1.0):
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[: N - i] * amp
    buf[i:i + len(sig), 0] += sig * np.sqrt((1 - pan) / 2)
    buf[i:i + len(sig), 1] += sig * np.sqrt((1 + pan) / 2)


def tt(d):
    return np.arange(int(d * SR)) / SR


def filt(sig, kind, f, order=2):
    return sosfilt(butter(order, f, kind, fs=SR, output="sos"), sig)


def boom(f0=52, d=2.2, drop=2.5):
    t = tt(d)
    f = f0 * (1 + drop * np.exp(-t * 28))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)
    click = filt(rng.standard_normal(len(t)), "low", 900) * np.exp(-t * 60) * 0.5
    return np.tanh((body + click) * 1.6)


def bell(freq, d=3.0, bright=1.0):
    t = tt(d)
    s = np.zeros_like(t)
    for k, (m, a, dec) in enumerate([(1, 1, 1.6), (2.0, .45, 2.6), (3.01, .22 * bright, 4.2), (4.2, .12 * bright, 6), (5.43, .07 * bright, 8)]):
        s += a * np.sin(2 * np.pi * freq * m * t + k) * np.exp(-t * dec)
    return s * np.minimum(1, t / 0.004)


def pad(freqs, d, attack=1.5, release=1.5, cutoff=1400):
    t = tt(d)
    s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.35, 0.0, 0.4):
            ff = f * 2 ** (det / 100)
            ph = rng.uniform(0, 6.28)
            s += np.sin(2 * np.pi * ff * t + ph) + 0.33 * np.sin(4 * np.pi * ff * t + ph) + 0.2 * np.sin(6 * np.pi * ff * t)
    s *= 1 + 0.15 * np.sin(2 * np.pi * 0.23 * t)
    env = np.minimum(1, t / attack) * np.minimum(1, (d - t) / release)
    return filt(s, "low", cutoff) * env / (len(freqs) * 3)


def whoosh(d, lo=500, hi=3500):
    t = tt(d)
    n = filt(filt(rng.standard_normal(len(t)), "high", lo), "low", hi)
    return n * np.sin(np.pi * t / d) ** 2


def riser(d, f0=110, f1=880):
    t = tt(d)
    u = t / d
    f = f0 * (f1 / f0) ** (u ** 1.5)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    noise = filt(rng.standard_normal(len(t)), "high", 2500) * 0.6
    return (tone * 0.5 + noise) * u ** 2.2


def tick():
    t = tt(0.05)
    return filt(rng.standard_normal(len(t)), "band", [2500, 6000]) * np.exp(-t * 160)


def kick():
    t = tt(0.4)
    f = 48 * (1 + 3 * np.exp(-t * 45))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)


def crackle(d):
    t = tt(d)
    u = t / d
    hits = (rng.random(len(t)) < (2 + 220 * u ** 2.5) / SR).astype(float) * rng.uniform(0.3, 1, len(t))
    ir = filt(rng.standard_normal(int(0.02 * SR)), "high", 1800) * np.exp(-tt(0.02) * 260)
    return fftconvolve(hits, ir)[: len(t)] * (0.4 + u)


# ---- continuous bed: low drone ----
t = tt(DUR)
drone = (np.sin(2 * np.pi * NOTE["D1"] * t) + 0.6 * np.sin(2 * np.pi * NOTE["D2"] * t + 0.3 * np.sin(2 * np.pi * 0.11 * t))
         + 0.25 * np.sin(2 * np.pi * NOTE["A2"] * t))
denv = np.interp(t, [0, 2, 28.9, 29.1, 35, 41.9, 42.05, 44.6, 48, 50], [0, .5, .5, .25, .45, .5, .1, .55, .45, 0])
put(dry, drone * denv, 0, amp=0.16)

# ---- scene 1-2: the ticking sameness ----
for k, tk in enumerate(np.arange(0.5, 7.6, 0.5)):
    put(wet, tick(), tk, pan=(-.5 if k % 2 else .5), amp=0.16)
put(dry, boom(50, 2.0), 1.4, amp=0.5)
put(wet, bell(NOTE["D3"], 4), 1.4, amp=0.10)
put(wet, pad([NOTE["D3"], NOTE["A3"]], 5.2, cutoff=700), 0.8, amp=0.20)
put(wet, whoosh(1.3, 300, 2000), 6.9, amp=0.20)
put(dry, boom(55, 2.4), 7.6, amp=0.6)
for f, p in [("D4", -.3), ("A4", .3), ("E5", 0)]:
    put(wet, bell(NOTE[f], 4), 7.6, pan=p, amp=0.12)
put(wet, pad([NOTE["D3"], NOTE["A3"], NOTE["E4"]], 3.6, attack=.4, cutoff=1500), 7.6, amp=0.26)

# ---- scene 3: the cloth ----
put(wet, pad([NOTE["D3"], NOTE["F3"], NOTE["A3"], NOTE["E4"]], 7.4, attack=1.5, release=1.0, cutoff=1300), 10.8, amp=0.32)
sweep = (17.0 - 12.3) / 5
for k in range(5):
    put(wet, whoosh(sweep * 1.1, 600 + 150 * k, 3000 + 500 * k), 12.3 + k * sweep, pan=(.6 if k % 2 else -.6), amp=0.13)
for tk, n in [(12.8, "A4"), (13.7, "D5"), (15.0, "C5"), (15.9, "F5"), (16.8, "E5")]:
    put(wet, bell(NOTE[n], 3.5), tk, pan=rng.uniform(-.4, .4), amp=0.11)
put(wet, riser(0.9, 200, 900), 16.9, amp=0.10)
put(dry, boom(50, 2.6), 17.8, amp=0.7)
put(wet, pad([NOTE["F2"], NOTE["F3"], NOTE["A3"], NOTE["C4"], NOTE["E4"], NOTE["G4"]], 2.6, attack=.05, release=1.2, cutoff=2600), 17.8, amp=0.42)
for n, p in [("F4", -.4), ("C5", .4), ("E5", 0), ("G5", .2)]:
    put(wet, bell(NOTE[n], 4), 17.8, pan=p, amp=0.10)

# ---- scene 4: words become painting ----
put(wet, pad([NOTE["A#2"], NOTE["D3"], NOTE["F3"], NOTE["A3"]], 4.2, attack=.8, release=.8, cutoff=900), 20.0, amp=0.28)
for k, tk in enumerate(np.arange(20.5, 23.5, 0.5)):
    put(wet, tick(), tk, pan=(-.5 if k % 2 else .5), amp=0.15)
put(wet, riser(2.5, 98, 780), 23.5, amp=0.16)
arp = ["D4", "F4", "A4", "C5", "D5", "F5", "A5", "C6", "D6", "E6", "F6", "A6"]
tk = 23.5
for k in range(26):
    put(wet, bell(NOTE[arp[k % len(arp)]] if k < 12 else NOTE[arp[6 + k % 6]], 1.6), tk, pan=np.sin(k * 1.3) * .7, amp=0.035 + 0.003 * k)
    tk += 0.16 - 0.0035 * k
put(dry, boom(48, 2.8), 26.0, amp=0.75)
put(wet, pad([NOTE["D2"], NOTE["D3"], NOTE["A3"], NOTE["D4"], NOTE["F4"], NOTE["A4"], NOTE["E5"]], 3.0, attack=.05, release=.25, cutoff=2800), 26.0, amp=0.42)
for n, p in [("D5", -.4), ("A5", .4), ("F5", 0)]:
    put(wet, bell(NOTE[n], 4), 26.0, pan=p, amp=0.10)
put(wet, bell(NOTE["E5"], 3), 27.4, amp=0.09)

# ---- scene 5: silence, then the decision ----
put(wet, bell(NOTE["A3"], 3, bright=.4), 29.3, amp=0.10)
put(dry, boom(44, 3.0, drop=4), 30.6, amp=1.0)
put(wet, filt(rng.standard_normal(int(.5 * SR)), "low", 500) * np.exp(-tt(.5) * 9), 30.6, amp=0.5)
put(wet, bell(NOTE["D4"], 4, bright=.5), 32.4, amp=0.10)
put(wet, bell(NOTE["A4"], 4, bright=.5), 33.4, amp=0.07)
put(wet, riser(1.0, 150, 600), 34.2, amp=0.10)

# ---- scene 6: numbers on a pulse ----
beat = 1.7 / 4
for k, tk in enumerate(np.arange(35.2, 41.95, beat)):
    put(dry, kick(), tk, amp=0.55 if k % 4 == 0 else 0.36)
    if k % 2:
        put(wet, tick(), tk + beat / 2, pan=.4, amp=0.10)
chords = [["D4", "A4"], ["F4", "C5"], ["A4", "E5"], ["D5", "A5"]]
bass = ["D2", "F2", "A2", "D3"]
for k, tk in enumerate([35.2, 36.9, 38.6, 40.3]):
    for n in chords[k]:
        put(wet, bell(NOTE[n], 3.5), tk, pan=rng.uniform(-.5, .5), amp=0.14)
    put(wet, pad([NOTE[bass[k]], NOTE[chords[k][0]] / 2, NOTE[chords[k][1]] / 2], 1.75, attack=.03, release=.3, cutoff=1500 + 400 * k), tk, amp=0.34)
put(wet, riser(1.6, 220, 1200), 40.4, amp=0.13)

# ---- scene 7: the crack and the title ----
put(wet, bell(NOTE["D3"], 3, bright=.3), 42.2, amp=0.09)
put(wet, crackle(1.3), 43.3, amp=0.5)
put(wet, riser(1.1, 120, 1400), 43.5, amp=0.22)
put(dry, boom(42, 4.0, drop=5), 44.6, amp=1.0)
put(wet, filt(rng.standard_normal(int(1.2 * SR)), "high", 1500) * np.exp(-tt(1.2) * 5), 44.6, amp=0.22)
put(wet, pad([NOTE["D2"], NOTE["D3"], NOTE["A3"], NOTE["D4"], NOTE["F#4"], NOTE["A4"], NOTE["E5"]], 5.4, attack=.06, release=2.4, cutoff=3200), 44.6, amp=0.5)
spark = ["D5", "F#5", "A5", "E6", "D6", "A5", "F#5", "E5", "D5", "A4"]
for k, n in enumerate(spark):
    put(wet, bell(NOTE[n], 3.5), 44.6 + k * 0.34, pan=np.sin(k * 2.1) * .6, amp=0.10 * (1 - k * 0.06))

# ---- reverb + master ----
irt = tt(3.0)
ir = np.stack([rng.standard_normal(len(irt)), rng.standard_normal(len(irt))], 1) * np.exp(-irt * 2.3)[:, None]
ir = np.stack([filt(ir[:, c], "low", 6000) for c in (0, 1)], 1)
rev = np.stack([fftconvolve(wet[:, c], ir[:, c])[:N] for c in (0, 1)], 1)
rev /= np.abs(rev).max() + 1e-9
mix = dry + wet + rev * 0.3 * np.abs(wet).max() * 2.2
mix = np.tanh(mix * 1.5 / np.abs(mix).max()) / np.tanh(1.5)
fade = np.minimum(1, np.minimum(t / 0.3, (DUR - 0.1 - t) / 1.3)).clip(0, 1)
mix = mix * fade[:, None] * 0.89

import wave
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "out.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
