// Hull art geometry (layout units). public/art/ships/ships.json (art workstream, image pixels at density 2) is
// authoritative at runtime when its grid matches the current layout (★v4: TILE 36); otherwise — and before any art
// exists — these procedural defaults keep the whole game consistent: canvas size, room-grid offset, mounts, glow
// points, the carrier grip (`cable`) and the consist couplers.
import { ENEMY_GRIDS, TILE } from "./layouts.ts";

export interface Pt {
  x: number;
  y: number;
}

export interface HullMeta {
  w: number;
  h: number;
  /** Room grid offset inside the hull image. */
  gx: number;
  gy: number;
  /** Grid size the metadata was made for. */
  cols?: number;
  rows?: number;
  mounts: Pt[];
  glow: { x: number; y: number; r: number }[];
  /** Where the drive trolley grips the carrier cable (crawlers and the tender's cars). */
  cable?: Pt;
  /** Lead car: where a rear car couples (left end). Rear car: its front coupler (right end). */
  couplerRear?: Pt;
  couplerFront?: Pt;
  /** Lead car: where the keel car hangs. Keel car: its hanger top. */
  keelHang?: Pt;
  hangTop?: Pt;
  cls?: string;
  /** Livery: the lamp ramp in the art to recolour. */
  lampColors?: string[];
}

export type Mobility = "player" | "rear" | "keel" | "crawler" | "installation" | "flier";

/** Procedural hull geometry for a grid. */
export function fallbackHull(id: string, mobility: Mobility = "crawler", grid?: [number, number]): HullMeta {
  if (id === "gate-warden" || id === "sealing-drone") {
    return { w: 72, h: 72, gx: 0, gy: 0, mounts: [{ x: 6, y: 36 }], glow: [{ x: 36, y: 36, r: 6 }] };
  }
  const [cols, rows] = grid ?? ENEMY_GRIDS[id] ?? [4, 2];
  const gw = cols * TILE;
  const gh = rows * TILE;
  const top = mobility === "keel" ? 14 : mobility === "flier" ? 30 : mobility === "installation" ? 26 : 60;
  const bottom = mobility === "keel" ? 16 : 18;
  // Side margins: the lead car's nose cupola needs room on the right; cars couple tightly.
  const left = mobility === "player" ? 8 : mobility === "rear" ? 6 : mobility === "keel" ? 12 : 16;
  const right = mobility === "player" ? 40 : mobility === "rear" ? 4 : mobility === "keel" ? 12 : 16;
  const w = gw + left + right;
  const h = gh + top + bottom;
  const meta: HullMeta = { w, h, gx: left, gy: top, cols, rows, mounts: [], glow: [] };
  if (mobility === "player" || mobility === "rear" || mobility === "crawler") meta.cable = { x: Math.round(w / 2), y: 8 };
  if (mobility === "player") {
    meta.couplerRear = { x: 2, y: top + Math.round(TILE * 2.5) };
    meta.glow = [{ x: w - 6, y: top + TILE * 1.5, r: 9 }, { x: w - 22, y: top + 8, r: 5 }];
  }
  if (mobility === "rear") meta.couplerFront = { x: w - 2, y: top + Math.round(TILE * 2.5) };
  if (mobility === "keel") meta.hangTop = { x: left + TILE * 2.5, y: 0 };
  if (mobility === "crawler" || mobility === "flier" || mobility === "installation") {
    meta.glow = [{ x: 8, y: top + Math.round(gh / 2), r: 6 }];
  }
  return meta;
}
