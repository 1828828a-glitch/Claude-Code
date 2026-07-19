#!/usr/bin/env python3
"""MOSS-SoundEffect-v2.0 でテキストから効果音を生成する CLI。

事前に setup.sh を実行し、.venv を有効化してから使う:

    source moss_soundeffect/.venv/bin/activate
    python moss_soundeffect/generate.py --prompt "A dog barking loudly in a park." --output dog.wav

初回実行時は Hugging Face からモデル (数 GB) がダウンロードされる。
"""

import argparse
import os

import torch
import torchaudio

from moss_soundeffect_v2 import MossSoundEffectPipeline

MODEL_ID = "OpenMOSS-Team/MOSS-SoundEffect-v2.0"


def main() -> None:
    parser = argparse.ArgumentParser(description="Text-to-sound-effect generation with MOSS-SoundEffect-v2.0")
    parser.add_argument("--prompt", required=True, help="生成したい音の説明 (英語/中国語)")
    parser.add_argument("--output", default="output.wav", help="出力 wav ファイルパス")
    parser.add_argument("--seconds", type=float, default=10.0, help="音声の長さ (秒, 最大30)")
    parser.add_argument("--steps", type=int, default=100, help="拡散ステップ数")
    parser.add_argument("--cfg-scale", type=float, default=4.0, help="CFG スケール")
    parser.add_argument("--seed", type=int, default=0, help="乱数シード")
    parser.add_argument("--model-dir", default=MODEL_ID, help="モデルの HF ID またはローカルパス")
    parser.add_argument("--device", default=None, help="cuda / cpu (省略時は自動判定)")
    args = parser.parse_args()

    device = args.device or ("cuda" if torch.cuda.is_available() else "cpu")
    # bfloat16 は GPU 前提。CPU では float32 の方が安全かつ速い。
    dtype = torch.bfloat16 if device == "cuda" else torch.float32
    if device == "cpu":
        print("警告: GPU が見つからないため CPU で実行します。生成には長時間かかります。")

    print(f"Loading {args.model_dir} (device={device}, dtype={dtype}) ...")
    pipe = MossSoundEffectPipeline.from_pretrained(
        args.model_dir,
        torch_dtype=dtype,
        device=device,
    )

    audio = pipe(
        prompt=args.prompt,
        seconds=args.seconds,
        num_inference_steps=args.steps,
        cfg_scale=args.cfg_scale,
        seed=args.seed,
    )

    output_path = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    torchaudio.save(output_path, audio[0].detach().cpu(), pipe.sample_rate)
    print(f"Saved: {output_path}")


if __name__ == "__main__":
    main()
