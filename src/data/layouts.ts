// Room layouts (contract ★v2 side-view cutaway, ★v4 TILE 36, ★v5 lifts). Each ship is an ASCII map on its fixed grid
// plus a legend. Every grid row is one DECK; every letter is one rectangular room ('.' = hull without a room). Rooms are
// one deck tall, except the LIFT SHAFT ('l'): a one-tile column spanning the decks, the only way between them (a cage
// rides it). The sim generates DOORS between horizontally adjacent rooms (landing gates at the shaft); there are no
// hatches or ladders. Airlocks sit on the outer ends of decks. The player faces RIGHT, enemies face LEFT.
import type { SystemId } from "../game/ids.ts";

/** Room tile in layout units (contract ★v4: 36 = 72 image px). */
export const TILE = 36;

/** Systems the sim knows: the ten ship systems plus machine-only specials. */
export type SysKey = SystemId | "gate" | "bells" | "heart" | "brood" | "artillery";

export type Dir = "up" | "down" | "left" | "right";

export interface RoomDef {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  system?: SysKey;
  /** Lift shaft (★v5): a 1-tile column spanning decks; the only way between decks. */
  lift?: boolean;
  /** Absolute station tile for manned systems, and which way the console faces. */
  station?: [number, number];
  stationDir?: Dir;
}

export interface AirlockDef {
  room: string;
  x: number;
  y: number;
  /** left/right = an end door on the outer wall; up/down = a roof/belly hatch. */
  side: Dir;
}

export interface LayoutDef {
  cols: number;
  rows: number;
  rooms: RoomDef[];
  airlocks: AirlockDef[];
  face: "left" | "right";
  /** Composite layouts (the player's consist): which car each tile belongs to (-1 none). Doors are only generated
   *  inside a car; `connectors` add the gangway doors and keel hatches between cars. */
  tileCar?: Int8Array;
  connectors?: { ta: number; tb: number; hatch: boolean; lift?: boolean }[];
}

export interface LegendEntry {
  id: string;
  name?: string;
  sys?: SysKey;
  lift?: boolean;
  /** Station offset inside the room. */
  st?: [number, number];
  dir?: Dir;
}

const SYS_LETTER: Record<string, { id: string; sys: SysKey; name: string }> = {
  S: { id: "shields", sys: "shields", name: "Ward Mesh" },
  E: { id: "engines", sys: "engines", name: "Drive" },
  W: { id: "weapons", sys: "weapons", name: "Weapons" },
  H: { id: "helm", sys: "helm", name: "Helm" },
  Y: { id: "sensors", sys: "sensors", name: "Sensors" },
  D: { id: "doors", sys: "doors", name: "Doors" },
  O: { id: "air", sys: "air", name: "Air" },
  M: { id: "medbay", sys: "medbay", name: "Infirmary" },
  R: { id: "drones", sys: "drones", name: "Drone Bay" },
  V: { id: "veil", sys: "veil", name: "Veil" },
  G: { id: "gate", sys: "gate", name: "Gate" },
  B: { id: "brood", sys: "brood", name: "Brood" },
  K: { id: "heart", sys: "heart", name: "Heart" },
  L: { id: "bells", sys: "bells", name: "Bells" },
};

const MANNED: SysKey[] = ["shields", "engines", "weapons", "helm", "sensors", "doors"];

