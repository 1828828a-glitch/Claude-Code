"""キッズサポーター募集CMのBGMと効果音を合成して build/<name>/audio.wav に書き出す。

使い方: python3 make_audio.py cm30   … 30秒・16:9版（12小節）
        python3 make_audio.py reel   … 60秒・リール版（24小節）

BGMはこのCMのために書いたオリジナル曲（96BPM・Fメジャー、1小節=2.5秒）。
効果音は render.cjs が書き出す build/<name>/cues.json のタイミングに合わせて置く。
外部の音源素材は使っていないので、権利処理は不要。
"""
import json
import os
import sys
import wave

import numpy as np

SR = 44100
BEAT = 60 / 96
BAR = BEAT * 4
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(7)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(n):
    return np.arange(n) / SR


def fade_in(sig, sec):
    a = max(1, int(sec * SR))
    a = min(a, len(sig))
    sig[:a] *= np.linspace(0, 1, a)
    return sig


def bandpass(sig, lo, hi):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    spec *= ((f >= lo) & (f <= hi)).astype(float)
    return np.fft.irfft(spec, len(sig))


class Bus:
    def __init__(self, n):
        self.n = n
        self.buf = np.zeros((2, n))

    def add(self, t, sig, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= self.n or i + len(sig) <= 0:
            return
        if i < 0:
            sig, i = sig[-i:], 0
        j = min(self.n, i + len(sig))
        seg = sig[: j - i] * gain
        self.buf[0, i:j] += seg * np.cos((pan + 1) * np.pi / 4)
        self.buf[1, i:j] += seg * np.sin((pan + 1) * np.pi / 4)


# ---------------- 楽器 ----------------
def musicbox(f, dur=1.8):
    n = int(dur * SR)
    t = tt(n)
    s = np.zeros(n)
    for k, a, tau in [(1, 1.0, 1.0), (2, .30, .45), (3, .10, .25), (4.16, .07, .16), (5.43, .035, .09)]:
        if f * k < 15000:
            s += a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / tau)
    return fade_in(s, .002)


def pluck(f, dur=1.6, decay=.9965, soft=3):
    """Karplus-Strong（1周期ずつベクトル化）でウクレレ風の撥弦音を作る。"""
    n = int(dur * SR)
    P = max(2, int(round(SR / f)))
    y = np.zeros(n + P + 1)
    x = rng.uniform(-1, 1, P)
    for _ in range(soft):
        x = .5 * (x + np.roll(x, 1))
    y[:P] = x
    k = P
    while k < len(y):
        m = min(P, len(y) - k)
        a = y[k - P:k - P + m]
        b = np.concatenate(([0.0], y[0:m - 1])) if k - P - 1 < 0 else y[k - P - 1:k - P - 1 + m]
        y[k:k + m] = decay * .5 * (a + b)
        k += m
    out = y[:n]
    out *= np.minimum(1, np.linspace(6, 0, n))
    return out / (np.abs(out).max() + 1e-9)


def bass(f, dur=.7):
    n = int(dur * SR)
    t = tt(n)
    s = (np.sin(2 * np.pi * f * t) + .25 * np.sin(4 * np.pi * f * t)) * np.exp(-t / .35)
    return fade_in(s, .008)


def kick():
    n = int(.32 * SR)
    t = tt(n)
    f = 52 + 90 * np.exp(-t / .035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return fade_in(np.sin(ph) * np.exp(-t / .12), .002)


def clap():
    n = int(.22 * SR)
    t = tt(n)
    nz = bandpass(rng.uniform(-1, 1, n), 900, 3200)
    env = np.exp(-t / .06)
    for d in (.0, .011, .022):
        env += .6 * np.exp(-np.maximum(t - d, 0) / .006) * (t >= d)
    return nz * env / 2


def shaker(acc=1.0):
    n = int(.07 * SR)
    t = tt(n)
    nz = bandpass(rng.uniform(-1, 1, n), 5500, 14000)
    env = np.minimum(1, t / .012) * np.exp(-t / .025)
    return nz * env * acc


def pad(notes, dur, att=.7, rel=1.0):
    n = int(dur * SR)
    t = tt(n)
    s = np.zeros(n)
    for m in notes:
        for det in (-.004, .004):
            f = mtof(m) * (1 + det)
            s += np.sin(2 * np.pi * f * t) + .18 * np.sin(4 * np.pi * f * t)
    env = np.minimum(1, t / att) * np.minimum(1, (dur - t) / rel)
    return s * np.clip(env, 0, 1) / len(notes)


def bell(f, tau=.9, dur=1.6):
    n = int(dur * SR)
    t = tt(n)
    s = np.zeros(n)
    for k, a, d in [(1, 1, 1), (2.0, .35, .5), (2.76, .25, .35), (5.4, .1, .15)]:
        s += a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / (tau * d))
    return fade_in(s, .002)


