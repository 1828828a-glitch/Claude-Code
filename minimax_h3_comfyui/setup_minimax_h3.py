#!/usr/bin/env python3
"""MiniMax-H3 (Comfy-Org 再配布版) を、手元の GPU に合う量子化で ComfyUI に導入する。

Comfy-Org/MiniMax-H3 には bf16 / int8_convrot / fp8_scaled / pruned と多数の版が
あり、全部で 500GB を超える。このスクリプトは GPU の VRAM・PyTorch の CUDA
バージョン・compute capability を見て必要な 4〜5 ファイルだけを選び、ComfyUI の
models/ 以下へ落とす。

    python setup_minimax_h3.py                     # 判定結果と落とす予定のファイルを表示
    python setup_minimax_h3.py --download          # 実際にダウンロード
    python setup_minimax_h3.py --preset low --task both --turbo --download
    python setup_minimax_h3.py --list              # 配布ファイル全一覧

依存は標準ライブラリのみ。huggingface_hub が入っていればそちらを使う（速い・
再開が確実）。入っていなければ Range ヘッダによるレジューム付きの HTTP 取得に
フォールバックする。
"""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import catalog  # noqa: E402

GIB = 1024**3


# --------------------------------------------------------------------------
# 環境の検出
# --------------------------------------------------------------------------


class GpuInfo:
    def __init__(self, name=None, vram_gb=None, sm=None, cuda=None, torch_version=None):
        self.name = name
        self.vram_gb = vram_gb
        self.sm = sm  # compute capability を 2 桁の整数にしたもの (例: sm89 -> 89)
        self.cuda = cuda  # PyTorch がビルドされた CUDA バージョン ("13.0" など)
        self.torch_version = torch_version

    @property
    def torch_known(self) -> bool:
        """PyTorch を実際に import できたか。できていなければ量子化の可否は判断しない。"""
        return self.torch_version is not None

    @property
    def has_cu130(self) -> bool:
        if not self.cuda:
            return False
        try:
            major, minor = (int(x) for x in self.cuda.split(".")[:2])
        except ValueError:
            return False
        return (major, minor) >= (13, 0)

    def describe(self) -> str:
        lines = [f"  GPU          : {self.name or '検出できず'}"]
        lines.append(
            f"  VRAM         : {f'{self.vram_gb:.1f} GB' if self.vram_gb else '検出できず'}"
        )
        lines.append(f"  compute cap  : {f'sm{self.sm}' if self.sm else '検出できず'}")
        if self.torch_version:
            lines.append(f"  PyTorch      : {self.torch_version} (CUDA {self.cuda or 'なし'})")
        else:
            lines.append("  PyTorch      : 未検出（この Python からは import できない）")
        return "\n".join(lines)


def detect_gpu() -> GpuInfo:
    """PyTorch から取れるものは PyTorch で、駄目なら nvidia-smi で拾う。"""
    info = GpuInfo()
    try:
        import torch  # type: ignore

        info.torch_version = torch.__version__
        info.cuda = torch.version.cuda
        if torch.cuda.is_available():
            props = torch.cuda.get_device_properties(0)
            info.name = props.name
            info.vram_gb = props.total_memory / GIB
            info.sm = props.major * 10 + props.minor
    except Exception:
        pass

    if info.vram_gb is None:
        try:
            out = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
                capture_output=True,
                text=True,
                timeout=10,
                check=True,
            ).stdout.strip()
            first = out.splitlines()[0]
            name, mib = (part.strip() for part in first.split(","))
            info.name = info.name or name
            info.vram_gb = float(mib) / 1024
        except Exception:
            pass
    return info


COMFY_CANDIDATES = [
    Path.cwd() / "ComfyUI",
    Path.home() / "ComfyUI",
    Path.home() / "comfy" / "ComfyUI",
    Path.home() / "Documents" / "ComfyUI",  # ComfyUI Desktop (macOS/Windows)
    Path("/opt/ComfyUI"),
]


def looks_like_comfy(path: Path) -> bool:
    return (path / "models").is_dir() or (path / "main.py").is_file()


