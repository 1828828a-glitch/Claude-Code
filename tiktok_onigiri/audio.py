# 音はすべてここで合成する(BGM・効果音)。外部素材は使わない
# 使い方: python3 audio.py out/a_cues.json out/a_audio.wav
import json
import sys
import wave

import numpy as np

SR = 48000
RNG = np.random.default_rng(7)


def T(d):
    return np.arange(int(d * SR)) / SR


def note_hz(n):
    # 'C4' 形式 → 周波数
    names = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
    k = names[n[0]]
    i = 1
    if n[i] == '#':
        k += 1; i += 1
    elif n[i] == 'b':
        k -= 1; i += 1
    octv = int(n[i:])
    midi = 12 * (octv + 1) + k
    return 440.0 * 2 ** ((midi - 69) / 12)


# ---- フィルター(FFTで周波数特性を掛ける) ----
def band(x, lo=None, hi=None, order=2.0):
    n = len(x)
    if n == 0:
        return x
    N = 1 << int(np.ceil(np.log2(n)))
    X = np.fft.rfft(x, N)
    f = np.fft.rfftfreq(N, 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    return np.fft.irfft(X * g, N)[:n]


def sweep(x, lo0, lo1, hi0, hi1, block=2048):
    # 帯域を時間とともに動かす(風切り音など)
    hop = block // 2
    win = np.hanning(block)
    out = np.zeros(len(x) + block)
    nb = max(1, (len(x) - block) // hop + 1)
    f = np.fft.rfftfreq(block, 1 / SR)
    for b in range(nb):
        s = b * hop
        seg_ = x[s:s + block]
        if len(seg_) < block:
            seg_ = np.pad(seg_, (0, block - len(seg_)))
        k = b / max(1, nb - 1)
        lo = lo0 + (lo1 - lo0) * k
        hi = hi0 + (hi1 - hi0) * k
        g = 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4) / np.sqrt(1 + (f / hi) ** 4)
        out[s:s + block] += np.fft.irfft(np.fft.rfft(seg_ * win) * g, block)
    return out[:len(x)]


def env(n, a=0.005, r=0.05, total=None):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na > 0:
        e[:na] = np.linspace(0, 1, na)
    if nr > 0 and nr < n:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def noise(d):
    return RNG.standard_normal(int(d * SR))


def brown(d):
    w = RNG.standard_normal(int(d * SR))
    b = np.cumsum(w)
    b -= np.convolve(b, np.ones(4800) / 4800, mode='same')
    return b / (np.abs(b).max() + 1e-9)


# ---- 楽器 ----
def piano(f, d, vel=0.6, bright=1.0):
    t = T(d + 1.2)
    y = np.zeros_like(t)
    dec = 1.6 + 2.5 * (f / 1000)
    for k in range(1, 9):
        fk = f * k * (1 + 0.0004 * k * k)
        a = vel * (0.9 / k ** (1.35 / bright))
        y += a * np.sin(2 * np.pi * fk * t + k) * np.exp(-t * dec * (0.6 + 0.45 * k))
        y += a * 0.4 * np.sin(2 * np.pi * fk * 1.0013 * t) * np.exp(-t * dec * (0.6 + 0.45 * k))
    y *= env(len(t), 0.004, 0.25)
    # 鍵盤を離したあとの減衰
    rel = np.ones_like(t)
    nr = int(d * SR)
    rel[nr:] = np.exp(-(t[nr:] - d) * 9)
    return y * rel * 0.5


def musicbox(f, d=1.6, vel=0.5):
    t = T(d)
    y = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 6)
         + 0.1 * np.sin(2 * np.pi * f * 5.43 * t) * np.exp(-t * 10))
    y *= np.exp(-t * 2.6) * env(len(t), 0.002, 0.1)
    return y * vel * 0.5


