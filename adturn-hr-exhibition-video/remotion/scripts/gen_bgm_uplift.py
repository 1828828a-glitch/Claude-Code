import numpy as np, wave

SR = 44100
DUR = 165.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(77)

BPM = 106
BEAT = 60 / BPM
BAR = BEAT * 4

def nfreq(name):
    NOTES = {'C':0,'C#':1,'D':2,'Eb':3,'E':4,'F':5,'F#':6,'G':7,'Ab':8,'A':9,'Bb':10,'B':11}
    n, o = name[:-1], int(name[-1])
    return 440 * 2 ** ((NOTES[n] - 9) / 12 + (o - 4))

# 高揚のI–V–vi–IV（Dメジャー）: D → A → Bm → G（各1小節）
CHORDS = [
    {'root': 'D2', 'tones': ['D3','F#3','A3','D4','E4']},
    {'root': 'A1', 'tones': ['A2','C#3','E3','A3','B3']},
    {'root': 'B1', 'tones': ['B2','D3','F#3','B3','C#4']},
    {'root': 'G1', 'tones': ['G2','B2','D3','G3','A3']},
]

def place(sig, start_s, gL, gR=None):
    if gR is None: gR = gL
    s = int(start_s * SR)
    e = min(s + len(sig), N)
    if s >= N or e <= s: return
    L[s:e] += sig[:e-s] * gL
    R[s:e] += sig[:e-s] * gR

# ── プラック（8分のアルペジオ・キラキラしすぎない） ──
def pluck(freq, vel=1.0):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for k, a in ((1, 1.0), (2, 0.4), (3, 0.18), (4, 0.08)):
        x += a * np.sin(2*np.pi*freq*k*t) * np.exp(-t*(7 + k*3))
    a = int(0.004*SR); x[:a] *= np.linspace(0,1,a)
    return x * vel

# ── ブライトパッド ──
def pad(freq, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for det in (-0.12, 0.0, 0.1):
        f = freq * 2 ** (det/12/8)
        x += np.sin(2*np.pi*f*t + rng.uniform(0,2*np.pi))
        x += 0.4 * np.sin(2*np.pi*f*2*t + rng.uniform(0,2*np.pi))
        x += 0.12 * np.sin(2*np.pi*f*3*t + rng.uniform(0,2*np.pi))
    a = int(0.9*SR); r = int(1.2*SR)
    env = np.ones(n)
    env[:min(a,n)] = 0.5 - 0.5*np.cos(np.pi*np.arange(min(a,n))/a)
    if n > r: env[-r:] *= 0.5 + 0.5*np.cos(np.pi*np.arange(r)/r)
    x *= env * vel
    kern = np.ones(26)/26
    return np.convolve(x, kern, 'same')

# ── ベース（8分で刻む） ──
def bassnote(freq, dur=0.24, vel=1.0):
    n = int(dur*SR)
    t = np.arange(n)/SR
    x = (np.sin(2*np.pi*freq*t) + 0.3*np.sin(2*np.pi*freq*2*t)) * np.exp(-t*7)
    a = int(0.005*SR); x[:a] *= np.linspace(0,1,a)
    return x * vel

# ── ドラム ──
def kick():
    n = int(0.24*SR); t = np.arange(n)/SR
    f = 105 * np.exp(-t*17) + 46
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*18)
def hat(open_=False):
    n = int((0.12 if open_ else 0.045)*SR)
    x = rng.standard_normal(n) * np.exp(-np.arange(n)/((0.03 if open_ else 0.009)*SR))
    # ハイパス風: 元から移動平均を引く
    kern = np.ones(24)/24
    return x - np.convolve(x, kern, 'same')
def crash():
    n = int(1.6*SR)
    x = rng.standard_normal(n) * np.exp(-np.arange(n)/(0.45*SR))
    kern = np.ones(16)/16
    return (x - np.convolve(x, kern, 'same')) * 0.8
def snare():
    n = int(0.18*SR); t = np.arange(n)/SR
    x = rng.standard_normal(n) * np.exp(-t*26)
    x += 0.6*np.sin(2*np.pi*190*t)*np.exp(-t*30)
    return x

