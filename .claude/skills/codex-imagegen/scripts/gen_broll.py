#!/usr/bin/env python3
"""シーン定義 JSON から B-roll 画像をまとめて生成する。

各シーンを gen_image.sh 経由で Codex CLI に投げ、結果を manifest.json に残す。
生成済みのシーンはスキップするので、失敗したぶんだけ再実行すればよい。

usage:
    python3 gen_broll.py broll.json [--force] [--concurrency N] [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
GEN_IMAGE = SCRIPT_DIR / "gen_image.sh"


def load_config(path: Path) -> dict:
    try:
        config = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        sys.exit(f"gen_broll.py: 設定ファイルがありません: {path}")
    except json.JSONDecodeError as exc:
        sys.exit(f"gen_broll.py: JSON を読めません ({path}): {exc}")

    if not isinstance(config, dict):
        sys.exit("gen_broll.py: トップレベルはオブジェクトである必要があります")

    scenes = config.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        sys.exit("gen_broll.py: `scenes` が空です")

    seen: set[str] = set()
    for index, scene in enumerate(scenes):
        if not isinstance(scene, dict):
            sys.exit(f"gen_broll.py: scenes[{index}] がオブジェクトではありません")
        if not scene.get("prompt"):
            sys.exit(f"gen_broll.py: scenes[{index}] に `prompt` がありません")
        scene_id = str(scene.get("id") or f"s{index + 1:02d}")
        if scene_id in seen:
            sys.exit(f"gen_broll.py: id が重複しています: {scene_id}")
        seen.add(scene_id)
        scene["id"] = scene_id

    return config


def build_command(scene: dict, config: dict, out_dir: Path, args) -> tuple[Path, list[str]]:
    out_path = out_dir / f"{scene['id']}.png"
    cmd = [
        str(GEN_IMAGE),
        "--out", str(out_path),
        "--aspect", str(scene.get("aspect") or config.get("aspect") or "16:9"),
        "--retries", str(scene.get("retries", config.get("retries", 2))),
        "--timeout", str(scene.get("timeout", config.get("timeout", 300))),
    ]
    style = scene.get("style") or config.get("style")
    if style:
        cmd += ["--style", str(style)]
    if args.force:
        cmd.append("--force")
    if args.dry_run:
        cmd.append("--dry-run")
    cmd += ["--", str(scene["prompt"])]
    return out_path, cmd


def run_scene(scene: dict, config: dict, out_dir: Path, args) -> dict:
    out_path, cmd = build_command(scene, config, out_dir, args)
    result = {
        "id": scene["id"],
        "prompt": scene["prompt"],
        "path": str(out_path),
        "status": "pending",
    }

    if out_path.exists() and out_path.stat().st_size > 0 and not args.force:
        result["status"] = "skipped"
        print(f"[skip]   {scene['id']} -> {out_path}", flush=True)
        return result

    print(f"[start]  {scene['id']}", flush=True)
    proc = subprocess.run(cmd, capture_output=True, text=True)

    if args.dry_run:
        result["status"] = "dry-run"
        result["command"] = proc.stdout.strip()
        print(f"[dry]    {scene['id']}: {proc.stdout.strip()}", flush=True)
        return result

    if proc.returncode == 0 and out_path.exists() and out_path.stat().st_size > 0:
        result["status"] = "ok"
        print(f"[ok]     {scene['id']} -> {out_path}", flush=True)
    else:
        result["status"] = "failed"
        result["error"] = (proc.stderr or proc.stdout).strip()[-2000:]
        last_line = result["error"].splitlines()[-1] if result["error"] else "(no output)"
        print(f"[failed] {scene['id']}: {last_line}", flush=True)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Codex CLI で B-roll 画像を一括生成する")
    parser.add_argument("config", type=Path, help="シーン定義 JSON")
    parser.add_argument("--force", action="store_true", help="生成済みでも作り直す")
    parser.add_argument("--concurrency", type=int, default=1,
                        help="並列生成数 (default: 1、レート制限に注意。上げても 2〜3 まで)")
    parser.add_argument("--dry-run", action="store_true", help="codex を実行せずコマンドだけ表示")
    args = parser.parse_args()

    if args.concurrency < 1:
        parser.error("--concurrency は 1 以上")
    if not GEN_IMAGE.exists():
        sys.exit(f"gen_broll.py: gen_image.sh が見つかりません: {GEN_IMAGE}")

    config = load_config(args.config)
    scenes = config["scenes"]

    # output_dir は設定ファイルからの相対パスとして解決する
    out_dir = Path(config.get("output_dir", "broll"))
    if not out_dir.is_absolute():
        out_dir = (args.config.resolve().parent / out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"scenes: {len(scenes)}  output: {out_dir}  concurrency: {args.concurrency}")

    if args.concurrency == 1:
        results = [run_scene(s, config, out_dir, args) for s in scenes]
    else:
        with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
            results = list(pool.map(lambda s: run_scene(s, config, out_dir, args), scenes))

    counts: dict[str, int] = {}
    for item in results:
        counts[item["status"]] = counts.get(item["status"], 0) + 1

    manifest = {
        "output_dir": str(out_dir),
        "aspect": config.get("aspect", "16:9"),
        "style": config.get("style"),
        "summary": counts,
        "scenes": results,
    }
    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print("\n" + "  ".join(f"{k}={v}" for k, v in sorted(counts.items())))
    print(f"manifest: {manifest_path}")

    failed = [item["id"] for item in results if item["status"] == "failed"]
    if failed:
        print(f"failed scenes: {', '.join(failed)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
