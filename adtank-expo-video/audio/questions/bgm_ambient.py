"""台本v3（問い連打型）用のアンビエントBGM（93秒）を合成する。

指定トーン: アンビエント系の透明感あるシンセ。問いのシーンでは音数を減らし「余白」を作る。
構成: ロングパッド（コード）＋サブベース＋まばらなベル。
出力: q_bgm.wav（44.1kHz / 16bit / ステレオ）
"""
import numpy as np
import wave

SR = 44100
DUR = 93.0
SEG = 7.75  # 1コード（ゆったり）

# Am7 - Fmaj7 - Cmaj7 - G6 をループ（[ベース, 構成音...]）
PROG = [
    [45, 57, 60, 64, 67],
    [41, 53, 57, 60, 64],
    [48, 55, 59, 64, 67],
    [43, 55, 59, 62, 64],
]

def f(m):
    return 440.0 * 2 ** ((m - 69) / 12)

total = int(SR * DUR)
L = np.zeros(total)
R = np.zeros(total)

nseg = int(round(DUR / SEG))
for s in range(nseg):
    chord = PROG[s % 4]
    i0 = int(s * SEG * SR)
    n = min(int((SEG + 1.2) * SR), total - i0)  # 次のコードと重ねる
    t = np.arange(n) / SR
    # ゆっくり立ち上がるパッド
    e = np.ones(n)
    na, nr = int(2.5 * SR), int(1.6 * SR)
    e[:na] = np.linspace(0, 1, na) ** 1.5
    e[-nr:] *= np.linspace(1, 0, nr)
    for m in chord[1:]:
        fr = f(m)
        vib = 1 + 0.0012 * np.sin(2 * np.pi * 0.18 * t)
        L[i0:i0 + n] += 0.10 * e * np.sin(2 * np.pi * fr * 0.9985 * vib * t)
        R[i0:i0 + n] += 0.10 * e * np.sin(2 * np.pi * fr * 1.0015 * vib * t)
    # サブベース
    fb = f(chord[0] - 12)
    bass = 0.16 * e * np.sin(2 * np.pi * fb * t)
    L[i0:i0 + n] += bass
    R[i0:i0 + n] += bass

# まばらなベル（約9秒おきにコードトーンを一音）
rs = np.random.RandomState(7)
bt = 4.0
while bt < DUR - 6:
    chord = PROG[int(bt / SEG) % 4]
    m = chord[1 + rs.randint(len(chord) - 1)] + 24
    j0 = int(bt * SR)
    nn = min(int(3.5 * SR), total - j0)
    tt = np.arange(nn) / SR
    bell = 0.085 * np.exp(-tt * 1.8) * (np.sin(2 * np.pi * f(m) * tt) +
                                        0.4 * np.sin(2 * np.pi * f(m) * 2.01 * tt))
    pan = rs.uniform(0.3, 0.7)
    L[j0:j0 + nn] += bell * (1 - pan)
    R[j0:j0 + nn] += bell * pan
    bt += 8.0 + rs.uniform(0, 2.5)

# フェード（イン2秒 / アウト5秒）
fi, fo = int(2 * SR), int(5 * SR)
g = np.ones(total)
g[:fi] = np.linspace(0, 1, fi)
g[-fo:] *= np.linspace(1, 0, fo) ** 1.5
L *= g
R *= g

peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 0.5, R / peak * 0.5
data = (np.stack([L, R], axis=1) * 32767).astype(np.int16)
with wave.open("q_bgm.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(data.tobytes())
print("q_bgm.wav written:", data.shape[0] / SR, "sec")
