// Player-facing integration of the audit changes. Every context has an isolated save.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.TTL_URL ?? 'http://127.0.0.1:5181';
const out = 'tools/shots/design';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const errors = [], checks = [];

async function ready(page) {
  await page.waitForFunction(() => window.__ttl && !window.__ttl.scenes.transitioning);
  await page.waitForTimeout(250);
}

async function instrument(page) {
  await page.evaluate(() => {
    const app = window.__ttl;
    window.designModuleUrl = path => performance.getEntriesByType('resource').map(e => e.name).find(url => new URL(url).pathname === path) ?? path;
    window.designButtons = {};
    window.designText = {};
    const hot = app.ui.hot.bind(app.ui), text = app.g.text.bind(app.g);
    app.ui.hot = (id, x, y, w, h, enabled = true) => {
      window.designButtons[id] = { x, y, w, h, disabled: !enabled };
      return hot(id, x, y, w, h, enabled);
    };
    app.g.text = (value, x, y, opts) => {
      const height = text(value, x, y, opts);
      window.designText[value] = { x, y, bottom: y + height, opts };
      return height;
    };
  });
  await page.waitForTimeout(100);
}

async function click(page, id) {
  await page.waitForFunction(id => window.designButtons[id], id);
  const b = await page.evaluate(id => window.designButtons[id], id);
  assert.equal(b.disabled, false, `${id} is usable`);
  const box = await page.locator('canvas').first().boundingBox();
  await page.mouse.move(box.x + (b.x + b.w / 2) * box.width / 960, box.y + (b.y + b.h / 2) * box.height / 540);
  await page.mouse.down();
  await page.waitForTimeout(40);
  await page.mouse.up();
  await page.waitForTimeout(160);
}

try {
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.routeWebSocket('**', socket => socket.close());
    page.on('pageerror', e => errors.push(e.message));
    for (const tender of ['lamplighter', 'glasswing', 'switchback']) {
      await page.goto(`${base}/?dev=newvoyage`);
      await ready(page);
      await instrument(page);
      await click(page, `tender-${tender}`);
      const difficulty = {lamplighter: 'easy', glasswing: 'medium', switchback: 'hard'}[tender];
      await click(page, `difficulty-${difficulty}`);
      const layout = await page.evaluate(async tender => {
        const { art, preloadArt } = await import(window.designModuleUrl('/src/core/assets.ts'));
        const { wrap } = await import(window.designModuleUrl('/src/core/font.ts'));
        await preloadArt([`ships/${tender}`]);
        const image = art(`ships/${tender}`);
        const prose = Object.entries(window.designText).filter(([, v]) => v.y === 253);
        return { art: image?.naturalWidth ?? 0, overflow: prose.filter(([text, v]) => wrap(text, v.opts.width, v.opts.font).length > v.opts.maxLines).map(([text]) => text) };
      }, tender);
      assert.ok(layout.art > 0, `${tender} loads its own hull`);
      assert.deepEqual(layout.overflow, [], `${tender} selection prose fits`);
      await page.mouse.move(4, 4);
      await page.screenshot({ path: `${out}/${tender}-${viewport.width}.png` });
      await click(page, 'begin');
      await ready(page);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1500);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => localStorage.getItem('ttl.voyage'));
      await page.waitForTimeout(1500);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ttl.voyage')).run);
      assert.equal(saved.difficulty, difficulty);
      assert.equal(saved.ship.defId, tender);
      assert.equal(saved.ship.consist.lead, tender);
      assert.equal(saved.inv.ttl, 16);
      if (tender === 'glasswing') {
        assert.equal(saved.inv.payloads, 0);
        assert.deepEqual(saved.ship.weapons.filter(Boolean), ['burst-emitter', 'packet-laser', 'packet-laser']);
        assert.deepEqual(saved.ship.weaponPower.slice(0, 3), [true, true, true]);
        assert.equal(saved.ship.reactor, 9);
      }
      if (tender === 'switchback') {
        assert.equal(saved.ship.systems.shields, undefined);
        assert.deepEqual(saved.ship.drones.filter(Boolean), ['relay-drone', 'firewall-drone']);
        assert.ok(saved.ship.systems.drones.power >= 4);
        assert.ok(saved.inv.spares >= 6);
      }
      await page.goto(base);
      await ready(page);
      await instrument(page);
      await click(page, 't-continue');
      await page.waitForFunction(async () => { const {activeSession} = await import(window.designModuleUrl('/src/screens/session.ts')); return !!activeSession(); });
      const continued = await page.evaluate(async () => {
        const { activeSession } = await import(window.designModuleUrl('/src/screens/session.ts'));
        return { tender: activeSession()?.run.ship.defId, difficulty: activeSession()?.run.difficulty };
      });
      assert.deepEqual(continued, {tender, difficulty}, 'Continue retains selected vessel and difficulty');
      checks.push(`${tender}: selection, loadout, save and Continue at ${viewport.width}`);
    }
    await page.goto(`${base}/?dev=relay`);
    await ready(page);
    await page.waitForTimeout(1500);
    await instrument(page);
    const before = await page.evaluate(async () => {
      const { activeSession } = await import(window.designModuleUrl('/src/screens/session.ts'));
      const s = activeSession(), r = s.run, relay = r.map.relays[r.pos];
      relay.resolved = true; delete relay.pendingCombat;
      r.map.sealX = -500;
      r.ship.crew[0].hp = 20;
      r.ship.systems.engines.damage = 1;
      r.flags.push('music-box', 'pell-letter', 'kittiwake-rested', 'courier-log-1', 'courier-log-2');
      r.ship.crew[0].memory = 'Held the rescue line at the Last Dry Landing.';
      relay.glimpse = { title: 'Someone Came Before', text: 'The guide lamp stays lit. Someone polished its glass.' };
      return r.map.sealX;
    });
    await page.waitForTimeout(150);
    await click(page, 'hub-recover');
    await page.waitForTimeout(1500);
    const recovery = await page.evaluate(async () => {
      const { activeSession } = await import(window.designModuleUrl('/src/screens/session.ts'));
      const r = activeSession().run;
      return { seal: r.map.sealX, health: r.ship.crew[0].hp, fault: r.ship.systems.engines.damage, ttl: r.inv.ttl };
    });
    assert.ok(recovery.seal > before);
    assert.ok(recovery.health >= 100);
    assert.equal(recovery.fault, 0);
    await click(page, 'hub-inspect');
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${out}/quiet-observation-${viewport.width}.png` });
    await page.keyboard.press('Escape');
    await page.evaluate(async () => {
      const { createRunbookScene } = await import(window.designModuleUrl('/src/screens/runbook.ts'));
      window.__ttl.scenes.push(createRunbookScene(window.__ttl, () => {}));
    });
    await click(page, 'rb-tab-2');
    await page.screenshot({ path: `${out}/voyage-record-${viewport.width}.png` });
    const record = await page.evaluate(() => Object.keys(window.designText).join('\n'));
    assert.match(record, /Pell's letter/);
    assert.match(record, /music box/);
    checks.push(`Recovery costs Seal; quiet inspect and saved commitments at ${viewport.width}`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/browser-results.json`, JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  await browser.close();
}
