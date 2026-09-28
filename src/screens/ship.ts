// The Ship screen (FTL "Ship" menu): UPGRADES (system levels and reactor with salvage, undo before leaving),
// EQUIPMENT (weapon/drone order and cargo, click-to-swap; augments, sell), CREW (rename, skills, health, dismiss)
// and the YARD (refits, cars, livery).
import type { App, Scene } from "../core/scene";
import { volunteerRecord, rememberedIncident } from "../content/voyage-record";
import type { Gfx } from "../core/gfx";
import { sfx } from "../core/audio";
import { measure, lineHeight, wrap } from "../core/font";
import { P, C, rgba } from "../core/palette";
import { SYSTEM_IDS, type SystemId } from "../game/ids";
import type { SkillId } from "../game/types";
import type { RunState } from "../campaign/model";
import { catalog, itemInfo, itemName, sellPrice } from "../campaign/catalog";
import { upgradeCost, upgradeSystem, reactorCost, upgradeReactor, powerDemand } from "../campaign/upgrades";
import { cargoCap, isDrone, isWeapon, normalizeWeaponPower, removeCrew, speciesMaxHp, crewCap } from "../campaign/shipops";
import { speciesName } from "../campaign/events";
import { SKILL_IDS, SKILL_NAMES, SKILL_XP, skillLevel } from "../data/species";
import { STARTING_TENDERS } from "../data/ship";
import { TYPE, brassButton, fitFont, footer, header, icon, runModal, salvageChip, tabRow, textAt, hullColor } from "./kit";
import { equipmentArt, equipmentTooltip, itemStats } from "./items";
import { newYardState, refitAllowed, yardTab } from "./yard";

const TABS = ["UPGRADES", "EQUIPMENT", "CREW", "YARD"] as const;

