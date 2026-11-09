"""音声合成

エンジンは差し替えられる。
  voicevox    VOICEVOX ENGINE（無料・ローカル。キャラクターごとにクレジット表記が必要）
  aivis       AivisSpeech Engine（無料・ローカル。VOICEVOX互換のAPI。モデルごとに規約を確認）
  google      Google Cloud Text-to-Speech（従量課金。APIキー）
  elevenlabs  ElevenLabs（月額＋クレジット。日本語は1文字1クレジットが目安）
  dummy       無音を作るだけ。動画の組み立てを試すとき用

章ごとに audio/ch01.wav を作り、原稿と設定が変わっていなければ次回は作り直さない。
最後に全章をつなげた audio/narration.wav と、章の開始位置を書いた audio/timeline.json を作る。
"""

from dataclasses import asdict, dataclass
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request
import wave

from sleep_channel.config import Channel
from sleep_channel.project import Chapter, Project
from sleep_channel.text import plan_utterances, to_speech_text

SAMPLE_WIDTH = 2  # 16bit
LEAD_IN = 3.0     # 冒頭の無音（秒）
CHAPTER_GAP = 4.0  # 章と章の間の無音（秒）


class VoiceError(Exception):
    """音声合成に失敗したとき"""


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WAV（モノラル16bit）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@dataclass
class Pcm:
    rate: int
    data: bytes

    @property
    def seconds(self) -> float:
        return len(self.data) / (SAMPLE_WIDTH * self.rate)


def parse_wav(data: bytes) -> Pcm:
    try:
        with wave.open(io.BytesIO(data)) as w:
            if w.getsampwidth() != SAMPLE_WIDTH or w.getnchannels() != 1:
                raise VoiceError("モノラル16bitのWAV以外は扱えません。エンジンの出力設定を確認してください。")
            return Pcm(w.getframerate(), w.readframes(w.getnframes()))
    except (wave.Error, EOFError) as e:
        raise VoiceError("音声データを読み取れませんでした。") from e


def read_wav(path: Path) -> Pcm:
    return parse_wav(Path(path).read_bytes())


def write_wav(path: Path, pcm: Pcm) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(SAMPLE_WIDTH)
        w.setframerate(pcm.rate)
        w.writeframes(pcm.data)


def silence(rate: int, seconds: float) -> bytes:
    return b"\x00" * (SAMPLE_WIDTH * int(round(rate * seconds)))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HTTP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _request(url: str, body: bytes | None = None, headers: dict | None = None,
             method: str = "POST", retries: int = 3, unreachable: str = "") -> bytes:
    """失敗が 429 か 5xx のときだけ少し待って再試行する"""
    for attempt in range(retries):
        req = urllib.request.Request(url, data=body, headers=headers or {}, method=method)
        try:
            with urllib.request.urlopen(req, timeout=300) as res:
                return res.read()
        except urllib.error.HTTPError as e:
            detail = e.read()[:300].decode("utf-8", "replace")
            if (e.code == 429 or e.code >= 500) and attempt < retries - 1:
                time.sleep(2 ** (attempt + 1))
                continue
            raise VoiceError(f"音声合成APIがエラーを返しました（{e.code}）：{detail}") from e
        except urllib.error.URLError as e:
            raise VoiceError(unreachable or f"音声合成APIに接続できませんでした：{e.reason}") from e
    raise VoiceError("音声合成APIの再試行が上限に達しました。")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# エンジン
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class Engine:
    name = ""
    max_chars = 200
    per_sentence = True  # True なら1文ずつ合成し、文の間に間を入れる

    def signature(self) -> str:
        """設定が変わったら作り直すための識別子"""
        return self.name

    def credit(self) -> str:
        """概要欄に書く音声のクレジット"""
        return ""

    def synthesize(self, text: str, previous_text: str = "", next_text: str = "") -> Pcm:
        raise NotImplementedError


