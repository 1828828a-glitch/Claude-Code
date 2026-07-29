#!/usr/bin/env python3
"""B-roll 画像 + テロップ台本から mp4 を組み立てる。

生成済みの B-roll 画像（gen_broll.py の出力）を script.json のシーン定義に従って
Ken Burns（ゆっくりズーム）+ テロップ + クロスフェードでつなぎ、1本の mp4 にする。

usage:
    python3 make_video.py script.json [-o out.mp4] [--bgm bgm.m4a] [--keep-temp]

必要なもの: ffmpeg / ffprobe
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# 日本語テロップ用フォント。上から順に、最初に見つかったものを使う。
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
    "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf",
    "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
    "C:/Windows/Fonts/meiryo.ttc",
]

STYLES = {
    "normal": {"fontsize": 54, "y": "h-text_h-110", "line_spacing": 18},
    "title": {"fontsize": 86, "y": "(h-text_h)/2", "line_spacing": 26},
}


def find_font() -> str:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return path
    sys.exit(
        "make_video.py: 日本語フォントが見つかりません。\n"
        "  FONT_CANDIDATES に手元のフォントのパスを追加してください。"
    )


def require(tool: str) -> None:
    if not shutil.which(tool):
        sys.exit(f"make_video.py: `{tool}` が見つかりません (brew install ffmpeg / apt install ffmpeg)")


def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        tail = "\n".join(proc.stderr.strip().splitlines()[-15:])
        sys.exit(f"make_video.py: ffmpeg 失敗\n$ {' '.join(cmd[:6])} ...\n{tail}")


def escape_drawtext_path(path: Path) -> str:
    """drawtext のオプション値として使えるようにパスをエスケープする。"""
    return str(path).replace("\\", "/").replace(":", r"\:").replace("'", r"\'")


def build_scene_clip(
    scene: dict, index: int, image: Path, out: Path, cfg: dict, font: str, tmp: Path
) -> None:
    width, height = cfg["width"], cfg["height"]
    fps = cfg["fps"]
    duration = float(scene.get("duration", 4.0))
    frames = max(int(round(duration * fps)), 1)

    # Ken Burns。ズーム前に少し大きめへ引き伸ばしておかないと 1px 単位のガタつきが出る。
    # 倍率を上げるほど滑らかになるがフレームあたりのスケーリング負荷が増える。ズーム量を
    # 賄えるだけの余白（zoom_span 分）があれば十分なので 1.4 倍に留める。
    zoom_span = 0.18
    upscale = 1.4
    src_w, src_h = int(width * upscale) // 2 * 2, int(height * upscale) // 2 * 2

    if index % 2 == 0:
        zoom = f"min(zoom+{zoom_span / frames:.6f},{1 + zoom_span:.3f})"
    else:  # 偶数/奇数で寄りと引きを交互にして単調さを消す
        zoom = f"if(eq(on,0),{1 + zoom_span:.3f},max(zoom-{zoom_span / frames:.6f},1.0))"

    filters = [
        f"scale={src_w}:{src_h}:force_original_aspect_ratio=increase",
        f"crop={src_w}:{src_h}",
        f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
        f":d={frames}:s={width}x{height}:fps={fps}",
        "setsar=1",
    ]

    telop = scene.get("telop")
    if telop:
        style = STYLES.get(scene.get("style", "normal"), STYLES["normal"])
        # 日本語をコマンドラインに直接埋めるとエスケープが破綻するので textfile で渡す。
        text_file = tmp / f"telop_{scene['id']}.txt"
        text_file.write_text(telop.replace("\\n", "\n"), encoding="utf-8")
        filters.append(
            f"drawtext=fontfile='{escape_drawtext_path(Path(font))}'"
            f":textfile='{escape_drawtext_path(text_file)}'"
            f":fontcolor=white:fontsize={style['fontsize']}"
            f":line_spacing={style['line_spacing']}"
            f":borderw=5:bordercolor=black@0.85"
            f":shadowcolor=black@0.5:shadowx=2:shadowy=3"
            f":x=(w-text_w)/2:y={style['y']}"
        )

    # 静止画は 1 フレームだけ入力し、尺は zoompan の d と -frames:v で作る。
    # `-loop 1 -t` で入力側から尺を作ると、入力フレーム 1 枚ごとに zoompan が d フレームを
    # 吐くため、必要な枚数の 100 倍以上をレンダリングすることになり桁違いに遅くなる。
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(image),
        "-vf", ",".join(filters),
        "-frames:v", str(frames),
        # 連結時に再エンコードされる中間ファイルなので、速度優先＋高ビットレートで逃がす
        "-r", str(fps), "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
        "-pix_fmt", "yuv420p", str(out),
    ])


def concat_with_xfade(clips: list[Path], durations: list[float], out: Path, cfg: dict) -> float:
    """クロスフェードでつなぐ。戻り値は完成尺（秒）。"""
    transition = float(cfg["transition"])
    if transition <= 0 or len(clips) == 1:
        listing = cfg["tmp"] / "concat.txt"
        listing.write_text("".join(f"file '{c}'\n" for c in clips), encoding="utf-8")
        run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
             "-i", str(listing), "-c", "copy", str(out)])
        return sum(durations)

    inputs: list[str] = []
    for clip in clips:
        inputs += ["-i", str(clip)]

    # xfade は「前のクリップの終わり際に次を重ねる」ので、重ねたぶん総尺が縮む。
    steps: list[str] = []
    label = "0:v"
    offset = 0.0
    for i in range(1, len(clips)):
        offset += durations[i - 1] - transition
        nxt = f"v{i}"
        steps.append(
            f"[{label}][{i}:v]xfade=transition=fade:duration={transition}:offset={offset:.3f}[{nxt}]"
        )
        label = nxt

    total = sum(durations) - transition * (len(clips) - 1)
    run([
        "ffmpeg", "-y", "-loglevel", "error", *inputs,
        "-filter_complex", ";".join(steps), "-map", f"[{label}]",
        "-r", str(cfg["fps"]), "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", str(out),
    ])
    return total


def add_audio(video: Path, out: Path, duration: float, bgm: Path | None) -> None:
    """無音でも音声トラックは付ける（無いと再生できないプレイヤーがある）。"""
    if bgm:
        run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(video), "-i", str(bgm),
            "-filter_complex", f"[1:a]afade=t=out:st={max(duration - 2, 0):.2f}:d=2[a]",
            "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-shortest", str(out),
        ])
    else:
        run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(video), "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
            "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
            "-shortest", str(out),
        ])


def main() -> int:
    parser = argparse.ArgumentParser(description="B-roll 画像から mp4 を組み立てる")
    parser.add_argument("script", type=Path, help="台本 JSON")
    parser.add_argument("-o", "--output", type=Path, help="出力 mp4 (default: <script名>.mp4)")
    parser.add_argument("--bgm", type=Path, help="BGM 音声ファイル (任意)")
    parser.add_argument("--keep-temp", action="store_true", help="中間クリップを残す")
    args = parser.parse_args()

    require("ffmpeg")
    require("ffprobe")

    try:
        script = json.loads(args.script.read_text(encoding="utf-8"))
    except FileNotFoundError:
        sys.exit(f"make_video.py: 台本がありません: {args.script}")
    except json.JSONDecodeError as exc:
        sys.exit(f"make_video.py: 台本の JSON を読めません: {exc}")

    scenes = script.get("scenes") or []
    if not scenes:
        sys.exit("make_video.py: `scenes` が空です")

    base = args.script.resolve().parent
    broll_dir = Path(script.get("broll_dir", "assets/broll"))
    if not broll_dir.is_absolute():
        broll_dir = (base / broll_dir).resolve()

    missing = [s["id"] for s in scenes if not (broll_dir / f"{s['id']}.png").exists()]
    if missing:
        sys.exit(
            f"make_video.py: B-roll 画像がありません: {', '.join(missing)}\n"
            f"  探した場所: {broll_dir}\n"
            f"  先に gen_broll.py で生成するか、placeholder_broll.py でダミーを作ってください。"
        )

    width, height = (script.get("resolution", "1920x1080").split("x") + ["1080"])[:2]
    output = args.output or base / f"{args.script.stem}.mp4"

    tmp_dir = Path(tempfile.mkdtemp(prefix="make_video_"))
    cfg = {
        "width": int(width), "height": int(height),
        "fps": int(script.get("fps", 30)),
        "transition": float(script.get("transition", 0.5)),
        "tmp": tmp_dir,
    }
    font = find_font()
    print(f"font: {font}")
    print(f"scenes: {len(scenes)}  {cfg['width']}x{cfg['height']} @ {cfg['fps']}fps")

    try:
        clips, durations = [], []
        for index, scene in enumerate(scenes):
            clip = tmp_dir / f"clip_{index:03d}.mp4"
            print(f"[clip] {scene['id']} ({scene.get('duration', 4.0)}s)", flush=True)
            build_scene_clip(scene, index, broll_dir / f"{scene['id']}.png", clip, cfg, font, tmp_dir)
            clips.append(clip)
            durations.append(float(scene.get("duration", 4.0)))

        print("[concat] クロスフェードで連結", flush=True)
        silent = tmp_dir / "silent.mp4"
        total = concat_with_xfade(clips, durations, silent, cfg)

        print("[audio] 音声トラックを付与", flush=True)
        output.parent.mkdir(parents=True, exist_ok=True)
        add_audio(silent, output, total, args.bgm)
    finally:
        if args.keep_temp:
            print(f"temp: {tmp_dir}")
        else:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    size_mb = output.stat().st_size / 1024 / 1024
    print(f"\ndone: {output}  ({total:.1f}s, {size_mb:.1f}MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
