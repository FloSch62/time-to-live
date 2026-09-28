// The same crew, paths, doors and lifts are available while the tender is at a relay.
import type { App } from "../core/scene";
import type { Gfx } from "../core/gfx";
import type { ShipState } from "../game/types";
import { P } from "../core/palette";
import { sfx } from "../core/audio";
import { Sim } from "./sim/sim";
import { orderMove, updateDeckMovement } from "./sim/crew";
import { buildPlayerView, tileScreen, type ShipView } from "./view";
import { drawShipPreview, type PreviewOpts } from "./preview";
import { crewFeet, mountHighlight, crewNameTag, CREW_HEAD } from "./draw-ship";
import { crewTooltip, roomTooltip } from "./tooltips";
import { planningSim, planAddPower, planRemovePower, planWeapon, planDrone, planSwapWeapons } from "./plan";
import type { BarIntents } from "./hud";
import { SYS_KEYS, DRONE_KEYS } from "./hud";
import type { SysKey } from "../data/layouts";

interface ZoomTransform { fx: number; fy: number; ox: number; oy: number; z: number }
export class DeckControl {
  state!: { sim: Sim; view: ShipView };
  selected = new Set<number>();
  /** Crew hovered on the roster panel last frame (highlighted and name-tagged in the car). */
  panelHover = -1;
  private signature = "";
  private ship!: ShipState;
  private message = "Select crew · right-click a room to move";
  constructor(private saved: () => void) {}