def epiano(f, d, vel=0.4):
    # ローファイ用のエレピ(トレモロ付き)
    t = T(d + 0.6)
    y = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3) + 0.15 * np.sin(2 * np.pi * 3 * f * t + 1) * np.exp(-t * 5)
    y *= np.exp(-t * 1.2) * (1 + 0.12 * np.sin(2 * np.pi * 4.5 * t))
    y *= env(len(t), 0.01, 0.4)
    return y * vel * 0.35


def pad(freqs, d, vel=0.15):
    t = T(d)
    y = np.zeros_like(t)
    for f in freqs:
        for det in (-0.004, 0, 0.005):
            ph = RNG.random() * 6
            y += np.sin(2 * np.pi * f * (1 + det) * t + ph) + 0.3 * np.sin(2 * np.pi * 2 * f * (1 + det) * t + ph)
    y = band(y, None, 1800)
    e = np.minimum(1, t / 1.2) * np.minimum(1, (d - t) / 1.0)
    return y * e * vel / max(1, len(freqs))


def kick():
    t = T(0.35)
    f = 45 + 80 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 0.9


def snare(soft=False):
    t = T(0.25)
    n = band(noise(0.25), 1200, 7000) * np.exp(-t * (22 if soft else 16))
    b = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.4
    return (n * 0.5 + b) * (0.5 if soft else 0.8)


def hat(open_=False):
    t = T(0.12)
    return band(noise(0.12), 7000, None) * np.exp(-t * (25 if open_ else 70)) * 0.25


# ---- 和音と旋律 ----
CHORDS = {
    'F': ['F2', 'A3', 'C4', 'E4'], 'G': ['G2', 'B3', 'D4', 'G4'], 'Em': ['E2', 'G3', 'B3', 'D4'],
    'Am': ['A2', 'C4', 'E4', 'G4'], 'Dm': ['D2', 'F3', 'A3', 'C4'], 'C': ['C2', 'E3', 'G3', 'C4'],
}
MELODY = {  # (音, 拍数)
    'F': [('E5', 2), ('D5', 1), ('C5', 1)], 'G': [('D5', 3), ('G4', 1)], 'Em': [('B4', 2), ('C5', 1), ('D5', 1)],
    'Am': [('E5', 2), ('C5', 2)], 'Dm': [('D5', 2), ('C5', 1), ('A4', 1)], 'G2': [('B4', 2), ('C5', 1), ('D5', 1)],
    'C': [('C5', 4)],
}


class Mix:
    def __init__(self, dur):
        self.n = int(dur * SR) + SR * 3
        self.dry = np.zeros((2, self.n))
        self.wet = np.zeros((2, self.n))  # リバーブに送る
        self.music = np.zeros((2, self.n))
        self.music_wet = np.zeros((2, self.n))

    def add(self, t, y, vol=1.0, pan=0.0, rev=0.15, bus='sfx'):
        s = int(t * SR)
        if s >= self.n or len(y) == 0:
            return
        y = y[: self.n - s]
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        d, w = (self.dry, self.wet) if bus == 'sfx' else (self.music, self.music_wet)
        d[0, s:s + len(y)] += y * vol * l
        d[1, s:s + len(y)] += y * vol * r
        if rev:
            w[0, s:s + len(y)] += y * vol * rev * l
            w[1, s:s + len(y)] += y * vol * rev * r


def reverb(x, length=2.4, decay=3.2):
    t = T(length)
    out = np.zeros_like(x)
    for ch in range(2):
        ir = RNG.standard_normal(len(t)) * np.exp(-t * decay)
        ir = band(ir, 200, 6000)
        ir[: int(0.012 * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2))
        N = 1 << int(np.ceil(np.log2(len(x[ch]) + len(ir))))
        out[ch] = np.fft.irfft(np.fft.rfft(x[ch], N) * np.fft.rfft(ir, N), N)[: len(x[ch])]
    return out


