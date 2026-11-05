"""Irodori-TTS スキルの CLI のテスト

python -m pytest tests/ で実行する。ネットワークには出ず、Space の応答は偽の HTTP 層で再現する。
"""

import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / ".claude" / "skills" / "irodori-tts" / "scripts" / "irodori.py"

_spec = importlib.util.spec_from_file_location("irodori_cli", SCRIPT)
irodori = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(irodori)

HOST = "https://owner-demo.hf.space"

# Space の /gradio_api/info を必要な部分だけ写したもの
API_INFO = {
    "named_endpoints": {
        "/gradio_inference": {
            "parameters": [
                {"parameter_name": "text", "parameter_has_default": False},
                {"parameter_name": "caption", "parameter_has_default": False},
                {"parameter_name": "uploaded_audios", "parameter_has_default": False},
                {"parameter_name": "num_steps", "parameter_has_default": True, "parameter_default": 40},
                {"parameter_name": "num_candidates", "parameter_has_default": True, "parameter_default": 1},
                {"parameter_name": "seed_raw", "parameter_has_default": True, "parameter_default": ""},
                {"parameter_name": "seconds_raw", "parameter_has_default": True, "parameter_default": ""},
                {"parameter_name": "duration_scale", "parameter_has_default": True, "parameter_default": 1.0},
                {"parameter_name": "cfg_scale_caption", "parameter_has_default": True, "parameter_default": 4.0},
            ]
        }
    }
}


def file_data(path):
    return {"path": path, "url": f"{HOST}/gradio_api/file={path}", "orig_name": Path(path).name,
            "meta": {"_type": "gradio.FileData"}}


class FakeResponse:
    def __init__(self, body=b"", lines=None):
        self._body = body
        self._lines = lines or []
        self._read = False

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def __iter__(self):
        return iter(self._lines)

    def read(self, size=-1):
        if self._read:
            return b""
        self._read = True
        return self._body


class FakeSpace:
    """http_json と _request を差し替えて Space の一連の応答を返す。"""

    def __init__(self, completed, audio_bytes=b"RIFFfake"):
        self.completed = completed
        self.audio_bytes = audio_bytes
        self.joined = None
        self.downloaded = []

    def http_json(self, url, *, token, payload=None, timeout=60.0):
        if url.endswith("/runtime"):
            return {"stage": "RUNNING"}
        if url.startswith("https://huggingface.co/api/spaces/"):
            return {"host": HOST}
        if url.endswith("/gradio_api/info"):
            return API_INFO
        if url.endswith("/config"):
            return {"dependencies": [{"id": 0, "api_name": "gradio_inference"}]}
        if url.endswith("/gradio_api/queue/join"):
            self.joined = payload
            return {"event_id": "ev"}
        raise AssertionError(f"unexpected http_json {url}")

    def request(self, url, *, token, data=None, headers=None, timeout=60.0):
        if "/gradio_api/queue/data" in url:
            events = [
                {"msg": "estimation", "rank": 0},
                {"msg": "process_starts"},
                self.completed,
                {"msg": "close_stream"},
            ]
            return FakeResponse(lines=[f"data: {json.dumps(e)}\n".encode() for e in events])
        self.downloaded.append(url)
        return FakeResponse(body=self.audio_bytes)


@pytest.fixture
def fake_space(monkeypatch):
    def install(completed, **kwargs):
        fake = FakeSpace(completed, **kwargs)
        monkeypatch.setattr(irodori, "http_json", fake.http_json)
        monkeypatch.setattr(irodori, "_request", fake.request)
        monkeypatch.delenv("HF_TOKEN", raising=False)
        return fake
    return install


def success(files, log="[Info] seed_used: 42\n"):
    updates = [{"__type__": "update", "visible": True, "value": fd} for fd in files]
    updates += [{"__type__": "update", "visible": False, "value": None}] * 3
    return {"msg": "process_completed", "success": True, "output": {"data": [*updates, log]}}


# ---------------------------------------------------------------------------


def test_inputs_follow_schema_order_and_defaults():
    data = irodori.build_space_inputs(API_INFO, {"text": "こんにちは", "caption": "", "uploaded_audios": [],
                                                 "num_candidates": 2})
    assert data == ["こんにちは", "", [], 40, 2, "", "", 1.0, 4.0]


def test_missing_endpoint_is_reported():
    with pytest.raises(irodori.TTSError):
        irodori.build_space_inputs({"named_endpoints": {}}, {})


