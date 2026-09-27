// Verify real WebAudio scheduling with short in-memory test buffers; no generated music or player saves changed.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage();
  await page.goto(process.env.TTL_URL ?? 'http://127.0.0.1:5181');
  await page.waitForFunction(() => window.__ttl);
  await page.mouse.click(4, 4);
  const result = await page.evaluate(async () => {
    const moduleURL = performance.getEntriesByType('resource').map(e => e.name).find(u => new URL(u).pathname === '/src/core/audio.ts');
    const { audio, music, sfx } = await import(moduleURL);
    music.stop(0);
    audio.unlock();
    const original = audio.buffer.bind(audio);
    audio.buffer = async () => audio.ctx.createBuffer(2, 96000, 48000);
    audio.musicMeta['qa-phases'] = { files: { main:'custody', custody:'custody', emergency:'emergency', horizon:'horizon' }, gainDb:-12, loop:true };
    await music.play('qa-phases', 'custody', 0);
    await new Promise(r => setTimeout(r, 100));
    const initial = { sources:music.current.sources.length, gain:music.current.out.gain.value, levels:Object.fromEntries(Object.entries(music.current.layerGains).map(([k,g]) => [k,g.gain.value])) };
    music.setLayer('emergency', 0);
    await new Promise(r => setTimeout(r, 50));
    const emergency = Object.fromEntries(Object.entries(music.current.layerGains).map(([k,g]) => [k,g.gain.value]));
    music.setLayer('horizon', 0);
    await new Promise(r => setTimeout(r, 50));
    const horizon = Object.fromEntries(Object.entries(music.current.layerGains).map(([k,g]) => [k,g.gain.value]));
    music.setLayer('custody', 0.4);
    await new Promise(r => setTimeout(r, 180));
    const crossfadePower = Object.values(music.current.layerGains).reduce((sum,g) => sum + g.gain.value ** 2, 0);
    music.setLayer('emergency', 0.1); // interrupt a curve, as a rapid guardian phase change can
    await new Promise(r => setTimeout(r, 160));
    const interrupted = Object.fromEntries(Object.entries(music.current.layerGains).map(([k,g]) => [k,g.gain.value]));
    audio.musicMeta['qa-ending'] = { files:{main:'ending'}, loop:false };
    await music.play('qa-ending', 'explore', 0);
    const loops = music.current.sources.map(s => s.loop);
    music.stop(0);
    const createSource = audio.ctx.createBufferSource.bind(audio.ctx);
    let effectSource;
    audio.ctx.createBufferSource = () => (effectSource = createSource());
    audio.sfxMeta['qa-loop'] = {files:['audio/sfx/qa-loop.ogg'],loop:true,loopStart:0.25,loopEnd:1.5};
    const handle = sfx.loop('qa-loop');
    await new Promise(r=>setTimeout(r,30));
    const effectLoop = {loop:effectSource.loop,start:effectSource.loopStart,end:effectSource.loopEnd};
    handle.stop(0); handle.stop(0);
    audio.ctx.createBufferSource = createSource;
    audio.buffer = original;
    // Exercise the real cache while replacing only network/decoder work with tiny buffers.
    const fetchOriginal = window.fetch;
    const decodeOriginal = audio.ctx.decodeAudioData;
    const requests = [];
    window.fetch = async path => { requests.push(String(path)); return new Response(new ArrayBuffer(4)); };
    audio.ctx.decodeAudioData = async () => audio.ctx.createBuffer(1, 48, 48000);
    audio.buffers.clear();
    await audio.buffer('audio/music/qa-0.ogg');
    for (let i = 0; i < 104; i++) await audio.buffer(`audio/sfx/qa-${i}.ogg`);
    await audio.buffer('audio/music/qa-0.ogg');
    const musicRequestsAfterEffects = requests.filter(p => p.endsWith('/music/qa-0.ogg')).length;
    for (let i = 1; i < 7; i++) await audio.buffer(`audio/music/qa-${i}.ogg`);
    const cache = { musicRequestsAfterEffects, music:[...audio.buffers.keys()].filter(k => k.startsWith('audio/music/')).length,
      effects:[...audio.buffers.keys()].filter(k => k.startsWith('audio/sfx/')).length, evictedOldMusic:!audio.buffers.has('audio/music/qa-0.ogg') };
    window.fetch = fetchOriginal;
    audio.ctx.decodeAudioData = decodeOriginal;
    return { initial, emergency, horizon, loops, cache, crossfadePower, interrupted, effectLoop };
  });
  assert.equal(result.initial.sources,3, 'custody main alias does not create a duplicate source');
  assert.equal(result.initial.gain,1, 'mastering gain is not applied twice');
  assert.deepEqual(result.initial.levels,{custody:1,emergency:0,horizon:0});
  assert.deepEqual(result.emergency,{custody:0,emergency:1,horizon:0});
  assert.deepEqual(result.horizon,{custody:0,emergency:0,horizon:1});
  assert.ok(Math.abs(result.crossfadePower - 1) < 0.02, 'crossfades preserve equal power');
  assert.deepEqual(result.interrupted,{custody:0,emergency:1,horizon:0}, 'a phase change can interrupt a running fade');
  assert.deepEqual(result.loops,[false], 'defeat cue does not loop');
  assert.deepEqual(result.effectLoop,{loop:true,start:0.25,end:1.5}, 'looping effects use their mastered loop bounds');
  assert.deepEqual(result.cache,{musicRequestsAfterEffects:1,music:6,effects:96,evictedOldMusic:true}, 'effects retain the score while both caches stay bounded');
  console.log('Audio checks passed: phase sources, three crossfades, mastering gain, non-loop ending, bounded music/effect caches.');
} finally { await browser.close(); }
