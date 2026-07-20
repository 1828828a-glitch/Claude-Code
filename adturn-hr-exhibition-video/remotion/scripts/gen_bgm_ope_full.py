import numpy as np, wave

# 脳移植オペ フル尺BGM(165s): 心拍モニタ音75bpm+緊張パッド。
# 問い区間はパッドを薄く、リフト区間で解決和音に転じる。
SR = 44100
DUR = 165.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(29)

DUCKS = [(23.8, 56.3), (90.7, 109.2)]
LIFTS = [(56.0, 72.0), (126.5, 140.0), (148.0, 165.0)]

def in_win(t, wins):
    return any(s <= t < e for s, e in wins)

def place(sig, start_s, gL, gR=None):
    if gR is None: gR = gL
    s = int(start_s * SR)
    e = min(s + len(sig), N)
    if s >= N or e <= s: return
    L[s:e] += sig[:e-s] * gL
    R[s:e] += sig[:e-s] * gR

def beep(freq=880.0):
    n = int(0.1 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) * np.exp(-t * 42)
    a = int(0.002 * SR); x[:a] *= np.linspace(0, 1, a)
    return x

t = 0.4
while t < 163.0:
    g = 0.07 if in_win(t, DUCKS) else 0.11
    place(beep(), t, g, g * 0.82)
    t += 0.8

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

def nf(semi, octave):
    return 110.0 * 2 ** (semi / 12 + octave)

# Aマイナー基調を8秒ごとに重ね、リフト区間はAメジャー
s0 = 0.0
while s0 < 163.0:
    lift = in_win(s0 + 3, LIFTS)
    duck = in_win(s0 + 3, DUCKS)
    tones = [(0, 0), (4 if lift else 3, 1), (7, 1)]
    mul = 0.5 if duck else (1.25 if lift else 1.0)
    for semi, octv in tones:
        place(pad(nf(semi, octv), 9.0), s0, 0.055 * mul)
    s0 += 8.0

tt2 = np.arange(N) / SR
sub = np.sin(2 * np.pi * 55.0 * tt2) * (0.55 + 0.45 * np.sin(2 * np.pi * tt2 / 4.0))
env = np.ones(N); a = int(1.5 * SR); env[:a] = np.linspace(0, 1, a); r = int(2.5 * SR); env[-r:] *= np.linspace(1, 0, r)
L += sub * 0.06 * env
R += sub * 0.06 * env

for ls, _le in LIFTS:
    rn = int(3.0 * SR)
    rt = np.arange(rn) / SR
    riser = rng.standard_normal(rn)
    riser = riser - np.convolve(riser, np.ones(20) / 20, 'same')
    place(riser * (rt / 3.0) ** 2.2, ls - 3.0, 0.045)

mix = np.stack([L * env, R * env])
mix = np.tanh(mix * 1.15)
mix *= 0.85 / max(np.abs(mix).max(), 1e-9)
pcm = (mix.T * 32767).astype(np.int16)
with wave.open('public/audio/bgm_ope_full.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('OK bgm_ope_full.wav')
