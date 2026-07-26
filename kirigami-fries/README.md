# 食え — 切り紙ポテト短編

A 35-second paper-cut animation about a french fry's short life: field → cut →
fryer → salt → carton → eaten → gone. No video file, no generated frames — the
whole thing is SVG shapes and CSS keyframes that the browser redraws on every
visit.

Made in answer to [@BystAnd3rs' paper-collage fries short](https://x.com/BystAnd3rs/status/2079640307264811160),
which used generative video for the same idea.

## How it's put together

| Effect | Technique |
| --- | --- |
| Torn paper edges | `feTurbulence` + `feDisplacementMap`; every path underneath is a clean line or ellipse |
| Stop-motion wobble | a shared `steps(1)` jitter keyframe at 8 fps, with staggered negative delays so layers desync |
| Frying colour | `currentColor` interpolated raw → light brown → gold in `steps(6)` |
| Cut switching | `display:none` per scene, so re-entering a cut replays its animations from frame one |
| Japanese type | IPAGothic, subset to the ~240 characters the page uses and inlined as a woff2 data URI |

Seven cuts, timed in `SCENES` at the bottom of the page. Scrub with the
progress bar, jump with the chapter strip, and the whole thing pauses under
`prefers-reduced-motion`.

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
