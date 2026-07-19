import numpy as np, wave

# 4スタイルのフル尺BGM(165s)を一括生成
# 展示会本編のセクション(秒): 問い区間(静める)=[23.8,56.3],[90.7,109.2]
# リフト区間(上げる)=[56,72],[126.5,140],[148,165]
SR = 44100
DUR = 165.0
N = int(SR * DUR)

DUCKS = [(23.8, 56.3), (90.7, 109.2)]
LIFTS = [(56.0, 72.0), (126.5, 140.0), (148.0, 165.0)]

def in_win(t, wins):
    return any(s <= t < e for s, e in wins)

def nfreq(name):
    NOTES = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
    n, o = name[:-1], int(name[-1])
    return 440 * 2 ** ((NOTES[n] - 9) / 12 + (o - 4))

def make_placer(L, R):
    def place(sig, start_s, gL, gR=None):
        if gR is None: gR = gL
        s = int(start_s * SR)
        e = min(s + len(sig), N)
        if s >= N or e <= s: return
        L[s:e] += sig[:e - s] * gL
        R[s:e] += sig[:e - s] * gR
    return place

def master(L, R, name, gain=0.87):
    env = np.ones(N)
    a = int(0.8 * SR); env[:a] = np.linspace(0, 1, a)
    r = int(2.5 * SR); env[-r:] *= np.linspace(1, 0, r)
    mix = np.stack([L * env, R * env])
    mix = np.tanh(mix * 1.15)
    mix *= gain / max(np.abs(mix).max(), 1e-9)
    pcm = (mix.T * 32767).astype(np.int16)
    with wave.open(f'public/audio/{name}.wav', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('OK', name)

# ══ 共通音源 ══
def kick(sr_f=48, sweep=2.6, dec=9, dur=0.28):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = sr_f * (1 + sweep * np.exp(-t * 26))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * dec)

def clap(seed=5):
    n = int(0.22 * SR)
    out = np.zeros(n)
    rng = np.random.default_rng(seed)
    for off in (0.0, 0.012, 0.026):
        nz = rng.standard_normal(n)
        band = np.convolve(nz, np.ones(4) / 4, 'same') - np.convolve(nz, np.ones(24) / 24, 'same')
        env = np.exp(-np.maximum(np.arange(n) / SR - off, 0) * 22) * (np.arange(n) / SR >= off)
        out += band * env
    return out

def hat(open_=False, seed=9):
    n = int((0.16 if open_ else 0.05) * SR)
    nz = np.random.default_rng(seed).standard_normal(n)
    hp = nz - np.convolve(nz, np.ones(8) / 8, 'same')
    return hp * np.exp(-np.arange(n) / SR * (26 if open_ else 90))

def bass_note(freq, dur=0.18):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 2 * t) + 0.28 * np.sin(2 * np.pi * freq * 3 * t)
    return x * np.exp(-t * 8)

def stab(tones, dur=0.34, dec=10):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for tn in tones:
        f = nfreq(tn)
        for k, a in ((1, 1.0), (2, 0.45), (3, 0.2), (4, 0.09)):
            x += a * np.sin(2 * np.pi * f * k * t)
    return x * np.exp(-t * dec) / len(tones)

def riser(dur, seed, band=6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = np.random.default_rng(seed).standard_normal(n)
    nz = nz - np.convolve(nz, np.ones(20) / 20, 'same') if band < 0 else np.convolve(nz, np.ones(band) / band, 'same')
    return nz * (t / dur) ** 2.2

rngg = np.random.default_rng(3)

def pad(freq, dur, vel=1.0, attack=1.4, smooth=30, seed=None):
    rng = np.random.default_rng(seed if seed is not None else rngg.integers(1e6))
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for det in (-0.1, 0.0, 0.09):
        f = freq * 2 ** (det / 12 / 8)
        x += np.sin(2 * np.pi * f * t + rng.uniform(0, 6))
        x += 0.35 * np.sin(2 * np.pi * f * 2 * t + rng.uniform(0, 6))
    at = int(attack * SR); rl = int(1.6 * SR)
    env = np.ones(n)
    env[:min(at, n)] = 0.5 - 0.5 * np.cos(np.pi * np.arange(min(at, n)) / at)
    if n > rl: env[-rl:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(rl) / rl)
    return np.convolve(x * env * vel, np.ones(smooth) / smooth, 'same')

def strings(freq, dur, vel=1.0, attack=1.8, seed=None):
    rng = np.random.default_rng(seed if seed is not None else rngg.integers(1e6))
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
    return np.convolve(x * env * vel, np.ones(14) / 14, 'same')

def timp(freq=72, dur=1.6, seed=8):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * (1 + 0.5 * np.exp(-t * 14)) * t) * np.exp(-t * 4.2)
    nz = rng.standard_normal(n) * np.exp(-t * 30) * 0.3
    return x + np.convolve(nz, np.ones(20) / 20, 'same')

