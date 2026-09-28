// Shipped paintings, both weather depth layers, and reduced-motion stability. Run against a Vite dev server.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base = process.env.TTL_URL ?? 'http://127.0.0.1:5181';
const out = 'tools/shots/art';
await mkdir(out, {recursive:true});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport:{width:1920,height:1080}});
  await page.routeWebSocket('**', socket => socket.close());
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  await page.waitForFunction(() => window.__ttl?.scenes.top && !window.__ttl.scenes.transitioning);
  const results = await page.evaluate(async () => {
    const source = path => performance.getEntriesByType('resource').map(e=>e.name).find(url=>new URL(url).pathname===path)??path;
    const {preloadArt, art} = await import(source('/src/core/assets.ts'));
    const {Gfx} = await import(source('/src/core/gfx.ts'));
    const {settings} = await import(source('/src/core/save.ts'));
    const {drawBackdrop, drawForeground, stageBg} = await import(source('/src/screens/backdrop.ts'));
    const {HAZARD_IDS} = await import(source('/src/game/ids.ts'));
    const ids = [1,2,3].flatMap(stage=>['a','b','c','d','e'].map(letter=>`bg/s${stage}-${letter}`));
    await preloadArt(ids);
    const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.scale(2,2);const g=new Gfx(ctx);
    const pixels=()=>ctx.getImageData(0,0,1920,1080).data;
    const diff=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])n++;return n;};
    const render=(id,stage,hazard,time,reduced,front=true)=>{
      settings.reducedMotion=reduced;ctx.clearRect(0,0,960,540);
      drawBackdrop(g,id,{kind:'space',stage,hazard,time,state:'idle'});
      if(front)drawForeground(g,stage,hazard,time,reduced);
      return pixels();
    };
    const wasReduced=settings.reducedMotion;
    const landmarks=ids.map(id=>{const stage=Number(id[4]);const first=render(id,stage,undefined,0,false);const later=render(id,stage,undefined,9,false);return{id,loaded:!!art(id),motionPixels:diff(first,later)};});
    const weather=HAZARD_IDS.map((hazard,i)=>{
      const stage=Math.floor(i/3)+1;const id=stageBg(stage,1,{id:i,kind:'fight',hazard});
      const back=render(id,stage,hazard,2,false,false), full=render(id,stage,hazard,2,false);
      const later=render(id,stage,hazard,8,false), still=render(id,stage,hazard,0,true), stillLater=render(id,stage,hazard,29,true);
      return{hazard,id,foregroundPixels:diff(back,full),motionPixels:diff(full,later),reducedMotionPixels:diff(still,stillLater)};
    });
    const selections=[1,2,3].map(stage=>({stage,ids:[...new Set(Array.from({length:10},(_,id)=>stageBg(stage,id%3,{id,kind:'fight'})))],refuge:stageBg(stage,0,{id:99,kind:'bench'})}));
    window.qaAtmosphereCapture=(id,hazard,time=2)=>{const stage=Number(id[4]);render(id,stage,hazard,time,false);return canvas.toDataURL();};
    settings.reducedMotion=wasReduced;
    return{landmarks,weather,selections};
  });
  for(const landmark of results.landmarks){assert.ok(landmark.loaded,landmark.id);assert.ok(landmark.motionPixels>100,landmark.id);}
  for(const weather of results.weather){assert.ok(weather.foregroundPixels>20,weather.hazard);assert.ok(weather.motionPixels>100,weather.hazard);assert.equal(weather.reducedMotionPixels,0,weather.hazard);}
  for(const selection of results.selections){assert.equal(selection.ids.length,5);assert.ok(selection.refuge.endsWith('-e'));}
  for(const [id,hazard] of [['bg/s1-e','sun-glare'],['bg/s1-d','debris-field'],['bg/s2-d','ringing-panes'],['bg/s2-e','glass-fog'],['bg/s3-d','ember-draft'],['bg/s3-e','sealing-lattice']]){
    const uri=await page.evaluate(([id,hazard])=>window.qaAtmosphereCapture(id,hazard),[id,hazard]);
    await writeFile(`${out}/atmosphere-${id.slice(3)}.png`,Buffer.from(uri.split(',')[1],'base64'));
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/atmosphere-qa.json`,JSON.stringify({...results,errors},null,2));
  console.log(JSON.stringify({...results,errors},null,2));
} finally {await browser.close();}
