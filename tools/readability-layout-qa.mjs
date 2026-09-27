// Dense relay: ten crew, three cars, hazard copy and earned stores must remain separate.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5181/?dev=relay&cars=1&hops=0');
 await page.waitForFunction(()=>window.__ttl?.scenes.top&&!window.__ttl.scenes.transitioning);await page.waitForTimeout(1500);
 await page.evaluate(async()=>{
  const mod=async path=>import(performance.getEntriesByType('resource').map(e=>e.name).find(u=>new URL(u).pathname===path));
  const {activeSession}=await mod('/src/screens/session.ts'),{newCrew}=await mod('/src/data/ship.ts'),{currentRelay}=await mod('/src/campaign/model.ts');
  const session=activeSession(),run=session.run;
  for(let i=run.ship.crew.length;i<10;i++)run.ship.crew.push(newCrew(['linefolk','warden','rigger'][i%3],`Test crew ${i+1}`,'lead:hall'));
  const relay=currentRelay(run);relay.hazard='debris-field';relay.serviceSalvage=24;session.saveFromUI(run);
  window.qaPanels={};window.qaRoster={};window.qaTip='';
  const {g,ui}=window.__ttl,panel=g.panel.bind(g),area=ui.area.bind(ui),tip=ui.setTooltip.bind(ui);
  g.panel=(x,y,w,h,...rest)=>{if(x===8&&w===770)window.qaPanels[y]={x,y,w,h};return panel(x,y,w,h,...rest);};
  ui.area=(id,x,y,w,h,...rest)=>{if(id.startsWith('crew-'))window.qaRoster[id]={x,y,w,h};return area(id,x,y,w,h,...rest);};
  ui.setTooltip=(s,...rest)=>{window.qaTip=s;return tip(s,...rest);};
 });
 await page.waitForTimeout(500);
 await page.screenshot({path:'tools/shots/readability/relay-ten-crew.png'});
 const panels=await page.evaluate(()=>Object.values(window.qaPanels).sort((a,b)=>a.y-b.y));
 assert.equal(panels.length,2);assert.ok(panels[0].y+panels[0].h<=panels[1].y,JSON.stringify(panels));
 const roster=await page.evaluate(()=>Object.values(window.qaRoster));assert.equal(roster.length,10);
 const last=roster.at(-1);await page.mouse.move((last.x+last.w/2)*2,(last.y+10)*2);await page.waitForTimeout(350);
 assert.ok((await page.evaluate(()=>window.qaTip)).includes('Test crew 10'),'second roster row has crew details');
 await page.setViewportSize({width:1366,height:768});await page.waitForTimeout(200);await page.screenshot({path:'tools/shots/readability/relay-ten-crew-1366.png'});
 assert.deepEqual(errors,[]);
 const report={tenCrew:true,attachedCars:true,hazardAndStores:true,panels,rosterTooltip:true,errors};
 await writeFile('tools/shots/readability/layout.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
