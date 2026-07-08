# Working in this repo

## Git workflow — non-negotiable

**Every session must push finished work directly to `origin/main`.** This repo
does not use a pull-request review process — there is no reviewer waiting on
a branch. Work that stays on a feature branch and never reaches `main` is not
done. Concretely:

- Commit as you go, with clear messages.
- Once a change is verified (renders correctly, screenshots checked, etc.),
  push it to `main` immediately. Don't wait for the user to ask "did you push
  that?" — they will always want it on `main`.
- If you're on a feature branch for isolation while iterating, merge it into
  `main` and push as soon as the work is settled, not at the end of some
  larger multi-day task.
- This does not suspend normal git safety: still run `git status` before
  anything destructive, never force-push over someone else's unrelated
  commits, don't skip hooks. "Push to main" is pre-authorized; force-pushing
  over other work is not.

## How this user likes creative decisions handled

- When there's a real design/copy decision (a closing slide, a stat
  presentation, a headline treatment), build **actual working variants** and
  screenshot them side by side — don't just describe options in prose. Let
  the user pick from real images.
- Once a direction is chosen: delete the losing variant(s), wire the winner
  into the real production timeline/markup (not a throwaway preview scene),
  and re-render to confirm it still works correctly in place before calling
  it done.
- Always deliver visual work as actual image files (send them), never just a
  text description of what something looks like.
- Export at high quality: 2x supersample + Lanczos downsample (see
  `tools/render/slides.mjs`), not a raw 1x screenshot.
- Clean up scratch scripts and inert preview markup once a decision is
  final — don't leave dead scenes or one-off capture scripts committed.

## Fact-checking and citations

- Any stat that will be publicly attributed to a named source (e.g.
  BrightLocal) must be verified against real, current research first —
  don't assume a number already in a file is accurate just because it's
  there. Cross-check across independent sources.
- Flag numbers that don't hold up rather than shipping them quietly. If a
  stat is close-but-rounded vs. an exact published figure, say so.
- Prefer current-year sources and note the report year explicitly.

## Tone for GetSetReply creative content

- Educational/informative, not sales-y. Avoid hard CTAs or "sell the
  product" energy, especially on closing slides — brand mark can be present
  but should read as a quiet signature, not a pitch.

## Known environment gotchas

- `tools/render/render.mjs` (HTML reel → video) can intermittently hang
  because Chrome's `Emulation.setVirtualTimePolicy` (used for frame-accurate
  capture) is an experimental API. This is a pre-existing tool fragility,
  not something to fix by changing reel content.
- `tools/render/slides.mjs` (HTML → static PNGs) has no virtual-time clock
  involved and does not share that fragility — prefer it for anything that
  doesn't need a real video timeline.