def bell(freq, dur=3.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2.01 * t) + 0.12 * np.sin(2 * np.pi * freq * 2.99 * t)
    return x * np.exp(-t * 1.6)

END = 163.0

# ══ ① キネティック(120bpm、色面カットに合うパンチ) ══
L = np.zeros(N); R = np.zeros(N); place = make_placer(L, R)
BEAT = 0.5; BAR = 2.0
BARS = [('A1', ['A3', 'C4', 'E4']), ('F1', ['F3', 'A3', 'C4']), ('C2', ['C4', 'E4', 'G4']), ('G1', ['G3', 'B3', 'D4'])]
b = 0.5
while b < END:
    duck = in_win(b, DUCKS)
    lift = in_win(b, LIFTS)
    place(kick(), b, 0.28 if duck else (0.56 if lift else 0.48))
    b += BEAT
t = 1.0
while t < END:
    if not in_win(t, DUCKS): place(clap(), t, 0.18 if in_win(t, LIFTS) else 0.14)
    t += 1.0
t = 0.75; i = 0
while t < END:
    place(hat(open_=(i % 4 == 3)), t, 0.05 if in_win(t, DUCKS) else 0.1)
    t += BEAT; i += 1
bar_i = 0; t = 0.5
while t < END:
    root, tones = BARS[bar_i % 4]
    duck = in_win(t, DUCKS); lift = in_win(t, LIFTS)
    place(stab(tones), t, 0.06 if duck else (0.15 if lift else 0.11), 0.05 if duck else (0.13 if lift else 0.09))
    if not duck:
        place(stab(tones), t + BEAT * 2.5, 0.07, 0.09)
    if lift:
        place(stab([tn.replace('3', '4').replace('4', '5', 1) if False else tn for tn in tones]), t + BEAT, 0.06)
    for k in range(8):
        place(bass_note(nfreq(root)), t + k * BEAT / 2 * 2 * 0.5, 0.1 if duck else 0.22)
    bar_i += 1; t += BAR
for ls, _le in LIFTS:
    place(riser(3.0, 13, band=-1), ls - 3.0, 0.07)
    place(kick(dur=0.5), ls, 0.6)
place(kick(dur=0.5), END, 0.65)
n2 = int(2.2 * SR); t2 = np.arange(n2) / SR
place(np.sin(2 * np.pi * 55 * t2) * np.exp(-t2 * 2.2), END, 0.4)
master(L, R, 'bgm_kinetic')

# ══ ② バイエンス(ダークアンビエント+心拍+リフトで脈動) ══
L = np.zeros(N); R = np.zeros(N); place = make_placer(L, R)
t = np.arange(N) / SR
f0 = 36.71
drone = np.zeros(N)
rng = np.random.default_rng(11)
for mult, a in ((1, 1.0), (2, 0.55), (3, 0.22), (4.01, 0.10), (5.99, 0.05)):
    vib = 1 + 0.002 * np.sin(2 * np.pi * 0.07 * t * mult + mult)
    drone += a * np.sin(2 * np.pi * f0 * mult * t * vib + rng.uniform(0, 6))
drone *= 0.62 + 0.38 * np.sin(2 * np.pi * t / 9.5 - 1.2)
L += drone * 0.16
R += drone * 0.16
for ch, seed in ((L, 21), (R, 22)):
    nz = np.random.default_rng(seed).standard_normal(N)
    band = np.convolve(nz, np.ones(9) / 9, 'same') - np.convolve(nz, np.ones(48) / 48, 'same')
    ch += band * (0.28 + 0.22 * np.sin(2 * np.pi * t / 13 + seed)) * 0.04
tt = 1.6
while tt < END:
    g = 0.13 if in_win(tt, DUCKS) else (0.26 if in_win(tt, LIFTS) else 0.19)
    place(kick(43, 0, 5.2, 1.0), tt, g)
    tt += 2.0
BELLS = [587.33, 440.0, 740.0, 587.33, 880.0]
tt = 3.4; bi = 0
while tt < END - 4:
    pl = 0.05 if bi % 2 else 0.028
    place(bell(BELLS[bi % 5]), tt, pl, 0.078 - pl)
    tt += 6.8 if in_win(tt, DUCKS) else 5.2
    bi += 1
for ls, _le in LIFTS:
    place(riser(3.5, 31), ls - 3.5, 0.1)
    place(kick(55, 1.6, 2.6, 2.0), ls, 0.42)
place(kick(50, 1.6, 2.2, 2.4), END, 0.44)
master(L, R, 'bgm_vaience_full')

