#!/usr/bin/env node
// Exports each `.slide` element in a static HTML carousel to its own PNG.
// Unlike render.mjs (animated reels -> video), this is for still, multi-image
// posts (e.g. Instagram carousels): one HTML file, N `.slide` elements, N PNGs.
//
// Usage:
//   node tools/render/screenshot-slides.mjs <input.html> [options]
//
// Options:
//   --out-dir <dir>     Output directory (default: out/<input-basename>)
//   --selector <css>    Selector for each slide element (default: .slide)
//   --scale <n>          Device scale factor for capture sharpness (default: 2)

import { chromium } from 'playwright';
import { parseArgs } from 'node:util';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

function parseCliArgs(argv) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'out-dir': { type: 'string' },
      selector: { type: 'string', default: '.slide' },
      scale: { type: 'string', default: '2' },
    },
  });

  if (positionals.length !== 1) {
    throw new Error('Usage: node tools/render/screenshot-slides.mjs <input.html> [options]');
  }

  return {
    input: positionals[0],
    outDir: values['out-dir'],
    selector: values.selector,
    scale: Number(values.scale),
  };
}

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));

  const inputPath = path.resolve(opts.input);
  if (!existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const outDir = opts.outDir
    ? path.resolve(opts.outDir)
    : path.resolve('out', path.basename(inputPath, path.extname(inputPath)));
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: opts.scale });
  const page = await context.newPage();

  const failedRequests = [];
  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), error: req.failure()?.errorText ?? 'unknown error' });
  });

  const fileUrl = url.pathToFileURL(inputPath).href;
  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  if (failedRequests.length) {
    console.warn(`[screenshot-slides] WARNING: ${failedRequests.length} network request(s) failed:`);
    for (const r of failedRequests) console.warn(`  - ${r.url} (${r.error})`);
  }

  const fontReport = await page.evaluate(() =>
    [...document.fonts].map((f) => ({ family: f.family, weight: f.weight, status: f.status }))
  );
  const failedFonts = fontReport.filter((f) => f.status === 'error');
  if (failedFonts.length) {
    console.warn(`[screenshot-slides] WARNING: ${failedFonts.length} font face(s) failed to load:`);
    for (const f of failedFonts) console.warn(`  - ${f.family} ${f.weight}`);
  }

  const locator = page.locator(opts.selector);
  const count = await locator.count();
  if (count === 0) {
    throw new Error(`No elements matched selector "${opts.selector}"`);
  }

  for (let i = 0; i < count; i++) {
    const outPath = path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`);
    await locator.nth(i).screenshot({ path: outPath });
    console.log(`[screenshot-slides] wrote ${outPath}`);
  }

  await browser.close();
  console.log(`[screenshot-slides] done -> ${count} slide(s) in ${outDir}`);
}

main().catch((err) => {
  console.error(`[screenshot-slides] failed: ${err.message}`);
  process.exit(1);
});
