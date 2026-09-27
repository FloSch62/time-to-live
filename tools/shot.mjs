// Screenshot helper: node tools/shot.mjs "<url path+query>" out.png [waitMs] [width] [height] [actions-json]
// actions-json: [{"click":[x,y]} (logical coords) | {"key":"Space"} | {"wait":ms} | {"move":[x,y]}]
import { chromium } from "@playwright/test";
const [, , path = "/", out = "tools/shots/shot.png", wait = "1500", w = "1920", h = "1080", actions = "[]"] = process.argv;
const base = process.env.TTL_URL ?? "http://127.0.0.1:5181";
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(base + path);
await page.waitForTimeout(+wait);
const scale = Math.min(+w / 960, +h / 540);
const toClient = async (x, y) => {
  const box = await page.locator("canvas#game").boundingBox();
  return [box.x + x * (box.width / 960), box.y + y * (box.height / 540)];
};
for (const a of JSON.parse(actions)) {
  if (a.click) { const [cx, cy] = await toClient(...a.click); await page.mouse.click(cx, cy, { button: a.button ?? "left" }); }
  if (a.move) { const [cx, cy] = await toClient(...a.move); await page.mouse.move(cx, cy); }
  if (a.key) await page.keyboard.press(a.key);
  if (a.type) await page.keyboard.type(a.type);
  if (a.wait) await page.waitForTimeout(a.wait);
  if (a.shot) await page.screenshot({ path: a.shot });
}
await page.screenshot({ path: out });
if (logs.length) console.log(logs.slice(-30).join("\n"));
await browser.close();
