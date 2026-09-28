// Item pictures for cards and lists: weapon/drone art from the art workstream (public/art/weapons/<id>-icon.png,
// public/art/drones/<id>-icon.png, 32×32; contract ★ v2.2) with code-drawn fallbacks; augment icons from the icons
// atlas; cars and modules.
import type { Gfx } from "../core/gfx";
import { art } from "../core/assets";
import { P } from "../core/palette";
import { catalog, itemInfo, type WeaponType } from "../campaign/catalog";
import { isAugment, isDrone, isWeapon } from "../campaign/shipops";
import { isCarId, isModuleId, carInfo } from "../campaign/refit";
import { icon, iconSize } from "./kit";
import type { DroneId, WeaponId } from "../game/ids";
import type { ShipState } from "../game/types";
import { WEAPONS } from "../data/weapons";
import { DRONES } from "../data/drones";
import { itemName, sellPrice } from "../campaign/catalog";

const TYPE_COLOR: Record<WeaponType, [string, string]> = {
  laser: [P.teal2, P.teal0],
  ion: [P.violet2, P.violet0],
  beam: [P.teal3, P.teal1],
  payload: [P.copper1, P.amber1],
  flak: [P.ivory2, P.ivory0],
};

/** 32×32 item picture (art icon when present). */
export function itemIcon32(g: Gfx, id: string, x: number, y: number) {
  if (isWeapon(id)) {
    const img = art(`weapons/${id}-icon`);
    if (img) return g.image(img, x, y);
    return weaponGlyph(g, id, x, y);
  }
  if (isDrone(id)) {
    const img = art(`drones/${id}-icon`);
    if (img) return g.image(img, x, y);
    return droneGlyph(g, x, y);
  }
  if (isAugment(id)) {
    g.rect(x, y, 32, 32, P.ink1);
    if (!icon(g, `aug-${id}`, x + 8, y + 8)) g.rect(x + 11, y + 11, 10, 10, P.brass2);
    return;
  }
  if (isCarId(id)) return carGlyph(g, id, x, y);
  if (isModuleId(id)) return moduleGlyph(g, x, y);
  g.rect(x, y, 32, 32, P.ink2);
}

/** Small picture (≤ 20 px) for inline notices. */
export function itemThumb(g: Gfx, id: string, x: number, y: number, size = 18) {
  g.rect(x, y, size, size, P.ink0);
  g.rect(x + 1, y + 1, size - 2, size - 2, P.ink2);
  if (isAugment(id) && iconSize(`aug-${id}`)) {
    icon(g, `aug-${id}`, x + Math.round((size - 16) / 2), y + Math.round((size - 16) / 2));
    return;
  }
  if (isWeapon(id)) {
    const t = catalog.weapons[id as WeaponId]?.wtype ?? "laser";
    const [c0, c1] = TYPE_COLOR[t];
    g.rect(x + 3, y + size / 2 - 2, size - 8, 5, P.brass3);
    g.rect(x + size - 6, y + size / 2 - 2, 3, 5, c0);
    g.rect(x + size - 5, y + size / 2 - 1, 1, 2, c1);
    g.rect(x + 5, y + size / 2 + 3, 4, 3, P.steel1);
    return;
  }
  if (isDrone(id)) {
    g.rect(x + 5, y + 7, size - 10, 6, P.ivory2);
    g.rect(x + 3, y + 5, size - 6, 1, P.steel2);
    g.rect(x + size / 2, y + 9, 2, 2, P.teal1);
    return;
  }
  g.rect(x + 5, y + 5, size - 10, size - 10, P.brass2);
}

