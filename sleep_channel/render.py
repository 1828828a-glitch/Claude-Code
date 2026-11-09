"""動画の組み立て（ffmpeg）

画像は章に合わせて数分おきに切り替え、切り替えのたびに黒へゆっくり溶かす。
images/ の画像名を ch03_xxx.jpg のように章番号で始めると第3章の間に表示し、
番号のない画像は章番号付きの画像がない章で順番に使う。

2時間の静止画を24fpsでそのまま符号化すると数十分かかる。そこで画像ごとに
フェードイン、30秒の静止、端数、フェードアウトの短い部品だけを符号化し、
静止部分は同じ部品を並べてストリームコピーでつなぐ。符号化する量が画像の枚数×1分程度で済む。
"""

from dataclasses import dataclass
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import subprocess

from sleep_channel.voice import Timeline

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
FADE_SECONDS = 1.5
UNIT_SECONDS = 30
NARRATION_LUFS = -20.0  # 寝る前に聞くので、YouTubeの基準（-14）より静かめにそろえる


class RenderError(Exception):
    """動画の組み立てに失敗したとき"""


def ffmpeg_available() -> bool:
    return bool(shutil.which("ffmpeg") and shutil.which("ffprobe"))


def _run(cmd: list[str], output: Path | None = None) -> None:
    """output を渡すと一時ファイルに書いてから置き換える。中断されても壊れた部品を再利用しない"""
    tmp = output.with_name(f".{output.stem}.tmp{output.suffix}") if output else None
    if tmp:
        cmd = cmd + [str(tmp)]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        if tmp:
            tmp.replace(output)
    except FileNotFoundError as e:
        raise RenderError("ffmpeg が見つかりません。インストールしてください。") from e
    except subprocess.CalledProcessError as e:
        tail = "\n".join((e.stderr or "").strip().splitlines()[-8:])
        raise RenderError(f"ffmpeg が失敗しました：\n{tail}") from e


def probe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout
    return float(json.loads(out)["format"]["duration"])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 画像の割り当て
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@dataclass
class SourceImage:
    path: Path
    chapter: int | None


@dataclass
class Slide:
    image: Path
    start: float
    end: float


def collect_images(image_dir: Path) -> list[SourceImage]:
    if not image_dir.exists():
        return []
    images = []
    for path in sorted(image_dir.iterdir()):
        if path.suffix.lower() not in IMAGE_EXT:
            continue
        m = re.match(r"ch(\d+)", path.name, re.IGNORECASE)
        images.append(SourceImage(path, int(m.group(1)) if m else None))
    return images


def plan_slides(chapters: list[dict], total: float, images: list[SourceImage],
                slide_seconds: float) -> list[Slide]:
    """章ごとの時間帯に画像を割り当てる。最終章は total（余韻を含む）まで伸ばす"""
    if not images:
        raise RenderError("images/ に画像がありません。")
    numbers = {c["number"] for c in chapters}
    specific: dict[int, list[SourceImage]] = {}
    for img in images:
        if img.chapter in numbers:
            specific.setdefault(img.chapter, []).append(img)
    pool = [img for img in images if img.chapter not in numbers] or images

    slides: list[Slide] = []
    pool_index = 0
    for i, ch in enumerate(chapters):
        start = 0.0 if i == 0 else ch["start"]
        end = chapters[i + 1]["start"] if i + 1 < len(chapters) else total
        if end <= start:
            continue
        chosen = specific.get(ch["number"])
        if not chosen:
            count = max(1, round((end - start) / slide_seconds))
            chosen = [pool[(pool_index + j) % len(pool)] for j in range(count)]
            pool_index += count
        step = (end - start) / len(chosen)
        for j, img in enumerate(chosen):
            slides.append(Slide(img.path, start + j * step, start + (j + 1) * step))

    merged: list[Slide] = []
    for s in slides:
        if merged and merged[-1].image == s.image:
            merged[-1].end = s.end
        else:
            merged.append(s)
    return merged


