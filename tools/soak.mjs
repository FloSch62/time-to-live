// Exercise repeated live combat scenes in one page, including cleanup between scenes.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ args:['--autoplay-policy=no-user-gesture-required'] });
const errors = [], samples = [];
try {
  const page = await browser.newPage({ viewport:{width:1920,height:1080} });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(process.env.TTL_URL ?? 'http://127.0.0.1:5181');
  await page.waitForFunction(() => window.__ttl);
  await page.mouse.click(4,4);
  const cdp = await page.context().newCDPSession(page);
  await page.evaluate(async () => {
    const resources = performance.getEntriesByType('resource').map(e => e.name);
    const source = name => resources.find(u => new URL(u).pathname === name);
    window.qaScenes = (await import(source('/src/dev.ts'))).devScenes;
    window.qaAudio = await import(source('/src/core/audio.ts'));
    window.qaGuardianMusic = (await import(source('/src/campaign/voyage.ts'))).GUARDIAN_MUSIC;
    const { settings } = await import(source('/src/core/save.ts'));
    for (const key of Object.keys(settings.autoPause)) settings.autoPause[key] = false;
  });
  for (let i=0; i<9; i++) {
    const enemy = ['iron-regent','hollow-choir','blackout-core'][i%3];
    await page.evaluate(async ({enemy,stage}) => {
      const app = window.__ttl;
      const theme = window.qaGuardianMusic[enemy];
      await window.qaAudio.music.play(theme, theme === 'event-horizon' ? 'custody' : 'battle', 0);
      const scene = await window.qaScenes['combat-strong'](app,new URLSearchParams({enemy,stage:String(stage),auto:'1',paused:'0',seed:'88'}));
      app.scenes.switchTo(scene,false);
    }, {enemy,stage:i%3+1});
    const timing = await page.evaluate(() => new Promise(resolve => {
      const intervals = [], start = performance.now();
      let last = start;
      function frame(now) {
        if (now-start>1000) intervals.push(now-last);
        last=now;
        if (now-start<10000) requestAnimationFrame(frame);
        else {
          intervals.sort((a,b)=>a-b);
          resolve({medianMs:intervals[Math.floor(intervals.length*.5)],p95Ms:intervals[Math.floor(intervals.length*.95)]});
        }
      }
      requestAnimationFrame(frame);
    }));
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = await cdp.send('Runtime.getHeapUsage');
    const music = await page.evaluate(() => {
      const current = window.qaAudio.music.current;
      return {id:current?.id, sources:current?.sources.length,
        cached:[...window.qaAudio.audio.buffers.keys()].filter(p=>p.startsWith('audio/music/')).length};
    });
    assert.equal(music.id, enemy === 'blackout-core' ? 'event-horizon' : enemy);
    assert.equal(music.sources, enemy === 'blackout-core' ? 3 : 1, 'all actual guardian layers decode and play');
    assert.ok(music.cached <= 6, 'music cache stays bounded');
    samples.push({enemy,...timing,heap,music});
    console.log(JSON.stringify(samples.at(-1)));
  }
  assert.deepEqual(errors,[],'no errors during repeated live battles');
  const growth = samples.at(-1).heap.usedSize - samples[2].heap.usedSize;
  assert.ok(growth < 20*1024*1024,`post-warmup retained JS heap growth ${growth} bytes`);
  await mkdir('tools/shots/qa',{recursive:true});
  await writeFile('tools/shots/qa/soak.json',JSON.stringify({samples,errors,retainedHeapGrowth: growth},null,2));
} finally { await browser.close(); }
