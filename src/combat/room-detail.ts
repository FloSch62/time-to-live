// Built-in architecture around the Krea furnishings. Details follow the room's purpose and leave a foreground path.
import type { Gfx } from "../core/gfx";
import { P } from "../core/palette";

export function roomArchitecture(g: Gfx, kind: string, x: number, y: number, w: number, h: number, accent: string, live: boolean, enemy: boolean, t: number) {
  const floor = y + h - 5, right = x + w - 5, top = y + 4;
  const metal = enemy ? P.steel0 : P.ivory4;
  const trim = enemy ? P.steel1 : P.ivory3;
  const light = live ? accent : P.steel1;
  const panel = (px: number, py: number, pw: number, ph: number, color: string = metal) => {
    g.rect(px - 1, py - 1, pw + 2, ph + 2, P.ink0);
    g.rect(px, py, pw, ph, color); g.hline(px, py, pw, trim);
    if (pw > 8 && ph > 7) { g.rect(px + 2, py + 2, 1, 1, P.steel2); g.rect(px + pw - 3, py + ph - 3, 1, 1, P.ink1); }
  };
  const pipe = (px: number, py: number, pw: number, drop: number, color: string = P.copper2) => {
    g.rect(px, py, pw, 3, P.ink0); g.hline(px, py + 1, pw, color);
    if (drop) { g.rect(px + pw - 3, py, 3, drop, P.ink0); g.vline(px + pw - 2, py + 1, drop - 1, color); }
    for (let dx = 8; dx < pw - 3; dx += 17) g.vline(px + dx, py, 3, trim);
  };
  const gauge = (px: number, py: number, r = 3) => {
    g.circle(px, py, r + 1, P.ink0, true); g.circle(px, py, r, P.ivory2, true);
    g.line(px, py, px + 1, py - r + 1, P.ink1);
  };
  const screen = (px: number, py: number, pw: number, ph: number, color = light) => {
    panel(px, py, pw, ph, P.ink2);
    g.alpha(live ? 0.28 : 0.1, () => g.rect(px + 1, py + 1, pw - 2, ph - 2, color));
    for (let dx = 2; dx < pw - 2; dx += 3) g.vline(px + dx, py + ph - 3 - (dx % 5), 2 + dx % 5, color);
    g.hline(px + 2, py + ph - 2, pw - 4, P.steel0);
  };
  const vents = (px: number, py: number, pw: number, ph: number) => {
    panel(px, py, pw, ph, P.ink2);
    for (let yy = py + 2; yy < py + ph - 1; yy += 3) { g.hline(px + 2, yy, pw - 4, metal); g.hline(px + 2, yy + 1, pw - 4, P.ink0); }
  };
  const cabinet = (px: number, py: number, pw: number, ph: number, color: string = metal) => {
    panel(px, py, pw, ph, color);
    g.vline(px + pw / 2, py + 2, ph - 3, P.ink1);
    g.rect(px + pw / 2 - 3, py + ph * .5, 2, 1, P.ivory2); g.rect(px + pw / 2 + 2, py + ph * .5, 2, 1, P.ivory2);
    g.hline(px + 2, py + ph - 3, pw - 4, P.ink1);
  };
  const tank = (px: number, py: number, th: number, color: string) => {
    panel(px, py + 2, 8, th - 2, color); g.rect(px + 2, py, 4, 2, trim);
    g.vline(px + 1, py + 3, th - 4, accent);
    g.hline(px - 1, py + 6, 10, metal); g.hline(px - 1, py + th - 4, 10, metal);
    g.rect(px + 3, py - 2, 2, 2, P.copper0);
  };
  const crate = (px: number, py: number, pw: number, ph: number) => {
    panel(px, py, pw, ph, enemy ? P.steel0 : P.brass5);
    g.vline(px + 3, py + 1, ph - 2, trim); g.vline(px + pw - 4, py + 1, ph - 2, trim);
    g.rect(px + pw / 2 - 2, py + 3, 4, 2, P.ivory2); g.hline(px + 1, py + ph - 3, pw - 2, P.ink1);
  };
  // Recessed wall ribs and service conduit; the foreground is a continuous walkable deck.
  for (let dx = 18; dx < w - 7; dx += 27) {
    g.vline(x + dx, top, h - 9, P.ink2); g.alpha(.26, () => g.vline(x + dx + 1, top, h - 10, trim));
    g.rect(x + dx, top + 1, 1, 1, trim);
  }
  g.rect(x + 3, floor - 1, w - 6, 5, enemy ? P.ink2 : P.ink3);
  for (let dx = 7; dx < w - 5; dx += 13) { g.hline(x + dx, floor + 1, 7, P.steel0); g.rect(x + dx, floor + 3, 1, 1, metal); }
  const usableH = Math.min(25, h - 10);
  const tallY = floor - usableH;
  switch (kind) {
    case "engines":
      pipe(x + 5, top + 1, w - 11, 11); pipe(x + 9, floor - 5, w - 19, 0, P.brass4);
      cabinet(x + 7, floor - 19, 18, 17, P.copper4); gauge(x + 13, floor - 15); gauge(x + 21, floor - 15, 2);
      vents(right - 23, floor - 19, 20, 17);
      for (let yy = floor - 12; yy < floor - 3; yy += 3) g.hline(x + 10, yy, 11, P.copper1);
      break;
    case "weapons": case "artillery":
      pipe(x + 6, top + 1, w - 12, 7, P.steel1);
      g.vline(x + w * .56, top + 2, 7, P.brass3); g.box(x + w * .56 - 2, top + 9, 5, 3, P.brass2);
      panel(x + 7, floor - 22, 17, 19, P.copper4);
      for (let i = 0; i < 3; i++) { const bx = x + 9 + i * 5; g.rect(bx, floor - 18, 3, 12, P.ivory2); g.rect(bx + 1, floor - 21, 1, 3, P.ember1); g.hline(bx, floor - 8, 3, P.brass2); }
      if (w > 85) { crate(right - 19, floor - 10, 17, 8); crate(right - 16, floor - 20, 14, 8); }
      break;
    case "shields": case "veil":
      pipe(x + 5, top + 2, w - 10, 17, kind === "veil" ? P.violet2 : P.teal3);
      for (const px of [x + 7, right - 11]) {
        panel(px, floor - 23, 9, 21, P.ink3);
        for (let yy = floor - 20; yy < floor - 4; yy += 4) { g.hline(px + 2, yy, 5, P.steel1); g.rect(px + 3, yy + 1, 3, 1, light); }
      }
      g.alpha(.28, () => { g.circle(x + w * .48, floor - 12, 13, light); g.hline(x + 17, floor - 3, w - 33, light); });
      break;
    case "helm":
      panel(x + 5, top + 1, w - 10, h - 13, P.ink1);
      g.rect(x + 7, top + 3, w - 14, h - 17, P.teal4);
      for (let i = 0; i < 4; i++) {
        const px = x + 9 + i * (w - 20) / 4;
        g.line(px, top + 4, px + 9, top + 12, P.teal3); g.rect(px + 5, top + 6 + i % 3, 1, 1, P.teal1);
        if (i) { g.vline(px - 4, top + 1, h - 13, metal); g.vline(px - 3, top + 1, h - 13, P.ink0); }
      }
      g.hline(x + 5, floor - 2, w - 10, P.brass3); break;
    case "medbay":
      g.rect(x + 4, top, w - 8, h - 10, P.ivory3); g.hline(x + 4, top + 11, w - 8, P.verd3);
      cabinet(x + 7, top + 3, 17, 12, P.ivory1);
      g.rect(x + 13, top + 5, 3, 7, P.ember2); g.rect(x + 11, top + 7, 7, 3, P.ember2);
      screen(right - 21, top + 2, 17, 9, P.verd0);
      g.vline(right - 12, top + 11, 10, P.steel1); g.rect(right - 16, floor - 5, 9, 2, P.ivory1);
      break;
    case "air": case "enemy-buffer":
      pipe(x + 5, top, w - 10, 18, P.verd2);
      tank(x + 8, floor - 21, 19, P.verd3); tank(x + 19, floor - 21, 19, P.verd4);
      if (w > 80) {
        vents(right - 22, floor - 22, 18, 19); gauge(right - 13, floor - 14, 5);
        g.circle(right - 13, floor - 14, 2, P.steel0, true);
        const a = live ? t * 1.4 : 0;
        for (let i = 0; i < 3; i++) g.line(right - 13, floor - 14, right - 13 + Math.cos(a + i * 2.094) * 4, floor - 14 + Math.sin(a + i * 2.094) * 4, P.ink1);
      }
      break;
    case "sensors":
      for (let i = 0; i < Math.max(2, Math.floor((w - 12) / 25)); i++) screen(x + 7 + i * 24, top + 2, 20, 12, P.violet1);
      pipe(x + 8, floor - 5, w - 17, 0, P.violet3);
      if (w > 75) { panel(right - 20, floor - 11, 16, 9, P.ink3); for (let i = 0; i < 4; i++) g.rect(right - 17 + i * 3, floor - 8, 1, 3, i % 2 ? P.amber1 : P.teal2); }
      break;
    case "doors": case "gate":
      pipe(x + 5, top + 1, w - 10, 19, P.steel2);
      cabinet(x + 7, tallY + 2, 16, usableH - 4, P.steel0); gauge(x + 15, tallY + 7);
      for (let yy = tallY + 13; yy < floor - 4; yy += 4) g.hline(x + 10, yy, 9, P.ink1);
      if (w > 75) { screen(right - 18, tallY + 4, 14, 8, P.amber1); g.vline(right - 11, tallY + 14, 7, P.ember2); }
      break;
    case "mess":
      cabinet(x + 6, floor - 13, 22, 11, P.brass5);
      g.hline(x + 5, floor - 14, 24, P.ivory2); g.circle(x + 12, floor - 15, 3, P.steel1, true);
      g.hline(x + 7, top + 5, 20, P.brass3);
      for (let i = 0; i < 3; i++) { g.rect(x + 8 + i * 6, top + 1, 3, 4, P.ivory2); g.box(x + 11 + i * 6, top + 1, 2, 3, P.ivory2); }
      g.vline(x + w / 2, y + 2, 5, P.steel0); g.rect(x + w / 2 - 5, y + 7, 10, 2, P.brass2); g.hline(x + w / 2 - 4, y + 9, 8, P.amber0);
      if (w > 75) { panel(right - 22, floor - 11, 19, 5, P.copper3); g.rect(right - 24, floor - 5, 23, 3, P.copper2); }
      break;
    case "socket": case "workshop":
      pipe(x + 6, top + 1, w - 12, 4, P.brass3);
      cabinet(x + 7, floor - 20, 15, 18, P.steel0);
      for (let i = 0; i < 3; i++) { g.hline(x + 9, floor - 16 + i * 4, 11, P.ink1); g.rect(x + 13, floor - 15 + i * 4, 3, 1, P.ivory3); }
      if (w > 75) {
        panel(right - 21, top + 3, 17, 12, P.brass5);
        for (let i = 0; i < 4; i++) { g.vline(right - 19 + i * 4, top + 5, 7 - i % 2, P.steel2); g.hline(right - 20 + i * 4, top + 5, 3, P.steel2); }
        g.circle(right - 12, floor - 5, 5, P.copper1); g.circle(right - 12, floor - 5, 3, P.copper3);
      }
      break;
    case "drones": case "brood":
      pipe(x + 4, top, w - 8, 6, kind === "brood" ? P.ember3 : P.brass3);
      for (const px of [x + 7, right - 15]) {
        panel(px, top + 4, 11, usableH - 3, P.ink1); g.vline(px + 5, top + 6, usableH - 8, light);
        g.hline(px + 1, floor - 4, 9, trim); g.rect(px + 3, top + 7, 5, 4, P.steel0);
      }
      break;
    case "heart": case "bells":
      for (const px of [x + 8, right - 12]) {
        pipe(px, top, 7, usableH - 1, kind === "heart" ? P.ember3 : P.violet2);
        panel(px + 1, floor - 13, 5, 10, P.ink2); g.vline(px + 3, floor - 12, 8, light);
      }
      g.hline(x + 6, top + 2, w - 12, P.brass4); break;
    case "bunks":
      cabinet(x + 6, tallY + 1, 14, usableH - 2, P.ivory4);
      if (w > 80) { cabinet(right - 18, floor - 12, 15, 10, P.brass5); g.rect(right - 14, floor - 16, 5, 4, P.amber2); }
      break;
    default:
      crate(x + 6, floor - 13, 21, 11); crate(x + 10, floor - 22, 15, 8);
      if (w > 75) { crate(right - 25, floor - 12, 23, 10); crate(right - 19, floor - 20, 17, 7); }
      pipe(x + 6, top + 1, w - 12, 4, P.steel0);
  }
  // Floor edge and sparse hazard striping tie equipment to a physical deck.
  g.hline(x + 3, floor + 4, w - 6, trim);
  if (["engines", "weapons", "socket", "doors", "gate", "enemy-buffer"].includes(kind)) {
    for (let dx = 5; dx < w - 7; dx += 9) g.line(x + dx, floor + 3, x + dx + 3, floor + 1, P.brass3);
  }
}
