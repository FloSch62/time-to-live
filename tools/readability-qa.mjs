// Real pointer interactions on the canvas, with an isolated save. Coordinates come from rendered geometry.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const out='tools/shots/readability'; await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}});
const errors=[], missing=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
const ready=async()=>{await page.waitForFunction(()=>window.__ttl?.scenes.top&&!window.__ttl.scenes.transitioning);await page.waitForTimeout(1600);};
const importLive=async(path)=>page.evaluate(async path=>{
 const url=performance.getEntriesByType('resource').map(r=>r.name).find(u=>new URL(u).pathname===path);
 const m=await import(url);window.qaSession=m.activeSession();return !!window.qaSession;
},path);
const point=async(key)=>page.evaluate(key=>window.qaDraw[key],key);
const click=async(key,dy=0,button='left')=>{const p=await point(key);assert.ok(p,key);await page.mouse.click(p.x*2,(p.y+dy)*2,{button});await page.waitForTimeout(150);};
const instrument=async()=>page.evaluate(async()=>{
 window.qaDraw={};window.qaTip='';
 const app=window.__ttl,g=app.g,rect=g.rect.bind(g),anim=g.anim.bind(g);
 const module=async path=>import(performance.getEntriesByType('resource').map(r=>r.name).find(u=>new URL(u).pathname===path));
 const {Sim}=await module('/src/combat/sim/sim.ts');
 const {buildPlayerView,tileScreen}=await module('/src/combat/view.ts');
 const run=window.qaSession.run;
 const sim=new Sim(run.ship,run.inv,{enemy:'packet-leech',stage:1,depth:0,seed:1});
 const view=buildPlayerView(sim.ships[0]);
 const names={'lead:air':'AIR PLANT','lead:engines':'DRIVE','lead:medbay':'INFIRMARY','lead:helm':'HELM','lead:shields':'MESH','lead:weapons':'WEAPONS','keel:service':'SERVICE BAY'};
 const rooms=sim.ships[0].rooms.filter(r=>names[r.id]).map(r=>{const [x,y]=tileScreen(view,r.x,r.y);return {name:names[r.id],x,y,w:r.w*36,h:r.h*36};});
 const position=(x,y)=>{const p=g.ctx.getTransform().transformPoint({x,y});return {x:p.x/2,y:p.y/2};};
 g.rect=(x,y,w,h,color)=>{if(color==='#07080f'){const r=rooms.find(r=>r.x===x&&r.y===y&&r.w===w&&r.h===h);if(r)window.qaDraw[r.name]=position(x+w/2,y+2);}return rect(x,y,w,h,color);};
 g.anim=(atlas,name,t,x,y,o)=>{if(atlas==='crew'&&name.startsWith('linefolk-'))window.qaDraw.crew=position(x,y);return anim(atlas,name,t,x,y,o);};
 const tip=app.ui.setTooltip.bind(app.ui);app.ui.setTooltip=(s,w)=>{window.qaTip=s;tip(s,w);};
});
try {
 await page.goto('http://127.0.0.1:5181/?dev=relay&hops=0');await ready();
 await importLive('/src/screens/session.ts');await instrument();await page.waitForTimeout(300);
 const initial=await page.evaluate(()=>window.qaSession.run.ship.crew[0]);
 const crew=await point('crew');assert.ok(crew);
 await page.mouse.move(crew.x*2,(crew.y-14)*2);await page.waitForTimeout(400);
 let tip=await page.evaluate(()=>window.qaTip);assert.ok(tip.includes(initial.name)&&tip.includes('HP')&&tip.includes('Learns'),tip);
 await page.screenshot({path:`${out}/crew-tooltip.png`});
 await page.mouse.click(crew.x*2,(crew.y-14)*2);await click('AIR PLANT',20,'right');
 assert.equal(await page.evaluate(()=>window.qaSession.run.ship.crew[0].room),'lead:air');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ttl.voyage')).run.ship.crew[0].room),'lead:air');
 await page.waitForTimeout(6500);
 const after=await point('crew'), air=await point('AIR PLANT');
 assert.ok(Math.abs(after.y-(air.y+31))<5,'crew visibly reaches the lower deck through the lift');
 await page.mouse.move(after.x*2,(after.y-14)*2);await page.waitForTimeout(350);
 assert.ok((await page.evaluate(()=>window.qaTip)).includes('Air'),'tooltip tracks current room');
 await page.screenshot({path:`${out}/crew-arrived.png`});
 await page.keyboard.press('r');await page.waitForTimeout(6500);
 assert.equal(await page.evaluate(()=>window.qaSession.run.ship.crew[0].room),'lead:helm');
 await page.keyboard.press('F1');await page.waitForTimeout(100);await click('INFIRMARY',20,'right');
 await page.keyboard.press('Shift+r');await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>window.qaSession.run.ship.crew[0].station),'lead:medbay');
 await page.waitForTimeout(5500);
 // Zoomed pointer movement uses the same transform as rendering; right-click no longer pans.
 const at=await point('INFIRMARY');await page.mouse.move(at.x*2,at.y*2);await page.mouse.wheel(0,-200);await page.waitForTimeout(250);
 await page.keyboard.press('F1');await page.waitForTimeout(100);await click('WEAPONS',20,'right');
 assert.equal(await page.evaluate(()=>window.qaSession.run.ship.crew[0].room),'lead:weapons');
 await page.keyboard.press('z');await page.waitForTimeout(5500);
 await page.screenshot({path:`${out}/relay.png`});
 // A real checkpoint reload and Continue must keep current rooms, independently of return stations.
 await page.goto('http://127.0.0.1:5181/');await ready();await page.keyboard.press('Enter');await page.waitForTimeout(2200);
 await importLive('/src/screens/session.ts');
 assert.equal(await page.evaluate(()=>window.qaSession.run.ship.crew[0].room),'lead:weapons');
 assert.equal(await page.evaluate(()=>window.qaSession.run.ship.crew[0].station),'lead:medbay');
 // Expanded vessels keep the keel visible and obey pointer orders through the fitted transform.
 await page.goto('http://127.0.0.1:5181/?dev=relay&cars=1&hops=0');await ready();
 await importLive('/src/screens/session.ts');await instrument();await page.waitForTimeout(300);
 const service=await point('SERVICE BAY');assert.ok(service&&service.y<365,'keel stays above crew roster');
 await page.keyboard.press('F1');await page.waitForTimeout(100);await click('SERVICE BAY',14,'right');
 assert.equal(await page.evaluate(()=>window.qaSession.run.ship.crew[0].room),'keel:service');
 await page.waitForTimeout(13000);
 const keelCrew=await point('crew');await page.mouse.move(keelCrew.x*2,(keelCrew.y-9)*2);await page.waitForTimeout(350);
 assert.ok((await page.evaluate(()=>window.qaTip)).includes('Service'),'crew reaches the attached keel');
 await page.screenshot({path:`${out}/relay-full.png`});
 for(const [name,query] of [['leech','?dev=combat&enemy=packet-leech'],['skiff','?dev=combat&enemy=scavenger-skiff'],['regent','?dev=combat&enemy=iron-regent'],['choir','?dev=combat&enemy=hollow-choir&stage=2'],['core','?dev=combat&enemy=blackout-core&stage=3&rear=armory-car&keel=sling-keel'],['exchange','?dev=store'],['equipment','?dev=ship']]){
  await page.goto('http://127.0.0.1:5181/'+query);await ready();if(name==='equipment'){await page.keyboard.press('F2');await page.waitForTimeout(200);}await page.screenshot({path:`${out}/${name}.png`});
 }
 await page.setViewportSize({width:1366,height:768});await page.goto('http://127.0.0.1:5181/?dev=combat&enemy=packet-leech');await ready();await page.screenshot({path:`${out}/combat-1366.png`});
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 const report={crewHover:true,animatedLiftTravel:true,persistedOrders:true,returnStations:true,zoomedOrders:true,continue:true,attachedKeel:true,viewports:[1920,1366],errors,missing};
 await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
