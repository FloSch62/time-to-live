// Decode every shipped image and sound in Chromium, including media absent from short gameplay paths.
import { chromium } from '@playwright/test';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
async function files(dir) {
  const out=[];
  for(const f of await readdir(dir,{withFileTypes:true})) {
    const path=`${dir}/${f.name}`;
    if(f.isDirectory()) out.push(...await files(path)); else out.push(path.slice(7));
  }
  return out;
}
const shipped = await files('public');
const images = shipped.filter(p=>p.endsWith('.png'));
const sounds = shipped.filter(p=>p.endsWith('.ogg'));
const metadata = JSON.parse(await readFile('public/audio/music.json','utf8'));
const durations = Object.fromEntries(Object.values(metadata).flatMap(m=>Object.values(m.files).map(path=>[path,m.duration])));
const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const problems=[];
try {
  const page=await browser.newPage();
  page.on('pageerror',e=>problems.push(e.message));
  await page.goto(process.env.TTL_URL ?? 'http://127.0.0.1:5181');
  await page.waitForFunction(()=>window.__ttl);
  await page.mouse.click(4,4);
  for(const path of images) {
    const result=await page.evaluate(async path=>{
      const image=new Image(); image.src=path;
      try {await image.decode();return image.naturalWidth>0&&image.naturalHeight>0;}catch{return false;}
    },path);
    if(!result) problems.push(`Image decode: ${path}`);
  }
  await page.evaluate(async()=>{
    const source=performance.getEntriesByType('resource').map(e=>e.name).find(u=>new URL(u).pathname==='/src/core/audio.ts');
    const mod=await import(source);mod.music.stop(0);mod.audio.unlock();window.qaAudio=mod.audio;
  });
  const decoded=[];
  for(const path of sounds) {
    const result=await page.evaluate(async path=>{
      const b=await window.qaAudio.buffer(path);
      if(!b) return null;
      let peak=0;
      for(let c=0;c<b.numberOfChannels;c++) {
        const samples=b.getChannelData(c),step=Math.max(1,Math.floor(b.length/1000));
        for(let i=0;i<samples.length;i+=step) peak=Math.max(peak,Math.abs(samples[i]));
      }
      return {duration:b.duration,channels:b.numberOfChannels,peak};
    },path);
    decoded.push({path,...result});
    if(!result||result.channels!==2||!Number.isFinite(result.peak)||result.peak===0) problems.push(`Audio decode: ${path}`);
    if(durations[path]&&Math.abs(result?.duration-durations[path])>.1) problems.push(`Audio duration: ${path}`);
  }
  await mkdir('tools/shots/qa',{recursive:true});
  await writeFile('tools/shots/qa/media.json',JSON.stringify({images:images.length,sounds:sounds.length,decoded,problems},null,2));
  assert.deepEqual(problems,[],'every shipped image and sound decodes');
  console.log(JSON.stringify({images:images.length,sounds:sounds.length,problems}));
} finally {await browser.close();}
