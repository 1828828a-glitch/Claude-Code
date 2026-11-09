"""概要欄・タイトル・タグ

章の開始位置は実際に合成した音声の長さから計算する。YouTubeのチャプターは
0:00 から始まり、3つ以上、それぞれ10秒以上あるときに有効になる。
"""

from pathlib import Path

from sleep_channel.config import Channel
from sleep_channel.render import ffmpeg_available, format_duration, probe_duration
from sleep_channel.voice import Timeline

TAGS_LIMIT = 500  # YouTubeのタグ欄の合計文字数の上限


def chapter_lines(timeline: Timeline) -> list[str]:
    return [f"{format_duration(c['start'])} {c['title']}" for c in timeline.chapters]


def chapters_valid(timeline: Timeline) -> bool:
    chs = timeline.chapters
    if len(chs) < 3 or chs[0]["start"] != 0:
        return False
    return all(c["end"] - c["start"] >= 10 for c in chs)


def image_credits(image_dir: Path) -> str:
    path = image_dir / "credits.txt"
    return path.read_text(encoding="utf-8").strip() if path.exists() else ""


def tags_line(tags: list[str]) -> str:
    picked, length = [], 0
    for tag in dict.fromkeys(t.strip() for t in tags if t.strip()):
        extra = len(tag) + (1 if picked else 0)
        if length + extra > TAGS_LIMIT:
            break
        picked.append(tag)
        length += extra
    return ",".join(picked)


def build_description(project, channel: Channel, timeline: Timeline) -> str:
    parts = [project.summary or f"{project.theme}について、静かな語りでお話しします。"]
    parts.append("画面を暗くして、音量を小さめにしてお聞きください。")
    if chapters_valid(timeline):
        parts.append("目次\n" + "\n".join(chapter_lines(timeline)))
    credits = ["ナレーションは音声合成で作成しています。"]
    if timeline.credit:
        credits.append(f"音声：{timeline.credit}")
    images = image_credits(project.image_dir)
    if images:
        credits.append(f"画像：\n{images}")
    parts.append("\n".join(credits))
    tags = " ".join(f"#{t}" for t in channel.hashtags[:3])
    if tags:
        parts.append(tags)
    return "\n\n".join(parts)


def write_metadata(project, channel: Channel) -> Path:
    timeline = Timeline.load(project.audio_dir / "timeline.json")
    project.out_dir.mkdir(parents=True, exist_ok=True)
    titles = "\n".join(f"{i}. {t}" for i, t in enumerate(project.title_candidates, 1)) or project.theme
    video = project.out_dir / "video.mp4"
    length = probe_duration(video) if video.exists() and ffmpeg_available() else timeline.total
    text = (
        f"■タイトル案\n{titles}\n\n"
        f"■概要欄\n{build_description(project, channel, timeline)}\n\n"
        f"■タグ\n{tags_line(project.tags + channel.hashtags)}\n\n"
        f"■長さ\n{format_duration(length)}\n"
    )
    if not chapters_valid(timeline):
        text += "\n※章が3つ未満か10秒未満の章があるため、目次（チャプター）は入れていません。\n"
    path = project.out_dir / "metadata.txt"
    path.write_text(text, encoding="utf-8")
    return path