class DummyEngine(Engine):
    """原稿の長さに見合った無音を返す。動画の組み立てを確かめる用"""
    name = "dummy"
    max_chars = 400
    per_sentence = False

    def __init__(self, cpm: int = 270, rate: int = 24000) -> None:
        self.cpm = cpm
        self.rate = rate

    def signature(self) -> str:
        return f"dummy:{self.cpm}:{self.rate}"

    def synthesize(self, text: str, previous_text: str = "", next_text: str = "") -> Pcm:
        return Pcm(self.rate, silence(self.rate, len(text) / self.cpm * 60))


class VoicevoxEngine(Engine):
    """VOICEVOX ENGINE と、互換APIを持つ AivisSpeech Engine"""
    name = "voicevox"
    max_chars = 150

    def __init__(self, url: str = "http://127.0.0.1:50021", speaker: int = 13,
                 speed: float = 0.9, pitch: float = 0.0, intonation: float = 0.8,
                 volume: float = 1.0, label: str = "VOICEVOX") -> None:
        self.url = url.rstrip("/")
        self.speaker = speaker
        self.speed = speed
        self.pitch = pitch
        self.intonation = intonation
        self.volume = volume
        self.label = label

    def signature(self) -> str:
        return f"{self.label}:{self.speaker}:{self.speed}:{self.pitch}:{self.intonation}:{self.volume}"

    def _unreachable(self) -> str:
        return f"{self.label} のエンジンに接続できませんでした（{self.url}）。アプリかエンジンを起動してください。"

    def credit(self) -> str:
        try:
            raw = _request(f"{self.url}/speakers", method="GET", unreachable=self._unreachable())
            for speaker in json.loads(raw):
                for style in speaker.get("styles", []):
                    if style.get("id") == self.speaker:
                        return f"{self.label}:{speaker['name']}"
        except (VoiceError, json.JSONDecodeError, KeyError):
            pass
        return self.label

    def synthesize(self, text: str, previous_text: str = "", next_text: str = "") -> Pcm:
        q = urllib.parse.urlencode({"text": text, "speaker": self.speaker})
        query = json.loads(_request(f"{self.url}/audio_query?{q}", unreachable=self._unreachable()))
        query.update({
            "speedScale": self.speed,
            "pitchScale": self.pitch,
            "intonationScale": self.intonation,
            "volumeScale": self.volume,
            "prePhonemeLength": 0.1,
            "postPhonemeLength": 0.1,
            "outputSamplingRate": 24000,
            "outputStereo": False,
        })
        wav = _request(
            f"{self.url}/synthesis?speaker={self.speaker}",
            body=json.dumps(query).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            unreachable=self._unreachable(),
        )
        return parse_wav(wav)


