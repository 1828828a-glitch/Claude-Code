# Style-BERT-VITS2 で感情ディレクション付きナレーションを生成
import os, wave
import numpy as np
from style_bert_vits2.nlp import bert_models
from style_bert_vits2.constants import Languages
from style_bert_vits2.tts_model import TTSModel

_bm = bert_models.load_model(Languages.JP, "ku-nlp/deberta-v2-large-japanese-char-wwm")
_bm.float()  # CPU推論: fp16→fp32に統一
bert_models.load_tokenizer(Languages.JP, "ku-nlp/deberta-v2-large-japanese-char-wwm")

A = "/root/sbv2_assets/jvnv-M1-jp"
model = TTSModel(
    model_path=f"{A}/jvnv-M1-jp_e158_s14000.safetensors",
    config_path=f"{A}/config.json",
    style_vec_path=f"{A}/style_vectors.npy",
    device="cpu",
)

OUT = "/home/user/Claude-Code/adturn-hr-exhibition-video/remotion/public/audio/sbv2"
os.makedirs(OUT, exist_ok=True)

# (name, text, style, style_weight, length[>1=遅い], sdp)
SEGS = [
    ("n1",  "トップパフォーマーの脳を、AIに転写する。世界初、特許出願中のAIエンジン、デジブレ。", "Neutral", 2.0, 1.12, 0.25),
    ("n2a", "独自の暗黙知抽出技術により、約40名の、トップパフォーマーの脳を、コピーしました。", "Happy", 1.6, 0.98, 0.3),
    ("n2b", "レシピではなく、料理そのものを、出力します。", "Happy", 2.2, 1.06, 0.3),
    ("n3",  "例えば、採用。この問いに、即答できますか？", "Neutral", 2.0, 1.18, 0.3),
    ("n4",  "貴社は誰に、何の会社として、選ばれているのか。その理由を、言えますか？", "Surprise", 1.4, 1.02, 0.35),
    ("n5",  "語っていない魅力が、社内に眠っていませんか？魅力の不足ではなく、翻訳の、不足です。", "Surprise", 1.2, 1.02, 0.35),
    ("n6",  "競合と迷う学生に、何と語りますか？決め手のひとことを、持っていますか？", "Surprise", 1.4, 1.0, 0.35),
    ("n7a", "すべての答えを出力するのが、アドターン、フォー、エイチアール！", "Happy", 3.5, 0.94, 0.2),
    ("n7b", "トップパフォーマーの脳が、貴社専用の戦略レポートを出力。面接でそのまま使える、トークスクリプトまで！", "Happy", 2.6, 0.94, 0.25),
    ("n8a", "一般論は、一行も、ない。", "Neutral", 2.0, 1.35, 0.15),
    ("m0",  "例えば、マーケティング。", "Neutral", 2.0, 1.22, 0.2),
    ("m1",  "トップパフォーマーの脳が、貴社のデジタル上における機会損失を可視化し、その打開策を、具体的に出力します。", "Neutral", 2.5, 1.05, 0.25),
    ("m2",  "検索されたとき、選択肢に、入っていますか？", "Surprise", 1.3, 1.05, 0.35),
    ("m3",  "営業で伝わる強みが、ウェブ上で、消えていませんか？", "Surprise", 1.3, 1.05, 0.35),
    ("m4",  "見込み客を、問い合わせまで、運べていますか？", "Surprise", 1.3, 1.05, 0.35),
    ("m5",  "競合比較、検索導線、コンテンツ、AI検索。", "Happy", 2.2, 0.82, 0.2),
    ("m6",  "何を、どの順番で、どう直すべきか。", "Neutral", 2.0, 1.3, 0.15),
    ("m7",  "施策の優先順位から、実装仕様、実行ロードマップまで。", "Neutral", 2.2, 1.08, 0.2),
    ("p0",  "すべての答えを出力するのが、アドターン、フォー、マーケティング！", "Happy", 3.5, 0.94, 0.2),
    ("p1",  "アドターン、フォー、エイチアール。アドターン、フォー、マーケティング。", "Happy", 2.2, 1.0, 0.25),
    ("p2",  "これらは、デジブレに、それぞれの分野のトップパフォーマーの脳を転写することで実現された、プロダクトです。", "Neutral", 2.4, 1.02, 0.25),
    ("p3",  "さあ、次は、貴社専用にカスタマイズを。", "Happy", 2.8, 1.05, 0.3),
    ("p4",  "デジブレ。", "Neutral", 2.0, 1.4, 0.1),
    ("n8b", "貴社の答えは、もう出せます！トップパフォーマーの脳を、あなたの武器に。", "Happy", 2.6, 1.0, 0.25),
    ("n8c", "デモは、ぜひ、ブースで！", "Happy", 2.6, 1.1, 0.3),
]

for name, text, style, sw, length, sdp in SEGS:
    sr, audio = model.infer(
        text=text,
        style=style,
        style_weight=sw,
        length=length,
        sdp_ratio=sdp,
        noise=0.5,
        noise_w=0.7,
        pitch_scale=0.85,  # 約3半音下げて低い声に
    )
    a = np.asarray(audio)
    if a.dtype != np.int16:
        a = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    with wave.open(f"{OUT}/{name}.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(a.tobytes())
    print(name, round(len(a)/sr, 2), "s", flush=True)
print("ALL_TTS_DONE")
