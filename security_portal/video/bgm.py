"""紹介動画のBGMをその場で合成する（オリジナル曲なので、著作権の手続きは要らない）

96BPM・ハ長調、63秒。落ち着いたパッドとアルペジオに、控えめなリズムを重ねる。
場面の切り替わりに合わせて楽器を出し入れする（2.5秒＝1小節）。
  0〜5秒    パッドとアルペジオだけ（現場の場面）
  5〜10秒   ベースが入る（問いかけ）
  10〜22.5秒 キックとハイハットが入り、22.5秒に向けて盛り上げる（数字・サービス名）
  22.5〜50秒 全部の楽器（診断・シミュレーション・止める？通す？・その他の機能）
  50〜55秒  リズムを抜く（立ち位置）
  55〜63秒  ハ長調に解決して終わる（締め）
使い方: python3 security_portal/video/bgm.py [出力先]（既定は security_portal/video/out/bgm.wav）
"""
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
BPM = 96
BEAT = 60 / BPM
BAR = BEAT * 4
DUR = 63.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

# 和音（ベースの音、和音の構成音）。MIDIノート番号
F, G, EM, AM = (41, [53, 57, 60, 64]), (43, [55, 59, 62, 64]), (40, [52, 55, 59, 62]), (45, [57, 60, 64, 67])
C_END = (36, [48, 55, 60, 62, 64])
LOOP = [F, G, EM, AM]
CHORDS = [LOOP[b % 4] for b in range(20)] + [EM, AM, F, G, C_END]  # 25小節

dry = np.zeros((2, N))
wet = np.zeros((2, N))  # 残響をかける分
pad_bus = np.zeros((2, N))
kick_env = np.zeros(N)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(bus, sig, start, gain=1.0, pan=0.0):
    i = int(round(start * SR))
    if i >= N:
        return
    sig = sig[: N - i]
    a = (pan + 1) * np.pi / 4
    bus[0, i:i + len(sig)] += sig * gain * np.cos(a)
    bus[1, i:i + len(sig)] += sig * gain * np.sin(a)


def t_of(seconds):
    return np.arange(int(seconds * SR)) / SR


def pad_note(m, hold, release=1.4):
    t = t_of(hold + release)
    sig = np.zeros_like(t)
    for cents, ph in ((-7, 0.0), (0, 1.3), (7, 2.1)):
        f = hz(m) * 2 ** (cents / 1200)
        sig += np.sin(2 * np.pi * f * t + ph) + 0.22 * np.sin(4 * np.pi * f * t + ph) + 0.07 * np.sin(6 * np.pi * f * t)
    env = 1 - np.exp(-t / 0.35)
    rel = t > hold
    env[rel] *= np.exp(-(t[rel] - hold) / (release / 4))
    return sig * env * (1 + 0.04 * np.sin(2 * np.pi * 0.25 * t)) / 3


def pluck(m, length=0.9):
    t = t_of(length)
    f = hz(m)
    sig = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.28)
           + 0.28 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.12)
           + 0.08 * np.sin(6 * np.pi * f * t) * np.exp(-t / 0.05))
    return sig * np.minimum(1, t / 0.004)


def bell(m, length=3.5):
    t = t_of(length)
    f = hz(m)
    sig = np.sin(2 * np.pi * f * t) * np.exp(-t / 1.2) + 0.25 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.5)
    return sig * np.minimum(1, t / 0.003)


def bass_note(m, length):
    t = t_of(length + 0.2)
    f = hz(m)
    sig = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)
    env = np.minimum(1, t / 0.01) * (0.7 + 0.3 * np.exp(-t / 0.15))
    env[t > length] *= np.exp(-(t[t > length] - length) / 0.05)
    return sig * env


def kick():
    t = t_of(0.4)
    f = 46 + 80 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.13)


def hat():
    t = t_of(0.06)
    noise = np.diff(rng.standard_normal(len(t) + 1))
    noise = np.convolve(noise, [0.5, 0.5], mode="same")  # 高域の角を少し丸める
    return noise * np.exp(-t / 0.014)


def clap():
    t = t_of(0.25)
    noise = rng.standard_normal(len(t))
    band = noise - np.convolve(noise, np.ones(24) / 24, mode="same")
    return band * np.exp(-t / 0.07) * 0.6


def swell(length):
    t = t_of(length)
    noise = rng.standard_normal(len(t))
    soft = np.convolve(noise, np.ones(12) / 12, mode="same")
    return soft * (t / length) ** 3


