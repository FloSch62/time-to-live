// Combat-side asset adapters: hull metadata (public/art/ships/ships.json with the recipe table as fallback), weapon
// and drone art metadata (★v2.2), livery recolouring, and display text from the writing workstream's flavor.ts.
import { art, getJson, loadJson, markHD, density } from "../core/assets";
import { paletteSwap } from "../core/gfx";
import { P } from "../core/palette";
import { fallbackHull, type HullMeta, type Mobility, type Pt } from "../data/hulls";
import { WEAPONS, ENEMY_WEAPONS } from "../data/weapons";
import { DRONES } from "../data/drones";
import { SYSTEMS } from "../data/systems";
import { ENEMIES } from "../data/enemies";
import { CARS } from "../data/cars";
import { MODULES } from "../data/modules";
import type { LampColor } from "../game/ids";
import * as flavor from "../content/flavor";
import * as names from "../content/names";

// ─── ships.json ─────────────────────────────────────────────────────────────────────────────────────────────

type RawMeta = Record<string, unknown>;
let shipsLoaded = false;

export function loadCombatMeta(): Promise<unknown> {
  shipsLoaded = true;
  return Promise.all([
    loadJson("art/ships/ships.json"),
    loadJson("art/weapons/weapons.json"),
    loadJson("art/drones/drones.json"),
  ]);
}

/** Art JSON geometry is in image pixels; HD art (★v3) has 2 image pixels per layout unit. */
function densityOf(raw: RawMeta): number {
  return (raw.density as number) ?? (raw.scale as number) ?? 2;
}

function pt(v: unknown, d = 1): Pt | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as { x?: number; y?: number };
  return typeof o.x === "number" && typeof o.y === "number" ? { x: o.x / d, y: o.y / d } : undefined;
}

function normalize(raw: RawMeta, fb: HullMeta): HullMeta {
  const d = densityOf(raw);
  const canvas = raw.canvas as number[] | undefined;
  const grid = raw.grid as { x: number; y: number; cols?: number; rows?: number } | undefined;
  const w = (raw.w as number) ?? canvas?.[0];
  const h = (raw.h as number) ?? canvas?.[1];
  const m: HullMeta = {
    w: w !== undefined ? w / d : fb.w,
    h: h !== undefined ? h / d : fb.h,
    gx: grid ? grid.x / d : raw.gx !== undefined ? (raw.gx as number) / d : fb.gx,
    gy: grid ? grid.y / d : raw.gy !== undefined ? (raw.gy as number) / d : fb.gy,
    cols: grid?.cols ?? fb.cols,
    rows: grid?.rows ?? fb.rows,
    mounts: raw.mounts ? (raw.mounts as Pt[]).map((p) => ({ x: p.x / d, y: p.y / d })) : fb.mounts,
    glow: raw.glow ? (raw.glow as { x: number; y: number; r: number }[]).map((p) => ({ x: p.x / d, y: p.y / d, r: (p.r ?? 8) / d })) : fb.glow,
    cable: raw.cable === null ? undefined : pt(raw.cable, d) ?? fb.cable,
    couplerRear: pt(raw.couplerRear, d) ?? fb.couplerRear,
    couplerFront: pt(raw.couplerFront, d) ?? fb.couplerFront,
    keelHang: pt(raw.keelHang, d) ?? fb.keelHang,
    hangTop: pt(raw.hangTop, d) ?? fb.hangTop,
    cls: (raw.class as string) ?? fb.cls,
    lampColors: (raw.lampColors as string[]) ?? fb.lampColors,
  };
  return m;
}

const metaCache = new Map<string, HullMeta>();

/** Hull geometry for a car/enemy with the given room grid; art metadata is used only when its grid matches. */
export function hullMeta(id: string, mobility: Mobility = "crawler", grid?: [number, number]): HullMeta {
  if (!shipsLoaded) void loadCombatMeta();
  const all = getJson<Record<string, RawMeta>>("art/ships/ships.json");
  const key = `${id}|${all ? 1 : 0}|${grid?.join("x") ?? ""}`;
  const c = metaCache.get(key);
  if (c) return c;
  const fb = fallbackHull(id, mobility, grid);
  const raw = all?.[id];
  let m = fb;
  if (raw) {
    const n = normalize(raw, fb);
    const g = raw.grid as { cols?: number; rows?: number } | undefined;
    const fits = !grid || !g || g.cols === undefined || (g.cols === grid[0] && g.rows === grid[1]);
    if (fits) m = n;
  }
  metaCache.set(key, m);
  return m;
}

/** Whether a hull's art can be used (its metadata matches the layout). */
export function hullArtFits(id: string, grid?: [number, number]): boolean {
  const all = getJson<Record<string, RawMeta>>("art/ships/ships.json");
  const raw = all?.[id];
  if (!raw) return false;
  const g = raw.grid as { cols?: number; rows?: number } | undefined;
  return !grid || !g || g.cols === undefined || (g.cols === grid[0] && g.rows === grid[1]);
}