function weaponGlyph(g: Gfx, id: string, x: number, y: number) {
  const info = itemInfo(id);
  const t = (info?.wtype ?? "laser") as WeaponType;
  const [c0, c1] = TYPE_COLOR[t];
  g.rect(x, y, 32, 32, P.ink1);
  // rail clamp and feed cable
  g.rect(x + 6, y + 22, 14, 4, P.steel0);
  g.rect(x + 8, y + 26, 10, 2, P.steel1);
  for (let i = 0; i < 6; i++) g.rect(x + 2 + i, y + 20 + (i % 2), 1, 1, P.copper2);
  if (t === "laser") {
    g.rect(x + 7, y + 12, 16, 10, P.ink0);
    g.rect(x + 8, y + 13, 14, 8, P.brass3);
    g.rect(x + 8, y + 13, 14, 2, P.brass1);
    for (let i = 10; i < 20; i += 3) g.rect(x + i, y + 15, 1, 6, P.brass4);
    g.rect(x + 22, y + 14, 5, 6, c0);
    g.rect(x + 24, y + 15, 2, 2, c1);
    if (id.includes("burst") || id.includes("multicast") || id.includes("triple")) {
      g.rect(x + 8, y + 6, 14, 6, P.brass3);
      g.rect(x + 22, y + 7, 4, 4, c0);
    }
  } else if (t === "ion") {
    g.rect(x + 7, y + 11, 12, 11, P.steel0);
    g.rect(x + 8, y + 12, 10, 3, P.steel1);
    g.rect(x + 19, y + 12, 3, 9, c0);
    g.rect(x + 22, y + 10, 6, 13, P.ink0);
    g.rect(x + 23, y + 11, 4, 11, c0);
    g.rect(x + 24, y + 13, 2, 7, c1);
    g.rect(x + 10, y + 4, 1, 8, P.steel2);
    g.rect(x + 15, y + 6, 1, 6, P.steel2);
  } else if (t === "beam") {
    g.rect(x + 5, y + 14, 22, 5, P.brass3);
    g.rect(x + 5, y + 14, 22, 1, P.brass1);
    g.rect(x + 9, y + 13, 2, 7, P.brass2);
    g.rect(x + 17, y + 13, 2, 7, P.brass2);
    g.rect(x + 26, y + 13, 4, 7, c0);
    g.rect(x + 27, y + 14, 2, 2, c1);
  } else if (t === "payload") {
    g.rect(x + 6, y + 13, 20, 7, P.steel0);
    g.rect(x + 6, y + 13, 20, 2, P.steel2);
    g.rect(x + 25, y + 12, 3, 9, P.ink0);
    g.rect(x + 8, y + 5, 8, 8, c0);
    g.rect(x + 9, y + 6, 6, 2, c1);
  } else {
    for (let i = 0; i < 3; i++) {
      g.rect(x + 8, y + 10 + i * 4, 18, 3, P.steel1);
      g.rect(x + 24, y + 10 + i * 4, 3, 3, c0);
    }
    g.rect(x + 10, y + 5, 8, 5, P.brass3);
  }
}

function droneGlyph(g: Gfx, x: number, y: number) {
  g.rect(x, y, 32, 32, P.ink1);
  g.rect(x + 9, y + 13, 14, 9, P.ink0);
  g.rect(x + 10, y + 14, 12, 7, P.ivory2);
  g.rect(x + 10, y + 14, 12, 2, P.ivory1);
  g.rect(x + 20, y + 16, 3, 3, P.teal2);
  g.rect(x + 4, y + 10, 10, 1, P.steel2);
  g.rect(x + 18, y + 10, 10, 1, P.steel2);
  g.rect(x + 9, y + 11, 1, 3, P.steel1);
  g.rect(x + 22, y + 11, 1, 3, P.steel1);
}

function carGlyph(g: Gfx, id: string, x: number, y: number) {
  g.rect(x, y, 32, 32, P.ink1);
  const keel = carInfo(id as never).slot === "keel";
  g.hline(x + 2, y + 5, 28, P.copper2);
  if (keel) {
    g.rect(x + 4, y + 8, 24, 10, P.ivory3);
    g.rect(x + 7, y + 18, 18, 7, P.steel1);
    g.rect(x + 7, y + 18, 18, 2, P.steel2);
  } else {
    g.rect(x + 14, y + 5, 2, 5, P.brass3);
    g.rect(x + 4, y + 10, 24, 14, P.ivory2);
    g.rect(x + 4, y + 10, 24, 2, P.ivory1);
    for (let i = 0; i < 3; i++) g.rect(x + 7 + i * 7, y + 14, 4, 4, P.amber2);
  }
}

function moduleGlyph(g: Gfx, x: number, y: number) {
  g.rect(x, y, 32, 32, P.ink1);
  g.rect(x + 6, y + 8, 20, 16, P.ink0);
  g.rect(x + 7, y + 9, 18, 14, P.brass4);
  g.rect(x + 7, y + 9, 18, 2, P.brass2);
  g.rect(x + 11, y + 13, 10, 6, P.ink2);
  g.rect(x + 13, y + 15, 6, 2, P.teal2);
}

