// Dense upgrade layout, earned-relay feedback, guide and Continue menu at desktop sizes.
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
const errors=[];
try {
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5181/?dev=relay');
  await page.waitForFunction(()=>window.__ttl);
  await page.waitForTimeout(2000);
  const receipt=await page.evaluate(async()=>{
    const resource=name=>performance.getEntriesByType('resource').map(e=>e.name).find(u=>new URL(u).pathname===name);
    const {activeSession}=await import(resource('/src/screens/session.ts'));
    const {claimRelayStores}=await import(resource('/src/campaign/run.ts'));
    const {installSystem}=await import(resource('/src/campaign/shipops.ts'));
    window.qaSession=activeSession();
    const run=window.qaSession.run;
    const amount=claimRelayStores(run);
    installSystem(run.ship,'drones');installSystem(run.ship,'veil');
    window.qaSession.saveFromUI(run);
    const original=window.__ttl.ui.hot.bind(window.__ttl.ui);
    window.qaUpgradeButtons={};
    window.__ttl.ui.hot=(id,x,y,w,h,...args)=>{
      if(id.startsWith('up-'))window.qaUpgradeButtons[id]={x,y,w,h};
      return original(id,x,y,w,h,...args);
    };
    return amount;
  });
  assert.equal(receipt,24);
  await page.waitForTimeout(100);
  await page.screenshot({path:'tools/shots/qa/relay-stores.png'});
  await page.keyboard.press('u');await page.waitForTimeout(300);
  const buttons=await page.evaluate(()=>window.qaUpgradeButtons);
  assert.equal(Object.keys(buttons).length,11,'all ten systems and the reactor are present');
  for(const b of Object.values(buttons))assert.ok(b.y+b.h<=466,'upgrade controls stay above the footer');
  await page.screenshot({path:'tools/shots/qa/upgrades-all-systems.png'});
  await page.keyboard.press('Escape');await page.waitForTimeout(100);
  await page.evaluate(()=>window.qaSession.quitToTitle());
  await page.waitForTimeout(1000);
  await page.screenshot({path:'tools/shots/qa/title-continue.png'});
  await page.keyboard.press('F1');await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>window.__ttl.scenes.stack.length),2);
  await page.setViewportSize({width:1366,height:768});
  await page.waitForTimeout(200);
  await page.screenshot({path:'tools/shots/qa/field-guide-1366.png'});
  await page.keyboard.press('Escape');await page.waitForTimeout(100);
  await page.keyboard.press('Enter');await page.waitForTimeout(1700);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ttl.voyage')).run.map.relays.some(r=>r.serviceSalvage===24)),true);
  assert.deepEqual(errors,[]);
  const result={receipt,upgradeControls:Object.keys(buttons).length,continue:true,guide1366:true,errors};
  await writeFile('tools/shots/qa/ux.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
} finally {await browser.close();}