# ---------------- 効果音 ----------------
def sfx_pop(p):
    n = int(.12 * SR)
    t = tt(n)
    f = (380 + 620 * np.minimum(1, t / .07)) * p
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .045)
    return fade_in(s, .002)


def sfx_boing(p):
    n = int(.32 * SR)
    t = tt(n)
    f = (170 + 260 * np.minimum(1, t / .16)) * p * (1 + .06 * np.sin(2 * np.pi * 28 * t))
    return fade_in(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .12), .003)


def sfx_tap(p):
    n = int(.12 * SR)
    t = tt(n)
    f = 720 * p
    s = (np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * f * 2.71 * t)) * np.exp(-t / .028)
    return fade_in(s, .001)


def sfx_whoosh(p):
    dur = .5
    n = int(dur * SR)
    t = tt(n)
    nz = rng.uniform(-1, 1, n)
    cut = (300 + 4200 * np.sin(np.pi * np.minimum(1, t / dur)) ** 2) * p
    a = 1 - np.exp(-2 * np.pi * cut / SR)
    y = np.zeros(n)
    acc = 0.0
    for i in range(n):  # 時間変化するローパス
        acc += a[i] * (nz[i] - acc)
        y[i] = acc
    env = np.sin(np.pi * np.minimum(1, t / dur)) ** 1.5
    return y * env * 2.2


def sfx_sparkle(p):
    out = np.zeros(int(1.2 * SR))
    for i, m in enumerate([84, 88, 91, 96, 100]):
        b = bell(mtof(m) * p, tau=.35, dur=.9) * (.9 - i * .1)
        k = int(i * .045 * SR)
        out[k:k + len(b)] += b[: len(out) - k]
    return out / 3


def sfx_scribble(p):
    dur = .55
    n = int(dur * SR)
    t = tt(n)
    nz = bandpass(rng.uniform(-1, 1, n), 1800 * p, 5200 * p)
    wob = .55 + .45 * np.sin(2 * np.pi * 17 * t) ** 2
    env = np.minimum(1, t / .05) * np.minimum(1, (dur - t) / .12)
    return nz * wob * env * 1.6


def sfx_spray(p):
    n = int(.22 * SR)
    t = tt(n)
    nz = bandpass(rng.uniform(-1, 1, n), 3500 * p, 15000)
    return nz * np.minimum(1, t / .01) * np.exp(-t / .07) * 1.6


def sfx_snip(p):
    n = int(.08 * SR)
    t = tt(n)
    nz = bandpass(rng.uniform(-1, 1, n), 2500, 9000) * np.exp(-t / .008)
    ring = np.sin(2 * np.pi * 3100 * p * t) * np.exp(-t / .02) * .5
    return nz + ring


def sfx_type(p):
    n = int(.04 * SR)
    t = tt(n)
    nz = bandpass(rng.uniform(-1, 1, n), 2000, 8000) * np.exp(-t / .004)
    return nz + .4 * np.sin(2 * np.pi * 1700 * p * t) * np.exp(-t / .006)


def sfx_click(p):
    n = int(.05 * SR)
    t = tt(n)
    return bandpass(rng.uniform(-1, 1, n), 1500, 7000) * np.exp(-t / .005) * 1.4


def sfx_ding(p):
    # 「ピンポン」：高い音→低い音
    a = bell(mtof(88) * p, tau=1.0, dur=1.4)
    b = bell(mtof(84) * p, tau=1.2, dur=1.6)
    out = np.zeros(int(2.0 * SR))
    out[:len(a)] += a
    k = int(.2 * SR)
    out[k:k + len(b)] += b
    return out / 1.6


