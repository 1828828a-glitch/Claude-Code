"""narrate_tts.py で作ったナレーションを動画に重ねる。

各行の前後の無音を切り、音量をそろえて at（秒）の位置に置く。次の行に食い込むときは、
行の頭を少し前に出す、次の行を少し後ろへずらす、1.2倍までテンポだけ上げる、の順で収める。ナレーションが鳴っているあいだは BGM を duck_db だけ下げる。

    python3 narrate_mix.py narration/chic.json              # 本番（out/narration/chic/*.wav を使う）
    python3 narrate_mix.py narration/chic.json --dry-run    # 文字数から長さを見積もった仮の音で通しテスト
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, resample_poly, sosfilt

HERE = Path(__file__).resolve().parent
SR = 48000
GAP = 0.08          # 行と行のあいだに最低限あける秒数
MAX_TEMPO = 1.2     # これ以上は速めない
EARLY = 0.25        # 行の頭を前に出してよい秒数（行ごとに early で変えられる）
LATE = 0.6          # 次の行を後ろへずらしてよい秒数（行ごとに late で変えられる）
# 仮の音で見積もるときの話す速さ（文字/秒）
RATE = {"narrator_chic": 6.5, "narrator_moji": 8.5, "narrator_motion": 7.5}


def read_wav(path):
    sr, x = wavfile.read(path)
    if x.dtype == np.int16:
        x = x.astype(np.float32) / 32768.0
    elif x.dtype == np.int32:
        x = x.astype(np.float32) / 2147483648.0
    x = x.astype(np.float32)
    if x.ndim == 2:
        x = x.mean(1)
    if sr != SR:
        x = resample_poly(x, SR, sr).astype(np.float32)
    return x


def trim(x, db=-45.0, pad=0.03):
    win = int(0.01 * SR)
    n = len(x) // win
    if n == 0:
        return x
    rms = np.sqrt(np.mean(x[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    on = np.where(20 * np.log10(rms) > db)[0]
    if len(on) == 0:
        return x
    a = max(0, on[0] * win - int(pad * SR))
    b = min(len(x), (on[-1] + 1) * win + int(pad * SR))
    return x[a:b]


def level(x, target_db=-20.0):
    rms = np.sqrt(np.mean(x ** 2) + 1e-12)
    y = x * (10 ** (target_db / 20) / rms)
    peak = np.max(np.abs(y))
    return y / peak * 0.89 if peak > 0.89 else y


def tempo(x, factor):
    with tempfile.TemporaryDirectory() as d:
        a, b = Path(d) / "a.wav", Path(d) / "b.wav"
        wavfile.write(a, SR, x.astype(np.float32))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(a), "-af", f"atempo={factor:.4f}",
                        "-c:a", "pcm_f32le", str(b)], check=True)
        return read_wav(b)


def dummy(line):
    """見積もった長さの仮の音（声の帯域のノイズを語の区切りで揺らす）"""
    chars = len(re.sub(r"[、。，．？！…\s]|[\U0001F000-\U0001FFFF☀-➿⏩⏸️‍]", "", line["say"]))
    rate = RATE.get(line["voice"], 6.5) * (1.15 if "⏩" in line["say"] else 1.0)
    sec = chars / rate + 0.22 * line["say"].count("、") + 0.4 * line["say"].count("⏸")
    sec *= line.get("duration_scale", 1.0)
    n = int(sec * SR)
    rng = np.random.default_rng(abs(hash(line["id"])) % 2**32)
    sig = sosfilt(butter(2, [200, 3000], "band", fs=SR, output="sos"), rng.standard_normal(n))
    t = np.arange(n) / SR
    return (sig * (0.6 + 0.4 * np.sin(2 * np.pi * 4.5 * t))).astype(np.float32)


def loudness(x):
    with tempfile.TemporaryDirectory() as d:
        a = Path(d) / "a.wav"
        wavfile.write(a, SR, np.clip(x, -1, 1).astype(np.float32))
        r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(a), "-af", "loudnorm=print_format=json",
                            "-f", "null", "-"], capture_output=True, text=True)
        js = json.loads(r.stderr[r.stderr.rindex("{"): r.stderr.rindex("}") + 1])
    return float(js["input_i"])


def main(spec_path, dry=False):
    spec = json.loads(Path(spec_path).read_text())
    name = Path(spec_path).stem
    bgm = wavfile.read(HERE / spec["bgm"])[1].astype(np.float32)
    if np.abs(bgm).max() > 2:
        bgm /= 32768.0
    total = len(bgm) / SR
    narr = np.zeros(len(bgm), dtype=np.float32)
    mask = np.zeros(len(bgm), dtype=np.float32)
    lines = sorted(spec["lines"], key=lambda l: l["at"])

    print(f"{'id':5} {'at':>6} {'start':>6} {'len':>5} {'end':>6} {'next':>6}  note")
    problems = 0
    prev_end = 0.0
    for i, line in enumerate(lines):
        if dry:
            clip = dummy(line)
        else:
            path = HERE / "out" / "narration" / name / f"{line['id']}.wav"
            if not path.exists():
                print(f"{line['id']:5} missing {path}")
                problems += 1
                continue
            clip = level(trim(read_wav(path)))
        last = i + 1 == len(lines)
        nxt = lines[i + 1]["at"] if not last else total - 0.2
        # 次の行の頭は late まで後ろにずらせる（最後の行は動画の終わりまで）
        limit = nxt - GAP + (0 if last else lines[i + 1].get("late", LATE))
        dur = len(clip) / SR
        start = max(prev_end + GAP, line["at"])
        notes = []
        if start > line["at"] + 0.01:
            notes.append(f"late +{start - line['at']:.2f}")
        if start + dur > limit:
            earliest = max(prev_end + GAP, line["at"] - line.get("early", EARLY))
            start = max(earliest, limit - dur)
            if start < line["at"] - 0.01:
                notes.append(f"early -{line['at'] - start:.2f}")
        room = limit - start
        if dur > room:
            f = dur / room
            clip = tempo(clip, min(f, MAX_TEMPO))
            notes.append(f"tempo x{min(f, MAX_TEMPO):.2f}")
            if f > MAX_TEMPO:
                notes.append(f"OVERLAP {dur / MAX_TEMPO - room:.2f}s")
                problems += 1
        dur = len(clip) / SR
        prev_end = start + dur
        note = " ".join(notes)
        a = int(start * SR)
        b = min(len(narr), a + len(clip))
        narr[a:b] += clip[: b - a]
        mask[max(0, a - int(0.15 * SR)): min(len(mask), b + int(0.25 * SR))] = 1.0
        print(f"{line['id']:5} {line['at']:6.2f} {start:6.2f} {dur:5.2f} {prev_end:6.2f} {nxt:6.2f}  {note}")

    # BGM を下げる量をなめらかに（下げるのは速く、戻すのはゆっくり）
    duck = np.zeros_like(mask)
    up, down = np.exp(-1 / (0.08 * SR)), np.exp(-1 / (0.35 * SR))
    v = 0.0
    for k in range(len(mask)):
        c = up if mask[k] > v else down
        v = c * v + (1 - c) * mask[k]
        duck[k] = v
    gain = 10 ** (spec.get("duck_db", -9) * duck / 20)
    narr = sosfilt(butter(2, 70, "high", fs=SR, output="sos"), narr).astype(np.float32)
    mix = bgm * gain[:, None] + narr[:, None] * 1.0
    speech = mask > 0.5
    if speech.any():
        ratio = 20 * np.log10(np.sqrt(np.mean(narr[speech] ** 2)) / (np.sqrt(np.mean((bgm[speech] * gain[speech, None]) ** 2)) + 1e-9))
        print(f"声と音楽の差（ナレーション中）: {ratio:+.1f} dB")
    # リールの音量（-14 LUFS 前後）にそろえて天井を抑える
    mix *= 10 ** ((-14.0 - loudness(mix)) / 20)
    mix = np.tanh(mix / 0.89) * 0.89

    out_dir = HERE / "out" / "narration"
    out_dir.mkdir(parents=True, exist_ok=True)
    wav = out_dir / f"{name}{'_dry' if dry else ''}_mix.wav"
    wavfile.write(wav, SR, (mix * 32767).astype(np.int16))
    mp4 = HERE / (spec["output"].replace(".mp4", "_dry.mp4") if dry else spec["output"])
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(HERE / spec["video"]), "-i", str(wav),
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                    "-shortest", "-movflags", "+faststart", str(mp4)], check=True)
    print(f"wrote {mp4}  ({problems} problem(s))")
    return problems


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    sys.exit(1 if sum(main(p, dry="--dry-run" in sys.argv) for p in args) else 0)
