#!/usr/bin/env python3
"""List the voices available to your ElevenLabs account (id, name, labels)."""
import json
import os
import sys
import urllib.request


def main():
    key = os.environ.get("ELEVENLABS_API_KEY") or sys.exit(
        "ELEVENLABS_API_KEY is not set (get one at https://elevenlabs.io)")
    req = urllib.request.Request(
        "https://api.elevenlabs.io/v1/voices", headers={"xi-api-key": key})
    with urllib.request.urlopen(req, timeout=60) as r:
        voices = json.load(r).get("voices", [])
    for v in voices:
        labels = ", ".join(f"{k}={val}" for k, val in (v.get("labels") or {}).items())
        print(f"{v['voice_id']}  {v['name']}  [{labels}]")
    if not voices:
        print("no voices returned")


if __name__ == "__main__":
    main()