SFX = dict(pop=(sfx_pop, .30), boing=(sfx_boing, .30), tap=(sfx_tap, .22), whoosh=(sfx_whoosh, .16),
           sparkle=(sfx_sparkle, .30), scribble=(sfx_scribble, .07), spray=(sfx_spray, .10),
           snip=(sfx_snip, .16), type=(sfx_type, .16), click=(sfx_click, .25), ding=(sfx_ding, .38))


# ---------------- 曲 ----------------
F, C, DM, BB, C7 = 'F', 'C', 'Dm', 'Bb', 'C7'
VOICE = {F: [65, 69, 72, 77], C: [64, 67, 72, 76], DM: [62, 65, 69, 74], BB: [62, 65, 70, 74], C7: [64, 67, 70, 72]}
ROOT = {F: 41, C: 48, DM: 50, BB: 46, C7: 48}
# (拍, MIDI, 長さ[拍])
MELODY = [
    [(0, 72, 1), (1, 69, .5), (1.5, 72, .5), (2, 77, 2)],
    [(0, 76, 1), (1, 74, .5), (1.5, 72, .5), (2, 67, 2)],
    [(0, 74, 1), (1, 77, .5), (1.5, 81, .5), (2, 79, 1), (3, 77, 1)],
    [(0, 74, 1.5), (1.5, 72, .5), (2, 70, 1), (3, 72, 1)],
    [(0, 69, .5), (.5, 72, .5), (1, 77, 1), (2, 81, 1), (3, 79, .5), (3.5, 77, .5)],
    [(0, 76, 1), (1, 79, 1), (2, 76, .5), (2.5, 74, .5), (3, 72, 1)],
    [(0, 74, 1), (1, 77, 1), (2, 82, 1), (3, 81, .5), (3.5, 79, .5)],
    [(0, 79, 1.5), (1.5, 76, .5), (2, 72, 1), (3, 76, .5), (3.5, 79, .5)],
    [(0, 81, 1.5), (1.5, 79, .5), (2, 77, 1), (3, 74, 1)],
    [(0, 77, 1.5), (1.5, 74, .5), (2, 70, 1), (3, 74, .5), (3.5, 77, .5)],
    [(0, 76, 1), (1, 79, 1), (2, 84, 1), (3, 82, .5), (3.5, 79, .5)],
    [(0, 81, 1.5), (1.5, 79, .5), (2, 77, 2)],
    [(0, 65, .5), (.5, 69, .5), (1, 72, .5), (1.5, 77, 2.5)],  # 終わりのアルペジオ
]
STRUM = [(0, 'D', 1.0), (1, 'D', .7), (1.5, 'U', .5), (2.5, 'U', .55), (3, 'D', .75), (3.5, 'U', .5)]

# 版ごとの曲の組み立て。小節番号は0始まり。
#   strum: ストロークが入る（小節, 拍）  quiet: リズムを抜く小節  high: メロディを1オクターブ上で重ねる小節から
#   pad_bars: pad より前でもパッドを敷く小節
SPECS = {
    'cm30': dict(dur=30.0, prog=[F, C, DM, BB, F, C, BB, C, DM, BB, C7, F], melody=list(range(12)),
                 strum=(1, 2), bass=2, shaker=3, drums=4, quiet={9}, high=8, pad=8, end=11),
    'reel': dict(dur=60.0,
                 prog=[F, C, DM, BB, F, C, BB, C, F, C, DM, BB, F, C, BB, C, F, C, BB, DM, BB, C7, F, F],
                 melody=[0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 4, 5, 6, 8, 9, 10, 11, 12],
                 strum=(3, 0), bass=3, shaker=6, drums=8, quiet={20}, high=19, pad=19, end=23,
                 pad_bars={0, 1, 2}),
}


