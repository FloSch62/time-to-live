// Runtime content-to-asset audit: includes references that may never occur in a short browser run.
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { ALL_EVENTS } from '../src/content/events/index.ts';
import * as script from '../src/content/script.ts';
import * as codex from '../src/content/codex.ts';
import * as weapons from '../src/data/weapons.ts';
import { MUSIC_IDS, WEAPON_IDS, DRONE_IDS } from '../src/game/ids.ts';
const refs = new Set();
const soundCues = new Set();
const problems = [];
function walk(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') {
      if (key === 'art') refs.add(`art/${item.includes('/') ? item : `events/${item}`}.png`);
      if (key === 'portrait') refs.add(`art/portraits/${item}.png`);
      if (key === 'sfx') soundCues.add(item);
    } else walk(item);
  }
}
walk(ALL_EVENTS); walk(script); walk(codex); walk(weapons);
for (const file of readdirSync('src',{recursive:true}).filter(p=>p.endsWith('.ts')&&!p.endsWith('.test.ts'))) {
  for (const match of readFileSync(`src/${file}`,'utf8').matchAll(/sfx\.(?:play|loop)\(["']([^"']+)["']/g)) soundCues.add(match[1]);
}
for (const stage of [1,2,3]) for (const variant of ['a','b','c']) refs.add(`art/bg/s${stage}-${variant}.png`);
for (const id of ['title','relay-seven','line-quiet']) refs.add(`art/bg/${id}.png`);
for (const [group, ids] of [['weapons',WEAPON_IDS],['drones',DRONE_IDS]]) for (const id of ids) {
  refs.add(`art/${group}/${id}.png`); refs.add(`art/${group}/${id}-icon.png`);
}
for (const group of ['ships','weapons','drones']) {
  const file = `public/art/${group}/${group}.json`;
  if (!existsSync(file)) { problems.push(`Missing metadata: ${file}`); continue; }
  const data = JSON.parse(readFileSync(file));
  for (const meta of Object.values(data)) if (meta.file) refs.add(`art/${meta.file}`);
}
// Include dynamically chosen room furnishings and every delivered art record.
const artManifest = JSON.parse(readFileSync('art-src/manifest.json'));
for (const group of Object.values(artManifest)) for (const item of Object.values(group)) refs.add(item.file);
const music = JSON.parse(readFileSync('public/audio/music.json'));
for (const id of MUSIC_IDS) {
  const item = music[id];
  if (!item) { problems.push(`Missing music theme: ${id}`); continue; }
  for (const path of Object.values(item.files)) refs.add(path);
  if (item.loop !== false && !(item.loopStart >= 0 && item.loopEnd > item.loopStart && item.loopEnd <= item.duration)) problems.push(`Invalid music loop: ${id}`);
}
const sfx = JSON.parse(readFileSync('public/audio/sfx.json'));
for (const id of soundCues) if (!sfx[id]) problems.push(`Missing sound cue: ${id}`);
for (const item of Object.values(sfx)) for (const path of item.files) refs.add(path.startsWith('audio/') ? path : `audio/sfx/${path}`);
for (const path of refs) if (!existsSync(`public/${path}`) || statSync(`public/${path}`).size < 32) problems.push(`Missing or empty: ${path}`);
console.log(JSON.stringify({ references:refs.size, musicThemes:Object.keys(music).length, effects:Object.keys(sfx).length, problems },null,2));
if (problems.length) process.exitCode=1;
