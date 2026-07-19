# Collage B-roll Explainers (project skill)

Turns a single ~5-second spoken line into a 9:16, 5-second editorial
paper-collage explainer clip — halftone cut-outs assembling piece by piece on a
bold flat color field, optionally with a fitted voiceover.

Adapted from [MegaTroll222/VOX-COLLAGE-BROLL](https://github.com/MegaTroll222/VOX-COLLAGE-BROLL)
(MIT), itself an English adaptation of
[pyang5166/gbro-collage-broll](https://github.com/pyang5166/gbro-collage-broll).
See `LICENSE` in this folder. **This copy is modified to call the Gemini and
ElevenLabs APIs directly** (bring your own keys) instead of the MaxFusion MCP
the upstream version uses.

## How it works

The skill enforces a three-gate approval flow so nothing expensive is generated
before you've signed off twice:

1. **Gate 1 — Metaphors.** It proposes one visual metaphor (3–6 paper objects)
   per line and waits for approval. Text only, free.
2. **Gate 2 — Stills.** It generates the finished collage still and waits
   again. Images are cheap.
3. **Gate 3 — Video.** Only then does it animate. The trick: it builds an empty
   color-field first frame with ffmpeg and passes both frames as references, so
   the clip opens empty, assembles piece by piece, and lands exactly on the
   approved still — no drift, no zoom.

An optional voiceover stage generates TTS, trims silence, verifies the take
lands in the 4–5s window (TTS length swings between takes, so every take is
measured), and muxes it in.

## Requirements

- **ffmpeg** installed locally — frame prep, QA contact sheets, audio
  stripping, and muxing all run locally.
- **python3** (any recent version; macOS ships with one). The bundled
  `scripts/` use only the standard library — nothing to `pip install`.
- **Two API keys, set as environment variables:**

  | Variable | Used for | Where to get it |
  |---|---|---|
  | `GEMINI_API_KEY` | stills + video (pay-as-you-go) | https://aistudio.google.com/apikey |
  | `ELEVENLABS_API_KEY` | voiceover (free tier available) | https://elevenlabs.io → profile → API keys |

  On macOS (zsh), add them once to your shell profile:

  ```bash
  echo 'export GEMINI_API_KEY="your-key-here"' >> ~/.zshrc
  echo 'export ELEVENLABS_API_KEY="your-key-here"' >> ~/.zshrc
  ```

  then open a new terminal window.

Optional overrides (only if a script reports your key can't use a default
model — run `python3 scripts/list_models.py` to see what's available):
`COLLAGE_IMAGE_MODEL`, `COLLAGE_VIDEO_MODEL`, `COLLAGE_TTS_MODEL`.

## Bundled scripts

| Script | Does |
|---|---|
| `scripts/generate_still.py` | Gate 2 stills via the Gemini API (9:16 PNG) |
| `scripts/generate_video.py` | Gate 3 clip via the Gemini video API, first+last frame refs, polls and downloads the MP4 |
| `scripts/tts_elevenlabs.py` | voiceover line as MP3 via ElevenLabs |
| `scripts/list_voices.py` | lists your ElevenLabs voices (id + name) |
| `scripts/list_models.py` | lists model ids your Gemini key can use |

## Usage

In Claude Code, in this repo, say something like:

> make a collage b-roll for: "A snowball only needs the first push."

The skill triggers on phrases like "collage b-roll", "paper collage",
"halftone collage", or "collage explainer".
