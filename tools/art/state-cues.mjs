// Render the relay-state cues (idle / restored / danger / sealed) of a backdrop to PNGs for review.
// node tools/art/state-cues.mjs OUT_DIR [bg id]   (dev server running)
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:5181';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(base);
await page.waitForFunction(() => window.__ttl?.scenes.top && !window.__ttl.scenes.transitioning);
const urls = await page.evaluate(async (BG) => {
  const source = path => performance.getEntriesByType('resource').map(e => e.name).find(url => new URL(url).pathname === path) ?? path;
  const assets = await import(source('/src/core/assets.ts'));
  const { Gfx } = await import(source('/src/core/gfx.ts'));
  const { settings } = await import(source('/src/core/save.ts'));
  const { drawBackdrop } = await import(source('/src/screens/backdrop.ts'));
  await assets.preloadArt([BG]);
  const out = [];
  for (const state of ['idle', 'restored', 'danger', 'sealed']) {
    const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1080;
    const ctx = canvas.getContext('2d'); ctx.scale(2, 2); ctx.imageSmoothingEnabled = false;
    const g = new Gfx(ctx); settings.reducedMotion = true;
    drawBackdrop(g, BG, { kind: 'space', stage: Number(BG[4]), time: 3, state });
    out.push(canvas.toDataURL('image/png'));
  }
  return out;
}, process.argv[3] ?? 'bg/s1-a');
for (const [i, s] of ['idle', 'restored', 'danger', 'sealed'].entries())
  await writeFile(`${process.argv[2]}/state-${s}.png`, Buffer.from(urls[i].split(',')[1], 'base64'));
await browser.close();
