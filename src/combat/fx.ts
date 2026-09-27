// Visual effects: projectiles in flight (drawn from sim state), explosions, sparks, smoke, ward-mesh ripples, beams,
// muzzle flashes and a restrained screen shake. Physical, sober look (hard rule 8).
import type { Gfx } from "../core/gfx";
import { P } from "../core/palette";
import { atlas } from "../core/assets";
import type { Projectile, BeamShot } from "./sim/model";
import type { Sim } from "./sim/sim";
import { glow } from "./draw-ship";

export interface Particle {
  kind: "anim" | "spark" | "smoke" | "ring" | "flash" | "ghost" | "shard" | "text";
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  color: string;
  anim?: string;
  size?: number;
  flip?: boolean;
  text?: string;
  /** Ghost projectiles keep their look. */
  proj?: string;
  /** Which camera the particle lives in (0 player, 1 enemy, -1 screen). */
  cam: -1 | 0 | 1;
}

const COLORS: Record<string, [string, string]> = {
  teal: [P.teal1, P.teal3],
  amber: [P.amber1, P.amber3],
  ivory: [P.ivory0, P.ivory3],
  ember: [P.ember1, P.ember3],
  violet: [P.violet0, P.violet2],
  chain: [P.amber0, P.ember2],
};

export class Fx {
  list: Particle[] = [];
  shakeT = 0;
  shakeA = 0;
  /** Cached start points of projectiles (screen). */
  private starts = new Map<number, [number, number]>();
  private seed = 1;

