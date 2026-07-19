import numpy as np, wave

# キーノート風デモBGM(24s): 温かいパッド+柔らかい4つ打ち+疎な高音プラック、上品に高まる
SR = 44100
DUR = 24.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

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

# ── ウォームパッド ──
def pad(freq, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for det in (-0.1, 0.0, 0.09):
        f = freq * 2 ** (det / 12 / 8)
        x += np.sin(2 * np.pi * f * t + rng.uniform(0, 6))
        x += 0.35 * np.sin(2 * np.pi * f * 2 * t + rng.uniform(0, 6))
    at = int(1.4 * SR); rl = int(1.6 * SR)
    env = np.ones(n)
    env[:min(at, n)] = 0.5 - 0.5 * np.cos(np.pi * np.arange(min(at, n)) / at)
    if n > rl: env[-rl:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(rl) / rl)
    x *= env * vel
    return np.convolve(x, np.ones(30) / 30, 'same')

# Cadd9 → Fadd9 → G(明るく開く)
SECTIONS = [
    (0.0, 9.6, ['C3', 'E3', 'G3', 'D4'], 'C2'),
    (9.6, 16.8, ['F2', 'A2', 'C3', 'G3'], 'F1'),
    (16.8, 24.0, ['G2', 'B2', 'D3', 'A3'], 'G1'),
]
for s0, s1, tones, root in SECTIONS:
    for i, tn in enumerate(tones):
        place(pad(nfreq(tn), s1 - s0 + 1.0), s0, 0.055 if i % 2 else 0.045, 0.045 if i % 2 else 0.055)
    tt = np.arange(int((s1 - s0 + 0.5) * SR)) / SR
    sub = np.sin(2 * np.pi * nfreq(root) * tt)
    env = np.ones(len(sub)); aa = int(0.6 * SR)
    env[:aa] = np.linspace(0, 1, aa); env[-aa:] *= np.linspace(1, 0, aa)
    place(sub * env, s0, 0.13)

# ── 柔らかい4つ打ち(4.8sから) ──
def kick():
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    f = 46 * (1 + 1.9 * np.exp(-t * 22))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 13)

BEAT = 0.6  # 100bpm
b = 4.8
while b < 22.6:
    place(kick(), b, 0.26)
    b += BEAT

# ── 疎な高音プラック(ペンタ) ──
def pluck(freq):
    n = int(0.8 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2 * t)
    return x * np.exp(-t * 5.5)

PENTA = ['E5', 'G5', 'C6', 'D6', 'G5', 'A5']
i = 0
w = 6.0
while w < 22.0:
    f = nfreq(PENTA[i % len(PENTA)])
    pl = 0.05 if i % 2 else 0.02
    place(pluck(f), w, pl, 0.07 - pl)
    i += 1
    w += 1.2 if i % 3 else 2.4

# ── シマーライザー(サビ=G展開へ) ──
rn = int(4.0 * SR)
rt = np.arange(rn) / SR
riser = np.random.default_rng(19).standard_normal(rn)
riser = riser - np.convolve(riser, np.ones(30) / 30, 'same')
riser *= (rt / 4.0) ** 2.2
place(riser, 12.8, 0.05)

# ── 全体エンベロープ ──
t = np.arange(N) / SR
env = np.ones(N)
a = int(1.6 * SR); env[:a] = np.linspace(0, 1, a)
r = int(2.0 * SR); env[-r:] *= np.linspace(1, 0, r)
mix = np.stack([L * env, R * env])
mix = np.tanh(mix * 1.2)
mix *= 0.85 / max(np.abs(mix).max(), 1e-9)
pcm = (mix.T * 32767).astype(np.int16)
with wave.open('public/audio/bgm_keynote.wav', 'wb') as w2:
    w2.setnchannels(2); w2.setsampwidth(2); w2.setframerate(SR)
    w2.writeframes(pcm.tobytes())
print('OK bgm_keynote.wav', DUR, 's')
