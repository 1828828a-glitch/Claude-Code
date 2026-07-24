import numpy as np, wave

# 工房デモ用・感情設計版スコア(24s)
# 設計: 静かなピアノのモチーフ(孤独)→低弦が支える(決意)→14sで全奏クライマックス(誇り)→余韻
# Dマイナー: Dm → Bb → F → C(王道の感情進行)
SR = 44100
DUR = 24.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(47)

def nf(name):
    NOTES = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
    n, o = name[:-1], int(name[-1])
    return 440 * 2 ** ((NOTES[n] - 9) / 12 + (o - 4))

def place(sig, start_s, gL, gR=None):
    if gR is None: gR = gL
    s = int(start_s * SR)
    e = min(s + len(sig), N)
    if s >= N or e <= s: return
    L[s:e] += sig[:e - s] * gL
    R[s:e] += sig[:e - s] * gR

# ── ピアノ(倍音減衰+ハンマーノイズ+微細なデチューン) ──
def piano(freq, dur=3.0, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for k, a, dec in ((1, 1.0, 1.6), (2, 0.52, 2.6), (3, 0.24, 3.6), (4, 0.12, 4.6), (5, 0.06, 6.0), (6, 0.03, 7.0)):
        det = 1 + (rng.random() - 0.5) * 0.0012
        x += a * np.sin(2 * np.pi * freq * k * det * t) * np.exp(-t * dec * (0.7 + freq / 700))
    ham = rng.standard_normal(int(0.012 * SR)) * np.exp(-np.arange(int(0.012 * SR)) / SR * 700)
    x[: len(ham)] += ham * 0.5
    a2 = int(0.003 * SR)
    x[:a2] *= np.linspace(0, 1, a2)
    return x * vel

# ── 弦(遅いアタック+表情ビブラート+クレッシェンド可) ──
def strings(freq, dur, vel=1.0, attack=1.2, cresc=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for det in (-0.16, -0.06, 0.05, 0.14):
        f = freq * 2 ** (det / 12 / 6)
        vib = 1 + 0.0045 * np.sin(2 * np.pi * 5.4 * t + rng.uniform(0, 6)) * np.minimum(t / 1.8, 1)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        x += np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.26 * np.sin(3 * ph) + 0.12 * np.sin(4 * ph)
    env = np.ones(n)
    at = int(attack * SR)
    env[:min(at, n)] = (np.arange(min(at, n)) / at) ** 1.7
    rl = int(1.6 * SR)
    if n > rl: env[-rl:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(rl) / rl)
    if cresc > 0:
        env *= 1 + cresc * (t / dur) ** 2
    return np.convolve(x * env * vel, np.ones(12) / 12, 'same')

def timp(freq=68, dur=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * (1 + 0.5 * np.exp(-t * 13)) * t) * np.exp(-t * 3.6)
    nz = rng.standard_normal(n) * np.exp(-t * 26) * 0.3
    return x + np.convolve(nz, np.ones(18) / 18, 'same')

def cym_swell(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    return (nz - np.convolve(nz, np.ones(10) / 10, 'same')) * (t / dur) ** 2.4

# ══ 楽曲 ══
# コード進行(4小節×4拍、70bpm → 1拍0.857s、1小節3.43s)
BEAT = 60 / 70
BAR = BEAT * 4
CHORDS = [
    ('Dm', ['D2', 'A2', 'D3', 'F3', 'A3'], ['D4', 'F4', 'A4']),
    ('Bb', ['Bb1', 'F2', 'Bb2', 'D3', 'F3'], ['Bb3', 'D4', 'F4']),
    ('F', ['F2', 'C3', 'F3', 'A3', 'C4'], ['F4', 'A4', 'C5']),
    ('C', ['C2', 'G2', 'C3', 'E3', 'G3'], ['C4', 'E4', 'G4']),
]

# ── 序盤(0-7s): ピアノのモチーフ、孤独に ──
# モチーフ: D4 F4 A4 C5 A4 F4(上がって、降りる=火が起きる)
motif = [('D4', 0.0, 0.9), ('F4', 0.9, 0.7), ('A4', 1.7, 1.0), ('C5', 2.6, 0.85), ('A4', 3.6, 0.6), ('F4', 4.4, 0.5)]
for note, when, vel in motif:
    hum = (rng.random() - 0.5) * 0.03
    place(piano(nf(note), 3.4, vel), 0.5 + when + hum, 0.24, 0.2)
# 左手(ルート)
for note, when in (('D3', 0.5), ('D2', 0.55), ('Bb2', 3.9), ('Bb1', 3.95)):
    place(piano(nf(note), 4.2, 0.8), when, 0.16, 0.19)

# ── 中盤(6-14s): 低弦が入り、進行が動き出す ──
for bar_i, (name, low, _hi) in enumerate(CHORDS):
    t0 = 6.4 + bar_i * BAR / 1.75  # 少し詰めて緊張感
    for j, tn in enumerate(low[:3]):
        place(strings(nf(tn), BAR / 1.75 + 1.8, vel=0.9, attack=0.9), t0, 0.045 if j else 0.06)
# モチーフ再現(1オクターブ上・弦の上で)
for note, when, vel in motif:
    place(piano(nf(note) * 1.0, 3.0, vel * 0.9), 8.2 + when * 0.85, 0.2, 0.24)

# ── クライマックス(14-19s): 全奏。旋律は弦の高音、ティンパニとシンバル ──
place(cym_swell(2.2), 11.8, 0.06)
place(timp(60, 2.6), 14.0, 0.4)
for bar_i, (name, low, hi) in enumerate(CHORDS[:3]):
    t0 = 14.0 + bar_i * BAR / 1.75
    for j, tn in enumerate(low):
        place(strings(nf(tn), BAR / 1.75 + 2.0, vel=1.15, attack=0.5), t0, 0.05)
    for j, tn in enumerate(hi):
        place(strings(nf(tn), BAR / 1.75 + 2.0, vel=0.8, attack=0.6, cresc=0.4), t0, 0.03, 0.038)
place(timp(72, 2.0), 17.4, 0.28)
# 旋律(高弦): D5 → C5 → A4 → 上がって D5(帰結)
for note, when, vel in (('D5', 14.2, 0.9), ('C5', 15.6, 0.8), ('A4', 16.6, 0.75), ('D5', 17.6, 1.0)):
    place(strings(nf(note), 2.6, vel=vel, attack=0.35), when, 0.035, 0.042)

# ── 余韻(19-24s): ピアノに戻る。解決のDメジャー ──
place(timp(56, 3.0), 19.4, 0.34)
place(cym_swell(1.6), 18.0, 0.05)
for note, when, vel in (('D4', 19.8, 0.8), ('A4', 20.6, 0.65), ('F#4', 21.5, 0.75), ('D5', 22.3, 0.5)):
    place(piano(nf(note), 4.0, vel), when, 0.22, 0.26)
place(strings(nf('D3'), 5.0, vel=0.6, attack=1.6), 19.4, 0.04)
place(strings(nf('A3'), 5.0, vel=0.5, attack=1.8), 19.6, 0.035)

# ── 低音の温かい支え(全体) ──
t = np.arange(N) / SR
sub = np.sin(2 * np.pi * nf('D1') * t) * (0.4 + 0.3 * np.sin(2 * np.pi * t / 8 - 1))
env = np.ones(N)
a = int(2.0 * SR); env[:a] = np.linspace(0, 1, a)
r = int(2.5 * SR); env[-r:] *= np.linspace(1, 0, r)
L += sub * 0.05 * env
R += sub * 0.05 * env

mix = np.stack([L * env, R * env])
mix = np.tanh(mix * 1.2)
mix *= 0.88 / max(np.abs(mix).max(), 1e-9)
pcm = (mix.T * 32767).astype(np.int16)
with wave.open('public/audio/bgm_forge_emo.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('OK bgm_forge_emo.wav')
