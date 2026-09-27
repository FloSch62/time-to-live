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
import { brassButton, divider, titlePlate, tracked } from "./kit";
import { itemIcon32 } from "./items";
import { statDeltas } from "./yard";

export function createOverflowScene(app: App, run: RunState, applied: Applied, onDone: () => void): Scene {
  const queue: Grant[] = applied.grants.filter((g) => g.placed === "overflow" || g.placed === "offer");
  let i = 0;
  let note = "";
  const scene: Scene = {
    overlay: true,
    draw(g, a) {
      g.dim(0.55);
      const gr = queue[i];
      if (!gr) {
        finish();
        return;
      }
      const w = 600;
      const h = 330;
      const x = 480 - w / 2;
      const y = 270 - h / 2;
      g.panel(x, y, w, h, "dialog");
      if (gr.kind === "car") drawCar(g, a, gr, x, y, w, h);
      else if (gr.kind === "crew") drawCrew(g, a, gr, x, y, w, h);
      else drawItem(g, a, gr, x, y, w, h);
      if (note) g.text(`{ivory3}${note}{/}`, 480, y + h - 22, { font: "small", align: "center" });
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
    titlePlate(g, 480, y - 10, aug ? "AUGMENT SLOTS FULL" : "NO ROOM ABOARD", { w: 240 });
    itemIcon32(g, gr.id, x + 30, y + 30);
    tracked(g, itemName(gr.id).toUpperCase(), x + 74, y + 34, { font: "labelb", color: P.brass0 });
    g.text(aug ? "Only three augments fit. Replace one, or sell the new one." : "Every mount and cargo space is taken. Swap it for something aboard, or sell it.", x + 74, y + 48, { font: "body", color: C.textDim, width: w - 100 });
    divider(g, x + 30, y + 88, w - 60);
    const owned: string[] = aug
      ? [...run.ship.augments]
      : isWeapon(gr.id)
        ? [...run.ship.weapons.filter((v): v is NonNullable<typeof v> => !!v), ...run.ship.cargo.filter((c) => isWeapon(c))]
        : [...run.ship.drones.filter((v): v is NonNullable<typeof v> => !!v), ...run.ship.cargo];
    let cy = y + 100;
    tracked(g, "SWAP FOR", x + 30, cy, { font: "label", color: P.ivory3 });
    cy += 16;
    owned.slice(0, 6).forEach((id, k) => {
      const bx = x + 30 + (k % 2) * 272;
      const by = cy + Math.floor(k / 2) * 34;
      if (brassButton(a, `ov-swap-${k}`, bx, by, 264, 28, `${itemName(id)} · sell ${sellPrice(id)}`, { variant: "normal", font: "body" })) {
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
    titlePlate(g, 480, y - 10, "BERTHS FULL", { w: 200 });
    if (!m) {
      next();
      return;
    }
    tracked(g, `${m.name.toUpperCase()} · ${speciesName(m.species).toUpperCase()}`, 480, y + 30, { font: "labelb", color: P.brass0, align: "center" });
    g.text(`Every berth aboard is taken (${crewCap(run.ship)}). Someone can stay behind at the next relay's bench, or ${m.name} does.`, 480, y + 48, { font: "body", color: C.textDim, width: w - 60, align: "center" });
    divider(g, x + 30, y + 92, w - 60);
    run.ship.crew.forEach((c, k) => {
      const bx = x + 30 + (k % 2) * 272;
      const by = y + 104 + Math.floor(k / 2) * 30;
      if (brassButton(a, `ov-dis-${k}`, bx, by, 264, 26, `${c.name} stays behind`, { variant: "normal", font: "body" })) {
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
    titlePlate(g, 480, y - 10, "A CAR TO COUPLE", { w: 220 });
    itemIcon32(g, id, x + 30, y + 30);
    tracked(g, `${info.name.toUpperCase()} · ${slot === "rear" ? "REAR CAR" : "KEEL CAR"}`, x + 74, y + 32, { font: "labelb", color: P.brass0 });
    g.text(info.desc, x + 74, y + 46, { font: "body", color: C.text, width: w - 100 });
    if (cur) g.text(`{amber1}It replaces the ${carInfo(cur).name}.{/} Its modules go back to the stores.`, x + 74, y + 80, { font: "body", width: w - 100 });
    divider(g, x + 30, y + 110, w - 60);
    // stat changes
    const before = tenderStats(run.ship);
    const probe = JSON.parse(JSON.stringify(run.ship));
    coupleCar(probe, id);
    const after = tenderStats(probe);
    const deltas = statDeltas(before, after);
    tracked(g, "IF COUPLED", x + 30, y + 122, { font: "label", color: P.ivory3 });
    deltas.forEach((d, k) => {
      g.text(d, x + 30 + (k % 3) * 180, y + 138 + Math.floor(k / 3) * 18, { font: "body", color: C.text });
    });
    if (brassButton(a, "ov-couple", 480 - 230, y + h - 56, 220, 30, cur ? "COUPLE · REPLACE" : "COUPLE IT", { hotkey: "Enter" })) {
      const out = coupleCar(run.ship, id);
      for (const it of out.items) {
        run.inv.salvage += sellPrice(it);
      }
      sfx.play("door-close");
      next(out.items.length ? `No room for ${out.items.map(itemName).join(", ")}: sold.` : `${info.name} coupled.`);
    }
    if (brassButton(a, "ov-leavecar", 480 + 10, y + h - 56, 220, 30, "LEAVE IT", { hotkey: "Escape", variant: "normal" })) next();
  }

  return scene;
}