  rnd(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /** Camera for particles added next (set by the scene around event handling). */
  cam: -1 | 0 | 1 = -1;

  add(p: Partial<Particle> & { kind: Particle["kind"]; x: number; y: number }) {
    this.list.push({ vx: 0, vy: 0, t: 0, life: 0.6, color: P.amber1, cam: this.cam, ...p });
    if (this.list.length > 600) this.list.splice(0, this.list.length - 600);
  }

  shake(a: number) {
    this.shakeA = Math.max(this.shakeA, a);
    this.shakeT = 0.35;
  }

  explosion(x: number, y: number, size: "small" | "medium" | "large") {
    const anim = `explosion-${size}`;
    if (atlas("fx")?.anims[anim]) this.add({ kind: "anim", x, y, anim, life: 1.2 });
    else this.add({ kind: "flash", x, y, life: 0.35, size: size === "small" ? 8 : size === "medium" ? 14 : 24, color: P.amber1 });
    const n = size === "small" ? 6 : size === "medium" ? 12 : 20;
    for (let i = 0; i < n; i++) {
      const a = this.rnd() * Math.PI * 2;
      const s = 20 + this.rnd() * 60;
      this.add({ kind: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.3 + this.rnd() * 0.5, color: this.rnd() < 0.5 ? P.amber1 : P.ember1 });
    }
    for (let i = 0; i < (size === "small" ? 2 : 4); i++) {
      this.add({ kind: "smoke", x: x + (this.rnd() - 0.5) * 10, y: y + (this.rnd() - 0.5) * 6, vx: (this.rnd() - 0.5) * 8, vy: -8 - this.rnd() * 10, life: 1.4 + this.rnd(), size: 3 + this.rnd() * 3, color: P.ink4 });
    }
  }

  sparks(x: number, y: number, n: number, color: string = P.amber1) {
    for (let i = 0; i < n; i++) {
      const a = this.rnd() * Math.PI * 2;
      const s = 15 + this.rnd() * 45;
      this.add({ kind: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, life: 0.2 + this.rnd() * 0.4, color });
    }
  }

  ripple(x: number, y: number, color: string, flip: boolean) {
    const anim = color === P.violet1 ? "shield-ripple-ion" : "shield-ripple";
    if (atlas("fx")?.anims[anim]) this.add({ kind: "anim", x, y, anim: flip ? `${anim}-left` : anim, life: 0.6 });
    this.add({ kind: "ring", x, y, life: 0.45, color, size: 3 });
  }

  update(dt: number) {
    for (const p of this.list) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "spark") p.vy += 90 * dt;
      if (p.kind === "shard") p.vy += 120 * dt;
      if (p.kind === "smoke") {
        p.vx *= 0.98;
        p.vy *= 0.98;
      }
    }
    this.list = this.list.filter((p) => p.t < p.life);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      if (this.shakeT <= 0) this.shakeA = 0;
    }
  }

  shakeOffset(enabled: boolean, t: number): [number, number] {
    if (!enabled || this.shakeT <= 0) return [0, 0];
    const a = this.shakeA * (this.shakeT / 0.35);
    return [Math.round(Math.sin(t * 71) * a), Math.round(Math.cos(t * 53) * a * 0.6)];
  }

  draw(g: Gfx, layer: "back" | "front", cam: -1 | 0 | 1 = -1) {
    for (const p of this.list) {
      if (p.cam !== cam) continue;
      const f = p.t / p.life;
      if (layer === "back" && p.kind !== "smoke") continue;
      if (layer === "front" && p.kind === "smoke") continue;
      switch (p.kind) {
        case "anim":
          if (!g.anim("fx", p.anim!, p.t, Math.round(p.x), Math.round(p.y), { flipX: p.flip })) p.t = p.life;
          break;
        case "spark":
          g.alpha(1 - f, () => g.rect(Math.round(p.x), Math.round(p.y), 1, 1, p.color));
          break;
        case "shard":
          g.alpha(1 - f, () => g.rect(Math.round(p.x), Math.round(p.y), 2, 1, p.color));
          break;
        case "smoke": {
          const s = Math.round((p.size ?? 3) * (1 + f));
          g.alpha(0.35 * (1 - f), () => g.circle(Math.round(p.x), Math.round(p.y), s, p.color, true));
          break;
        }
        case "ring":
          g.alpha(0.8 * (1 - f), () => g.circle(Math.round(p.x), Math.round(p.y), Math.round((p.size ?? 3) + f * 10), p.color));
          break;
        case "flash":
          glow(g, p.x, p.y, (p.size ?? 8) * (1 - f * 0.5), p.color, 1 - f);
          break;
        case "ghost":
          drawBolt(g, p.proj ?? "teal", p.x, p.y, p.vx, p.vy, 1 - f);
          break;
        case "text":
          g.text(p.text ?? "", Math.round(p.x), Math.round(p.y - f * 8), { font: "small", color: p.color, align: "center", alpha: 1 - f * f, shadow: P.ink0 });
          break;
      }
    }
  }

  // ─── projectiles ──────────────────────────────────────────────────────────────────────────────────────────

  /** Screen position of a projectile now. `start(p)` gives its screen start once; `end(p)` its screen target. */
  projPos(p: Projectile, start: (p: Projectile) => [number, number], end: (p: Projectile) => [number, number]): [number, number, number, number] {
    let s = this.starts.get(p.id);
    if (!s) {
      s = start(p);
      this.starts.set(p.id, s);
      if (this.starts.size > 400) {
        const k = this.starts.keys().next().value as number;
        this.starts.delete(k);
      }
    }
    const [ex, ey] = end(p);
    const total = p.t1 + p.t2;
    const f = Math.max(0, Math.min(1, p.t / total));
    const arc = p.kind === "payload" || p.kind === "crawler" ? 38 : p.kind === "debris" ? -10 : 10;
    const x = s[0] + (ex - s[0]) * f;
    const y = s[1] + (ey - s[1]) * f - Math.sin(f * Math.PI) * arc;
    const vx = (ex - s[0]) / total;
    const vy = (ey - s[1]) / total - (Math.cos(f * Math.PI) * arc * Math.PI) / total;
    return [x, y, vx, vy];
  }

  drawProjectiles(g: Gfx, sim: Sim, start: (p: Projectile) => [number, number], end: (p: Projectile) => [number, number]) {
    for (const p of sim.projectiles) {
      if (p.dead || p.t < 0) continue;
      const [x, y, vx, vy] = this.projPos(p, start, end);
      drawProjectile(g, p, x, y, vx, vy, sim.t);
    }
  }
}

export function drawBolt(g: Gfx, color: string, x: number, y: number, vx: number, vy: number, a = 1) {
  const [hi, lo] = COLORS[color] ?? COLORS.teal;
  const l = Math.hypot(vx, vy) || 1;
  const ux = vx / l;
  const uy = vy / l;
  g.alpha(a, () => {
    for (let i = 0; i < 9; i++) {
      const px = Math.round(x - ux * i);
      const py = Math.round(y - uy * i);
      g.rect(px, py, i < 3 ? 2 : 1, i < 3 ? 2 : 1, i < 3 ? hi : lo);
    }
  });
}