  sync(ship: ShipState) {
    const signature = JSON.stringify(ship);
    this.ship = ship;
    if (signature === this.signature) return;
    const selectedIds = this.state?.sim.playerCrew().filter(c => this.selected.has(c.uid)).map(c => c.id) ?? [];
    const sim: Sim = planningSim(ship);
    this.state = { sim, view: buildPlayerView(sim.ships[0]) };
    this.selected = new Set(sim.crew.filter(c => selectedIds.includes(c.id)).map(c => c.uid));
    this.signature = signature;
  }
  update(dt: number, ship: ShipState) {
    this.sync(ship);
    updateDeckMovement(this.state.sim, dt);
    let changed = false;
    for (const crew of this.state.sim.playerCrew()) {
      const member = ship.crew.find(m => m.id === crew.id);
      if (member && Math.floor(crew.hp) > member.hp) { member.hp = Math.floor(crew.hp); changed = true; }
    }
    if (changed) this.persist();
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
  /** Apply the planning ship bar's intents to the tender (they persist and set up the next fight). */
  plan(a: BarIntents) {
    const { sim } = this.state;
    const ship = this.ship;
    let changed = false;
    let ok = true;
    let sound = "power-up";
    if (a.addPower) { ok = planAddPower(sim, ship, a.addPower); changed = ok; }
    if (a.removePower) { ok = planRemovePower(sim, ship, a.removePower); changed = ok; sound = "power-down"; }
    if (a.weaponClick !== undefined) { const on = planWeapon(sim, ship, a.weaponClick); changed = true; sound = on ? "power-up" : "power-down"; ok = on || !sim.ships[0].weapons.find((w) => w.slot === a.weaponClick)?.want; }
    if (a.weaponRight !== undefined) { planWeapon(sim, ship, a.weaponRight, false); changed = true; sound = "power-down"; }
    if (a.droneClick !== undefined) { const on = planDrone(sim, ship, a.droneClick); changed = true; sound = on ? "power-up" : "power-down"; }
    if (a.droneRight !== undefined) { planDrone(sim, ship, a.droneRight, false); changed = true; sound = "power-down"; }
    if (a.weaponSwap && planSwapWeapons(ship, a.weaponSwap[0], a.weaponSwap[1])) {
      // Mounts changed: the next sync rebuilds the tender with the new order.
      this.saved();
      sfx.play("door-close", { volume: 0.5 });
      this.message = `Mounts ${a.weaponSwap[0] + 1} and ${a.weaponSwap[1] + 1} swapped`;
      return;
    }
    if (changed) { this.persist(); sfx.play(sound, { volume: 0.5 }); }
    else if (!ok) sfx.play("power-denied", { volume: 0.6 });
  }
  /** Planning hotkeys, the same as in a fight: A/S/D/F… add a bar (Shift takes one), 1–4 weapons, 7–0 drones. */
  planHotkeys(app: App) {
    const input = app.input;
    if (!input.enabled) return;
    const a: BarIntents = {};
    for (const [id, key] of Object.entries(SYS_KEYS) as [SysKey, string][]) {
      if (!input.keyPressed(key) || !this.state.sim.ships[0].sys[id]) continue;
      input.eatKey(key);
      if (input.shift || input.keyShifted(key)) a.removePower = id; else a.addPower = id;
    }
    for (let i = 0; i < this.ship.weaponSlots; i++) {
      const key = `Digit${i + 1}`;
      if (!input.keyPressed(key)) continue;
      input.eatKey(key);
      if (input.shift || input.keyShifted(key)) a.weaponRight = i; else a.weaponClick = i;
    }
    DRONE_KEYS.forEach((key, i) => {
      if (i >= this.ship.droneSlots || !input.keyPressed(key)) return;
      input.eatKey(key);
      if (input.shift || input.keyShifted(key)) a.droneRight = i; else a.droneClick = i;
    });
    if (Object.keys(a).length) this.plan(a);
  }
  move(room: number) {
    const { sim } = this.state;
    let moved = 0;
    for (const c of sim.playerCrew()) if (this.selected.has(c.uid) && orderMove(sim, c, room)) {
      const member = this.ship.crew.find(m => m.id === c.id);
      if (member) member.room = sim.ships[0].rooms[room].id;
      moved++;
    }
    if (moved) { this.message = `${moved} crew to ${sim.ships[0].rooms[room].name}`; this.persist(); sfx.play("crew-move", { volume: 0.6 }); }
    else { this.message = "No free berth — choose another room"; sfx.play("power-denied"); }
  }
  draw(g: Gfx, app: App, x: number, y: number, zoom: ZoomTransform, enabled: boolean, region = { x: 0, y: 56, w: 960, h: 314 }, extra: Pick<PreviewOpts, "carrier" | "sheave"> = {}) {
    this.sync(this.ship);
    const { sim, view } = this.state, S = sim.ships[0];
    const input = app.input;
    const ox = x - view.bx, oy = y - view.by;
    const density = g.ctx.canvas.width / 960;
    const pointer = g.ctx.getTransform().inverse().transformPoint({ x: input.x * density, y: input.y * density });
    const mx = pointer.x - ox, my = pointer.y - oy;
    const interactive = enabled && input.inRect(region.x, region.y, region.w, region.h);
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
        if (Math.abs(mx - fx) < 11 && my >= fy - CREW_HEAD - 2 && my <= fy + 2 && d < nearest) { hoverCrew = c.uid; nearest = d; }
      }
      if (hoverCrew >= 0) {
        const c = sim.crew.find(c => c.uid === hoverCrew)!;
        app.ui.setTooltip(crewTooltip(sim, c), 300);
        app.ui.cursor = "pointer";
        if (input.pressed(0)) { this.select(c.id, input.key("ShiftLeft") || input.key("ShiftRight")); input.consume(); }
      } else if (hoverRoom >= 0) {
        const care = S.rooms[hoverRoom].sys?.id === "medbay"
          ? "\n{good}Dockside care{/}\nWorking infirmary bars use shore power here; reactor allocation is not needed. Living crew heal while inside. Riggers need a repair bench or dockside field service."
          : "";
        app.ui.setTooltip(roomTooltip(sim, 0, hoverRoom) + care + "\n{teal1}Select crew, then right-click to move.{/}", 280);
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
    const tagUid = hoverCrew >= 0 ? hoverCrew : this.panelHover;
    this.panelHover = -1;
    const res = drawShipPreview(g, this.ship, x, y, { state: this.state, t: sim.t, selected: this.selected, hoverCrew: tagUid, hoverRoom, ...extra });
    const tagged = sim.playerCrew().find((c) => c.uid === tagUid);
    if (tagged) {
      const [fx, fy] = crewFeet(S, view, tagged);
      crewNameTag(g, tagged.name, fx + ox, fy + oy - CREW_HEAD - 4);
    }
    // Weapons on the hull explain themselves too (planning wording: how they enter the next fight).
    if (interactive && hoverCrew < 0) {
      const mount = res.mounts.find((m) => pointer.x >= m.x && pointer.y >= m.y && pointer.x < m.x + m.w && pointer.y < m.y + m.h);
      if (mount) {
        app.ui.setTooltip(mount.tip(), 300);
        mountHighlight(g, [mount.x, mount.y, mount.w, mount.h], P.teal1);
      }
    }
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
