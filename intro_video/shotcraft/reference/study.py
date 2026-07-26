#!/usr/bin/env python3
"""参考動画を「フレーム」に分解して研究できる形にする。

動画はフレームでできているので、雰囲気とアニメーションを研究したいなら最小単位まで
下ろす。pipeline.md Stage 1 と審美準則 P2 が要求する contact sheet と
motion breakdown の入力を作るためのスクリプト。

やること:
  1. 動画を取得する(YouTube などの URL、またはローカルファイル)
  2. 等間隔で N フレーム抽出する(既定 100)
  3. 4x5 の contact sheet に並べる(既定。1枚 20 コマ = 5枚で 100 コマ)
  4. 動きの速い箇所を見つけるため、隣接フレーム間の差分量も測って出す

使い方:
    python3 study.py <URL または動画パス> --name my-ref
    python3 study.py <...> --frames 120 --tile 4x5

出力は reference/<name>/ 以下:
    source.mp4        取得した動画(URL の場合)
    frames/f###.jpg   抽出したフレーム
    sheet-##.jpg      contact sheet
    motion.json       各フレームの時刻と、直前フレームからの差分量

contact sheet と motion.json を読んでから、手法｜参考片実装｜取舍 の三列表を
DESIGN-SPEC.md に書く。全局に一律適用はしない(P2)。
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


def ffmpeg_bin() -> str:
    if os.environ.get("FFMPEG_BIN"):
        return os.environ["FFMPEG_BIN"]
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def fetch(src: str, dest: Path) -> Path:
    """URL なら落とす。ローカルファイルならそのまま使う。"""
    local = Path(src)
    if local.exists():
        return local

    out = dest / "source.mp4"
    if out.exists():
        print(f"既に取得済み: {out}")
        return out

    if shutil.which("yt-dlp") is None:
        try:
            import yt_dlp  # noqa: F401
        except Exception:
            raise SystemExit("yt-dlp が必要です: pip install yt-dlp")
        cmd = [sys.executable, "-m", "yt_dlp"]
    else:
        cmd = ["yt-dlp"]

    # 研究用途なので 1080p 以下の mp4 で十分。音声は不要
    cmd += ["-f", "bv*[height<=1080][ext=mp4]/bv*[height<=1080]/b", "-o", str(out), src]
    print("取得中:", src)
    subprocess.run(cmd, check=True)
    return out


def probe_duration(ffmpeg: str, path: Path) -> float:
    r = subprocess.run([ffmpeg, "-i", str(path)], capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if "Duration:" in line:
            hms = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = hms.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise SystemExit(f"尺を読めませんでした: {path}")


def extract(ffmpeg: str, video: Path, out_dir: Path, count: int, dur: float) -> list[dict]:
    """等間隔で count 枚抜く。fps 指定ではなく時刻指定にして、尺が違っても枚数を揃える。"""
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("f*.jpg"):
        old.unlink()

    # 末尾ぎりぎりを指すと -ss がデコードできる最終フレームを越えて空振りするので、
    # 後ろに 0.12s の安全余裕を取る。先頭も黒フレームを避けて少し内側から始める。
    tail_guard = min(0.12, dur * 0.02)
    span_start = dur * 0.005
    span_end = max(span_start, dur - tail_guard)

    meta = []
    for i in range(count):
        t = span_start + (span_end - span_start) * (i / max(1, count - 1))
        p = out_dir / f"f{i:03d}.jpg"
        for attempt in range(3):
            subprocess.run(
                [ffmpeg, "-y", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", str(video),
                 "-frames:v", "1", "-q:v", "3", str(p)],
                check=True,
            )
            if p.exists():
                break
            t = max(0.0, t - 0.08)  # まだ空振りするなら少し手前を狙う
        if not p.exists():
            print(f"  警告: {t:.3f}s のフレームが取れなかったので飛ばします")
            continue
        meta.append({"index": i, "t": round(t, 3), "file": p.name})
        if i % 20 == 0:
            print(f"  {i}/{count}")
    return meta


def measure_motion(meta: list[dict], out_dir: Path) -> None:
    """隣接フレームの差分量を測る。動きの激しい区間=見るべき区間を当てるため。"""
    try:
        from PIL import Image, ImageChops, ImageStat
    except Exception:
        print("Pillow が無いので差分測定は省略")
        return

    prev = None
    for m in meta:
        im = Image.open(out_dir / m["file"]).convert("L").resize((160, 90))
        if prev is None:
            m["delta"] = 0.0
        else:
            diff = ImageChops.difference(im, prev)
            m["delta"] = round(ImageStat.Stat(diff).mean[0], 2)
        prev = im


def contact_sheets(meta: list[dict], frames_dir: Path, out: Path, cols: int, rows: int) -> list[Path]:
    from PIL import Image, ImageDraw

    per = cols * rows
    made = []
    cell_w = 480
    label_h = 26

    for start in range(0, len(meta), per):
        chunk = meta[start:start + per]
        first = Image.open(frames_dir / chunk[0]["file"])
        cell_h = round(cell_w * first.height / first.width)
        sheet = Image.new("RGB", (cell_w * cols, (cell_h + label_h) * rows), (16, 16, 15))
        d = ImageDraw.Draw(sheet)
        for k, m in enumerate(chunk):
            im = Image.open(frames_dir / m["file"]).resize((cell_w, cell_h))
            x = (k % cols) * cell_w
            y = (k // cols) * (cell_h + label_h)
            sheet.paste(im, (x, y))
            tag = f"#{m['index']}  {m['t']:.2f}s"
            if m.get("delta"):
                tag += f"  d={m['delta']:.1f}"
            d.text((x + 8, y + cell_h + 5), tag, fill=(200, 198, 190))
        p = out / f"sheet-{start // per:02d}.jpg"
        sheet.save(p, quality=88)
        made.append(p)
        print("sheet:", p.name)
    return made


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("source", help="YouTube などの URL、またはローカル動画パス")
    ap.add_argument("--name", required=True, help="出力ディレクトリ名(参考片の識別子)")
    ap.add_argument("--frames", type=int, default=100, help="抽出するフレーム数(既定100)")
    ap.add_argument("--tile", default="4x5", help="contact sheet の並び(既定 4x5 = 20コマ/枚)")
    args = ap.parse_args()

    cols, rows = (int(x) for x in args.tile.split("x"))
    base = Path(__file__).parent / args.name
    base.mkdir(parents=True, exist_ok=True)

    ffmpeg = ffmpeg_bin()
    video = fetch(args.source, base)
    dur = probe_duration(ffmpeg, video)
    print(f"尺 {dur:.2f}s → {args.frames} フレーム抽出(約 {dur / args.frames:.3f}s 間隔)")

    frames_dir = base / "frames"
    meta = extract(ffmpeg, video, frames_dir, args.frames, dur)
    measure_motion(meta, frames_dir)
    contact_sheets(meta, frames_dir, base, cols, rows)

    (base / "motion.json").write_text(
        json.dumps({"source": args.source, "duration": dur, "frames": meta}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # 差分の大きい上位フレーム = 動きの山。ここを重点的に見る
    top = sorted((m for m in meta if m.get("delta")), key=lambda m: -m["delta"])[:8]
    print("\n動きの大きいフレーム(ここを重点的に見る):")
    for m in top:
        print(f"  #{m['index']:3d}  {m['t']:6.2f}s  delta={m['delta']:.1f}")
    print(f"\n出力: {base}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
