#!/usr/bin/env python3
"""Generate a 9:16 collage still via the Gemini API (image output).

Usage:
  python3 generate_still.py --prompt-file still-prompt.txt --out frames/last-frame-original.png
  python3 generate_still.py --prompt "..." --out out.png

Env:
  GEMINI_API_KEY        (required) — from https://aistudio.google.com/apikey
  COLLAGE_IMAGE_MODEL   image model id (default: gemini-2.5-flash-image);
                        run list_models.py to see what your key can use
"""
import argparse
import base64
import json
import os
import sys
import urllib.request

API = "https://generativelanguage.googleapis.com/v1beta"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt")
    ap.add_argument("--prompt-file")
    ap.add_argument("--out", required=True)
    ap.add_argument("--aspect-ratio", default="9:16")
    a = ap.parse_args()

    key = os.environ.get("GEMINI_API_KEY") or sys.exit(
        "GEMINI_API_KEY is not set (get one at https://aistudio.google.com/apikey)")
    if not a.prompt and not a.prompt_file:
        sys.exit("pass --prompt or --prompt-file")
    prompt = a.prompt or open(a.prompt_file, encoding="utf-8").read()
    model = os.environ.get("COLLAGE_IMAGE_MODEL", "gemini-2.5-flash-image")

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": a.aspect_ratio},
        },
    }
    req = urllib.request.Request(
        f"{API}/models/{model}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            resp = json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:2000]
        if e.code == 404:
            detail += "\nHint: model id not available for this key — run list_models.py and set COLLAGE_IMAGE_MODEL."
        sys.exit(f"HTTP {e.code} from Gemini API:\n{detail}")

    parts = resp.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    for part in parts:
        data = part.get("inlineData", {}).get("data")
        if data:
            out_dir = os.path.dirname(os.path.abspath(a.out))
            os.makedirs(out_dir, exist_ok=True)
            with open(a.out, "wb") as f:
                f.write(base64.b64decode(data))
            print(f"saved {a.out}")
            return
    sys.exit("No image in response — raw payload for debugging:\n"
             + json.dumps(resp, indent=2)[:4000])


if __name__ == "__main__":
    main()
