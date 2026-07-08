# GetSetReply Workspace

Creative workspace for GetSetReply assets: self-contained HTML "reels" (short
animated vertical spots) rendered to broadcast-quality MP4/MOV, and static
HTML "slide decks" rendered to individual PNGs (carousel posts, etc).

## Layout

```
*.html                  Reels and slide decks. Each is a single self-contained page.
assets/fonts/           Self-hosted webfonts + fonts.css
tools/render/render.mjs The HTML -> video renderer (reels)
tools/render/slides.mjs The HTML -> PNG renderer (slide decks)
out/                    Rendered output (gitignored)
```

## Authoring a reel

A reel is a plain HTML file with a `.stage` element (fixed CSS px size, 9:16 by
convention) containing `.scene` elements that fade in/out on a timeline driven
by `setTimeout`/CSS animations, same pattern as `getsetreply-launch-reel-v2.html`.

To make a reel renderable, expose exactly when it's done playing:

```js
window.__REEL__ = { durationMs: <total ms from page load to the last frame> };
```

Without this the renderer has no way to know when to stop, short of you
passing `--duration` by hand every time.

### Fonts

Put shared `@font-face` rules in `assets/fonts/fonts.css` and link it instead
of a CDN. Self-hosting matters here beyond politeness to font vendors: the
renderer runs headless and pauses on network activity to make sure fonts are
in before it starts capturing, so a slow or unreachable font CDN directly
costs render time and, if it's actually unreachable, silently degrades output
to a fallback font. Space Mono is already self-hosted this way. General Sans
is still loaded live from Fontshare (see the note at the bottom of
`fonts.css` for how to self-host it too).

## Rendering

```
npm install
npm run render -- <reel.html> [options]
```

Common options (see `tools/render/render.mjs` header for the full list):

| Flag | Default | Meaning |
|---|---|---|
| `--out` | `out/<name>.mp4` | Output path |
| `--fps` | `60` | Frames per second |
| `--width` / `--height` | `1080` / `1920` | Output resolution (px) |
| `--crf` | `16` | x264 quality (lower = better/bigger) |
| `--format` | `mp4` | `mp4` (H.264 delivery file) or `mov` (ProRes 422 HQ master) |
| `--supersample` | `2` | Capture at N x the output res, downsample with Lanczos for cleaner edges. `1` disables. |
| `--duration` | from `window.__REEL__` | Override the captured length (ms) |

Example - a 4K-native master plus a delivery file:

```
npm run render -- getsetreply-launch-reel-v2.html --format mov --out out/launch-reel-master.mov
npm run render -- getsetreply-launch-reel-v2.html --out out/launch-reel.mp4
```

### Why this doesn't just screen-record

A real-time screen capture bakes in whatever jank the render machine
happened to produce that run - dropped frames, uneven easing, font-swap
flicker. Instead, `render.mjs` drives Chromium's DevTools Protocol virtual
clock: it loads the reel, waits (in real time) for network + webfonts to
settle, then advances the virtual clock exactly one video frame at a time,
screenshotting between each advance. Every JS timer, `requestAnimationFrame`,
and CSS animation is paced by that same clock, so the output is
frame-accurate and bit-for-bit reproducible regardless of machine load - the
same source file renders identically whether the render box is idle or on
fire.

Frames are captured as lossless PNGs at the target resolution (no upscaling)
and handed to ffmpeg for final encode.

### Requirements

- Node 18+
- `ffmpeg` reachable one of three ways: the `ffmpeg-static` npm package
  (installed automatically, no system install needed), a system `ffmpeg` on
  `PATH`, or an explicit path via `FFMPEG_PATH`.

## Authoring a slide deck

A slide deck is a plain HTML file with one `.stage[data-slide="N"]` element
per slide (same fixed CSS px size/branding convention as reels), laid out
however's convenient for browser preview - `getsetreply-launch-slides.html`
just flexes them in a gallery. There's no timeline: slides are static, so
skip the `.scene`/animation/`window.__REEL__` machinery entirely.

```
npm install
npm run slides -- <deck.html> [options]
```

| Flag | Default | Meaning |
|---|---|---|
| `--out-dir` | `out` | Output directory |
| `--width` / `--height` | `1080` / `1920` | Output resolution (px), per slide |
| `--stage-width` / `--stage-height` | `405` / `720` | Source CSS size of each `.stage` |

Writes one `<deck-name>-<N>.png` per `data-slide="N"` element found.

Unlike `render.mjs`, this is a plain `page.screenshot()` per element with no
virtual-time clock involved. `render.mjs` needs that clock to pace a timeline
frame-by-frame, but it leans on `Emulation.setVirtualTimePolicy`, an
experimental Chrome DevTools Protocol feature that can hang `captureScreenshot`
outright in some timing windows (see upstream reports like
[chrome-headless-render-pdf#29](https://github.com/Szpadel/chrome-headless-render-pdf/issues/29)).
Slides have no timeline to pace, so that whole mechanism - and its fragility
- is simply absent here.