class GoogleEngine(Engine):
    """Google Cloud Text-to-Speech（REST、APIキー認証）"""
    name = "google"
    max_chars = 1200  # 1リクエスト5000バイトの上限に収まる長さ
    per_sentence = False
    endpoint = "https://texttospeech.googleapis.com/v1/text:synthesize"

    def __init__(self, api_key: str, voice: str = "ja-JP-Neural2-D",
                 rate: float = 0.9, pitch: float = 0.0) -> None:
        if not api_key:
            raise VoiceError("GOOGLE_TTS_API_KEY を設定してください。")
        self.api_key = api_key
        self.voice = voice
        self.rate = rate
        self.pitch = pitch

    def signature(self) -> str:
        return f"google:{self.voice}:{self.rate}:{self.pitch}"

    def credit(self) -> str:
        return "Google Cloud Text-to-Speech"

    def synthesize(self, text: str, previous_text: str = "", next_text: str = "") -> Pcm:
        audio_config = {"audioEncoding": "LINEAR16", "sampleRateHertz": 24000, "speakingRate": self.rate}
        if self.pitch:
            audio_config["pitch"] = self.pitch  # Chirp 3 HD の声は pitch を受け付けない
        body = {
            "input": {"text": text},
            "voice": {"languageCode": "ja-JP", "name": self.voice},
            "audioConfig": audio_config,
        }
        raw = _request(
            f"{self.endpoint}?key={urllib.parse.quote(self.api_key)}",
            body=json.dumps(body, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json; charset=utf-8"},
        )
        content = json.loads(raw).get("audioContent")
        if not content:
            raise VoiceError("Google の応答に音声が入っていませんでした。")
        return parse_wav(base64.b64decode(content))  # LINEAR16 はWAVヘッダー付きで返る


class ElevenLabsEngine(Engine):
    """ElevenLabs（前後の文を渡して、つなぎ目の抑揚をそろえる）"""
    name = "elevenlabs"
    max_chars = 2000
    per_sentence = False
    rate = 24000

    def __init__(self, api_key: str, voice_id: str, model: str = "eleven_multilingual_v2",
                 stability: float = 0.75, similarity: float = 0.75) -> None:
        if not api_key:
            raise VoiceError("ELEVENLABS_API_KEY を設定してください。")
        if not voice_id:
            raise VoiceError("ELEVENLABS_VOICE_ID（使う声のID）を設定してください。")
        self.api_key = api_key
        self.voice_id = voice_id
        self.model = model
        self.stability = stability
        self.similarity = similarity

    def signature(self) -> str:
        return f"elevenlabs:{self.voice_id}:{self.model}:{self.stability}:{self.similarity}"

    def credit(self) -> str:
        return "ElevenLabs"

    def synthesize(self, text: str, previous_text: str = "", next_text: str = "") -> Pcm:
        body = {
            "text": text,
            "model_id": self.model,
            "voice_settings": {"stability": self.stability, "similarity_boost": self.similarity},
        }
        if previous_text:
            body["previous_text"] = previous_text
        if next_text:
            body["next_text"] = next_text
        raw = _request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}?output_format=pcm_{self.rate}",
            body=json.dumps(body, ensure_ascii=False).encode("utf-8"),
            headers={"xi-api-key": self.api_key, "Content-Type": "application/json"},
        )
        return Pcm(self.rate, raw)  # pcm_24000 はヘッダーなしの16bitモノラル


ENGINES = ("voicevox", "aivis", "google", "elevenlabs", "dummy")


