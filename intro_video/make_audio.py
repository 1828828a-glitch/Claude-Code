#!/usr/bin/env python3
"""Opus 5 紹介動画のナレーションと BGM を生成し、1本の WAV にミックスする。

- ナレーション: Open JTalk (pyopenjtalk) + HTS 音声 "Mei" (CC BY 3.0)
- BGM: 完全に自前生成(サイン波の加算合成)。既製曲を使わないので権利の心配がない。

出力:
  --out     ミックス済みの音声 WAV
  --timing  各シーンの尺と「セリフ開始時刻」を書いた JSON
            (make_intro_video.py がこれを読んで映像を音に合わせる)

使い方:
    python3 intro_video/make_audio.py --out out/opus5_audio.wav --timing out/opus5_timing.json
"""

from __future__ import annotations

import argparse
import json
import wave
from pathlib import Path

import numpy as np

SR = 48000

# ---------------------------------------------------------------- 台本
#
# 英語のまま書くと Open JTalk が「オーピーユーエス」のように一字ずつ読むため、
# 固有名詞はカタカナで読みを与えている。字幕(映像側)の文言とは対応させている。
#
# lines の各要素が 1 つの「キュー」になり、映像側の要素の出現タイミングになる。

NARRATION: list[dict] = [
    dict(  # S1 フック
        min_dur=4.0, lead_in=0.45, tail=0.85, gap=0.20,
        lines=[
            "オーパス・ファイブ。",
            "名前は聞くけれど、何者なのか。",
            "一分で、自己紹介します。",
        ],
    ),
    dict(  # S2 自己紹介
        min_dur=5.8, lead_in=0.40, tail=1.00, gap=0.26,
        lines=[
            "はじめまして。",
            "文章を読んで、考えて、書けるエーアイです。",
            "生まれは、アメリカのアンスロピック。",
            "クロードというシリーズで、いちばん力のある担当です。",
        ],
    ),
    dict(  # S3 できること
        min_dur=6.6, lead_in=0.40, tail=0.90, gap=0.20,
        lines=[
            "できることは、ざっくり三つ。",
            "読んで、まとめる。",
            "考えて、調べる。",
            "そして、つくる。",
            "資料の要点も、メールも、プログラムも書けます。",
        ],
    ),
    dict(  # S4 会える場所
        min_dur=6.2, lead_in=0.40, tail=0.95, gap=0.22,
        lines=[
            "会える場所は、選べます。",
            "ふだんは、チャットで。",
            "パソコンの中で作業する私は、クロード・コードです。",
        ],
    ),
    dict(  # S5 なかま
        min_dur=6.0, lead_in=0.40, tail=1.00, gap=0.24,
        lines=[
            "なかまも、います。",
            "じっくり考える、オーパス。",
            "バランスのいい、ソネット。",
            "とても速い、ハイク。",
            "用事の大きさで、使い分けます。",
        ],
    ),
    dict(  # S6 正直なところ
        min_dur=6.2, lead_in=0.40, tail=0.95, gap=0.22,
        lines=[
            "得意も、苦手もあります。",
            "得意なのは、長い作業を最後までやり切ること。",
            "苦手なのは、自信たっぷりに間違えること。",
            "大事な数字は、必ず確認してください。",
        ],
    ),
    dict(  # S7 締め
        min_dur=5.2, lead_in=0.45, tail=1.50, gap=0.24,
        lines=[
            "むずかしいことは、こちらで。",
            "あなたは、やりたいことを話すだけでいい。",
        ],
    ),
]

TTS_SPEED = 1.13


# ---------------------------------------------------------------- 汎用DSP

def fft_filter(x: np.ndarray, cutoff: float, kind: str = "low", order: float = 2.0) -> np.ndarray:
    """FFT でかけるゼロ位相フィルタ。音楽用途なら位相のズレは問題にならない。"""
    n = len(x)
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(n, 1 / SR)
    with np.errstate(divide="ignore", invalid="ignore"):
        ratio = np.where(freqs > 0, freqs / cutoff, 1e-9)
    mag = 1.0 / np.sqrt(1.0 + ratio ** (2 * order))
    if kind == "high":
        mag = 1.0 - mag
    return np.fft.irfft(spec * mag, n)


def fft_convolve(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    """FFT による畳み込み。リバーブ用。"""
    n = len(x) + len(ir) - 1
    size = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)
    return y[: len(x)]


def make_reverb_ir(decay: float = 0.50, length: float = 1.30, seed: int = 7) -> tuple[np.ndarray, np.ndarray]:
    """指数減衰ノイズによる簡易リバーブ IR(左右で別ノイズにして広がりを出す)。"""
    rng = np.random.default_rng(seed)
    n = int(length * SR)
    t = np.arange(n) / SR
    env = np.exp(-t / decay)
    out = []
    for _ in range(2):
        ir = rng.standard_normal(n) * env
        ir = fft_filter(ir, 5200, "low")
        ir[: int(0.006 * SR)] = 0.0  # プリディレイ
        out.append(ir / (np.abs(ir).max() + 1e-9))
    return out[0], out[1]


