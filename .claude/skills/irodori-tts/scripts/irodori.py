#!/usr/bin/env python3
"""Irodori-TTS で日本語テキストを WAV にする CLI (標準ライブラリのみ)。

バックエンドは2つ。
  space  Hugging Face Space の公開デモ API を呼ぶ。GPU もインストールも不要。
         ZeroGPU の無料枠を使うので HF_TOKEN を設定しておくのが前提。
  local  setup_local.sh でインストールした本家 Irodori-TTS で推論する。

例:
  python3 irodori.py "こんにちは。今日はいい天気ですね。"
  python3 irodori.py "あははっ🤭、本当に？" -c "明るい若い女性の声" -o out.wav
  python3 irodori.py --check
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

DEFAULT_SPACE = "Aratako/Irodori-TTS-v4.1-Small-Demo"
DEFAULT_MODEL = "Aratako/Irodori-TTS-v4.1-Small"
SPACE_ENDPOINT = "gradio_inference"
USER_AGENT = "irodori-tts-skill/1.0"
UPSTREAM_DIRNAME = "Irodori-TTS"


class TTSError(RuntimeError):
    pass


# ---------------------------------------------------------------------------
# 共通
# ---------------------------------------------------------------------------


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def find_hf_token() -> str | None:
    for name in ("HF_TOKEN", "HUGGING_FACE_HUB_TOKEN", "HUGGINGFACE_TOKEN"):
        value = os.environ.get(name, "").strip()
        if value:
            return value
    hf_home = Path(os.environ.get("HF_HOME", Path.home() / ".cache" / "huggingface"))
    token_file = hf_home / "token"
    try:
        value = token_file.read_text(encoding="utf-8").strip()
    except OSError:
        return None
    return value or None


def irodori_home() -> Path:
    return Path(os.environ.get("IRODORI_HOME", Path.home() / ".cache" / "irodori-tts")).expanduser()


def local_python() -> Path | None:
    repo = irodori_home() / UPSTREAM_DIRNAME
    for candidate in (repo / ".venv" / "bin" / "python", repo / ".venv" / "Scripts" / "python.exe"):
        if candidate.is_file():
            return candidate
    return None


def default_output_path() -> Path:
    stamp = time.strftime("%Y%m%d_%H%M%S")
    return Path("tts_output") / f"irodori_{stamp}.wav"


def candidate_paths(output: Path, count: int) -> list[Path]:
    """本家 infer.py と同じ命名 (候補が複数なら stem_001.wav ...)。"""
    if count <= 1:
        return [output]
    suffix = output.suffix or ".wav"
    return [output.with_name(f"{output.stem}_{i:03d}{suffix}") for i in range(1, count + 1)]


# ---------------------------------------------------------------------------
# HTTP (Space バックエンド)
# ---------------------------------------------------------------------------


def _request(
    url: str,
    *,
    token: str | None,
    data: bytes | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 60.0,
):
    req_headers = {"User-Agent": USER_AGENT}
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=data, headers=req_headers)
    try:
        return urllib.request.urlopen(req, timeout=timeout)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:500]
        raise TTSError(f"HTTP {exc.code} {url}\n{body}") from exc
    except urllib.error.URLError as exc:
        raise TTSError(f"接続できませんでした: {url} ({exc.reason})") from exc


def http_json(url: str, *, token: str | None, payload: object | None = None, timeout: float = 60.0):
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    with _request(url, token=token, data=data, headers=headers, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def space_info(space_id: str, token: str | None) -> dict:
    """Space のホスト名と稼働状態を返す。URL を直接渡された場合は API を引かない。"""
    if space_id.startswith(("http://", "https://")):
        return {"host": space_id.rstrip("/"), "stage": None}
    quoted = urllib.parse.quote(space_id, safe="/")
    meta = http_json(f"https://huggingface.co/api/spaces/{quoted}", token=token)
    host = meta.get("host")
    if not host:
        raise TTSError(f"Space のホストが見つかりません: {space_id}")
    stage = None
    try:
        stage = http_json(f"https://huggingface.co/api/spaces/{quoted}/runtime", token=token).get("stage")
    except TTSError:
        pass
    return {"host": host.rstrip("/"), "stage": stage}


def upload_files(host: str, paths: list[Path], token: str | None) -> list[dict]:
    if not paths:
        return []
    boundary = f"----irodori{uuid.uuid4().hex}"
    chunks: list[bytes] = []
    for path in paths:
        ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        chunks.append(
            (
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="files"; filename="{path.name}"\r\n'
                f"Content-Type: {ctype}\r\n\r\n"
            ).encode("utf-8")
        )
        chunks.append(path.read_bytes())
        chunks.append(b"\r\n")
    chunks.append(f"--{boundary}--\r\n".encode("utf-8"))
    with _request(
        f"{host}/gradio_api/upload",
        token=token,
        data=b"".join(chunks),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        timeout=300.0,
    ) as resp:
        server_paths = json.loads(resp.read().decode("utf-8"))
    return [
        {"path": sp, "orig_name": p.name, "meta": {"_type": "gradio.FileData"}}
        for sp, p in zip(server_paths, paths)
    ]


def build_space_inputs(info: dict, overrides: dict[str, object]) -> list[object]:
    """API スキーマの順に入力を並べる。指定していない項目は Space 側の既定値。"""
    endpoint = info.get("named_endpoints", {}).get(f"/{SPACE_ENDPOINT}")
    if endpoint is None:
        raise TTSError(f"Space に /{SPACE_ENDPOINT} がありません。Space の仕様が変わった可能性があります。")
    values: list[object] = []
    for param in endpoint["parameters"]:
        name = param.get("parameter_name")
        if name in overrides:
            values.append(overrides[name])
        elif param.get("parameter_has_default"):
            values.append(param.get("parameter_default"))
        else:
            values.append(None)
    return values


def resolve_fn_index(config: dict) -> int:
    for dep in config.get("dependencies", []):
        if dep.get("api_name") == SPACE_ENDPOINT:
            return int(dep.get("id", 0))
    raise TTSError(f"Space の設定に {SPACE_ENDPOINT} が見つかりません。")


def iter_sse(resp):
    for raw in resp:
        line = raw.decode("utf-8", "replace").strip()
        if not line.startswith("data:"):
            continue
        body = line[5:].strip()
        if not body:
            continue
        try:
            yield json.loads(body)
        except json.JSONDecodeError:
            continue


def collect_files(value: object) -> list[dict]:
    """Gradio の出力から FileData (path/url を持つ dict) を出現順に拾う。"""
    found: list[dict] = []
    if isinstance(value, dict):
        if "path" in value and ("url" in value or value.get("meta", {}).get("_type") == "gradio.FileData"):
            found.append(value)
        else:
            for key in ("value", "data"):
                if key in value:
                    found.extend(collect_files(value[key]))
    elif isinstance(value, list):
        for item in value:
            found.extend(collect_files(item))
    return found


def file_url(host: str, fd: dict) -> str:
    """出力ファイルの URL。Space 以外のホストを指していたら Space のホストで組み直す。"""
    url = fd.get("url")
    if url and urllib.parse.urlparse(url).netloc == urllib.parse.urlparse(host).netloc:
        return url
    return f"{host}/gradio_api/file={fd['path']}"


def quota_hint(message: str, token: str | None) -> str:
    if "ZeroGPU" not in message and "quota" not in message.lower():
        return ""
    if token:
        return (
            "\nトークン付きでも ZeroGPU の枠を使い切っています。時間をおくか、"
            "Hugging Face PRO にするか、--backend local でローカル実行してください。"
        )
    return (
        "\nHugging Face のトークンが未設定です。https://huggingface.co/settings/tokens で"
        " Read 権限のトークンを作り、環境変数 HF_TOKEN に入れてください。"
    )


def synthesize_space(args: argparse.Namespace, outputs: list[Path]) -> list[Path]:
    token = find_hf_token()
    meta = space_info(args.space, token)
    host = meta["host"]
    if meta["stage"] and meta["stage"] != "RUNNING":
        log(f"[space] {args.space} は {meta['stage']} です。起動を待つため時間がかかることがあります。")
    if args.model != DEFAULT_MODEL:
        log("[space] --model は local バックエンド専用です。Space 側のモデルで生成します。")

    api_info = http_json(f"{host}/gradio_api/info", token=token)
    fn_index = resolve_fn_index(http_json(f"{host}/config", token=token))

    refs = upload_files(host, [Path(p) for p in args.ref], token) if args.ref else []
    overrides: dict[str, object] = {
        "text": args.text,
        "caption": args.caption or "",
        "uploaded_audios": refs,
        "num_candidates": args.candidates,
        "seed_raw": "" if args.seed is None else str(args.seed),
        "seconds_raw": "" if args.seconds is None else str(args.seconds),
        "duration_scale": args.duration_scale,
    }
    if args.steps is not None:
        overrides["num_steps"] = args.steps
    data = build_space_inputs(api_info, overrides)

    session_hash = uuid.uuid4().hex[:11]
    http_json(
        f"{host}/gradio_api/queue/join",
        token=token,
        payload={"data": data, "fn_index": fn_index, "session_hash": session_hash,
                 "event_data": None, "trigger_id": None},
    )
    log(f"[space] {args.space} に送信しました。生成を待っています…")

    output = None
    with _request(
        f"{host}/gradio_api/queue/data?session_hash={session_hash}",
        token=token,
        headers={"Accept": "text/event-stream"},
        timeout=args.timeout,
    ) as resp:
        for msg in iter_sse(resp):
            kind = msg.get("msg")
            if kind == "estimation" and msg.get("rank"):
                log(f"[space] 順番待ち {msg.get('rank')} 人目")
            elif kind == "process_starts":
                log("[space] 生成を開始しました")
            elif kind == "process_completed":
                if not msg.get("success"):
                    err = (msg.get("output") or {}).get("error") or "原因不明のエラー"
                    err = str(err).strip("'\"")
                    raise TTSError(f"Space がエラーを返しました: {err}{quota_hint(err, token)}")
                output = msg.get("output") or {}
                break
            elif kind == "close_stream":
                break
    if output is None:
        raise TTSError("Space から結果が返ってきませんでした。")

    result_data = output.get("data") or []
    run_log = next((v for v in reversed(result_data) if isinstance(v, str)), "")
    seed = re.search(r"seed_used:\s*(-?\d+)", run_log)
    if seed:
        log(f"[space] seed: {seed.group(1)}")

    files = collect_files(result_data)
    if not files:
        raise TTSError(f"音声ファイルが返ってきませんでした。ログ:\n{run_log}")

    saved: list[Path] = []
    for fd, dest in zip(files, outputs):
        url = file_url(host, fd)
        remote_suffix = Path(urllib.parse.urlparse(url).path).suffix.lower()
        if remote_suffix and dest.suffix.lower() != remote_suffix:
            log(f"[space] Space は {remote_suffix} を返したので拡張子を合わせます")
            dest = dest.with_suffix(remote_suffix)
        dest.parent.mkdir(parents=True, exist_ok=True)
        with _request(url, token=token, timeout=300.0) as resp, open(dest, "wb") as fh:
            shutil.copyfileobj(resp, fh)
        saved.append(dest)
    return saved


# ---------------------------------------------------------------------------
# local バックエンド
# ---------------------------------------------------------------------------


def synthesize_local(args: argparse.Namespace, outputs: list[Path]) -> list[Path]:
    python = local_python()
    if python is None:
        raise TTSError(
            "ローカル環境が見つかりません。先に setup_local.sh を実行してください "
            f"(インストール先: {irodori_home() / UPSTREAM_DIRNAME})"
        )
    repo = irodori_home() / UPSTREAM_DIRNAME
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    cmd = [str(python), "infer.py", "--hf-checkpoint", args.model, "--text", args.text,
           "--output-wav", str(output), "--num-candidates", str(args.candidates),
           "--duration-scale", str(args.duration_scale)]
    if args.caption:
        cmd += ["--caption", args.caption]
    refs = [str(Path(p).resolve()) for p in args.ref]
    if len(refs) == 1:
        cmd += ["--ref-wav", refs[0]]
    elif refs:
        cmd += ["--ref-wavs", *refs]
    else:
        cmd += ["--no-ref"]
    if args.seed is not None:
        cmd += ["--seed", str(args.seed)]
    if args.steps is not None:
        cmd += ["--num-steps", str(args.steps)]
    if args.seconds is not None:
        cmd += ["--seconds", str(args.seconds)]

    log(f"[local] {args.model} で生成します (初回はモデルのダウンロードで数分かかります)")
    proc = subprocess.run(cmd, cwd=repo, stdout=sys.stderr, stderr=sys.stderr)
    if proc.returncode != 0:
        raise TTSError(f"ローカル推論が失敗しました (exit {proc.returncode})")
    missing = [p for p in outputs if not p.resolve().is_file()]
    if missing:
        raise TTSError(f"出力ファイルが見つかりません: {', '.join(map(str, missing))}")
    return outputs


# ---------------------------------------------------------------------------
# --check
# ---------------------------------------------------------------------------


def run_check(args: argparse.Namespace) -> int:
    token = find_hf_token()
    print(f"HF トークン      : {'あり' if token else 'なし (Space の ZeroGPU 枠が足りなくなりやすい)'}")
    python = local_python()
    print(f"local バックエンド: {'インストール済み ' + str(python) if python else '未インストール'}")
    try:
        meta = space_info(args.space, token)
        print(f"space バックエンド: {args.space} -> {meta['host']} (状態: {meta['stage'] or '不明'})")
        api = http_json(f"{meta['host']}/gradio_api/info", token=token)
        ok = f"/{SPACE_ENDPOINT}" in api.get("named_endpoints", {})
        print(f"Space API        : {'OK' if ok else '想定したエンドポイントがありません'}")
    except TTSError as exc:
        print(f"space バックエンド: 確認できませんでした ({exc})")
    return 0


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Irodori-TTS で日本語の音声を生成して WAV に保存します。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="例:" + __doc__.split("例:", 1)[1],
    )
    p.add_argument("text", nargs="?", help="読み上げるテキスト。'-' なら標準入力から読む")
    p.add_argument("-f", "--text-file", help="テキストをファイルから読む (UTF-8)")
    p.add_argument("-o", "--output", help="出力先 (既定: tts_output/irodori_日時.wav)")
    p.add_argument("-c", "--caption", help="声質や話し方の指示文 (例: 落ち着いた低めの男性の声)")
    p.add_argument("-r", "--ref", nargs="+", default=[], metavar="WAV",
                   help="声をまねる参照音声。複数指定すると連結して使う")
    p.add_argument("--seed", type=int, help="乱数シード。同じ値なら同じ声になりやすい")
    p.add_argument("--steps", type=int, help="サンプリングステップ数 (既定: 通常版40、MF版4)")
    p.add_argument("-n", "--candidates", type=int, default=1, help="一度に作る候補数")
    p.add_argument("--seconds", type=float, help="長さを秒で固定する (既定: 自動推定)")
    p.add_argument("--duration-scale", type=float, default=1.0,
                   help="自動推定した長さの倍率。1より大きいとゆっくり")
    p.add_argument("--backend", choices=["auto", "space", "local"], default="auto",
                   help="auto はローカル環境があれば local、なければ space")
    p.add_argument("--space", default=os.environ.get("IRODORI_SPACE", DEFAULT_SPACE),
                   help=f"使う Space (既定: {DEFAULT_SPACE})。URL も可")
    p.add_argument("--model", default=os.environ.get("IRODORI_MODEL", DEFAULT_MODEL),
                   help="local で使うモデル。CPU なら Aratako/Irodori-TTS-v4.1-Small-MF が速い")
    p.add_argument("--timeout", type=float, default=600.0, help="Space の待ち時間の上限 (秒)")
    p.add_argument("--check", action="store_true", help="使える状態かどうかを確認して終わる")
    args = p.parse_args(argv)

    if args.check:
        return args
    if args.text_file:
        args.text = Path(args.text_file).read_text(encoding="utf-8")
    elif args.text == "-":
        args.text = sys.stdin.read()
    if not args.text or not args.text.strip():
        p.error("読み上げるテキストを指定してください")
    args.text = args.text.strip()
    if args.candidates < 1:
        p.error("--candidates は1以上にしてください")
    for ref in args.ref:
        if not Path(ref).is_file():
            p.error(f"参照音声が見つかりません: {ref}")
    if args.output is None:
        args.output = str(default_output_path())
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.check:
        return run_check(args)

    backend = args.backend
    if backend == "auto":
        backend = "local" if local_python() else "space"
    outputs = candidate_paths(Path(args.output), args.candidates)

    try:
        if backend == "local":
            saved = synthesize_local(args, outputs)
        else:
            saved = synthesize_space(args, outputs)
    except TTSError as exc:
        log(f"エラー: {exc}")
        return 2

    for path in saved:
        print(path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
