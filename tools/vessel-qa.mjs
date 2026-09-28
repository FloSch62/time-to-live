// Physical wagon preview, legal transaction and visible purpose on every car at both desktop sizes.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.TTL_URL ?? 'http://127.0.0.1:5181';
const out = 'tools/shots/vessels';
await mkdir(out, {recursive:true});
const browser = await chromium.launch();
const errors = [], checks = [];
try {
  for (const width of [1366,1920]) {
    const page = await browser.newPage({viewport:{width,height:width===1366?768:1080}});
    await page.routeWebSocket('**', socket=>socket.close());
    page.on('pageerror', e=>errors.push(e.message));
    await page.goto(`${base}/?dev=relay`);
    await page.waitForFunction(()=>window.__ttl && !window.__ttl.scenes.transitioning);
    await page.waitForTimeout(1400);
    await page.evaluate(()=>{
      window.qaModuleUrl = path=>performance.getEntriesByType('resource').map(e=>e.name).find(url=>new URL(url).pathname===path)??path;
      window.qaButtons={};window.qaText=[];
      const app=window.__ttl, hot=app.ui.hot.bind(app.ui), draw=app.g.text.bind(app.g);
      app.ui.hot=(id,x,y,w,h,enabled)=>{window.qaButtons[id]={x,y,w,h,disabled:enabled===false};return hot(id,x,y,w,h,enabled)};
      app.g.text=(text,x,y,opts)=>{const h=draw(text,x,y,opts);window.qaText.push({text,x,y,h,opts});if(window.qaText.length>500)window.qaText.splice(0,250);return h;};
    });
    const click=async id=>{
      await page.waitForFunction(id=>window.qaButtons[id],id);
      const b=await page.evaluate(id=>window.qaButtons[id],id), box=await page.locator('#game').boundingBox();
      assert.equal(b.disabled,false,id);
      await page.mouse.click(box.x+(b.x+b.w/2)*box.width/960,box.y+(b.y+b.h/2)*box.height/540);
      await page.waitForTimeout(100);
    };
    const cars=['drone-car','armory-car','freight-car','bunk-car','veil-car','ballast-keel','listening-keel','sling-keel','workshop-keel'];
    for(let i=0;i<cars.length;i++) {
      const car=cars[i],lead=['lamplighter','glasswing','switchback'][i%3];
      const expected=await page.evaluate(async ({car,lead})=>{
        const imp=p=>import(window.qaModuleUrl(p));
        const [{activeSession},{makePlayerShip},{storeHere},{createStoreScene},{CARS}]=await Promise.all([
          imp('/src/screens/session.ts'),imp('/src/data/ship.ts'),imp('/src/campaign/store.ts'),imp('/src/screens/store.ts'),imp('/src/data/cars.ts')]);
        const app=window.__ttl, session=activeSession(),run=session.run;
        run.ship=makePlayerShip('Preview',undefined,'amber',lead);run.inv.salvage=500;
        const relay=run.map.relays[run.pos];relay.type='market';relay.resolved=true;run.map.sealX=-1000;
        const stock=storeHere(run);stock.items.splice(0,stock.items.length,{kind:'car',id:car,price:CARS[car].cost,sold:false});
        window.qaRun=run;window.qaButtons={};window.qaStore=createStoreScene(app,run,()=>{});app.scenes.push(window.qaStore);
        return {price:CARS[car].cost,slot:CARS[car].slot,desc:CARS[car].desc};
      },{car,lead});
      await click('st-tab-5');await click('buy-0');
      await page.waitForFunction(()=>window.qaButtons['car-yes']);
      const textFits=await page.evaluate(async expected=>{
        const {wrap}=await import(window.qaModuleUrl('/src/core/font.ts'));
        const t=window.qaText.findLast(t=>t.text===expected.desc && t.opts?.width>400);
        return !!t && wrap(t.text,t.opts.width,t.opts.font).length<=(t.opts.maxLines??Infinity);
      },expected);
      assert.ok(textFits,`${car}: complete purchase purpose fits`);
      await page.mouse.move(3,3);
      await page.screenshot({path:`${out}/${lead}-${car}-${width}.png`});
      await click('car-yes');await page.keyboard.press('Escape');
      await page.waitForTimeout(1100);
      const actual=await page.evaluate(slot=>({car:window.qaRun.ship.consist[slot],salvage:window.qaRun.inv.salvage}),expected.slot);
      assert.deepEqual(actual,{car,salvage:500-expected.price});
      await page.evaluate(()=>window.__ttl.scenes.remove(window.qaStore));
      checks.push(`${width}: ${lead} + ${car}, preview, purpose and paid attachment`);
    }
    // Largest legal crew remains clear of relay information, with every portrait selectable.
    await page.evaluate(async ()=>{
      const imp=p=>import(window.qaModuleUrl(p));
      const [{makePlayerShip,newCrew},{coupleCar,applyRefit,consistStats}]=await Promise.all([imp('/src/data/ship.ts'),imp('/src/data/consist.ts')]);
      let ship=coupleCar(coupleCar(makePlayerShip('Full complement'),'rear','bunk-car'),'keel','workshop-keel');
      for(const socket of consistStats(ship.consist).sockets) ship=applyRefit(ship,socket,'bunks');
      const cap=consistStats(ship.consist,ship.modules).crewCap;
      while(ship.crew.length<cap)ship.crew.push(newCrew('linefolk',`Deckhand ${ship.crew.length+1}`,'lead:hall'));
      window.qaRun.ship=ship;window.qaButtons={};
      const relay=window.qaRun.map.relays[window.qaRun.pos];relay.hazard='sun-glare';relay.serviceSalvage=26;relay.systemsPatched=7;relay.hullRecovered=2;
    });
    await page.waitForTimeout(250);
    const roster=await page.evaluate(()=>Object.entries(window.qaButtons).filter(([id])=>id.startsWith('crew-')).map(([,r])=>r));
    assert.equal(roster.length,13);
    // The roster panel sits under the tender (ship-view layout): every card inside it, none clipped, none overlapping.
    assert.ok(roster.every(r=>r.x>=4&&r.x+r.w<=554&&r.y>=374&&r.y+r.h<=440&&r.w>=60&&r.h>=12),'full crew fits the roster panel');
    assert.ok(roster.every((a,i)=>roster.every((b,j)=>i===j||a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y)),'crew cards do not overlap');
    await page.screenshot({path:`${out}/relay-full-crew-${width}.png`});
    checks.push(`${width}: all 13 crew cards selectable inside the roster panel`);
    await page.evaluate(async()=>{
      const {createGuideScene}=await import(window.qaModuleUrl('/src/screens/guide.ts'));
      window.__ttl.scenes.push(createGuideScene(window.__ttl));
    });
    for(let tab=0;tab<5;tab++){
      await click(`guide-tab-${tab}`);
      await page.evaluate(()=>window.qaText=[]);
      await page.waitForTimeout(100);
      const overflow=await page.evaluate(async()=>{
        // Each card draws its prose (body font) and then its control hint at the same x and wrap width: the prose
        // must end above the hint. At least one card must be found, so the check can never pass vacuously.
        const cards=[];let pending=null;
        for(const t of window.qaText){
          if(t.opts?.width>300&&t.opts?.font==='body')pending=t;
          else if(t.opts?.width>300&&pending&&pending.x===t.x){cards.push({text:pending.text,bottom:pending.y+pending.h,limit:t.y});pending=null;}
        }
        return cards.length?cards.filter(c=>c.bottom>c.limit).map(c=>c.text):['no guide cards found'];
      });
      assert.deepEqual(overflow,[],`guide page${tab} body stays clear of controls`);
      if(tab===3)await page.screenshot({path:`${out}/wagon-guide-${width}.png`});
    }
    checks.push(`${width}: all5 field guide pages fit`);
    await page.close();
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/results.json`,JSON.stringify({checks,errors},null,2));
  console.log(JSON.stringify({checks,errors},null,2));
} finally {await browser.close();}