for b, (root, notes) in enumerate(CHORDS):
    start = b * BAR
    last = b == len(CHORDS) - 1
    hold = DUR - start if last else BAR

    # パッド：最初の2小節は小さめ、最後の和音は伸ばす
    pad_gain = 0.55 if b < 2 else 0.8
    for k, m in enumerate(notes):
        place(pad_bus, pad_note(m, hold, release=3.0 if last else 1.4), start, pad_gain * 0.16, pan=(k - 1.5) * 0.25)

    # アルペジオ（8分音符）。7小節目から1オクターブ上の音を混ぜて明るくする
    if not last:
        pattern = [0, 1, 2, 3, 2, 1, 2, 3] if b < 7 else [0, 2, 3, 4, 3, 2, 1, 3]
        tones = notes + [notes[0] + 12, notes[1] + 12]
        arp_gain = 0.10 if b < 2 or b in (20, 21) else 0.16
        for i, idx in enumerate(pattern):
            m = tones[idx % len(tones)] + 12
            place(wet, pluck(m), start + i * BEAT / 2, arp_gain, pan=-0.35 if i % 2 == 0 else 0.35)
    else:
        for m, pan in ((72, -0.2), (79, 0.2), (84, 0.0)):
            place(wet, bell(m), start + 0.02, 0.10, pan=pan)

    # ベース（2小節目から。立ち位置の20〜21小節は抜く）
    if b >= 2 and b not in (20, 21):
        if last:
            place(dry, bass_note(root, 2.6), start, 0.2)
        else:
            place(dry, bass_note(root, BEAT * 1.4), start, 0.2)
            place(dry, bass_note(root, BEAT * 0.9), start + BEAT * 2.5, 0.16)
            place(dry, bass_note(root + 12 if b >= 9 else root, BEAT * 0.8), start + BEAT * 3.5, 0.13)

    # リズム：4〜19小節と22〜23小節。20〜21小節（立ち位置）は抜く
    drums = (4 <= b <= 19) or (22 <= b <= 23)
    if drums:
        kick_beats = [0, 2] if b < 9 or b >= 22 else [0, 1.5, 2]
        for kb in kick_beats:
            at = start + kb * BEAT
            place(dry, kick(), at, 0.4 if b >= 22 else 0.55)
            i = int(at * SR)
            kick_env[i:i + int(0.25 * SR)] = np.maximum(kick_env[i:i + int(0.25 * SR)], np.exp(-np.arange(min(int(0.25 * SR), N - i)) / (0.08 * SR)))
        for i in range(4):
            place(dry, hat(), start + (i + 0.5) * BEAT, 0.035 if b < 9 else 0.045, pan=0.3)
        if 9 <= b <= 19:
            for cb in (1, 3):
                place(wet, clap(), start + cb * BEAT, 0.10)
                place(dry, clap(), start + cb * BEAT, 0.08)

    # 診断の場面（22.5秒）へ入る前に盛り上げる
    if b == 8:
        place(wet, swell(BAR), start, 0.06)

# キックに合わせてパッドを少し下げる（うねりを出す）
pad_bus *= 1 - 0.35 * kick_env
wet += pad_bus * 0.6
dry += pad_bus * 0.4


def reverb(x, seconds=2.4):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = np.zeros_like(x)
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-t / (seconds / 6.9))
        ir = np.convolve(ir, np.ones(6) / 6, mode="same")
        ir[: int(0.012 * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2))
        size = 1 << int(np.ceil(np.log2(N + n)))
        out[ch] = np.fft.irfft(np.fft.rfft(x[ch], size) * np.fft.rfft(ir, size), size)[:N]
    return out


mix = dry + 0.55 * reverb(wet) + 0.5 * wet

# 頭と終わりのフェード、やわらかいリミッター、ピークを -1dBFS に
t = np.arange(N) / SR
mix *= np.minimum(1, t / 0.4)
mix *= np.where(t > 60.5, np.cos(np.minimum(1, (t - 60.5) / 2.5) * np.pi / 2), 1)
mix /= np.max(np.abs(mix))
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
mix *= 10 ** (-1 / 20) / np.max(np.abs(mix))

def write(path, x):
    pcm = (np.clip(x, -1, 1).T * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def loudness(path):
    # ffmpeg の ebur128 で統合ラウドネス（LUFS）を測る
    log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[0-9.]+) LUFS", log)[-1])


out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "out" / "bgm.wav"
out.parent.mkdir(parents=True, exist_ok=True)
# ウェブ動画で一般的な -16 LUFS に合わせる（ナレーションを重ねる場合は、さらに 6〜10dB 下げる）
TARGET = -16.0
write(out, mix)
mix *= 10 ** ((TARGET - loudness(out)) / 20)
write(out, mix)
print(out, f"{DUR}s", f"{loudness(out):.1f} LUFS", f"peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS")
