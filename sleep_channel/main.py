"""睡眠用 歴史朗読動画の制作ツール

使い方:
  python -m sleep_channel ideas                       # 題材の候補を出す
  python -m sleep_channel new "江戸の長屋の一日"        # 章立てと全章の台本を作る
  python -m sleep_channel approve 20261108            # review.md を確認して直したら承認
  python -m sleep_channel build 20261108 --engine voicevox   # 音声→動画→概要欄
  python -m sleep_channel status                      # 進み具合

個別に動かすときは script / voice / render / meta を使う。
"""

import argparse
import sys

from sleep_channel.config import chars_per_minute, data_dir, load_channel
from sleep_channel.project import Project, list_projects, new_slug
from sleep_channel.text import estimate_minutes


def _project(slug: str) -> Project:
    return Project.load(slug, data_dir())


def _writer(channel):
    from sleep_channel.writer import ScriptWriter
    return ScriptWriter(channel)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 確認用の一覧
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def write_review(project: Project) -> None:
    cpm = chars_per_minute()
    total = project.total_chars()
    lines = [
        f"# {project.title}",
        "",
        f"テーマ：{project.theme}",
        f"合計 {total:,}字（約{estimate_minutes(total, cpm):.0f}分、1分{cpm}字で計算）",
        "",
        "原稿は script/ の各ファイルを直接直してよい。読み間違いは project.json の readings に足す。",
        "確認が済んだら `python -m sleep_channel approve " + project.slug + "`。",
    ]
    for c in project.chapters:
        text = project.narration(c)
        short = "　※目標より短い" if text and len(text) < project.chapter_chars * 0.75 else ""
        lines += ["", f"## 第{c.number}章 {c.title}（{len(text):,}字）{short}"]
        if not text:
            lines.append("未作成")
            continue
        if c.check_points:
            lines.append("確かめること")
            lines += [f"- [ ] {p}" for p in c.check_points]
        if c.readings:
            lines.append("読み替え")
            lines += [f"- {w} → {r}" for w, r in c.readings.items()]
    (project.dir / "review.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# コマンド
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def cmd_ideas(args) -> None:
    channel = load_channel()
    past = [p.theme for p in list_projects()]
    for i, idea in enumerate(_writer(channel).ideas(args.count, past), 1):
        print(f"{i}. {idea['theme']}")
        print(f"   切り口：{idea['angle']}")
        print(f"   理由：{idea['reason']}")


def write_chapters(project: Project, writer, redo: list[int] | None = None) -> None:
    from sleep_channel.writer import previous_tail

    targets = [c for c in project.chapters if c.number in redo] if redo else project.missing_chapters()
    for c in targets:
        print(f"  第{c.number}章「{c.title}」を書いています")
        text = writer.chapter(project, c, previous_tail(project, c))
        project.save()  # 1章ごとに保存して、途中で止まっても続きから書けるようにする
        note = "（目標より短い）" if len(text) < project.chapter_chars * 0.75 else ""
        print(f"    {len(text):,}字{note}")
    write_review(project)


def cmd_new(args) -> None:
    channel = load_channel()
    root = data_dir()
    chapters = args.chapters
    chapter_chars = round(args.minutes * chars_per_minute() / chapters)
    project = Project(slug=args.slug or new_slug(root), theme=args.theme,
                      target_minutes=args.minutes, chapter_chars=chapter_chars, root=root)
    if project.dir.exists():
        sys.exit(f"{project.dir} はすでにあります。--slug で別の名前にしてください。")
    writer = _writer(channel)
    print(f"章立てを作っています：{args.theme}")
    writer.outline(project, chapters)
    project.save()
    for c in project.chapters:
        print(f"  {c.number:2d}. {c.title}")
    print(f"タイトル案：{project.title}")
    if args.outline_only:
        print(f"\n章立てを {project.dir / 'project.json'} に保存しました。直したら script {project.slug} で本文を書きます。")
        return
    from sleep_channel.writer import WriterError
    try:
        write_chapters(project, writer)
    except WriterError as e:
        raise WriterError(f"{e}\n書けた章までは保存してあります。script {project.slug} で続きから書けます。") from e
    print(f"\n{project.dir / 'review.md'} を確認して、approve {project.slug} で承認してください。")


def cmd_script(args) -> None:
    project = _project(args.slug)
    writer = _writer(load_channel())
    if args.redo:
        project.approved = False
    write_chapters(project, writer, args.redo)
    project.save()
    print(f"{project.dir / 'review.md'} を更新しました。")


def cmd_approve(args) -> None:
    project = _project(args.slug)
    missing = project.missing_chapters()
    if missing:
        sys.exit(f"本文のない章があります：{', '.join(str(c.number) for c in missing)}")
    project.approved = True
    project.save()
    print(f"{project.slug} を承認しました。build {project.slug} --engine <エンジン> で動画にします。")


def _voice(project: Project, args) -> None:
    from sleep_channel.voice import make_engine, synthesize_project

    if not project.approved and not args.skip_review:
        sys.exit(
            "まだ承認されていません。review.md の確認事項を見てから approve してください"
            "（試しに作るだけなら --skip-review）。"
        )
    engine = make_engine(args.engine, speaker=args.speaker, voice=args.voice, speed=args.speed, url=args.url)
    print(f"音声を合成しています（{engine.name}）")
    timeline = synthesize_project(project, load_channel(), engine, force=args.force)
    from sleep_channel.render import format_duration
    print(f"  合計 {format_duration(timeline.total)}")


def _render(project: Project, args) -> None:
    from pathlib import Path
    from sleep_channel.render import format_duration, probe_duration, render_video

    w, h = (int(v) for v in args.size.lower().split("x"))
    print("動画を組み立てています")
    out = render_video(
        project, size=(w, h), fps=args.fps, slide_seconds=args.slide_minutes * 60,
        tail_seconds=args.tail_minutes * 60, bgm=Path(args.bgm) if args.bgm else None,
        placeholder=args.placeholder,
    )
    print(f"  {out}（{format_duration(probe_duration(out))}）")


def _meta(project: Project) -> None:
    from sleep_channel.metadata import write_metadata
    print(f"  {write_metadata(project, load_channel())}")


def cmd_voice(args) -> None:
    _voice(_project(args.slug), args)


def cmd_render(args) -> None:
    _render(_project(args.slug), args)


def cmd_meta(args) -> None:
    _meta(_project(args.slug))


def cmd_build(args) -> None:
    project = _project(args.slug)
    _voice(project, args)
    _render(project, args)
    print("概要欄を書き出しています")
    _meta(project)


def cmd_status(args) -> None:
    cpm = chars_per_minute()
    projects = [_project(args.slug)] if args.slug else list_projects()
    if not projects:
        print(f"プロジェクトがありません（{data_dir()}）。new で作ります。")
        return
    for p in projects:
        done = len(p.chapters) - len(p.missing_chapters())
        chars = p.total_chars()
        steps = [
            f"台本 {done}/{len(p.chapters)}章 {chars:,}字（約{estimate_minutes(chars, cpm):.0f}分）",
            "承認済み" if p.approved else "未承認",
            "音声あり" if (p.audio_dir / "timeline.json").exists() else "音声なし",
            "動画あり" if (p.out_dir / "video.mp4").exists() else "動画なし",
        ]
        print(f"{p.slug}  {p.theme}")
        print("  " + " / ".join(steps))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 引数
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _add_voice_args(p) -> None:
    from sleep_channel.voice import ENGINES
    p.add_argument("--engine", choices=ENGINES, required=True, help="音声合成エンジン")
    p.add_argument("--speaker", type=int, help="VOICEVOX・AivisSpeech のスタイルID")
    p.add_argument("--voice", help="Google の声の名前、ElevenLabs の voice_id")
    p.add_argument("--speed", type=float, help="話す速さ（既定 0.9）")
    p.add_argument("--url", help="VOICEVOX・AivisSpeech のエンジンのURL")
    p.add_argument("--force", action="store_true", help="前回の音声を使わずに作り直す")
    p.add_argument("--skip-review", action="store_true", help="承認前でも合成する（試作用）")


def _add_render_args(p) -> None:
    p.add_argument("--bgm", help="環境音のファイル（既定はプロジェクトか作業フォルダの bgm.*）")
    p.add_argument("--fps", type=int, default=24)
    p.add_argument("--size", default="1920x1080")
    p.add_argument("--slide-minutes", type=float, default=4, help="章番号のない画像を切り替える間隔（分）")
    p.add_argument("--tail-minutes", type=float, default=0, help="ナレーション後に環境音だけ流す長さ（分）")
    p.add_argument("--placeholder", action="store_true", help="画像がなければ無地の背景で作る（試作用）")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m sleep_channel", description="睡眠用 歴史朗読動画の制作ツール")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("ideas", help="題材の候補を出す")
    p.add_argument("--count", type=int, default=10)
    p.set_defaults(func=cmd_ideas)

    p = sub.add_parser("new", help="章立てと台本を作る")
    p.add_argument("theme")
    p.add_argument("--minutes", type=int, default=120, help="動画の長さの目安（分）")
    p.add_argument("--chapters", type=int, default=12)
    p.add_argument("--slug", help="フォルダ名（既定は日付）")
    p.add_argument("--outline-only", action="store_true", help="章立てだけ作って止める")
    p.set_defaults(func=cmd_new)

    p = sub.add_parser("script", help="まだない章の本文を書く")
    p.add_argument("slug")
    p.add_argument("--redo", type=int, nargs="+", help="書き直す章の番号")
    p.set_defaults(func=cmd_script)

    p = sub.add_parser("approve", help="台本の確認が済んだことを記録する")
    p.add_argument("slug")
    p.set_defaults(func=cmd_approve)

    p = sub.add_parser("voice", help="音声を合成する")
    p.add_argument("slug")
    _add_voice_args(p)
    p.set_defaults(func=cmd_voice)

    p = sub.add_parser("render", help="動画を組み立てる")
    p.add_argument("slug")
    _add_render_args(p)
    p.set_defaults(func=cmd_render)

    p = sub.add_parser("meta", help="概要欄とタグを書き出す")
    p.add_argument("slug")
    p.set_defaults(func=cmd_meta)

    p = sub.add_parser("build", help="音声→動画→概要欄をまとめて行う")
    p.add_argument("slug")
    _add_voice_args(p)
    _add_render_args(p)
    p.set_defaults(func=cmd_build)

    p = sub.add_parser("status", help="進み具合を見る")
    p.add_argument("slug", nargs="?")
    p.set_defaults(func=cmd_status)
    return parser


def main(argv: list[str] | None = None) -> None:
    from sleep_channel.render import RenderError
    from sleep_channel.voice import VoiceError
    from sleep_channel.writer import WriterError

    args = build_parser().parse_args(argv)
    try:
        args.func(args)
    except (WriterError, VoiceError, RenderError, FileNotFoundError) as e:
        sys.exit(f"エラー：{e}")
    except KeyboardInterrupt:
        sys.exit("\n中断しました。もう一度実行すると、できているところから続けます。")


if __name__ == "__main__":
    main()
