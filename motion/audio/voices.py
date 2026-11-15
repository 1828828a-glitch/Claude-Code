# 声の候補を作る。話者と読み方の設定を変え、各行の長さを元の版にそろえる
# 使い方: python voices.py voices.json。できた声は lower.py で高さを下げてから mix.sh に渡す。
# 普通の版は p_f2 の声を lower.py 入力 出力 222 0.95 1.0 で、低く抑えた版は p_f1 の声を 198 0.90 0.72 で加工する。
# 利用条件は gen.py の冒頭と同じ。lower.py には pyworld、このファイルには librosa が要る。
# TARGET は元の版の各行の秒数。lines.json の台詞を変えたら測り直す。
import json, os, sys, soundfile as sf, numpy as np, librosa
from huggingface_hub import hf_hub_download, list_repo_files
from style_bert_vits2.nlp import bert_models
from style_bert_vits2.constants import Languages
from style_bert_vits2.tts_model import TTSModel
bert_models.load_model(Languages.JP, "ku-nlp/deberta-v2-large-japanese-char-wwm").float()
bert_models.load_tokenizer(Languages.JP, "ku-nlp/deberta-v2-large-japanese-char-wwm")
repo = "litagin/style_bert_vits2_jvnv"
TARGET = {"n0": 5.18, "n1": 13.97, "n2": 11.06, "n3": 17.18, "n4": 6.55, "n5": 3.91}
VAR = json.load(open(sys.argv[1])); only = sys.argv[2].split(",") if len(sys.argv) > 2 else None
lines = [L for L in json.load(open("lines.json")) if not only or L["id"] in only]
models = {}
for v in VAR:
    name = v["speaker"]
    if name not in models:
        files = {os.path.basename(f): hf_hub_download(repo, f, local_dir="models") for f in list_repo_files(repo) if f.startswith(name + "/")}
        st = [x for k, x in files.items() if k.endswith(".safetensors")][0]
        models[name] = TTSModel(model_path=st, config_path=files["config.json"], style_vec_path=files["style_vectors.npy"], device="cpu")
    m = models[name]; os.makedirs(v["out"], exist_ok=True)
    kw = dict(language=Languages.JP, style="Neutral", sdp_ratio=v.get("sdp", 0.0), noise=v.get("noise", 0.4), noise_w=v.get("noise_w", 0.5),
              pitch_scale=v.get("pitch", 1.0), intonation_scale=v.get("inton", 1.0))
    for L in lines:
        length = v.get("length", 1.0)
        for _ in range(3):  # 長さを目標に寄せる
            sr, a = m.infer(text=L["say"], length=length, **kw)
            d = len(a) / sr
            if abs(d - TARGET[L["id"]]) < 0.25: break
            length *= TARGET[L["id"]] / d
        sf.write(f"{v['out']}/{L['id']}.wav", a, sr)
        y = a.astype(np.float32) / 32768 if a.dtype != np.float32 else a
        f0, vo, _ = librosa.pyin(y, fmin=80, fmax=500, sr=sr, frame_length=2048)
        f0 = f0[~np.isnan(f0)]
        print(v["out"], L["id"], "len", round(d, 2), "rate", round(length, 2), "f0", int(np.median(f0)), "range", int(np.percentile(f0, 90) - np.percentile(f0, 10)), flush=True)