def detect_comfy_path(explicit: str | None) -> Path | None:
    if explicit:
        path = Path(explicit).expanduser().resolve()
        if not looks_like_comfy(path):
            print(f"警告: {path} が ComfyUI のルートに見えません（models/ も main.py もない）")
        return path
    env = os.environ.get("COMFYUI_PATH")
    if env and looks_like_comfy(Path(env).expanduser()):
        return Path(env).expanduser().resolve()
    for candidate in COMFY_CANDIDATES:
        if looks_like_comfy(candidate):
            return candidate.resolve()
    return None


# --------------------------------------------------------------------------
# 構成の決定
# --------------------------------------------------------------------------


def resolve_quant(preset: dict, gpu: GpuInfo) -> tuple[dict, list[str]]:
    """プリセットの希望量子化を、実際に動く組み合わせへ落とし込む。

    int8_convrot は PyTorch cu130 ビルドが前提、fp8_scaled は sm89 以降が前提。
    条件を満たさない場合は自動で降格し、その理由を返す。
    """
    preset = dict(preset)
    notes: list[str] = []

    if not gpu.torch_known:
        # ComfyUI 側の PyTorch をこの Python から見られていない。勝手に降格すると
        # かえって的外れになるので、プリセットの既定のまま進めて注意だけ出す。
        notes.append(
            "PyTorch を検出できないため量子化の判定はしていません。"
            "ComfyUI の venv の python で実行すると環境に合わせて選び直します。"
        )
        return preset, notes

    quant = preset["quant"]
    if quant == "int8_convrot" and not gpu.has_cu130:
        if preset["pruned"] and (gpu.sm is None or gpu.sm >= 89):
            preset["quant"] = "fp8_scaled"
            notes.append(
                "PyTorch が cu130 ビルドでないため int8_convrot -> fp8_scaled に降格。"
                "cu130 版 PyTorch を入れると int8_convrot が使えて品質・速度とも有利。"
            )
        else:
            preset["quant"] = "bf16"
            notes.append(
                "PyTorch が cu130 ビルドでなく fp8 も使えない構成のため bf16 に降格（容量が大きい）。"
            )

    if preset["quant"] == "fp8_scaled" and gpu.sm is not None and gpu.sm < 89:
        preset["quant"] = "bf16"
        notes.append(f"sm{gpu.sm} は fp8 に非対応のため bf16 に降格。")

    encoder = catalog.TEXT_ENCODERS[preset["text_encoder"]]
    if encoder["requires_cu130"] and not gpu.has_cu130:
        preset["text_encoder"] = "nvfp4_awq"
        notes.append("テキストエンコーダも cu130 が要るため nvfp4_awq に変更（Blackwell 不要）。")

    return preset, notes


def build_plan(preset: dict, tasks: list[str], turbo: bool) -> list[str]:
    files: list[str] = []
    for task in tasks:
        files.append(catalog.diffusion_file(task, preset["pruned"], preset["quant"]))
        if turbo:
            files.append(catalog.TASKS[task]["turbo_lora"])
    files.append(catalog.TEXT_ENCODERS[preset["text_encoder"]]["file"])
    files.extend(catalog.VAE_FILES)
    # 重複を消しつつ順序は維持する
    return list(dict.fromkeys(files))


# --------------------------------------------------------------------------
# ダウンロード
# --------------------------------------------------------------------------


