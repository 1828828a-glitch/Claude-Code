# Collage B-roll Explainers (project skill)

Turns a single ~5-second spoken line into a 9:16, 5-second editorial
paper-collage explainer clip — halftone cut-outs assembling piece by piece on a
bold flat color field, optionally with a fitted voiceover.

Vendored from [MegaTroll222/VOX-COLLAGE-BROLL](https://github.com/MegaTroll222/VOX-COLLAGE-BROLL)
(MIT), itself an English adaptation of
[pyang5166/gbro-collage-broll](https://github.com/pyang5166/gbro-collage-broll).
See `LICENSE` in this folder.

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
- **MaxFusion MCP** connected and authenticated — all image, video, and speech
  generation goes through it:

  ```bash
  claude mcp add --transport http maxfusion https://mcp.maxfusion.ai/mcp
  ```

  To run without MaxFusion instead, you need a Google AI Studio API key (stills
  + the Gemini video model) and an ElevenLabs API key (voiceover), and the
  `maxfusion_*` tool calls in `SKILL.md` swapped for scripts against those
  APIs. Everything else (templates, gates, ffmpeg steps, QA) is unchanged —
  ask Claude to adapt the skill if you go this route.

## Usage

In Claude Code, in this repo, say something like:

> make a collage b-roll for: "A snowball only needs the first push."

The skill triggers on phrases like "collage b-roll", "paper collage",
"halftone collage", or "collage explainer".
