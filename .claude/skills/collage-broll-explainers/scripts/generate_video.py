#!/usr/bin/env python3
"""Generate the assemble-from-empty clip via the Gemini API video endpoint.

Sends the empty first frame ("Image 1") and the approved last frame
("Image 2") as references, polls the long-running job, and downloads the MP4.

Usage:
  python3 generate_video.py --prompt-file omni-prompt.txt \
      --first-frame frames/first-frame.png --last-frame frames/last-frame.png \
      --out omni/run-v01/final-5s.mp4

Env:
  GEMINI_API_KEY        (required) — from https://aistudio.google.com/apikey
  COLLAGE_VIDEO_MODEL   video model id (default: gemini-omni-flash);
                        run list_models.py to see what your key can use
"""
import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

API = "https://generativelanguage.googleapis.com/v1beta"


def request(url, key, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json", "x-goog-api-key": key})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:2000]
        if e.code == 404 and body is not None:
            detail += "\nHint: model id not available for this key — run list_models.py and set COLLAGE_VIDEO_MODEL."
        sys.exit(f"HTTP {e.code} from Gemini API:\n{detail}")


def image_part(path):
    with open(path, "rb") as f:
        return {"bytesBase64Encoded": base64.b64encode(f.read()).decode(),
                "mimeType": "image/png"}


def find_video_uri(obj):
    """The response nests the file URI differently across model versions —
    walk the payload and take the first files/ URI we find."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "uri" and isinstance(v, str) and "/files/" in v:
                return v
            found = find_video_uri(v)
            if found:
                return found
    elif isinstance(obj, list):
        for v in obj:
            found = find_video_uri(v)
            if found:
                return found
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt")
    ap.add_argument("--prompt-file")
    ap.add_argument("--first-frame", required=True)
    ap.add_argument("--last-frame", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--duration", type=int, default=5)
    ap.add_argument("--aspect-ratio", default="9:16")
    ap.add_argument("--resolution", default="720p")
    a = ap.parse_args()

    key = os.environ.get("GEMINI_API_KEY") or sys.exit(
        "GEMINI_API_KEY is not set (get one at https://aistudio.google.com/apikey)")
    if not a.prompt and not a.prompt_file:
        sys.exit("pass --prompt or --prompt-file")
    prompt = a.prompt or open(a.prompt_file, encoding="utf-8").read()
    model = os.environ.get("COLLAGE_VIDEO_MODEL", "gemini-omni-flash")

    body = {
        "instances": [{
            "prompt": prompt,
            "image": image_part(a.first_frame),
            "lastFrame": image_part(a.last_frame),
        }],
        "parameters": {
            "aspectRatio": a.aspect_ratio,
            "durationSeconds": a.duration,
            "resolution": a.resolution,
        },
    }
    op = request(f"{API}/models/{model}:predictLongRunning", key, body)
    name = op.get("name") or sys.exit(
        "No operation name in response:\n" + json.dumps(op, indent=2)[:4000])
    print(f"job submitted: {name}")

    while not op.get("done"):
        time.sleep(15)
        op = request(f"{API}/{name}", key)
        print("...still generating")

    if "error" in op:
        sys.exit("Generation failed:\n" + json.dumps(op["error"], indent=2))

    uri = find_video_uri(op.get("response", {}))
    if not uri:
        sys.exit("Job done but no video URI found — raw payload for debugging:\n"
                 + json.dumps(op, indent=2)[:4000])

    if "alt=media" not in uri:
        uri += ("&" if "?" in uri else "?") + "alt=media"
    dl = urllib.request.Request(uri, headers={"x-goog-api-key": key})
    out_dir = os.path.dirname(os.path.abspath(a.out))
    os.makedirs(out_dir, exist_ok=True)
    with urllib.request.urlopen(dl, timeout=600) as r, open(a.out, "wb") as f:
        f.write(r.read())
    print(f"saved {a.out}")


if __name__ == "__main__":
    main()
