// The same crew, paths, doors and lifts are available while the tender is at a relay.
import type { App } from "../core/scene";
import type { Gfx } from "../core/gfx";
import type { ShipState } from "../game/types";
import { P } from "../core/palette";
import { sfx } from "../core/audio";
import { Sim } from "./sim/sim";
import { orderMove, updateDeckMovement } from "./sim/crew";
import { buildPlayerView, tileScreen, type ShipView } from "./view";
import { drawShipPreview } from "./preview";
import { crewFeet } from "./draw-ship";
import { crewTooltip, roomTooltip } from "./tooltips";

interface ZoomTransform { fx: number; fy: number; ox: number; oy: number; z: number }
export class DeckControl {
  state!: { sim: Sim; view: ShipView };
  selected = new Set<number>();
  private signature = "";
  private ship!: ShipState;
  private message = "Select crew · right-click a room to move";
  constructor(private saved: () => void) {}

  sync(ship: ShipState) {
    const signature = JSON.stringify(ship);
    this.ship = ship;
    if (signature === this.signature) return;
    const selectedIds = this.state?.sim.playerCrew().filter(c => this.selected.has(c.uid)).map(c => c.id) ?? [];
    const sim = new Sim(ship, { salvage: 0, ttl: 0, payloads: 0, spares: 0 }, { enemy: "packet-leech", stage: 1, depth: 0, seed: 1 });
    sim.crew = sim.playerCrew();
    this.state = { sim, view: buildPlayerView(sim.ships[0]) };
    this.selected = new Set(sim.crew.filter(c => selectedIds.includes(c.id)).map(c => c.uid));
    this.signature = signature;
  }
  update(dt: number, ship: ShipState) {
    this.sync(ship);
    updateDeckMovement(this.state.sim, dt);
  }
  select(id: string, add = false) {
    const c = this.state.sim.playerCrew().find(c => c.id === id);
    if (!c) return;
    if (!add) this.selected.clear();
    if (add && this.selected.has(c.uid)) this.selected.delete(c.uid); else this.selected.add(c.uid);
    sfx.play("crew-select", { volume: 0.6 });
  }
  isSelected(id: string) { return this.state?.sim.crew.some(c => c.id === id && this.selected.has(c.uid)); }
  tooltip(id: string) {
    const c = this.state.sim.crew.find(c => c.id === id);
    return c ? crewTooltip(this.state.sim, c) : "";
  }
  private persist() { this.signature = JSON.stringify(this.ship); this.saved(); }
  move(room: number) {
    const { sim } = this.state;
    let moved = 0;
    for (const c of sim.playerCrew()) if (this.selected.has(c.uid) && orderMove(sim, c, room)) {
      const member = this.ship.crew.find(m => m.id === c.id);
      if (member) member.room = sim.ships[0].rooms[room].id;
      moved++;
    }
    if (moved) { this.message = `${moved} crew → ${sim.ships[0].rooms[room].name}`; this.persist(); sfx.play("crew-move", { volume: 0.6 }); }
    else { this.message = "No free berth — choose another room"; sfx.play("power-denied"); }
  }
  draw(g: Gfx, app: App, x: number, y: number, zoom: ZoomTransform, enabled: boolean) {
    this.sync(this.ship);
    const { sim, view } = this.state, S = sim.ships[0];
    const input = app.input;
    const ox = x - view.bx, oy = y - view.by;
    const density = g.ctx.canvas.width / 960;
    const pointer = g.ctx.getTransform().inverse().transformPoint({ x: input.x * density, y: input.y * density });
    const mx = pointer.x - ox, my = pointer.y - oy;
    const interactive = enabled && input.enabled && input.y > 64 && input.y < 384 && input.x < 780;
    let hoverCrew = -1, hoverRoom = -1;
    if (interactive) {
      for (const r of S.rooms) {
        const [rx, ry] = tileScreen(view, r.x, r.y);
        if (mx >= rx && mx < rx + r.w * 36 && my >= ry && my < ry + r.h * 36) hoverRoom = r.i;
      }
      let nearest = Infinity;
      for (const c of sim.playerCrew()) {
        const [fx, fy] = crewFeet(S, view, c);
        const d = Math.abs(mx - fx) + Math.abs(my - (fy - 14)) * 0.45;
        if (Math.abs(mx - fx) < 11 && my >= fy - 30 && my <= fy + 2 && d < nearest) { hoverCrew = c.uid; nearest = d; }
      }
      if (hoverCrew >= 0) {
        const c = sim.crew.find(c => c.uid === hoverCrew)!;
        app.ui.setTooltip(crewTooltip(sim, c), 300);
        app.ui.cursor = "pointer";
        if (input.pressed(0)) { this.select(c.id, input.key("ShiftLeft") || input.key("ShiftRight")); input.consume(); }
      } else if (hoverRoom >= 0) {
        app.ui.setTooltip(roomTooltip(sim, 0, hoverRoom) + "\n{teal1}Select crew, then right-click to move.{/}", 280);
        if (this.selected.size) app.ui.cursor = "crew-move";
      }
      if (hoverRoom >= 0 && this.selected.size && (input.pressed(2) || (input.pressed(0) && hoverCrew < 0))) { this.move(hoverRoom); input.consume(); }
    }
    if (enabled && input.enabled) {
      sim.playerCrew().forEach((c, i) => {
        if (input.keyPressed(`F${i + 1}`)) { this.select(c.id, input.key("ShiftLeft") || input.key("ShiftRight")); input.eatKey(`F${i + 1}`); }
      });
      if (input.keyPressed("KeyR")) {
        const saveStations = input.keyShifted("KeyR");
        input.eatKey("KeyR");
        if (saveStations) {
          for (const c of sim.playerCrew()) {
            const room = S.rooms[c.path.length ? c.orderRoom : S.tileRoom[c.tile]];
            c.stationRoom = room.i;
            const member = this.ship.crew.find(m => m.id === c.id)!;
            member.station = room.id;
          }
          this.message = "Return stations saved";
        } else {
          for (const c of sim.playerCrew()) if (orderMove(sim, c, c.stationRoom)) this.ship.crew.find(m => m.id === c.id)!.room = S.rooms[c.stationRoom].id;
          this.message = "Crew returning to saved stations";
        }
        this.persist();
      }
    }
    drawShipPreview(g, this.ship, x, y, { state: this.state, t: sim.t, selected: this.selected, hoverCrew, hoverRoom });
    // Planned route is an unobtrusive dotted path across the foreground decks.
    for (const c of sim.playerCrew()) if (this.selected.has(c.uid) && c.path.length) {
      for (const tile of c.path) {
        const [px, py] = tileScreen(view, tile % S.cols, Math.floor(tile / S.cols));
        g.rect(px + ox + 17, py + oy + 32, 2, 1, P.teal1);
      }
    }
  }
  hint() { return this.message; }
}
