"""Irodori-TTS でナレーションの各行をまとめて生成する。

台本は narration/*.json。モデルは一度だけ読み込み、できた行は out/narration/<台本名>/<id>.wav に置く。
すでにある行は飛ばすので、言い回しを直した行だけ消して再実行すればよい。

    IRODORI_DIR=/path/to/irodori-tts python narrate_tts.py narration/voices.json narration/chic.json

声は実在の人をまねず、caption（声の説明文）で作る。役ごとに一度だけ caption から声の見本を作り、
以降の行はその見本を参照音声にして同じ声を保つ。
"""
import json
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
IRODORI_DIR = Path(os.environ.get("IRODORI_DIR", HERE.parents[2] / "aratako" / "irodori-tts"))
sys.path.insert(0, str(IRODORI_DIR))

from irodori_tts.inference_runtime import (  # noqa: E402
    InferenceRuntime,
    RuntimeKey,
    SamplingRequest,
    save_wav,
)

CHECKPOINT = os.environ.get("IRODORI_CHECKPOINT", "Aratako/Irodori-TTS-v4.1-Small-MF")
OUT = HERE / "out" / "narration"


def load_runtime():
    from huggingface_hub import hf_hub_download

    ckpt = hf_hub_download(CHECKPOINT, "model.safetensors")
    return InferenceRuntime.from_key(
        RuntimeKey(
            checkpoint=ckpt,
            model_device="cpu",
            codec_repo="Aratako/Semantic-DACVAE-Japanese-32dim",
            model_precision="fp32",
            codec_device="cpu",
            codec_precision="fp32",
            codec_deterministic_encode=True,
            codec_deterministic_decode=True,
            compile_model=False,
            compile_dynamic=False,
            split_rare_tokens=True,
        )
    )


def synth(rt, text, out_path, caption=None, ref=None, seed=0, duration_scale=1.0):
    use_caption = bool(caption)
    req = SamplingRequest(
        text=text,
        caption=caption,
        ref_wav=str(ref) if ref else None,
        ref_wavs=None,
        ref_latent=None,
        ref_latents=None,
        ref_embed=None,
        no_ref=ref is None,
        ref_normalize_db=-16.0,
        ref_ensure_max=True,
        num_candidates=1,
        decode_mode="sequential",
        seconds=None,
        duration_scale=float(duration_scale),
        max_ref_seconds=None,
        max_text_len=None,
        max_caption_len=None,
        num_steps=None,
        cfg_scale_text=3.0,
        cfg_scale_caption=3.0 if use_caption else 0.0,
        cfg_scale_speaker=5.0 if ref else 0.0,
        cfg_guidance_mode="independent",
        cfg_scale=None,
        cfg_min_t=0.5,
        cfg_max_t=1.0,
        truncation_factor=None,
        rescale_k=None,
        rescale_sigma=None,
        context_kv_cache=True,
        speaker_kv_scale=None,
        speaker_kv_min_t=None,
        speaker_kv_max_layers=None,
        speaker_uncond_mode="mask",
        seed=int(seed),
        t_schedule_mode="linear",
        sway_coeff=-1.0,
        trim_tail=True,
        tail_window_size=20,
        tail_std_threshold=0.05,
        tail_mean_threshold=0.1,
        lora_adapter=None,
    )
    res = rt.synthesize(req, log_fn=None)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    save_wav(str(out_path), res.audio, res.sample_rate)
    return res.audio.shape[-1] / res.sample_rate


def main(paths):
    voices = {}
    jobs = []
    for p in paths:
        spec = json.loads(Path(p).read_text())
        voices.update(spec.get("voices", {}))
        name = Path(p).stem
        for line in spec.get("lines", []):
            jobs.append((name, line))

    rt = None

    # 役ごとの声の見本
    for vid, v in voices.items():
        path = OUT / "voices" / f"{vid}.wav"
        v["ref"] = path
        if path.exists():
            continue
        rt = rt or load_runtime()
        t0 = time.time()
        sec = synth(rt, v["sample"], path, caption=v["caption"], ref=None, seed=v.get("seed", 0))
        print(f"voice {vid}: {sec:.1f}s audio in {time.time() - t0:.1f}s", flush=True)

    for name, line in jobs:
        path = OUT / name / f"{line['id']}.wav"
        if path.exists():
            continue
        v = voices[line["voice"]]
        rt = rt or load_runtime()
        t0 = time.time()
        sec = synth(rt, line["say"], path, caption=line.get("caption", v["caption"]), ref=v["ref"],
                    seed=line.get("seed", 0), duration_scale=line.get("duration_scale", 1.0))
        print(f"{name}/{line['id']}: {sec:.1f}s audio in {time.time() - t0:.1f}s", flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
