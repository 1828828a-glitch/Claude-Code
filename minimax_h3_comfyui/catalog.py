"""Comfy-Org/MiniMax-H3 の再配布ファイル一覧と、VRAM 別プリセットの定義。

ファイル名・サイズは Hugging Face の Comfy-Org/MiniMax-H3 リポジトリの実データ
（2026-08 時点）。サイズはバイト単位。
"""

REPO_ID = "Comfy-Org/MiniMax-H3"
REVISION = "main"

# リポジトリ内のパス（ComfyUI/models/ 以下の配置とそのまま一致する）-> バイト数
FILES = {
    "diffusion_models/minimax_h3_fl2va_bf16.safetensors": 66280487368,
    "diffusion_models/minimax_h3_fl2va_int8_convrot.safetensors": 34038892334,
    "diffusion_models/minimax_h3_fl2va_pruned_bf16.safetensors": 40225724176,
    "diffusion_models/minimax_h3_fl2va_pruned_fp8_scaled.safetensors": 20958205608,
    "diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors": 20970379616,
    "diffusion_models/minimax_h3_ref2va_bf16.safetensors": 66280487368,
    "diffusion_models/minimax_h3_ref2va_int8_convrot.safetensors": 34038894550,
    "diffusion_models/minimax_h3_ref2va_pruned_bf16.safetensors": 40225724176,
    "diffusion_models/minimax_h3_ref2va_pruned_fp8_scaled.safetensors": 20958205608,
    "diffusion_models/minimax_h3_ref2va_pruned_int8_convrot.safetensors": 20970379616,
    "loras/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors": 1956192992,
    "loras/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors": 1956193000,
    "loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors": 1956193000,
    "text_encoders/qwen3vl_32b_minimax_h3_bf16.safetensors": 51506295256,
    "text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors": 27141342152,
    "text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors": 15687142551,
    "vae/minimax_h3_audio_vae_fp32.safetensors": 605254808,
    "vae/minimax_h3_video_vae_fp16.safetensors": 5207808496,
}

# ファイル名 -> LFS の sha256。--verify で完全性チェックに使う。
SHA256 = {
    "diffusion_models/minimax_h3_fl2va_bf16.safetensors": "907d4add438438ec1544f5240c3b38532ed934fe6be75677a6bbda2a6fdd6182",
    "diffusion_models/minimax_h3_fl2va_int8_convrot.safetensors": "7ad4c73e6e378b822ffd1629f27f632d3787d95f5e468e3af958f98c58df96a5",
    "diffusion_models/minimax_h3_fl2va_pruned_bf16.safetensors": "a32572fb90b5508b201ec7c2eddcc184b13ddfd3c6f6d2cf06a0b46535d541b4",
    "diffusion_models/minimax_h3_fl2va_pruned_fp8_scaled.safetensors": "12944c1f7791637e7de12208aef04da82bd26b95271b1b47d817364315ade993",
    "diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors": "e889202c41dafb67b10d67b97f0d8541508036a6090af23425a5c2615d03c47a",
    "diffusion_models/minimax_h3_ref2va_bf16.safetensors": "e32c54c1a7b4f5f397f195cea267ccb18806303bb665678c4bee60953bdf3026",
    "diffusion_models/minimax_h3_ref2va_int8_convrot.safetensors": "9eef934046a0671bc8a5daf87100705e1478419c574cfde70c50fbe6885f76a9",
    "diffusion_models/minimax_h3_ref2va_pruned_bf16.safetensors": "37c0da793e20ca735272ec2be655f08a2e10f97a3ec8fdfb40f5b39a736ed6fe",
    "diffusion_models/minimax_h3_ref2va_pruned_fp8_scaled.safetensors": "f86f2f79ebd2d76eb8eeb46091e83982e6ff51d255747e7b16e92834b392b8e9",
    "diffusion_models/minimax_h3_ref2va_pruned_int8_convrot.safetensors": "9255f52b6677845ad238f20dfaafa94727053694127ab7f255c048f0f9365779",
    "loras/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors": "c396a9a06f58399e9df9754b18299818d84a2ddd371724ba48fe4a41221437dc",
    "loras/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors": "2339acdf19bfe123f46b971ea35d367a84adb85de43627e1eceafa5a5b2b111e",
    "loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors": "5b9ab5ade15d0775676d01a907268a69a1468dc6033b3b0d3ded5502f3ebb84c",
    "text_encoders/qwen3vl_32b_minimax_h3_bf16.safetensors": "600d567f6a9629c8574e8e7041b199bdd9c59a986afa7906910a81919610607d",
    "text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors": "bc2ced0fbea64757fa9acddccfc0b3f4819d1dcf1da6c124d690d368be283923",
    "text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors": "35a88d51044231fe332301d7a62aa81e3f2cba62febeb446e2c1e3e0ef76f2c6",
    "vae/minimax_h3_audio_vae_fp32.safetensors": "8e505d95dd1561d47abd43d4238fd40d9bb1ae9e147ed0a4cba778d76ae4db48",
    "vae/minimax_h3_video_vae_fp16.safetensors": "7c1f131492e7eddacaac9069a61b81bdd39de5cc96561e677c5eab1cdce5e522",
}

