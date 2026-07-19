# MOSS-SoundEffect-v2.0 セットアップ

テキストの説明から効果音 (環境音・動物の鳴き声・動作音など) を生成するモデル
[OpenMOSS-Team/MOSS-SoundEffect-v2.0](https://huggingface.co/OpenMOSS-Team/MOSS-SoundEffect-v2.0)
を使うためのセットアップ一式。

- モデル: 1.3B パラメータの Diffusion Transformer (DiT) + Flow Matching
- 最大 30 秒・48kHz の音声を生成 (英語/中国語プロンプト対応)
- ライセンス: Apache 2.0
- 公式コード: https://github.com/OpenMOSS/MOSS-TTS

## 必要環境

- Python 3.12 以上 (必須)
- NVIDIA GPU 推奨 (CPU でも動くが生成にかなり時間がかかる)
- ディスク空き容量 約 10GB (依存パッケージ + モデル本体)

## セットアップ

```bash
bash moss_soundeffect/setup.sh
```

これで以下が行われる:

1. `moss_soundeffect/.venv` に Python 3.12 の仮想環境を作成
2. 公式リポジトリ `OpenMOSS/MOSS-TTS` を `moss_soundeffect/MOSS-TTS` に clone
3. GPU の有無を自動判定して PyTorch (CUDA 12.8 版 / CPU 版) と依存パッケージをインストール

## 使い方

### CLI で生成

```bash
source moss_soundeffect/.venv/bin/activate
python moss_soundeffect/generate.py \
    --prompt "The crisp, rhythmic click-clack of fast typing on a mechanical keyboard." \
    --seconds 10 \
    --output typing.wav
```

初回実行時に Hugging Face からモデル (数 GB) が自動ダウンロードされる。

主なオプション:

| オプション | デフォルト | 説明 |
|---|---|---|
| `--prompt` | (必須) | 生成したい音の説明 (英語/中国語) |
| `--output` | `output.wav` | 出力ファイル |
| `--seconds` | 10 | 音声の長さ (最大 30 秒) |
| `--steps` | 100 | 拡散ステップ数 (減らすと速いが品質低下) |
| `--cfg-scale` | 4.0 | プロンプトへの忠実度 |
| `--seed` | 0 | 乱数シード |
| `--device` | 自動判定 | `cuda` / `cpu` |

### Python から使う

```python
import torch
from moss_soundeffect_v2 import MossSoundEffectPipeline

pipe = MossSoundEffectPipeline.from_pretrained(
    "OpenMOSS-Team/MOSS-SoundEffect-v2.0",
    torch_dtype=torch.bfloat16,
    device="cuda",
)

audio = pipe(
    prompt="A dog barking loudly in a park.",
    seconds=10,
    num_inference_steps=100,
    cfg_scale=4.0,
)
pipe.save_audio(audio, "out.wav")
```

### Gradio デモ (ブラウザ UI)

```bash
source moss_soundeffect/.venv/bin/activate
cd moss_soundeffect/MOSS-TTS/moss_soundeffect_v2
SOUNDEFFECT_MODEL_DIR=OpenMOSS-Team/MOSS-SoundEffect-v2.0 python ../clis/moss_sound_effect_app.py
```

## 注意

- `moss_soundeffect/.venv` と `moss_soundeffect/MOSS-TTS` は git 管理外 (`.gitignore` 済み)。環境を作り直すときは両方削除して `setup.sh` を再実行する。
- CPU 実行時は `--steps 30 --seconds 5` あたりに下げると待ち時間を短縮できる。
