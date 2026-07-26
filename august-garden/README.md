# 八月の園芸 — 一分でわかる夏の作業

A one-minute explainer for what a Japanese vegetable garden needs in August:
watering hours, shade and mulch, cutting eggplants back, checking the underside
of leaves, picking early, sowing autumn seed, and staking before a typhoon.

Eight plates, 62 seconds — one day of August every two seconds. The scrubber is
the month itself: click a date and the plate for that date's work draws itself.

Content assumes the Kantō plain (roughly USDA 9a, hot and humid August) and
open-ground vegetables. Colder regions should pull the late-August sowing
forward a week or two — noted in the table on the page.

## How it's put together

| Effect | Technique |
| --- | --- |
| Diagrams that draw themselves | `pathLength="1"` on every stroke, so one `stroke-dasharray:1 / dashoffset:1→0` keyframe animates any path without measuring it |
| Plate switching | `display:none` per plate, which restarts its animations from frame one every time you seek |
| Blueprint inversion | the plate is indigo ink on off-white by day and chalk on indigo by night — same tokens, redefined per theme, so the drawing itself flips rather than just the page around it |
| Calendar transport | 31 buttons, weekends tinted (August 2026 starts on a Saturday); the playhead is a date, not a timestamp |
| Japanese type | IPAGothic, subset to the ~390 characters the page uses and inlined as a woff2 data URI |

Two CSS traps worth knowing about, both of which bit this page during the
build: a class like `.ink{stroke:…}` beats a `stroke="…"` presentation
attribute, so per-shape colours have to be classes too; and an element can only
carry one `animation` declaration, so a shape that both draws itself and moves
needs a wrapper group — otherwise the later rule silently wins and the drawing
never appears.

## Build

`src/page.html` is the source; `index.html` is the built, self-contained page
(no CDN, no external font, no network requests at all).

```sh
pip install fonttools brotli
python3 ../tools/build_page.py src/page.html index.html
```

Open `index.html` directly — there's nothing to serve.

## Licence note

The embedded subset is [IPAGothic](https://moji.or.jp/ipafont/), used under the
IPA Font License Agreement v1.0.
