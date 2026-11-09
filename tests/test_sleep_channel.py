"""睡眠動画制作ツールのテスト

python -m pytest tests/ で実行する。Claude API と音声合成APIは偽物に差し替え、外へは通信しない。
動画の組み立ては ffmpeg があるときだけ実際に書き出して確かめる。
"""

import base64
import io
import json
from pathlib import Path
import subprocess
from types import SimpleNamespace
import wave

import pytest

from sleep_channel import render, voice
from sleep_channel.config import Channel
from sleep_channel.main import main
from sleep_channel.metadata import build_description, chapters_valid, tags_line
from sleep_channel.project import Chapter, Project, list_projects, new_slug
from sleep_channel.render import (
    SourceImage, clip_parts, collect_images, format_duration, frame_plan, plan_slides,
)
from sleep_channel.text import (
    clean_narration, plan_utterances, split_sentences, to_speech_text,
)
from sleep_channel.voice import (
    CHAPTER_GAP, LEAD_IN, DummyEngine, ElevenLabsEngine, GoogleEngine, Timeline,
    VoicevoxEngine, VoiceError, read_wav, synthesize_project,
)
from sleep_channel.writer import ScriptWriter, WriterError, build_chapter_request


def make_project(tmp_path: Path, n: int = 3, chars: int = 120) -> Project:
    p = Project(slug="t1", theme="江戸の長屋の一日", target_minutes=10, chapter_chars=chars, root=tmp_path,
                title_candidates=["【睡眠用】江戸の長屋の一日"], summary="長屋の朝から夜まで。", tags=["江戸"])
    p.chapters = [Chapter(i, f"第{i}の話", f"要約{i}") for i in range(1, n + 1)]
    p.save()
    return p


