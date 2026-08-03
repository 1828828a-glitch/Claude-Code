# 温かみのあるコーポレート系パッドBGMを生成する(ライセンスフリー・自己完結)
import numpy as np
import wave

SR = 44100
BPM = 72
BEAT = 60.0 / BPM

def note(freq, dur, attack=0.4, release=0.8, gain=1.0, detune=0.002):
    n = int(SR * dur)
    t = np.arange(n) / SR
    # デチューンした2声+倍音でパッドらしい厚み
    sig = (
        np.sin(2 * np.pi * freq * (1 + detune) * t)
        + np.sin(2 * np.pi * freq * (1 - detune) * t)
        + 0.35 * np.sin(2 * np.pi * freq * 2 * t)
        + 0.12 * np.sin(2 * np.pi * freq * 3 * t)
    )
    env = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / release)
    env = np.clip(env, 0, 1) ** 1.5
    return sig * env * gain

def pluck(freq, dur, gain=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    sig = (
        np.sin(2 * np.pi * freq * t)
        + 0.5 * np.sin(2 * np.pi * freq * 2 * t)
        + 0.2 * np.sin(2 * np.pi * freq * 3 * t)
    )
    env = np.exp(-t * 3.2) * np.minimum(1, t / 0.008)
    return sig * env * gain

def add(buf, start_sec, sig):
    i = int(start_sec * SR)
    j = min(len(buf), i + len(sig))
    if i < len(buf):
        buf[i:j] += sig[: j - i]

N = lambda name: {
    'C2': 65.41, 'E2': 82.41, 'F2': 87.31, 'G2': 98.0, 'A2': 110.0,
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.0, 'A3': 220.0, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.0, 'A4': 440.0, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.26, 'G5': 783.99,
}[name]

# コード進行: Fmaj7 → G6 → Em7 → Am9 (key C)。1コード8拍。
chords = [
    dict(bass='F2', pad=['F3', 'A3', 'C4', 'E4'], arp=['A4', 'C5', 'E5']),
    dict(bass='G2', pad=['G3', 'B3', 'D4', 'E4'], arp=['B4', 'D5', 'G5']),
    dict(bass='E2', pad=['E3', 'G3', 'B3', 'D4'], arp=['G4', 'B4', 'D5']),
    dict(bass='A2', pad=['A3', 'C4', 'E4', 'G4'], arp=['C5', 'E5', 'A4']),
]

chord_dur = 8 * BEAT  # ≒6.67s
loops = 3
total = chord_dur * len(chords) * loops + 2
buf = np.zeros(int(SR * total))

for lp in range(loops):
    for ci, ch in enumerate(chords):
        t0 = (lp * len(chords) + ci) * chord_dur
        # ベース(1拍目と5拍目)
        add(buf, t0, note(N(ch['bass']), chord_dur * 0.55, attack=0.05, release=1.2, gain=0.5))
        add(buf, t0 + 4 * BEAT, note(N(ch['bass']), chord_dur * 0.4, attack=0.05, release=1.0, gain=0.35))
        # パッド(コード全音、ゆっくり立ち上がる)
        for p in ch['pad']:
            add(buf, t0, note(N(p), chord_dur + 1.5, attack=1.6, release=2.2, gain=0.22))
        # アルペジオ(2,4,6拍目あたりに柔らかく)
        for k, a in enumerate(ch['arp']):
            add(buf, t0 + (1.5 + k * 2) * BEAT, pluck(N(a), 2.2, gain=0.16))
        # ループ2週目以降は高音の彩りを少し足す
        if lp >= 1:
            add(buf, t0 + 7 * BEAT, pluck(N(ch['arp'][0]) * 2, 1.8, gain=0.07))

# シンプルなローパス(一次IIR)で角を取る
alpha = 0.22
out = np.copy(buf)
for _ in range(2):
    prev = 0.0
    tmp = np.empty_like(out)
    for i in range(len(out)):
        prev = prev + alpha * (out[i] - prev)
        tmp[i] = prev
    out = tmp

# 擬似ステレオ(わずかな遅延を右chへ)+ ノーマライズ
delay = int(SR * 0.012)
left = out
right = np.concatenate([np.zeros(delay), out[:-delay]])
peak = max(np.abs(left).max(), np.abs(right).max())
left = left / peak * 0.5
right = right / peak * 0.5

stereo = np.empty(len(left) * 2)
stereo[0::2] = left
stereo[1::2] = right
pcm = (stereo * 32767).astype(np.int16)

with wave.open('bgm_raw.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('done', total, 'sec')