def frame_plan(slides: list[Slide], fps: int) -> list[tuple[Path, int]]:
    """累積時間からフレーム境界を決め、端数の誤差が積み重ならないようにする"""
    bounds = [round(s.start * fps) for s in slides] + [round(slides[-1].end * fps)]
    plan = []
    for s, a, b in zip(slides, bounds, bounds[1:]):
        if b > a:
            plan.append((s.image, b - a))
    return plan


def clip_parts(frames: int, fps: int, unit_seconds: int = UNIT_SECONDS,
               fade_seconds: float = FADE_SECONDS) -> list[tuple[str, int]]:
    """1枚の表示を（種類, フレーム数）の部品に分ける。短い表示ではフェードを縮める"""
    fade = min(round(fade_seconds * fps), frames // 3)
    still = frames - 2 * fade
    unit = unit_seconds * fps
    parts: list[tuple[str, int]] = []
    if fade:
        parts.append(("in", fade))
    parts += [("still", unit)] * (still // unit)
    if still % unit:
        parts.append(("still", still % unit))
    if fade:
        parts.append(("out", fade))
    return parts


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ffmpeg
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def prepare_image(src: Path, work: Path, size: tuple[int, int], dim: float) -> Path:
    """画面サイズに合わせる。縦長の絵画は切り取らず、ぼかした同じ絵で左右を埋める"""
    w, h = size
    stat = src.stat()
    key = hashlib.sha1(f"{src.resolve()}:{stat.st_mtime_ns}:{stat.st_size}:{w}x{h}:{dim}".encode()).hexdigest()[:16]
    out = work / f"img_{key}.png"
    if out.exists():
        return out
    radius = max(2, min(w, h) // 50)
    graph = (
        f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
        f"boxblur={radius}:2,eq=brightness={dim - 0.1:.3f}[bg];"
        f"[0:v]scale={w}:{h}:force_original_aspect_ratio=decrease,eq=brightness={dim:.3f}[fg];"
        f"[bg][fg]overlay=(W-w)/2:(H-h)/2,format=rgb24"
    )
    _run(["ffmpeg", "-hide_banner", "-y", "-i", str(src), "-filter_complex", graph,
          "-frames:v", "1"], output=out)
    return out


def placeholder_image(work: Path, size: tuple[int, int]) -> Path:
    out = work / f"placeholder_{size[0]}x{size[1]}.png"
    if not out.exists():
        _run(["ffmpeg", "-hide_banner", "-y", "-f", "lavfi",
              "-i", f"color=c=0x14171d:s={size[0]}x{size[1]}", "-frames:v", "1"], output=out)
    return out


def encode_part(image: Path, kind: str, frames: int, fps: int, out: Path, crf: int) -> None:
    vf = f"format=yuv420p,loop=loop={frames - 1}:size=1:start=0,setpts=N/{fps}/TB"
    if kind == "in":
        vf += f",fade=t=in:s=0:n={frames}"
    elif kind == "out":
        vf += f",fade=t=out:s=0:n={frames}"
    _run([
        "ffmpeg", "-hide_banner", "-y", "-i", str(image), "-vf", vf, "-r", str(fps),
        "-frames:v", str(frames), "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage",
        "-crf", str(crf), "-bf", "0", "-g", str(UNIT_SECONDS * fps),
        "-x264-params", "repeat-headers=1", "-f", "mpegts",
    ], output=out)


def build_concat_list(plan: list[tuple[Path, int]], work: Path, fps: int, crf: int, log=print) -> Path:
    clips = work / "clips"
    clips.mkdir(parents=True, exist_ok=True)
    entries: list[Path] = []
    for n, (image, frames) in enumerate(plan, 1):
        for kind, count in clip_parts(frames, fps):
            part = clips / f"{image.stem}_{fps}_{crf}_{kind}_{count}.ts"
            if not part.exists():
                encode_part(image, kind, count, fps, part, crf)
            entries.append(part)
        if n % 5 == 0 or n == len(plan):
            log(f"  画像 {n}/{len(plan)}")
    listing = work / "concat.txt"
    listing.write_text(
        "".join("file '{}'\n".format(str(p.resolve()).replace("'", "'\\''")) for p in entries),
        encoding="utf-8",
    )
    return listing


def find_bgm(project_dir: Path, root: Path) -> Path | None:
    for folder in (project_dir, root):
        for path in sorted(folder.glob("bgm.*")):
            if path.suffix.lower() in {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}:
                return path
    return None


def audio_graph(total: float, has_bgm: bool, bgm_offset_db: float) -> str:
    fade_out = min(8.0, total / 4)
    narration = (
        f"[1:a]aresample=48000,apad,"
        f"loudnorm=I={NARRATION_LUFS}:TP=-2:LRA=11,aresample=48000"
    )
    tail = f"afade=t=in:d=3,afade=t=out:st={total - fade_out:.3f}:d={fade_out:.3f}[a]"
    if not has_bgm:
        return f"{narration},{tail}"
    bgm_lufs = NARRATION_LUFS - bgm_offset_db
    return (
        f"{narration}[n];"
        f"[2:a]aresample=48000,atrim=0:{total:.3f},asetpts=PTS-STARTPTS,"
        f"loudnorm=I={bgm_lufs}:TP=-9:LRA=7,aresample=48000[b];"
        f"[n][b]amix=inputs=2:duration=first:normalize=0,{tail}"
    )


def render_video(project, size: tuple[int, int] = (1920, 1080), fps: int = 24, crf: int = 26,
                 slide_seconds: float = 240, tail_seconds: float = 0, bgm: Path | None = None,
                 bgm_offset_db: float = 14.0, dim: float = -0.05, placeholder: bool = False,
                 log=print) -> Path:
    if not ffmpeg_available():
        raise RenderError("ffmpeg と ffprobe が必要です。")
    if size[0] % 2 or size[1] % 2:
        raise RenderError("画面サイズは縦横とも偶数にしてください。")
    timeline = Timeline.load(project.audio_dir / "timeline.json")
    narration = project.audio_dir / "narration.wav"
    if not narration.exists():
        raise RenderError("audio/narration.wav がありません。voice を実行してください。")

    bgm = bgm or find_bgm(project.dir, project.root)
    if tail_seconds and not bgm:
        log("  環境音がないので、ナレーション後の余韻は付けません。")
        tail_seconds = 0
    total = timeline.total + tail_seconds

    work = project.dir / "work"
    work.mkdir(parents=True, exist_ok=True)
    sources = collect_images(project.image_dir)
    if not sources:
        if not placeholder:
            raise RenderError(
                f"{project.image_dir} に画像を入れてください（章に合わせるなら ch01_名前.jpg）。"
                "画像なしで試すときは --placeholder を付けます。"
            )
        sources = [SourceImage(placeholder_image(work, size), None)]

    log(f"  画像を整えています（{len(sources)}枚）")
    prepared = [SourceImage(prepare_image(s.path, work, size, dim), s.chapter) for s in sources]
    slides = plan_slides(timeline.chapters, total, prepared, slide_seconds)
    plan = frame_plan(slides, fps)
    log(f"  映像を組み立てています（切り替え{len(plan)}回）")
    listing = build_concat_list(plan, work, fps, crf, log=log)

    project.out_dir.mkdir(parents=True, exist_ok=True)
    out = project.out_dir / "video.mp4"
    cmd = ["ffmpeg", "-hide_banner", "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
           "-i", str(narration)]
    if bgm:
        cmd += ["-stream_loop", "-1", "-i", str(bgm)]
    cmd += [
        "-filter_complex", audio_graph(total, bool(bgm), bgm_offset_db),
        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
        "-t", f"{total:.3f}", "-movflags", "+faststart", str(out),
    ]
    log("  音声を重ねて書き出しています" + (f"（環境音：{bgm.name}）" if bgm else ""))
    _run(cmd)
    return out


def format_duration(seconds: float) -> str:
    seconds = int(math.floor(seconds))
    h, rest = divmod(seconds, 3600)
    m, s = divmod(rest, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"
