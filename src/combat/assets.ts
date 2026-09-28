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
import { TILE } from "../data/layouts";
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

// ─── drive trolley layers (optional, from the art workstream) ────────────────────────────────────────────────

/**
 * A car's separately painted drive trolley. ships.json (HD px like every other field):
 *   "<car id>": { …, "trolley": { "kind": "standard" | "heavy", "pivot": {x, y}, "saddle": {x, y} } }
 *     saddle = where the carrier's centre line passes through the carriage; pivot = the hull's hanging point.
 *   "trolley-<kind>": { "w": …, "h": …, "saddle": {x, y}, "frames"?: n }   (optional; layer geometry)
 *     saddle = the same carrier point in the layer image; frames = sheave frames laid side by side, each w wide.
 * Layers: public/art/ships/trolley-<kind>-back.png and -front.png. Draw order: hull, back, carrier, front.
 */
export interface TrolleyMeta {
  kind: string;
  pivot: Pt;
  saddle: Pt;
}
export interface TrolleyLayers {
  back: HTMLImageElement;
  front: HTMLImageElement;
  /** Layer geometry in layout units. */
  w: number;
  h: number;
  saddle: Pt;
  frames: number;
}

export function trolleyMeta(id: string): TrolleyMeta | null {
  const raw = getJson<Record<string, RawMeta>>("art/ships/ships.json")?.[id];
  const t = raw?.trolley as { kind?: string; pivot?: Pt; saddle?: Pt } | undefined;
  if (!t?.kind || !t.saddle) return null;
  const d = densityOf(raw!);
  const saddle = { x: t.saddle.x / d, y: t.saddle.y / d };
  return { kind: t.kind, saddle, pivot: t.pivot ? { x: t.pivot.x / d, y: t.pivot.y / d } : saddle };
}

/** Both layers of a trolley kind once loaded (null until then, or when the art does not exist). */
export function trolleyLayers(kind: string): TrolleyLayers | null {
  const back = art(`ships/trolley-${kind}-back`);
  const front = art(`ships/trolley-${kind}-front`);
  if (!back || !front) return null;
  const raw = getJson<Record<string, RawMeta>>("art/ships/ships.json")?.[`trolley-${kind}`];
  const d = raw ? densityOf(raw) : 2;
  const frames = Math.max(1, (raw?.frames as number) ?? 1);
  const w = ((raw?.w as number) ?? back.width / frames) / d;
  const h = ((raw?.h as number) ?? back.height) / d;
  const sd = raw?.saddle as Pt | undefined;
  return { back, front, w, h, frames, saddle: sd ? { x: sd.x / d, y: sd.y / d } : { x: w / 2, y: h / 2 } };
}

// ─── weapon hardpoints ──────────────────────────────────────────────────────────────────────────────────────

/** A weapon hardpoint (layout units, car-local): ships.json `mounts[i]` is the centre of a painted hardpoint plate,
 *  and its optional `pylon` (image px) sets the pylon height for that mount (default: draw-ship PYLON_ROOF /
 *  PYLON_BELLY). */
export interface MountSpec { x: number; y: number; pylon?: number }
export interface Box { x: number; y: number; w: number; h: number; what?: string }

export function mountSpecs(id: string, meta: HullMeta, grid?: [number, number]): MountSpec[] {
  const raw = getJson<Record<string, RawMeta>>("art/ships/ships.json")?.[id];
  const ms = raw && hullArtFits(id, grid) ? raw.mounts as { x: number; y: number; pylon?: number }[] | undefined : undefined;
  if (!ms) return meta.mounts.map((m) => ({ x: m.x, y: m.y }));
  const d = densityOf(raw!);
  return ms.map((m) => ({ x: m.x / d, y: m.y / d, ...(m.pylon !== undefined ? { pylon: m.pylon / d } : {}) }));
}