// ─── livery ─────────────────────────────────────────────────────────────────────────────────────────────────

export const LIVERY: Record<LampColor, string[]> = {
  amber: [P.amber0, P.amber1, P.amber2, P.amber3],
  teal: [P.teal0, P.teal1, P.teal2, P.teal3],
  violet: [P.violet0, P.violet1, P.violet2, P.violet3],
  ember: [P.ember0, P.ember1, P.ember2, P.ember3],
  ivory: [P.ivory0, P.ivory1, P.ivory2, P.ivory3],
};

/** Lamp colour of a livery for glows/room lamps. */
export function lampColor(l: LampColor | undefined, step = 2): string {
  return LIVERY[l ?? "amber"][step];
}

/** Hull image for a car or enemy (livery-recoloured for the tender's cars). */
export function hullImage(id: string, lamp?: LampColor, grid?: [number, number]): HTMLImageElement | HTMLCanvasElement | null {
  if (!hullArtFits(id, grid)) return null;
  const raw = getJson<Record<string, RawMeta>>("art/ships/ships.json")?.[id];
  const file = typeof raw?.file === "string" ? raw.file.replace(/\.png$/, "") : `ships/${id}`;
  const img = art(file);
  if (!img) return null;
  if (!lamp || lamp === "amber") return img;
  const meta = hullMeta(id, "crawler", grid);
  const from = meta.lampColors ?? LIVERY.amber;
  const to = LIVERY[lamp];
  const map: Record<string, string> = {};
  from.forEach((c, i) => (map[c.toLowerCase()] = to[Math.min(i, to.length - 1)]));
  const out = paletteSwap(img, `hull-${id}-${lamp}`, map);
  return markHD(out, density(img));
}

// ─── weapons / drones art (★v2.2) ───────────────────────────────────────────────────────────────────────────

export interface WeaponArt {
  file?: string;
  w: number;
  h: number;
  pivot: Pt;
  muzzle: Pt;
  lens: { x: number; y: number; r: number }[];
}

export interface DroneArt {
  file?: string;
  w: number;
  h: number;
  rotors: { x: number; y: number; w: number }[];
  lens: { x: number; y: number; r: number }[];
}

const wCache = new Map<string, WeaponArt | null>();
const dCache = new Map<string, DroneArt | null>();

/** Weapon art and its metadata converted to layout units (pivot, muzzle, lens). */
export function weaponArt(id: string): { img: HTMLImageElement | null; meta: WeaponArt | null } {
  const all = getJson<Record<string, WeaponArt & RawMeta>>("art/weapons/weapons.json");
  if (!all) return { img: null, meta: null };
  let meta = wCache.get(id);
  if (meta === undefined) {
    const raw = all[id];
    if (!raw) meta = null;
    else {
      const d = densityOf(raw);
      meta = {
        file: raw.file, w: raw.w / d, h: raw.h / d, pivot: { x: raw.pivot.x / d, y: raw.pivot.y / d },
        muzzle: { x: raw.muzzle.x / d, y: raw.muzzle.y / d }, lens: (raw.lens ?? []).map((l) => ({ x: l.x / d, y: l.y / d, r: l.r / d })),
      };
    }
    wCache.set(id, meta);
  }
  const img = meta ? art((meta.file?.includes("/") ? meta.file : `weapons/${meta.file ?? `${id}.png`}`).replace(/\.png$/, "")) : null;
  return { img, meta };
}

export function droneArt(id: string): { img: HTMLImageElement | null; meta: DroneArt | null } {
  const all = getJson<Record<string, DroneArt & RawMeta>>("art/drones/drones.json");
  if (!all) return { img: null, meta: null };
  let meta = dCache.get(id);
  if (meta === undefined) {
    const raw = all[id];
    if (!raw) meta = null;
    else {
      const d = densityOf(raw);
      meta = {
        file: raw.file, w: raw.w / d, h: raw.h / d, rotors: (raw.rotors ?? []).map((r) => ({ x: r.x / d, y: r.y / d, w: r.w / d })),
        lens: (raw.lens ?? []).map((l) => ({ x: l.x / d, y: l.y / d, r: l.r / d })),
      };
    }
    dCache.set(id, meta);
  }
  const img = meta ? art((meta.file?.includes("/") ? meta.file : `drones/${meta.file ?? `${id}.png`}`).replace(/\.png$/, "")) : null;
  return { img, meta };
}

/** Icon art for shop/inventory (public/art/weapons/<id>-icon.png, drones likewise). */
export function itemIcon(kind: "weapon" | "drone", id: string): HTMLImageElement | null {
  return art(`${kind === "weapon" ? "weapons" : "drones"}/${id}-icon`);
}

