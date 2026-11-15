# 女性ナレーションを1行ずつ wav にする。Style-Bert-VITS2 の JVNV 女性話者(F1)を使う
# 声のモデルは litagin/style_bert_vits2_jvnv で、利用条件は JVNV コーパスを引き継いだ CC BY-SA 4.0。
# 動画を公開するときは出典の表示が要る。継承の条件が動画にどこまで及ぶかは、出す前に確かめる。
import json, os, sys, soundfile as sf
from huggingface_hub import hf_hub_download, list_repo_files
from style_bert_vits2.nlp import bert_models
from style_bert_vits2.constants import Languages
from style_bert_vits2.tts_model import TTSModel
bert_models.load_model(Languages.JP, "ku-nlp/deberta-v2-large-japanese-char-wwm").float()
bert_models.load_tokenizer(Languages.JP, "ku-nlp/deberta-v2-large-japanese-char-wwm")
repo, name = "litagin/style_bert_vits2_jvnv", sys.argv[2] if len(sys.argv) > 2 else "jvnv-F1-jp"
files = {os.path.basename(f): hf_hub_download(repo, f, local_dir="models") for f in list_repo_files(repo) if f.startswith(name + "/")}
st = [v for k, v in files.items() if k.endswith(".safetensors")][0]
model = TTSModel(model_path=st, config_path=files["config.json"], style_vec_path=files["style_vectors.npy"], device="cpu")
out = sys.argv[3] if len(sys.argv) > 3 else "wav"
os.makedirs(out, exist_ok=True)
for L in json.load(open(sys.argv[1])):
    sr, audio = model.infer(text=L["say"], language=Languages.JP, style="Neutral", sdp_ratio=0.2, noise=0.5, noise_w=0.7, length=1.0)
    sf.write(f"{out}/{L['id']}.wav", audio, sr)
    print(L["id"], round(len(audio) / sr, 2), flush=True)