def make_engine(name: str, speaker: int | None = None, voice: str | None = None,
                speed: float | None = None, url: str | None = None) -> Engine:
    """エンジンを作る。引数がなければ環境変数を見る"""
    env = os.environ.get
    if name == "voicevox":
        return VoicevoxEngine(
            url=url or env("VOICEVOX_URL", "http://127.0.0.1:50021"),
            speaker=speaker if speaker is not None else int(env("VOICEVOX_SPEAKER", "13")),
            speed=speed or 0.9,
        )
    if name == "aivis":
        return VoicevoxEngine(
            url=url or env("AIVIS_URL", "http://127.0.0.1:10101"),
            speaker=speaker if speaker is not None else int(env("AIVIS_SPEAKER", "888753760")),
            speed=speed or 0.9, intonation=1.0, label="AivisSpeech",
        )
    if name == "google":
        return GoogleEngine(
            api_key=env("GOOGLE_TTS_API_KEY", ""),
            voice=voice or env("GOOGLE_TTS_VOICE", "ja-JP-Neural2-D"),
            rate=speed or 0.9,
        )
    if name == "elevenlabs":
        return ElevenLabsEngine(
            api_key=env("ELEVENLABS_API_KEY", ""),
            voice_id=voice or env("ELEVENLABS_VOICE_ID", ""),
            model=env("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
        )
    if name == "dummy":
        return DummyEngine(cpm=int(env("SLEEP_CPM", "270")))
    raise VoiceError(f"エンジン {name} は使えません。{', '.join(ENGINES)} から選んでください。")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# プロジェクト全体の合成
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@dataclass
class Timeline:
    rate: int
    lead_in: float
    total: float
    chapters: list[dict]  # {"number", "title", "start", "end"}（秒）
    credit: str = ""

    def save(self, path: Path) -> None:
        path.write_text(json.dumps(asdict(self), ensure_ascii=False, indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> "Timeline":
        if not path.exists():
            raise FileNotFoundError("音声がまだありません。先に voice を実行してください。")
        return cls(**json.loads(path.read_text(encoding="utf-8")))


def chapter_speech_text(project: Project, channel: Channel, chapter: Chapter) -> str:
    """読み上げる本文。第1章の前に冒頭のあいさつ、最終章の後に締めのあいさつを付ける"""
    body = project.narration(chapter)
    if not body:
        return ""
    if chapter.number == 1:
        body = channel.intro_for(project.theme) + "\n\n" + body
    if chapter.number == len(project.chapters):
        body = body + "\n\n" + channel.outro
    return to_speech_text(body, project.readings())


def synthesize_text(engine: Engine, text: str, log=print, label: str = "") -> Pcm:
    utterances = plan_utterances(text, engine.max_chars, engine.per_sentence)
    if not utterances:
        raise VoiceError("読み上げる文がありません。")
    out, rate = bytearray(), None
    for i, u in enumerate(utterances):
        prev_text = utterances[i - 1].text if i else ""
        next_text = utterances[i + 1].text if i + 1 < len(utterances) else ""
        pcm = engine.synthesize(u.text, previous_text=prev_text, next_text=next_text)
        if rate is None:
            rate = pcm.rate
        elif pcm.rate != rate:
            raise VoiceError("途中でサンプリングレートが変わりました。エンジンの設定を確認してください。")
        out += pcm.data
        out += silence(rate, u.pause)
        if (i + 1) % 25 == 0:
            log(f"    {label} {i + 1}/{len(utterances)}")
    return Pcm(rate, bytes(out))


def synthesize_project(project: Project, channel: Channel, engine: Engine,
                       force: bool = False, log=print) -> Timeline:
    project.audio_dir.mkdir(parents=True, exist_ok=True)
    chapter_files: list[tuple[Chapter, Path]] = []

    for chapter in project.chapters:
        text = chapter_speech_text(project, channel, chapter)
        if not text:
            raise VoiceError(f"第{chapter.number}章の原稿がありません。先に script を実行してください。")
        sig = hashlib.sha256(f"{engine.signature()}\n{text}".encode("utf-8")).hexdigest()
        wav_path = project.audio_dir / f"{chapter.label}.wav"
        meta_path = project.audio_dir / f"{chapter.label}.json"
        cached = (
            not force and wav_path.exists() and meta_path.exists()
            and json.loads(meta_path.read_text(encoding="utf-8")).get("sig") == sig
        )
        if cached:
            log(f"  第{chapter.number}章 前回の音声を使います")
        else:
            log(f"  第{chapter.number}章 合成中（{len(text)}字）")
            pcm = synthesize_text(engine, text, log=log, label=f"第{chapter.number}章")
            write_wav(wav_path, pcm)
            meta_path.write_text(json.dumps({"sig": sig, "seconds": pcm.seconds}), encoding="utf-8")
        chapter_files.append((chapter, wav_path))

    # 全章をつなぐ。2時間ぶんは数百MBになるので、1章ずつ読み込んで書き足す
    narration = project.audio_dir / "narration.wav"
    chapters, rate, cursor = [], None, 0.0
    with wave.open(str(narration), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(SAMPLE_WIDTH)
        for i, (chapter, path) in enumerate(chapter_files):
            pcm = read_wav(path)
            if rate is None:
                rate = pcm.rate
                w.setframerate(rate)
                w.writeframes(silence(rate, LEAD_IN))
                cursor = LEAD_IN
            elif pcm.rate != rate:
                raise VoiceError("章によってサンプリングレートが違います。--force で作り直してください。")
            start = 0.0 if i == 0 else cursor
            w.writeframes(pcm.data)
            cursor += pcm.seconds
            if i < len(chapter_files) - 1:
                w.writeframes(silence(rate, CHAPTER_GAP))
                cursor += CHAPTER_GAP
            chapters.append({"number": chapter.number, "title": chapter.title,
                             "start": round(start, 3), "end": round(cursor, 3)})

    timeline = Timeline(rate=rate, lead_in=LEAD_IN, total=round(cursor, 3),
                        chapters=chapters, credit=engine.credit())
    timeline.save(project.audio_dir / "timeline.json")
    return timeline
