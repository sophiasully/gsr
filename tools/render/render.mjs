#!/usr/bin/env node
// Renders an HTML "reel" (see repo README) to a broadcast-quality video.
//
// Instead of recording the screen in real time (which bakes in whatever
// jank the machine happens to produce that run), this drives Chromium's
// DevTools Protocol virtual-time clock: JS timers, rAF, and CSS
// animations/transitions are all paced by a virtual clock we advance one
// video frame at a time, and we screenshot between each advance. The
// output is bit-for-bit reproducible and never drops a frame, no matter
// how loaded the render machine is.
//
// Usage:
//   node tools/render/render.mjs <input.html> [options]
//
// Options:
//   --out <file>         Output path (default: out/<input-basename>.mp4)
//   --fps <n>             Frames per second (default: 60)
//   --width <px>          Output width in physical pixels (default: 1080)
//   --height <px>         Output height in physical pixels (default: 1920)
//   --stage-width <px>    Source CSS width of the reel's .stage (default: 405)
//   --stage-height <px>   Source CSS height of the reel's .stage (default: 720)
//   --duration <ms>       Override the reel's window.__REEL__.durationMs
//   --crf <n>             x264 quality, lower = higher quality (default: 16)
//   --format <mp4|mov>    mp4 = H.264 delivery file, mov = ProRes 422 HQ master
//   --supersample <n>      Capture at N x the output resolution and downsample
//                          with Lanczos (default: 2) - sharper text/gradient
//                          edges than rendering 1:1. Set to 1 to disable.
//   --keep-frames          Don't delete the intermediate PNG frames
//   --settle-budget-ms <ms>  Virtual ms granted for network/webfonts to
//                          settle before the reel's own duration is measured
//                          (default: 8000). The reel may autoplay partway
//                          through this - see window.__REEL__.playStartedAt.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { mkdtempSync, mkdirSync, rmSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import url from 'node:url';

function parseCliArgs(argv) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      out: { type: 'string' },
      fps: { type: 'string', default: '60' },
      width: { type: 'string', default: '1080' },
      height: { type: 'string', default: '1920' },
      'stage-width': { type: 'string', default: '405' },
      'stage-height': { type: 'string', default: '720' },
      duration: { type: 'string' },
      crf: { type: 'string', default: '16' },
      format: { type: 'string', default: 'mp4' },
      supersample: { type: 'string', default: '2' },
      'keep-frames': { type: 'boolean', default: false },
      'settle-budget-ms': { type: 'string', default: '8000' },
    },
  });

  if (positionals.length !== 1) {
    throw new Error('Usage: node tools/render/render.mjs <input.html> [options]');
  }

  return {
    input: positionals[0],
    out: values.out,
    fps: Number(values.fps),
    width: Number(values.width),
    height: Number(values.height),
    stageWidth: Number(values['stage-width']),
    stageHeight: Number(values['stage-height']),
    duration: values.duration ? Number(values.duration) : undefined,
    crf: Number(values.crf),
    format: values.format,
    supersample: Number(values.supersample),
    keepFrames: values['keep-frames'],
    settleBudgetMs: Number(values['settle-budget-ms']),
  };
}

function advanceVirtualTime(client, policy, budget) {
  return new Promise((resolve) => {
    const onExpired = () => {
      client.off('Emulation.virtualTimeBudgetExpired', onExpired);
      resolve();
    };
    client.on('Emulation.virtualTimeBudgetExpired', onExpired);
    client.send('Emulation.setVirtualTimePolicy', { policy, budget }).catch(() => {});
  });
}

async function resolveFfmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const mod = await import('ffmpeg-static');
    if (mod.default) return mod.default;
  } catch {
    // fall through to PATH lookup
  }
  return 'ffmpeg';
}