export function createShipScene(app: App, run: RunState, onClose: () => void, startTab = 0): Scene {
  let tab = startTab;
  let t = 0;
  const snapshot = JSON.stringify({ ship: run.ship, inv: run.inv, spent: run.stats.salvageSpent, earned: run.stats.salvageEarned });
  let changed = false;
  let sel: { area: "w" | "d" | "c"; i: number } | null = null;
  let renaming: string | null = null;
  let renameBuf = "";
  let dismiss: string | null = null;
  const yard = newYardState();
  let hoverSys: SystemId | "reactor" | null = null;
  let lastHover: SystemId | "reactor" | null = null;
  sfx.play("ui-open", { volume: 0.7 });

  const scene: Scene = {
    overlay: true,
    update(dt) {
      t += dt;
    },
    draw(g, a) {
      const lead = STARTING_TENDERS.find((p) => p.id === run.ship.consist?.lead);
      const allowed = refitAllowed(run);
      const sub = `${lead ? `${lead.designation} · ` : ""}${allowed.ok ? `refits possible at this ${allowed.where === "bench" ? "bench" : "exchange"}` : "refits at an exchange or a bench"}`;
      const box = runModal(g, a, run, run.ship.name, sub);
      salvageChip(g, "ship-salvage", run.inv.salvage, box.right, box.headerY - 5);
      const next = tabRow(a, "ship-tab", box.x, box.y - 4, 520, 24, TABS.map((label, i) => ({ label, key: `F${i + 1}` })), tab);
      if (next !== tab) {
        tab = next;
        sel = null;
        renaming = null;
        dismiss = null;
      }
      const cx = box.x;
      const cy = box.y + 30;
      const cw = box.w;
      const ch = box.bottom - 38 - cy;
      hoverSys = null;
      if (tab === 0) upgradesTab(g, a, cx, cy, cw, ch);
      else if (tab === 1) equipmentTab(g, a, cx, cy, cw, ch);
      else if (tab === 2) crewTab(g, a, cx, cy, cw, ch);
      else yardTab(g, a, run, yard, cx, cy, cw, ch, t, () => (changed = true));
      // bottom row
      const fy = box.bottom - 28;
      if (brassButton(a, "ship-undo", cx, fy, 150, 28, "UNDO", { variant: "normal", disabled: !changed, tooltip: "Put everything back the way it was when you opened this screen." })) {
        const s = JSON.parse(snapshot);
        run.ship = s.ship;
        run.inv = s.inv;
        run.stats.salvageSpent = s.spent;
        run.stats.salvageEarned = s.earned;
        changed = false;
        sfx.play("ui-back");
      }
      if (brassButton(a, "ship-close", box.right - 150, fy, 150, 28, "DONE", { hotkey: "Escape", hotkeys: ["KeyU"] })) close();
      footer(g, a, [["F1–F4", "tabs"]], [["ESC", "done"]]);
    },
  };

  function close() {
    normalizeWeaponPower(run.ship);
    sfx.play("ui-back", { volume: 0.7 });
    app.scenes.remove(scene);
    onClose();
  }

  // ─── upgrades ───────────────────────────────────────────────────────────────────────────────────────────

  function upgradesTab(g: Gfx, a: App, x: number, y: number, w: number, h: number) {
    const ship = run.ship;
    const installed = SYSTEM_IDS.filter((id) => ship.systems[id]);
    const main = installed.filter((id) => !catalog.systems[id]?.subsystem);
    const subs = installed.filter((id) => catalog.systems[id]?.subsystem);
    const lw = 574;
    // row height adapts so every installed system fits
    const rowH = Math.max(24, Math.min(32, Math.floor((h - 2 * 20 - 8) / Math.max(1, main.length + subs.length)) - 3));
    header(g, "Systems", x, y);
    let ry = y + 16;
    for (const id of main) {
      sysRow(g, a, id, x, ry, lw, rowH);
      ry += rowH + 3;
    }
    ry += 8;
    header(g, "Subsystems", x, ry);
    textAt(g, "self-powered", x + lw, ry, { font: TYPE.note, color: P.ivory4, align: "right" });
    ry += 16;
    for (const id of subs) {
      sysRow(g, a, id, x, ry, lw, rowH);
      ry += rowH + 3;
    }
    // reactor
    const rx = x + lw + 16;
    const rw = w - lw - 16;
    g.panel(rx, y, rw, 116, "panel-dark");
    header(g, "Reactor", rx + 12, y + 12, { font: TYPE.strong, color: P.teal1 });
    const bars = ship.reactor;
    const perRow = 13;
    const bw = Math.floor((rw - 24 - (perRow - 1) * 3) / perRow);
    for (let i = 0; i < catalog.reactorMax; i++) {
      const bx = rx + 12 + (i % perRow) * (bw + 3);
      const by = y + 30 + Math.floor(i / perRow) * 15;
      g.rect(bx, by, bw, 11, i < bars ? P.teal3 : P.ink3);
      if (i < bars) g.hline(bx, by, bw, P.teal1);
    }
    const demand = powerDemand(ship);
    textAt(g, `${bars} bars · systems can draw ${demand}`, rx + 12, y + 64, { font: TYPE.note, color: demand > bars ? P.amber1 : P.ivory2 });
    const rc = reactorCost(ship);
    if (brassButton(a, "up-reactor", rx + 12, y + 80, rw - 24, 26, rc === null ? "REACTOR AT MAXIMUM" : `+1 BAR · ${rc}`, { disabled: rc === null || run.inv.salvage < rc, variant: "normal", sound: "power-up" })) {
      if (upgradeReactor(run)) changed = true;
    }
    if (a.ui.hover(rx, y, rw, 116)) hoverSys = "reactor";
    // what the hovered (or last hovered, or first) system does
    const dy = y + 124;
    const dh = h - 124;
    g.panel(rx, dy, rw, dh, "panel-dark");
    const hs = hoverSys ?? lastHover ?? main[0] ?? "reactor";
    lastHover = hs;
    const tw = rw - 24;
    if (hs === "reactor") {
      header(g, "Reactor", rx + 12, dy + 12, { font: TYPE.strong, color: P.brass1 });
      textAt(g, "Every system draws its power from the reactor. More bars, more systems running at once. Subsystems (helm, listening post, bulkheads) need none.", rx + 12, dy + 30, { font: TYPE.body, width: tw, color: C.textDim });
    } else {
      const info = catalog.systems[hs];
      const st = ship.systems[hs];
      header(g, info.name, rx + 12, dy + 12, { font: TYPE.strong, color: P.brass1 });
      textAt(g, `level ${st?.level ?? 0} of ${info.max}`, rx + tw + 12, dy + 12, { font: TYPE.note, color: P.ivory3, align: "right" });
      let ty = dy + 30;
      ty += textAt(g, info.desc, rx + 12, ty, { font: TYPE.body, width: tw, color: C.textDim }) + 6;
      const lv = st?.level ?? 0;
      (info.levels ?? []).forEach((l, i) => {
        if (!l || i === 0) return;
        const lines = wrap(`${i}. ${l}`, tw, TYPE.note).length;
        if (ty + lines * lineHeight(TYPE.note) > dy + dh - 6) return;
        const col = i <= lv ? P.teal1 : i === lv + 1 ? P.ivory0 : P.ivory4;
        ty += textAt(g, `${i}. ${l}`, rx + 12, ty, { font: TYPE.note, width: tw, color: col });
      });
    }
  }

  function sysRow(g: Gfx, a: App, id: SystemId, x: number, y: number, w: number, h: number) {
    const st = run.ship.systems[id]!;
    const info = catalog.systems[id];
    const over = a.ui.hover(x, y, w, h);
    if (over) hoverSys = id;
    g.panel(x, y, w, h, over ? "panel-hi" : "panel");
    const ic = Math.round((h - 20) / 2);
    if (!icon(g, `sys-${id}-powered`, x + 6, y + ic)) g.rect(x + 9, y + ic + 3, 14, 14, P.teal3);
    textAt(g, info.name, x + 32, y + Math.round((h - 10) / 2), { font: TYPE.body, color: C.text });
    const segW = 20;
    for (let i = 0; i < info.max; i++) {
      const bx = x + 196 + i * (segW + 4);
      const by = y + Math.round((h - 12) / 2);
      const on = i < st.level;
      const dmg = on && i >= st.level - st.damage;
      g.rect(bx, by, segW, 12, P.ink0);
      g.rect(bx + 1, by + 1, segW - 2, 10, dmg ? P.ember3 : on ? P.teal3 : P.ink2);
      if (on) g.hline(bx + 1, by + 1, segW - 2, dmg ? P.ember1 : P.teal1);
      else g.box(bx, by, segW, 12, i === st.level ? P.ivory3 : P.ink5);
    }
    textAt(g, `${st.level}/${info.max}`, x + 196 + 8 * (segW + 4) + 4, y + Math.round((h - 7.5) / 2), { font: TYPE.note, color: P.ivory3 });
    const cost = upgradeCost(run.ship, id);
    const bh = Math.min(24, h - 6);
    if (brassButton(a, `up-${id}`, x + w - 104, y + Math.round((h - bh) / 2), 98, bh, cost === null ? "MAX" : `+1 · ${cost}`, { disabled: cost === null || run.inv.salvage < cost, variant: "normal", sound: "power-up" })) {
      if (upgradeSystem(run, id)) changed = true;
    }
  }

  // ─── equipment ──────────────────────────────────────────────────────────────────────────────────────────

  function slotBox(g: Gfx, a: App, key: string, id: string | null, x: number, y: number, w: number, h: number, area: "w" | "d" | "c", i: number, disabled = false, compact = false) {
    const over = a.ui.hot(`slot-${key}`, x, y, w, h, !disabled);
    const isSel = sel?.area === area && sel.i === i;
    g.panel(x, y, w, h, isSel ? "slot-hi" : over ? "slot-hi" : id ? "slot" : "slot-empty");
    if (isSel) g.box(x - 1, y - 1, w + 2, h + 2, P.teal1);
    if (disabled) {
      textAt(g, "no Drone Bay", x + w / 2, y + h / 2 - 4, { font: TYPE.note, color: P.ivory4, align: "center" });
      if (over) a.ui.setTooltip("{brass1}No Drone Bay{/}\nCouple a Drone Car, or fit a Drone Bay module into a free socket (Yard tab).", 240, { x, y, w, h });
      return;
    }
    if (id) {
      const aw = compact ? 52 : 72;
      equipmentArt(g, id, x + 4, y + 4, aw, h - 8);
      g.vline(x + aw + 6, y + 6, h - 12, P.brass5);
      const tx = x + aw + 12;
      const tw = w - aw - 18;
      const name = itemName(id);
      const fit = fitFont(name, tw, [[TYPE.body, 0], [TYPE.note, 0]]);
      if (compact) {
        const lines = fit.w > tw ? wrap(name, tw, TYPE.note) : [name];
        const lh2 = lines.length > 1 ? lineHeight(TYPE.note) : 0;
        textAt(g, lines.join("\n"), tx, y + Math.round((h - (lines.length > 1 ? 7.5 + lh2 : fit.font === TYPE.body ? 10 : 7.5)) / 2), { font: lines.length > 1 ? TYPE.note : fit.font, color: C.text });
      } else {
        textAt(g, name, tx, y + 8, { font: fit.font, color: C.text, width: fit.w > tw ? tw : undefined });
        textAt(g, itemStats(id), tx, y + 24, { font: TYPE.note, color: P.ivory3, width: tw });
      }
    } else textAt(g, "empty", x + w / 2, y + h / 2 - 4, { font: TYPE.note, color: P.ivory4, align: "center" });
    if (over) {
      a.ui.cursor = "pointer";
      if (id) a.ui.setTooltip(equipmentTooltip(id, { ship: run.ship, where: sel ? "Click to swap with the picked item." : "Click to pick it up, then click another slot." }), 300, { x, y, w, h });
      if (a.input.pressed(0)) {
        a.input.consume();
        clickSlot(area, i);
      }
    }
  }

  function getSlot(area: "w" | "d" | "c", i: number): string | null {
    const s = run.ship;
    return (area === "w" ? s.weapons[i] : area === "d" ? s.drones[i] : s.cargo[i]) ?? null;
  }
  function setSlot(area: "w" | "d" | "c", i: number, v: string | null) {
    const s = run.ship;
    if (area === "w") s.weapons[i] = v as never;
    else if (area === "d") s.drones[i] = v as never;
    else if (v) s.cargo[i] = v as never;
    else s.cargo.splice(i, 1);
  }
  function accepts(area: "w" | "d" | "c", id: string | null) {
    if (!id) return true;
    if (area === "w") return isWeapon(id);
    if (area === "d") return isDrone(id);
    return true;
  }

  function clickSlot(area: "w" | "d" | "c", i: number) {
    if (!sel) {
      if (getSlot(area, i)) {
        sel = { area, i };
        sfx.play("ui-click");
      }
      return;
    }
    const a0 = sel;
    sel = null;
    if (a0.area === area && a0.i === i) return;
    const x = getSlot(a0.area, a0.i);
    const y = getSlot(area, i);
    if (!accepts(area, x) || !accepts(a0.area, y)) {
      sfx.play("power-denied");
      return;
    }
    // cargo compaction: moving into an empty cargo slot appends
    if (area === "c" && !y) {
      setSlot(a0.area, a0.i, null);
      run.ship.cargo.push(x as never);
    } else if (a0.area === "c" && !y) {
      setSlot(area, i, x);
      run.ship.cargo.splice(a0.i, 1);
    } else {
      setSlot(a0.area, a0.i, y);
      setSlot(area, i, x);
    }
    if (area === "w" || a0.area === "w") {
      // A weapon moved into a new mount starts unpowered.
      if (area === "w") run.ship.weaponPower[i] = false;
      if (a0.area === "w") run.ship.weaponPower[a0.i] = false;
    }
    normalizeWeaponPower(run.ship);
    changed = true;
    sfx.play("door-close", { volume: 0.5 });
  }

  function equipmentTab(g: Gfx, a: App, x: number, y: number, w: number, h: number) {
    const ship = run.ship;
    const gap = 8;
    const sh = 50;
    const n = Math.max(1, ship.weaponSlots);
    const sw = Math.min(290, Math.floor((w - gap * (n - 1)) / n));
    header(g, `Weapons · ${ship.weapons.filter(Boolean).length} of ${ship.weaponSlots} hardpoints · firing order 1–${ship.weaponSlots}`, x, y);
    textAt(g, sel ? "Click another slot to swap or move it." : "Click an item, then another slot, to move or swap it.", x + w, y, { font: TYPE.note, color: sel ? P.teal1 : P.ivory3, align: "right" });
    for (let i = 0; i < ship.weaponSlots; i++) slotBox(g, a, `w${i}`, ship.weapons[i] ?? null, x + i * (sw + gap), y + 14, sw, sh, "w", i);
    let ry = y + 14 + sh + 14;
    const noBay = !ship.systems.drones || !ship.systemRooms.drones;
    header(g, `Drones · ${ship.droneSlots} ${ship.droneSlots === 1 ? "slot" : "slots"}${noBay ? " · needs a Drone Bay" : ""}`, x, ry, { color: noBay ? P.amber1 : P.ivory3 });
    const dn = Math.max(1, ship.droneSlots);
    const dw = Math.min(290, Math.floor((w - gap * (dn - 1)) / dn));
    for (let i = 0; i < ship.droneSlots; i++) slotBox(g, a, `d${i}`, ship.drones[i] ?? null, x + i * (dw + gap), ry + 14, dw, sh, "d", i, noBay);
    ry += 14 + sh + 14;
    // cargo (left) and augments (right)
    const cap = cargoCap(ship);
    const augW = 284;
    const cgW = w - augW - 16;
    header(g, `Cargo · ${ship.cargo.length} of ${cap}`, x, ry);
    const cols = 3;
    const cellW = Math.floor((cgW - gap * (cols - 1)) / cols);
    const rowsN = Math.ceil(cap / cols);
    const cellH = Math.max(28, Math.min(40, Math.floor((y + h - ry - 14 - (rowsN - 1) * 6) / Math.max(1, rowsN))));
    for (let i = 0; i < cap; i++) {
      slotBox(g, a, `c${i}`, ship.cargo[i] ?? null, x + (i % cols) * (cellW + gap), ry + 14 + Math.floor(i / cols) * (cellH + 6), cellW, cellH, "c", i, false, true);
    }
    const ax = x + cgW + 16;
    header(g, `Augments · ${ship.augments.length} of 3`, ax, ry);
    for (let i = 0; i < 3; i++) {
      const id = ship.augments[i];
      const ay = ry + 14 + i * 40;
      g.panel(ax, ay, augW, 36, id ? "slot" : "slot-empty");
      if (!id) {
        textAt(g, "empty", ax + augW / 2, ay + 14, { font: TYPE.note, color: P.ivory4, align: "center" });
        continue;
      }
      if (!icon(g, `aug-${id}`, ax + 8, ay + 8)) g.rect(ax + 10, ay + 11, 14, 14, P.brass2);
      const nw = augW - 36 - 84;
      const fit = fitFont(itemName(id), nw, [[TYPE.body, 0], [TYPE.note, 0]]);
      textAt(g, itemName(id), ax + 34, ay + (fit.font === TYPE.body ? 13 : 14), { font: fit.font, color: C.text, width: fit.w > nw ? nw : undefined });
      if (a.ui.hover(ax, ay, augW - 80, 36)) a.ui.setTooltip(equipmentTooltip(id, { ship }), 280, { x: ax, y: ay, w: augW, h: 36, side: "left" });
      if (brassButton(a, `aug-sell-${i}`, ax + augW - 78, ay + 6, 70, 24, `SELL +${sellPrice(id)}`, { variant: "normal", font: "note" })) {
        ship.augments.splice(i, 1);
        run.inv.salvage += sellPrice(id);
        run.stats.salvageEarned += sellPrice(id);
        changed = true;
        sfx.play("sell");
      }
    }
    void itemInfo;
  }

  // ─── crew ───────────────────────────────────────────────────────────────────────────────────────────────

  function crewTab(g: Gfx, a: App, x: number, y: number, w: number, h: number) {
    const crew = run.ship.crew;
    const col = { name: x + 44, hp: x + 268, skills: x + 448, skillW: 50 };
    header(g, `Crew · ${crew.length} of ${crewCap(run.ship)} berths`, x, y);
    header(g, "Health", col.hp, y);
    SKILL_IDS.forEach((s: SkillId, i: number) => {
      const sx = col.skills + i * col.skillW;
      if (!icon(g, `pip-skill-${s}-sm`, sx + col.skillW / 2 - 7, y - 4) && !icon(g, `pip-skill-${s}`, sx + col.skillW / 2 - 10, y - 6)) header(g, SKILL_NAMES[s].slice(0, 4), sx + col.skillW / 2, y, { align: "center" });
      if (a.ui.hover(sx, y - 6, col.skillW, 16)) a.ui.setTooltip(`{brass1}${SKILL_NAMES[s]}{/}\nCrew learn by working a station: level 1, then mastered.`, 220, { x: sx, y: y - 6, w: col.skillW, h: 16 });
    });
    const rowH = Math.min(46, Math.max(34, Math.floor((h - 18) / Math.max(1, crew.length))));
    crew.forEach((c, i) => {
      const ry = y + 16 + i * rowH;
      const rh = rowH - 4;
      g.panel(x, ry, w, rh, "panel");
      const py = ry + Math.round((rh - 32) / 2);
      if (!g.sprite("crew", `${c.species}-portrait`, x + 5, py, { noAnchor: true }) && !icon(g, `species-${c.species}`, x + 8, py + 6)) g.rect(x + 10, py + 8, 14, 14, P.ink3);
      const ny = ry + Math.round((rh - 24) / 2);
      if (renaming === c.id) {
        renameBuf = a.ui.textField(`rn-${c.id}`, col.name, ry + Math.round((rh - 20) / 2), 200, renameBuf, 22);
        a.ui.focusId = `rn-${c.id}`;
        if (a.input.keyPressed("Enter")) {
          a.input.eatKey("Enter");
          if (renameBuf.trim()) c.name = renameBuf.trim();
          renaming = null;
          changed = true;
        }
      } else {
        textAt(g, c.name, col.name, ny, { font: TYPE.body, color: P.ivory0 });
        if (a.ui.area(`rename-${c.id}`, col.name - 2, ny - 3, measure(c.name, TYPE.body) + 6, 16, { tooltip: "Click to rename" })) {
          renaming = c.id;
          renameBuf = c.name;
        }
        textAt(g, `${speciesName(c.species)}${c.joinedAt ? ` · joined ${c.joinedAt}` : ""}`, col.name, ny + 15, { font: TYPE.note, color: P.ivory3 });
      }
      const max = speciesMaxHp(c.species);
      const f = c.hp / max;
      const hy = ry + Math.round(rh / 2) - 5;
      g.rect(col.hp, hy, 130, 8, P.ink0);
      g.rect(col.hp + 1, hy + 1, Math.round(128 * f), 6, hullColor(f));
      textAt(g, `${Math.round(c.hp)}/${max}`, col.hp + 138, hy, { font: TYPE.note, color: P.ivory2 });
      SKILL_IDS.forEach((s: SkillId, k: number) => {
        const lv = skillLevel(c.xp, s);
        const sx = col.skills + k * col.skillW + col.skillW / 2 - 11;
        const sy = ry + Math.round(rh / 2) - 4;
        for (let p = 0; p < 2; p++) {
          g.rect(sx + p * 12, sy, 10, 8, P.ink0);
          g.rect(sx + 1 + p * 12, sy + 1, 8, 6, p < lv ? (lv === 2 ? P.brass1 : P.teal2) : P.ink2);
          if (p >= lv) g.box(sx + p * 12, sy, 10, 8, P.ink5);
        }
        const [t1, t2] = SKILL_XP[s] ?? [0, 0];
        const xp = Math.round(c.xp?.[s] ?? 0);
        const hx = col.skills + k * col.skillW;
        if (a.ui.hover(hx, ry, col.skillW, rh)) {
          a.ui.setTooltip(`{brass1}${SKILL_NAMES[s]}{/} · ${lv === 0 ? "untrained" : lv === 1 ? "level 1" : "level 2 (mastered)"}\n{ivory3}experience ${xp}${lv < 2 ? ` / ${lv === 0 ? t1 : t2}` : ""}{/}`, 220, { x: hx, y: ry, w: col.skillW, h: rh });
        }
      });
      const hpHover = a.ui.hover(col.hp - 4, ry, 176, rh) || a.ui.hover(x + 2, ry, 36, rh);
      if (hpHover) a.ui.setTooltip(`${c.name} · ${speciesName(c.species)}\n${Math.round(c.hp)}/${max} HP\n${volunteerRecord(c)}\n{teal1}${rememberedIncident(c)}{/}`, 320, { x, y: ry, w: col.skills - x, h: rh });
      const by = ry + Math.round((rh - 24) / 2);
      if (dismiss === c.id) {
        if (brassButton(a, `dis-yes-${c.id}`, x + w - 176, by, 84, 24, "DISMISS", { variant: "danger" })) {
          removeCrew(run.ship, c.id);
          dismiss = null;
          changed = true;
          sfx.play("crew-stopped", { volume: 0.5 });
        }
        if (brassButton(a, `dis-no-${c.id}`, x + w - 86, by, 80, 24, "KEEP", { variant: "normal" })) dismiss = null;
      } else if (brassButton(a, `dis-${c.id}`, x + w - 104, by, 98, 24, "DISMISS", { variant: "normal", disabled: crew.length <= 1, tooltip: "Leave them at this relay. They will find their way back to Relay Seven." })) {
        dismiss = c.id;
      }
    });
    void rgba;
  }

  return scene;
}
