# BGM と効果音を作る。cap.js が書く timeline.json から、効果音の時刻 sfx と、曲調を切り替える位置 marks を読む。
# marks.sad   巻き戻しが終わって本編が始まるところ。ここから短調のピアノ
# marks.silence 食卓の沈黙。ここで曲を止め、時計の音と心音だけにする
# marks.warm  「実はさ…」のあと。ここから明るい曲
import numpy as np, wave, json
SR = 44100
tl = json.load(open('timeline.json')); TOT = tl['total']; MK = tl['marks']
N = int(SR * (TOT + .5)); mus = np.zeros((N, 2)); fx = np.zeros((N, 2))
rng = np.random.default_rng(7)
f = lambda n: 440 * 2 ** ((n - 69) / 12)

def put(buf, t0, sig, pan=0.0):
    i0 = int(t0 * SR)
    if i0 >= N or i0 < 0: return
    n = min(len(sig), N - i0)
    buf[i0:i0 + n, 0] += sig[:n] * (1 - pan); buf[i0:i0 + n, 1] += sig[:n] * (1 + pan)

def tone(dur, midi, kind):
    t = np.arange(int(dur * SR)) / SR; fr = f(midi)
    if kind == 'pad':
        s = sum(np.sin(2 * np.pi * fr * (1 + d) * t) for d in (-.003, 0, .003)) / 3 + .3 * np.sin(2 * np.pi * fr * 2 * t)
        env = np.minimum(1, t / 1.0) * np.clip((dur - t) / 1.2, 0, 1)
    elif kind == 'bell':
        s = np.sin(2 * np.pi * fr * t) + .4 * np.sin(2 * np.pi * fr * 2.01 * t) * np.exp(-t * 6) + .2 * np.sin(2 * np.pi * fr * 3 * t) * np.exp(-t * 9)
        env = np.exp(-t * 2.8) * np.minimum(1, t / .004)
    else:
        s = np.sin(2 * np.pi * fr * t) + .5 * np.sin(2 * np.pi * fr * 2 * t) * np.exp(-t * 3) + .25 * np.sin(2 * np.pi * fr * 3 * t) * np.exp(-t * 5)
        env = np.exp(-t * 1.6) * np.minimum(1, t / .006)
    return s * env

def lowpass(x, a):
    y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y

def sfx(kind):
    if kind in ('hit', 'hit2', 'thud'):
        d = {'hit': 1.6, 'hit2': .7, 'thud': 1.0}[kind]; t = np.arange(int(d * SR)) / SR
        fr = np.where(t < .5, 70 - 40 * t / .5, 30)
        s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * (2.5 if kind == 'hit' else 5))
        s += lowpass(rng.standard_normal(len(t)), .08) * np.exp(-t * 14) * 1.5
        return s * {'hit': 1.0, 'hit2': .55, 'thud': .8}[kind]
    if kind == 'rewind':
        d = 1.1; t = np.arange(int(d * SR)) / SR; fr = 180 * np.exp(t * 1.9)
        s = np.sign(np.sin(2 * np.pi * np.cumsum(fr) / SR)) * .25 * (.6 + .4 * np.sin(2 * np.pi * 28 * t))
        s += rng.standard_normal(len(t)) * .08
        return lowpass(s, .25) * np.minimum(1, t / .05) * np.clip((d - t) / .1, 0, 1) * .9
    if kind == 'whoosh':
        d = .45; t = np.arange(int(d * SR)) / SR
        s = lowpass(rng.standard_normal(len(t)), .12) * np.sin(np.pi * t / d) ** 2
        return s * .9
    if kind == 'poof':
        d = .8; t = np.arange(int(d * SR)) / SR
        return lowpass(rng.standard_normal(len(t)), .05) * np.exp(-t * 4) * 1.6
    if kind == 'boil':
        d = 1.9; out = np.zeros(int(d * SR))
        for _ in range(70):
            st = rng.uniform(0, d - .05); fr = rng.uniform(350, 900); t = np.arange(int(.04 * SR)) / SR
            b = np.sin(2 * np.pi * (fr + 3000 * t) * t) * np.exp(-t * 90); i = int(st * SR); out[i:i + len(b)] += b * .35
        return out
    if kind == 'tick':
        t = np.arange(int(.05 * SR)) / SR
        return (np.sin(2 * np.pi * 2200 * t) + .5 * np.sin(2 * np.pi * 4100 * t)) * np.exp(-t * 160) * .5
    if kind == 'heart':
        out = np.zeros(int(.6 * SR))
        for off, a in ((0, 1), (.2, .7)):
            t = np.arange(int(.25 * SR)) / SR; b = np.sin(2 * np.pi * 48 * t) * np.exp(-t * 18) * a
            i = int(off * SR); out[i:i + len(b)] += b
        return out * 1.3
    if kind == 'chime':
        out = np.zeros(int(2 * SR))
        for j, m in enumerate((84, 88, 91, 96)):
            b = tone(1.5, m, 'bell') * .28; i = int(j * .07 * SR); out[i:i + len(b)] += b[:len(out) - i]
        return out
    raise ValueError(kind)