/** Zones no weapon may occupy (the drive trolley, roof fittings): ships.json `keepClear`, HD px → layout units. */
export function keepClearBoxes(id: string, grid?: [number, number]): Box[] {
  const raw = getJson<Record<string, RawMeta>>("art/ships/ships.json")?.[id];
  const boxes = raw && hullArtFits(id, grid) ? raw.keepClear as Box[] | undefined : undefined;
  if (!boxes?.length) return [];
  const d = densityOf(raw!);
  return boxes.map((b) => ({ x: b.x / d, y: b.y / d, w: b.w / d, h: b.h / d, what: b.what }));
}

const alphaCache = new Map<string, { w: number; h: number; d: number; a: Uint8ClampedArray } | null>();

/** Opacity of the hull art at a car-local point (layout units): true where the painted hull is solid. */
export function hullSolidAt(id: string, grid: [number, number], x: number, y: number): boolean | null {
  const key = `${id}|${grid.join("x")}`;
  let e = alphaCache.get(key);
  if (e === undefined) {
    const img = hullImage(id, undefined, grid);
    if (!img || typeof document === "undefined" || (img instanceof HTMLImageElement && !img.complete)) return null;
    const cv = document.createElement("canvas");
    cv.width = img.width;
    cv.height = img.height;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx) { alphaCache.set(key, null); return null; }
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const a = new Uint8ClampedArray(cv.width * cv.height);
    for (let i = 0; i < a.length; i++) a[i] = data[i * 4 + 3];
    e = { w: cv.width, h: cv.height, d: cv.width / hullMeta(id, "crawler", grid).w, a };
    alphaCache.set(key, e);
  }
  if (!e) return null;
  const px = Math.floor(x * e.d), py = Math.floor(y * e.d);
  if (px < 0 || py < 0 || px >= e.w || py >= e.h) return false;
  return e.a[py * e.w + px] > 160;
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
  if (id === "heart") return "Isolation Regulator";
  return fl("SYSTEM_FLAVOR", id)?.name ?? (SYSTEMS as Record<string, { name: string }>)[id]?.name ??
    ({ gate: "Gate Seal", bells: "Glass Bells", heart: "The Heart", brood: "Brood Chamber", artillery: "Custody Battery" } as Record<string, string>)[id] ?? id;
}
export function systemDesc(id: string): string {
  return (SYSTEMS as Record<string, { desc: string }>)[id]?.desc ??
    ({
      gate: "The Regent's gate seal. While it holds, the gate stops every hit until two independent weapon or drone sources strike within 2.2 seconds.",
      bells: "The Choir's resonance panes. Hold a helm channel for 12 seconds, or land three hits within one second. Bell damage extends the opening.",
      heart: "Isolation machinery feeding the horizon pull. Disabling it protects the archive inside.",
      brood: "Launches boarders along a grapple. Disable it during their 4-second transit to cut the line.",
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

/** Samples of the opaque hull art (nose lamp, keel and fittings included) for the ward envelope. With `underRoof`,
 *  the drive trolley and grip arms above the roof are left out: the ward wraps the car, the trolley grounds it. */
export function hullBodyPoints(id: string, m: HullMeta, grid: [number, number], underRoof = true): { points: [number, number][]; step: number } | null {
  const step = 2;
  const points: [number, number][] = [];
  if (typeof document === "undefined" || !hullArtFits(id, grid)) return { points, step };
  const img = hullImage(id, undefined, grid);
  // Art that exists but has not loaded yet: ask again later.
  if (!img || (img instanceof HTMLImageElement && !img.complete)) return null;
  const canvas = document.createElement("canvas"); canvas.width = Math.ceil(m.w); canvas.height = Math.ceil(m.h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { points, step };
  ctx.drawImage(img, 0, 0, m.w, m.h);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  // The drive trolley and its grip arms rise above the roof around the cable grip: leave that column out above the
  // roof line, keep any other roof equipment (lamp housings, prisms, cradles).
  const roof = m.gy - 14;
  const gripX = m.cable?.x ?? m.w / 2;
  const half = Math.max(44, m.w * 0.2);
  for (let y = 1; y < canvas.height; y += step) {
    for (let x = 1; x < canvas.width; x += step) {
      if (underRoof && y < roof && Math.abs(x - gripX) < half) continue;
      if (pixels[(y * canvas.width + x) * 4 + 3] > 160) points.push([x, y]);
    }
  }
  return { points, step };
}
