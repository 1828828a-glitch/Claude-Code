"""展示会動画用のシンプルなコーポレート調BGM（72秒）を合成する。

パッド（コード）＋ベース＋アルペジオの3レイヤー構成。
コード進行: C - G - Am - F（3.75秒/コード × 19 ≒ 72秒）
出力: bgm.wav（44.1kHz / 16bit / ステレオ）
"""
import numpy as np
import wave

SR = 44100
DUR = 72.0
SEG = 3.75  # 1コードの長さ（秒）

# ボイシング（MIDIノート）: [ベース用ルート, コード構成音...]
PROG = [
    [48, 55, 60, 64],  # C:  C3 G3 C4 E4
    [43, 55, 59, 62],  # G:  G2 G3 B3 D4
    [45, 57, 60, 64],  # Am: A2 A3 C4 E4
    [41, 53, 57, 60],  # F:  F2 F3 A3 C4
]

def f(m):  # MIDI -> Hz
    return 440.0 * 2 ** ((m - 69) / 12)

def env(n, a, r):
    """アタックa秒・リリースr秒の台形エンベロープ"""
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e

total = int(SR * DUR)
L = np.zeros(total)
R = np.zeros(total)

nseg = int(DUR / SEG)
for s in range(nseg):
    chord = PROG[s % 4]
    i0 = int(s * SEG * SR)
    n = int(SEG * SR) + int(0.4 * SR)  # 次のコードと少し重ねる
    n = min(n, total - i0)
    t = np.arange(n) / SR
    e = env(n, 0.6, 0.8)

    # パッド: 各構成音を弱いデチューンで重ねる（L/Rで揺らして広がりを出す）
    for m in chord[1:]:
        fr = f(m)
        L[i0:i0 + n] += 0.16 * e * (np.sin(2 * np.pi * fr * 0.9985 * t) +
                                    0.35 * np.sin(2 * np.pi * fr * 2 * t))
        R[i0:i0 + n] += 0.16 * e * (np.sin(2 * np.pi * fr * 1.0015 * t) +
                                    0.35 * np.sin(2 * np.pi * fr * 2 * t))

    # ベース: ルートの1オクターブ下
    fb = f(chord[0] - 12)
    bass = 0.30 * env(n, 0.05, 0.6) * np.sin(2 * np.pi * fb * t)
    L[i0:i0 + n] += bass
    R[i0:i0 + n] += bass

    # アルペジオ（8分音符でコードトーンを上昇）
    step = SEG / 8
    tones = [chord[1] + 12, chord[2] + 12, chord[3] + 12, chord[2] + 24]
    for k in range(8):
        j0 = i0 + int(k * step * SR)
        m = tones[k % 4]
        nn = min(int(0.9 * step * SR), total - j0)
        if nn <= 0:
            continue
        tt = np.arange(nn) / SR
        pl = 0.12 * np.exp(-tt * 5.5) * (np.sin(2 * np.pi * f(m) * tt) +
                                         0.3 * np.sin(2 * np.pi * f(m) * 2 * tt))
        pan = 0.35 if k % 2 else 0.65
        L[j0:j0 + nn] += pl * (1 - pan)
        R[j0:j0 + nn] += pl * pan

# 全体フェード（イン1.5秒 / アウト4秒）
fade_in = int(1.5 * SR)
fade_out = int(4.0 * SR)
g = np.ones(total)
g[:fade_in] = np.linspace(0, 1, fade_in)
g[-fade_out:] *= np.linspace(1, 0, fade_out) ** 1.5
L *= g
R *= g

# ノーマライズ（ピーク0.55 — ナレーションの下に敷く前提の控えめな音量）
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 0.55, R / peak * 0.55

data = (np.stack([L, R], axis=1) * 32767).astype(np.int16)
with wave.open("bgm.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(data.tobytes())
print("bgm.wav written:", data.shape[0] / SR, "sec")