def human(nbytes: float) -> str:
    return f"{nbytes / GIB:.2f} GB"


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        while chunk := handle.read(16 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def verify(files: list[str], models_dir: Path) -> int:
    """落とし済みのファイルを sha256 で検証する。壊れている数を返す。"""
    bad = 0
    for name in files:
        path = models_dir / name
        if not path.exists():
            print(f"  未取得: {name}")
            continue
        size = path.stat().st_size
        if size != catalog.FILES[name]:
            print(f"  途中まで: {name} ({human(size)} / {human(catalog.FILES[name])})")
            bad += 1
            continue
        print(f"  照合中: {name} ...", end="", flush=True)
        actual = sha256_of(path)
        if actual == catalog.SHA256[name]:
            print(" OK")
        else:
            print(f" 不一致\n    期待 {catalog.SHA256[name]}\n    実際 {actual}")
            bad += 1
    return bad


def download_with_hub(files: list[str], models_dir: Path) -> bool:
    try:
        from huggingface_hub import hf_hub_download  # type: ignore
    except ImportError:
        return False

    # リポジトリ内のディレクトリ構成が ComfyUI/models/ の構成とそのまま一致するので、
    # local_dir を models/ にすれば配置先も自動的に正しくなる。
    for name in files:
        print(f"  取得中: {name}")
        hf_hub_download(
            repo_id=catalog.REPO_ID,
            revision=catalog.REVISION,
            filename=name,
            local_dir=str(models_dir),
        )
    return True


def download_with_urllib(files: list[str], models_dir: Path) -> None:
    for name in files:
        url = f"https://huggingface.co/{catalog.REPO_ID}/resolve/{catalog.REVISION}/{name}"
        dest = models_dir / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        expected = catalog.FILES[name]

        if dest.exists() and dest.stat().st_size == expected:
            print(f"  済み  : {name}")
            continue

        offset = dest.stat().st_size if dest.exists() else 0
        mode = "ab" if offset else "wb"
        request = urllib.request.Request(url)
        if offset:
            request.add_header("Range", f"bytes={offset}-")
            print(f"  再開  : {name} ({human(offset)} から)")
        else:
            print(f"  取得中: {name} ({human(expected)})")

        try:
            with urllib.request.urlopen(request) as response, open(dest, mode) as handle:
                if offset and response.status != 206:
                    # サーバがレジュームを受けなかった。頭から取り直す。
                    handle.close()
                    dest.unlink()
                    raise urllib.error.HTTPError(url, response.status, "no range support", {}, None)
                done = offset
                while chunk := response.read(8 * 1024 * 1024):
                    handle.write(chunk)
                    done += len(chunk)
                    pct = done / expected * 100 if expected else 0
                    print(f"\r    {human(done)} / {human(expected)}  {pct:5.1f}%", end="")
            print()
        except urllib.error.HTTPError as exc:
            print(f"\n  失敗: {name} ({exc}) — 再実行すれば続きから取得します")
            raise

        actual = dest.stat().st_size
        if actual != expected:
            print(
                f"  警告: サイズが一致しません {name}: {actual} != {expected}。"
                "もう一度実行すると続きから取得します"
            )


def download_workflows(comfy: Path) -> None:
    target = comfy / "user" / "default" / "workflows"
    target.mkdir(parents=True, exist_ok=True)
    for name, desc in catalog.WORKFLOW_TEMPLATES.items():
        url = catalog.WORKFLOW_BASE_URL + name
        print(f"  ワークフロー: {name} ({desc})")
        with urllib.request.urlopen(url) as response:
            (target / name).write_bytes(response.read())
    print(f"  -> {target}")


# --------------------------------------------------------------------------
# 出力
# --------------------------------------------------------------------------


def print_catalog() -> None:
    print(f"{catalog.REPO_ID} の配布ファイル:\n")
    current = None
    for name, size in sorted(catalog.FILES.items()):
        folder = name.split("/")[0]
        if folder != current:
            print(f"[{folder}]")
            current = folder
        print(f"  {human(size):>10}  {name.split('/')[1]}")
    print(f"\n  合計 {human(sum(catalog.FILES.values()))}（全部落とす必要はない）")


def print_presets() -> None:
    print("プリセット:\n")
    for preset in catalog.PRESETS:
        floor = f">= {preset['min_vram_gb']}GB" if preset["min_vram_gb"] else "それ未満"
        pruned = "pruned" if preset["pruned"] else "full"
        print(f"  {preset['name']:<5} VRAM {floor:<8} {pruned}/{preset['quant']}")
        print(f"        text encoder: {preset['text_encoder']} — {preset['desc']}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="MiniMax-H3 (Comfy-Org 再配布版) を GPU に合わせて ComfyUI に導入する",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--comfy", help="ComfyUI のルートパス（省略時は自動検出）")
    parser.add_argument(
        "--preset",
        default="auto",
        choices=["auto", "max", "high", "mid", "low"],
        help="使う構成。auto は VRAM から判定（既定）",
    )
    parser.add_argument(
        "--task",
        default="fl2va",
        choices=["fl2va", "ref2va", "both"],
        help="fl2va=t2v/画像→動画（既定）, ref2va=参照入力, both=両方",
    )
    parser.add_argument("--turbo", action="store_true", help="4step turbo LoRA も落とす")
    parser.add_argument("--workflows", action="store_true", help="公式ワークフローも落とす")
    parser.add_argument("--download", action="store_true", help="実際にダウンロードする")
    parser.add_argument(
        "--verify",
        action="store_true",
        help="取得済みファイルを sha256 で検証する（--download と併用すると取得後に検証）",
    )
    parser.add_argument("--list", action="store_true", help="配布ファイル一覧を表示して終了")
    parser.add_argument("--presets", action="store_true", help="プリセット一覧を表示して終了")
    args = parser.parse_args()

    if args.list:
        print_catalog()
        return 0
    if args.presets:
        print_presets()
        return 0

    print("== 環境 ==")
    gpu = detect_gpu()
    print(gpu.describe())

    comfy = detect_comfy_path(args.comfy)
    print(f"  ComfyUI      : {comfy or '見つからず（--comfy で指定してください）'}")

    print("\n== 構成 ==")
    preset = (
        catalog.preset_for_vram(gpu.vram_gb)
        if args.preset == "auto"
        else catalog.preset_by_name(args.preset)
    )
    chosen = preset["name"]
    preset, notes = resolve_quant(preset, gpu)
    origin = "VRAM から自動選択" if args.preset == "auto" else "指定"
    print(f"  プリセット   : {chosen} ({origin}) — {preset['desc']}")
    print(f"  拡散モデル   : {'pruned' if preset['pruned'] else 'full'} / {preset['quant']}")
    print(f"  テキストenc  : {preset['text_encoder']}")
    for note in notes:
        print(f"  ※ {note}")

    tasks = ["fl2va", "ref2va"] if args.task == "both" else [args.task]
    files = build_plan(preset, tasks, args.turbo)
    total = sum(catalog.FILES[f] for f in files)

    print("\n== 取得するファイル ==")
    for name in files:
        marker = ""
        if comfy and (comfy / "models" / name).exists():
            existing = (comfy / "models" / name).stat().st_size
            marker = " [取得済み]" if existing == catalog.FILES[name] else " [途中まで]"
        print(f"  {human(catalog.FILES[name]):>10}  {name}{marker}")
    print(f"  {'-' * 10}")
    print(f"  {human(total):>10}  合計")

    if comfy:
        free = shutil.disk_usage(comfy).free
        print(f"\n  空き容量     : {human(free)}")
        if free < total * 1.05:
            print("  警告: 空き容量が足りません")

    if gpu.vram_gb is not None and gpu.vram_gb < 16:
        print(
            f"\n  注意: VRAM {gpu.vram_gb:.0f}GB では重みの大半を system RAM から流し込むことに"
            "なります。RAM 64GB 以上と、ComfyUI の --lowvram 起動を推奨。"
        )

    if not args.download and not args.verify:
        print("\n（表示のみ。実際に落とすには --download を付けてください）")
        return 0

    if not comfy:
        print("\nエラー: ComfyUI のパスが分かりません。--comfy で指定してください。")
        return 1

    models_dir = comfy / "models"

    if args.verify and not args.download:
        print("\n== 検証 ==")
        bad = verify(files, models_dir)
        print("  問題なし" if bad == 0 else f"  {bad} 件が不正。--download で取り直してください")
        return 1 if bad else 0

    models_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n== ダウンロード -> {models_dir} ==")
    if not download_with_hub(files, models_dir):
        print("  （huggingface_hub 未導入。標準の HTTP で取得します。"
              "pip install huggingface_hub の方が速いです）")
        download_with_urllib(files, models_dir)

    if args.verify:
        print("\n== 検証 ==")
        bad = verify(files, models_dir)
        if bad:
            print(f"  {bad} 件が不正。もう一度 --download してください")
            return 1
        print("  問題なし")

    if args.workflows:
        print("\n== ワークフロー ==")
        download_workflows(comfy)

    print("\n完了。ComfyUI を再起動してワークフローを読み込んでください。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
