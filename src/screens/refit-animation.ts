// A brief physical receipt for a car that is already coupled in campaign state. Skipping never affects the refit.
import type { App, Scene } from "../core/scene";
import { P } from "../core/palette";
import { settings } from "../core/save";
import { sfx } from "../core/audio";
import type { ShipState } from "../game/types";
import { carInfo, carSlot, type AttachCarId } from "../campaign/refit";
import { Sim } from "../combat/sim/sim";
import { buildPlayerView } from "../combat/view";
import { drawShipPreview } from "../combat/preview";
import { lampColor } from "../combat/assets";
import { SCRIM, TYPE, footer, header } from "./kit";
import { drawCarrier, type CarrierRegion } from "../combat/carrier";

/** Show the actual new consist, with the purchased/recovered car approaching its recorded attachment point. */
export function showCarRefit(app: App, ship: ShipState, id: AttachCarId, onDone: () => void = () => {}, region: CarrierRegion = null) {
  const snapshot: ShipState = structuredClone(ship);
  const sim = new Sim(snapshot, { salvage: 0, ttl: 0, payloads: 0, spares: 0 },
    { enemy: "packet-leech", stage: 1, seed: 1, depth: 0 });
  const view = buildPlayerView(sim.ships[0]);
  const slot = carSlot(id);
  const car = view.cars.find(car => car.slot === slot);
  if (!car) { onDone(); return; }
  const lead = view.cars.find(car => car.slot === "lead")!;
  const rect = { x: car.x - view.bx, y: car.y - view.by, w: car.meta.w, h: car.meta.h };
  const anchor = slot === "rear" ? car.meta.couplerFront : car.meta.hangTop;
  const ax = rect.x + (anchor?.x ?? rect.w / 2);
  const ay = rect.y + (anchor?.y ?? 0);
  const scale = Math.min(1, 728 / (view.bw + 50), 244 / (view.bh + 30));
  const px = 480 - view.bw * scale / 2;
  const py = 151 + (244 - view.bh * scale) / 2;
  let t = 0;
  let latched = false;
  let tested = false;
  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    app.scenes.remove(scene);
    onDone();
  };
  const scene: Scene = {
    overlay: true,
    update(dt) {
      t += dt;
      if (!latched && (settings.reducedMotion || t >= 0.57)) { latched = true; sfx.play("couple", { volume: 0.7 }); }
      if (!tested && (settings.reducedMotion || t >= 0.73)) { tested = true; sfx.play("lamp-on", { volume: 0.45 }); }
      if (t >= 0.95) finish();
    },
    draw(g, a) {
      g.dim(SCRIM);
      g.panel(66, 84, 828, 374, "dialog");
      header(g, `${carInfo(id).name} · ${snapshot.name}`, 480, 104, { font: TYPE.strong, color: P.brass0, align: "center" });
      const attached = settings.reducedMotion || t >= 0.57;
      const ready = settings.reducedMotion || t >= 0.73;
      const p = Math.min(1, t / 0.57);
      const remaining = settings.reducedMotion ? 0 : (1 - p) ** 2;
      const dx = slot === "rear" ? -44 * remaining : 0;
      const dy = slot === "keel" ? 28 * remaining : 0;
      const grip = lead.meta.cable ?? { x: lead.meta.w / 2, y: 6 };
      const cy = py + (lead.y - view.by + grip.y) * scale;
      drawCarrier(g, () => cy, 86, 874, region);
      g.ctx.save();
      g.ctx.translate(px, py);
      g.ctx.scale(scale, scale);
      const draw = () => drawShipPreview(g, snapshot, 0, 0, { state: { sim, view }, t: 0, crew: true });
      // Move only this presentation's car transform. Rooms, crew and mounted tools share that transform,
      // so even fittings outside the hull outline travel with their car. Campaign state stays untouched.
      car.x += dx;
      car.y += dy;
      try { draw(); }
      finally { car.x -= dx; car.y -= dy; }
      if (slot === "keel" && !attached) {
        for (const x of [rect.x + 12, rect.x + rect.w - 12]) {
          g.line(x, rect.y - 22, x, rect.y + dy + 12, P.steel1, 2);
          g.circle(x, rect.y - 22, 4, P.brass2);
        }
      }
      // The latch closes across the real coupler/hanger; the local continuity lamp then stays on.
      g.box(ax - 5 + dx, ay - 5 + dy, 10, 10, attached ? P.brass1 : P.steel1, 2);
      if (attached) g.hline(ax - 3, ay, 6, P.ivory1);
      g.rect(ax + 7, ay - 3, 7, 7, P.ink0);
      g.rect(ax + 9, ay - 1, 3, 3, ready ? lampColor(snapshot.livery.lamp, 1) : P.steel0);
      g.ctx.restore();
      g.text(ready ? "Coupler locked · power connection checked · lamps steady"
        : attached ? "Coupler locked · checking power connection" : slot === "rear" ? "Aligning the rear coupler" : "Hoist taking load · aligning the keel hanger",
      480, 412, { font: "body", color: ready ? P.teal1 : P.ivory2, align: "center" });
      footer(g, a, [], [["ENTER", "continue"]]);
      if (t > 0.05 && (a.input.keyPressed("Enter") || a.input.keyPressed("Escape") || a.input.pressed(0))) {
        a.input.eatKey("Enter");
        a.input.eatKey("Escape");
        a.input.consume();
        finish();
      }
    },
  };
  app.scenes.push(scene);
}
