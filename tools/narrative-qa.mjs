// Render every authored event and outcome with the real bitmap fonts and window layout.
import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(process.env.TTL_URL ?? 'http://127.0.0.1:5181');
  await page.waitForFunction(() => window.__ttl);
  const report = await page.evaluate(async () => {
    const resources = performance.getEntriesByType('resource').map(e => e.name);
    const mod = path => import(resources.find(u => new URL(u).pathname === path) ?? path);
    const { content } = await mod('/src/campaign/content.ts');
    const { devRun } = await mod('/src/campaign/dev.ts');
    const { createEventWindow } = await mod('/src/screens/event.ts');
    const { newCtx, presentEvent, applyOutcome } = await mod('/src/campaign/events.ts');
    const { Rng } = await mod('/src/core/rng.ts');
    const app = window.__ttl, problems = [];
    const panel = app.g.panel.bind(app.g), hot = app.ui.hot.bind(app.ui);
    let current = '', windows = 0, events = 0, outcomes = 0, maxHeight = 0;
    app.g.panel = (x,y,w,h,style) => {
      if (style === 'dialog') {
        windows++; maxHeight = Math.max(maxHeight,h);
        if (x < 0 || y < 0 || x+w > 960 || y+h > 540) problems.push({current,x,y,w,h});
      }
      return panel(x,y,w,h,style);
    };
    app.ui.hot = (id,x,y,w,h,...args) => {
      if (id.startsWith('ev') && (x < 0 || y < 0 || x+w > 960 || y+h > 540)) problems.push({current,id,x,y,w,h});
      return hot(id,x,y,w,h,...args);
    };
    try {
      const win = createEventWindow(app,{push(){}});
      for (const def of content.events.values()) {
        const run = devRun(new URLSearchParams({stage:String(def.stages?.[0] ?? 1)}));
        const ctx = newCtx(run,def.id), view = presentEvent(run,def,ctx);
        // Include every conditional choice, including those a starting crew cannot unlock.
        for (const choice of view.choices) choice.hidden = false;
        current = `${def.id}: choices`;
        win.setChoices(view,()=>{}); win.update(999,app); win.draw(app.g,app); events++;
        const authored = [...def.choices];
        if (def.arrival) authored.push({outcomes:[{outcome:def.arrival}]});
        if (def.directCombat) authored.push({outcomes:[{outcome:{combat:def.directCombat}}]});
        for (const [i,choice] of authored.entries()) for (const [j,item] of choice.outcomes.entries()) {
          const applied = applyOutcome(structuredClone(run),item.outcome,ctx,new Rng(100+i*10+j));
          current = `${def.id}: outcome ${i}/${j}`;
          win.setOutcome(applied,view,()=>{}); win.update(999,app); win.draw(app.g,app); outcomes++;
        }
      }
    } finally {app.g.panel=panel;app.ui.hot=hot;}
    return {events,outcomes,windows,maxHeight,problems};
  });
  await mkdir('tools/shots/qa',{recursive:true});
  await writeFile('tools/shots/qa/narrative.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
  assert.deepEqual(report.problems,[],'all narrative windows and choices fit the game canvas');
} finally {await browser.close();}