# ---- 音楽セクション ----
def prog_backward(n_bars):
    # 解決(C)の直前までの小節を後ろから並べる
    tail = ['F', 'G', 'Em', 'Am', 'Dm', 'G2']
    if n_bars <= len(tail):
        return tail[len(tail) - n_bars:]
    k = n_bars - len(tail)
    pre = (['F', 'G', 'Em', 'Am'] * (k // 4 + 1))[-k:]
    return pre + tail


def sec_piano(mx, c):
    t0, dur, bar = c['t'], c['dur'], c.get('bar', 2.8)
    resolve = c.get('resolveAt', t0 + dur)
    beat = bar / 4
    n_pre = int(np.floor((resolve - t0) / bar))
    start = resolve - n_pre * bar
    seq = prog_backward(n_pre)
    vol = c.get('vol', 1.0)
    for i, ch in enumerate(seq + ['C']):
        bt = start + i * bar
        name = 'G' if ch == 'G2' else ch
        notes = CHORDS[name]
        last = ch == 'C'
        intensity = min(1.0, 0.45 + 0.55 * (i / max(1, len(seq))))
        # 左手
        mx.add(bt, piano(note_hz(notes[0]), bar * (2 if last else 0.95), 0.5 * intensity), vol, -0.2, 0.3, 'music')
        if not last:
            mx.add(bt + 2 * beat, piano(note_hz(notes[0]) * 1.5, bar * 0.45, 0.25 * intensity), vol, -0.2, 0.3, 'music')
        # 右手のアルペジオ
        arp = notes[1:] + [notes[2]]
        steps = 4 if last else 8
        for k in range(steps):
            f = note_hz(arp[k % len(arp)])
            if bt + k * beat / 2 < t0:
                continue
            mx.add(bt + k * beat / 2, piano(f, beat * 1.4, 0.22 * intensity * (0.8 + 0.2 * (k % 2 == 0))), vol, 0.15, 0.35, 'music')
        # 旋律は最後の4小節+解決で入れる
        if i >= len(seq) - 4 or last:
            mt = bt
            for (nn, b) in MELODY[ch]:
                if mt >= t0:
                    mx.add(mt, piano(note_hz(nn), b * beat * 0.95, 0.42 * intensity, 1.2), vol, 0.05, 0.4, 'music')
                mt += b * beat
        if last:
            # 終わりは和音を長くのばす
            for nn in ['C3', 'G3', 'E4', 'C5']:
                mx.add(bt + bar * 0.5, piano(note_hz(nn), 3.0, 0.2), vol, 0, 0.5, 'music')
            mx.add(bt, pad([note_hz(n) for n in ['C3', 'G3', 'E4']], bar * 1.6, 0.12), vol, 0, 0.4, 'music')
        elif i >= len(seq) - 4:
            mx.add(bt, pad([note_hz(n) for n in notes[1:]], bar, 0.07 * intensity), vol, 0, 0.4, 'music')


def sec_musicbox(mx, c):
    t0, dur = c['t'], c['dur']
    bar = c.get('bar', 3.0)
    beat = bar / 4
    seq = ['F', 'G', 'Em', 'Am', 'F', 'G', 'Em', 'Am']
    y_end = t0 + dur
    for i, ch in enumerate(seq):
        bt = t0 + i * bar
        if bt >= y_end:
            break
        fade = min(1.0, max(0.0, (y_end - bt) / 2.0))
        notes = CHORDS[ch]
        for k, nn in enumerate(notes[1:] + [notes[2]]):
            mx.add(bt + k * beat, musicbox(note_hz(nn) * 2, 1.4, 0.18 * fade), 0.9, -0.3, 0.45, 'music')
        mt = bt
        for (nn, b) in MELODY[ch]:
            if mt < y_end - 0.3:
                mx.add(mt, musicbox(note_hz(nn) * 2, 1.8, 0.33 * fade), 0.9, 0.25, 0.5, 'music')
            mt += b * beat
        mx.add(bt, pad([note_hz(n) for n in notes[1:]], min(bar, y_end - bt), 0.05 * fade), 1, 0, 0.3, 'music')


def sec_beat(mx, c):
    t0, dur, bpm = c['t'], c['dur'], c.get('bpm', 120)
    v = c.get('vol', 1.0)
    b = 60 / bpm
    n = int(round(dur / b))
    for i in range(n):
        t = t0 + i * b
        mx.add(t, kick(), 0.8 * v, 0, 0.05, 'music')
        if i % 2 == 1:
            mx.add(t, snare(), 0.55 * v, 0, 0.12, 'music')
        mx.add(t + b / 2, hat(), 0.5 * v, 0.3, 0, 'music')
        # ベース
        f = note_hz(['C2', 'C2', 'Eb2', 'F2'][i % 4])
        tt = T(b * 0.9)
        bass = np.sign(np.sin(2 * np.pi * f * tt)) * 0.3 + np.sin(2 * np.pi * f * tt)
        mx.add(t, band(bass, None, 600) * np.exp(-tt * 4) * 0.35, 0.8 * v, 0, 0, 'music')


def sec_lofi(mx, c):
    # ローファイ・ヒップホップ。swing付き
    t0, dur, bpm = c['t'], c['dur'], c.get('bpm', 82)
    b = 60 / bpm
    bar = 4 * b
    vol = c.get('vol', 1.0)
    chords = [['F3', 'A3', 'C4', 'E4'], ['E3', 'G3', 'B3', 'D4'], ['D3', 'F3', 'A3', 'C4'], ['C3', 'E3', 'G3', 'B3']]
    n_bars = int(np.ceil(dur / bar))
    end = t0 + dur
    for i in range(n_bars):
        bt = t0 + i * bar
        ch = chords[i % 4]
        for nn in ch:
            mx.add(bt, epiano(note_hz(nn), bar * 0.95, 0.5), vol, 0.1, 0.3, 'music')
        mx.add(bt, piano(note_hz(ch[0]) / 2, bar * 0.9, 0.35), vol * 0.8, -0.1, 0.1, 'music')
        if c.get('drums', True):
            for k in range(8):
                t = bt + k * b / 2 + (b * 0.08 if k % 2 else 0)
                if t >= end - 0.05:
                    continue
                if k in (0, 5):
                    mx.add(t, kick() * 0.8, vol * 0.75, 0, 0.02, 'music')
                if k in (2, 6):
                    mx.add(t, snare(True), vol * 0.5, 0, 0.15, 'music')
                mx.add(t, hat(), vol * 0.35, 0.25, 0, 'music')
    # レコードのノイズ
    cr = np.zeros(int(dur * SR))
    idx = RNG.integers(0, len(cr), int(dur * 30))
    cr[idx] = RNG.standard_normal(len(idx)) * 0.4
    cr = band(cr, 1500, 9000) + band(noise(dur), 2000, 6000) * 0.01
    mx.add(t0, cr, vol * 0.5, 0, 0, 'music')


# ---- 効果音 ----
def sfx(kind, c):
    d = c.get('dur', 1.0)
    if kind == 'room':
        return band(brown(d), 60, 400) * 0.03 * env(int(d * SR), 0.3, 0.3)
    if kind == 'clock':
        y = np.zeros(int(d * SR))
        for i in range(int(d)):
            s = int((i + 0.3) * SR)
            tt = T(0.02)
            click = band(noise(0.02), 2000 if i % 2 else 2600, 6000) * np.exp(-tt * 300)
            y[s:s + len(click)] += click[: len(y) - s] * 0.18
        return y
    if kind == 'izakaya':
        n = int(d * SR)
        y = np.zeros(n)
        tt = T(d)
        for k in range(14):
            f0 = RNG.uniform(250, 1400)
            v = band(noise(d), f0 * 0.7, f0 * 1.6)
            rate = RNG.uniform(3, 6)
            am = np.clip(np.sin(2 * np.pi * rate * tt + RNG.random() * 6) + RNG.uniform(-0.5, 0.3), 0, None)
            am *= np.clip(np.sin(2 * np.pi * RNG.uniform(0.1, 0.35) * tt + RNG.random() * 6) + 0.4, 0, None)
            y += v * am
        y = y / (np.abs(y).max() + 1e-9) * 0.35
        y += band(brown(d), 80, 500) * 0.08
        # グラスの音
        for _ in range(int(d * 1.5) + 1):
            s = int(RNG.uniform(0, max(0.01, d - 0.4)) * SR)
            g = T(0.5)
            ting = sum(np.sin(2 * np.pi * f * g) * np.exp(-g * dd) for f, dd in [(2400, 9), (3900, 12), (6100, 16)]) * 0.06
            y[s:s + len(ting)] += ting[: n - s]
        if c.get('muffle'):
            y = band(y, None, 900)
        if c.get('hardStop'):
            return y * env(n, 0.15, 0.004)
        return y * env(n, 0.2, 0.4)
    if kind == 'crunch':
        y = np.zeros(int(0.22 * SR))
        for k in range(9):
            s = int(RNG.uniform(0, 0.16) * SR)
            tt = T(0.025)
            b = band(noise(0.025), 1800, 9000) * np.exp(-tt * 160) * RNG.uniform(0.4, 1)
            y[s:s + len(b)] += b[: len(y) - s]
        return y * 0.9
    if kind == 'sting':
        # 低い和音をひとつだけ鳴らす
        return sum(piano(note_hz(n), 3.5, v) for n, v in [('A2', 0.35), ('E3', 0.22), ('C4', 0.2), ('E4', 0.15)])
    if kind == 'ting':
        return piano(note_hz('A5'), 2.0, 0.35) + piano(note_hz('E5'), 2.0, 0.2)
    if kind == 'boil':
        n = int(d * SR)
        y = band(noise(d), 3000, 9000) * 0.06
        for k in range(60):
            s = int(RNG.uniform(0, d - 0.05) * SR)
            tt = T(0.04)
            f = RNG.uniform(250, 700)
            b = np.sin(2 * np.pi * (f + 1500 * tt) * tt) * np.exp(-tt * 70) * 0.25
            y[s:s + len(b)] += b[: n - s]
        return y * env(n, 0.05, 0.1)
    if kind == 'alarm':
        n = int(d * SR)
        tt = T(d)
        y = np.sign(np.sin(2 * np.pi * 2093 * tt)) * 0.12
        gate = ((tt % 0.15) < 0.08).astype(float)
        return band(y * gate, None, 5000) * env(n, 0.002, 0.01)
    if kind == 'slap':
        tt = T(0.3)
        return np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 18) * 0.7 + band(noise(0.3), 800, 5000) * np.exp(-tt * 60) * 0.4
    if kind == 'chime':
        y = np.zeros(int(0.9 * SR))
        for i, nn in enumerate(['E6', 'C6', 'E6', 'C6']):
            m = musicbox(note_hz(nn), 0.5, 0.6)
            s = int(i * 0.13 * SR)
            y[s:s + len(m)] += m[: len(y) - s]
        return y
    if kind == 'doorclose':
        tt = T(0.5)
        hiss = sweep(noise(0.5), 600, 300, 4000, 1500) * np.exp(-tt * 5) * 0.25
        thud = np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 14) * 0.8
        thud = np.concatenate([np.zeros(int(0.12 * SR)), thud])[: len(tt)]
        return hiss + thud
    if kind == 'rewind':
        y = sweep(noise(0.4), 300, 3000, 1500, 9000) * np.linspace(0, 1, int(0.4 * SR)) ** 2 * 0.35
        return y
    if kind == 'whoosh':
        n = int(0.45 * SR)
        return sweep(noise(0.45), 1500, 300, 6000, 1500) * np.sin(np.linspace(0, np.pi, n)) * 0.35
    if kind == 'thud':
        tt = T(0.4)
        return np.sin(2 * np.pi * 75 * tt) * np.exp(-tt * 16) * 0.8 + band(noise(0.4), 200, 1500) * np.exp(-tt * 30) * 0.3
    if kind == 'place':
        tt = T(0.25)
        return np.sin(2 * np.pi * 140 * tt) * np.exp(-tt * 30) * 0.35 + band(noise(0.25), 400, 3000) * np.exp(-tt * 50) * 0.15
    if kind == 'pop':
        tt = T(0.09)
        p = c.get('pitch', 1.0)
        return np.sin(2 * np.pi * np.cumsum(700 * p + 900 * p * tt / 0.09) / SR) * np.exp(-tt * 40) * 0.3
    if kind == 'chatter':
        y = sfx('izakaya', {'dur': d})
        return band(y, 300, 3000) * 0.6
    if kind == 'buzz':
        tt = T(0.9)
        b = np.sin(2 * np.pi * 165 * tt) + 0.5 * np.sign(np.sin(2 * np.pi * 165 * tt))
        gate = ((tt < 0.35) | ((tt > 0.5) & (tt < 0.85))).astype(float)
        return band(b * gate, 60, 1200) * 0.18
    if kind == 'notif':
        y = np.zeros(int(1.0 * SR))
        for i, nn in enumerate(['E6', 'B6']):
            m = musicbox(note_hz(nn), 0.8, 0.5)
            s = int(i * 0.12 * SR)
            y[s:s + len(m)] += m[: len(y) - s]
        return y
    if kind == 'birds':
        n = int(d * SR)
        y = np.zeros(n)
        for k in range(int(d * 2.5)):
            s = int(RNG.uniform(0, d - 0.3) * SR)
            for j in range(RNG.integers(2, 5)):
                tt = T(0.07)
                f0 = RNG.uniform(3200, 4800)
                ch = np.sin(2 * np.pi * np.cumsum(f0 + 1500 * np.sin(np.pi * tt / 0.07)) / SR) * np.sin(np.pi * tt / 0.07)
                ss = s + int(j * 0.09 * SR)
                y[ss:ss + len(ch)] += ch[: max(0, n - ss)] * 0.05
        return y * env(n, 0.3, 0.5)
    if kind == 'drop':
        tt = T(0.2)
        return np.sin(2 * np.pi * 220 * tt) * np.exp(-tt * 30) * 0.3 + band(noise(0.2), 300, 2000) * np.exp(-tt * 40) * 0.12
    if kind == 'squeeze':
        tt = T(0.28)
        return band(noise(0.28), 200, 1200) * np.sin(np.pi * tt / 0.28) ** 2 * 0.22
    if kind == 'typing':
        n = int(d * SR)
        y = np.zeros(n)
        rate = 0.11
        k = 0
        while k * rate < d - 0.02:
            s = int(k * rate * SR + RNG.uniform(0, 0.02) * SR)
            tt = T(0.03)
            click = (band(noise(0.03), 2000, 8000) * 0.5 + np.sin(2 * np.pi * (900 if c.get('del') else 1300) * tt)) * np.exp(-tt * 220) * 0.12
            y[s:s + len(click)] += click[: max(0, n - s)]
            k += 1
        return y
    if kind == 'send':
        tt = T(0.3)
        w = sweep(noise(0.3), 600, 2500, 2500, 8000) * np.sin(np.pi * tt / 0.3) * 0.15
        p = sfx('pop', {'pitch': 1.4})
        w[: len(p)] += p * 0.8
        return w
    if kind == 'sparkle':
        y = np.zeros(int(2.5 * SR))
        for i, nn in enumerate(['C6', 'E6', 'G6', 'C7']):
            m = musicbox(note_hz(nn), 1.6, 0.35)
            s = int(i * 0.08 * SR)
            y[s:s + len(m)] += m[: len(y) - s]
        return y
    if kind == 'shutter':
        tt = T(0.12)
        a = band(noise(0.12), 1500, 9000) * np.exp(-tt * 120)
        b = np.concatenate([np.zeros(int(0.05 * SR)), band(noise(0.07), 1000, 6000) * np.exp(-T(0.07) * 100)])
        return (a + b[: len(a)]) * 0.5
    if kind == 'steam':
        n = int(d * SR)
        return band(noise(d), 2500, 8000) * env(n, 0.05, d * 0.7) * 0.08
    if kind == 'fridge':
        tt = T(0.6)
        return band(noise(0.6), 100, 800) * np.exp(-tt * 12) * 0.3 + np.sin(2 * np.pi * 60 * tt) * 0.02
    if kind == 'door':
        tt = T(0.6)
        thud = np.sin(2 * np.pi * 85 * tt) * np.exp(-tt * 15) * 0.7
        latch = band(noise(0.6), 2000, 7000) * np.exp(-tt * 80) * 0.3
        return thud + latch
    if kind == 'dooropen':
        tt = T(0.7)
        latch = band(noise(0.7), 2000, 7000) * np.exp(-tt * 80) * 0.3
        air = band(noise(0.7), 300, 2500) * np.sin(np.pi * tt / 0.7) * 0.08
        return latch + air
    if kind == 'heart':
        n = int(d * SR)
        y = np.zeros(n)
        bpm = c.get('bpm', 70)
        k = 0
        while k * 60 / bpm < d:
            for off, a in [(0, 1), (0.16, 0.6)]:
                # スマホのスピーカーでも聞こえるよう、低音に中域の打撃音を足す
                tt = T(0.2)
                b = np.sin(2 * np.pi * 72 * tt) * np.exp(-tt * 25) * a * 0.4
                b += band(noise(0.2), 120, 500) * np.exp(-tt * 45) * a * 0.5
                s = int((k * 60 / bpm + off) * SR)
                y[s:s + len(b)] += b[: max(0, n - s)]
            k += 1
        return y
    if kind == 'train':
        n = int(d * SR)
        tt = T(d)
        y = band(brown(d), 50, 400) * 0.25 + band(noise(d), 500, 2000) * 0.03
        return y * env(n, 0.3, 0.6)
    if kind == 'tea':
        tt = T(0.25)
        return np.sin(2 * np.pi * 1900 * tt) * np.exp(-tt * 25) * 0.08 + np.sin(2 * np.pi * 2900 * tt) * np.exp(-tt * 30) * 0.05
    raise ValueError(kind)


