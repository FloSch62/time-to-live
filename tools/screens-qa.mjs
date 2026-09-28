// Campaign screens QA: screenshots of every campaign screen (and the tooltips that matter) at 1920×1080 and
// 1366×768, for review by eye. Needs the dev server (pnpm dev, http://127.0.0.1:5181 or TTL_URL).
//   node tools/screens-qa.mjs [outDir=tools/shots/qa/screens] [resolutions=1920x1080,1366x768] [name filter regex]
// Coordinates in actions are logical (960×540). Screens and routes: src/campaign/dev.ts.
import { chromium } from "@playwright/test";
import fs from "node:fs";

const [, , outDir = "tools/shots/qa/screens", resList = "1920x1080,1366x768", filter = ""] = process.argv;
const base = process.env.TTL_URL ?? "http://127.0.0.1:5181";

const SCENES = [
  { name: "title", path: "/?dev=title" },
  { name: "title-settings", path: "/?dev=title", actions: [{ click: [150, 328] }, { wait: 600 }] },
  { name: "guide", path: "/?dev=title", actions: [{ key: "F1" }, { wait: 600 }] },
  { name: "credits", path: "/?dev=credits", actions: [{ wait: 6000 }] },
  { name: "newvoyage", path: "/?dev=newvoyage" },
  { name: "newvoyage-glasswing", path: "/?dev=newvoyage", actions: [{ click: [480, 53] }, { wait: 600 }] },
  { name: "newvoyage-switchback", path: "/?dev=newvoyage", actions: [{ click: [800, 53] }, { wait: 600 }] },
  { name: "newvoyage-tooltip", path: "/?dev=newvoyage", actions: [{ move: [300, 130] }, { wait: 700 }] },
  { name: "script-prologue", path: "/?dev=script&seq=PROLOGUE", wait: 4000 },
  { name: "script-guardian", path: "/?dev=script&seq=iron-regent", wait: 4000 },
  { name: "script-ending", path: "/?dev=ending", wait: 4000 },
  { name: "relay", path: "/?dev=relay", wait: 5000 },
  { name: "pause", path: "/?dev=relay", wait: 5000, actions: [{ key: "Escape" }, { wait: 500 }] },
  { name: "pause-settings", path: "/?dev=relay", wait: 5000, actions: [{ key: "Escape" }, { wait: 500 }, { click: [480, 328] }, { wait: 500 }] },
  { name: "pause-guide", path: "/?dev=relay", wait: 5000, actions: [{ key: "Escape" }, { wait: 500 }, { click: [480, 358] }, { wait: 500 }] },
  { name: "runbook", path: "/?dev=runbook" },
  { name: "runbook-entry", path: "/?dev=runbook", actions: [{ click: [400, 140] }, { wait: 400 }] },
  { name: "runbook-queue", path: "/?dev=runbook", actions: [{ click: [200, 90] }, { wait: 400 }] },
  { name: "runbook-in-voyage", path: "/?dev=relay", wait: 5000, actions: [{ key: "Escape" }, { wait: 500 }, { key: "KeyB" }, { wait: 600 }] },
  { name: "settings", path: "/?dev=settings" },
  { name: "map", path: "/?dev=map", wait: 5000 },
  { name: "map-stage3", path: "/?dev=map&stage=3", wait: 6000 },
  { name: "event", path: "/?dev=event", wait: 7000 },
  { name: "event-typing", path: "/?dev=event", wait: 4300 },
  { name: "event-costs", path: "/?dev=event&id=s1-barter-across", wait: 7000, actions: [{ key: "Space" }, { wait: 400 }] },
  { name: "event-art-long", path: "/?dev=event&id=s1-last-resort", wait: 7000, actions: [{ key: "Space" }, { wait: 400 }] },
  { name: "event-blue", path: "/?dev=event&id=s1-stutter-relay", wait: 7000, actions: [{ key: "Space" }, { wait: 400 }] },
  { name: "event-outcome", path: "/?dev=event", wait: 6000, actions: [{ key: "Space" }, { wait: 300 }, { key: "Digit1" }, { wait: 1500 }, { key: "Space" }, { wait: 500 }] },
  { name: "store-weapons", path: "/?dev=store", wait: 5000 },
  { name: "store-weapons-tooltip", path: "/?dev=store", wait: 5000, actions: [{ move: [300, 190] }, { wait: 700 }] },
  { name: "store-drones", path: "/?dev=store", wait: 5000, actions: [{ key: "Digit2" }, { wait: 400 }] },
  { name: "store-systems", path: "/?dev=store", wait: 5000, actions: [{ key: "Digit3" }, { wait: 400 }] },
  { name: "store-crew", path: "/?dev=store", wait: 5000, actions: [{ key: "Digit4" }, { wait: 400 }] },
  { name: "store-augments", path: "/?dev=store", wait: 5000, actions: [{ key: "Digit5" }, { wait: 400 }] },
  { name: "store-cars", path: "/?dev=store", wait: 5000, actions: [{ key: "Digit6" }, { wait: 400 }] },
  { name: "store-car-confirm", path: "/?dev=store", wait: 5000, actions: [{ key: "Digit6" }, { wait: 300 }, { click: [580, 178] }, { wait: 500 }] },
  { name: "store-supplies", path: "/?dev=store", wait: 5000, actions: [{ key: "Digit7" }, { wait: 400 }] },
  { name: "store-pell", path: "/?dev=store&pell=1", wait: 5000 },
  { name: "tender-upgrades", path: "/?dev=ship", wait: 5000 },
  { name: "tender-equipment", path: "/?dev=ship&tab=1", wait: 5000 },
  { name: "tender-equipment-tooltip", path: "/?dev=ship&tab=1", wait: 5000, actions: [{ move: [120, 175] }, { wait: 700 }] },
  { name: "tender-crew", path: "/?dev=ship&tab=2", wait: 5000 },
  { name: "tender-yard", path: "/?dev=yard", wait: 5000 },
  { name: "tender-yard-socket", path: "/?dev=yard", wait: 5000, actions: [{ click: [330, 240] }, { wait: 500 }] },
  { name: "tender-yard-bench", path: "/?dev=ship&bench=1&tab=3", wait: 5000 },
  { name: "victory", path: "/?dev=victory", wait: 6000 },
  { name: "overflow-car", path: "/?dev=overflow", wait: 6000 },
  { name: "refit-receipt", path: "/?dev=overflow", wait: 6000, actions: [{ key: "Enter" }, { wait: 250 }] },
  { name: "gameover", path: "/?dev=gameover" },
];

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const jobs = [];
for (const res of resList.split(",")) {
  const [w, h] = res.split("x").map(Number);
  for (const s of SCENES) if (!filter || new RegExp(filter).test(s.name)) jobs.push({ s, w, h });
}
const problems = [];
async function shoot({ s, w, h }) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => problems.push(`${s.name} ${w}: ${e.message}`));
  await page.goto(base + s.path);
  await page.waitForTimeout(s.wait ?? 3000);
  const box = await page.locator("canvas#game").boundingBox();
  const at = (x, y) => [box.x + x * (box.width / 960), box.y + y * (box.height / 540)];
  for (const a of s.actions ?? []) {
    if (a.click) await page.mouse.click(...at(...a.click));
    if (a.move) await page.mouse.move(...at(...a.move));
    if (a.key) await page.keyboard.press(a.key);
    if (a.wait) await page.waitForTimeout(a.wait);
  }
  await page.screenshot({ path: `${outDir}/${s.name}-${w}.png` });
  await page.close();
}
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < jobs.length) {
    const j = jobs[next++];
    try { await shoot(j); } catch (e) { problems.push(`${j.s.name} ${j.w}: ${e.message}`); }
  }
}));
await browser.close();
console.log(`${jobs.length} screenshots in ${outDir}`);
if (problems.length) {
  console.log(problems.join("\n"));
  process.exitCode = 1;
}