# hook: low drone under the outburst
put(mus, 0, tone(MK['sad'] + .5, 33, 'pad') * .12)
# sad section
sad = [(57, [57, 60, 64]), (53, [53, 57, 60]), (50, [50, 53, 57]), (52, [52, 56, 59])]
t = MK['sad']; k = 0
while t < MK['silence'] - .3:
    root, ch = sad[k % 4]; d = min(3.2, MK['silence'] - t + 1.0)
    put(mus, t, tone(d, root - 12, 'pad') * .10)
    for m in ch: put(mus, t, tone(d, m, 'pad') * .05, (m % 3 - 1) * .3)
    for j, m in enumerate([ch[0] + 12, ch[2] + 12, ch[1] + 12]):
        if t + j * 1.07 < MK['silence'] - .4: put(mus, t + j * 1.07, tone(2.5, m, 'piano') * .07, .2 * (j - 1))
    t += 3.2; k += 1
# tension drone through the silence and the calendar, rising into the reveal
dl = MK['warm'] - MK['silence']; tt = np.arange(int(dl * SR)) / SR
put(mus, MK['silence'], (np.sin(2 * np.pi * 55 * tt) + .5 * np.sin(2 * np.pi * 82.4 * tt)) * np.minimum(1, tt / 2) * (.04 + .06 * tt / dl) * np.clip((dl - tt) / .15, 0, 1))
# warm section
hap = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]
t = MK['warm']; k = 0; beat = .4
while t < TOT:
    root, ch = hap[k % 4]; d = min(2.4, TOT - t + .4)
    put(mus, t, tone(d + .8, root, 'pad') * .09); put(mus, t, tone(d, root + 12, 'pad') * .04)
    for m in ch: put(mus, t, tone(d + .5, m, 'pad') * .035)
    fin = min(1, (t - MK['warm']) / 3 + .4)
    for j, m in enumerate([ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24]):
        put(mus, t + j * beat, tone(1.2, m, 'bell') * .06 * fin, .35 * np.sin(j))
    t += 2.4; k += 1
for m in (84, 79, 76): put(mus, TOT - 3.6, tone(4, m, 'bell') * .065)

for e in tl['sfx']: put(fx, e['t'], sfx(e['type']))

def reverb(x):
    r = np.zeros_like(x)
    for dl, g in ((0.037, .35), (0.071, .28), (0.113, .22), (0.173, .17), (0.241, .12)):
        s = int(dl * SR); r[s:, 0] += x[:-s, 1] * g; r[s:, 1] += x[:-s, 0] * g
    return x + r
out = reverb(mus) * .9 + reverb(fx * .6) * .55
tt = np.arange(N) / SR; out *= np.clip((TOT + .3 - tt) / 2.5, 0, 1)[:, None]
out = np.tanh(out / np.abs(out).max() * 1.4) * .85
w = wave.open('bgm.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((out * 32767).astype('<i2').tobytes()); w.close()
print('ok', round(TOT, 2), MK)