def main(cue_path, out_path):
    meta = json.load(open(cue_path))
    dur = meta['duration']
    mx = Mix(dur)
    for c in meta['audio']:
        k = c['type']
        if k == 'piano':
            sec_piano(mx, c)
        elif k == 'musicbox':
            sec_musicbox(mx, c)
        elif k == 'beat':
            sec_beat(mx, c)
        elif k == 'lofi':
            sec_lofi(mx, c)
        else:
            y = sfx(k, c)
            mx.add(c['t'], y, c.get('vol', 1.0), c.get('pan', 0.0), c.get('rev', 0.12))
    music = mx.music + reverb(mx.music_wet, 2.8, 2.4) * 0.9
    sfxb = mx.dry + reverb(mx.wet, 1.6, 4.0) * 0.6
    # 区間ごとに音楽の音量を下げる(ダッキング)
    duck = np.ones(mx.n)
    for c in meta.get('duck', []):
        s, e = int(c['t0'] * SR), int(c['t1'] * SR)
        duck[s:e] = c.get('to', 0.4)
    duck = np.convolve(duck, np.ones(4800) / 4800, mode='same')
    mixd = music * 0.55 * duck + sfxb
    n = int(dur * SR)
    mixd = mixd[:, :n]
    fo = int(0.4 * SR)
    mixd[:, -fo:] *= np.linspace(1, 0, fo)
    peak = np.abs(mixd).max() + 1e-9
    mixd = mixd / peak * 0.95
    rms = np.sqrt(np.mean(mixd ** 2))
    target = 0.12
    if rms < target:
        mixd = np.tanh(mixd * (target / rms) * 1.1) / np.tanh(1.1)
        mixd *= 0.93 / (np.abs(mixd).max() + 1e-9)
    pcm = (np.clip(mixd, -1, 1) * 32767).astype(np.int16).T.copy()
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('wrote', out_path, f'peak={np.abs(mixd).max():.3f} rms={np.sqrt(np.mean(mixd ** 2)):.3f}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
