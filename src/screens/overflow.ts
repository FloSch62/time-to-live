// Decisions after a reward: items with no room aboard (sell or swap), augments over the limit, crew when the berths
// are full, and cars offered for coupling (with the stat changes shown before confirming).
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { sfx } from "../core/audio";
import { P, C } from "../core/palette";
import type { RunState } from "../campaign/model";
import { pendingCrew, speciesName, type Applied, type Grant } from "../campaign/events";
import { itemName, sellPrice } from "../campaign/catalog";
import { crewCap, isAugment, isWeapon, removeCrew } from "../campaign/shipops";
import { carInfo, carSlot, coupleCar, isCarId, tenderStats, type AttachCarId } from "../campaign/refit";
import { HUD_BAND, TYPE, brassButton, divider, header, scrim, textAt, titlePlate } from "./kit";
import { equipmentArt, equipmentTooltip, itemStats } from "./items";
import { measure } from "../core/font";
import { combatApi, previewGrip } from "../campaign/combat-adapter";
import { statDeltas } from "./yard";
import { showCarRefit } from "./refit-animation";

export function createOverflowScene(app: App, run: RunState, applied: Applied, onDone: () => void): Scene {
  const queue: Grant[] = applied.grants.filter((g) => g.placed === "overflow" || g.placed === "offer");
  let i = 0;
  let note = "";
  const scene: Scene = {
    overlay: true,
    draw(g, a) {
      scrim(g, a, run);
      const gr = queue[i];
      if (!gr) {
        finish();
        return;
      }
      const w = 620;
      const h = 360;
      const x = 480 - w / 2;
      const y = Math.round(HUD_BAND + 8 + (514 - HUD_BAND - 8 - h) / 2);
      g.panel(x, y, w, h, "dialog");
      if (gr.kind === "car") drawCar(g, a, gr, x, y, w, h);
      else if (gr.kind === "crew") drawCrew(g, a, gr, x, y, w, h);
      else drawItem(g, a, gr, x, y, w, h);
      if (note) textAt(g, note, 480, y + h - 24, { font: TYPE.note, align: "center", color: P.ivory3 });
    },
  };

  function next(msg = "") {
    note = msg;
    i++;
    sfx.play("ui-click");
    if (i >= queue.length) finish();
  }
  function finish() {
    app.scenes.remove(scene);
    onDone();
  }

  function drawItem(g: Gfx, a: App, gr: Grant, x: number, y: number, w: number, h: number) {
    const aug = isAugment(gr.id);
    titlePlate(g, 480, y - 11, aug ? "AUGMENT SLOTS FULL" : "NO ROOM ABOARD", { w: 240 });
    equipmentArt(g, gr.id, x + 26, y + 26, 72, 40);
    textAt(g, itemName(gr.id), x + 110, y + 30, { font: TYPE.body, color: P.brass0 });
    textAt(g, itemStats(gr.id), x + 110 + Math.ceil(measure(itemName(gr.id), TYPE.body)) + 10, y + 32.5, { font: TYPE.note, color: P.teal1 });
    textAt(g, aug ? "Only three augments fit. Replace one, or sell the new one." : "Every mount and cargo space is taken. Swap it for something aboard, or sell it.", x + 110, y + 48, { font: TYPE.body, color: C.textDim, width: w - 140 });
    if (a.ui.hover(x + 20, y + 20, w - 40, 60)) a.ui.setTooltip(equipmentTooltip(gr.id, { ship: run.ship }), 300, { x: x + 20, y: y + 20, w: w - 40, h: 60 });
    divider(g, x + 30, y + 88, w - 60);
    const owned: string[] = aug
      ? [...run.ship.augments]
      : isWeapon(gr.id)
        ? [...run.ship.weapons.filter((v): v is NonNullable<typeof v> => !!v), ...run.ship.cargo.filter((c) => isWeapon(c))]
        : [...run.ship.drones.filter((v): v is NonNullable<typeof v> => !!v), ...run.ship.cargo];
    let cy = y + 100;
    header(g, "Swap for", x + 30, cy);
    cy += 14;
    owned.slice(0, 6).forEach((id, k) => {
      const bx = x + 30 + (k % 2) * 284;
      const by = cy + Math.floor(k / 2) * 34;
      if (brassButton(a, `ov-swap-${k}`, bx, by, 276, 28, `${itemName(id)} · sell ${sellPrice(id)}`, { variant: "normal", font: "body", tooltip: equipmentTooltip(id, { ship: run.ship }) })) {
        swapItem(gr.id, id);
        next(`${itemName(id)} sold for ${sellPrice(id)} salvage.`);
      }
    });
    if (brassButton(a, "ov-sell", 480 - 110, y + h - 56, 220, 30, `SELL IT · +${sellPrice(gr.id)}`, { hotkey: "Space" })) {
      run.inv.salvage += sellPrice(gr.id);
      run.stats.salvageEarned += sellPrice(gr.id);
      next(`${itemName(gr.id)} sold for ${sellPrice(gr.id)} salvage.`);
    }
  }

  function swapItem(newId: string, oldId: string) {
    const ship = run.ship;
    const price = sellPrice(oldId);
    run.inv.salvage += price;
    run.stats.salvageEarned += price;
    if (isAugment(newId)) {
      const k = ship.augments.indexOf(oldId as never);
      if (k >= 0) ship.augments[k] = newId as never;
      return;
    }
    const wi = ship.weapons.indexOf(oldId as never);
    if (wi >= 0 && isWeapon(newId)) {
      ship.weapons[wi] = newId as never;
      return;
    }
    const di = ship.drones.indexOf(oldId as never);
    if (di >= 0 && !isWeapon(newId)) {
      ship.drones[di] = newId as never;
      return;
    }
    const ci = ship.cargo.indexOf(oldId as never);
    if (ci >= 0) ship.cargo[ci] = newId as never;
  }

  function drawCrew(g: Gfx, a: App, gr: Grant, x: number, y: number, w: number, h: number) {
    const m = pendingCrew.get(gr.id);
    titlePlate(g, 480, y - 11, "BERTHS FULL", { w: 200 });
    if (!m) {
      next();
      return;
    }
    header(g, `${m.name} · ${speciesName(m.species)}`, 480, y + 30, { font: TYPE.strong, color: P.brass0, align: "center" });
    textAt(g, `Every berth aboard is taken (${crewCap(run.ship)}). Someone can stay behind at the next relay's bench, or ${m.name} does.`, 480, y + 48, { font: TYPE.body, color: C.textDim, width: w - 60, align: "center" });
    divider(g, x + 30, y + 92, w - 60);
    run.ship.crew.forEach((c, k) => {
      const bx = x + 30 + (k % 2) * 284;
      const by = y + 104 + Math.floor(k / 2) * 30;
      if (brassButton(a, `ov-dis-${k}`, bx, by, 276, 26, `${c.name} stays behind`, { variant: "normal", font: "body" })) {
        removeCrew(run.ship, c.id);
        run.ship.crew.push(m);
        run.stats.crewJoined++;
        pendingCrew.delete(m.id);
        next(`${c.name} stays behind. ${m.name} joins the crew.`);
      }
    });
    if (brassButton(a, "ov-leave", 480 - 110, y + h - 56, 220, 30, `${m.name.split(" ")[0].toUpperCase()} STAYS`, { hotkey: "Space", variant: "normal" })) {
      pendingCrew.delete(m.id);
      next();
    }
  }

  function drawCar(g: Gfx, a: App, gr: Grant, x: number, y: number, w: number, h: number) {
    if (!isCarId(gr.id)) {
      next();
      return;
    }
    const id = gr.id as AttachCarId;
    const info = carInfo(id);
    const slot = carSlot(id);
    const cur = run.ship.consist[slot];
    titlePlate(g, 480, y - 11, "A CAR TO COUPLE", { w: 220 });
    equipmentArt(g, id, x + 26, y + 26, 72, 44);
    textAt(g, info.name, x + 110, y + 28, { font: TYPE.body, color: P.brass0 });
    header(g, slot === "rear" ? "rear car" : "keel car", x + 110 + Math.ceil(measure(info.name, TYPE.body)) + 10, y + 30.5, { color: P.ivory3 });
    let dy = y + 46;
    dy += textAt(g, info.desc, x + 110, dy, { font: TYPE.body, color: C.text, width: w - 140 });
    if (cur) textAt(g, `{amber1}It replaces the ${carInfo(cur).name}.{/} Its modules go back to the stores.`, x + 110, dy + 2, { font: TYPE.body, width: w - 140 });
    divider(g, x + 30, y + 118, w - 60);
    // stat changes
    const before = tenderStats(run.ship);
    const probe = JSON.parse(JSON.stringify(run.ship));
    coupleCar(probe, id);
    const after = tenderStats(probe);
    const deltas = statDeltas(before, after);
    header(g, "If coupled", x + 30, y + 130);
    deltas.forEach((d, k) => {
      textAt(g, d, x + 30 + (k % 3) * 186, y + 146 + Math.floor(k / 3) * 18, { font: TYPE.body, color: C.text });
    });
    // the consist as it would hang, car included
    const pg = previewGrip(probe);
    const pvY = y + 146 + Math.ceil(deltas.length / 3) * 18 + 6;
    const pvH = y + h - 66 - pvY;
    if (pg && combatApi.drawShipPreview && pvH > 50) {
      const pvX = x + 30;
      const pvW = w - 60;
      const fit = Math.min(1, pvW / pg.w, pvH / pg.h);
      g.clip(pvX, pvY, pvW, pvH, () => {
        g.ctx.save();
        g.ctx.translate(Math.round(pvX + (pvW - pg.w * fit) / 2), Math.round(pvY + (pvH - pg.h * fit) / 2));
        g.ctx.scale(fit, fit);
        combatApi.drawShipPreview!(g, probe, 0, 0, { t: 0, crew: false, carrier: { region: run.stage, extend: 320 } });
        g.ctx.restore();
      });
    }
    if (brassButton(a, "ov-couple", 480 - 230, y + h - 56, 220, 30, cur ? "COUPLE · REPLACE" : "COUPLE IT", { hotkey: "Enter" })) {
      const out = coupleCar(run.ship, id);
      for (const it of out.items) {
        run.inv.salvage += sellPrice(it);
      }
      showCarRefit(app, run.ship, id, () => next(out.items.length
        ? `No room for ${out.items.map(itemName).join(", ")}: sold.` : `${info.name} coupled.`), run.stage);
    }
    if (brassButton(a, "ov-leavecar", 480 + 10, y + h - 56, 220, 30, "LEAVE IT", { hotkey: "Escape", variant: "normal" })) next();
  }

  return scene;
}