def test_collect_files_reads_update_dicts_and_skips_hidden():
    fd = file_data("/tmp/gradio/a/audio.wav")
    data = [{"__type__": "update", "visible": True, "value": fd},
            {"__type__": "update", "visible": False, "value": None},
            "log text"]
    assert irodori.collect_files(data) == [fd]


def test_file_url_ignores_foreign_hosts():
    fd = {"path": "/tmp/x.wav", "url": "http://internal:7860/gradio_api/file=/tmp/x.wav"}
    assert irodori.file_url(HOST, fd) == f"{HOST}/gradio_api/file=/tmp/x.wav"
    assert irodori.file_url(HOST, file_data("/tmp/y.wav")) == f"{HOST}/gradio_api/file=/tmp/y.wav"


def test_candidate_paths_match_upstream_naming():
    assert irodori.candidate_paths(Path("out/a.wav"), 1) == [Path("out/a.wav")]
    assert irodori.candidate_paths(Path("out/a.wav"), 2) == [Path("out/a_001.wav"), Path("out/a_002.wav")]


def test_token_lookup_prefers_env_then_file(monkeypatch, tmp_path):
    for name in ("HF_TOKEN", "HUGGING_FACE_HUB_TOKEN", "HUGGINGFACE_TOKEN"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("HF_HOME", str(tmp_path))
    assert irodori.find_hf_token() is None
    (tmp_path / "token").write_text("hf_file\n", encoding="utf-8")
    assert irodori.find_hf_token() == "hf_file"
    monkeypatch.setenv("HF_TOKEN", "hf_env")
    assert irodori.find_hf_token() == "hf_env"


def test_quota_hint_depends_on_token():
    msg = "You have exceeded your ZeroGPU runs limit."
    assert "HF_TOKEN" in irodori.quota_hint(msg, None)
    assert "使い切っています" in irodori.quota_hint(msg, "hf_x")
    assert irodori.quota_hint("CUDA out of memory", None) == ""


def test_parse_args_validates_input(tmp_path):
    with pytest.raises(SystemExit):
        irodori.parse_args([])
    text_file = tmp_path / "t.txt"
    text_file.write_text("  ファイルの文章  \n", encoding="utf-8")
    args = irodori.parse_args(["-f", str(text_file)])
    assert args.text == "ファイルの文章"
    assert args.output.startswith("tts_output") and args.output.endswith(".wav")
    with pytest.raises(SystemExit):
        irodori.parse_args(["テキスト", "-r", str(tmp_path / "missing.wav")])


def test_space_backend_downloads_audio(fake_space, tmp_path):
    fake = fake_space(success([file_data("/tmp/gradio/a/audio.wav")]))
    out = tmp_path / "voice.wav"
    rc = irodori.main(["こんにちは", "-c", "明るい声", "--seed", "7", "-o", str(out), "--backend", "space"])
    assert rc == 0
    assert out.read_bytes() == b"RIFFfake"
    sent = fake.joined["data"]
    assert sent[0] == "こんにちは" and sent[1] == "明るい声" and sent[5] == "7"
    assert fake.downloaded == [f"{HOST}/gradio_api/file=/tmp/gradio/a/audio.wav"]


def test_space_backend_saves_each_candidate(fake_space, tmp_path):
    files = [file_data("/tmp/gradio/a/audio.wav"), file_data("/tmp/gradio/b/audio.wav")]
    fake_space(success(files))
    rc = irodori.main(["テスト", "-n", "2", "-o", str(tmp_path / "c.wav"), "--backend", "space"])
    assert rc == 0
    assert (tmp_path / "c_001.wav").is_file() and (tmp_path / "c_002.wav").is_file()


def test_space_backend_reports_quota_error(fake_space, tmp_path, capsys):
    fake_space({"msg": "process_completed", "success": False,
                "output": {"error": "'You have exceeded your ZeroGPU runs limit.'"}})
    rc = irodori.main(["テスト", "-o", str(tmp_path / "x.wav"), "--backend", "space"])
    assert rc == 2
    err = capsys.readouterr().err
    assert "ZeroGPU" in err and "HF_TOKEN" in err
    assert not (tmp_path / "x.wav").exists()


def test_local_backend_requires_setup(monkeypatch, tmp_path, capsys):
    monkeypatch.setenv("IRODORI_HOME", str(tmp_path))
    rc = irodori.main(["テスト", "-o", str(tmp_path / "x.wav"), "--backend", "local"])
    assert rc == 2
    assert "setup_local.sh" in capsys.readouterr().err
