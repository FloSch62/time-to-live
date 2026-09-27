// Serve the built artifact on an ephemeral loopback port and exercise the actual production entry point.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const root=resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.ogg':'audio/ogg','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!path.startsWith(root+'/')&&path!==root){res.writeHead(403).end();return;}
  const file=path===root?root+'/index.html':path;
  try{const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream'}).end(bytes);}
  catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}),problems=[];
try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  page.on('pageerror',e=>problems.push(e.message));
  page.on('response',r=>{if(r.status()>=400)problems.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(()=>window.__ttl?.scenes.top&&!window.__ttl.scenes.transitioning);
  await page.keyboard.press('F1');await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>window.__ttl.scenes.stack.length),2,'the field guide ships in the production bundle');
  await page.keyboard.press('Escape');await page.waitForTimeout(150);
  for(const key of ['Enter','Enter','Escape','Escape']){await page.keyboard.press(key);await page.waitForTimeout(1500);}
  await page.waitForFunction(()=>localStorage.getItem('ttl.voyage'));
  await page.waitForTimeout(2000);
  await page.keyboard.press('m');
  await page.waitForFunction(()=>window.__ttl.scenes.stack.length===2);
  await page.waitForTimeout(300);
  await page.screenshot({path:'tools/shots/qa/production-chart.png'});
  assert.deepEqual(problems,[]);
  const result={build:'dist',guide:true,flow:'Title → new voyage → prologue → relay → chart',checkpoint:true,chartOpen:true,problems};
  await writeFile('tools/shots/qa/production.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}finally{await browser.close();await new Promise(r=>server.close(r));}