/** Parse an ASCII layout; throws if a letter is not a rectangle. */
export function parseLayout(
  map: string[],
  face: "left" | "right",
  legend: Record<string, LegendEntry> = {},
  airlocks: AirlockDef[] = [],
): LayoutDef {
  const rows = map.length;
  const cols = map[0].length;
  const seen = new Map<string, { x0: number; y0: number; x1: number; y1: number; n: number }>();
  for (let y = 0; y < rows; y++) {
    if (map[y].length !== cols) throw new Error(`layout row ${y} has ${map[y].length} cols, expected ${cols}`);
    for (let x = 0; x < cols; x++) {
      const ch = map[y][x];
      if (ch === "." || ch === " ") continue;
      const r = seen.get(ch);
      if (!r) seen.set(ch, { x0: x, y0: y, x1: x, y1: y, n: 1 });
      else {
        r.x0 = Math.min(r.x0, x);
        r.y0 = Math.min(r.y0, y);
        r.x1 = Math.max(r.x1, x);
        r.y1 = Math.max(r.y1, y);
        r.n++;
      }
    }
  }
  const rooms: RoomDef[] = [];
  for (const [ch, r] of seen) {
    const w = r.x1 - r.x0 + 1;
    const h = r.y1 - r.y0 + 1;
    if (w * h !== r.n) throw new Error(`room '${ch}' is not a rectangle`);
    const lg = legend[ch];
    const def = SYS_LETTER[ch];
    const sys = lg ? lg.sys : def?.sys;
    const id = lg?.id ?? def?.id ?? `room-${ch}`;
    const isLift = ch === "l" || !!lg?.lift;
    const room: RoomDef = { id: isLift ? lg?.id ?? "lift" : id, name: isLift ? lg?.name ?? "Lift Shaft" : lg?.name ?? def?.name ?? "", x: r.x0, y: r.y0, w, h };
    if (isLift) {
      if (w !== 1) throw new Error(`lift '${ch}' must be one tile wide`);
      room.lift = true;
    }
    if (sys) room.system = sys;
    if (sys && MANNED.includes(sys)) {
      let st: [number, number];
      if (lg?.st) st = [r.x0 + lg.st[0], r.y0 + lg.st[1]];
      else if (sys === "helm") st = [face === "right" ? r.x1 : r.x0, r.y1];
      else if (sys === "engines") st = [face === "right" ? r.x0 : r.x1, r.y1];
      else st = [face === "right" ? r.x1 : r.x0, r.y1];
      // Side view: consoles stand against a wall; crew face the console left or right.
      let dir: Dir;
      if (lg?.dir) dir = lg.dir;
      else if (sys === "helm") dir = face;
      else if (sys === "engines") dir = face === "right" ? "left" : "right";
      else dir = st[0] === r.x1 ? "right" : "left";
      room.station = st;
      room.stationDir = dir;
    }
    rooms.push(room);
  }
  rooms.sort((a, b) => a.y - b.y || a.x - b.x);
  const ids = new Set<string>();
  for (const r of rooms) {
    if (ids.has(r.id)) throw new Error(`duplicate room id ${r.id}`);
    ids.add(r.id);
  }
  return { cols, rows, rooms, airlocks, face };
}

// ─── Enemy layouts (★v2 grids). Uppercase = system rooms (see SYS_LETTER), lowercase = plain rooms. ───────────

export interface EnemyLayoutSpec {
  map: string[];
  legend?: Record<string, LegendEntry>;
  airlocks?: AirlockDef[];
}

