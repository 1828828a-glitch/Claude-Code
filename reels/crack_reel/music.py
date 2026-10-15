"""2本のリール用 BGM をつくる。

MIDI を組み立てて FluidSynth（FluidR3_GM）で鳴らし、残響と効果音を足して
out/bgm_chic.wav（落ち着いた版）と out/bgm_mojicut.wav（文字カット版）を書き出す。

    python3 music.py            # 両方
    python3 music.py chic       # 片方だけ
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import mido
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
SF2 = "/usr/share/sounds/sf2/FluidR3_GM.sf2"
SR = 48000

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def n(name):
    """'F#4' や 'Bb2' を MIDI 番号に"""
    base = NOTE[name[0]]
    i = 1
    while i < len(name) and name[i] in "#b":
        base += 1 if name[i] == "#" else -1
        i += 1
    return base + 12 * (int(name[i:]) + 1)


def ns(s):
    return [n(x) for x in s.split()]


class Song:
    """秒で書いて、テンポ60の MIDI（1拍 = 1秒）として保存する"""

    TPB = 960

    def __init__(self):
        self.ev = []

    def program(self, ch, prog):
        self.ev.append((0.0, 0, mido.Message("program_change", channel=ch, program=prog)))

    def cc(self, ch, t, ctrl, val):
        self.ev.append((t, 1, mido.Message("control_change", channel=ch, control=ctrl, value=int(max(0, min(127, val))))))

    def note(self, ch, t, dur, pitch, vel):
        vel = int(max(1, min(127, vel)))
        self.ev.append((t, 2, mido.Message("note_on", channel=ch, note=pitch, velocity=vel)))
        self.ev.append((t + max(dur, 0.03), 0, mido.Message("note_off", channel=ch, note=pitch, velocity=0)))

    def ramp(self, ch, t0, t1, v0, v1, ctrl=11, step=0.05):
        k = max(1, int((t1 - t0) / step))
        for i in range(k + 1):
            self.cc(ch, t0 + (t1 - t0) * i / k, ctrl, v0 + (v1 - v0) * i / k)

    def save(self, path):
        mid = mido.MidiFile(ticks_per_beat=self.TPB)
        tr = mido.MidiTrack()
        mid.tracks.append(tr)
        tr.append(mido.MetaMessage("set_tempo", tempo=1_000_000, time=0))
        last = 0
        for t, _, msg in sorted(self.ev, key=lambda e: (e[0], e[1])):
            tick = int(round(max(t, 0) * self.TPB))
            tr.append(msg.copy(time=tick - last))
            last = tick
        mid.save(path)


def render(song, seconds):
    with tempfile.TemporaryDirectory() as d:
        mid, wav = Path(d) / "s.mid", Path(d) / "s.wav"
        song.save(mid)
        subprocess.run(["fluidsynth", "-ni", "-q", "-g", "0.5", "-r", str(SR), "-R", "0", "-C", "0",
                        "-F", str(wav), SF2, str(mid)], check=True, stdout=subprocess.DEVNULL)
        sr, x = wavfile.read(wav)
    x = x.astype(np.float32) / 32768.0
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    total = int(seconds * SR)
    if len(x) < total:
        x = np.pad(x, ((0, total - len(x)), (0, 0)))
    return x[:total]


def reverb(x, seconds=2.4, wet=0.3, predelay=0.02, tone=6000, seed=1):
    """減衰するノイズを残響の素にした簡易コンボリューション"""
    r = np.random.default_rng(seed)
    L = int(seconds * SR)
    t = np.arange(L) / SR
    env = np.exp(-6.9 * t / seconds)
    sos = butter(2, tone, "low", fs=SR, output="sos")
    out = np.zeros_like(x)
    for c in range(2):
        ir = r.standard_normal(L) * env
        ir = sosfilt(sos, ir)
        ir = np.concatenate([np.zeros(int(predelay * SR)), ir])
        ir /= np.sqrt(np.sum(ir ** 2))
        out[:, c] = fftconvolve(x.mean(1), ir)[: len(x)]
    return x * (1 - wet) + out * wet * 1.4


def fade(x, t0, t1):
    a, b = int(t0 * SR), int(t1 * SR)
    g = np.ones(len(x))
    g[a:b] = np.linspace(1, 0, b - a)
    g[b:] = 0
    return x * g[:, None]


def loudnorm(x, target=-16.0, peak=-1.5):
    """ffmpeg で実効音量を測って、そろえてから天井を抑える"""
    with tempfile.TemporaryDirectory() as d:
        src = Path(d) / "a.wav"
        wavfile.write(src, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
        res = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-af",
                              "loudnorm=print_format=json", "-f", "null", "-"],
                             capture_output=True, text=True)
        js = json.loads(res.stderr[res.stderr.rindex("{"):res.stderr.rindex("}") + 1])
    gain = 10 ** ((target - float(js["input_i"])) / 20)
    y = x * gain
    lim = 10 ** (peak / 20)
    # やわらかいリミッター
    return np.tanh(y / lim) * lim


def compress(x, threshold=-30, ratio=2.4):
    """静かな所と大きな所の差を縮める（スマホのスピーカー向け）"""
    with tempfile.TemporaryDirectory() as d:
        src, dst = Path(d) / "a.wav", Path(d) / "b.wav"
        wavfile.write(src, SR, x.astype(np.float32))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af",
                        f"acompressor=threshold={threshold}dB:ratio={ratio}:attack=120:release=900:knee=6",
                        "-c:a", "pcm_f32le", str(dst)], check=True)
        _, y = wavfile.read(dst)
    return y.astype(np.float32)


def write(x, path):
    wavfile.write(path, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
    print("wrote", path)


# ---------------------------------------------------------------------------
# 落ち着いた版：ピアノと弦。場面の切り替わり時刻に和音を合わせる
# ---------------------------------------------------------------------------
def chic():
    total = 100.85
    s = Song()
    PIANO, STR, PAD, CEL = 0, 1, 2, 3
    s.program(PIANO, 0)
    s.program(STR, 49)
    s.program(PAD, 89)
    s.program(CEL, 8)
    s.cc(PIANO, 0, 7, 104)
    s.cc(STR, 0, 7, 92)
    s.cc(PAD, 0, 7, 58)
    s.cc(CEL, 0, 7, 82)
    for ch in (STR, PAD):
        s.cc(ch, 0, 11, 0)

    # (開始, 終わり, 低音, 和音, 動き)  動き: 秒あたりの間隔。None は和音を置くだけ
    chords = [
        (0.00, 3.13, "B2", "F#4 A4 D5 E5", 0.95),
        (3.13, 6.26, "G2", "D4 F#4 B4 D5", 0.70),
        (6.26, 9.39, "F#2", "A3 D4 E4 A4", 0.62),
        (9.39, 11.15, "E2", "G3 B3 D4 F#4", 0.58),
        (11.15, 15.65, "A1", "D4 E4 A4", None),
        (15.65, 18.65, "E2", "B3 D4 F#4 G4", 0.62),
        (18.65, 22.75, "C2", "E3 G3 B3 F#4", 0.55),
        (22.75, 25.85, "B1", "F#3 A3 D4", 0.85),
        (25.85, 28.40, "F#1", "B3 C#4 E4", None),
        (28.40, 30.35, "F#2", "A#3 C#4 E4", 0.48),
        (30.35, 33.65, "G2", "B3 D4 F#4 A4", 0.41),
        (33.65, 35.05, "A2", "C#4 F#4 B4", 0.41),
        (35.05, 38.85, "F#2", "A3 C#4 E4 A4", 0.41),
        (38.85, 41.40, "B1", "D4 F#4 A4", 0.41),
        (41.40, 43.55, "A2", "D4 G4 B4", 0.45),
        (43.55, 47.95, "G2", "D4 F#4 A4 B4", 0.37),
        (47.95, 50.85, "A2", "D4 E4 G4 B4", 0.37),
        (50.85, 53.35, "D2", "A3 C#4 F#4 A4", 0.42),
        (53.35, 56.15, "B1", "F#3 A3 D4 F#4", 0.42),
        (56.15, 58.65, "G2", "B3 D4 F#4 B4", 0.42),
        (58.65, 60.00, "E2", "G3 B3 D4 F#4", 0.42),
        (60.00, 61.15, "A2", "C#4 E4 A4", 0.42),
        (61.15, 64.25, "G2", "D4 F#4 B4", 0.62),
        (64.25, 66.80, "E2", "G3 D4 B4", 0.80),
        (66.80, 68.40, "F#2", "B3 C#4 E4", None),
        (69.45, 70.50, "G2", "B3 D4 A4", None),
        (70.50, 72.60, "F#2", "A3 D4 E4 A4", 0.40),
        (72.60, 75.15, "A2", "D4 E4 A4", 0.42),
        (75.15, 77.30, "B1", "F#3 A3 D4 F#4", 0.42),
        (77.30, 79.45, "G2", "B3 D4 F#4 A4", 0.42),
        (79.45, 82.35, "E2", "G3 B3 D4 F#4", 0.50),
        (82.35, 85.40, "A2", "D4 E4 G4", 0.60),
        (85.65, 88.40, "D2", "A3 D4 E4 F#4 A4", 0.34),
        (88.40, 89.90, "B1", "F#3 A3 D4 F#4", 0.36),
        (89.90, 91.15, "G2", "B3 D4 F#4", 0.40),
        (91.15, 93.00, "E2", "G3 B3 D4", 0.50),
        (93.00, 95.85, "A2", "D4 E4 G4", 0.50),
        (95.85, 100.85, "D2", "A3 C#4 E4 F#4 A4", 0.55),
    ]
    rng = np.random.default_rng(3)
    for t0, t1, bass, voic, step in chords:
        v = ns(voic)
        s.cc(PIANO, t0 + 0.005, 64, 127)
        s.cc(PIANO, t1 - 0.04, 64, 0)
        loud = 1.0 if 50 < t0 < 61 or 70 < t0 < 76 or 85 < t0 < 92 else 0.82
        s.note(PIANO, t0, t1 - t0, n(bass), 52 * loud)
        if step is None:
            for i, p in enumerate(v):
                s.note(PIANO, t0 + 0.06 + i * 0.05, t1 - t0, p, 40 * loud)
            continue
        cyc = v + v[-2:0:-1]
        t, i = t0 + step * 0.6, 0
        while t < t1 - 0.12:
            p = cyc[i % len(cyc)]
            vel = (44 if i % len(cyc) == 0 else 36) * loud + rng.uniform(-3, 3)
            s.note(PIANO, t + rng.uniform(-0.012, 0.012), step * 2.2, p, vel)
            t += step
            i += 1

    # 二度押さえの D7 の下がり（9割）
    for t in (25.85, 26.70, 27.55):
        s.note(PIANO, t, 0.8, n("F#1"), 58 if t == 25.85 else 40)

    # 旋律（秒, 音, 長さ, 強さ）
    mel = [
        (0.30, "B5", 1.4, 40), (1.35, "F#5", 1.2, 36), (2.30, "A5", 1.0, 34),
        (3.40, "F#5", 1.4, 44), (4.90, "E5", 0.9, 40), (5.80, "D5", 0.6, 38),
        (6.50, "D5", 1.4, 44), (8.00, "E5", 0.8, 40), (8.80, "F#5", 0.8, 42),
        (9.60, "B4", 0.8, 40), (10.40, "A4", 0.9, 38),
        (12.00, "E5", 1.2, 34), (13.40, "D5", 2.0, 30),
        (19.50, "B4", 1.0, 40), (20.60, "A4", 1.0, 38), (21.60, "F#4", 1.2, 36),
        (30.60, "D5", 0.8, 46), (31.40, "E5", 0.8, 46), (32.20, "F#5", 0.8, 48), (33.00, "E5", 0.8, 44),
        (33.90, "E5", 1.1, 44), (35.40, "C#5", 1.0, 44), (36.40, "D5", 1.0, 46), (37.40, "E5", 0.7, 46),
        (38.10, "A5", 0.8, 48), (39.20, "F#5", 1.0, 46), (40.20, "E5", 1.1, 44), (41.80, "D5", 1.5, 42),
        (44.00, "B4", 1.0, 46), (45.00, "D5", 1.2, 48), (46.20, "F#5", 1.5, 50),
        (48.30, "E5", 1.2, 48), (49.60, "D5", 1.1, 46),
        (51.00, "F#5", 1.3, 58), (52.30, "A5", 1.0, 56), (53.60, "E5", 1.1, 54), (54.80, "D5", 1.3, 52),
        (56.40, "B4", 0.8, 52), (57.20, "D5", 0.8, 54), (58.00, "G5", 0.9, 56),
        (58.90, "F#5", 1.2, 54), (60.20, "E5", 0.9, 50),
        (62.00, "D5", 1.5, 40), (65.00, "B4", 1.5, 34),
        (68.80, "D5", 0.9, 32), (68.80, "A4", 0.9, 28),
        (70.60, "F#5", 1.2, 58), (71.80, "A5", 0.8, 56), (72.90, "E5", 1.2, 54), (74.20, "C#5", 0.9, 50),
        (75.40, "D5", 1.0, 52), (76.40, "F#5", 0.9, 54), (77.60, "E5", 1.0, 52), (78.60, "D5", 0.8, 50),
        (85.75, "F#5", 1.2, 66), (86.90, "A5", 0.9, 64), (87.80, "D6", 1.2, 66),
        (88.60, "B5", 1.3, 60), (90.10, "A5", 1.0, 56),
        (91.40, "G5", 0.9, 50), (92.30, "F#5", 0.8, 48), (93.90, "E5", 1.8, 50),
        (97.30, "D6", 3.0, 46), (98.40, "A5", 2.4, 36),
    ]
    for t, p, d, v in mel:
        s.note(PIANO, t, d, n(p), v)

    # 弦：引用の場面、書き換えのあと、山場で厚くなる
    pads = [
        (15.65, 30.35, "E3 B3", 0, 38),
        (49.50, 61.80, None, 0, 92),
        (70.30, 79.00, None, 0, 84),
        (84.90, 99.90, None, 0, 104),
    ]
    str_chords = [
        (15.65, 22.75, "E3 B3 D4"), (22.75, 25.85, "B2 F#3 D4"), (25.85, 30.35, "F#2 C#4 E4"),
        (49.50, 50.85, "A2 E3 D4 G4"), (50.85, 53.35, "D3 A3 F#4 C#5"), (53.35, 56.15, "B2 F#3 D4 A4"),
        (56.15, 58.65, "G2 D3 B3 F#4"), (58.65, 60.00, "E3 B3 G4"), (60.00, 61.80, "A2 E3 C#4"),
        (70.30, 72.60, "F#2 D3 A3 F#4"), (72.60, 75.15, "A2 E3 C#4 A4"),
        (75.15, 77.30, "B2 F#3 D4"), (77.30, 79.00, "G2 D3 B3"),
        (84.90, 85.65, "A2 E3 G3 D4"), (85.65, 88.40, "D2 D3 A3 F#4 A4"), (88.40, 89.90, "B2 F#3 D4 F#4"),
        (89.90, 91.15, "G2 D3 B3 G4"), (91.15, 93.00, "E3 B3 G4"), (93.00, 95.85, "A2 E3 G3 C#4"),
        (95.85, 100.85, "D3 A3 F#4 E5"),
    ]
    for t0, t1, voic in str_chords:
        for p in ns(voic):
            s.note(STR, t0, t1 - t0 + 0.15, p, 70)
    s.ramp(STR, 15.65, 18.0, 0, 50)
    s.ramp(STR, 28.5, 30.6, 50, 0)
    s.ramp(STR, 49.5, 51.5, 0, 92)
    s.ramp(STR, 59.5, 61.8, 92, 0)
    s.ramp(STR, 70.3, 72.0, 0, 82)
    s.ramp(STR, 77.0, 79.0, 82, 0)
    s.ramp(STR, 84.9, 86.2, 0, 108)
    s.ramp(STR, 91.0, 93.0, 108, 84)
    s.ramp(STR, 95.8, 97.0, 84, 96)
    s.ramp(STR, 97.5, 100.6, 96, 0)

    # 柔らかいパッドを夜明け前と夜に薄く
    for t0, t1, voic in [(0.0, 15.65, "B2 F#3 D4"), (30.35, 43.55, "G2 D3 B3"), (79.45, 100.85, "E3 B3 D4")]:
        for p in ns(voic):
            s.note(PAD, t0, t1 - t0, p, 60)
    s.ramp(PAD, 0.0, 3.0, 0, 70)
    s.ramp(PAD, 12.0, 15.6, 70, 0)
    s.ramp(PAD, 30.35, 33.0, 0, 55)
    s.ramp(PAD, 41.0, 43.5, 55, 0)
    s.ramp(PAD, 79.45, 82.0, 0, 70)
    s.ramp(PAD, 96.0, 100.5, 70, 0)

    # チェレスタ：夜の窓あかり
    cel_rng = np.random.default_rng(11)
    pools = [(79.45, 85.65, "E6 F#6 B6 D7 G6", 0.62, 34), (85.65, 91.15, "D6 F#6 A6 E6 D7 A5", 0.24, 46),
             (91.15, 95.85, "B5 D6 E6 G6", 0.70, 32)]
    for t0, t1, pool, step, vel in pools:
        pl = ns(pool)
        t = t0 + 0.15
        while t < t1 - 0.1:
            s.note(CEL, t, 0.8, int(cel_rng.choice(pl)), vel + cel_rng.uniform(-6, 6))
            t += step * cel_rng.uniform(0.75, 1.3)
    for i, p in enumerate(ns("D6 F#6 A6 D7")):
        s.note(CEL, 95.95 + i * 0.12, 2.5, p, 40)

    x = render(s, total)
    x = reverb(x, seconds=3.2, wet=0.36, tone=5200)
    x = fade(x, total - 2.0, total)
    x[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
    x = compress(x / np.max(np.abs(x)) * 0.5, threshold=-26, ratio=3.0)
    write(loudnorm(x, -16.0), OUT / "bgm_chic.wav")


# ---------------------------------------------------------------------------
# 文字カット版：BPM100。カットの拍に音をそろえ、切り替わりに効果音を置く
# ---------------------------------------------------------------------------
BEAT = 0.6


def mojicut():
    cuts = json.loads((OUT / "mojicut_cuts.json").read_text())
    total = cuts["total"]
    s = Song()
    PIZZ, BASS, HARP, STR, PIANO, CEL, GLK, TIMP, DR = 0, 1, 2, 3, 4, 5, 6, 7, 9
    for ch, prog, vol in [(PIZZ, 45, 96), (BASS, 32, 100), (HARP, 6, 84), (STR, 48, 92),
                          (PIANO, 0, 104), (CEL, 8, 84), (GLK, 9, 70), (TIMP, 47, 110)]:
        s.program(ch, prog)
        s.cc(ch, 0, 7, vol)
    s.cc(DR, 0, 7, 92)
    s.cc(STR, 0, 11, 0)
    B = lambda beat: beat * BEAT  # 拍 → 秒

    # 小節ごとの和音（根音, 和音の構成音）。小節34から最後まで D
    bars = {
        1: ("D", "D F A"), 2: ("Bb", "Bb D F"), 3: ("G", "G Bb D"), 4: ("A", "A C# E G"), 5: ("D", "D F A"),
        6: ("G", "G Bb D"), 7: ("D", "D F A"), 8: ("E", "E G Bb D"), 9: ("A", "A C# E G"), 10: ("D", "D F A"),
        11: ("Bb", "Bb D F"), 12: ("F", "F A C"), 13: ("G", "G Bb D F"), 14: ("C", "C E G Bb"), 15: ("F", "F A C"),
        16: ("D", "D F A"), 17: ("Bb", "Bb D F"), 18: ("C", "C E G"), 19: ("G", "G Bb D"), 20: ("Bb", "Bb D F"),
        21: ("A", "A C# E G"), 22: ("Bb", "Bb D F"), 23: ("G", "G Bb D"), 24: ("A", "A C# E G"), 25: ("D", "D F# A"),
        26: ("G", "G B D"), 27: ("F#", "D F# A"), 28: ("E", "E G B D"), 29: ("A", "A D E G"), 30: ("B", "B D F# A"),
        31: ("A", "A C# E"), 32: ("G", "G B D"), 33: ("A", "A C# E G"), 34: ("D", "D F# A"), 35: ("D", "D F# A"),
    }

    def pc(name):
        return NOTE[name[0]] + (1 if "#" in name else -1 if "b" in name[1:] else 0)

    def tones(bar, octave):
        root, tri = bars[bar]
        return [pc(x) + 12 * (octave + 1) for x in tri.split()]

    # ピチカートの刻み（8分）。小節24の後半は無音、小節34以降は止める
    for bar in range(1, 34):
        if bar in (22, 23):
            pat_beats = [0, 1, 2, 3]
        elif bar == 24:
            pat_beats = [0, 0.5, 1]
        elif bar == 25:
            continue
        else:
            pat_beats = [i * 0.5 for i in range(8)]
        if bar == 29:
            # 前半は A7sus4、3拍目から D（扉ページの山場）
            pass
        t3 = tones(bar, 3)
        cyc = [t3[0], t3[2] if len(t3) > 2 else t3[1], t3[0] + 12, t3[1] + 12 if len(t3) > 1 else t3[0] + 12]
        for k, b in enumerate(pat_beats):
            beat = (bar - 1) * 4 + b
            if bar == 29 and b >= 2:
                cyc = [n("D3"), n("A3"), n("D4"), n("F#4")]
            if bar == 30 and b >= 2:
                cyc = [n("G3"), n("D4"), n("G4"), n("B4")]
            vel = 72 if b % 2 == 0 else (60 if b % 1 == 0 else 50)
            if 26 <= bar <= 33:
                vel += 6
            s.note(PIZZ, B(beat), 0.3, cyc[k % len(cyc)], vel)

    # コントラバス：1拍目と3拍目
    for bar in range(1, 35):
        if bar in (24, 25):
            continue
        root = bars[bar][0]
        r = pc(root) + 36
        if r > 45:
            r -= 12
        for b in (0, 2):
            beat = (bar - 1) * 4 + b
            rr = r
            if bar == 29 and b == 2:
                rr = n("D2")
            if bar == 30 and b == 2:
                rr = n("G2")
            s.note(BASS, B(beat), BEAT * 1.8, rr, 84)

    # チェンバロの旋律（拍, 音, 長さ[拍]）
    harp = {
        1: [(0, "D5", .5), (.5, "F5", .5), (1, "A5", .75), (1.75, "G5", .25), (2, "F5", .5), (2.5, "E5", .5), (3, "D5", 1)],
        2: [(0, "D5", .5), (.5, "F5", .5), (1, "Bb5", .75), (1.75, "A5", .25), (2, "G5", .5), (2.5, "F5", .5), (3, "D5", 1)],
        3: [(0, "Bb4", .5), (.5, "D5", .5), (1, "G5", .75), (1.75, "F5", .25), (2, "E5", .5), (2.5, "D5", .5), (3, "Bb4", 1)],
        4: [(0, "A4", .5), (.5, "C#5", .5), (1, "E5", .5), (1.5, "G5", .5), (2, "F5", .25), (2.25, "E5", .25), (2.5, "D5", .25), (2.75, "C#5", .25), (3, "A4", 1)],
        5: [(0, "D5", 1.5), (2, "A4", .5), (2.5, "D5", .5), (3, "F5", .5)],
        6: [(0, "G4", 1), (1, "Bb4", .5), (1.5, "D5", .5), (2, "G5", 1), (3, "F5", .5), (3.5, "D5", .5)],
        7: [(0, "F5", 1), (1, "E5", .5), (1.5, "D5", .5), (2, "A4", 2)],
        8: [(0, "G4", .5), (.5, "Bb4", .5), (1, "D5", 1), (2, "C5", .5), (2.5, "Bb4", .5), (3, "G4", 1)],
        9: [(0, "A4", .5), (.5, "C#5", .5), (1, "E5", .5), (1.5, "G5", .5), (2, "Bb5", 1), (3, "A5", 1)],
        10: [(0, "D5", 2)],
        11: [(0, "F5", .5), (.5, "D5", .5), (1, "Bb4", .5), (1.5, "D5", .5), (2, "F5", .5), (2.5, "Bb5", .5), (3, "A5", .5), (3.5, "G5", .5)],
        12: [(0, "A5", .5), (.5, "F5", .5), (1, "C5", .5), (1.5, "F5", .5), (2, "A5", 1), (3, "G5", .5), (3.5, "F5", .5)],
        13: [(0, "G5", .5), (.5, "D5", .5), (1, "Bb4", .5), (1.5, "D5", .5), (2, "F5", .5), (2.5, "E5", .5), (3, "D5", 1)],
        14: [(0, "E5", .5), (.5, "G5", .5), (1, "Bb5", .75), (1.75, "A5", .25), (2, "G5", .5), (2.5, "E5", .5), (3, "C5", 1)],
        15: [(0, "F5", 1.5), (2, "C5", .5), (2.5, "A4", .5), (3, "F4", 1)],
        18: [(0, "E5", .5), (.5, "G5", .5), (1, "C6", 1), (2, "Bb5", .5), (2.5, "G5", .5), (3, "E5", 1)],
    }
    harp[16], harp[17] = harp[1], harp[2]
    for bar, notes in harp.items():
        for b, p, d in notes:
            vel = 70 if b == int(b) else 60
            s.note(HARP, B((bar - 1) * 4 + b), B(d) * 0.95, n(p), vel)

    # 弦：引用（小節19）から入る。書き換えで長調に、扉ページで最大に
    strs = [(72, 76, "G3 D4 Bb4 D5"), (76, 80, "Bb3 F4 D5"), (80, 84, "A3 E4 C#5 G5"),
            (84, 88, "Bb3 F4 D5"), (88, 92, "G3 D4 Bb4"), (92, 93, "A3 E4 C#5"),
            (94, 96, "D3 A3 F#4 D5"), (96, 100, "D3 A3 F#4 A4"),
            (100, 104, "G3 D4 B4"), (104, 108, "F#3 D4 A4"), (108, 112, "E3 B3 G4 D5"),
            (112, 114, "A3 D4 E4 G4"), (114, 116, "D3 A3 F#4 D5 A5"), (116, 118, "B2 F#3 D4 B4"),
            (118, 120, "G2 D3 B3 G4"), (120, 124, "A2 E3 C#4 A4"),
            (124, 128, "G2 D3 B3 G4"), (128, 132, "A2 E3 C#4 G4"), (132, 140, "D3 A3 F#4 D5")]
    for b0, b1, voic in strs:
        for p in ns(voic):
            s.note(STR, B(b0), B(b1 - b0) + 0.05, p, 74)
    s.ramp(STR, B(72), B(73), 0, 96)
    s.ramp(STR, B(86), B(92.8), 96, 60)
    s.cc(STR, B(93), 11, 0)
    s.ramp(STR, B(94), B(95.5), 30, 100)
    s.ramp(STR, B(100), B(101), 100, 84)
    s.ramp(STR, B(112), B(114), 84, 112)
    s.ramp(STR, B(124), B(128), 100, 112)
    s.ramp(STR, B(134), B(139.6), 112, 0)

    # ピアノ：書き換え以降の旋律
    pno = [
        (88, "D4 G4 Bb4", 2, 46), (90, "D4 G4 Bb4", 2, 42), (92, "C#4 E4 A4", 1, 40),
        (94, "D3 A3 D4 F#4 A4", 2, 72), (94, "F#5", 1.5, 70), (95.5, "A5", .5, 64), (96, "D6", 2, 66), (98, "C#6", 1, 58), (99, "A5", 1, 56),
        (100, "B4", 1, 60), (101, "D5", .5, 58), (101.5, "G5", .5, 60), (102, "F#5", 1, 62), (103, "E5", 1, 58),
        (104, "D5", 1.5, 60), (105.5, "A4", .5, 54), (106, "D5", .5, 58), (106.5, "E5", .5, 60), (107, "F#5", 1, 62),
        (108, "G5", 1, 58), (109, "F#5", .5, 54), (109.5, "E5", .5, 54), (110, "B4", 2, 50),
        (112, "E5", 1, 56), (113, "D5", .5, 52), (113.5, "E5", .5, 56),
        (114, "D3 A3 D4 F#4", 2, 80), (114, "F#5", 2, 80), (116, "B5", 1.5, 72), (117.5, "A5", .5, 66), (118, "G5", 1, 66), (119, "F#5", 1, 64),
        (120, "E5", 1, 64), (121, "F#5", .5, 62), (121.5, "G5", .5, 64), (122, "A5", 2, 68),
        (124, "B5", 2, 70), (126, "A5", 1, 64), (127, "G5", 1, 62),
        (128, "A5", 1, 76), (129, "C#6", 1, 72), (130, "E6", 2, 74),
        (132, "D3 A3 D4 F#4 A4", 6, 74), (132, "D6", 6, 72),
    ]
    for b, ps, d, v in pno:
        for p in ns(ps):
            s.note(PIANO, B(b), B(d), p, v)
    s.cc(PIANO, B(94), 64, 127)
    s.cc(PIANO, B(139.8), 64, 0)

    # チェレスタ：夜の場面
    cel_seq = ns("E6 G6 B6 D7 B6 G6 E6 B5")
    for i in range(16):
        s.note(CEL, B(108 + i * 0.5), 0.4, cel_seq[i % 8], 52)
    for i in range(8):
        s.note(CEL, B(114 + i * 0.25), 0.5, ns("D6 F#6 A6 D7 A6 F#6 A6 D7")[i], 58)
    for i, p in enumerate(ns("D6 F#6 A6 D7 F#7")):
        s.note(CEL, B(132 + i * 0.25), 1.5, p, 54)
    # 鉄琴で山場をきらっと
    for b in (114, 132):
        for p in ns("D6 F#6 A6"):
            s.note(GLK, B(b), 1.6, p, 70)

    # ティンパニ：九割、町は、書き換え、ゼロに、ロゴ
    for b, p, v in [(35, "A2", 112), (72, "G2", 104), (94, "D2", 108), (128, "A2", 116), (132, "D2", 104)]:
        s.note(TIMP, B(b), 1.6, n(p), v)
    for i in range(10):  # ロゴ直前の小さなロール
        s.note(TIMP, B(131) + i * 0.06, 0.2, n("A2"), 40 + i * 5)

    # 打楽器：朝は時計の拍木、中盤は細いハイハット、夜はシェイカー
    for beat in range(0, 40):
        s.note(DR, B(beat), 0.1, 76 if beat % 2 == 0 else 77, 54 if beat % 4 == 0 else 42)
    for k in range(40 * 2, 92 * 2):
        s.note(DR, B(k / 2), 0.05, 42, 34 if k % 2 == 0 else 24)
    for k in range(100 * 2, 132 * 2):
        s.note(DR, B(k / 2), 0.05, 82, 40 if k % 2 == 0 else 28)

    x = render(s, total)
    x = reverb(x, seconds=1.8, wet=0.24, tone=7000, seed=5)

    # 効果音
    sfx = np.zeros_like(x)
    r = np.random.default_rng(21)

    def place(sig, t, gain):
        a = int(t * SR)
        b = min(len(sfx), a + len(sig))
        sfx[a:b] += sig[: b - a, None] * gain

    def click(sharp=1.0):
        L = int(0.05 * SR)
        tt = np.arange(L) / SR
        noise = sosfilt(butter(2, [2500, 9000], "band", fs=SR, output="sos"), r.standard_normal(L))
        body = np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 260)
        return (noise * np.exp(-tt * 180 * sharp) * 0.8 + body * 0.5)

    def thump():
        L = int(0.25 * SR)
        tt = np.arange(L) / SR
        f = 90 * np.exp(-tt * 10) + 45
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 14)

    def paper(length=0.22):
        L = int(length * SR)
        tt = np.arange(L) / SR
        env = np.sin(np.pi * tt / length) ** 2
        return sosfilt(butter(2, [900, 6000], "band", fs=SR, output="sos"), r.standard_normal(L)) * env

    def swish(length=0.35):
        L = int(length * SR)
        tt = np.arange(L) / SR
        env = (tt / length) ** 1.5 * np.exp(-tt * 6)
        sig = r.standard_normal(L)
        out = np.zeros(L)
        for i, fc in enumerate(np.linspace(1500, 7000, 8)):
            seg = slice(i * L // 8, (i + 1) * L // 8)
            out[seg] = sosfilt(butter(2, [fc * 0.7, min(fc * 1.3, 20000)], "band", fs=SR, output="sos"), sig)[seg]
        return out * env * 3

    for c in cuts["cuts"]:
        t, kind = c["t"], c["type"]
        if t <= 0:
            continue
        if kind in ("genko", "book", "rewrite"):
            place(paper(), t - 0.03, 0.10)
            place(click(1.4), t, 0.10)
        elif kind in ("title", "number", "logo"):
            place(click(), t, 0.22)
            place(thump(), t, 0.30)
        elif kind == "flash":
            place(click(0.7), t, 0.28)
        else:
            place(click(1.2), t, 0.15)
    # 打ち消し線
    rw = next(c["t"] for c in cuts["cuts"] if c["type"] == "rewrite")
    place(swish(), rw + 0.5, 0.25)
    # ロゴの通し番号が落ちていくカウント音
    logo = cuts["cuts"][-1]["t"]
    tk = logo + 0.6
    while tk < logo + 2.2:
        place(click(2.0), tk, 0.05)
        tk += 0.045 + 0.06 * ((tk - logo - 0.6) / 1.6) ** 2

    x = x + sfx
    x = fade(x, total - 1.0, total)
    write(loudnorm(x, -15.0), OUT / "bgm_mojicut.wav")


if __name__ == "__main__":
    which = sys.argv[1:] or ["chic", "mojicut"]
    if "chic" in which:
        chic()
    if "mojicut" in which:
        mojicut()