# どの構成でも必須の VAE
VAE_FILES = [
    "vae/minimax_h3_video_vae_fp16.safetensors",
    "vae/minimax_h3_audio_vae_fp32.safetensors",
]

# タスク種別 -> (拡散モデルのファイル名テンプレ, turbo LoRA)
TASKS = {
    # 先頭/末尾フレーム指定。画像を繋がなければ t2v としても動く
    "fl2va": {
        "stem": "minimax_h3_fl2va",
        "turbo_lora": "loras/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors",
        "desc": "text2video / 先頭・末尾フレーム指定の image2video",
    },
    # 画像・動画・音声を最大12ファイルまで参照させる omni-reference モード
    "ref2va": {
        "stem": "minimax_h3_ref2va",
        "turbo_lora": "loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors",
        "desc": "参照画像/動画/音声を渡す reference2video",
    },
}

# 量子化の選択肢。優先度が高い順に並べてある。
#   requires_cu130: int8_convrot カーネルは PyTorch cu130 ビルドが前提
#   min_sm:         fp8 は Ada (sm89) 以降でないと実質使えない
QUANTS = {
    "int8_convrot": {"requires_cu130": True, "min_sm": 80, "pruned_only": False},
    "fp8_scaled": {"requires_cu130": False, "min_sm": 89, "pruned_only": True},
    "bf16": {"requires_cu130": False, "min_sm": 80, "pruned_only": False},
}

TEXT_ENCODERS = {
    "nvfp4_awq": {
        "file": "text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
        # Comfy-Org の README 通り、この nvfp4 版は Blackwell 必須ではない
        "requires_cu130": False,
        "min_sm": 80,
    },
    "int8_convrot": {
        "file": "text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
        "requires_cu130": True,
        "min_sm": 80,
    },
    "bf16": {
        "file": "text_encoders/qwen3vl_32b_minimax_h3_bf16.safetensors",
        "requires_cu130": False,
        "min_sm": 80,
    },
}

# VRAM 帯ごとのプリセット。min_vram_gb は「そのプリセットを勧める下限」。
# ComfyUI は使わない重みを system RAM / ディスクへ退避するので、VRAM が
# 足りなくても RAM に余裕があれば動くことはある（その分だけ遅くなる）。
PRESETS = [
    {
        "name": "max",
        "min_vram_gb": 80,
        "pruned": False,
        "quant": "bf16",
        "text_encoder": "bf16",
        "desc": "無量子化。H100/B200 クラス向け",
    },
    {
        "name": "high",
        "min_vram_gb": 40,
        "pruned": False,
        "quant": "int8_convrot",
        "text_encoder": "int8_convrot",
        "desc": "pruned なしの INT8。A100 48GB / RTX 6000 Ada クラス向け",
    },
    {
        "name": "mid",
        "min_vram_gb": 20,
        "pruned": True,
        "quant": "int8_convrot",
        "text_encoder": "nvfp4_awq",
        "desc": "pruned + INT8。RTX 4090 / 5090 (24-32GB) 向け。公式テンプレの既定",
    },
    {
        "name": "low",
        "min_vram_gb": 0,
        "pruned": True,
        "quant": "int8_convrot",
        "text_encoder": "nvfp4_awq",
        "desc": "pruned + INT8 + turbo LoRA。16GB 以下は RAM へのオフロード前提",
    },
]

WORKFLOW_TEMPLATES = {
    "video_minimax_h3_t2v.json": "text2video",
    "video_minimax_h3_i2v.json": "image2video (fl2va)",
    "video_minimax_h3_r2v.json": "reference2video (ref2va)",
}
WORKFLOW_BASE_URL = (
    "https://raw.githubusercontent.com/Comfy-Org/workflow_templates/main/templates/"
)


def diffusion_file(task: str, pruned: bool, quant: str) -> str:
    """タスク・pruned 有無・量子化からリポジトリ内のパスを組み立てる。"""
    stem = TASKS[task]["stem"]
    parts = [stem]
    if pruned:
        parts.append("pruned")
    parts.append(quant)
    path = f"diffusion_models/{'_'.join(parts)}.safetensors"
    if path not in FILES:
        raise KeyError(f"そのような配布ファイルはありません: {path}")
    return path


def preset_by_name(name: str) -> dict:
    for preset in PRESETS:
        if preset["name"] == name:
            return dict(preset)
    raise KeyError(f"未知のプリセット: {name}")


def preset_for_vram(vram_gb: float | None) -> dict:
    """VRAM 容量から推奨プリセットを選ぶ。不明なら安全側 (low) に倒す。"""
    if vram_gb is None:
        return preset_by_name("low")
    for preset in PRESETS:
        if vram_gb >= preset["min_vram_gb"]:
            return dict(preset)
    return preset_by_name("low")
