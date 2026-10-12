"""episodeのJSONから、カットごとの台詞音声をStyle-Bert-VITS2で合成する。

使い方:
  python synth_voices.py episode01.json --tts <モデルフォルダ> --out <音声フォルダ>

モデルフォルダの中身:
  bert/deberta-v2-large-japanese-char-wwm/   ku-nlp の BERT
  models/jvnv-M1-jp/ ほか                     litagin/style_bert_vits2_jvnv（CC BY-SA 4.0）
同じ台詞と設定の音声はキャッシュを使い回す。
"""
import argparse
import glob
import hashlib
import json
import os

import numpy as np
from scipy.io import wavfile

# 男性声はJVNVの2種類しかないため、高さ・速さ・抑揚・感情スタイルで4役を描き分ける
CAST = {
    "N": {"model": "jvnv-M1-jp", "style": "Neutral", "pitch": 0.94, "length": 1.06, "intonation": 1.1, "sdp": 0.4},
    "NR": {"model": "jvnv-M1-jp", "style": "Neutral", "pitch": 0.88, "length": 1.08, "intonation": 0.8, "sdp": 0.2},
    "K": {"model": "jvnv-M2-jp", "style": "Neutral", "pitch": 0.96, "length": 1.0, "intonation": 0.85, "sdp": 0.2},
    "NA": {"model": "jvnv-M2-jp", "style": "Happy", "style_weight": 1.5, "pitch": 1.03, "length": 0.93, "intonation": 1.25, "sdp": 0.3},
    "S": {"model": "jvnv-F1-jp", "style": "Neutral", "pitch": 1.0, "length": 1.0, "intonation": 1.0, "sdp": 0.2},
}
TARGET_RMS = 0.08


def trim(a, sr, thr=0.01):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    pad = int(0.03 * sr)
    return a[max(idx[0] - pad, 0): idx[-1] + pad]


def normalize(a):
    frame = 1024
    n = len(a) // frame
    rms = np.sqrt((a[: n * frame].reshape(n, frame) ** 2).mean(axis=1))
    active = rms[rms > rms.max() * 0.15]
    level = float(np.sqrt((active ** 2).mean())) if len(active) else 1e-6
    a = a * (TARGET_RMS / level)
    peak = np.abs(a).max()
    return a * (0.95 / peak) if peak > 0.95 else a


def cap_pauses(a, sr, cap):
    """句読点で入る長すぎる間を cap 秒に詰める。"""
    hop = int(0.01 * sr)
    n = len(a) // hop
    loud = np.sqrt((a[: n * hop].reshape(n, hop) ** 2).mean(axis=1)) > 0.006
    keep, run_start = np.ones(len(a), bool), None
    for k in range(n + 1):
        quiet = k < n and not loud[k]
        if quiet and run_start is None:
            run_start = k
        elif not quiet and run_start is not None:
            if (k - run_start) * hop > cap * sr:
                s = run_start * hop + int(cap * sr / 2)
                keep[s: k * hop - int(cap * sr / 2)] = False
            run_start = None
    return a[keep]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--tts", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    cache = os.path.join(a.out, "cache")
    os.makedirs(cache, exist_ok=True)

    from style_bert_vits2.constants import Languages
    from style_bert_vits2.nlp import bert_models
    from style_bert_vits2.tts_model import TTSModel

    bert = os.path.join(a.tts, "bert", "deberta-v2-large-japanese-char-wwm")
    bert_models.load_model(Languages.JP, bert).float()  # CPUではfp16のままだと推論できない
    bert_models.load_tokenizer(Languages.JP, bert)
    models = {}

    ep = json.load(open(a.episode, encoding="utf-8"))
    manifest = {}
    for i, sh in enumerate(ep["shots"]):
        sp = sh.get("sp")
        if not sp or sh.get("silent") or not sh.get("text"):
            continue
        cfg = dict(CAST[sp])
        if sh.get("emo"):
            cfg["style"], cfg["style_weight"] = sh["emo"], sh.get("emo_weight", 1.5)
        text = sh.get("yomi", sh["text"])
        key = hashlib.sha1(json.dumps([text, cfg], ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]
        path = os.path.join(cache, key + ".wav")
        if not os.path.exists(path):
            if cfg["model"] not in models:
                d = os.path.join(a.tts, "models", cfg["model"])
                models[cfg["model"]] = TTSModel(model_path=glob.glob(d + "/*.safetensors")[0], config_path=d + "/config.json",
                                                style_vec_path=d + "/style_vectors.npy", device="cpu")
            sr, wav = models[cfg["model"]].infer(
                text=text, style=cfg["style"], style_weight=cfg.get("style_weight", 1.0), pitch_scale=cfg["pitch"],
                length=cfg["length"], intonation_scale=cfg["intonation"], sdp_ratio=cfg["sdp"])
            wav = normalize(trim(wav.astype(np.float32) / 32768.0, sr))
            wavfile.write(path, sr, (wav * 32767).astype(np.int16))
        sr, wav = wavfile.read(path)
        wav = cap_pauses(wav.astype(np.float32) / 32768.0, sr, 0.6 if sp == "NR" else 0.4)
        final = os.path.join(a.out, f"{i:03d}.wav")
        wavfile.write(final, sr, (wav * 32767).astype(np.int16))
        manifest[i] = {"wav": os.path.abspath(final), "sec": round(len(wav) / sr, 3), "sr": int(sr)}
        print(f"#{i:02d} {sp:<3}{manifest[i]['sec']:6.2f}s  {sh['text']}", flush=True)
    json.dump(manifest, open(os.path.join(a.out, "voices.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
