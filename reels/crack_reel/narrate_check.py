"""生成したナレーションを機械で点検する（耳で聴く前のふるい分け）。

各行を音声認識で文字に起こして台本と比べ、ずれの大きい行に印を付ける。
声の見本は高さ（基本周波数の中央値）を測り、役の設定（子ども・男性・女性）と合っているかを見る。

    ../../../aratako/venv/bin/python narrate_check.py narration/voices.json narration/chic.json ...
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

import librosa
import numpy as np
from transformers import pipeline

HERE = Path(__file__).resolve().parent
ASR_MODEL = "kotoba-tech/kotoba-whisper-v2.0"
STRIP = re.compile(r"[\s、。，．・？！?!…\.「」『』〜ー\-—]|[\U0001F000-\U0001FFFF☀-➿⏩⏸️‍]")


def norm(s):
    s = unicodedata.normalize("NFKC", s)
    s = s.replace("crack", "クラック").replace("9割", "きゅうわり").replace("約2%", "やくにパーセント")
    return STRIP.sub("", s)


def kata2hira(s):
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)


def cer(ref, hyp):
    ref, hyp = kata2hira(ref), kata2hira(hyp)
    d = np.arange(len(hyp) + 1)
    for i, rc in enumerate(ref, 1):
        prev, d[0] = d[0], i
        for j, hc in enumerate(hyp, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (rc != hc))
    return d[len(hyp)] / max(len(ref), 1)


def f0(path):
    y, sr = librosa.load(path, sr=16000)
    f, voiced, _ = librosa.pyin(y, fmin=65, fmax=500, sr=sr)
    f = f[voiced & ~np.isnan(f)]
    return float(np.median(f)) if len(f) else float("nan")


def main(paths):
    asr = pipeline("automatic-speech-recognition", model=ASR_MODEL, device="cpu")
    flagged = 0
    for p in paths:
        spec = json.loads(Path(p).read_text())
        name = Path(p).stem
        for vid, v in spec.get("voices", {}).items():
            w = HERE / "out" / "narration" / "voices" / f"{vid}.wav"
            if w.exists():
                print(f"voice {vid:16} median F0 {f0(w):6.1f} Hz  | {v['caption'][:28]}")
        for line in spec.get("lines", []):
            w = HERE / "out" / "narration" / name / f"{line['id']}.wav"
            if not w.exists():
                print(f"{line['id']}: missing")
                continue
            hyp = asr(str(w), generate_kwargs={"language": "ja", "task": "transcribe"})["text"]
            score = min(cer(norm(line["text"]), norm(hyp)), cer(norm(line["say"]), norm(hyp)))
            mark = "  <-- check" if score > 0.25 else ""
            flagged += bool(mark)
            print(f"{line['id']} cer {score:4.2f}  heard: {hyp}{mark}")
    print(f"flagged {flagged}")


if __name__ == "__main__":
    main(sys.argv[1:])
