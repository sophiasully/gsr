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
//   --font-timeout <ms>   Max time to wait for webfonts to settle (default: 8000)

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
      'font-timeout': { type: 'string', default: '8000' },
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
    fontTimeout: Number(values['font-timeout']),
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
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: opts.stageWidth, height: opts.stageHeight },
    deviceScaleFactor: scale,
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);

  await client.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });

  const failedRequests = [];
  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), error: req.failure()?.errorText ?? 'unknown error' });
  });

  const fileUrl = url.pathToFileURL(inputPath).href;
  await page.goto(fileUrl, { waitUntil: 'commit' });

  console.log('[render] settling network + webfonts under virtual time...');
  await advanceVirtualTime(client, 'pauseIfNetworkFetchesPending', opts.fontTimeout);

  if (failedRequests.length) {
    console.warn(`[render] WARNING: ${failedRequests.length} network request(s) failed while loading the page ` +
      '(a blocked/unreachable stylesheet here means its @font-face rules never registered at all, ' +
      "so the font check below won't catch it - the text will silently render in a fallback font):");
    for (const r of failedRequests) console.warn(`  - ${r.url} (${r.error})`);
  }

  const readyState = await page.evaluate(() => document.readyState);
  if (readyState !== 'complete') {
    console.log('[render] page not fully settled yet, granting more virtual time...');
    await advanceVirtualTime(client, 'pauseIfNetworkFetchesPending', opts.fontTimeout);
  }

  const fontReport = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].map((f) => ({ family: f.family, weight: f.weight, status: f.status }));
  });
  // "unloaded" just means that @font-face was never needed for layout (e.g. a
  // declared weight the reel doesn't use) - only "error" means it was needed
  // and failed, which is the case worth warning about.
  const failedFonts = fontReport.filter((f) => f.status === 'error');
  if (failedFonts.length) {
    console.warn(`[render] WARNING: ${failedFonts.length} font face(s) failed to load and will fall back to a system font:`);
    for (const f of failedFonts) console.warn(`  - ${f.family} ${f.weight}`);
  } else {
    console.log(`[render] fonts OK (${fontReport.filter((f) => f.status === 'loaded').length} loaded, ${fontReport.filter((f) => f.status === 'unloaded').length} unused).`);
  }

  const reelMeta = await page.evaluate(() => window.__REEL__ ?? null);
  const durationMs = opts.duration ?? reelMeta?.durationMs;
  if (!durationMs) {
    throw new Error(
      "Couldn't determine reel duration. Either add `window.__REEL__ = { durationMs: <ms> }` " +
      'to the reel\'s script, or pass --duration <ms> explicitly.'
    );
  }
  console.log(`[render] duration: ${durationMs}ms @ ${opts.fps}fps${reelMeta ? ' (from window.__REEL__)' : ' (from --duration)'}`);

  // The settle step above deliberately lets virtual time run (so real
  // network/font fetches can complete), which means any load-triggered
  // autoplay in the reel has likely already raced ahead of or through its
  // whole timeline before a single frame is captured. If the reel exposes
  // `window.__REEL__.play`, call it now to (re)start the timeline from a
  // clean state so frame 0 below lines up with the reel's actual t=0.
  const replayed = await page.evaluate(() => {
    if (window.__REEL__ && typeof window.__REEL__.play === 'function') {
      window.__REEL__.play();
      return true;
    }
    return false;
  });
  console.log(replayed
    ? '[render] restarted reel timeline via window.__REEL__.play() to align with frame capture'
    : '[render] no window.__REEL__.play() found - assuming the reel\'s own autoplay already lines up with frame 0');

  const frameMs = 1000 / opts.fps;
  const totalFrames = Math.max(1, Math.round((durationMs / 1000) * opts.fps));
  const framesDir = mkdtempSync(path.join(tmpdir(), 'gsr-render-'));
  console.log(`[render] capturing ${totalFrames} frames to ${framesDir}`);

  for (let i = 0; i < totalFrames; i++) {
    if (i > 0) {
      await advanceVirtualTime(client, 'advance', frameMs);
    }
    const buf = await page.screenshot({ type: 'png' });
    writeFileSync(path.join(framesDir, `frame_${String(i).padStart(6, '0')}.png`), buf);
    if (i % Math.max(1, Math.round(opts.fps)) === 0) {
      console.log(`[render] frame ${i + 1}/${totalFrames}`);
    }
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
