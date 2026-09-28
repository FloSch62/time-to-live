// The Salvage Exchange (contract §3.5; Pell's stall in Stage I): Weapons / Drones / Systems / Crew / Augments /
// Cars & Refits / Supplies & Repair. Item cards with 32×32 art and tooltips, buy, sell at half price, repairs,
// supplies, an animated salvage counter. Music "exchange".
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { art } from "../core/assets";
import { music, sfx } from "../core/audio";
import { P, C, rgba } from "../core/palette";
import { SPECIES_FLAVOR } from "../content/flavor";
import type { SystemId, ModuleId, SpeciesId } from "../game/ids";
import { currentRelay, hasFlag, type RunState, type StoreItem } from "../campaign/model";
import { catalog, itemInfo, itemName, sellPrice } from "../campaign/catalog";
import {
  buyBlocker, buyItem, buySupply, repairCost, repairHullAt, sellCar, sellItem, sellModule, storeHere, supplyRoom, type Supply,
} from "../campaign/store";
import { carInfo, carSlot, coupleCar, freeSocket, moduleInfo, refit, tenderStats, type AttachCarId } from "../campaign/refit";
import { installSystem } from "../campaign/shipops";
import { WEAPONS } from "../data/weapons";
import { DRONES } from "../data/drones";
import { CARS } from "../data/cars";
import { combatApi, previewGrip } from "../campaign/combat-adapter";
import type { WeaponId, DroneId } from "../game/ids";
import { RUN_MODAL, TYPE, brassButton, divider, footer, header as panelHeader, hullBar, icon, resIcon, runModal, salvageChip, tabRow, textAt } from "./kit";
import { itemIcon32, equipmentArt, equipmentTooltip, itemStats } from "./items";
import { lineHeight, measure, wrap } from "../core/font";
import { statDeltas } from "./yard";
import { placeholderPortrait } from "./event";
import { showCarRefit } from "./refit-animation";

const TABS = ["WEAPONS", "DRONES", "SYSTEMS", "CREW", "AUGMENTS", "CARS & REFITS", "SUPPLIES"] as const;
const SELL_W = 244;
const KINDS: StoreItem["kind"][][] = [["weapon"], ["drone"], ["system"], ["crew"], ["augment"], ["car", "module"], []];