/** Wide hardware portrait: use the full engineering silhouette instead of crushing it into a square. */
export function equipmentArt(g: Gfx, id: string, x: number, y: number, w: number, h: number) {
  const group = isWeapon(id) ? "weapons" : isDrone(id) ? "drones" : isCarId(id) ? "ships/cars" : null;
  const img = group ? art(`${group}/${id}`) : null;
  if (!img) { itemIcon32(g, id, x + (w - 32) / 2, y + (h - 32) / 2); return; }
  const scale = Math.min((w - 4) / img.width, (h - 4) / img.height);
  const dw = Math.round(img.width * scale), dh = Math.round(img.height * scale);
  g.ctx.drawImage(img, Math.round(x + (w - dw) / 2), Math.round(y + (h - dh) / 2), dw, dh);
}

// ─── numbers and tooltips ─────────────────────────────────────────────────────────────────────────────────

/** The numbers of a weapon or drone on one line (from the combat data, so they match the fight). */
export function itemStats(id: string): string {
  if (isWeapon(id)) {
    const d = WEAPONS[id as WeaponId];
    if (!d) return itemInfo(id)?.stats ?? "";
    const hit = d.type === "ion" ? `ion ${d.ion ?? d.damage}${d.shots > 1 ? ` × ${d.shots}` : ""}`
      : d.type === "beam" ? `${d.damage}/room${d.ion ? ` + ${d.ion} ion` : ""}`
      : `${d.damage} dmg${d.shots > 1 ? ` × ${d.shots}` : ""}`;
    return `${hit} · ${d.charge} s · ${d.power} power${d.ammo ? ` · ${d.ammo} payload` : ""}`;
  }
  if (isDrone(id)) {
    const d = DRONES[id as DroneId];
    if (!d) return itemInfo(id)?.stats ?? "";
    return `${d.kind} drone · ${d.power} power · 1 spare`;
  }
  return itemInfo(id)?.stats ?? "";
}

/**
 * The full tooltip for a weapon, drone or augment: name and price, type and numbers, the extras (fire, breach, beam
 * length, payloads), what it does, the lore line, and whether this tender can use it.
 */
export function equipmentTooltip(id: string, opts: { price?: number; ship?: ShipState; where?: string } = {}): string {
  const info = itemInfo(id);
  const lines: string[] = [];
  const price = opts.price !== undefined ? `{ivory4}${opts.price} salvage · sells for ${sellPrice(id)}{/}` : `{ivory4}sells for ${sellPrice(id)}{/}`;
  lines.push(`{brass1}${itemName(id)}{/}  ${price}`);
  if (isWeapon(id)) {
    const d = WEAPONS[id as WeaponId];
    if (d) {
      const hit = d.type === "ion" ? `ion ${d.ion ?? d.damage}${d.shots > 1 ? ` × ${d.shots}` : ""}`
        : d.type === "beam" ? `${d.damage} per room${d.ion ? ` + ${d.ion} ion` : ""}` : `${d.damage} damage${d.shots > 1 ? ` × ${d.shots}` : ""}`;
      lines.push(`{teal1}${d.type.toUpperCase()}{/} · ${hit} · ${d.power} power · ${d.charge} s charge`);
      const extra: string[] = [];
      if (d.fireChance >= 0.2) extra.push(`fire ${Math.round(d.fireChance * 100)}%`);
      if (d.breachChance >= 0.2) extra.push(`breach ${Math.round(d.breachChance * 100)}%`);
      if (d.type === "payload") extra.push("passes the ward mesh");
      if (d.ammo) extra.push(`${d.ammo} payload per volley`);
      if (d.beamLength) extra.push(`beam ${d.beamLength} tiles`);
      if (d.chain) extra.push(`each volley ${d.chain.step} s quicker, ${d.chain.max} times`);
      if (d.crewDamage) extra.push(`${d.crewDamage} crew damage`);
      if (extra.length) lines.push(`{ivory3}${extra.join(" · ")}{/}`);
    } else if (info?.stats) lines.push(info.stats);
  } else if (isDrone(id)) {
    const d = DRONES[id as DroneId];
    if (d) lines.push(`{teal1}${d.kind.toUpperCase()} DRONE{/} · ${d.power} power · 1 spare per launch${d.damage && d.kind === "combat" ? ` · ${d.damage} per hit` : ""}`);
    if (opts.ship && (!opts.ship.systems.drones || !opts.ship.systemRooms.drones)) lines.push("{amber1}Needs a Drone Bay to launch{/}");
  } else if (isAugment(id)) {
    lines.push("{teal1}AUGMENT{/} · always working, no power");
  }
  if (info?.desc) lines.push(info.desc);
  if (info?.lore) lines.push(`{ivory4}${info.lore}{/}`);
  if (opts.where) lines.push(`{ivory4}${opts.where}{/}`);
  return lines.join("\n");
}
