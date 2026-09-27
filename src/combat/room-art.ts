// Purpose-built cutaway bays. One fixture and one visual identity per room; no repeating wallpaper.
import { art } from "../core/assets";
import type { Gfx } from "../core/gfx";
import { P } from "../core/palette";
import { PROP_BOUNDS } from "./room-prop-bounds";
import { roomArchitecture } from "./room-detail";
import type { SimRoom, SimShip } from "./sim/model";

export const ROOM_STYLE: Record<string, { light: string; wall: string }> = {
  engines: { light: P.amber1, wall: "#42372e" },
  weapons: { light: P.ember1, wall: "#45303a" },
  shields: { light: P.teal1, wall: "#214b51" },
  helm: { light: P.brass1, wall: "#36485b" },
  air: { light: P.verd0, wall: "#304c42" },
  medbay: { light: P.ivory0, wall: "#526265" },
  sensors: { light: P.violet0, wall: "#413c60" },
  doors: { light: P.steel3, wall: "#414d5c" },
  drones: { light: P.amber1, wall: "#404834" },
  veil: { light: P.violet1, wall: "#302944" },
  gate: { light: P.brass0, wall: "#4a4031" },
  bells: { light: P.violet0, wall: "#493961" },
  heart: { light: P.ember0, wall: "#572d34" },
  brood: { light: P.ember1, wall: "#3a4032" },
  artillery: { light: P.ember1, wall: "#452c36" },
};

/** Distinct built-in architecture, large Krea machinery and an uncluttered foreground crew path. */
export function drawBay(g: Gfx, ship: SimShip, room: SimRoom, x: number, y: number, w: number, h: number, kind: string, live: boolean, t: number) {
  const key = room.sys?.id ?? kind;
  const style = ROOM_STYLE[key];
  const enemy = ship.side === 1;
  const accent = style?.light ?? (enemy ? enemyAccent(ship) : P.ivory2);
  const wall = style?.wall ?? (enemy ? "#252f3b" : "#393c40");
  const floor = y + h - 5;
  const furnishing = /horn|array/i.test(room.name) ? "sensors"
    : /ballast|tank|reserve|sump/i.test(room.name) ? "air"
    : /bench|workshop|tool|service/i.test(room.name) ? "workshop"
    : /bunk|quarters/i.test(room.name) ? "bunks"
    : /rack|magazine|armoury/i.test(room.name) ? "weapons" : "stores";
  const enemyProp = /crown|bridge|watch/i.test(room.name) ? "helm"
    : /wing|jaw|gate footing/i.test(room.name) ? "gate"
    : /toll|hall|bench|service/i.test(room.name) ? "workshop"
    : /buffer|tank|intake|clamp|coil|winch|ballast|keel/i.test(room.name) ? "enemy-buffer" : "enemy-vault";
  const prop = enemy && !style ? enemyProp
    : key === "corridor" || key === "galley" ? "mess" : key === "artillery" ? "weapons" : key === "hold" || key === "quarters" ? furnishing : key;
  g.rect(x, y, w, h, P.ink0);
  g.rect(x + 2, y + 2, w - 4, h - 4, wall);
  g.alpha(.09, () => g.rect(x + 3, y + 3, w - 6, h - 9, accent));
  g.clip(x + 3, y + 3, w - 6, h - 5, () => {
    roomArchitecture(g, prop, x, y, w, h, accent, live, enemy, t);
    // Opaque bounds matter: transparent padding used to shrink every prop into the middle of an empty bay.
    const bounds = PROP_BOUNDS[prop];
    const img = bounds ? art(`props/bay-${prop}`) : null;
    if (img && bounds) {
      const [sx, sy, ex, ey] = bounds, sw = ex - sx, sh = ey - sy;
      const wide = ["helm", "socket", "medbay", "enemy-buffer"].includes(prop);
      const maxW = Math.max(16, Math.min(w - 12, w * (wide ? .7 : .56)));
      const maxH = h - (prop === "medbay" ? 10 : 8);
      const scale = Math.min(maxW / sw, maxH / sh);
      const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
      const center = x + w * (room.station >= 0 ? room.stationDir === "left" ? .57 : .49 : .51);
      const px = Math.round(Math.max(x + 5, Math.min(x + w - dw - 5, center - dw / 2)));
      g.alpha(.4, () => g.rect(px - 2, floor - 1, dw + 4, 2, P.ink0));
      g.ctx.drawImage(img, sx, sy, sw, sh, px, Math.round(floor - dh), dw, dh);
      if (live && style) g.alpha(.12 + Math.sin(t * 1.4) * .035, () => g.hline(px + 2, floor - 1, Math.max(1, dw - 4), accent));
    } else fixture(g, key, x + w * .5, floor - 10, Math.max(16, Math.min(48, w - 22)), accent, live, t, enemy);
  });
  // Structural lips, ceiling lamps and bolts replace the former textual nameplates.
  g.rect(x, y, 2, h, enemy ? P.steel0 : P.ivory4);
  g.rect(x + w - 2, y, 2, h, enemy ? P.steel0 : P.ivory4);
  g.hline(x + 2, y + 1, w - 4, P.ink1);
  g.hline(x + 2, y + 2, w - 4, enemy ? P.steel0 : P.ivory4);
  g.rect(x + 2, y + h - 2, w - 4, 2, enemy ? P.steel0 : P.ivory4);
  for (const dx of [4, w - 6]) { g.rect(x + dx, y + 3, 1, 1, P.steel2); g.rect(x + dx, y + h - 3, 1, 1, P.ink0); }
  if (w > 55) {
    g.rect(x + w - 18, y + 2, 10, 3, P.ink0);
    g.hline(x + w - 17, y + 3, 8, room.sys && !live ? P.steel0 : accent);
  }
}

