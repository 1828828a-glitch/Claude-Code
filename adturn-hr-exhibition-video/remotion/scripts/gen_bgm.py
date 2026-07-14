import numpy as np, wave, struct

SR = 44100
DUR = 165.0
N = int(SR * DUR)
t = np.arange(N) / SR

# Ambient chord progression in C (maj9 colors), 10.75s per chord, cycled
chords = [
    [130.81, 196.00, 329.63, 493.88, 587.33],  # C3 G3 E4 B4 D5 (Cmaj9)
    [110.00, 164.81, 261.63, 392.00, 493.88],  # A2 E3 C4 G4 B4 (Am9)
    [87.31, 130.81, 220.00, 329.63, 392.00],   # F2 C3 A3 E4 G4 (Fmaj9)
    [98.00, 146.83, 246.94, 440.00, 587.33],   # G2 D3 B3 A4 D5 (Gadd9)
]
seg = 10.75
L = np.zeros(N)
R = np.zeros(N)

def pad_env(start, dur):
    """smooth attack 3s, release 3.5s, overlapping neighbours"""
    e = np.zeros(N)
    s, d = int(start * SR), int(dur * SR)
    a, r = int(3.0 * SR), int(3.5 * SR)
    end = min(s + d + r, N)
    idx = np.arange(s, end)
    env = np.ones(end - s)
    env[:min(a, len(env))] = 0.5 - 0.5 * np.cos(np.pi * np.arange(min(a, len(env))) / a)
    if end - s > r:
        env[-r:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(r) / r)
    e[idx] = env
    return e

rng = np.random.default_rng(7)
n_segs = int(np.ceil(DUR / seg))
for i in range(n_segs):
    chord = chords[i % 4]
    env = pad_env(i * seg, seg)
    for j, f in enumerate(chord):
        amp = 0.16 if j == 0 else 0.10 / np.sqrt(j)
        ph1, ph2 = rng.uniform(0, 2*np.pi, 2)
        det = 1.0015
        vL = np.sin(2*np.pi*f*t + ph1) + 0.25*np.sin(2*np.pi*2*f*t + ph1) + 0.08*np.sin(2*np.pi*3*f*t)
        vR = np.sin(2*np.pi*f*det*t + ph2) + 0.25*np.sin(2*np.pi*2*f*det*t + ph2) + 0.08*np.sin(2*np.pi*3*f*det*t)
        L += amp * env * vL
        R += amp * env * vR

# slow shimmering tremolo + gentle stereo drift
trem = 0.85 + 0.15 * np.sin(2*np.pi*0.07*t)
L *= trem
R *= 0.85 + 0.15 * np.sin(2*np.pi*0.07*t + 1.3)

# soft filtered noise air
noise = rng.standard_normal(N) * 0.012
kernel = np.ones(220)/220  # crude lowpass
noise = np.convolve(noise, kernel, mode='same')
L += noise; R += noise

# master fade in/out
fi, fo = int(2.0*SR), int(4.0*SR)
master = np.ones(N)
master[:fi] = np.linspace(0, 1, fi)
master[-fo:] = np.linspace(1, 0, fo)
L *= master; R *= master

# normalize to modest level
peak = max(np.abs(L).max(), np.abs(R).max())
L = L / peak * 0.55
R = R / peak * 0.55

data = np.empty(N*2, dtype=np.int16)
data[0::2] = (L * 32767).astype(np.int16)
data[1::2] = (R * 32767).astype(np.int16)
with wave.open('/home/user/Claude-Code/adturn-hr-exhibition-video/remotion/public/audio/bgm.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(data.tobytes())
print("done")