export const ENEMY_LAYOUTS: Record<string, EnemyLayoutSpec> = {
  "packet-leech": {
    map: [
      "WWlEESS",
      "HHlaaaa",
      ".cldd..",
    ],
    legend: { a: { id: "tank", name: "Buffer Tank" }, b: { id: "buffer", name: "Buffer" }, c: { id: "intake", name: "Intake" }, d: { id: "arm", name: "Clamp Arm" } },
  },
  "cable-wraith": {
    map: [
      "WWWEElSS",
      "HHHHHldd",
    ],
    legend: { a: { id: "spool", name: "Spool" }, b: { id: "shear", name: "Shear Gallery" }, c: { id: "cable", name: "Cable Run" }, d: { id: "tail", name: "Severed Tail" } },
  },
  "rust-prophet": {
    map: [
      ".al.",
      "WWlb",
      "YYlS",
      "ccld",
      ".el.",
    ],
    legend: { a: { id: "horn-top", name: "Upper Horn" }, b: { id: "mast", name: "Mast" }, Y: { id: "sensors", name: "Listening Horn", sys: "sensors" }, c: { id: "lamp", name: "Warning Lamp" }, d: { id: "base", name: "Mast Base" }, e: { id: "anchor", name: "Anchor" } },
  },
  "scrap-foreman": {
    map: [
      "WWWlEES",
      "HHHlccc",
      ".ddlee.",
    ],
    legend: { a: { id: "crane", name: "Crane Arm" }, b: { id: "cab", name: "Inspection Cab" }, c: { id: "winch", name: "Winch" }, d: { id: "container", name: "Container" } },
  },
  "scavenger-skiff": {
    map: [
      "WWlEES",
      "HHlOOM",
      ".Ylcc.",
    ],
    legend: { c: { id: "hold", name: "Net Hold" } },
    airlocks: [
      { room: "hold", x: 4, y: 2, side: "down" },
      { room: "medbay", x: 5, y: 1, side: "right" },
    ],
  },
  "static-nest": {
    map: [
      "WWlSS",
      "YYlBB",
      "ccldd",
      ".el..",
    ],
    legend: { a: { id: "comb", name: "Comb" }, B: { id: "brood", name: "Brood Chamber", sys: "brood" }, c: { id: "cells-a", name: "Cells" }, d: { id: "cells-b", name: "Cells" }, e: { id: "vent", name: "Vent" } },
  },
  "ferric-colossus": {
    map: [
      "WWWWlSS.",
      "YYYYlRRR",
      "FFFFleee",
      ".ggglhh.",
    ],
    legend: {
      a: { id: "crucible", name: "Crucible" }, b: { id: "bellows", name: "Bellows" }, c: { id: "flue", name: "Flue" },
      F: { id: "furnace", name: "Furnace Mouth" }, d: { id: "ingot", name: "Ingot Store" }, e: { id: "slag", name: "Slag Pit" },
      g: { id: "footing-a", name: "Footing" }, h: { id: "footing-b", name: "Footing" },
    },
  },
  "iron-regent": {
    map: [
      "..aalWWW.",
      "YYYYlGGDD",
      "SSSSleeee",
      "fffflhhhh",
      "..jjlkk..",
    ],
    legend: {
      a: { id: "crown-l", name: "Crown" }, b: { id: "crown-r", name: "Crown" }, c: { id: "wing-l", name: "Gate Wing" },
      G: { id: "gate", name: "Gate Seal", sys: "gate" }, d: { id: "hall-l", name: "Toll Hall" }, e: { id: "hall-r", name: "Toll Hall" },
      f: { id: "wing-l2", name: "Gate Wing" }, g: { id: "vault-l", name: "Route Vault" }, h: { id: "vault-r", name: "Route Vault" },
      i: { id: "wing-r", name: "Gate Wing" }, j: { id: "keel-l", name: "Gate Footing" }, k: { id: "keel-r", name: "Gate Footing" },
    },
  },
  "prism-widow": {
    map: [
      "WWWlEVV",
      "HHHlSSS",
      ".ddlee.",
    ],
    legend: { a: { id: "lens", name: "Lens" }, b: { id: "spinner", name: "Spinneret" }, c: { id: "loom", name: "Web Loom" }, d: { id: "leg-l", name: "Leg" }, e: { id: "leg-r", name: "Leg" } },
  },
  "glass-echo": {
    map: [
      "WWlSE",
      "HHlbb",
    ],
    legend: { E: { id: "engines", name: "Rotors", sys: "engines" }, a: { id: "bell", name: "Bell" }, b: { id: "fin", name: "Glass Fin" } },
  },
  "wire-weaver": {
    map: [
      "WWWlEEE",
      "HHRlSSS",
      ".ddlfff",
    ],
    legend: { a: { id: "arm", name: "Arm" }, b: { id: "spool-a", name: "Spool" }, c: { id: "spool-b", name: "Spool" }, d: { id: "frame", name: "Frame" }, e: { id: "tension", name: "Tensioner" }, f: { id: "reel", name: "Reel" } },
  },
  "glass-choir": {
    map: [
      "ffflgggg",
      "WWWlSSYY",
      "aaalbbbb",
    ],
    legend: {
      W: { id: "weapons", name: "First Bell", sys: "weapons" }, S: { id: "shields", name: "Second Bell", sys: "shields" },
      Y: { id: "sensors", name: "Third Bell", sys: "sensors" },
      f: { id: "frame-a", name: "Bell Frame" }, g: { id: "frame-b", name: "Bell Frame" },
      x: { id: "strut-a", name: "Strut" }, y: { id: "strut-b", name: "Strut" },
      a: { id: "lip-a", name: "Bell Lip" }, b: { id: "lip-b", name: "Bell Lip" }, c: { id: "lip-c", name: "Bell Lip" },
    },
  },
  "coil-serpent": {
    map: [
      "WWWlEESS",
      "HHHldddd",
    ],
    legend: { a: { id: "head", name: "Gripper Head" }, b: { id: "coil-b", name: "Coil" }, c: { id: "coil-c", name: "Coil" }, d: { id: "coil-d", name: "Coil" }, e: { id: "coil-e", name: "Coil" }, f: { id: "tail", name: "Tail" } },
  },
  "echo-tender": {
    map: [
      ".SSlWWEE",
      "HHYlOOOO",
      ".ddlMMM.",
    ],
    legend: { a: { id: "hold-a", name: "Roof Hold" }, b: { id: "hall", name: "Hall" }, c: { id: "tail", name: "Tail Hold" }, d: { id: "quarters", name: "Quarters" }, e: { id: "keel", name: "Keel Hold" } },
  },
  "hollow-choir": {
    map: [
      ".aaalWWWW",
      "YYYYlLLLL",
      "SSSSlffff",
      ".ggglhhh.",
      "..jjlkk..",
    ],
    legend: {
      a: { id: "mask-a", name: "Mask" }, b: { id: "pipes-a", name: "Organ Pipes" }, c: { id: "spine-a", name: "Spine" },
      L: { id: "bells", name: "Glass Bells", sys: "bells" }, d: { id: "spine-b", name: "Spine" },
      e: { id: "chorister-a", name: "Chorister" }, f: { id: "chorister-b", name: "Chorister" },
      g: { id: "mask-b", name: "Mask" }, h: { id: "chorister-c", name: "Chorister" }, i: { id: "mask-c", name: "Mask" },
      j: { id: "chains", name: "Hall Chains" },
    },
  },
  "gate-sentinel": {
    map: [
      ".WWlSS",
      "YYYlDD",
      "bbblcc",
      ".ddl..",
    ],
    legend: { Y: { id: "sensors", name: "Key Scanner", sys: "sensors" }, a: { id: "eye", name: "Scanner Eye" }, b: { id: "bars", name: "Barred Gate" }, c: { id: "lock", name: "Lock Hall" }, d: { id: "footing", name: "Checkpoint Footing" } },
  },
  "null-marshal": {
    map: [
      "WWWElSS",
      "HHBBlcc",
      ".dddlff",
    ],
    legend: { a: { id: "armour", name: "Armour Deck" }, B: { id: "brood", name: "Trooper Bay", sys: "brood" }, c: { id: "warrant", name: "Warrant Room" }, d: { id: "brig", name: "Brig" }, e: { id: "cells", name: "Holding Cells" } },
  },
  "ash-moth": {
    map: [
      "WWlSS",
      "HHlEE",
      ".ylz.",
    ],
    legend: { a: { id: "fin-a", name: "Radiator Fin" }, b: { id: "fin-b", name: "Radiator Fin" }, x: { id: "hopper", name: "Ash Hopper" }, E: { id: "engines", name: "Rotors", sys: "engines" }, y: { id: "vanes", name: "Cooling Vanes" }, z: { id: "fin-c", name: "Radiator Fin" } },
  },
  "grave-reaver": {
    map: [
      "WWWWlEEE",
      "HHHHlSSS",
      "eeeelggg",
    ],
    legend: { a: { id: "claw-a", name: "Claw" }, b: { id: "saw", name: "Saw Deck" }, c: { id: "gut", name: "Dismantling Bay" }, d: { id: "cores", name: "Core Store" }, e: { id: "claw-b", name: "Claw" }, f: { id: "crusher", name: "Crusher" }, g: { id: "tail", name: "Tail" } },
  },
  "demolition-engine": {
    map: [
      ".WWWlERR",
      "HHHHlSSS",
      "YYYYleee",
      ".ffflggg",
    ],
    legend: { a: { id: "fuse-a", name: "Fuse" }, b: { id: "fuse-b", name: "Fuse" }, c: { id: "charges", name: "Charge Rack" }, d: { id: "timer", name: "Countdown" }, e: { id: "ballast", name: "Ballast" }, f: { id: "ram", name: "Ram" }, g: { id: "tail", name: "Tail" } },
  },
  "quarantine-drone": {
    map: [
      "WWlSE",
      "HHlaa",
      ".cl..",
    ],
    legend: { E: { id: "engines", name: "Rotors", sys: "engines" }, a: { id: "clamp", name: "Seal Clamp" }, b: { id: "seam-a", name: "Red Seam" }, c: { id: "seam-b", name: "Red Seam" } },
  },
  "blackout-core": {
    map: [
      "..aalWbb.",
      ".SSSlddd.",
      "YYYYlKKRR",
      "fffflkkDD",
      ".jjjlmmm.",
      "...nlo...",
    ],
    legend: {
      a: { id: "cut", name: "Custody: Cut", sys: "artillery" }, W: { id: "strike", name: "Custody: Strike", sys: "artillery" },
      b: { id: "breach", name: "Custody: Breach", sys: "artillery" }, f: { id: "jam", name: "Custody: Jam", sys: "artillery" },
      c: { id: "shell-a", name: "Inner Shell" }, d: { id: "shell-b", name: "Inner Shell" }, e: { id: "conduit-a", name: "Conduit" },
      K: { id: "heart", name: "The Heart", sys: "heart" }, g: { id: "conduit-b", name: "Conduit" }, h: { id: "conduit-c", name: "Conduit" },
      k: { id: "vault", name: "Vault" }, i: { id: "conduit-d", name: "Conduit" }, j: { id: "shell-c", name: "Outer Shell" },
      l: { id: "archive", name: "Archive" }, m: { id: "shell-d", name: "Outer Shell" }, n: { id: "keel", name: "Keel" },
    },
  },
};

export function enemyLayout(id: string): LayoutDef {
  const spec = ENEMY_LAYOUTS[id];
  if (!spec) throw new Error(`no layout for ${id}`);
  return parseLayout(spec.map, "left", spec.legend ?? {}, spec.airlocks ?? []);
}

/** Fixed grids from the contract (★v2/★v4) — validated by tests against the maps above. */
export const ENEMY_GRIDS: Record<string, [number, number]> = {
  "packet-leech": [7, 3], "cable-wraith": [8, 2], "rust-prophet": [4, 5], "scrap-foreman": [7, 3],
  "scavenger-skiff": [6, 3], "static-nest": [5, 4], "ferric-colossus": [8, 4], "iron-regent": [9, 5],
  "prism-widow": [7, 3], "glass-echo": [5, 2], "wire-weaver": [7, 3], "glass-choir": [8, 3], "coil-serpent": [8, 2],
  "echo-tender": [8, 3], "hollow-choir": [9, 5], "gate-sentinel": [6, 4], "null-marshal": [7, 3], "ash-moth": [5, 3],
  "grave-reaver": [8, 3], "demolition-engine": [8, 4], "quarantine-drone": [5, 3], "blackout-core": [9, 6],
};
