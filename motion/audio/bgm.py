# BGM を数式だけで作る。落ち着いたパッドに、細かい分散和音と控えめなキックを重ねた70.5秒
import numpy as np, soundfile as sf
SR, DUR, BPM = 44100, 70.5, 96
beat = 60 / BPM
n = int(SR * DUR); t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(1979)
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, start, sig):
    i = int(start * SR)
    if i >= n: return
    sig = sig[: n - i]; buf[i:i + len(sig)] += sig
# 進行は Fmaj7 → G6 → Am7 → Em7。1つ2小節
chords = [[53, 57, 60, 64], [55, 59, 62, 64], [57, 60, 64, 67], [52, 55, 59, 62]]
bar = beat * 4; clen = bar * 2
k = 0
while k * clen < DUR:
    ch = chords[k % 4]; t0 = k * clen
    tt = np.arange(int((clen + 1.5) * SR)) / SR
    env = np.minimum(1, tt / 1.2) * np.minimum(1, (clen + 1.5 - tt) / 1.5)
    for j, m in enumerate(ch):
        for det, pan in ((-0.07, 0.3), (0.07, 0.7)):
            f = hz(m + det)
            w = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt + 0.5) + 0.12 * np.sin(2 * np.pi * 3 * f * tt)
            w *= env * 0.05 * (1 + 0.15 * np.sin(2 * np.pi * 0.2 * tt + j))
            add(L, t0, w * (1 - pan)); add(R, t0, w * pan)
    # 低音
    f = hz(ch[0] - 12)
    w = np.sin(2 * np.pi * f * tt) * env * 0.16
    add(L, t0, w * 0.5); add(R, t0, w * 0.5)
    k += 1
# 分散和音。8秒あたりから入り、最後の4秒で抜ける
step = beat / 2; i = 0
pat = [0, 2, 1, 3, 2, 1, 3, 2]
while i * step < DUR - 4:
    ts = i * step
    if ts >= 7.5:
        ch = chords[int(ts // clen) % 4]
        m = ch[pat[i % 8]] + 12 + (12 if i % 16 >= 12 else 0)
        tt = np.arange(int(0.9 * SR)) / SR
        w = (np.sin(2 * np.pi * hz(m) * tt) + 0.3 * np.sin(2 * np.pi * 2 * hz(m) * tt)) * np.exp(-tt * 6) * 0.075
        pan = 0.25 + 0.5 * ((i * 5) % 8) / 7
        add(L, ts, w * (1 - pan)); add(R, ts, w * pan)
        add(L, ts + step * 1.5, w * 0.3 * pan); add(R, ts + step * 1.5, w * 0.3 * (1 - pan))  # こだま
    i += 1
# キックとハット。23秒あたりから入り、63秒あたりで抜ける
b = 0
while b * beat < DUR:
    ts = b * beat
    if 23.4 <= ts < 63.4:
        tt = np.arange(int(0.35 * SR)) / SR
        kick = np.sin(2 * np.pi * (45 * tt + 60 * (1 - np.exp(-tt * 30)) / 30)) * np.exp(-tt * 11) * 0.3
        add(L, ts, kick * 0.5); add(R, ts, kick * 0.5)
        th = np.arange(int(0.06 * SR)) / SR
        hat = rng.standard_normal(len(th)) * np.exp(-th * 90) * 0.03
        hat = np.diff(hat, prepend=0)
        add(L, ts + beat / 2, hat * 0.4); add(R, ts + beat / 2, hat * 0.6)
    b += 1
# パネルが切り替わる瞬間の小さな効果音
for ts in (7.9, 23.5, 36.2, 55.0, 63.6):
    tt = np.arange(int(0.7 * SR)) / SR
    sw = rng.standard_normal(len(tt)); sw = np.convolve(sw, np.ones(24) / 24, mode='same')
    sw *= np.sin(np.pi * np.minimum(1, tt / 0.7)) ** 2 * 0.12
    add(L, ts - 0.45, sw * 0.6); add(R, ts - 0.45, sw * 0.4)
    ping = np.sin(2 * np.pi * 1318.5 * tt) * np.exp(-tt * 9) * 0.05
    add(L, ts + 0.1, ping * 0.4); add(R, ts + 0.1, ping * 0.6)
fade = np.minimum(1, t / 1.0) * np.minimum(1, (DUR - t) / 3.0)
x = np.stack([L, R], 1) * fade[:, None]
x = np.tanh(x * 1.4) / 1.4
x /= np.abs(x).max() / 0.8
sf.write('bgm.wav', x, SR)
print('bgm', round(len(x) / SR, 2))
