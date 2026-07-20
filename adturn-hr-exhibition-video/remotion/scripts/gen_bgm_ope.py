import numpy as np, wave

# 脳移植オペ用デモBGM(24s): 心拍モニタ音(75bpm)+緊張パッド→17sで解決
SR = 44100
DUR = 24.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(23)

def place(sig, start_s, gL, gR=None):
    if gR is None: gR = gL
    s = int(start_s * SR)
    e = min(s + len(sig), N)
    if s >= N or e <= s: return
    L[s:e] += sig[:e-s] * gL
    R[s:e] += sig[:e-s] * gR

# ── モニタのビープ(880Hz、短) ──
def beep(freq=880.0):
    n = int(0.1 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) * np.exp(-t * 42)
    a = int(0.002 * SR); x[:a] *= np.linspace(0, 1, a)
    return x

t = 0.4
while t < 23.0:
    place(beep(), t, 0.11, 0.09)
    t += 0.8  # 75bpm

# ── 緊張パッド(Aマイナー→17sでAメジャーに解決) ──
def pad(freq, dur, vel=1.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = np.zeros(n)
    for det in (-0.09, 0.0, 0.08):
        f = freq * 2 ** (det / 12 / 8)
        x += np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) + 0.3 * np.sin(2 * np.pi * f * 2 * tt + rng.uniform(0, 6))
    at = int(1.6 * SR); rl = int(1.6 * SR)
    env = np.ones(n)
    env[:min(at, n)] = 0.5 - 0.5 * np.cos(np.pi * np.arange(min(at, n)) / at)
    if n > rl: env[-rl:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(rl) / rl)
    return np.convolve(x * env * vel, np.ones(26) / 26, 'same')

def nf(semi, octave):  # A基準
    return 110.0 * 2 ** (semi / 12 + octave)

# Am: A C E
for f, g in ((nf(0, 0), 0.07), (nf(3, 1), 0.05), (nf(7, 1), 0.05)):
    place(pad(f, 17.5), 0.0, g)
# 低音の脈
tt2 = np.arange(N) / SR
sub = np.sin(2 * np.pi * 55.0 * tt2) * (0.55 + 0.45 * np.sin(2 * np.pi * tt2 / 4.0))
env = np.ones(N); a = int(1.5 * SR); env[:a] = np.linspace(0, 1, a); r = int(2.0 * SR); env[-r:] *= np.linspace(1, 0, r)
L += sub * 0.07 * env
R += sub * 0.07 * env
# ライザー→解決(Aメジャー)
rn = int(3.0 * SR)
rt = np.arange(rn) / SR
riser = rng.standard_normal(rn)
riser = riser - np.convolve(riser, np.ones(20) / 20, 'same')
place(riser * (rt / 3.0) ** 2.2, 14.0, 0.05)
for f, g in ((nf(0, 0), 0.08), (nf(4, 1), 0.06), (nf(7, 1), 0.06), (nf(0, 2), 0.04)):
    place(pad(f, 7.0), 17.0, g)

mix = np.stack([L * env, R * env])
mix = np.tanh(mix * 1.15)
mix *= 0.85 / max(np.abs(mix).max(), 1e-9)
pcm = (mix.T * 32767).astype(np.int16)
with wave.open('public/audio/bgm_ope.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('OK bgm_ope.wav')
