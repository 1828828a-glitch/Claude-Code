import numpy as np, wave

# バイエンス風デモBGM(24s): 深いドローン+サブパルス+疎なベル+ライザー→ブーム
SR = 44100
DUR = 24.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(11)
t = np.arange(N) / SR

def place(sig, start_s, gL, gR=None):
    if gR is None: gR = gL
    s = int(start_s * SR)
    e = min(s + len(sig), N)
    if s >= N or e <= s: return
    L[s:e] += sig[:e-s] * gL
    R[s:e] += sig[:e-s] * gR

# ── ドローン(D1基音+倍音、ゆっくりうねる) ──
f0 = 36.71
drone = np.zeros(N)
for mult, a in ((1, 1.0), (2, 0.55), (3, 0.22), (4.01, 0.10), (5.99, 0.05)):
    vib = 1 + 0.002 * np.sin(2 * np.pi * 0.07 * t * mult + mult)
    drone += a * np.sin(2 * np.pi * f0 * mult * t * vib + rng.uniform(0, 6))
drone *= 0.62 + 0.38 * np.sin(2 * np.pi * t / 9.5 - 1.2)
env = np.ones(N)
a = int(2.5 * SR); env[:a] = np.linspace(0, 1, a)
r = int(2.2 * SR); env[-r:] *= np.linspace(1, 0, r)
L += drone * 0.17 * env
R += drone * 0.17 * env

# ── エアリーな帯域ノイズ(左右別ソースで広がり) ──
for ch, seed in ((L, 21), (R, 22)):
    nz = np.random.default_rng(seed).standard_normal(N)
    band = np.convolve(nz, np.ones(9) / 9, 'same') - np.convolve(nz, np.ones(48) / 48, 'same')
    ch += band * (0.28 + 0.22 * np.sin(2 * np.pi * t / 13 + seed)) * env * 0.045

# ── サブパルス(2秒ごと、心拍のように) ──
def thump(freq, dur, sweep=0.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = freq * (1 + sweep * np.exp(-tt * 9))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return x * np.exp(-tt * 5.2)

for i in range(11):
    place(thump(43, 1.0), 1.6 + i * 2.0, 0.20)

# ── 疎なベル(不穏に美しく) ──
def bell(freq, dur=3.2):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * tt) + 0.35 * np.sin(2 * np.pi * freq * 2.01 * tt) + 0.12 * np.sin(2 * np.pi * freq * 2.99 * tt)
    return x * np.exp(-tt * 1.6)

for when, f, pl, pr in ((3.4, 587.33, 0.06, 0.03), (7.8, 440.0, 0.03, 0.06), (12.2, 740.0, 0.055, 0.03), (16.4, 587.33, 0.03, 0.055)):
    place(bell(f), when, pl, pr)

# ── ライザー(15→20s)→ブーム(脳のリビール) ──
rn = int(5.0 * SR)
rt = np.arange(rn) / SR
riser = np.random.default_rng(31).standard_normal(rn)
riser = np.convolve(riser, np.ones(6) / 6, 'same')
riser *= (rt / 5.0) ** 2.4
place(riser, 15.0, 0.10)
place(thump(55, 2.0, sweep=1.6), 20.0, 0.42)
nzb = np.random.default_rng(41).standard_normal(int(0.5 * SR))
place(np.convolve(nzb, np.ones(14) / 14, 'same') * np.exp(-np.arange(int(0.5 * SR)) / SR * 11), 20.0, 0.16)

# ── マスター ──
mix = np.stack([L, R])
mix = np.tanh(mix * 1.25)
mix *= 0.88 / max(np.abs(mix).max(), 1e-9)
pcm = (mix.T * 32767).astype(np.int16)
with wave.open('public/audio/bgm_vaience.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('OK bgm_vaience.wav', DUR, 's')