function enemyAccent(ship: SimShip): string {
  return /glass|violet/.test(ship.enemy?.tint ?? "") ? P.violet1 : /black|ember/.test(ship.enemy?.tint ?? "") ? P.ember1 : P.copper0;
}

function fixture(g: Gfx, kind: string, cx: number, cy: number, w: number, a: string, live: boolean, t: number, enemy: boolean) {
  const x = Math.round(cx - w / 2), y = Math.round(cy - 9);
  const lamp = live ? a : P.steel1;
  const metal = enemy ? P.steel0 : P.ivory3;
  const plate = (px: number, py: number, pw: number, ph: number, col: string = metal) => {
    g.rect(px - 1, py - 1, pw + 2, ph + 2, P.ink0); g.rect(px, py, pw, ph, col); g.hline(px, py, pw, P.steel2);
  };
  switch (kind) {
    case "shields": case "veil": {
      // Broad ring cage around a suspended field core.
      g.circle(cx, cy, 10, P.ink0, true); g.circle(cx, cy, 9, metal, true);
      g.circle(cx, cy, 7, P.ink2, true); g.circle(cx, cy, 5, lamp);
      g.line(cx - 9, cy, cx + 9, cy, lamp); g.vline(cx, cy - 9, 18, lamp);
      g.circle(cx, cy, 2, live ? P.ivory0 : P.steel0, true);
      for (const dx of [-16, 12]) { plate(cx + dx, cy - 7, 4, 15); g.rect(cx + dx + 1, cy - 4, 2, 7, lamp); }
      break;
    }
    case "engines": {
      // Horizontal flywheel and traction motor; visible copper winding bank.
      plate(x, y + 2, w - 9, 16, P.copper3);
      for (let dx = 3; dx < w - 12; dx += 4) g.rect(x + dx, y + 3, 2, 14, P.copper0);
      g.circle(x + w - 7, cy + 1, 9, P.ink0, true); g.circle(x + w - 7, cy + 1, 7, P.steel1, true);
      g.circle(x + w - 7, cy + 1, 4, P.ink2, true);
      const angle = live ? t * 1.8 : 0;
      g.line(x + w - 7, cy + 1, x + w - 7 + Math.cos(angle) * 6, cy + 1 + Math.sin(angle) * 6, lamp);
      g.rect(x + 2, y - 1, 10, 2, lamp); break;
    }
    case "weapons": case "artillery": {
      // Weapon breech cradle and three hanging payloads.
      plate(x, y + 6, w, 11, P.steel0); g.rect(x + 3, y + 9, w - 6, 4, P.ink1);
      for (let k = 0; k < 3; k++) {
        const sx = x + 4 + k * Math.floor((w - 9) / 3);
        g.rect(sx, y - 1, 5, 13, P.ink0); g.rect(sx + 1, y, 3, 10, P.ivory2); g.rect(sx + 1, y, 3, 3, lamp);
      }
      g.hline(x, y + 18, w, a); break;
    }
    case "air": {
      // Twin green pressure vessels, pipe bridge, analog gauge.
      for (const dx of [0, 15]) {
        plate(cx - 16 + dx, y, 11, 20, P.verd3);
        g.rect(cx - 14 + dx, y + 2, 3, 15, P.verd1);
        g.hline(cx - 16 + dx, y + 5, 11, P.steel2); g.hline(cx - 16 + dx, y + 16, 11, P.steel0);
      }
      g.hline(cx - 10, y - 2, 22, P.copper0); g.circle(cx + 15, cy, 4, P.ivory1, true); g.line(cx + 15, cy, cx + 17, cy - 2, P.ink1); break;
    }
    case "medbay": {
      // Recognisable white bed, pillow, medical cross and heart monitor.
      plate(x, y + 12, w, 6, P.ivory1); g.rect(x + 2, y + 9, 9, 3, P.ivory0);
      g.rect(x + 14, y + 11, w - 16, 5, P.verd2);
      g.vline(x + 2, y + 18, 3, P.steel3); g.vline(x + w - 3, y + 18, 3, P.steel3);
      plate(x + w - 15, y, 14, 8, P.ink2); g.hline(x + w - 13, y + 4, 10, lamp);
      g.line(x + w - 9, y + 4, x + w - 7, y + 1, lamp);
      g.rect(x + 2, y + 1, 9, 3, P.verd0); g.rect(x + 5, y - 2, 3, 9, P.verd0); break;
    }
    case "helm": {
      // Wide forward glazing, sky, diagonal bracing and a chart table.
      plate(x - 3, y, w + 6, 16, P.ink3);
      g.rect(x - 1, y + 2, w + 2, 11, P.teal4);
      g.line(x, y + 11, x + w, y + 5, P.teal2);
      for (let dx = 10; dx < w; dx += 15) g.vline(x + dx, y + 1, 14, P.steel0);
      g.rect(x + 3, y + 16, w - 6, 4, P.ivory2); g.hline(x + 6, y + 16, w - 12, lamp); break;
    }
    case "sensors": {
      // Oscilloscope wall: one radar screen and an identifiable horn antenna.
      plate(x, y, Math.max(16, w - 15), 18, P.ink2);
      g.circle(x + 10, cy, 6, P.violet2); g.line(x + 10, cy, x + 10 + Math.cos(t) * 5, cy + Math.sin(t) * 5, lamp);
      for (let i = 0; i < 7; i++) g.vline(x + w - 12 + i * 2, cy - i, i * 2 + 1, P.copper0);
      g.hline(x + w - 13, cy + 10, 14, P.steel2); break;
    }
    case "doors": case "gate": {
      // A physical bulkhead motor with segmented blast-door shutters.
      plate(x + 3, y - 1, w - 6, 21, P.steel0);
      for (let i = 0; i < 5; i++) { g.hline(x + 4, y + 2 + i * 4, w - 8, P.ink2); }
      g.vline(cx, y, 19, P.ink0); g.rect(cx - 3, cy - 2, 6, 4, lamp); break;
    }
    case "drones": case "brood": {
      // Two hanging drone cradles, yellow gantry and folded rotor wings.
      g.rect(x, y, w, 3, P.brass2);
      for (const dx of [9, w - 10]) {
        g.vline(x + dx, y, 8, P.steel2); plate(x + dx - 6, y + 8, 12, 8, metal);
        g.hline(x + dx - 10, y + 6, 20, P.steel3); g.rect(x + dx + 2, y + 10, 3, 3, lamp);
      } break;
    }
    case "heart": case "reactor": case "bells": {
      const bell = kind === "bells";
      for (let dy = -9; dy < 10; dy++) {
        const half = bell ? Math.round(5 + (dy + 9) * 0.4) : Math.round(Math.sqrt(Math.max(0, 100 - dy * dy)));
        g.rect(cx - half, cy + dy, half * 2, 1, dy % 4 === 0 ? metal : lamp);
      }
      g.vline(cx - 15, y - 1, 23, P.steel2); g.vline(cx + 15, y - 1, 23, P.steel2);
      g.hline(cx - 16, y - 1, 33, metal); break;
    }
    case "socket": {
      // Empty refit rails, with a clear vacant center.
      g.hline(x, y + 3, w, P.steel1); g.hline(x, y + 17, w, P.steel1);
      for (const dx of [0, w - 5]) { g.rect(x + dx, y + 3, 5, 15, P.steel0); g.rect(x + dx + 1, y + 5, 2, 3, P.brass1); }
      g.box(cx - 7, cy - 5, 14, 11, P.steel1); g.hline(cx - 3, cy, 7, P.steel2); g.vline(cx, cy - 3, 7, P.steel2); break;
    }
    case "corridor": case "quarters": case "galley": {
      if (enemy) { fixture(g, "reactor", cx, cy, w, a, live, t, true); break; }
      plate(x + 2, y + 13, w - 4, 3, P.brass4);
      g.vline(x + 6, y + 16, 5, P.steel1); g.vline(x + w - 7, y + 16, 5, P.steel1);
      for (const dx of [6, w - 14]) { g.rect(x + dx, y + 8, 5, 5, P.ivory1); g.box(x + dx + 5, y + 9, 2, 3, P.ivory1); }
      g.rect(cx - 9, y - 1, 18, 8, P.ink2); g.hline(cx - 6, y + 3, 12, P.brass1); break;
    }
    default: {
      // Storage uses two broad cargo shapes, not stacks filling every tile.
      for (const [dx, dy, bw] of [[0, 5, Math.floor(w * 0.55)], [Math.floor(w * 0.57), 1, Math.floor(w * 0.4)]]) {
        plate(x + dx, y + dy, bw, 18 - dy, enemy ? P.steel0 : P.brass4);
        g.vline(x + dx + 3, y + dy + 1, 16 - dy, P.ink2);
        g.rect(x + dx + 6, y + dy + 3, Math.max(3, bw - 10), 3, a);
      }
    }
  }
}