function drawProjectile(g: Gfx, p: Projectile, x: number, y: number, vx: number, vy: number, t: number) {
  const left = vx < 0;
  switch (p.kind) {
    case "laser":
    case "drone": {
      const col = p.color === "chain" ? "chain" : p.color;
      const anim = `bolt-${col}${left ? "-left" : ""}`;
      // Trail.
      drawBolt(g, col, x, y, vx, vy, 0.5);
      if (!g.anim("fx", anim, t, Math.round(x), Math.round(y))) drawBolt(g, col, x, y, vx, vy);
      break;
    }
    case "ion":
    case "seal":
      if (!g.anim("fx", "ion-ball", t, Math.round(x), Math.round(y))) {
        glow(g, x, y, 4, p.kind === "seal" ? P.ember2 : P.violet1, 0.8);
      }
      for (let i = 1; i < 5; i++) g.alpha(0.3 - i * 0.05, () => g.rect(Math.round(x - vx * i * 0.012), Math.round(y - vy * i * 0.012), 2, 2, p.kind === "seal" ? P.ember2 : P.violet1));
      break;
    case "payload":
    case "crawler":
    case "debris": {
      const ang = Math.atan2(vy, vx);
      const r = ((Math.round((ang / (Math.PI * 2)) * 8) % 8) + 8) % 8;
      const shell = p.def?.id === "breach-spike" || p.def?.id === "countdown-charge" ? "shell-breach-fly" : p.def?.id === "thermite-payload" || p.def?.id === "furnace-maw" ? "shell-thermite-fly" : "shell-fly";
      // Exhaust trail.
      for (let i = 1; i < 7; i++) g.alpha(0.45 - i * 0.06, () => g.circle(Math.round(x - vx * i * 0.018), Math.round(y - vy * i * 0.018), 1, i < 3 ? P.amber2 : P.steel1, true));
      if (p.kind === "debris") {
        g.rect(Math.round(x) - 2, Math.round(y) - 2, 4, 4, P.ink0);
        g.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 2, P.copper2);
        break;
      }
      if (p.kind === "crawler") {
        g.rect(Math.round(x) - 4, Math.round(y) - 3, 8, 6, P.ink0);
        g.rect(Math.round(x) - 3, Math.round(y) - 2, 6, 4, P.steel1);
        g.rect(Math.round(x) + (left ? -3 : 2), Math.round(y) - 1, 1, 2, P.ember1);
        break;
      }
      if (!g.anim("fx", `${shell}-r${r}`, t, Math.round(x), Math.round(y))) {
        g.rect(Math.round(x) - 3, Math.round(y) - 2, 6, 4, P.ink0);
        g.rect(Math.round(x) - 2, Math.round(y) - 1, 4, 2, P.brass2);
      }
      break;
    }
    case "flak":
      if (!g.anim("fx", "flak-pellet", t, Math.round(x), Math.round(y))) {
        g.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, P.ink0);
        g.rect(Math.round(x), Math.round(y), 1, 1, P.ivory0);
      }
      break;
  }
}

/** Beams: a charged line from the muzzle to the sweep point, then a burning line along the swept part. All points are
 *  screen coordinates (the scene maps them through the cameras). */
export function drawBeam(g: Gfx, b: BeamShot, muzzle: [number, number], from: [number, number], cur: [number, number], t: number) {
  if (b.done && b.t - b.delay > b.dur + 0.3) return;
  const [cx, cy] = cur;
  const [x0, y0] = from;
  const prof = b.def.color === "violet" ? [P.violet3, P.violet1, P.ivory0] : b.def.color === "amber" ? [P.amber3, P.amber1, P.amber0] : b.def.color === "ember" ? [P.ember3, P.ember1, P.ember0] : [P.teal3, P.teal1, P.teal0];
  const started = b.t >= b.delay;
  const fade = b.done ? Math.max(0, 1 - (b.t - b.delay - b.dur) / 0.3) : 1;
  const flick = 0.85 + 0.15 * Math.sin(t * 60);
  g.alpha(fade * flick, () => {
    const tx = started ? cx : x0;
    const ty = started ? cy : y0;
    const a = started ? 1 : b.t / b.delay;
    const ex = muzzle[0] + (tx - muzzle[0]) * a;
    const ey = muzzle[1] + (ty - muzzle[1]) * a;
    g.line(muzzle[0], muzzle[1], ex, ey, prof[0], 3);
    g.line(muzzle[0], muzzle[1], ex, ey, prof[1], 1);
    if (started && !b.blocked && !b.missed) {
      g.line(x0, y0, cx, cy, prof[0], 3);
      g.line(x0, y0, cx, cy, prof[2], 1);
      glow(g, cx, cy, 5, prof[1], 0.9);
    } else if (started && b.blocked) glow(g, cx, cy, 4, prof[1], 0.6);
  });
}
