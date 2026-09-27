// Real-browser alpha checks. Uses an isolated browser context; never touches a player's saved voyage.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.TTL_URL ?? "http://127.0.0.1:5181";
const out = "tools/shots/qa";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const errors = [];
const missing = new Set();
const results = [];
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
page.on("pageerror", e => errors.push(e.message));
page.on("response", r => {
  if (r.status() >= 400) missing.add(r.url());
  if (r.status() !== 304 && new URL(r.url()).pathname.endsWith('.png') && !r.headers()['content-type']?.startsWith('image/')) missing.add(`${r.url()} (not an image, HTTP ${r.status()})`);
});
const wait = async () => {
  await page.waitForFunction(() => window.__ttl?.scenes.top && !window.__ttl.scenes.transitioning);
  await page.waitForTimeout(800);
};
const key = async k => { await page.keyboard.press(k); await page.waitForTimeout(1450); };
const shot = async name => page.screenshot({ path: `${out}/${name}.png` });

try {
  await page.goto(base);
  await wait();
  const objectArt = await page.evaluate(async () => {
    const source = performance.getEntriesByType('resource').map(e => e.name).find(u => new URL(u).pathname === '/src/combat/assets.ts');
    const { weaponArt, droneArt } = await import(source);
    const sets = await Promise.all(['weapons','drones'].map(group => fetch(`art/${group}/${group}.json`).then(r => r.json())));
    let absent = [];
    for (let attempt=0; attempt<30; attempt++) {
      absent = sets.flatMap((set,i) => Object.keys(set).filter(id => !(i ? droneArt(id) : weaponArt(id)).img).map(id => `${i?'drone':'weapon'}/${id}`));
      if (!absent.length) break;
      await new Promise(r => setTimeout(r,100));
    }
    return absent;
  });
  assert.deepEqual(objectArt,[], 'every weapon and drone loads through the actual combat asset adapters');
  await shot("title");
  await key('F1');
  assert.equal(await page.evaluate(() => window.__ttl.scenes.stack.length), 2, 'field guide opens from title');
  await page.evaluate(() => {
    window.qaGuideBounds = {};
    const g=window.__ttl.g, draw=g.text.bind(g);
    g.text=(text,x,y,opts)=>{
      const h=draw(text,x,y,opts);
      if(opts?.font==='body'&&(x===92||x===498)&&(y===148||y===314)) window.qaGuideBounds[text]={bottom:y+h,limit:y+83};
      return h;
    };
  });
  for(let i=0;i<4;i++) {
    await page.waitForTimeout(100);
    await shot(`field-guide-${i+1}`);
    if(i<3) await key('ArrowRight');
  }
  const guideBounds=await page.evaluate(() => Object.values(window.qaGuideBounds));
  assert.equal(guideBounds.length,16,'every guide card was rendered');
  assert.ok(guideBounds.every(b=>b.bottom<=b.limit),'guide prose fits above its control hints');
  await key('Escape');
  results.push('Four-page field guide, controls and guardian tactics');
  await key("Enter");
  await shot("new-voyage");
  await key("Enter");
  await wait();
  await shot("prologue");
  // Skip prologue and the first-stage introduction, then reach the relay.
  await key("Escape");
  await key("Escape");
  await wait();
  await page.waitForFunction(() => localStorage.getItem("ttl.voyage"));
  const save = await page.evaluate(() => localStorage.getItem("ttl.voyage"));
  assert.ok(save.length > 500, "new voyage has a persistent checkpoint");
  await shot("relay");
  await key("m");
  await shot("chart");
  await page.reload();
  await wait();
  await key("Enter");
  await wait();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("ttl.voyage")).run.seed), JSON.parse(save).run.seed);
  results.push("New voyage, prologue, chart and continue checkpoint");
  // Exercise the real campaign-to-combat bridge and its modal pause controls.
  await page.evaluate(async () => {
    const moduleURL = performance.getEntriesByType('resource').map(e => e.name).find(u => new URL(u).pathname === '/src/screens/session.ts');
    const { activeSession } = await import(moduleURL);
    const session = activeSession();
    void session.combat(session.run, { enemy:'packet-leech', stage:1, seed:333, depth:1, boss:false });
  });
  await page.waitForTimeout(1800);
  await key('Escape');
  assert.equal(await page.evaluate(() => window.__ttl.scenes.stack.length), 2, 'Escape opens combat pause menu');
  await shot('combat-pause-menu');
  await page.mouse.click(960, 564);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__ttl.scenes.stack.length), 3, 'combat settings open above pause menu');
  await key('Escape');
  await key('F1');
  assert.equal(await page.evaluate(() => window.__ttl.scenes.stack.length), 3, 'field guide opens over paused combat');
  await key('Escape');
  await key('Escape');
  assert.equal(await page.evaluate(() => window.__ttl.scenes.stack.length), 1, 'resume returns to combat');
  results.push('Combat pause, settings and resume through the campaign bridge');


  const screens = [
    ["event", "?dev=event"], ["exchange", "?dev=store"], ["yard", "?dev=yard&cars=1"],
    ["runbook", "?dev=runbook"], ["settings", "?dev=settings"], ["ending", "?dev=ending"],
    ["gameover", "?dev=gameover"], ["guardian-1", "?dev=combat&enemy=iron-regent"],
    ["guardian-2", "?dev=combat&enemy=hollow-choir&stage=2"],
    ["guardian-3", "?dev=combat&enemy=blackout-core&stage=3&rear=armory-car&keel=sling-keel"],
    ["expanded-drone-tender", "?dev=combat-strong&enemy=blackout-core&stage=3"],
  ];
  for (const [name, query] of screens) {
    await page.goto(`${base}/${query}`);
    await wait();
    await page.waitForTimeout(1800);
    await shot(name);
    results.push(name);
  }
  // A normal player controls a fight using canvas input: select weapon, aim, pause and zoom both sides.
  await page.goto(`${base}/?dev=combat&enemy=packet-leech`);
  await wait();
  await page.evaluate(() => {
    const ui = window.__ttl.ui;
    const button = ui.button.bind(ui);
    window.qaButtons = {};
    ui.button = (id,x,y,w,h,label,opts) => { window.qaButtons[id] = {x,y,w,h,label,active:opts?.active}; return button(id,x,y,w,h,label,opts); };
  });
  await page.waitForTimeout(100);
  const toggle = await page.evaluate(() => window.qaButtons.autofire);
  await page.mouse.move((toggle.x+toggle.w/2)*2,(toggle.y+toggle.h/2)*2);
  await page.mouse.down();
  await page.waitForTimeout(100); // press and release on different animation frames
  await page.mouse.up();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.qaButtons.autofire.active), !toggle.active, 'combat buttons retain a held mouse press until release');
  const bootTime = await page.evaluate(() => performance.timeOrigin);
  await key("F5");
  assert.equal(await page.evaluate(() => performance.timeOrigin), bootTime, 'F5 selects crew instead of reloading the game');
  await key("Shift+R");
  await key("1");
  await page.mouse.click(1570, 475);
  await key("v");
  await key("Space");
  await page.waitForTimeout(1500);
  await key("Space");
  await page.mouse.move(1480, 490);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(500);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(1380, 560, { steps: 12 });
  await page.mouse.up({ button: "middle" });
  await shot("enemy-zoom");
  await key("z");
  await page.mouse.move(600, 430);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(500);
  await shot("tender-zoom");
  results.push("Combat weapon targeting, pause, zoom and middle-button pan");
  for (const [width, height] of [[1366, 768], [2560, 1440]]) {
    await page.setViewportSize({ width, height });
    await key("z");
    await shot(`combat-${width}`);
    const box = await page.locator("#game").boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1);
  }
  assert.deepEqual(errors, [], "no JavaScript errors across the alpha screens");
  assert.deepEqual([...missing], [], "no failed asset requests across the alpha screens");
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify({ results, errors, missing: [...missing] }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ checks: results.length, errors, missing: [...missing] }, null, 2));
