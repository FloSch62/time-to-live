// The Ship screen (FTL "Ship" menu): UPGRADES (system levels and reactor with salvage, undo before leaving),
// EQUIPMENT (weapon/drone order and cargo, click-to-swap; augments, sell), CREW (rename, skills, health, dismiss)
// and the YARD (refits, cars, livery).
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { sfx } from "../core/audio";
import { measure } from "../core/font";
import { P, C, rgba } from "../core/palette";
import { SYSTEM_IDS, type SystemId } from "../game/ids";
import type { SkillId } from "../game/types";
import type { RunState } from "../campaign/model";
import { catalog, itemInfo, itemName, sellPrice } from "../campaign/catalog";
import { upgradeCost, upgradeSystem, reactorCost, upgradeReactor, powerDemand } from "../campaign/upgrades";
import { cargoCap, isDrone, isWeapon, normalizeWeaponPower, removeCrew, speciesMaxHp } from "../campaign/shipops";
import { speciesName } from "../campaign/events";
import { SKILL_IDS, SKILL_NAMES, SKILL_XP, skillLevel } from "../data/species";
import { brassButton, counted, divider, hullBar, icon, resIcon, titlePlate, tracked, hullColor } from "./kit";
import { itemIcon32, equipmentArt } from "./items";
import { newYardState, yardTab } from "./yard";

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
  sfx.play("ui-open", { volume: 0.7 });

  const scene: Scene = {
    overlay: true,
    update(dt) {
      t += dt;
    },
    draw(g, a) {
      g.dim(0.62);
      const X = 20;
      const Y = 30;
      const Wd = 920;
      const Hd = 490;
      g.panel(X, Y, Wd, Hd, "dialog");
      titlePlate(g, 480, Y - 11, `THE ${run.ship.name.toUpperCase()}`, { w: 320 });
      // tabs
      TABS.forEach((label, i) => {
        const tx = X + 24 + i * 132;
        if (brassButton(a, `ship-tab-${i}`, tx, Y + 18, 126, 24, label, { variant: i === tab ? "brass" : "normal", font: "label", hotkey: `F${i + 1}`, sound: "ui-click" })) {
          tab = i;
          sel = null;
          renaming = null;
        }
      });
      // salvage
      const sv = counted("ship-salvage", run.inv.salvage);
      g.panel(X + Wd - 150, Y + 18, 126, 24, "panel-dark");
      resIcon(g, "salvage", X + Wd - 144, Y + 22);
      g.text(String(sv), X + Wd - 32, Y + 21, { font: "body", color: P.brass1, align: "right" });
      const cx = X + 24;
      const cy = Y + 56;
      const cw = Wd - 48;
      const ch = Hd - 110;
      hoverSys = null;
      if (tab === 0) upgradesTab(g, a, cx, cy, cw, ch);
      else if (tab === 1) equipmentTab(g, a, cx, cy, cw, ch);
      else if (tab === 2) crewTab(g, a, cx, cy, cw, ch);
      else yardTab(g, a, run, yard, cx, cy, cw, ch, t, () => (changed = true));
      // footer
      const fy = Y + Hd - 46;
      divider(g, X + 24, fy - 8, Wd - 48);
      if (brassButton(a, "ship-undo", X + 24, fy, 150, 28, "UNDO", { variant: "normal", disabled: !changed, tooltip: "Put everything back the way it was when you opened this screen." })) {
        const s = JSON.parse(snapshot);
        run.ship = s.ship;
        run.inv = s.inv;
        run.stats.salvageSpent = s.spent;
        run.stats.salvageEarned = s.earned;
        changed = false;
        sfx.play("ui-back");
      }
      if (brassButton(a, "ship-close", X + Wd - 24 - 150, fy, 150, 28, "DONE", { hotkey: "Escape", hotkeys: ["KeyU"] })) close();
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
    tracked(g, "SYSTEMS", x, y, { font: "label", color: P.ivory3 });
    let ry = y + 14;
    for (const id of main) {
      sysRow(g, a, id, x, ry, 560);
      ry += 34;
    }
    ry += 8;
    tracked(g, "SUBSYSTEMS", x, ry, { font: "label", color: P.ivory3 });
    ry += 14;
    for (const id of subs) {
      sysRow(g, a, id, x, ry, 560);
      ry += 34;
    }
    // reactor
    const rx = x + 590;
    g.panel(rx, y + 10, w - 590, 120, "panel-dark");
    tracked(g, "REACTOR", rx + 12, y + 20, { font: "labelb", color: P.teal1 });
    const bars = ship.reactor;
    for (let i = 0; i < catalog.reactorMax; i++) {
      const bx = rx + 12 + (i % 13) * 19;
      const by = y + 40 + Math.floor(i / 13) * 16;
      g.rect(bx, by, 16, 12, i < bars ? P.teal3 : P.ink3);
      if (i < bars) g.hline(bx, by, 16, P.teal1);
    }
    g.text(`{ivory3}${bars} bars · systems can draw ${powerDemand(ship)}{/}`, rx + 12, y + 76, { font: "body" });
    const rc = reactorCost(ship);
    if (brassButton(a, "up-reactor", rx + 12, y + 96, w - 590 - 24, 26, rc === null ? "REACTOR AT MAXIMUM" : `+1 BAR · ${rc}`, { disabled: rc === null || run.inv.salvage < rc, variant: "normal", font: "label", sound: "power-up" })) {
      if (upgradeReactor(run)) changed = true;
    }
    if (a.ui.hover(rx, y + 10, w - 590, 120)) hoverSys = "reactor";
    // description of the hovered system
    const dy = y + 146;
    g.panel(rx, dy, w - 590, h - 150, "panel-dark");
    const hs = hoverSys ?? lastHover;
    if (hs) {
      lastHover = hs;
      if (hs === "reactor") {
        tracked(g, "REACTOR", rx + 12, dy + 10, { font: "labelb", color: P.brass1 });
        g.text("Every system draws its power from the reactor. More bars, more systems running at once.", rx + 12, dy + 26, { font: "body", width: w - 614, color: C.textDim });
      } else {
        const info = catalog.systems[hs];
        tracked(g, info.name.toUpperCase(), rx + 12, dy + 10, { font: "labelb", color: P.brass1 });
        let ty = dy + 26;
        ty += g.text(info.desc, rx + 12, ty, { font: "body", width: w - 614, color: C.textDim });
        const lv = ship.systems[hs]?.level ?? 0;
        (info.levels ?? []).forEach((l, i) => {
          if (!l || i === 0) return;
          const col = i <= lv ? P.teal1 : i === lv + 1 ? P.ivory1 : P.ivory4;
          g.text(`{${col}}${i}. ${l}{/}`, rx + 12, ty + 4 + (i - 1) * 15, { font: "small" });
        });
      }
    } else g.text("{ivory4}Hover a system to read what each level does.{/}", rx + 12, dy + 12, { font: "body", width: w - 614 });
  }
  let lastHover: SystemId | "reactor" | null = null;

  function sysRow(g: Gfx, a: App, id: SystemId, x: number, y: number, w: number) {
    const st = run.ship.systems[id]!;
    const info = catalog.systems[id];
    const over = a.ui.hover(x, y, w, 30);
    if (over) hoverSys = id;
    g.panel(x, y, w, 30, over ? "panel-hi" : "panel");
    if (!icon(g, `sys-${id}-powered`, x + 7, y + 7)) g.rect(x + 9, y + 9, 12, 12, P.teal3);
    g.text(info.name, x + 32, y + 6, { font: "body", color: C.text });
    for (let i = 0; i < info.max; i++) {
      const bx = x + 190 + i * 22;
      const on = i < st.level;
      const dmg = on && i >= st.level - st.damage;
      g.rect(bx, y + 9, 18, 12, P.ink0);
      g.rect(bx + 1, y + 10, 16, 10, dmg ? P.ember3 : on ? P.teal3 : P.ink2);
      if (on) g.hline(bx + 1, y + 10, 16, dmg ? P.ember1 : P.teal1);
      else g.box(bx, y + 9, 18, 12, i === st.level ? P.ivory3 : P.ink5);
    }
    if (over) {
      const lv = info.levels?.[st.level + 1];
      a.ui.setTooltip(`{brass1}${info.name}{/} · level ${st.level}/${info.max}${st.damage ? ` · {ember1}${st.damage} damaged{/}` : ""}\n${info.desc}${lv ? `\n{teal1}Next: ${lv}{/}` : ""}`, 280);
    }
    const cost = upgradeCost(run.ship, id);
    if (brassButton(a, `up-${id}`, x + w - 104, y + 3, 98, 24, cost === null ? "MAX" : `+1 · ${cost}`, { disabled: cost === null || run.inv.salvage < cost, variant: "normal", font: "label", sound: "power-up" })) {
      if (upgradeSystem(run, id)) changed = true;
    }
  }

  // ─── equipment ──────────────────────────────────────────────────────────────────────────────────────────

  function slotBox(g: Gfx, a: App, key: string, id: string | null, x: number, y: number, w: number, h: number, area: "w" | "d" | "c", i: number, disabled = false) {
    const over = a.ui.hot(`slot-${key}`, x, y, w, h, !disabled);
    const isSel = sel?.area === area && sel.i === i;
    g.panel(x, y, w, h, isSel ? "slot-hi" : over ? "slot-hi" : id ? "slot" : "slot-empty");
    if (isSel) g.box(x - 1, y - 1, w + 2, h + 2, P.teal1);
    if (disabled) {
      g.text("{ivory4}no Drone Bay{/}", x + w / 2, y + h / 2 - 8, { font: "small", align: "center" });
      return;
    }
    if (id) {
      equipmentArt(g, id, x + 4, y + 4, 74, h - 8);
      g.vline(x + 80, y + 6, h - 12, P.brass5);
      g.text(itemName(id), x + 86, y + 6, { font: "body", color: C.text, width: w - 92, maxLines: 1 });
      const info = itemInfo(id);
      g.text(`{ivory4}${info?.stats ?? ""}{/}`, x + 86, y + 22, { font: "small", width: w - 92, maxLines: 2 });
    } else g.text("{ivory4}empty{/}", x + w / 2, y + h / 2 - 8, { font: "small", align: "center" });
    if (over) {
      a.ui.cursor = "pointer";
      if (id && itemInfo(id)?.desc) a.ui.setTooltip(`{brass1}${itemName(id)}{/}\n${itemInfo(id)!.desc}${itemInfo(id)!.lore ? `\n{ivory4}${itemInfo(id)!.lore}{/}` : ""}`, 260);
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
    const sh = 46;
    const sw = 210;
    const gap = 8;
    tracked(g, `WEAPONS · ${ship.weapons.filter(Boolean).length}/${ship.weaponSlots} HARDPOINTS · FIRING ORDER 1–${ship.weaponSlots}`, x, y, { font: "label", color: P.ivory3 });
    for (let i = 0; i < ship.weaponSlots; i++) slotBox(g, a, `w${i}`, ship.weapons[i] ?? null, x + i * (sw + gap), y + 12, sw, sh, "w", i);
    let ry = y + 12 + sh + 14;
    tracked(g, `DRONES · ${ship.droneSlots} SLOTS`, x, ry, { font: "label", color: P.ivory3 });
    for (let i = 0; i < ship.droneSlots; i++) slotBox(g, a, `d${i}`, ship.drones[i] ?? null, x + i * (sw + gap), ry + 12, sw, sh, "d", i, !ship.systems.drones || !ship.systemRooms.drones);
    ry += 12 + sh + 14;
    const cap = cargoCap(ship);
    tracked(g, `CARGO · ${ship.cargo.length}/${cap}`, x, ry, { font: "label", color: P.ivory3 });
    const cols = 4;
    for (let i = 0; i < cap; i++) {
      slotBox(g, a, `c${i}`, ship.cargo[i] ?? null, x + (i % cols) * (sw + gap), ry + 12 + Math.floor(i / cols) * (sh + 6), sw, sh, "c", i);
    }
    ry += 12 + Math.ceil(cap / cols) * (sh + 6) + 8;
    tracked(g, `AUGMENTS · ${ship.augments.length}/3`, x, ry, { font: "label", color: P.ivory3 });
    for (let i = 0; i < 3; i++) {
      const id = ship.augments[i];
      const ax = x + i * (sw + gap) * 1.33;
      const aw = Math.round(sw * 1.33);
      const ay = ry + 12;
      g.panel(ax, ay, aw, 40, id ? "slot" : "slot-empty");
      if (!id) {
        g.text("{ivory4}empty{/}", ax + aw / 2, ay + 14, { font: "small", align: "center" });
        continue;
      }
      if (!icon(g, `aug-${id}`, ax + 8, ay + 12)) g.rect(ax + 10, ay + 14, 12, 12, P.brass2);
      g.text(itemName(id), ax + 30, ay + 4, { font: "body", color: C.text, width: aw - 110, maxLines: 1 });
      g.text(`{ivory4}${itemInfo(id)?.desc ?? ""}{/}`, ax + 30, ay + 22, { font: "small", width: aw - 110, maxLines: 1 });
      if (a.ui.hover(ax, ay, aw - 80, 40)) a.ui.setTooltip(`{brass1}${itemName(id)}{/}\n${itemInfo(id)?.desc ?? ""}${itemInfo(id)?.lore ? `\n{ivory4}${itemInfo(id)!.lore}{/}` : ""}`, 260);
      if (brassButton(a, `aug-sell-${i}`, ax + aw - 76, ay + 9, 68, 22, `SELL +${sellPrice(id)}`, { variant: "normal", font: "small" })) {
        ship.augments.splice(i, 1);
        run.inv.salvage += sellPrice(id);
        run.stats.salvageEarned += sellPrice(id);
        changed = true;
        sfx.play("sell");
      }
    }
    g.text(sel ? "{teal1}Click another slot to swap or move it.{/}" : "{ivory4}Click an item, then another slot, to move or swap it. Weapons fire from hardpoints; drones need a Drone Bay.{/}", x + w, y - 2, { font: "small", align: "right" });
    void h;
  }

  // ─── crew ───────────────────────────────────────────────────────────────────────────────────────────────

  function crewTab(g: Gfx, a: App, x: number, y: number, w: number, h: number) {
    const crew = run.ship.crew;
    tracked(g, `CREW · ${crew.length}`, x, y, { font: "label", color: P.ivory3 });
    SKILL_IDS.forEach((s: SkillId, i: number) => {
      const sx = x + 470 + i * 44;
      if (!icon(g, `pip-skill-${s}`, sx + 12, y - 2)) tracked(g, SKILL_NAMES[s].slice(0, 3).toUpperCase(), sx + 16, y, { font: "small", color: P.ivory4, align: "center" });
      if (a.ui.hover(sx, y - 4, 40, 14)) a.ui.setTooltip(SKILL_NAMES[s]);
    });
    const rowH = Math.min(46, Math.max(36, Math.floor((h - 20) / Math.max(1, crew.length))));
    crew.forEach((c, i) => {
      const ry = y + 16 + i * rowH;
      g.panel(x, ry, w, rowH - 4, "panel");
      if (!g.sprite("crew", `${c.species}-portrait`, x + 4, ry + 4, { noAnchor: true }) && !icon(g, `species-${c.species}`, x + 8, ry + 6)) g.rect(x + 10, ry + 8, 12, 12, P.ink3);
      if (renaming === c.id) {
        renameBuf = a.ui.textField(`rn-${c.id}`, x + 36, ry + 4, 200, renameBuf, 22);
        a.ui.focusId = `rn-${c.id}`;
        if (a.input.keyPressed("Enter")) {
          a.input.eatKey("Enter");
          if (renameBuf.trim()) c.name = renameBuf.trim();
          renaming = null;
          changed = true;
        }
      } else {
        g.text(c.name, x + 36, ry + 4, { font: "body", color: P.ivory0 });
        if (a.ui.area(`rename-${c.id}`, x + 34, ry + 2, measure(c.name, "body") + 6, 18, { tooltip: "Click to rename" })) {
          renaming = c.id;
          renameBuf = c.name;
        }
      }
      g.text(`{ivory4}${speciesName(c.species)}${c.joinedAt ? ` · joined ${c.joinedAt}` : ""}{/}`, x + 36, ry + 22, { font: "small" });
      const max = speciesMaxHp(c.species);
      const f = c.hp / max;
      g.rect(x + 260, ry + 10, 150, 6, P.ink0);
      g.rect(x + 260, ry + 10, Math.round(150 * f), 6, hullColor(f));
      g.text(`{ivory3}${Math.round(c.hp)}/${max}{/}`, x + 260, ry + 18, { font: "small" });
      SKILL_IDS.forEach((s: SkillId, k: number) => {
        const lv = skillLevel(c.xp, s);
        const sx = x + 470 + k * 44;
        for (let p = 0; p < 2; p++) {
          g.rect(sx + 8 + p * 12, ry + 12, 10, 6, P.ink0);
          g.rect(sx + 9 + p * 12, ry + 13, 8, 4, p < lv ? (lv === 2 ? P.brass1 : P.teal2) : P.ink2);
          if (p >= lv) g.box(sx + 8 + p * 12, ry + 12, 10, 6, P.ink5);
        }
        const [t1, t2] = SKILL_XP[s] ?? [0, 0];
        const xp = Math.round(c.xp?.[s] ?? 0);
        if (a.ui.hover(sx + 4, ry + 6, 36, 18)) {
          a.ui.setTooltip(`{brass1}${SKILL_NAMES[s]}{/} · ${lv === 0 ? "untrained" : lv === 1 ? "level 1" : "level 2 (mastered)"}\n{ivory3}experience ${xp}${lv < 2 ? ` / ${lv === 0 ? t1 : t2}` : ""}{/}`, 220);
        }
      });
      const hpHover = a.ui.hover(x + 256, ry + 6, 160, 24) || a.ui.hover(x + 4, ry + 4, 28, 32);
      if (hpHover) a.ui.setTooltip(`${c.name} · ${speciesName(c.species)}\n${Math.round(c.hp)}/${max} HP${catalog.species[c.species]?.special ? `\n{ivory3}${catalog.species[c.species]!.special}{/}` : ""}${c.kills ? `\n{ivory4}${c.kills} boarders stopped{/}` : ""}${c.repairs ? `\n{ivory4}${c.repairs} repairs{/}` : ""}`, 260);
      if (dismiss === c.id) {
        if (brassButton(a, `dis-yes-${c.id}`, x + w - 170, ry + 6, 80, 24, "DISMISS", { variant: "danger", font: "label" })) {
          removeCrew(run.ship, c.id);
          dismiss = null;
          changed = true;
          sfx.play("crew-stopped", { volume: 0.5 });
        }
        if (brassButton(a, `dis-no-${c.id}`, x + w - 84, ry + 6, 76, 24, "KEEP", { variant: "normal", font: "label" })) dismiss = null;
      } else if (brassButton(a, `dis-${c.id}`, x + w - 100, ry + 6, 92, 24, "DISMISS", { variant: "normal", font: "label", disabled: crew.length <= 1, tooltip: "Leave them at this relay. They will find their way back to Relay Seven." })) {
        dismiss = c.id;
      }
    });
  }

  void hullBar;
  return scene;
}
