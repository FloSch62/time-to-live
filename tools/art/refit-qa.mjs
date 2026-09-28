// Real store/reward controls and bounded attachment presentation. Uses an isolated browser context.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const out = 'tools/shots/art';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const checks = [];
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.routeWebSocket('**', socket => socket.close()); // Keep concurrent editor saves from restarting a receipt.
  page.on('pageerror', error => errors.push(error.message));
  const source = async () => page.evaluate(async () => {
    const moduleUrl = path => performance.getEntriesByType('resource').map(e => e.name)
      .find(url => new URL(url).pathname === path) ?? path;
    window.qaModuleUrl = moduleUrl;
    const { activeSession } = await import(moduleUrl('/src/screens/session.ts'));
    window.qaRun = activeSession().run;
    window.qaButtons = {};
    const ui = window.__ttl.ui;
    const original = ui.hot.bind(ui);
    ui.hot = (id, x, y, w, h, enabled) => {
      window.qaButtons[id] = { x, y, w, h };
      return original(id, x, y, w, h, enabled);
    };
  });
  const click = async id => {
    await page.waitForFunction(id => !!window.qaButtons?.[id], id);
    const button = await page.evaluate(id => window.qaButtons[id], id);
    const box = await page.locator('#game').boundingBox();
    await page.mouse.click(box.x + (button.x + button.w / 2) * box.width / 960,
      box.y + (button.y + button.h / 2) * box.height / 540);
  };
  const pauseReceipt = async expected => {
    await page.waitForFunction(n => window.__ttl.scenes.stack.length === n, expected);
    await page.evaluate(() => {
      const receipt = window.__ttl.scenes.top;
      window.qaReceipt = receipt;
      const update = receipt.update.bind(receipt);
      window.qaAdvance = dt => update(dt, window.__ttl);
      receipt.update = () => {};
    });
  };
  await page.goto('http://127.0.0.1:5181/?dev=store');
  await page.waitForFunction(() => window.__ttl?.scenes.stack.length === 2 && !window.__ttl.scenes.transitioning);
  await source();
  const itemIndex = await page.evaluate(async () => {
    const { storeHere } = await import(window.qaModuleUrl('/src/campaign/store.ts'));
    const stock = storeHere(window.qaRun);
    // First in the list: the redesigned exchange scrolls its rows and only draws (and registers) visible ones.
    stock.items.unshift({ kind: 'car', id: 'freight-car', price: 1, sold: false });
    return 0;
  });
  await click('st-tab-5');
  await click(`buy-${itemIndex}`);
  await click("car-yes");
  await pauseReceipt(3);
  assert.equal(await page.evaluate(() => window.qaRun.ship.consist.rear), 'freight-car');
  await page.mouse.move(5, 5);
  await page.screenshot({ path: `${out}/refit-rear-align-1920.png` });
  await page.evaluate(() => window.qaAdvance(0.8));
  await page.screenshot({ path: `${out}/refit-rear-locked-1920.png` });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ttl.scenes.stack.includes(window.qaReceipt));
  assert.equal(await page.evaluate(() => window.qaRun.ship.consist.rear), 'freight-car');
  checks.push('Store purchase couples the actual car before presentation; Escape skips without reverting it.');

  // A recovered car follows the same real input path before the next overflow item is presented.
  await page.goto('http://127.0.0.1:5181/?dev=overflow');
  await page.waitForFunction(() => window.__ttl?.scenes.stack.length === 2 && !window.__ttl.scenes.transitioning);
  await source();
  await click('ov-couple');
  await pauseReceipt(3);
  assert.equal(await page.evaluate(() => window.qaRun.ship.consist.rear), 'armory-car');
  await page.evaluate(() => window.qaAdvance(0.95));
  await page.waitForFunction(() => !window.__ttl.scenes.stack.includes(window.qaReceipt));
  checks.push('Recovered car advances the reward queue automatically by 0.95 seconds.');

  await page.setViewportSize({ width: 1366, height: 768 });
  for (const reduced of [false, true]) {
    const baseCount = await page.evaluate(() => window.__ttl.scenes.stack.length);
    const original = await page.evaluate(async reduced => {
      const { coupleCar } = await import(window.qaModuleUrl('/src/campaign/refit.ts'));
      const { showCarRefit } = await import(window.qaModuleUrl('/src/screens/refit-animation.ts'));
      const { settings } = await import(window.qaModuleUrl('/src/core/save.ts'));
      settings.reducedMotion = reduced;
      coupleCar(window.qaRun.ship, 'listening-keel');
      const original = JSON.stringify(window.qaRun.ship);
      window.qaDone = 0;
      showCarRefit(window.__ttl, window.qaRun.ship, 'listening-keel', () => window.qaDone++);
      return original;
    }, reduced);
    await pauseReceipt(baseCount + 1);
    await page.evaluate(() => window.qaAdvance(0.1));
    await page.screenshot({ path: `${out}/refit-keel-${reduced ? 'reduced' : 'hoist'}-1366.png` });
    await page.keyboard.press('Enter');
    await page.waitForFunction(n => window.__ttl.scenes.stack.length === n, baseCount);
    assert.equal(await page.evaluate(() => window.qaDone), 1);
    assert.equal(await page.evaluate(() => JSON.stringify(window.qaRun.ship)), original);
  }
  checks.push('Keel hoist and static reduced-motion view retain the same full tender; Enter completes once without state mutation.');
  assert.deepEqual(errors, []);
  await writeFile(`${out}/refit-qa.json`, JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  await browser.close();
}
