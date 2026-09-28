// Weapon-mount clearance QA (C, ship view). For each tender (alone, and with an Armory Car and a Sling Keel coupled)
// every player weapon sprite is put on every mount at once, and the drawn geometry is checked:
//   carrier    a roof weapon's opaque box keeps CLEAR_AIR under the carrier's lower edge (the model line every tender
//              carrier respects, and the line combat actually draws)
//   keepClear  no weapon box enters a ships.json keepClear zone (trolley, roof fittings, lamp, cab window); zones
//              above a roof plate keep CLEAR_AIR too
//   envelope   A's worst-case weaponEnvelope fits every roof mount the same way (pylon cut to 0 at most)
//   weapons    no two weapon boxes (nor their hover areas) overlap
//   ward       every weapon box lies inside the ward's inner shell with at least WARD_MIN of margin
//   screen     every weapon box lies inside the vessel's camera region (1920×1080 and 1366×768 share the 960×540
//              layout, so one pass covers both)
//   pylons     belly weapons sit snug (pylon ≤ PYLON_BELLY); roof pylons are never negative
//   hover      in the live combat scene, the pointer over each weapon (and over its pylon) shows that weapon's tooltip
// Exits 1 with one line per failure. Needs the dev server (TTL_URL, default http://127.0.0.1:5181).
//   node tools/mount-qa.mjs [--quick]      (--quick: the four largest sprites only)
import { chromium } from "@playwright/test";