# ── リードモチーフ（2小節に1回、シンプルに歌う） ──
def lead(freq, dur=0.5, vel=1.0):
    n = int(dur*SR)
    t = np.arange(n)/SR
    x = np.sin(2*np.pi*freq*t) + 0.35*np.sin(2*np.pi*freq*2*t) + 0.12*np.sin(2*np.pi*freq*3*t)
    a = int(0.02*SR); r = int(0.18*SR)
    env = np.ones(n); env[:a] = np.linspace(0,1,a); env[-r:] *= np.linspace(1,0,r)
    kern = np.ones(14)/14
    return np.convolve(x*env, kern, 'same') * vel

total_bars = int(DUR / BAR) + 2
K, SN = kick(), snare()

for bar in range(total_bars):
    t0 = bar * BAR
    ch = CHORDS[bar % 4]
    tones = ch['tones']
    energy = min(1.0, 0.35 + bar / 22)  # だんだん盛り上がる

    # パッド
    for j, tone in enumerate(tones[:4]):
        g = 0.016 / (1 + j*0.3) * (0.7 + 0.5*energy)
        place(pad(nfreq(tone), BAR + 0.8), t0, g*rng.uniform(0.9,1.1), g*rng.uniform(0.9,1.1))

    # プラック・アルペジオ（8分、上昇形で高揚感）
    seq = [0, 2, 3, 4, 3, 2, 3, 4]
    for i8 in range(8):
        tone = tones[seq[i8] % len(tones)]
        oct_up = 2 if (bar % 8 >= 6 and i8 % 2 == 0) else 1
        vel = (0.5 + 0.35*energy) * rng.uniform(0.8, 1.0) * (1.15 if i8 == 0 else 1.0)
        pan = 0.3 * np.sin(i8 * 1.3)
        place(pluck(nfreq(tone)*oct_up, vel), t0 + i8*BEAT/2, 0.10*(1-pan), 0.10*(1+pan))

    # ベース（バー4以降、8分で刻む）
    if bar >= 4:
        for i8 in range(8):
            v = 0.16 if i8 % 2 == 0 else 0.11
            place(bassnote(nfreq(ch['root'])), t0 + i8*BEAT/2, v*energy*1.2)

    # ドラム（バー8以降: 4つ打ち＋2・4拍スネア気配＋裏ハット）
    if bar >= 8:
        for b in range(4):
            place(K, t0 + b*BEAT, 0.135*energy)
            place(hat(), t0 + (b+0.5)*BEAT, 0.035*energy)
            if b in (1, 3):
                place(SN, t0 + b*BEAT, 0.045*energy)
        if bar % 8 == 7:
            place(hat(True), t0 + 3.5*BEAT, 0.05)

    # リード（バー16以降、2小節に1回のモチーフ）
    if bar >= 16 and bar % 2 == 0:
        motif = [(0.0, 4, 0.5), (1.0, 3, 0.4), (1.5, 4, 0.45), (2.5, 2, 0.6), (3.0, 4, 0.5)]
        for beat, ti, d in motif:
            tone = tones[ti % len(tones)]
            place(lead(nfreq(tone)*2, d, 0.9), t0 + beat*BEAT, 0.055, 0.06)

    # セクション頭のクラッシュ
    if bar % 16 == 8 or bar % 16 == 0 and bar > 0:
        place(crash(), t0, 0.030)

# マスター
fi, fo = int(1.2*SR), int(4.0*SR)
master = np.ones(N)
master[:fi] = np.linspace(0,1,fi)
master[-fo:] = np.linspace(1,0,fo)
L *= master; R *= master
peak = max(np.abs(L).max(), np.abs(R).max())
L = L/peak*0.55; R = R/peak*0.55
data = np.empty(N*2, dtype=np.int16)
data[0::2] = (L*32767).astype(np.int16)
data[1::2] = (R*32767).astype(np.int16)
with wave.open('/home/user/Claude-Code/adturn-hr-exhibition-video/remotion/public/audio/bgm.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(data.tobytes())
print('done')