export function createStoreScene(app: App, run: RunState, onClose: () => void): Scene {
  const relay = currentRelay(run);
  const pell = run.stage === 1 && (hasFlag(run, "pell-stall") || hasFlag(run, "store:pell") || /pell/i.test(relay.eventId ?? ""));
  const stock = storeHere(run, pell);
  let tab = 0;
  let t = 0;
  let msg = "";
  let msgT = 0;
  let confirmCar: number | null = null;
  void music.play("exchange");
  sfx.play("ui-open", { volume: 0.7 });

  function say(s: string) {
    msg = s;
    msgT = 3;
  }

  const scene: Scene = {
    overlay: true,
    update(dt) {
      t += dt;
      msgT = Math.max(0, msgT - dt);
    },
    draw(g, a) {
      const title = stock.pell ? "Pell's Stall" : "The Salvage Exchange";
      const sub = stock.pell ? "Pell · salvage · fair prices · no lending" : `${relay.name} · salvage, stamps, repairs`;
      const box = runModal(g, a, run, title, sub, { subColor: stock.pell ? P.amber1 : P.ivory3 });
      salvageChip(g, "store-salvage", run.inv.salvage, box.right, box.headerY - 5);
      // tabs
      const next = tabRow(a, "st-tab", box.x, box.y - 4, box.w, 24, TABS.map((label, i) => ({
        label,
        count: i < 6 ? stock.items.filter((it) => KINDS[i].includes(it.kind) && !it.sold).length : undefined,
        key: `Digit${i + 1}`,
      })), tab);
      if (next !== tab) {
        tab = next;
        confirmCar = null;
        a.ui.resetScroll("st-list");
      }
      const cy = box.y + 28;
      const ch = box.bottom - 36 - cy;
      const cw = box.w - SELL_W - 12;
      if (tab < 6) cardsTab(g, a, box.x, cy, cw, ch);
      else suppliesTab(g, a, box.x, cy, cw, ch);
      sellPanel(g, a, box.right - SELL_W, cy, SELL_W, ch);
      // bottom row: the last message and LEAVE
      const fy = box.bottom - 28;
      if (msgT > 0) textAt(g, msg, box.x, fy + 9, { font: TYPE.body, color: P.ivory1, alpha: Math.min(1, msgT), width: box.w - 180 });
      if (brassButton(a, "st-close", box.right - 150, fy, 150, 28, "LEAVE", { hotkey: "Escape", hotkeys: ["KeyS"] })) {
        sfx.play("ui-back");
        app.scenes.remove(scene);
        onClose();
      }
      footer(g, a, [["1–7", "tabs"]], [["ESC", "leave"]]);
    },
  };

  function cardsTab(g: Gfx, a: App, x: number, y: number, w: number, h: number) {
    const idx = stock.items.map((it, i) => ({ it, i })).filter(({ it }) => KINDS[tab].includes(it.kind));
    let listH = h;
    if (tab === 2) {
      const note = "Upgrade systems aboard on the Tender screen (U). Drones and the Veil need a native bay, an equipped car, or a module in a free socket. Reactor power is separate.";
      const nh = wrap(note, w, TYPE.note).length * lineHeight(TYPE.note);
      textAt(g, note, x, y + h - nh + 2, { font: TYPE.note, color: P.ivory3, width: w });
      listH = h - nh - 8;
    }
    if (!idx.length) {
      textAt(g, tab === 5 ? "No cars or modules in stock here." : "Nothing of that kind today.", x + w / 2, y + 60, { font: TYPE.body, color: P.ivory4, align: "center" });
      return;
    }
    if (confirmCar !== null) {
      carConfirm(g, a, x, y, w, h, stock.items[confirmCar], confirmCar);
      return;
    }
    const rows = idx.map(({ it, i }) => ({ it, i, h: rowHeight(it, w) }));
    const total = rows.reduce((s2, r) => s2 + r.h + 6, -6);
    a.ui.scrollArea("st-list", x, y, w, listH, total, (off) => {
      let ry = y - off;
      for (const r of rows) {
        if (ry + r.h >= y && ry <= y + listH) row(g, a, r.it, r.i, x, ry, w - (total > listH ? 10 : 0), r.h, y, listH);
        ry += r.h + 6;
      }
    });
  }

  function cardTitle(it: StoreItem): string {
    if (it.kind === "crew") return it.name ?? "Crew";
    if (it.kind === "system") return catalog.systems[it.id as SystemId]?.name ?? it.id;
    if (it.kind === "car") return carInfo(it.id as AttachCarId).name;
    if (it.kind === "module") return moduleInfo(it.id as ModuleId).name;
    return itemName(it.id);
  }
  function cardDesc(it: StoreItem): string {
    if (it.kind === "crew") return `${SPECIES_FLAVOR?.[it.id as SpeciesId]?.name ?? it.id}. ${catalog.species[it.id as SpeciesId]?.special ?? SPECIES_FLAVOR?.[it.id as SpeciesId]?.desc ?? ""}`;
    if (it.kind === "system") return catalog.systems[it.id as SystemId]?.desc ?? "";
    if (it.kind === "car") return carInfo(it.id as AttachCarId).desc;
    if (it.kind === "module") return moduleInfo(it.id as ModuleId).desc;
    return itemInfo(it.id)?.desc ?? "";
  }
  /** The kind tag after the name. */
  function cardTag(it: StoreItem): string {
    if (it.kind === "crew") return "crew";
    if (it.kind === "system") return "system";
    if (it.kind === "car") return `${carInfo(it.id as AttachCarId).slot} car`;
    if (it.kind === "module") return "module";
    if (it.kind === "augment") return "augment";
    if (it.kind === "drone") return "drone";
    return WEAPONS[it.id as WeaponId]?.type ?? "weapon";
  }
  /** The numbers line (teal). */
  function cardSub(it: StoreItem): string {
    if (it.kind === "crew") return `${catalog.species[it.id as SpeciesId]?.hp ?? 100} HP`;
    if (it.kind === "system") return "installs at level " + (catalog.systems[it.id as SystemId]?.buyLevel ?? 1);
    if (it.kind === "car") return `${carInfo(it.id as AttachCarId).slot} coupling · –${CARS[it.id as AttachCarId].evasionCost ?? 2}% evasion`;
    if (it.kind === "module") return "fits a socket";
    if (it.kind === "augment") return "no power needed";
    return itemStats(it.id);
  }

  /** FTL-level tooltip: full stats, what it does, what it changes aboard, the lore line. */
  function cardTooltip(it: StoreItem): string {
    if (it.kind === "weapon" || it.kind === "drone" || it.kind === "augment") {
      const block = buyBlocker(run, it);
      return equipmentTooltip(it.id, { price: it.price, ship: run.ship }) + (block && !it.sold ? `\n{ember1}${block}{/}` : "");
    }
    const lines: string[] = [`{brass1}${cardTitle(it)}{/}  {ivory4}${it.price} salvage{/}`];
    if (it.kind === "crew") {
      const sp = catalog.species[it.id as SpeciesId];
      lines.push(`{teal1}${SPECIES_FLAVOR?.[it.id as SpeciesId]?.name ?? it.id}{/} · ${sp?.hp ?? 100} HP`);
      if (sp?.special) lines.push(sp.special);
    } else if (it.kind === "car" || it.kind === "module" || it.kind === "system") {
      const probe = JSON.parse(JSON.stringify(run.ship));
      if (it.kind === "car") coupleCar(probe, it.id as AttachCarId);
      else if (it.kind === "module") {
        probe.moduleStore.push(it.id);
        const sock = freeSocket(probe);
        if (sock) refit(probe, sock, it.id as ModuleId);
      } else installSystem(probe, it.id as SystemId);
      lines.push(...statDeltas(tenderStats(run.ship), tenderStats(probe)));
      if (it.kind === "module" && !freeSocket(run.ship)) lines.push("{amber1}No free socket: it goes to the stores{/}");
    }
    if (it.kind !== "crew") lines.push(cardDesc(it));
    const lore = it.kind === "car" ? carInfo(it.id as AttachCarId).lore : it.kind === "module" ? moduleInfo(it.id as ModuleId).lore : itemInfo(it.id)?.lore;
    if (lore) lines.push(`{ivory4}${lore}{/}`);
    const block = buyBlocker(run, it);
    if (block && !it.sold) lines.push(`{ember1}${block}{/}`);
    return lines.join("\n");
  }

  const ART_W = 100;
  const BUY_W = 124;
  function textWidth(w: number) {
    return w - ART_W - 24 - BUY_W - 20;
  }
  function rowHeight(it: StoreItem, w: number): number {
    const tw = textWidth(w);
    const desc = wrap(cardDesc(it), tw, TYPE.note).length;
    return Math.max(68, 41 + desc * lineHeight(TYPE.note) + 5);
  }

  /** One stock row: picture, name and kind, the numbers, the description (never cut), and BUY. */
  function row(g: Gfx, a: App, it: StoreItem, i: number, x: number, y: number, w: number, h: number, clipY: number, clipH: number) {
    const block = buyBlocker(run, it);
    const inView = a.input.y >= clipY && a.input.y < clipY + clipH;
    const over = inView && a.ui.hover(x, y, w, h);
    g.panel(x, y, w, h, it.sold ? "panel-dark" : over ? "panel-hi" : "panel");
    const bx = x + w - BUY_W - 10;
    g.alpha(it.sold ? 0.45 : 1, () => {
      // picture
      const px = x + 10;
      const py = y + Math.round((h - 48) / 2);
      g.rect(px, py, ART_W, 48, P.ink1);
      if (it.kind === "crew") {
        if (!g.sprite("crew", `${it.id}-portrait`, px + ART_W / 2 - 16, py + 8, { noAnchor: true }) && !icon(g, `species-${it.id}`, px + ART_W / 2 - 8, py + 16)) g.rect(px + 42, py + 16, 16, 16, P.ink3);
      } else if (it.kind === "system") {
        if (!icon(g, `sys-${it.id}-powered`, px + ART_W / 2 - 8, py + 16)) g.rect(px + 42, py + 16, 16, 16, P.teal3);
      } else if (it.kind === "weapon" || it.kind === "drone" || it.kind === "car") equipmentArt(g, it.id, px + 2, py + 2, ART_W - 4, 44);
      else itemIcon32(g, it.id, px + ART_W / 2 - 16, py + 8);
      // text
      const tx = x + ART_W + 24;
      const tw = textWidth(w);
      const name = cardTitle(it);
      textAt(g, name, tx, y + 10, { font: TYPE.body, color: P.ivory0, shadow: P.ink0 });
      textAt(g, cardTag(it).toUpperCase(), tx + Math.ceil(measure(name, TYPE.body)) + 10, y + 12.5, { font: TYPE.label, color: P.ivory4 });
      textAt(g, cardSub(it), tx, y + 27, { font: TYPE.note, color: P.teal1, width: tw });
      textAt(g, cardDesc(it), tx, y + 41, { font: TYPE.note, color: P.ivory2, width: tw });
    });
    if (over && !a.ui.hover(bx, y, BUY_W, h)) a.ui.setTooltip(cardTooltip(it), 320, { x, y, w, h, side: "right" });
    const label = it.sold ? "SOLD" : `BUY · ${it.price}`;
    const by = y + Math.round((h - 26) / 2) - (block && !it.sold ? 6 : 0);
    if (block && !it.sold) textAt(g, block, bx + BUY_W / 2, by + 32, { font: TYPE.note, color: P.ember1, align: "center", width: BUY_W + 8 });
    const shown = by >= clipY - 1 && by + 26 <= clipY + clipH + 1;
    if (brassButton(a, `buy-${i}`, bx, by, BUY_W, 26, label, { disabled: !!block || !shown, variant: block ? "normal" : "brass", tooltip: block && !it.sold ? block : undefined, sound: null })) {
      if (it.kind === "car") {
        confirmCar = i;
        return;
      }
      const r = buyItem(run, stock, i);
      if (r.ok) {
        sfx.play("buy");
        say(`${cardTitle(it)}: yours.`);
      } else {
        sfx.play("power-denied");
        say(r.reason ?? "");
      }
    }
  }

  function carConfirm(g: Gfx, a: App, x: number, y: number, w: number, h: number, it: StoreItem, i: number) {
    const id = it.id as AttachCarId;
    const cur = run.ship.consist[carSlot(id)];
    g.panel(x, y, w, h, "panel-hi");
    g.rect(x + 12, y + 10, 60, 38, P.ink1);
    equipmentArt(g, id, x + 14, y + 11, 56, 36);
    panelHeader(g, `Couple the ${carInfo(id).name}?`, x + 84, y + 16, { font: TYPE.strong, color: P.brass0 });
    textAt(g, `${carSlot(id) === "rear" ? "Rear" : "Keel"} car · ${it.price} salvage`, x + 84, y + 32, { font: TYPE.note, color: P.ivory3 });
    let ty = y + 56;
    ty += textAt(g, carInfo(id).desc, x + 16, ty, { font: TYPE.body, width: w - 32, color: C.text }) + 6;
    ty += textAt(g, cur ? `Replaces the ${carInfo(cur).name}; the old car stays here. Its modules return to the stores.` : `Couples to your ${carSlot(id)} socket. Crew reach it through a ${carSlot(id) === "rear" ? "gangway" : "belly hatch"}.`, x + 16, ty, { font: TYPE.body, width: w - 32, color: P.amber1 }) + 10;
    const probe = JSON.parse(JSON.stringify(run.ship));
    coupleCar(probe, id);
    panelHeader(g, "If coupled", x + 16, ty);
    const deltas = statDeltas(tenderStats(run.ship), tenderStats(probe));
    deltas.forEach((d, k) => textAt(g, d, x + 16, ty + 16 + k * 17, { font: TYPE.body }));
    const pg = previewGrip(probe);
    const pvX = x + 230;
    const pvY = ty - 4;
    const pvW = w - 246;
    const pvH = y + h - 48 - pvY;
    if (pg && combatApi.drawShipPreview && pvH > 60) {
      const fit = Math.min(pvW / pg.w, pvH / pg.h);
      g.clip(pvX, pvY, pvW, pvH, () => {
        g.ctx.save();
        g.ctx.translate(pvX + (pvW - pg.w * fit) / 2, pvY + (pvH - pg.h * fit) / 2);
        g.ctx.scale(fit, fit);
        combatApi.drawShipPreview!(g, probe, 0, 0, { t, crew: false, carrier: { region: run.stage, extend: 320 } });
        g.ctx.restore();
      });
    }
    if (brassButton(a, "car-yes", x + 16, y + h - 40, 190, 28, `COUPLE · ${it.price}`, { hotkey: "Enter" })) {
      const r = buyItem(run, stock, i);
      if (r.ok) {
        sfx.play("buy");
        showCarRefit(app, run.ship, id, undefined, run.stage);
      }
      say(r.ok ? `${carInfo(id).name} coupled.` : r.reason ?? "");
      confirmCar = null;
    }
    if (brassButton(a, "car-no", x + 216, y + h - 40, 130, 28, "NOT NOW", { variant: "normal", hotkey: "Backspace" })) confirmCar = null;
  }

  function supplyRow(g: Gfx, a: App, kind: Supply, label: string, x: number, y: number, w: number) {
    g.panel(x, y, w, 50, "panel");
    resIcon(g, kind, x + 12, y + 17);
    textAt(g, label, x + 38, y + 11, { font: TYPE.body, color: P.ivory0 });
    textAt(g, `you have ${run.inv[kind]} · ${stock[kind]} in stock · ${stock.prices[kind]} salvage each`, x + 38, y + 29, { font: TYPE.note, color: P.ivory3 });
    for (const n of [1, 3]) {
      const price = stock.prices[kind] * n;
      const dis = stock[kind] < n || run.inv.salvage < price;
      if (brassButton(a, `sup-${kind}-${n}`, x + w - (n === 1 ? 220 : 110), y + 12, 100, 26, `+${n} · ${price}`, { disabled: dis, variant: "normal", sound: null })) {
        const r = buySupply(run, stock, kind, n);
        if (r.ok) sfx.play("buy");
      }
    }
  }

  function suppliesTab(g: Gfx, a: App, x: number, y: number, w: number, h: number) {
    supplyRow(g, a, "ttl", "Re-stamp the connection (TTL)", x, y, w);
    supplyRow(g, a, "payloads", "Payloads", x, y + 58, w);
    supplyRow(g, a, "spares", "Automaton spares", x, y + 116, w);
    const ry = y + 182;
    g.panel(x, ry, w, 100, "panel");
    panelHeader(g, "Hull repair", x + 14, ry + 12, { color: P.ivory2 });
    textAt(g, `${stock.prices.hull} salvage per point`, x + 120, ry + 12, { font: TYPE.note, color: P.ivory3 });
    const segW = Math.max(3, Math.min(6, Math.floor((w - 90) / run.ship.hullMax) - 1));
    hullBar(g, x + 16, ry + 34, run.ship.hull, run.ship.hullMax, segW, 12);
    textAt(g, `${run.ship.hull}/${run.ship.hullMax}`, x + w - 14, ry + 35, { font: TYPE.body, align: "right", color: C.text });
    const missing = run.ship.hullMax - run.ship.hull;
    const all = repairCost(run, stock, "all");
    if (brassButton(a, "rep-1", x + 14, ry + 60, 160, 28, `REPAIR 1 · ${stock.prices.hull}`, { disabled: missing <= 0 || run.inv.salvage < stock.prices.hull, variant: "normal", sound: null })) {
      if (repairHullAt(run, stock, 1).ok) sfx.play("repair-done", { volume: 0.6 });
    }
    if (brassButton(a, "rep-all", x + 184, ry + 60, 200, 28, missing <= 0 ? "HULL IS WHOLE" : `REPAIR ALL · ${all}`, { disabled: missing <= 0 || all <= 0, sound: null })) {
      if (repairHullAt(run, stock, "all").ok) sfx.play("repair-done");
    }
    void h;
  }

  function sellPanel(g: Gfx, a: App, x: number, y: number, w: number, h: number) {
    g.panel(x, y, w, h, "panel-dark");
    panelHeader(g, tab === 5 ? "Your cars & stores" : "Sell · half price", x + 12, y + 11);
    const pellH = stock.pell ? 112 : 0;
    let ry = y + 28;
    const row = (key: string, label: string, sub: string, value: number, onSell: () => void, tip?: string, thumb?: string) => {
      if (ry + 30 > y + h - 8 - pellH) return;
      const over = a.ui.hover(x + 6, ry, w - 12, 30);
      if (over) g.rect(x + 6, ry, w - 12, 30, rgba(P.brass3, 0.15));
      let tx = x + 12;
      if (thumb && icon(g, thumb, x + 10, ry + 7)) tx = x + 32;
      textAt(g, label, tx, ry + 4, { font: TYPE.body, color: C.text });
      if (sub) textAt(g, sub, tx, ry + 18, { font: TYPE.note, color: P.ivory4 });
      if (over && tip && !a.ui.hover(x + w - 74, ry, 70, 30)) a.ui.setTooltip(tip, 300, { x: x + 6, y: ry, w: w - 12, h: 30, side: "left" });
      if (brassButton(a, `sell-${key}`, x + w - 72, ry + 4, 62, 22, `+${value}`, { variant: "normal", sound: null })) {
        onSell();
        sfx.play("sell");
      }
      ry += 32;
    };
    if (tab === 5) {
      for (const slot of ["rear", "keel"] as const) {
        const id = run.ship.consist?.[slot];
        if (id) row(`car-${slot}`, carInfo(id).name, `${slot} car`, Math.floor(carInfo(id).price / 2), () => say(sellCar(run, slot).ok ? `${carInfo(id).name} sold.` : ""), carInfo(id).desc);
      }
      run.ship.moduleStore.forEach((m, k) => row(`mod-${k}`, moduleInfo(m).name, "in the stores", Math.floor(moduleInfo(m).price / 2), () => sellModule(run, m), moduleInfo(m).desc));
      if (!run.ship.consist?.rear && !run.ship.consist?.keel && !run.ship.moduleStore.length) textAt(g, "No cars coupled, nothing in the stores. Installed modules are refitted on the Tender screen, Yard tab.", x + 12, ry + 4, { font: TYPE.note, color: P.ivory3, width: w - 24 });
      return;
    }
    const items: { id: string; where: string }[] = [
      ...run.ship.weapons.filter((v): v is NonNullable<typeof v> => !!v).map((id) => ({ id, where: "mounted" })),
      ...run.ship.drones.filter((v): v is NonNullable<typeof v> => !!v).map((id) => ({ id, where: "mounted" })),
      ...run.ship.cargo.map((id) => ({ id, where: "in cargo" })),
      ...run.ship.augments.map((id) => ({ id, where: "augment" })),
    ];
    items.forEach((it, k) => {
      row(`it-${k}`, itemName(it.id), it.where, sellPrice(it.id), () => {
        const r = sellItem(run, it.id);
        say(r.ok ? `${itemName(it.id)} sold.` : r.reason ?? "");
      }, equipmentTooltip(it.id, { ship: run.ship }), it.where === "augment" ? `aug-${it.id}` : undefined);
    });
    if (!items.length) textAt(g, "Nothing aboard to sell.", x + 12, ry + 4, { font: TYPE.note, color: P.ivory4 });
    if (stock.pell) {
      const img = art("portraits/pell");
      const py = y + h - 104;
      g.rect(x + 12, py, 92, 92, P.ink1);
      if (img) g.ctx.drawImage(img, x + 12, py, 92, 92);
      else placeholderPortrait(g, x + 12, py, t);
      g.box(x + 11, py - 1, 94, 94, P.brass3);
      panelHeader(g, "Pell", x + 114, py + 8, { font: TYPE.strong, color: P.brass1 });
      textAt(g, "Copper Market", x + 114, py + 24, { font: TYPE.note, color: P.ivory3 });
    }
  }

  void RUN_MODAL;
  void divider;
  return scene;
}