def smooth(x: np.ndarray, seconds: float) -> np.ndarray:
    """移動平均。エンベロープを滑らかにするのに使う。"""
    w = max(1, int(seconds * SR))
    kernel = np.ones(w) / w
    return fft_convolve(x, kernel)


def midi_to_hz(m: float) -> float:
    return 440.0 * 2.0 ** ((m - 69.0) / 12.0)


# ---------------------------------------------------------------- BGM

BPM = 82.0
BEAT = 60.0 / BPM
BAR = 4.0 * BEAT

# Am7 - Fmaj7 - Cmaj7 - G6。落ち着いた進行を 4 小節で回す。
PROGRESSION = [
    (57, [0, 3, 7, 10]),
    (53, [0, 4, 7, 11]),
    (60, [0, 4, 7, 11]),
    (55, [0, 4, 7, 9]),
]


def _add(buf: np.ndarray, start: float, sig: np.ndarray) -> None:
    i = int(start * SR)
    if i < 0:
        sig = sig[-i:]
        i = 0
    j = min(len(buf), i + len(sig))
    if j > i:
        buf[i:j] += sig[: j - i]


def _pad_note(freq: float, dur: float, amp: float) -> np.ndarray:
    """やわらかいパッド。わずかにデチューンした 3 声を重ねて厚みを出す。"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for det, w in ((-0.04, 0.5), (0.0, 1.0), (0.05, 0.5)):
        f = freq * (1 + det / 12 * 0.03)
        sig += w * np.sin(2 * np.pi * f * t)
        sig += 0.22 * w * np.sin(2 * np.pi * 2 * f * t)
    atk, rel = 0.85, 1.25
    env = np.ones(n)
    a = min(n, int(atk * SR))
    env[:a] = np.linspace(0, 1, a) ** 1.6
    r = min(n, int(rel * SR))
    env[n - r:] *= np.linspace(1, 0, r) ** 1.4
    # ゆっくりした揺らぎ
    env *= 1.0 + 0.06 * np.sin(2 * np.pi * 0.13 * t)
    return sig * env * amp


def _pluck(freq: float, dur: float, amp: float, decay: float = 0.32) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.exp(-t / decay)
    sig = np.sin(2 * np.pi * freq * t) + 0.30 * np.sin(2 * np.pi * 2 * freq * t) * np.exp(-t / (decay * 0.5))
    atk = int(0.004 * SR)
    sig[:atk] *= np.linspace(0, 1, atk)
    return sig * env * amp


def _bell(freq: float, amp: float, decay: float = 1.15) -> np.ndarray:
    n = int(decay * 3 * SR)
    t = np.arange(n) / SR
    env = np.exp(-t / decay)
    sig = (np.sin(2 * np.pi * freq * t)
           + 0.42 * np.sin(2 * np.pi * 2.76 * freq * t) * np.exp(-t / (decay * 0.4))
           + 0.20 * np.sin(2 * np.pi * 5.40 * freq * t) * np.exp(-t / (decay * 0.25)))
    atk = int(0.003 * SR)
    sig[:atk] *= np.linspace(0, 1, atk)
    return sig * env * amp


def _kick(amp: float) -> np.ndarray:
    n = int(0.30 * SR)
    t = np.arange(n) / SR
    f = 108 * np.exp(-t / 0.035) + 46
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t / 0.11) * amp


def _hat(amp: float, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(0.055 * SR)
    t = np.arange(n) / SR
    sig = rng.standard_normal(n) * np.exp(-t / 0.014)
    return fft_filter(sig, 7000, "high") * amp


def build_bgm(total: float, scene_starts: list[float]) -> tuple[np.ndarray, np.ndarray]:
    """総尺ぶんの BGM をステレオで組み立てる。"""
    n = int(total * SR)
    pad = np.zeros(n)
    bass = np.zeros(n)
    arp = np.zeros(n)
    drums = np.zeros(n)
    bells = np.zeros(n)

    bars = int(np.ceil(total / BAR)) + 1
    for b in range(bars):
        root, chord = PROGRESSION[b % len(PROGRESSION)]
        t0 = b * BAR
        if t0 > total:
            break
        # パッド(1小節ぶん伸ばす)
        for k, iv in enumerate(chord):
            _add(pad, t0, _pad_note(midi_to_hz(root + iv), BAR + 0.9, 0.30 / (1 + 0.35 * k)))
        # ベース(1拍目と3拍目)
        for beat in (0, 2):
            _add(bass, t0 + beat * BEAT, _pluck(midi_to_hz(root - 24), 1.5, 0.55, decay=0.42))
        # アルペジオ(8分)
        for s in range(8):
            iv = chord[[0, 2, 1, 3, 2, 1, 3, 2][s] % len(chord)]
            oct_up = 12 if s % 4 in (1, 3) else 24
            _add(arp, t0 + s * BEAT / 2, _pluck(midi_to_hz(root + iv + oct_up), 1.0, 0.115))
        # ドラム(ごく控えめ)
        for beat in (0, 2):
            _add(drums, t0 + beat * BEAT, _kick(0.30))
        for s in (1, 3, 5, 7):
            _add(drums, t0 + s * BEAT / 2, _hat(0.030, seed=b * 8 + s))

    # シーンの切り替わりに小さなベルを置いて、区切りを耳でも分かるようにする
    for i, st in enumerate(scene_starts):
        root, chord = PROGRESSION[i % len(PROGRESSION)]
        _add(bells, st, _bell(midi_to_hz(root + chord[2] + 24), 0.16))

    pad = fft_filter(pad, 2100, "low")
    arp = fft_filter(arp, 4800, "low")
    bass = fft_filter(bass, 320, "low")

    left = pad * 0.95 + bass + arp * 0.75 + drums * 0.9 + bells * 0.9
    right = pad * 1.05 + bass + arp * 1.20 + drums * 0.9 + bells * 1.1

    ir_l, ir_r = make_reverb_ir()
    left = left * 0.74 + fft_convolve(left, ir_l) * 0.26
    right = right * 0.74 + fft_convolve(right, ir_r) * 0.26

    # 全体の抑揚:出だしは控えめ、中盤で少し上げ、最後にすっと引く
    t = np.arange(n) / SR
    shape = 0.72 + 0.28 * np.clip(t / max(total * 0.28, 1e-6), 0, 1)
    shape *= 1.0 - 0.42 * np.clip((t - (total - 5.0)) / 5.0, 0, 1)
    fade_in = np.clip(t / 1.8, 0, 1) ** 1.5
    fade_out = np.clip((total - t) / 2.2, 0, 1) ** 1.3
    env = shape * fade_in * fade_out

    return left * env, right * env


# ---------------------------------------------------------------- ナレーション

def trim_silence(x: np.ndarray, thresh: float = 0.012) -> np.ndarray:
    peak = np.abs(x).max()
    if peak <= 0:
        return x
    loud = np.abs(x) > thresh * peak
    if not loud.any():
        return x
    i, j = np.argmax(loud), len(loud) - np.argmax(loud[::-1])
    pad = int(0.02 * SR)
    return x[max(0, i - pad): min(len(x), j + pad)]


def synth_lines() -> tuple[np.ndarray, list[dict], float]:
    """台本を読み上げ、シーンごとの尺とキュー時刻を決めながら 1 本に並べる。"""
    import pyopenjtalk

    clips: list[tuple[float, np.ndarray]] = []
    scenes: list[dict] = []
    cursor = 0.0  # シーン開始時刻

    for si, sc in enumerate(NARRATION):
        cues: list[float] = []
        t = cursor + sc["lead_in"]
        for line in sc["lines"]:
            wav, sr = pyopenjtalk.tts(line, speed=TTS_SPEED)
            assert sr == SR, sr
            audio = trim_silence(np.asarray(wav, dtype=np.float64) / 32768.0)
            peak = np.abs(audio).max()
            if peak > 0:
                audio = audio / peak * 0.85  # クリップごとに音量をそろえる
            cues.append(round(t - cursor, 3))
            clips.append((t, audio))
            t += len(audio) / SR + sc["gap"]
        spoken_end = t - sc["gap"]
        dur = max(sc["min_dur"], spoken_end + sc["tail"] - cursor)
        scenes.append(dict(index=si, dur=round(dur, 3), cues=cues))
        cursor += dur
        print(f"  S{si + 1}: {dur:5.2f}s  cues={cues}")

    total = cursor
    buf = np.zeros(int(total * SR) + SR)
    for start, audio in clips:
        _add(buf, start, audio)
    buf = buf[: int(total * SR)]

    # 声の整え:低域のゴロつきを削り、少しだけ残響を足して馴染ませる
    buf = fft_filter(buf, 95, "high")
    ir_l, _ = make_reverb_ir(decay=0.28, length=0.55, seed=3)
    buf = buf * 0.93 + fft_convolve(buf, ir_l) * 0.07
    peak = np.abs(buf).max()
    if peak > 0:
        buf = buf / peak * 0.80
    return buf, scenes, total


# ---------------------------------------------------------------- ミックス

def compress(x: np.ndarray, threshold: float = 0.075, ratio: float = 2.5) -> np.ndarray:
    """声用のゆるいコンプレッサー。突出したピークだけ抑えて聞き取りやすさを上げる。"""
    env = smooth(np.abs(x), 0.015)
    env = np.maximum(env, 1e-9)
    over = env > threshold
    gain = np.ones_like(env)
    gain[over] = (env[over] / threshold) ** (1.0 / ratio - 1.0)
    gain = smooth(gain, 0.045)
    return x * gain


def rms_db(x: np.ndarray) -> float:
    return float(20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12))


def active_rms_db(x: np.ndarray, thresh: float = 0.02) -> float:
    """無音を除いた実効レベル。声は間があるので、そこを含めると過小評価になる。"""
    a = np.abs(x)
    peak = a.max()
    if peak <= 0:
        return -120.0
    mask = a > thresh * peak
    return rms_db(x[mask]) if mask.any() else rms_db(x)


def duck(bgm: np.ndarray, voice: np.ndarray, depth: float = 0.62) -> np.ndarray:
    """声が鳴っている間だけ BGM を下げる(サイドチェイン風)。"""
    env = smooth(np.abs(voice), 0.14)
    env = env / (env.max() + 1e-9)
    look = int(0.09 * SR)  # 先読みして声の直前から下げ始める
    env = np.concatenate([env[look:], np.zeros(look)])
    env = smooth(env, 0.10)
    env = env / (env.max() + 1e-9)
    gain = 1.0 - depth * np.clip(env / 0.16, 0, 1)
    return bgm * gain


def write_wav(path: Path, left: np.ndarray, right: np.ndarray, ceiling: float = 0.98) -> None:
    stereo = np.stack([left, right], axis=1)
    peak = float(np.abs(stereo).max())
    if peak > ceiling:
        # tanh などの非線形リミッターは声の波形を潰すので、素直に全体を下げる
        stereo = stereo * (ceiling / peak)
        print(f"  ピークが {peak:.2f} だったので {ceiling} に合わせて下げました")
    data = np.clip(stereo * 32767.0, -32768, 32767).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="out/opus5_audio.wav")
    ap.add_argument("--timing", default="out/opus5_timing.json")
    ap.add_argument("--voice-out", help="ナレーション単体も書き出す(BGM/SFX を Remotion 側で重ねる版で使う)")
    # レベルは固定倍率ではなく RMS の目標値で決める。合成した BGM の素の振幅は
    # 音色構成で大きく変わるので、倍率指定だと簡単に声を食ってしまう。
    ap.add_argument("--voice-peak", type=float, default=0.90, help="声のピーク(歪ませないため)")
    ap.add_argument("--bgm-below-db", type=float, default=12.0, help="BGM を声より何 dB 下げるか")
    ap.add_argument("--duck-db", type=float, default=9.0, help="声が乗っている間に BGM をさらに下げる量")
    args = ap.parse_args()

    print("ナレーションを合成中…")
    voice, scenes, total = synth_lines()
    print(f"総尺: {total:.2f} 秒")

    starts, acc = [], 0.0
    for sc in scenes:
        starts.append(acc)
        acc += sc["dur"]

    print("BGM を生成中…")
    bl, br = build_bgm(total, starts)

    voice = compress(voice)
    voice *= args.voice_peak / (np.abs(voice).max() + 1e-12)
    voice_db = active_rms_db(voice)
    bgm_gain = 10 ** ((voice_db - args.bgm_below_db - rms_db((bl + br) * 0.5)) / 20)
    bl *= bgm_gain
    br *= bgm_gain

    depth = 1.0 - 10 ** (-args.duck_db / 20)
    bl = duck(bl, voice, depth)
    br = duck(br, voice, depth)

    left = bl + voice
    right = br + voice

    print(f"  声   : {active_rms_db(voice):6.1f} dBFS (実効) / peak {np.abs(voice).max():.2f}")
    print(f"  BGM  : {rms_db((bl + br) * 0.5):6.1f} dBFS (ダッキング後)")
    print(f"  合計 : {rms_db((left + right) * 0.5):6.1f} dBFS / peak {np.abs(np.r_[left, right]).max():.2f}")

    out = Path(args.out)
    write_wav(out, left, right)
    print(f"音声を書き出しました: {out} ({out.stat().st_size / 1e6:.2f} MB)")

    if args.voice_out:
        vo = Path(args.voice_out)
        write_wav(vo, voice, voice)
        print(f"ナレーション単体を書き出しました: {vo} ({vo.stat().st_size / 1e6:.2f} MB)")

    timing = Path(args.timing)
    timing.parent.mkdir(parents=True, exist_ok=True)
    timing.write_text(json.dumps(dict(total=round(total, 3), scenes=scenes),
                                 ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"タイミングを書き出しました: {timing}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
