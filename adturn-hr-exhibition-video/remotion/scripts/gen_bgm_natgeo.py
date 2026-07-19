import numpy as np, wave

# ナショジオ風ドキュメンタリー劇伴(24s): 弦のスウェル+ホーン+ティンパニロール→ブーム
SR = 44100
DUR = 24.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(17)

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

# ── 弦セクション風パッド(倍音多め+ゆっくりビブラート+弓のスウェル) ──
def strings(freq, dur, vel=1.0, attack=1.8):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for det in (-0.14, -0.05, 0.06, 0.13):
        f = freq * 2 ** (det / 12 / 6)
        vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t + rng.uniform(0, 6)) * np.minimum(t / 1.5, 1)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        x += np.sin(ph) + 0.55 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph) + 0.14 * np.sin(4 * ph)
    at = int(attack * SR); rl = int(1.8 * SR)
    env = np.ones(n)
    env[:min(at, n)] = (np.arange(min(at, n)) / at) ** 1.6
    if n > rl: env[-rl:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(rl) / rl)
    x *= env * vel
    return np.convolve(x, np.ones(14) / 14, 'same')

# D → Bm → G → A(6秒ずつ、雄大に)
PROG = [
    (0.0, ['D2', 'A2', 'D3', 'F#3', 'A3']),
    (6.0, ['B1', 'F#2', 'B2', 'D3', 'F#3']),
    (12.0, ['G1', 'D2', 'G2', 'B2', 'D3']),
    (18.0, ['A1', 'E2', 'A2', 'C#3', 'E3']),
]
for s0, tones in PROG:
    for i, tn in enumerate(tones):
        g = 0.05 if i < 2 else 0.036
        place(strings(nfreq(tn), 7.4, vel=1.0), s0, g * (1 if i % 2 else 0.85), g * (0.85 if i % 2 else 1))

# 高音の持続弦(空の広がり)
place(strings(nfreq('A4'), 12.0, vel=0.5, attack=3.5), 1.0, 0.02, 0.026)
place(strings(nfreq('F#4'), 10.0, vel=0.5, attack=3.0), 13.0, 0.026, 0.02)

# ── ホーン風ロングトーン ──
def horn(freq, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for k, a in ((1, 1.0), (2, 0.6), (3, 0.42), (4, 0.22), (5, 0.1)):
        x += a * np.sin(2 * np.pi * freq * k * t)
    at = int(0.5 * SR); rl = int(1.2 * SR)
    env = np.ones(n)
    env[:min(at, n)] = np.arange(min(at, n)) / at
    if n > rl: env[-rl:] *= np.linspace(1, 0, rl)
    sw = 0.55 + 0.45 * np.sin(np.pi * np.minimum(t / dur, 1))
    return np.convolve(x * env * sw * vel, np.ones(10) / 10, 'same')

place(horn(nfreq('D3'), 4.5), 3.2, 0.05)
place(horn(nfreq('F#3'), 4.0), 14.0, 0.045)
place(horn(nfreq('D4'), 3.4), 18.6, 0.035)

# ── ティンパニ ──
def timp(freq=72, dur=1.6, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * (1 + 0.5 * np.exp(-t * 14)) * t) * np.exp(-t * 4.2)
    nz = rng.standard_normal(n) * np.exp(-t * 30) * 0.3
    return x + np.convolve(nz, np.ones(20) / 20, 'same')

place(timp(), 0.2, 0.3)
place(timp(), 6.0, 0.24)
place(timp(), 12.0, 0.26)
# ロール(6.6→8.3sクレッシェンド)→頭が開くブーム
t0 = 6.6
i = 0
while t0 < 8.25:
    place(timp(76, 0.5), t0, 0.03 + 0.11 * ((t0 - 6.6) / 1.7))
    t0 += 0.09
    i += 1
place(timp(60, 2.2), 8.3, 0.42)
# 第2スウェル→ロックアップのヒット
t0 = 14.4
while t0 < 15.9:
    place(timp(76, 0.5), t0, 0.03 + 0.1 * ((t0 - 14.4) / 1.5))
    t0 += 0.1
place(timp(56, 2.6), 16.0, 0.46)

# ── シンバルスウェル ──
def cym_swell(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    hp = nz - np.convolve(nz, np.ones(10) / 10, 'same')
    return hp * (t / dur) ** 2.2
place(cym_swell(1.8), 6.6, 0.05)
place(cym_swell(1.7), 14.4, 0.055)
cn = int(2.5 * SR)
ct = np.arange(cn) / SR
cnz = rng.standard_normal(cn)
chp = cnz - np.convolve(cnz, np.ones(10) / 10, 'same')
place(chp * np.exp(-ct * 2.4), 16.0, 0.05)

# ── 低音ドローン ──
t = np.arange(N) / SR
dr = np.sin(2 * np.pi * nfreq('D1') * t) + 0.4 * np.sin(2 * np.pi * nfreq('D2') * t + 1.3)
env = np.ones(N)
a = int(2.0 * SR); env[:a] = np.linspace(0, 1, a)
L += dr * 0.06 * env
R += dr * 0.06 * env

# ── マスター ──
genv = np.ones(N)
r = int(2.4 * SR); genv[-r:] *= np.linspace(1, 0, r)
mix = np.stack([L * genv, R * genv])
mix = np.tanh(mix * 1.2)
mix *= 0.87 / max(np.abs(mix).max(), 1e-9)
pcm = (mix.T * 32767).astype(np.int16)
with wave.open('public/audio/bgm_natgeo.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('OK bgm_natgeo.wav')