# ══ ③ ナショジオ(弦+ホーン+ティンパニ、雄大に) ══
L = np.zeros(N); R = np.zeros(N); place = make_placer(L, R)
PROG = [
    (['D2', 'A2', 'D3', 'F#3', 'A3'], 'D3'),
    (['B1', 'F#2', 'B2', 'D3', 'F#3'], 'F#3'),
    (['G1', 'D2', 'G2', 'B2', 'D3'], 'D4'),
    (['A1', 'E2', 'A2', 'C#3', 'E3'], 'E3'),
]
s0 = 0.0; ci = 0
while s0 < END:
    tones, _h = PROG[ci % 4]
    duck = in_win(s0 + 3, DUCKS); lift = in_win(s0 + 3, LIFTS)
    for i, tn in enumerate(tones):
        g = (0.05 if i < 2 else 0.036) * (0.55 if duck else (1.25 if lift else 1.0))
        place(strings(nfreq(tn), 7.4), s0, g * (1 if i % 2 else 0.85), g * (0.85 if i % 2 else 1))
    ci += 1; s0 += 6.0
def horn(freq, dur, vel=1.0):
    n = int(dur * SR)
    th = np.arange(n) / SR
    x = np.zeros(n)
    for k, a in ((1, 1.0), (2, 0.6), (3, 0.42), (4, 0.22), (5, 0.1)):
        x += a * np.sin(2 * np.pi * freq * k * th)
    at = int(0.5 * SR); rl = int(1.2 * SR)
    env = np.ones(n)
    env[:min(at, n)] = np.arange(min(at, n)) / at
    if n > rl: env[-rl:] *= np.linspace(1, 0, rl)
    sw = 0.55 + 0.45 * np.sin(np.pi * np.minimum(th / dur, 1))
    return np.convolve(x * env * sw * vel, np.ones(10) / 10, 'same')
for when, note in ((3.2, 'D3'), (58.0, 'F#3'), (74.0, 'D3'), (128.0, 'F#3'), (150.0, 'D4'), (157.0, 'A3')):
    place(horn(nfreq(note), 4.2), when, 0.045)
for when in (0.2, 23.8, 56.0, 90.7, 110.0, 126.5, 148.0):
    place(timp(), when, 0.28)
for ls, _le in LIFTS:
    t0 = ls - 1.7
    while t0 < ls - 0.05:
        place(timp(76, 0.5), t0, 0.03 + 0.11 * ((t0 - ls + 1.7) / 1.7))
        t0 += 0.09
    place(timp(60, 2.2), ls, 0.42)
    place(riser(1.8, 41, band=-1), ls - 1.8, 0.05)
place(timp(56, 2.8), END, 0.46)
dr = np.sin(2 * np.pi * nfreq('D1') * t) + 0.4 * np.sin(2 * np.pi * nfreq('D2') * t + 1.3)
L += dr * 0.055
R += dr * 0.055
master(L, R, 'bgm_natgeo_full')

# ══ ④ ホワイト(ミニマル・上品、100bpm) ══
L = np.zeros(N); R = np.zeros(N); place = make_placer(L, R)
SECT = [(['C3', 'E3', 'G3', 'D4'], 'C2'), (['F2', 'A2', 'C3', 'G3'], 'F1'), (['A2', 'C3', 'E3', 'B3'], 'A1'), (['G2', 'B2', 'D3', 'A3'], 'G1')]
s0 = 0.0; ci = 0
while s0 < END:
    tones, root = SECT[ci % 4]
    duck = in_win(s0 + 3, DUCKS); lift = in_win(s0 + 3, LIFTS)
    mul = 0.6 if duck else (1.3 if lift else 1.0)
    for i, tn in enumerate(tones):
        place(pad(nfreq(tn), 7.0), s0, 0.05 * mul if i % 2 else 0.042 * mul, 0.042 * mul if i % 2 else 0.05 * mul)
    n3 = int(6.4 * SR); t3 = np.arange(n3) / SR
    sub = np.sin(2 * np.pi * nfreq(root) * t3)
    env = np.ones(n3); aa = int(0.6 * SR)
    env[:aa] = np.linspace(0, 1, aa); env[-aa:] *= np.linspace(1, 0, aa)
    place(sub * env, s0, 0.12 * mul)
    ci += 1; s0 += 6.0
BEATW = 0.6
bw = 4.8
while bw < END:
    if not in_win(bw, DUCKS):
        place(kick(46, 1.9, 13, 0.32), bw, 0.3 if in_win(bw, LIFTS) else 0.24)
    bw += BEATW
def pluckw(freq):
    n = int(0.8 * SR)
    tp = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * tp) + 0.3 * np.sin(2 * np.pi * freq * 2 * tp)
    return x * np.exp(-tp * 5.5)
PENTA = ['E5', 'G5', 'C6', 'D6', 'G5', 'A5']
w = 6.0; i = 0
while w < END - 2:
    if not in_win(w, DUCKS):
        pl = 0.05 if i % 2 else 0.02
        place(pluckw(nfreq(PENTA[i % 6])), w, pl, 0.07 - pl)
    i += 1
    w += 1.2 if i % 3 else 2.4
for ls, _le in LIFTS:
    place(riser(3.0, 19, band=-1), ls - 3.0, 0.05)
master(L, R, 'bgm_white_full')