function runFfmpeg(ffmpegPath, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));

  const inputPath = path.resolve(opts.input);
  if (!existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const outPath = opts.out
    ? path.resolve(opts.out)
    : path.resolve('out', `${path.basename(inputPath, path.extname(inputPath))}.${opts.format}`);
  mkdirSync(path.dirname(outPath), { recursive: true });

  const captureWidth = opts.width * opts.supersample;
  const captureHeight = opts.height * opts.supersample;
  const scale = captureWidth / opts.stageWidth;
  const expectedHeight = Math.round(opts.stageHeight * scale);
  if (Math.abs(expectedHeight - captureHeight) > opts.supersample) {
    console.warn(
      `[render] warning: --width/--height aspect ratio (${opts.width}x${opts.height}) doesn't match ` +
      `the stage aspect ratio (${opts.stageWidth}x${opts.stageHeight}). Output will be stretched.`
    );
  }

  console.log(
    `[render] launching Chromium (capturing ${captureWidth}x${captureHeight} at ${scale.toFixed(3)}x scale, ` +
    `stage ${opts.stageWidth}x${opts.stageHeight} -> ${opts.width}x${opts.height} output${opts.supersample > 1 ? ` via ${opts.supersample}x supersample` : ''})`
  );

  // Launches a fresh browser, navigates to the reel, lets it settle, and
  // returns a handle plus how far (in ms) the reel's own timeline already
  // advanced during settling. Split out from the frame loop below so a
  // wedged page can be thrown away and replaced with a clean one instead of
  // failing the whole render (see the retry logic in the capture loop).
  async function launchSettledPage() {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: opts.stageWidth, height: opts.stageHeight },
      deviceScaleFactor: scale,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    const client = await context.newCDPSession(page);

    const failedRequests = [];
    page.on('requestfailed', (req) => {
      failedRequests.push({ url: req.url(), error: req.failure()?.errorText ?? 'unknown error' });
    });

    // Belt-and-suspenders determinism: explicitly seek every CSS animation/transition
    // via the Web Animations API instead of relying on page.screenshot() implicitly
    // ticking the compositor forward by the right amount. This is the same technique
    // production HTML-to-video renderers use (a WAAPI adapter over CSS keyframes) -
    // it makes frame timing an explicit, spec-guaranteed seek rather than a side effect.
    await page.addInitScript(() => {
      // documentElement doesn't exist yet this early in navigation (parsing
      // hasn't started), so defer to DOMContentLoaded - still long before any
      // frame gets captured.
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.classList.add('gsr-render');
      });
      window.__trackedAnimations = [];
      const track = (animation) => {
        if (animation.__tracked) return;
        animation.__tracked = true;
        animation.__base = performance.now() - animation.currentTime;
        animation.pause();
        window.__trackedAnimations.push(animation);
      };
      document.addEventListener('animationstart', (e) => track(e.animation), true);
      document.addEventListener('transitionstart', (e) => {
        const anim = e.target.getAnimations().find((a) => a.transitionProperty === e.propertyName);
        if (anim) track(anim);
      }, true);
    });

    await client.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
    const fileUrl = url.pathToFileURL(inputPath).href;
    await page.goto(fileUrl, { waitUntil: 'commit' });

    // Letting network/fonts settle requires actually advancing virtual time
    // (Emulation.setVirtualTimePolicy's 'pause' freezes the *entire* JS engine,
    // including promise microtasks like document.fonts.ready - not just
    // timers - so there's no way to let a network request resolve without also
    // letting the reel's own setTimeout-driven scenes run). That means the
    // reel's autoplay (window 'load' -> setTimeout(play, 300)) fires and runs
    // for the whole settle budget (in practice this eats nearly all of it,
    // regardless of how quickly resources actually settle), landing well into
    // the reel's own timeline - potentially past several scenes - before a
    // single frame is captured.
    await advanceVirtualTime(client, 'pauseIfNetworkFetchesPending', opts.settleBudgetMs);

    // Rather than accept whatever point settling happened to land on as frame
    // 0 (which would silently skip however much of the reel already played
    // out), restart the reel via its Replay button so capture always begins
    // at the reel's true t=0. Every reel in this workspace exposes one (see
    // README) purely for interactive preview; reusing it here means the
    // renderer doesn't need a separate reset convention.
    const hasReplay = await page.evaluate(() => !!document.getElementById('replay'));
    if (hasReplay) {
      await page.evaluate(() => document.getElementById('replay').click());
    }

    const reelMeta = await page.evaluate(() => window.__REEL__ ?? null);

    let alreadyElapsedMs = 0;
    if (reelMeta && 'playStartedAt' in reelMeta) {
      const timing = await page.evaluate(() => ({
        now: performance.now(),
        playStartedAt: window.__REEL__.playStartedAt,
      }));
      if (timing.playStartedAt != null) {
        alreadyElapsedMs = Math.max(0, timing.now - timing.playStartedAt);
      }
    }
    if (!hasReplay && alreadyElapsedMs > 0) {
      console.warn(
        `[render] warning: no #replay button found to reset the reel, so capture starts ${alreadyElapsedMs.toFixed(0)}ms ` +
        'into its timeline (whatever settling already played through) instead of true t=0.'
      );
    }

    return { browser, context, page, client, failedRequests, reelMeta, alreadyElapsedMs };
  }

  console.log('[render] settling network + webfonts under virtual time...');
  let { browser, context, page, client, failedRequests, reelMeta, alreadyElapsedMs } = await launchSettledPage();

  if (failedRequests.length) {
    console.warn(`[render] WARNING: ${failedRequests.length} network request(s) failed while loading the page ` +
      '(a blocked/unreachable stylesheet here means its @font-face rules never registered at all, ' +
      "so the font check below won't catch it - the text may render in a fallback font):");
    for (const r of failedRequests) console.warn(`  - ${r.url} (${r.error})`);
  }

  const durationMs = opts.duration ?? reelMeta?.durationMs;
  if (!durationMs) {
    throw new Error(
      "Couldn't determine reel duration. Either add `window.__REEL__ = { durationMs: <ms> }` " +
      'to the reel\'s script, or pass --duration <ms> explicitly.'
    );
  }
  if (reelMeta && alreadyElapsedMs === 0 && !('playStartedAt' in reelMeta && reelMeta.playStartedAt != null)) {
    console.warn("[render] warning: reel hasn't called play() yet after settling - it may be desynced from frame 0");
  }

  const remainingMs = Math.max(0, durationMs - alreadyElapsedMs);
  console.log(
    `[render] duration: ${durationMs}ms @ ${opts.fps}fps${reelMeta ? ' (from window.__REEL__)' : ' (from --duration)'}` +
    (alreadyElapsedMs > 0 ? ` - ${alreadyElapsedMs.toFixed(0)}ms already elapsed during settling, capturing remaining ${remainingMs.toFixed(0)}ms` : '')
  );

  const frameMs = 1000 / opts.fps;
  const totalFrames = Math.max(1, Math.round((remainingMs / 1000) * opts.fps));
  const framesDir = mkdtempSync(path.join(tmpdir(), 'gsr-render-'));
  console.log(`[render] capturing ${totalFrames} frames to ${framesDir}`);

  const seekAndCommitAnimations = () => page.evaluate(() => {
    const next = [];
    for (const a of window.__trackedAnimations) {
      if (a.playState === 'idle') continue;
      try {
        a.currentTime = performance.now() - a.__base;
      } catch {
        // Animation was cancelled (e.g. its scene's .on class was removed) between
        // being tracked and this resync - nothing to seek, safe to ignore.
        continue;
      }
      // A finished forwards-fill animation has nothing left to seek, but
      // leaving it attached keeps accumulating live Animation objects across
      // scenes - on reels with enough scenes/animations that backlog has been
      // observed to deadlock Chromium's virtual-time screenshot pipeline.
      // commitStyles() bakes its current (final) effect into an inline style
      // so cancel() can detach it with no visual change.
      if (a.playState === 'finished') {
        try { a.commitStyles(); } catch { /* not fill:forwards or already detached */ }
        try { a.cancel(); } catch { /* already idle */ }
        continue;
      }
      next.push(a);
    }
    window.__trackedAnimations = next;
  });

  // currentAbsMs tracks where *this* page instance's virtual clock actually is,
  // measured in the reel's own timeline (i.e. relative to alreadyElapsedMs at
  // first launch). Kept separate from the loop index because a relaunch below
  // replaces the page with one whose virtual clock starts over from its own
  // settle point, needing a different-sized jump to reach the same target.
  let currentAbsMs = alreadyElapsedMs;

  // Jumps this page instance's virtual clock straight to targetAbsMs (a single
  // big advance, not frameMs-sized steps - the fresh page's clock starts over
  // after a relaunch, so it needs a differently-sized jump than the main loop).
  async function seekTo(targetAbsMs) {
    const deltaMs = targetAbsMs - currentAbsMs;
    if (deltaMs > 0) await advanceVirtualTime(client, 'advance', deltaMs);
    currentAbsMs = targetAbsMs;
    await seekAndCommitAnimations();
  }

  let relaunches = 0;
  const maxRelaunches = 20;

  for (let i = 0; i < totalFrames; i++) {
    const targetAbsMs = alreadyElapsedMs + i * frameMs;
    try {
      await seekTo(targetAbsMs);
      const buf = await page.screenshot({ type: 'png' });
      writeFileSync(path.join(framesDir, `frame_${String(i).padStart(6, '0')}.png`), buf);
    } catch (err) {
      relaunches += 1;
      if (relaunches > maxRelaunches) {
        throw new Error(`[render] gave up after ${maxRelaunches} browser relaunches trying to capture frame ${i}: ${err.message}`);
      }
      console.warn(`[render] frame ${i} stalled (${err.message.split('\n')[0]}) - relaunching Chromium and resuming (relaunch ${relaunches}/${maxRelaunches})...`);
      await browser.close().catch(() => {});
      ({ browser, context, page, client, alreadyElapsedMs: currentAbsMs } = await launchSettledPage());
      await seekTo(targetAbsMs);
      const buf = await page.screenshot({ type: 'png' });
      writeFileSync(path.join(framesDir, `frame_${String(i).padStart(6, '0')}.png`), buf);
    }
    if (i % Math.max(1, Math.round(opts.fps)) === 0) {
      console.log(`[render] frame ${i + 1}/${totalFrames}`);
    }
  }

  const fontReport = await page.evaluate(() =>
    [...document.fonts].map((f) => ({ family: f.family, weight: f.weight, status: f.status }))
  );
  // "unloaded" just means that @font-face was never needed for layout (e.g. a
  // declared weight the reel doesn't use) - only "error" means it was needed
  // and failed, which is the case worth warning about.
  const failedFonts = fontReport.filter((f) => f.status === 'error');
  if (failedFonts.length) {
    console.warn(`[render] WARNING: ${failedFonts.length} font face(s) failed to load and rendered in a fallback font:`);
    for (const f of failedFonts) console.warn(`  - ${f.family} ${f.weight}`);
  } else {
    console.log(`[render] fonts OK (${fontReport.filter((f) => f.status === 'loaded').length} loaded, ${fontReport.filter((f) => f.status === 'unloaded').length} unused).`);
  }

  await browser.close();
  console.log('[render] frames captured, encoding...');

  const ffmpegPath = await resolveFfmpegPath();
  const framePattern = path.join(framesDir, 'frame_%06d.png');
  const scaleFilter = opts.supersample > 1
    ? ['-vf', `scale=${opts.width}:${opts.height}:flags=lanczos`]
    : [];
  let ffmpegArgs;
  if (opts.format === 'mov') {
    ffmpegArgs = [
      '-y', '-framerate', String(opts.fps), '-i', framePattern,
      ...scaleFilter,
      '-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le',
      outPath,
    ];
  } else {
    ffmpegArgs = [
      '-y', '-framerate', String(opts.fps), '-i', framePattern,
      ...scaleFilter,
      '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-crf', String(opts.crf), '-preset', 'slow', '-movflags', '+faststart',
      outPath,
    ];
  }

  await runFfmpeg(ffmpegPath, ffmpegArgs);

  if (!opts.keepFrames) {
    rmSync(framesDir, { recursive: true, force: true });
  } else {
    console.log(`[render] kept frames at ${framesDir}`);
  }

  const { size } = statSync(outPath);
  console.log(`[render] done -> ${outPath} (${(size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error(`[render] failed: ${err.message}`);
  process.exit(1);
});
