#!/usr/bin/env python3
"""Generate a voiceover line as MP3 with the ElevenLabs API.

Usage:
  python3 tts_elevenlabs.py --text "A snowball only needs the first push." \
      --voice-id <voice_id> --out voiceover-raw.mp3

Env:
  ELEVENLABS_API_KEY  (required) — from https://elevenlabs.io (profile > API keys)
  COLLAGE_TTS_MODEL   TTS model id (default: eleven_multilingual_v2)
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", required=True)
    ap.add_argument("--voice-id", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--speed", type=float, default=1.1)
    a = ap.parse_args()

    key = os.environ.get("ELEVENLABS_API_KEY") or sys.exit(
        "ELEVENLABS_API_KEY is not set (get one at https://elevenlabs.io)")
    model = os.environ.get("COLLAGE_TTS_MODEL", "eleven_multilingual_v2")

    body = {
        "text": a.text,
        "model_id": model,
        "voice_settings": {"speed": a.speed},
    }
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{a.voice_id}"
        "?output_format=mp3_44100_128",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "xi-api-key": key},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            audio = r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} from ElevenLabs:\n"
                 + e.read().decode(errors="replace")[:2000])

    out_dir = os.path.dirname(os.path.abspath(a.out))
    os.makedirs(out_dir, exist_ok=True)
    with open(a.out, "wb") as f:
        f.write(audio)
    print(f"saved {a.out}")


if __name__ == "__main__":
    main()
