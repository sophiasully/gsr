#!/usr/bin/env node
// Renders an HTML "slide deck" (see repo README) to individual PNGs, one per
// .stage[data-slide] element. Unlike tools/render/render.mjs, there's no
// timeline to capture - slides are static, so this is a plain
// page.screenshot() per element with no virtual-time clock involved.
//
// Usage:
//   node tools/render/slides.mjs <input.html> [options]
//
// Options:
//   --out-dir <dir>       Output directory (default: out)
//   --width <px>          Output width in physical pixels (default: 1080)
//   --height <px>         Output height in physical pixels (default: 1920)
//   --stage-width <px>    Source CSS width of each .stage (default: 405)
//   --stage-height <px>   Source CSS height of each .stage (default: 720)
//   --supersample <n>     Capture at N x the output resolution and downsample
//                         with Lanczos (default: 2) - sharper text/gradient
//                         edges than rendering 1:1. Set to 1 to disable.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { mkdirSync, existsSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

function parseCliArgs(argv) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'out-dir': { type: 'string', default: 'out' },
      width: { type: 'string', default: '1080' },
      height: { type: 'string', default: '1920' },
      'stage-width': { type: 'string', default: '405' },
      'stage-height': { type: 'string', default: '720' },
      supersample: { type: 'string', default: '2' },
    },
  });

  if (positionals.length !== 1) {
    throw new Error('Usage: node tools/render/slides.mjs <input.html> [options]');
  }

  return {
    input: positionals[0],
    outDir: values['out-dir'],
    width: Number(values.width),
    height: Number(values.height),
    stageWidth: Number(values['stage-width']),
    stageHeight: Number(values['stage-height']),
    supersample: Number(values.supersample),
  };
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
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outDir = path.resolve(opts.outDir);
  mkdirSync(outDir, { recursive: true });

  const scale = (opts.width / opts.stageWidth) * opts.supersample;
  const expectedHeight = Math.round(opts.stageHeight * (opts.width / opts.stageWidth));
  if (Math.abs(expectedHeight - opts.height) > 1) {
    console.warn(
      `[slides] warning: --width/--height aspect ratio (${opts.width}x${opts.height}) doesn't match ` +
      `the stage aspect ratio (${opts.stageWidth}x${opts.stageHeight}). Output will be stretched.`
    );
  }

  console.log(
    `[slides] launching Chromium (capturing each slide at ${opts.width}x${opts.height} output` +
    `${opts.supersample > 1 ? ` via ${opts.supersample}x supersample` : ''}, ${scale.toFixed(3)}x scale)`
  );
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: opts.stageWidth * 4, height: opts.stageHeight * 4 },
    deviceScaleFactor: scale,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  const failedRequests = [];
  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), error: req.failure()?.errorText ?? 'unknown error' });
  });

  const fileUrl = url.pathToFileURL(inputPath).href;
  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  if (failedRequests.length) {
    console.warn(`[slides] WARNING: ${failedRequests.length} network request(s) failed while loading the page ` +
      '(a blocked/unreachable stylesheet here means its @font-face rules never registered at all, ' +
      "so the font check below won't catch it - text may render in a fallback font):");
    for (const r of failedRequests) console.warn(`  - ${r.url} (${r.error})`);
  }

  const slides = await page.locator('.stage[data-slide]').all();
  if (slides.length === 0) {
    throw new Error('No .stage[data-slide="N"] elements found in the input file.');
  }
  console.log(`[slides] found ${slides.length} slide(s)`);

  const ffmpegPath = opts.supersample > 1 ? await resolveFfmpegPath() : null;
  const outPaths = [];
  for (const slide of slides) {
    const slideId = await slide.getAttribute('data-slide');
    const outPath = path.join(outDir, `${baseName}-${slideId}.png`);
    if (opts.supersample > 1) {
      const rawPath = path.join(outDir, `${baseName}-${slideId}.raw.png`);
      await slide.screenshot({ path: rawPath });
      await runFfmpeg(ffmpegPath, [
        '-y', '-i', rawPath,
        '-vf', `scale=${opts.width}:${opts.height}:flags=lanczos`,
        '-update', '1', '-frames:v', '1',
        outPath,
      ]);
      rmSync(rawPath);
    } else {
      await slide.screenshot({ path: outPath });
    }
    outPaths.push(outPath);
    console.log(`[slides] wrote ${outPath}`);
  }

  const fontReport = await page.evaluate(() =>
    [...document.fonts].map((f) => ({ family: f.family, weight: f.weight, status: f.status }))
  );
  const failedFonts = fontReport.filter((f) => f.status === 'error');
  if (failedFonts.length) {
    console.warn(`[slides] WARNING: ${failedFonts.length} font face(s) failed to load and rendered in a fallback font:`);
    for (const f of failedFonts) console.warn(`  - ${f.family} ${f.weight}`);
  } else {
    console.log(`[slides] fonts OK (${fontReport.filter((f) => f.status === 'loaded').length} loaded, ${fontReport.filter((f) => f.status === 'unloaded').length} unused).`);
  }

  await browser.close();
  console.log(`[slides] done -> ${outPaths.length} PNG(s) in ${outDir}`);
}

main().catch((err) => {
  console.error(`[slides] failed: ${err.message}`);
  process.exit(1);
});