const base = process.env.TTL_URL ?? "http://127.0.0.1:5181";
const quick = process.argv.includes("--quick");
const WARD_MIN = 8;
const browser = await chromium.launch();
const failures = [];
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.routeWebSocket("**", (s) => s.close());
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/?dev=combat&tender=lamplighter`);
  await page.waitForFunction(() => window.__ttl && !window.__ttl.scenes.transitioning);
  await page.waitForTimeout(1200);

  const report = await page.evaluate(async ({ quick, WARD_MIN }) => {
    const url = (p) => performance.getEntriesByType("resource").map((e) => e.name).find((u) => new URL(u).pathname === p) ?? p;
    const imp = (p) => import(url(p));
    const [{ makePlayerShip }, { coupleCar }, { Sim }, V, D, W, A, { CARRIER_THICKNESS }, { WEAPONS }] = await Promise.all([
      imp("/src/data/ship.ts"), imp("/src/data/consist.ts"), imp("/src/combat/sim/sim.ts"), imp("/src/combat/view.ts"),
      imp("/src/combat/draw-ship.ts"), imp("/src/combat/shield-geometry.ts"), imp("/src/combat/assets.ts"),
      imp("/src/combat/carrier.ts"), imp("/src/data/weapons.ts"),
    ]);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    await A.loadCombatMeta();
    const sprites = [...new Set(Object.values(WEAPONS).map((w) => w.sprite))];
    // Every weapon sprite and hull image loaded before measuring (the ward and the plate scan read their pixels).
    for (let i = 0; i < 100; i++) {
      const pending = sprites.filter((s) => { const { img } = A.weaponArt(s); return !img || !img.complete; });
      const hulls = [["lamplighter", [12, 4]], ["glasswing", [10, 4]], ["switchback", [13, 5]], ["armory-car", [4, 4]], ["sling-keel", [6, 2]]]
        .filter(([id, g]) => { const img = A.hullImage(id, undefined, g); return !img || (img instanceof HTMLImageElement && !img.complete); });
      if (!pending.length && !hulls.length) break;
      await wait(100);
    }
    const box = (s) => D.weaponBox(s);
    let list = sprites.map((s) => ({ s, b: box(s) }));
    if (quick) {
      const pick = new Set();
      for (const k of ["up", "l", "r"]) pick.add([...list].sort((a, b) => b.b[k] - a.b[k])[0].s);
      pick.add([...list].sort((a, b) => b.b.l + b.b.r - a.b.l - a.b.r)[0].s);
      list = list.filter((q) => pick.has(q.s));
    }
    const weaponFor = (sprite) => Object.values(WEAPONS).find((w) => w.sprite === sprite).id;
    const ships = JSON.parse(JSON.stringify((await (await fetch("/art/ships/ships.json")).json())));
    const out = { failures: [], rows: [], envelope: [], hover: [] };
    const fail = (m) => out.failures.push(m);
    const overlap = (a, b) => Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]) > 0 && Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]) > 0;
    const inPoly = (pts, x, y) => {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const segDist = (px, py, a, b) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L));
      return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
    };
    const polyDist = (pts, x, y) => { let d = Infinity; for (let i = 0; i < pts.length; i++) d = Math.min(d, segDist(x, y, pts[i], pts[(i + 1) % pts.length])); return d; };
    const border = (r) => { const p = []; for (let t = 0; t <= 1.0001; t += 0.05) p.push([r[0] + r[2] * t, r[1]], [r[0] + r[2] * t, r[1] + r[3]], [r[0], r[1] + r[3] * t], [r[0] + r[2], r[1] + r[3] * t]); return p; };
    const env = (e) => ({ l: e.left / 2, r: e.right / 2, up: e.up / 2 });

    for (const lead of ["lamplighter", "glasswing", "switchback"]) for (const extra of [false, true]) {
      let base = makePlayerShip("", undefined, "amber", lead);
      if (extra) { base = coupleCar(base, "rear", "armory-car"); base = coupleCar(base, "keel", "sling-keel"); }
      const consist = extra ? `${lead}+armory-car+sling-keel` : lead;
      for (const { s } of list) {
        const ship = JSON.parse(JSON.stringify(base));
        const probeSim = new Sim(ship, { salvage: 0, ttl: 0, payloads: 0, spares: 0 }, { enemy: "packet-leech", stage: 1, seed: 1, depth: 0 });
        const hps = D.playerHardpoints(V.buildPlayerView(probeSim.ships[0]));
        ship.weaponSlots = hps.length;
        ship.weapons = hps.map(() => weaponFor(s));
        ship.weaponPower = hps.map(() => true);
        const sim = new Sim(ship, { salvage: 0, ttl: 0, payloads: 0, spares: 0 }, { enemy: "packet-leech", stage: 1, seed: 1, depth: 0 });
        const S = sim.ships[0];
        const v = V.buildPlayerView(S);
        D.wrapWeapons(v, S);
        const content = D.contentRects(v, S);
        V.fitCamera(v, S, content.warded, content.bare);
        const ms = D.mountPositions(S, v, D.playerHardpoints(v));
        const floor = D.carrierFloor(v);
        const cam = v.cam;
        const [xl] = V.camToWorld(cam, cam.rx, 0), [xr] = V.camToWorld(cam, cam.rx + cam.rw, 0);
        const drawn = D.tenderCarrier(v, Math.floor(xl) - 12, Math.ceil(xr) + 12, [18, 12]);
        const zones = D.keepClearZones(v);
        let field = W.wardField(v);
        for (let i = 0; i < 20 && field && !field.complete; i++) { await wait(450); field = W.wardField(v); }
        const ward = W.wardLocal(v, 0).pts;
        const rects = [], hits = [];
        for (const w of S.weapons) {
          const m = ms[w.slot];
          const tag = `${consist} · mount ${w.slot + 1} (${hps[w.slot].car} ${hps[w.slot].side}) · ${s}`;
          if (!m) { fail(`${tag}: no mount position`); continue; }
          const r = D.weaponBounds(s, m, 1);
          rects.push([w.slot, r]);
          hits.push([w.slot, D.weaponRect(w, m, 1)]);
          const row = { consist, slot: w.slot + 1, car: hps[w.slot].car, side: hps[w.slot].side, sprite: s, pylon: m.pylon, want: m.want, plate: m.plateY, air: null, ward: null };
          if (m.pylon < 0) fail(`${tag}: negative pylon ${m.pylon}`);
          if (m.belly && m.pylon > D.PYLON_BELLY) fail(`${tag}: belly pylon ${m.pylon} > ${D.PYLON_BELLY} (not snug under the keel)`);
          if (!m.belly && floor) {
            let air = Infinity, airDrawn = Infinity;
            for (let x = r[0]; x <= r[0] + r[2]; x += 1) {
              air = Math.min(air, r[1] - (floor(x) + CARRIER_THICKNESS / 2));
              if (drawn) airDrawn = Math.min(airDrawn, r[1] - (drawn.yAt(x) + CARRIER_THICKNESS / 2));
            }
            row.air = +air.toFixed(1);
            row.airDrawn = +airDrawn.toFixed(1);
            if (air < D.CLEAR_AIR - 0.01) fail(`${tag}: ${air.toFixed(1)} units of air under the carrier (need ${D.CLEAR_AIR}); pylon ${m.pylon}/${m.want}`);
            if (airDrawn < D.CLEAR_AIR - 0.01) fail(`${tag}: combat's drawn carrier passes ${airDrawn.toFixed(1)} units above the weapon (need ${D.CLEAR_AIR})`);
          }
          // Hull art in the way. Another car of the consist (a keel car hung under a belly mount, a rear car beside a
          // roof mount): any of its pixels inside the weapon box. The mount's own car, when its art declares no
          // keepClear zones (older art): hull pixels inside the box standing more than 4 units off the plate (the
          // plate's rail and the hull face behind the pylon do not count).
          const own = v.cars.find((q) => q.slot === hps[w.slot].car);
          for (const c of v.cars) {
            if (c === own && ships[c.id]?.keepClear) continue;
            const grid = [c.cols, c.rows];
            let covered = 0;
            for (let y = r[1]; y < r[1] + r[3]; y += 0.5) {
              if (c === own && (m.belly ? y < m.plateY + 4 : y > m.plateY - 4)) continue;
              for (let x = r[0]; x < r[0] + r[2]; x += 0.5) {
                const lx = x - c.x - v.dx, ly = y - c.y - v.dy;
                if (lx < 0 || ly < 0 || lx >= c.meta.w || ly >= c.meta.h) continue;
                if (A.hullSolidAt(c.id, grid, lx, ly)) covered++;
              }
            }
            if (covered <= 6) continue;
            if (c === own) fail(`${tag}: weapon box covers ${covered} px of the ${c.id}'s painted fittings (its art has no keepClear zones)`);
            else fail(`${tag}: weapon box covers ${covered} px of the coupled ${c.id} (${c.slot} car)`);
          }
          for (const z of zones) {
            const zr = [z.x, z.y, z.w, z.h];
            if (overlap(r, zr)) fail(`${tag}: weapon box ${r.map((q) => q.toFixed(1)).join(",")} enters keepClear "${z.what}"`);
            else if (!m.belly && z.y + z.h <= m.plateY + 0.5 && Math.min(r[0] + r[2], z.x + z.w) > Math.max(r[0], z.x) && r[1] - (z.y + z.h) < D.CLEAR_AIR - 0.01)
              fail(`${tag}: only ${(r[1] - z.y - z.h).toFixed(1)} units under keepClear "${z.what}" (need ${D.CLEAR_AIR})`);
          }
          if (ward.length) {
            let md = Infinity, outside = 0;
            for (const [x, y] of border(r)) { if (!inPoly(ward, x - v.dx, y - v.dy)) outside++; md = Math.min(md, polyDist(ward, x - v.dx, y - v.dy)); }
            row.ward = +md.toFixed(1);
            if (outside) fail(`${tag}: weapon box pokes outside the ward (${outside} border samples)`);
            else if (md < WARD_MIN) fail(`${tag}: ward margin ${md.toFixed(1)} < ${WARD_MIN} (intended ${W.WARD_MARGIN.player})`);
          } else fail(`${tag}: no ward envelope built`);
          const [sx0, sy0] = V.camToScreen(cam, r[0], r[1]), [sx1, sy1] = V.camToScreen(cam, r[0] + r[2], r[1] + r[3]);
          if (sx0 < cam.rx + 2 || sy0 < cam.ry + 2 || sx1 > cam.rx + cam.rw - 2 || sy1 > cam.ry + cam.rh - 2)
            fail(`${tag}: weapon leaves the camera region (${[sx0, sy0, sx1, sy1].map((q) => q.toFixed(0)).join(",")} vs ${cam.rx},${cam.ry},${cam.rx + cam.rw},${cam.ry + cam.rh})`);
          out.rows.push(row);
        }
        for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
          if (overlap(rects[i][1], rects[j][1])) fail(`${consist} · ${s}: weapons on mounts ${rects[i][0] + 1} and ${rects[j][0] + 1} overlap`);
          else if (overlap(hits[i][1], hits[j][1])) fail(`${consist} · ${s}: hover areas of mounts ${hits[i][0] + 1} and ${hits[j][0] + 1} overlap`);
        }
        // A's worst-case envelope on every roof mount (one pass per consist).
        if (s === list[0].s) {
          const e = env(ships[lead].weaponEnvelope ?? { up: 63, left: 65, right: 101 });
          for (const w of S.weapons) {
            const m = ms[w.slot];
            if (!m || m.belly) continue;
            let limit = -Infinity;
            for (let x = m.x - e.l; x <= m.x + e.r; x += 1) if (floor) limit = Math.max(limit, floor(x) + CARRIER_THICKNESS / 2 + D.CLEAR_AIR);
            for (const z of zones) if (z.x < m.x + e.r && z.x + z.w > m.x - e.l && z.y + z.h <= m.plateY + 0.5) limit = Math.max(limit, z.y + z.h + D.CLEAR_AIR);
            const room = m.plateY - limit - e.up;
            out.envelope.push({ consist, slot: w.slot + 1, car: hps[w.slot].car, room: +room.toFixed(1) });
            if (room < 0) fail(`${consist} · mount ${w.slot + 1} (${hps[w.slot].car} roof): A's weaponEnvelope needs ${(-room).toFixed(1)} more units under the carrier/keepClear even with no pylon`);
          }
        }
      }
    }
    return out;
  }, { quick, WARD_MIN });
  failures.push(...report.failures);

  // Summary per mount: pylon range, least carrier air, least ward margin over every sprite.
  const by = new Map();
  for (const r of report.rows) {
    const k = `${r.consist} · mount ${r.slot} (${r.car} ${r.side})`;
    const e = by.get(k) ?? { pylon: [Infinity, -Infinity], want: r.want, air: Infinity, airDrawn: Infinity, ward: Infinity, tall: "" };
    e.pylon = [Math.min(e.pylon[0], r.pylon), Math.max(e.pylon[1], r.pylon)];
    if (r.air !== null && r.air < e.air) { e.air = r.air; e.tall = r.sprite; }
    if (r.airDrawn !== undefined && r.airDrawn !== null) e.airDrawn = Math.min(e.airDrawn, r.airDrawn);
    if (r.ward !== null) e.ward = Math.min(e.ward, r.ward);
    by.set(k, e);
  }
  console.log("mount                                                     pylon (want)   carrier air (model/drawn)   ward margin");
  for (const [k, e] of by) console.log(`${k.padEnd(58)}${`${e.pylon[0]}–${e.pylon[1]} (${e.want})`.padEnd(15)}${(e.air === Infinity ? "—" : `${e.air}/${e.airDrawn} ${e.tall}`).padEnd(28)}${e.ward === Infinity ? "—" : e.ward}`);
  for (const e of report.envelope) console.log(`envelope ${e.consist} · mount ${e.slot} (${e.car} roof): ${e.room} units to spare at pylon 0`);

  // Hover: the live scene, fully armed; the pointer over each weapon and over its pylon names that weapon.
  for (const lead of ["lamplighter", "glasswing", "switchback"]) {
    const weapons = "flood-cannon,trunk-lance,multicast-array,heartpulse-chain";
    await page.goto(`${base}/?dev=combat&tender=${lead}&weapons=${weapons}`);
    await page.waitForFunction(() => window.__ttl && !window.__ttl.scenes.transitioning);
    await page.waitForTimeout(1500);
    const probes = await page.evaluate(async () => {
      const url = (p) => performance.getEntriesByType("resource").map((e) => e.name).find((u) => new URL(u).pathname === p) ?? p;
      const imp = (p) => import(url(p));
      const [{ Sim }, V, D, { makePlayerShip }] = await Promise.all([imp("/src/combat/sim/sim.ts"), imp("/src/combat/view.ts"), imp("/src/combat/draw-ship.ts"), imp("/src/data/ship.ts")]);
      const q = new URLSearchParams(location.search);
      const ship = makePlayerShip("", undefined, "amber", q.get("tender"));
      const ws = q.get("weapons").split(",");
      ship.weaponSlots = Math.max(ship.weaponSlots, ws.length); ship.weapons = ws; ship.weaponPower = ws.map(() => true);
      const sim = new Sim(ship, { salvage: 0, ttl: 0, payloads: 0, spares: 0 }, { enemy: "packet-leech", stage: 1, seed: 1, depth: 0 });
      const S = sim.ships[0], v = V.buildPlayerView(S);
      const content = D.contentRects(v, S);
      V.fitCamera(v, S, content.warded, content.bare);
      const ms = D.mountPositions(S, v, D.playerHardpoints(v));
      const app = window.__ttl, set = app.ui.setTooltip.bind(app.ui);
      window.qaTip = "";
      app.ui.setTooltip = (text, ...rest) => { window.qaTip = text; return set(text, ...rest); };
      return S.weapons.filter((w) => ms[w.slot]).map((w) => {
        const m = ms[w.slot], r = D.weaponBounds(w.def.sprite, m, 1);
        const body = V.camToScreen(v.cam, r[0] + r[2] * 0.4, r[1] + r[3] / 2);
        const pylon = m.pylon >= 2 ? V.camToScreen(v.cam, m.x, (m.y + m.plateY) / 2) : null;
        const above = V.camToScreen(v.cam, m.x, m.belly ? r[1] + r[3] + 6 : r[1] - 6);
        return { slot: w.slot + 1, name: w.def.name, body, pylon, above };
      });
    });
    const box = await page.locator("canvas#game").boundingBox();
    const at = async ([x, y]) => {
      await page.evaluate(() => (window.qaTip = ""));
      await page.mouse.move(box.x + (x * box.width) / 960, box.y + (y * box.height) / 540);
      await page.waitForTimeout(450);
      return page.evaluate(() => window.qaTip);
    };
    for (const p of probes) {
      const t1 = await at(p.body);
      const ok1 = t1.includes(p.name) && t1.includes(`mount ${p.slot}`);
      if (!ok1) failures.push(`hover ${lead} mount ${p.slot}: pointer on ${p.name} shows ${JSON.stringify(t1.slice(0, 60))}`);
      let ok2 = true;
      if (p.pylon) {
        const t2 = await at(p.pylon);
        ok2 = t2.includes(p.name);
        if (!ok2) failures.push(`hover ${lead} mount ${p.slot}: pointer on the pylon shows ${JSON.stringify(t2.slice(0, 60))}`);
      }
      const t3 = await at(p.above);
      const ok3 = !t3.includes(`mount ${p.slot}`);
      if (!ok3) failures.push(`hover ${lead} mount ${p.slot}: 6 units clear of ${p.name} still shows its tooltip`);
      console.log(`hover ${lead} mount ${p.slot} ${p.name}: weapon ${ok1 ? "ok" : "FAIL"} · pylon ${p.pylon ? (ok2 ? "ok" : "FAIL") : "—"} · clear air ${ok3 ? "ok" : "FAIL"}`);
    }
  }
} finally {
  await browser.close();
}
if (errors.length) failures.push(...errors.map((e) => `page error: ${e}`));
if (failures.length) {
  // One line per mount and problem, listing the weapon sprites that hit it (worst case quoted).
  const groups = new Map();
  for (const f of [...new Set(failures)]) {
    const m = /^(.+?) · ([a-z][a-z0-9-]*): (.+)$/.exec(f);
    const key = m ? `${m[1]}|${m[3].replace(/-?[\d.]+/g, "#")}` : f;
    const g = groups.get(key) ?? { head: m ? m[1] : f, text: m ? m[3] : "", sprites: [] };
    if (m) g.sprites.push(m[2]);
    groups.set(key, g);
  }
  console.log(`\nmount-qa: ${failures.length} failure(s) in ${groups.size} group(s)`);
  for (const g of groups.values()) console.log(`  ✗ ${g.head}${g.text ? `: ${g.text}` : ""}${g.sprites.length ? `  [${g.sprites.length === 1 ? g.sprites[0] : `${g.sprites.length} sprites: ${g.sprites.join(", ")}`}]` : ""}`);
  process.exit(1);
}
console.log("\nmount-qa: all mounts clear");
