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
import type { WeaponId, DroneId } from "../game/ids";
import { brassButton, counted, divider, hullBar, icon, resIcon, titlePlate, tracked } from "./kit";
import { itemIcon32, equipmentArt } from "./items";
import { statDeltas } from "./yard";
import { placeholderPortrait } from "./event";

const TABS = ["WEAPONS", "DRONES", "SYSTEMS", "CREW", "AUGMENTS", "CARS & REFITS", "SUPPLIES"] as const;
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
      g.dim(0.62);
      const X = 20;
      const Y = 30;
      const W = 920;
      const H = 490;
      g.panel(X, Y, W, H, "dialog");
      const title = stock.pell ? "PELL'S STALL" : "THE SALVAGE EXCHANGE";
      titlePlate(g, 480, Y - 11, title, { w: 340 });
      if (stock.pell) {
        tracked(g, "PELL · SALVAGE · FAIR PRICES · NO LENDING", X + 24, Y + 16, { font: "small", color: P.amber1, track: 1 });
      } else tracked(g, `${relay.name.toUpperCase()} · SALVAGE, STAMPS, REPAIRS`, X + 24, Y + 16, { font: "small", color: P.ivory3, track: 1 });
      // salvage counter
      const sv = counted("store-salvage", run.inv.salvage);
      g.panel(X + W - 150, Y + 10, 126, 26, "panel-dark");
      resIcon(g, "salvage", X + W - 144, Y + 15);
      g.text(String(sv), X + W - 32, Y + 14, { font: "head", color: P.brass1, align: "right" });
      // tabs
      TABS.forEach((label, i) => {
        const tw = 118;
        const tx = X + 24 + i * (tw + 4);
        const count = i < 6 ? stock.items.filter((it) => KINDS[i].includes(it.kind) && !it.sold).length : -1;
        if (brassButton(a, `st-tab-${i}`, tx, Y + 40, tw, 24, count >= 0 ? `${label} ${count}` : label, { variant: i === tab ? "brass" : "normal", font: "label", hotkey: `Digit${i + 1}`, sound: "ui-click" })) {
          tab = i;
          confirmCar = null;
        }
      });
      const cx = X + 24;
      const cy = Y + 76;
      const cw = W - 48 - 250;
      const ch = H - 130;
      if (tab < 6) cardsTab(g, a, cx, cy, cw, ch);
      else suppliesTab(g, a, cx, cy, cw, ch);
      sellPanel(g, a, X + W - 24 - 238, cy, 238, ch);
      // footer
      const fy = Y + H - 44;
      divider(g, X + 24, fy - 8, W - 48);
      if (msgT > 0) g.text(msg, X + 24, fy + 6, { font: "body", color: P.ivory1, alpha: Math.min(1, msgT) });
      if (brassButton(a, "st-close", X + W - 24 - 150, fy, 150, 28, "LEAVE", { hotkey: "Escape", hotkeys: ["KeyS"] })) {
        sfx.play("ui-back");
        app.scenes.remove(scene);
        onClose();
      }
    },
  };

  function cardsTab(g: Gfx, a: App, x: number, y: number, w: number, h: number) {
    const idx = stock.items.map((it, i) => ({ it, i })).filter(({ it }) => KINDS[tab].includes(it.kind));
    if (tab === 2) {
      g.text("{ivory3}System upgrades are done on the Ship screen (U). A Drone Bay or a Veil needs a room: a car that carries one, or its module in a free socket.{/}", x, y + h - 36, { font: "body", width: w });
    }
    if (!idx.length) {
      g.text(tab === 5 ? "{ivory4}No cars or modules in stock here.{/}" : "{ivory4}Nothing of that kind today.{/}", x + w / 2, y + 60, { font: "body", align: "center" });
      return;
    }
    if (confirmCar !== null) {
      carConfirm(g, a, x, y, w, stock.items[confirmCar], confirmCar);
      return;
    }
    const cols = 3;
    const cw = Math.floor((w - (cols - 1) * 10) / cols);
    const chh = 150;
    idx.forEach(({ it, i }, k) => {
      const col = k % cols;
      const row = Math.floor(k / cols);
      card(g, a, it, i, x + col * (cw + 10), y + row * (chh + 10), cw, chh);
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
  function cardSub(it: StoreItem): string {
    if (it.kind === "crew") return `${catalog.species[it.id as SpeciesId]?.hp ?? 100} HP`;
    if (it.kind === "system") return "installs at level " + (catalog.systems[it.id as SystemId]?.buyLevel ?? 1);
    if (it.kind === "car") return carInfo(it.id as AttachCarId).slot === "rear" ? "rear car · –2% evasion" : "keel car · –2% evasion";
    if (it.kind === "module") return "module · fits a socket";
    return itemInfo(it.id)?.stats ?? "";
  }

  /** FTL-level tooltip: full stats, what it does, what it changes aboard, the lore line. */
  function cardTooltip(it: StoreItem): string {
    const lines: string[] = [`{brass1}${cardTitle(it)}{/}  {ivory4}${it.price} salvage${it.kind === "weapon" || it.kind === "drone" || it.kind === "augment" ? ` · sells for ${sellPrice(it.id)}` : ""}{/}`];
    if (it.kind === "weapon") {
      const w = catalog.weapons[it.id as WeaponId];
      const d = WEAPONS[it.id as WeaponId];
      if (d) {
        lines.push(`{teal1}${d.type.toUpperCase()}{/} · ${d.type === "ion" ? `ion ${d.ion ?? d.damage}` : `${d.damage} damage`}${d.shots > 1 ? ` × ${d.shots}` : ""} · ${d.power} power · ${d.charge} s charge`);
        const extra: string[] = [];
        if (d.fireChance) extra.push(`fire ${Math.round(d.fireChance * 100)}%`);
        if (d.breachChance) extra.push(`breach ${Math.round(d.breachChance * 100)}%`);
        if (d.ammo) extra.push(`${d.ammo} payload per volley`);
        if (d.beamLength) extra.push(`beam ${d.beamLength} tiles`);
        if (d.crewDamage) extra.push(`${d.crewDamage} crew damage`);
        if (extra.length) lines.push(`{ivory3}${extra.join(" · ")}{/}`);
      } else if (w?.stats) lines.push(w.stats);
    } else if (it.kind === "drone") {
      const d = DRONES[it.id as DroneId];
      if (d) lines.push(`{teal1}${d.kind.toUpperCase()}{/} · ${d.power} power · 1 spare per launch${d.damage ? ` · ${d.damage} per hit` : ""}`);
      if (!run.ship.systems.drones || !run.ship.systemRooms.drones) lines.push("{amber1}Needs a Drone Bay to launch{/}");
    } else if (it.kind === "crew") {
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
    lines.push(cardDesc(it));
    const lore = it.kind === "car" ? carInfo(it.id as AttachCarId).lore : it.kind === "module" ? moduleInfo(it.id as ModuleId).lore : itemInfo(it.id)?.lore;
    if (lore) lines.push(`{ivory4}${lore}{/}`);
    const block = buyBlocker(run, it);
    if (block && !it.sold) lines.push(`{ember1}${block}{/}`);
    return lines.join("\n");
  }

  function card(g: Gfx, a: App, it: StoreItem, i: number, x: number, y: number, w: number, h: number) {
    const block = buyBlocker(run, it);
    const over = a.ui.hover(x, y, w, h);
    g.panel(x, y, w, h, it.sold ? "panel-dark" : over ? "panel-hi" : "panel");
    g.alpha(it.sold ? 0.4 : 1, () => {
      if (it.kind === "crew") {
        g.rect(x + 8, y + 8, 32, 32, P.ink1);
        if (!icon(g, `species-${it.id}`, x + 16, y + 16)) g.rect(x + 16, y + 16, 16, 16, P.ink3);
      } else if (it.kind === "system") {
        g.rect(x + 8, y + 8, 32, 32, P.ink1);
        if (!icon(g, `sys-${it.id}-powered`, x + 16, y + 16)) g.rect(x + 16, y + 16, 16, 16, P.teal3);
      } else equipmentArt(g, it.id, x + 6, y + 6, 76, 38);
      g.text(cardTitle(it), x + (it.kind === "crew" || it.kind === "system" ? 48 : 88), y + 7, { font: "body", color: P.ivory0, width: w - (it.kind === "crew" || it.kind === "system" ? 54 : 94), maxLines: 1 });
      g.text(`{ivory4}${cardSub(it)}{/}`, x + (it.kind === "crew" || it.kind === "system" ? 48 : 88), y + 24, { font: "small", width: w - (it.kind === "crew" || it.kind === "system" ? 54 : 94), maxLines: 1 });
      g.text(cardDesc(it), x + 8, y + 46, { font: "body", color: C.textDim, width: w - 16, maxLines: 3 });
    });
    if (over) a.ui.setTooltip(cardTooltip(it), 300);
    const label = it.sold ? "SOLD" : `BUY · ${it.price}`;
    if (brassButton(a, `buy-${i}`, x + 8, y + h - 32, w - 16, 24, label, { disabled: !!block, variant: block ? "normal" : "brass", font: "label", tooltip: block && !it.sold ? block : undefined, sound: null })) {
      if (it.kind === "car" && run.ship.consist?.[carSlot(it.id as AttachCarId)]) {
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

  function carConfirm(g: Gfx, a: App, x: number, y: number, w: number, it: StoreItem, i: number) {
    const id = it.id as AttachCarId;
    const cur = run.ship.consist[carSlot(id)]!;
    g.panel(x, y, w, 200, "panel-hi");
    itemIcon32(g, id, x + 12, y + 12);
    tracked(g, `COUPLE THE ${carInfo(id).name.toUpperCase()}?`, x + 56, y + 16, { font: "labelb", color: P.brass0 });
    g.text(`It replaces the {amber1}${carInfo(cur).name}{/}, which stays at this relay. Modules in it go back to the stores.`, x + 56, y + 32, { font: "body", width: w - 70, color: C.text });
    const probe = JSON.parse(JSON.stringify(run.ship));
    coupleCar(probe, id);
    statDeltas(tenderStats(run.ship), tenderStats(probe)).forEach((d, k) => g.text(d, x + 16 + (k % 3) * 170, y + 80 + Math.floor(k / 3) * 18, { font: "body" }));
    if (brassButton(a, "car-yes", x + 16, y + 160, 180, 28, `COUPLE · ${it.price}`, { hotkey: "Enter" })) {
      const r = buyItem(run, stock, i);
      if (r.ok) sfx.play("buy");
      say(r.ok ? `${carInfo(id).name} coupled.` : r.reason ?? "");
      confirmCar = null;
    }
    if (brassButton(a, "car-no", x + 206, y + 160, 120, 28, "NOT NOW", { variant: "normal" })) confirmCar = null;
  }

  function supplyRow(g: Gfx, a: App, kind: Supply, label: string, x: number, y: number, w: number) {
    g.panel(x, y, w, 44, "panel");
    resIcon(g, kind, x + 10, y + 14);
    g.text(label, x + 34, y + 6, { font: "body", color: P.ivory0 });
    g.text(`{ivory4}you have ${run.inv[kind]} · ${stock[kind]} in stock · ${stock.prices[kind]} each{/}`, x + 34, y + 23, { font: "small" });
    for (const n of [1, 3]) {
      const price = stock.prices[kind] * n;
      const dis = stock[kind] < n || run.inv.salvage < price;
      if (brassButton(a, `sup-${kind}-${n}`, x + w - (n === 1 ? 210 : 104), y + 9, 98, 26, `+${n} · ${price}`, { disabled: dis, variant: "normal", font: "label", sound: null })) {
        const r = buySupply(run, stock, kind, n);
        if (r.ok) sfx.play("buy");
      }
    }
  }

  function suppliesTab(g: Gfx, a: App, x: number, y: number, w: number, h: number) {
    supplyRow(g, a, "ttl", "Re-stamp the connection (TTL)", x, y, w);
    supplyRow(g, a, "payloads", "Payloads", x, y + 52, w);
    supplyRow(g, a, "spares", "Automaton spares", x, y + 104, w);
    const ry = y + 168;
    g.panel(x, ry, w, 96, "panel");
    tracked(g, "HULL REPAIR", x + 12, ry + 10, { font: "labelb", color: P.ivory2 });
    g.text(`{ivory4}${stock.prices.hull} salvage per point{/}`, x + 120, ry + 8, { font: "body" });
    const segW = Math.max(3, Math.min(6, Math.floor((w - 40) / run.ship.hullMax) - 1));
    hullBar(g, x + 14, ry + 34, run.ship.hull, run.ship.hullMax, segW, 12);
    g.text(`${run.ship.hull}/${run.ship.hullMax}`, x + w - 12, ry + 30, { font: "body", align: "right", color: C.text });
    const missing = run.ship.hullMax - run.ship.hull;
    const all = repairCost(run, stock, "all");
    if (brassButton(a, "rep-1", x + 12, ry + 58, 150, 28, `REPAIR 1 · ${stock.prices.hull}`, { disabled: missing <= 0 || run.inv.salvage < stock.prices.hull, variant: "normal", font: "label", sound: null })) {
      if (repairHullAt(run, stock, 1).ok) sfx.play("repair-done", { volume: 0.6 });
    }
    if (brassButton(a, "rep-all", x + 172, ry + 58, 190, 28, missing <= 0 ? "HULL IS WHOLE" : `REPAIR ALL · ${all}`, { disabled: missing <= 0 || all <= 0, font: "label", sound: null })) {
      if (repairHullAt(run, stock, "all").ok) sfx.play("repair-done");
    }
    void h;
  }

  function sellPanel(g: Gfx, a: App, x: number, y: number, w: number, h: number) {
    g.panel(x, y, w, h, "panel-dark");
    tracked(g, tab === 5 ? "YOUR CARS & STORES" : "SELL · HALF PRICE", x + 12, y + 10, { font: "label", color: P.ivory3 });
    let ry = y + 26;
    const row = (key: string, label: string, value: number, onSell: () => void, thumb?: string) => {
      if (ry > y + h - 30 - (stock.pell ? 104 : 0)) return;
      const over = a.ui.hover(x + 6, ry, w - 12, 26);
      if (over) g.rect(x + 6, ry, w - 12, 26, rgba(P.brass3, 0.15));
      if (thumb) {
        g.alpha(1, () => {
          const s = thumb.startsWith("aug-") ? thumb : "";
          if (s) icon(g, s, x + 10, ry + 5);
        });
      }
      const [main, sub] = label.split("|");
      g.text(main, x + 30, ry + (sub ? 0 : 4), { font: "body", color: C.text, width: w - 110, maxLines: 1 });
      if (sub) g.text(sub, x + 30, ry + 15, { font: "small", color: P.ivory4 });
      if (brassButton(a, `sell-${key}`, x + w - 74, ry + 2, 66, 22, `+${value}`, { variant: "normal", font: "label", sound: null })) {
        onSell();
        sfx.play("sell");
      }
      ry += 28;
    };
    if (tab === 5) {
      for (const slot of ["rear", "keel"] as const) {
        const id = run.ship.consist?.[slot];
        if (id) row(`car-${slot}`, carInfo(id).name, Math.floor(carInfo(id).price / 2), () => say(sellCar(run, slot).ok ? `${carInfo(id).name} sold.` : ""));
      }
      run.ship.moduleStore.forEach((m, k) => row(`mod-${k}`, moduleInfo(m).name, Math.floor(moduleInfo(m).price / 2), () => sellModule(run, m)));
      if (!run.ship.consist?.rear && !run.ship.consist?.keel && !run.ship.moduleStore.length) g.text("{ivory4}No cars coupled, nothing in the stores. Refit installed modules on the Ship screen, Yard tab.{/}", x + 12, ry, { font: "body", width: w - 24 });
      return;
    }
    const items: { id: string; where: string }[] = [
      ...run.ship.weapons.filter((v): v is NonNullable<typeof v> => !!v).map((id) => ({ id, where: "mounted" })),
      ...run.ship.drones.filter((v): v is NonNullable<typeof v> => !!v).map((id) => ({ id, where: "mounted" })),
      ...run.ship.cargo.map((id) => ({ id, where: "cargo" })),
      ...run.ship.augments.map((id) => ({ id, where: "augment" })),
    ];
    items.forEach((it, k) => {
      row(`it-${k}`, `${itemName(it.id)}|${it.where}`, sellPrice(it.id), () => {
        const r = sellItem(run, it.id);
        say(r.ok ? `${itemName(it.id)} sold.` : r.reason ?? "");
      }, it.where === "augment" ? `aug-${it.id}` : undefined);
    });
    if (stock.pell) {
      const img = art("portraits/pell");
      const py = y + h - 110;
      if (ry < py - 4) {
        g.rect(x + 12, py, 96, 96, P.ink1);
        if (img) g.image(img, x + 12, py);
        else placeholderPortrait(g, x + 12, py, t);
        g.box(x + 11, py - 1, 98, 98, P.brass3);
        tracked(g, "PELL", x + 116, py + 8, { font: "labelb", color: P.brass1 });
        g.text("{ivory4}Copper Market{/}", x + 116, py + 22, { font: "body", width: w - 124 });
      }
    }
  }

  return scene;
}