def build_music(sp):
    mus = Bus(int(SR * sp['dur']))
    end = sp['end']
    for bi, chord in enumerate(sp['prog']):
        t0 = bi * BAR
        quiet = bi in sp['quiet']  # メインコピーの小節はリズムを抜いて静かにする
        # メロディ（オルゴール）
        for beat, m, ln in MELODY[sp['melody'][bi]]:
            mus.add(t0 + beat * BEAT, musicbox(mtof(m), dur=max(1.2, ln * BEAT + .9)), .20, pan=.15)
            if bi >= sp['high']:  # サビは1オクターブ上を薄く重ねる
                mus.add(t0 + beat * BEAT + .004, musicbox(mtof(m + 12), dur=1.0), .05, pan=-.2)
        # ウクレレ風ストローク（S2の始まりから）
        if bi >= sp['strum'][0] and bi < end:
            for beat, d, acc in STRUM:
                if (bi, beat) < sp['strum']:
                    continue
                if quiet and beat not in (0, 2.5):
                    continue
                notes = VOICE[chord] if d == 'D' else VOICE[chord][::-1]
                gap = .012 if d == 'D' else .008
                for k, m in enumerate(notes):
                    mus.add(t0 + beat * BEAT + k * gap, pluck(mtof(m), dur=1.2), .085 * acc, pan=-.25 + k * .05)
        # ベース
        if bi >= sp['bass'] and bi < end:
            for beat in ((0,) if quiet else (0, 2, 3.5)):
                mus.add(t0 + beat * BEAT, bass(mtof(ROOT[chord])), .30 if beat != 3.5 else .18)
        # シェイカー
        if bi >= sp['shaker'] and bi < end and not quiet:
            for s in range(16):
                mus.add(t0 + s * BEAT / 4, shaker(1.0 if s % 2 == 0 else .55), .07, pan=.35)
        # キックとクラップ
        if bi >= sp['drums'] and bi < end and not quiet:
            for beat in (0, 2):
                mus.add(t0 + beat * BEAT, kick(), .42)
            for beat in (1, 3):
                mus.add(t0 + beat * BEAT, clap(), .10, pan=-.1)
        # パッド（笑顔のシーンから）
        if bi >= sp['pad'] or bi in sp.get('pad_bars', ()):
            ln = BAR + .9 if bi < end else 2.6
            mus.add(t0, pad([m - 12 for m in VOICE[chord]], ln), .07)
    # ラスト：Fの全弦ストロークを伸ばす
    t0 = end * BAR
    for k, m in enumerate([53, 60, 65, 69, 72, 77]):
        mus.add(t0 + k * .018, pluck(mtof(m), dur=2.5, decay=.9985), .09, pan=-.25 + k * .1)
    mus.add(t0, bass(mtof(41), dur=2.4), .32)
    mus.add(t0, kick(), .35)
    return mus.buf


def build_sfx(cues, n):
    sfx = Bus(n)
    for c in cues:
        fn, g = SFX[c['type']]
        sfx.add(c['t'], fn(c.get('p', 1)), g * c.get('g', 1), pan=float(np.clip((c['t'] * 7.3) % 1.2 - .6, -.4, .4)))
    return sfx.buf


def reverb(x, wet, sec=1.4, tau=.32):
    n = int(sec * SR)
    t = tt(n)
    out = np.zeros_like(x)
    for ch in range(2):
        ir = rng.uniform(-1, 1, n) * np.exp(-t / tau)
        ir = bandpass(ir, 200, 7000)
        ir /= np.sqrt((ir ** 2).sum())
        L = 1 << int(np.ceil(np.log2(x.shape[1] + n)))
        y = np.fft.irfft(np.fft.rfft(x[ch], L) * np.fft.rfft(ir, L), L)[: x.shape[1]]
        out[ch] = x[ch] + wet * y
    return out


def main(name):
    sp = SPECS[name]
    n = int(SR * sp['dur'])
    base = os.path.join(HERE, 'build', name)
    cues = json.load(open(os.path.join(base, 'cues.json'), encoding='utf-8'))
    music = reverb(build_music(sp), .35)
    sfx = reverb(build_sfx(cues, n), .18, sec=.9, tau=.18)
    mix = music + sfx
    t = tt(n)
    mix *= np.clip((sp['dur'] - t) / .45, 0, 1)
    mix = np.tanh(mix * 1.1) / 1.1
    mix *= .89 / np.abs(mix).max()
    pcm = (mix.T * 32767).astype(np.int16)
    out = os.path.join(base, 'audio.wav')
    with wave.open(out, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('wrote', out, f'{len(cues)} cues')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'cm30')
