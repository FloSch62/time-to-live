// Verify shipped hulls through the real adapters and regional motion with the loaded Krea backgrounds.
// Run against pnpm dev. Evidence stays under the ignored tools/shots/art directory.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.TTL_URL ?? 'http://127.0.0.1:5181';
const out = 'tools/shots/art';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const results = [];
try {
  for (const [width, height] of [[1366, 768], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.routeWebSocket('**', socket => socket.close());
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(base);
    await page.waitForFunction(() => window.__ttl?.scenes.top && !window.__ttl.scenes.transitioning);
    const checks = await page.evaluate(async () => {
      const source = path => performance.getEntriesByType('resource').map(e => e.name)
        .find(url => new URL(url).pathname === path) ?? path;
      const assets = await import(source('/src/core/assets.ts'));
      const combat = await import(source('/src/combat/assets.ts'));
      const { Gfx } = await import(source('/src/core/gfx.ts'));
      const { settings } = await import(source('/src/core/save.ts'));
      const { drawBackdrop } = await import(source('/src/screens/backdrop.ts'));
      const ids = ['glasswing', 'switchback'];
      await assets.preloadArt([...ids.map(id => `ships/${id}`), ...[1, 2, 3].map(stage => `bg/s${stage}-a`)]);
      await combat.loadCombatMeta();
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.scale(2, 2);
      const g = new Gfx(ctx);
      const hulls = ids.map(id => {
        const shape = id === 'glasswing' ? [10, 4] : [13, 5];
        const img = combat.hullImage(id, 'amber', shape);
        const meta = combat.hullMeta(id, 'player', shape);
        ctx.clearRect(0, 0, 960, 540);
        if (img) g.image(img, 0, 0);
        const grid = ctx.getImageData(meta.gx * 2, meta.gy * 2, meta.cols * 72, meta.rows * 72).data;
        let holes = 0;
        for (let i = 3; i < grid.length; i += 4) if (grid[i] !== 255) holes++;
        return { id, loaded: !!img, size: img ? [img.width, img.height] : null,
          grid: [meta.cols, meta.rows], holes, livery: !!combat.hullImage(id, 'teal', shape) };
      });
      const render = (stage, time, state, reduced) => {
        settings.reducedMotion = reduced;
        ctx.clearRect(0, 0, 960, 540);
        const loaded = drawBackdrop(g, `bg/s${stage}-a`, { kind: 'space', stage, time, state });
        return { loaded, pixels: ctx.getImageData(0, 0, 1920, 1080).data };
      };
      const diff = (a, b) => {
        let changed = 0;
        for (let i = 0; i < a.length; i += 4)
          if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) changed++;
        return changed;
      };
      const wasReduced = settings.reducedMotion;
      const regions = [1, 2, 3].map(stage => {
        const first = render(stage, 0, 'idle', false);
        const moving = render(stage, 5.7, 'idle', false);
        const still = render(stage, 0, 'idle', true);
        const later = render(stage, 20, 'idle', true);
        const restored = render(stage, 20, 'restored', true);
        const sealed = render(stage, 20, 'sealed', true);
        const danger = render(stage, 20, 'danger', true);
        return { stage, loaded: first.loaded, motionPixels: diff(first.pixels, moving.pixels),
          reducedMotionPixels: diff(still.pixels, later.pixels),
          restoredPixels: diff(still.pixels, restored.pixels),
          sealedPixels: diff(still.pixels, sealed.pixels), dangerPixels: diff(still.pixels, danger.pixels) };
      });
      settings.reducedMotion = wasReduced;
      return { hulls, regions };
    });
    for (const hull of checks.hulls) {
      assert.equal(hull.loaded, true, `${hull.id} loads through hullImage`);
      assert.deepEqual(hull.size, hull.id === 'glasswing' ? [980, 512] : [1120, 592]);
      assert.deepEqual(hull.grid, hull.id === 'glasswing' ? [10, 4] : [13, 5]);
      assert.equal(hull.holes, 0, `${hull.id} contains the whole cutaway`);
      assert.equal(hull.livery, true);
    }
    for (const region of checks.regions) {
      assert.equal(region.loaded, true, `region ${region.stage} uses shipped art`);
      assert.ok(region.motionPixels > 100);
      assert.equal(region.reducedMotionPixels, 0);
      for (const key of ['restoredPixels', 'sealedPixels', 'dangerPixels']) assert.ok(region[key] > 100, key);
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    for (const [index, id] of ['glasswing', 'switchback'].entries()) {
      const canvas = page.locator('#game');
      const box = await canvas.boundingBox();
      await page.mouse.click(box.x + (480 + index * 308) / 960 * box.width, box.y + 61 / 540 * box.height);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${out}/new-voyage-${id}-${width}.png` });
    }
    results.push({ viewport: [width, height], ...checks });
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/browser-qa.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }, null, 2));
} finally {
  await browser.close();
}
