#!/usr/bin/env python3
"""List model ids available to your Gemini API key.

Use this if generate_still.py / generate_video.py report a 404 for their
default model — pick an image / video model from this list and set
COLLAGE_IMAGE_MODEL / COLLAGE_VIDEO_MODEL accordingly.
"""
import json
import os
import sys
import urllib.request

API = "https://generativelanguage.googleapis.com/v1beta"


def main():
    key = os.environ.get("GEMINI_API_KEY") or sys.exit(
        "GEMINI_API_KEY is not set (get one at https://aistudio.google.com/apikey)")
    url = f"{API}/models?pageSize=200"
    while url:
        req = urllib.request.Request(url, headers={"x-goog-api-key": key})
        with urllib.request.urlopen(req, timeout=60) as r:
            page = json.load(r)
        for m in page.get("models", []):
            print(m["name"].removeprefix("models/"))
        token = page.get("nextPageToken")
        url = f"{API}/models?pageSize=200&pageToken={token}" if token else None


if __name__ == "__main__":
    main()
