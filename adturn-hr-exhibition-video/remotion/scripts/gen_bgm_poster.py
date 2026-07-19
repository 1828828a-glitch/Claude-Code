import numpy as np, wave

# ポスター/キネティック用BGM(24s, 120bpm): パンチのある4つ打ち+クラップ+ベース+スタブ
SR = 44100
DUR = 24.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)

def nfreq(name):
    NOTES = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
    n, o = name[:-1], int(name[-1])
    return 440 * 2 ** ((NOTES[n] - 9) / 12 + (o - 4))

def place(sig, start_s, gL, gR=None):
    if gR is None: gR = gL
    s = int(start_s * SR)
    e = min(s + len(sig), N)
    if s >= N or e <= s: return
    L[s:e] += sig[:e-s] * gL
    R[s:e] += sig[:e-s] * gR

def kick():
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    f = 48 * (1 + 2.6 * np.exp(-t * 26))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

def clap():
    n = int(0.22 * SR)
    out = np.zeros(n)
    rng = np.random.default_rng(5)
    for off in (0.0, 0.012, 0.026):
        nz = rng.standard_normal(n)
        band = np.convolve(nz, np.ones(4) / 4, 'same') - np.convolve(nz, np.ones(24) / 24, 'same')
        env = np.exp(-np.maximum(np.arange(n) / SR - off, 0) * 22) * (np.arange(n) / SR >= off)
        out += band * env
    return out

def hat(open_=False):
    n = int((0.16 if open_ else 0.05) * SR)
    nz = np.random.default_rng(9).standard_normal(n)
    hp = nz - np.convolve(nz, np.ones(8) / 8, 'same')
    return hp * np.exp(-np.arange(n) / SR * (26 if open_ else 90))

def bass(freq, dur=0.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 2 * t) + 0.28 * np.sin(2 * np.pi * freq * 3 * t)
    return x * np.exp(-t * 8)

def stab(tones, dur=0.34):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for tn in tones:
        f = nfreq(tn)
        for k, a in ((1, 1.0), (2, 0.45), (3, 0.2), (4, 0.09)):
            x += a * np.sin(2 * np.pi * f * k * t)
    return x * np.exp(-t * 10) / len(tones)

BEAT = 0.5  # 120bpm
BAR = 2.0
BARS = [
    ('A1', ['A3', 'C4', 'E4']),
    ('F1', ['F3', 'A3', 'C4']),
    ('C2', ['C4', 'E4', 'G4']),
    ('G1', ['G3', 'B3', 'D4']),
]

END = 20.0
b = 0.5
while b < END:
    place(kick(), b, 0.5)
    b += BEAT
t = 1.0
while t < END:
    place(clap(), t, 0.16)
    t += 1.0
t = 0.25 + BEAT / 2
i = 0
while t < END:
    place(hat(open_=(i % 4 == 3)), t, 0.1)
    t += BEAT / 2 * 2  # 8分裏
    i += 1
bar_i = 0
t = 0.5
while t < END:
    root, tones = BARS[bar_i % 4]
    place(stab(tones), t, 0.12, 0.1)
    place(stab(tones), t + BEAT * 2.5, 0.07, 0.09)
    for k in range(8):
        place(bass(nfreq(root), 0.18), t + k * BEAT / 2 * 2 * 0.5, 0.24)
    bar_i += 1
    t += BAR

# ライザー→フィニッシュヒット→タメの余韻
rn = int(3.5 * SR)
rt = np.arange(rn) / SR
rng = np.random.default_rng(13)
riser = rng.standard_normal(rn)
riser = riser - np.convolve(riser, np.ones(20) / 20, 'same')
riser *= (rt / 3.5) ** 2.0
place(riser, 16.5, 0.07)
place(kick(), END, 0.7)
n = int(2.4 * SR)
tt = np.arange(n) / SR
place(np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 2.2), END, 0.4)
place(stab(['A3', 'C4', 'E4', 'A4'], dur=2.2), END, 0.14)

env = np.ones(N)
a = int(0.1 * SR); env[:a] = np.linspace(0, 1, a)
r = int(1.6 * SR); env[-r:] *= np.linspace(1, 0, r)
mix = np.stack([L * env, R * env])
mix = np.tanh(mix * 1.15)
mix *= 0.88 / max(np.abs(mix).max(), 1e-9)
pcm = (mix.T * 32767).astype(np.int16)
with wave.open('public/audio/bgm_poster.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('OK bgm_poster.wav')