def wav_bytes(seconds: float, rate: int = 24000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\x00\x00" * int(rate * seconds))
    return buf.getvalue()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 原稿の整形
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_clean_narration_drops_markdown():
    raw = "## 朝\n\n**長屋**の朝は早い。\n- 井戸端に人が集まる。\n\n\n\n1. 次に移ります。"
    assert clean_narration(raw) == "朝\n\n長屋の朝は早い。\n井戸端に人が集まる。\n\n次に移ります。"


def test_speech_text_applies_readings_and_drops_brackets():
    text = "徳川家康（とくがわいえやす）は「江戸」に入った。家康公は静かに笑った。"
    out = to_speech_text(text, {"家康": "いえやす", "徳川家康": "とくがわいえやす"})
    assert out == "とくがわいえやすは江戸に入った。いえやす公は静かに笑った。"


def test_split_sentences_keeps_punctuation():
    assert split_sentences("朝が来ます。雨の音。風？") == ["朝が来ます。", "雨の音。", "風？"]


def test_plan_utterances_per_sentence_and_grouped():
    text = "一文目です。二文目です。\n\n三文目です。"
    per = plan_utterances(text, 100, per_sentence=True)
    assert [u.text for u in per] == ["一文目です。", "二文目です。", "三文目です。"]
    assert per[0].pause < per[1].pause  # 段落の終わりは長めの間
    grouped = plan_utterances(text, 100, per_sentence=False)
    assert [u.text for u in grouped] == ["一文目です。二文目です。", "三文目です。"]


def test_plan_utterances_splits_long_sentence():
    long = "、".join(["とても長い修飾"] * 30) + "。"
    chunks = plan_utterances(long, 50, per_sentence=True)
    assert all(len(u.text) <= 50 for u in chunks)
    assert "".join(u.text for u in chunks) == long


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# プロジェクト
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_project_roundtrip_and_slug(tmp_path):
    p = make_project(tmp_path)
    p.chapters[0].readings = {"長屋": "ながや"}
    p.write_narration(p.chapters[0], "本文。")
    p.save()
    loaded = Project.load("t1", tmp_path)
    assert loaded.chapters[0].readings == {"長屋": "ながや"}
    assert loaded.narration(loaded.chapters[0]) == "本文。"
    assert [c.number for c in loaded.missing_chapters()] == [2, 3]
    from datetime import date
    (tmp_path / "20261108").mkdir()
    assert new_slug(tmp_path, date(2026, 11, 8)) == "20261108-2"
    assert [x.slug for x in list_projects(tmp_path)] == ["t1"]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 台本（偽の Claude）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class FakeMessages:
    def __init__(self, payloads, stop_reason="end_turn"):
        self.payloads = list(payloads)
        self.calls = []
        self.stop_reason = stop_reason

    def create(self, **kwargs):
        self.calls.append(kwargs)
        text = json.dumps(self.payloads.pop(0), ensure_ascii=False)
        return SimpleNamespace(stop_reason=self.stop_reason,
                               content=[SimpleNamespace(type="text", text=text)])


class FakeClient:
    def __init__(self, payloads, stop_reason="end_turn"):
        self.beta = SimpleNamespace(messages=FakeMessages(payloads, stop_reason))
        self.messages = self.beta.messages


OUTLINE = {
    "title_candidates": ["【睡眠用】江戸の長屋の一日｜聞き流し歴史", "案2", "案3"],
    "summary": "長屋の朝から夜までを静かにたどります。",
    "tags": ["#江戸", "長屋", "睡眠用"],
    "chapters": [{"title": f"章{i}", "summary": f"要約{i}", "points": ["井戸", "棒手振り"]} for i in range(1, 4)],
}


def chapter_payload(n):
    return {
        "narration": f"## 見出し\n第{n}章の本文です。長屋の朝は早い。\n\n井戸の水は冷たい。",
        "check_points": ["長屋の家賃は月に数百文とされる"],
        "readings": [{"word": "棒手振り", "reading": "ぼてふり"}, {"word": "", "reading": "x"}],
    }


def test_writer_outline_and_chapters(tmp_path):
    p = Project(slug="w", theme="江戸の長屋の一日", target_minutes=30, chapter_chars=2000, root=tmp_path)
    client = FakeClient([OUTLINE] + [chapter_payload(i) for i in range(1, 4)])
    writer = ScriptWriter(Channel(), client=client)
    writer.outline(p, 3)
    assert p.title.startswith("【睡眠用】")
    assert p.tags == ["江戸", "長屋", "睡眠用"]
    assert [c.number for c in p.chapters] == [1, 2, 3]

    for c in p.chapters:
        writer.chapter(p, c)
    assert p.narration(p.chapters[1]).startswith("見出し\n第2章の本文です。")
    assert p.chapters[0].readings == {"棒手振り": "ぼてふり"}
    assert p.chapters[0].check_points

    call = client.messages.calls[1]
    assert call["model"] == "claude-opus-5-5"
    assert call["fallbacks"] == "default"
    assert call["output_config"]["format"]["type"] == "json_schema"
    assert "本題から入る" in call["messages"][0]["content"]  # 第1章はあいさつを書かせない


def test_chapter_request_mentions_previous_and_ending(tmp_path):
    p = make_project(tmp_path)
    middle = build_chapter_request(p, p.chapters[1], previous_tail="井戸の水は冷たい。")
    assert "井戸の水は冷たい。" in middle and "次の章の題材へ" in middle
    last = build_chapter_request(p, p.chapters[2])
    assert "締めのあいさつは別に" in last


@pytest.mark.parametrize("stop", ["refusal", "max_tokens"])
def test_writer_stop_reasons_raise(tmp_path, stop):
    p = Project(slug="w", theme="x", target_minutes=10, chapter_chars=100, root=tmp_path)
    writer = ScriptWriter(Channel(), client=FakeClient([OUTLINE], stop_reason=stop))
    pytest.importorskip("anthropic")
    with pytest.raises(WriterError):
        writer.outline(p, 3)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 音声
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class CountingEngine(DummyEngine):
    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self.calls = 0

    def synthesize(self, text, previous_text="", next_text=""):
        self.calls += 1
        return super().synthesize(text)


def fill_scripts(p: Project, chars: int = 100) -> None:
    for c in p.chapters:
        p.write_narration(c, ("長屋の朝は静かに始まります。" * 20)[:chars])


def test_synthesize_project_timeline_and_cache(tmp_path):
    p = make_project(tmp_path)
    fill_scripts(p)
    engine = CountingEngine(cpm=600)
    tl = synthesize_project(p, Channel(), engine, log=lambda *_: None)

    secs = [read_wav(p.audio_dir / f"ch0{i}.wav").seconds for i in (1, 2, 3)]
    assert tl.chapters[0]["start"] == 0
    assert tl.chapters[1]["start"] == pytest.approx(LEAD_IN + secs[0] + CHAPTER_GAP, abs=1e-3)
    assert tl.total == pytest.approx(LEAD_IN + sum(secs) + 2 * CHAPTER_GAP, abs=1e-3)
    assert read_wav(p.audio_dir / "narration.wav").seconds == pytest.approx(tl.total, abs=1e-3)

    first = engine.calls
    synthesize_project(p, Channel(), engine, log=lambda *_: None)
    assert engine.calls == first, "原稿が同じなら作り直さない"
    p.write_narration(p.chapters[1], "書き直した本文です。")
    synthesize_project(p, Channel(), engine, log=lambda *_: None)
    assert 0 < engine.calls - first < first, "直した章だけ作り直す"


def test_speech_includes_intro_and_outro(tmp_path):
    p = make_project(tmp_path)
    fill_scripts(p, 20)
    ch = Channel(intro="今夜は{theme}の話です。", outro="おやすみなさい。")
    assert voice.chapter_speech_text(p, ch, p.chapters[0]).startswith("今夜は江戸の長屋の一日の話です。")
    assert voice.chapter_speech_text(p, ch, p.chapters[2]).endswith("おやすみなさい。")
    assert "おやすみなさい" not in voice.chapter_speech_text(p, ch, p.chapters[1])


@pytest.fixture
def fake_http(monkeypatch):
    """urlopen を差し替え、送ったリクエストを記録して決まった応答を返す"""
    def install(responses):
        http = SimpleNamespace(responses=list(responses), requests=[])

        class Res:
            def __init__(self, body):
                self.body = body

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return self.body

        def urlopen(req, timeout=None):
            http.requests.append(req)
            return Res(http.responses.pop(0))

        monkeypatch.setattr(voice.urllib.request, "urlopen", urlopen)
        return http
    return install


def test_voicevox_engine_requests(fake_http):
    http = fake_http([json.dumps({"speedScale": 1.0}).encode(), wav_bytes(0.5)])
    pcm = VoicevoxEngine(speaker=13).synthesize("長屋の朝。")
    assert pcm.rate == 24000 and pcm.seconds == pytest.approx(0.5)
    q, s = http.requests
    assert "/audio_query?" in q.full_url and "speaker=13" in q.full_url
    body = json.loads(s.data)
    assert body["speedScale"] == 0.9 and body["intonationScale"] == 0.8 and body["outputStereo"] is False


def test_voicevox_credit_from_speakers(fake_http):
    speakers = [{"name": "青山龍星", "styles": [{"name": "ノーマル", "id": 13}]}]
    fake_http([json.dumps(speakers, ensure_ascii=False).encode()])
    assert VoicevoxEngine(speaker=13).credit() == "VOICEVOX:青山龍星"


def test_google_engine_request(fake_http):
    content = base64.b64encode(wav_bytes(0.25)).decode()
    http = fake_http([json.dumps({"audioContent": content}).encode()])
    pcm = GoogleEngine(api_key="k", voice="ja-JP-Neural2-D").synthesize("雨の音。")
    assert pcm.seconds == pytest.approx(0.25)
    body = json.loads(http.requests[0].data)
    assert body["voice"] == {"languageCode": "ja-JP", "name": "ja-JP-Neural2-D"}
    assert body["audioConfig"]["audioEncoding"] == "LINEAR16"
    assert "pitch" not in body["audioConfig"]


def test_elevenlabs_engine_request(fake_http):
    http = fake_http([b"\x00\x00" * 2400])
    pcm = ElevenLabsEngine(api_key="k", voice_id="v1").synthesize("本文。", previous_text="前の文。")
    assert pcm.seconds == pytest.approx(0.1)
    req = http.requests[0]
    assert req.full_url.endswith("/text-to-speech/v1?output_format=pcm_24000")
    assert req.get_header("Xi-api-key") == "k"
    assert json.loads(req.data)["previous_text"] == "前の文。"


def test_engines_require_keys():
    with pytest.raises(VoiceError):
        GoogleEngine(api_key="")
    with pytest.raises(VoiceError):
        ElevenLabsEngine(api_key="k", voice_id="")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 画像の割り当て
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHAPTERS = [
    {"number": 1, "title": "朝", "start": 0, "end": 600},
    {"number": 2, "title": "昼", "start": 600, "end": 1300},
    {"number": 3, "title": "夜", "start": 1300, "end": 1800},
]


def test_plan_slides_uses_chapter_images_and_pool():
    a, b = SourceImage(Path("a.jpg"), None), SourceImage(Path("b.jpg"), None)
    c2x, c2y = SourceImage(Path("ch02_x.jpg"), 2), SourceImage(Path("ch02_y.jpg"), 2)
    slides = plan_slides(CHAPTERS, 1900, [a, b, c2x, c2y], slide_seconds=300)
    names = [s.image.name for s in slides]
    assert names[:2] == ["a.jpg", "b.jpg"]                 # 第1章：600秒を300秒ずつ
    assert names[2:4] == ["ch02_x.jpg", "ch02_y.jpg"]      # 第2章は章番号付きの画像
    assert slides[2].start == 600 and slides[3].end == 1300
    assert slides[-1].end == 1900                          # 最後は余韻まで伸ばす
    assert all(x.image != y.image for x, y in zip(slides, slides[1:]))


def test_frame_plan_has_no_drift():
    slides = plan_slides(CHAPTERS, 1800.37, [SourceImage(Path(f"{i}.jpg"), None) for i in range(7)], 97.3)
    plan = frame_plan(slides, 24)
    assert sum(f for _, f in plan) == round(1800.37 * 24)


@pytest.mark.parametrize("frames", [5, 30, 36 * 3, 24 * 30 * 2 + 17, 24 * 600])
def test_clip_parts_cover_frames(frames):
    parts = clip_parts(frames, 24)
    assert sum(n for _, n in parts) == frames
    assert all(n > 0 for _, n in parts)


def test_collect_images_reads_chapter_prefix(tmp_path):
    for name in ["ch03_map.jpg", "CH1_a.png", "street.webp", "notes.txt"]:
        (tmp_path / name).write_bytes(b"x")
    got = {i.path.name: i.chapter for i in collect_images(tmp_path)}
    assert got == {"ch03_map.jpg": 3, "CH1_a.png": 1, "street.webp": None}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 概要欄
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_format_duration():
    assert format_duration(0) == "0:00"
    assert format_duration(605.9) == "10:05"
    assert format_duration(7322) == "2:02:02"


def test_description_has_chapters_and_credit(tmp_path):
    p = make_project(tmp_path)
    p.image_dir.mkdir(parents=True)
    (p.image_dir / "credits.txt").write_text("歌川広重「名所江戸百景」（パブリックドメイン）", encoding="utf-8")
    tl = Timeline(rate=24000, lead_in=3, total=1800, chapters=CHAPTERS, credit="VOICEVOX:青山龍星")
    assert chapters_valid(tl)
    desc = build_description(p, Channel(), tl)
    assert "0:00 朝\n10:00 昼\n21:40 夜" in desc
    assert "VOICEVOX:青山龍星" in desc and "名所江戸百景" in desc
    short = Timeline(rate=24000, lead_in=3, total=30, chapters=CHAPTERS[:2], credit="")
    assert not chapters_valid(short)


def test_tags_line_respects_limit():
    tags = [f"タグ{i:03d}" for i in range(200)] + ["タグ000"]
    line = tags_line(tags)
    assert len(line) <= 500 and line.count("タグ000") == 1


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# コマンドと動画の書き出し
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_voice_requires_approval(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("SLEEP_CHANNEL_DIR", str(tmp_path))
    p = make_project(tmp_path)
    fill_scripts(p)
    with pytest.raises(SystemExit) as e:
        main(["voice", "t1", "--engine", "dummy"])
    assert "承認" in str(e.value)
    main(["approve", "t1"])
    assert Project.load("t1", tmp_path).approved
    main(["status"])
    assert "承認済み" in capsys.readouterr().out


def test_new_keeps_written_chapters_on_failure(tmp_path, monkeypatch):
    pytest.importorskip("anthropic")
    monkeypatch.setenv("SLEEP_CHANNEL_DIR", str(tmp_path))
    client = FakeClient([OUTLINE, chapter_payload(1), chapter_payload(2)])
    real_create = client.messages.create

    def create(**kwargs):
        response = real_create(**kwargs)
        if len(client.messages.calls) == 3:  # 第2章で断られたことにする
            response.stop_reason = "refusal"
        return response

    client.messages.create = create
    monkeypatch.setattr("sleep_channel.main._writer", lambda ch: ScriptWriter(ch, client=client))
    with pytest.raises(SystemExit) as e:
        main(["new", "江戸の長屋の一日", "--chapters", "3", "--slug", "s1"])
    assert "script s1 で続きから" in str(e.value)
    p = Project.load("s1", tmp_path)
    assert [c.number for c in p.missing_chapters()] == [2, 3]


needs_ffmpeg = pytest.mark.skipif(not render.ffmpeg_available(), reason="ffmpeg がない")


def _ffmpeg(*args):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


@needs_ffmpeg
def test_build_end_to_end(tmp_path, monkeypatch):
    monkeypatch.setenv("SLEEP_CHANNEL_DIR", str(tmp_path))
    monkeypatch.setenv("SLEEP_CPM", "600")
    p = make_project(tmp_path)
    fill_scripts(p, 100)
    p.approved = True
    p.save()
    p.image_dir.mkdir(parents=True)
    _ffmpeg("-f", "lavfi", "-i", "testsrc=s=300x400:d=1", "-frames:v", "1", str(p.image_dir / "street.png"))
    _ffmpeg("-f", "lavfi", "-i", "testsrc2=s=640x360:d=1", "-frames:v", "1", str(p.image_dir / "ch02_map.jpg"))
    _ffmpeg("-f", "lavfi", "-i", "anoisesrc=d=4:c=pink:a=0.2", str(tmp_path / "bgm.wav"))

    main(["build", "t1", "--engine", "dummy", "--size", "320x180", "--fps", "12",
          "--slide-minutes", "0.1", "--tail-minutes", "0.05"])

    out = p.out_dir / "video.mp4"
    tl = Timeline.load(p.audio_dir / "timeline.json")
    expected = tl.total + 3
    assert render.probe_duration(out) == pytest.approx(expected, abs=0.3)
    streams = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height", "-of", "json", str(out)],
        check=True, capture_output=True, text=True,
    ).stdout)["streams"]
    kinds = {s["codec_type"] for s in streams}
    assert kinds == {"video", "audio"}
    assert any(s.get("width") == 320 and s.get("height") == 180 for s in streams)
    meta = (p.out_dir / "metadata.txt").read_text(encoding="utf-8")
    assert "0:00 第1の話" in meta and "【睡眠用】江戸の長屋の一日" in meta
    assert f"■長さ\n{format_duration(expected)}" in meta  # 余韻を含めた実際の長さ
