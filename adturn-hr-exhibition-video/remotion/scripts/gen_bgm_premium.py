import numpy as np, wave

SR = 44100
DUR = 165.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(42)

BPM = 88
BEAT = 60 / BPM
BAR = BEAT * 4

def nfreq(name):
    NOTES = {'C':0,'C#':1,'D':2,'Eb':3,'E':4,'F':5,'F#':6,'G':7,'Ab':8,'A':9,'Bb':10,'B':11}
    n, o = name[:-1], int(name[-1])
    return 440 * 2 ** ((NOTES[n] - 9) / 12 + (o - 4))

# Dmワールドの上質な循環: Dm9 → Bbmaj9 → Fmaj9 → Cadd9（2小節ずつ）
CHORDS = [
    {'root': 'D2',  'tones': ['D3','F3','A3','C4','E4']},
    {'root': 'Bb1', 'tones': ['Bb2','D3','F3','A3','C4']},
    {'root': 'F2',  'tones': ['F3','A3','C4','E4','G4']},
    {'root': 'C2',  'tones': ['C3','E3','G3','B3','D4']},
]

def place(buf, sig, start_s, gainL, gainR=None):
    if gainR is None: gainR = gainL
    s = int(start_s * SR)
    e = min(s + len(sig), N)
    if s >= N: return
    L[s:e] += sig[:e-s] * gainL
    R[s:e] += sig[:e-s] * gainR

# ── フェルトピアノ（減衰する倍音＋こもった質感） ──
def piano(freq, dur=3.2, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for k in range(1, 7):
        amp = vel / k ** 1.8
        dec = np.exp(-t * (1.1 + k * 0.75))
        det = 1 + (k - 1) * 0.0007
        x += amp * dec * np.sin(2 * np.pi * freq * k * det * t + rng.uniform(0, 2*np.pi))
    a = int(0.008 * SR)
    x[:a] *= np.linspace(0, 1, a)
    # フェルトのこもり: 短い移動平均を2回
    kern = np.ones(12) / 12
    x = np.convolve(x, kern, "same")
    return x

# ── 温かいパッド（弦っぽく、非常に柔らかい） ──
def pad(freq, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for det in (-0.15, 0.0, 0.12):
        f = freq * 2 ** (det / 12 / 8)
        x += np.sin(2*np.pi*f*t + rng.uniform(0,2*np.pi))
        x += 0.28 * np.sin(2*np.pi*f*2*t + rng.uniform(0,2*np.pi))
    a = int(1.6 * SR); r = int(2.0 * SR)
    env = np.ones(n)
    env[:min(a,n)] = 0.5 - 0.5*np.cos(np.pi*np.arange(min(a,n))/a)
    if n > r: env[-r:] *= 0.5 + 0.5*np.cos(np.pi*np.arange(r)/r)
    x *= env * vel
    kern = np.ones(60) / 60
    return np.convolve(x, kern, 'same')

# ── サブベース ──
def sub(freq, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2*np.pi*freq*t) + 0.15*np.sin(2*np.pi*freq*2*t)
    a = int(0.12*SR); r = int(0.6*SR)
    env = np.ones(n)
    env[:a] = np.linspace(0,1,a)
    if n > r: env[-r:] *= np.linspace(1,0,r)
    return x * env * vel

# ── ソフトキック＆ティック ──
def kick():
    n = int(0.22*SR); t = np.arange(n)/SR
    f = 92 * np.exp(-t*16) + 44
    x = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*22)
    return x
def tick():
    n = int(0.05*SR)
    x = rng.standard_normal(n) * np.exp(-np.arange(n)/(0.008*SR))
    kern = np.ones(10)/10
    return np.convolve(x, kern, 'same')

# ── 配置 ──
total_bars = int(DUR / BAR) + 2
K = kick(); T = tick()
for bar in range(total_bars):
    t0 = bar * BAR
    ch = CHORDS[(bar // 2) % 4]
    # パッド（2小節ごと）
    if bar % 2 == 0:
        for j, tone in enumerate(ch['tones']):
            g = 0.028 / (1 + j*0.35)
            place(L, pad(nfreq(tone), BAR*2 + 1.5), t0, g*rng.uniform(0.9,1.1), g*rng.uniform(0.9,1.1))
    # サブ（各小節頭）
    place(L, sub(nfreq(ch['root']), BAR*0.96, 0.040), t0, 1.0, 1.0)
    # ピアノ・アルペジオ: 拍1, 2.5, 3.5 ＋ときどき4.5
    tones = ch['tones']
    pat = [(0.0, 0), (1.5, 2), (2.5, 4), (3.0, 1)] if bar % 4 == 2 else [(0.0, 0), (1.5, 2), (2.5, 4)]
    for beat, ti in pat:
        tone = tones[ti % len(tones)]
        vel = rng.uniform(0.6, 0.95)
        sig = piano(nfreq(tone), 3.0, vel)
        pan = rng.uniform(-0.25, 0.25)
        place(L, sig, t0 + beat*BEAT, 0.115*(1-pan), 0.115*(1+pan))
    # 高音の飾り（4小節に1回、コード9thの1オクターブ上）
    if bar % 4 == 3:
        tone = tones[-1]
        sig = piano(nfreq(tone)*2, 2.5, 0.5)
        place(L, sig, t0 + 3.0*BEAT, 0.07, 0.075)
    # パルス: 各拍にごく小さなティック、2・4拍に柔らかいキック
    for b in range(4):
        place(L, T, t0 + b*BEAT, 0.016, 0.016)
        if b in (1, 3):
            place(L, K, t0 + b*BEAT, 0.030, 0.030)

# ── マスター ──
# 全体をさらに一段こもらせて「上質な奥行き」に
kern = np.ones(3)/3
L = np.convolve(L, kern, 'same'); R = np.convolve(R, kern, 'same')
fi, fo = int(2.5*SR), int(5.0*SR)
master = np.ones(N)
master[:fi] = np.linspace(0,1,fi)
master[-fo:] = np.linspace(1,0,fo)
L *= master; R *= master
peak = max(np.abs(L).max(), np.abs(R).max())
L = L/peak*0.5; R = R/peak*0.5
data = np.empty(N*2, dtype=np.int16)
data[0::2] = (L*32767).astype(np.int16)
data[1::2] = (R*32767).astype(np.int16)
with wave.open('/home/user/Claude-Code/adturn-hr-exhibition-video/remotion/public/audio/bgm.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(data.tobytes())
print('done')