// ─── flavor text ────────────────────────────────────────────────────────────────────────────────────────────

type Flav = { name?: string; desc?: string; lore?: string };
const F = flavor as unknown as Record<string, Record<string, Flav & Record<string, string>> | undefined>;

function fl(table: string, id: string): (Flav & Record<string, string>) | undefined {
  return F[table]?.[id];
}

export function weaponName(id: string): string {
  return fl("WEAPON_FLAVOR", id)?.name ?? (WEAPONS as Record<string, { name: string }>)[id]?.name ?? ENEMY_WEAPONS[id]?.name ?? id;
}
export function weaponDesc(id: string): string {
  return (WEAPONS as Record<string, { desc: string }>)[id]?.desc ?? ENEMY_WEAPONS[id]?.desc ?? fl("WEAPON_FLAVOR", id)?.desc ?? "";
}
export function droneName(id: string): string {
  return fl("DRONE_FLAVOR", id)?.name ?? (DRONES as Record<string, { name: string }>)[id]?.name ?? id;
}
export function systemName(id: string): string {
  return fl("SYSTEM_FLAVOR", id)?.name ?? (SYSTEMS as Record<string, { name: string }>)[id]?.name ??
    ({ gate: "Gate Seal", bells: "Glass Bells", heart: "The Heart", brood: "Brood Chamber", artillery: "Custody Battery" } as Record<string, string>)[id] ?? id;
}
export function systemDesc(id: string): string {
  return (SYSTEMS as Record<string, { desc: string }>)[id]?.desc ??
    ({
      gate: "The Regent's gate seal. While it holds, the gate stops every hit until two different routes strike within two seconds.",
      bells: "The Choir's glass. It shatters only when three hits land together; alone, a hit only rings a bell.",
      heart: "The Core's heart. It feeds the event horizon.",
      brood: "Launches boarders across to your tender.",
      artillery: "One step of the Custody rotation. Break the room to skip the step.",
    } as Record<string, string>)[id] ?? "";
}
export function speciesName(id: string): string {
  return fl("SPECIES_FLAVOR", id)?.name ?? fl("BOARDER_FLAVOR", id)?.name ?? ({ escort: "Escort Automaton", crawler: "Crawler Drone" } as Record<string, string>)[id] ?? id;
}
export function augmentName(id: string): string {
  return fl("AUGMENT_FLAVOR", id)?.name ?? id;
}
export function carName(id: string): string {
  return fl("CAR_FLAVOR", id)?.name ?? (CARS as Record<string, { name: string }>)[id]?.name ?? id;
}
export function moduleName(id: string): string {
  return fl("MODULE_FLAVOR", id)?.name ?? (MODULES as Record<string, { name: string }>)[id]?.name ?? id;
}

export interface EnemyText {
  name: string;
  classLine: string;
  handshake: string;
  taskEnded: string;
  aftermath: string;
  surrender: string;
  surrenderAccepted: string;
}

export function enemyText(id: string): EnemyText {
  const f = fl("ENEMY_FLAVOR", id) as Partial<EnemyText> | undefined;
  const d = (ENEMIES as Record<string, { name: string; hail: string; ended: string }>)[id];
  return {
    name: f?.name ?? d?.name ?? id,
    classLine: f?.classLine ?? "",
    handshake: f?.handshake ?? d?.hail ?? "",
    taskEnded: f?.taskEnded ?? d?.ended ?? "Task ended.",
    aftermath: f?.aftermath ?? d?.ended ?? "",
    surrender: f?.surrender ?? "Enough. Take what we carry and let us go.",
    surrenderAccepted: f?.surrenderAccepted ?? "They cut loose and drift down the carrier.",
  };
}

export function hazardText(id: string): { name: string; desc: string } {
  const f = fl("HAZARD_FLAVOR", id);
  return { name: f?.name ?? id, desc: f?.desc ?? "" };
}

// ─── crew names ─────────────────────────────────────────────────────────────────────────────────────────────

const N = names as unknown as Record<string, string[] | undefined>;
const NAME_TABLE: Record<string, string> = {
  linefolk: "LINEFOLK_NAMES", warden: "WARDEN_NAMES", rigger: "RIGGER_DESIGNATIONS", courier: "COURIER_NAMES",
  bellmaker: "BELLMAKER_NAMES",
};

export function pickCrewName(species: string, taken: string[], seed = 0): string | undefined {
  const list = N[NAME_TABLE[species] ?? ""];
  if (!list?.length) return undefined;
  for (let i = 0; i < list.length; i++) {
    const n = list[(seed + i * 7) % list.length];
    if (!taken.includes(n)) return n;
  }
  return list[0];
}
