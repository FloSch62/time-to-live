// The Yard (refit) tab of the Ship screen (contract ★ v2.1): a blueprint of the consist — lead car, rear car, keel
// car, module sockets — where modules are installed, swapped or removed, cars uncoupled, and the livery lamp chosen.
// Stat changes are shown before every confirm. Refits only at an exchange or a bench.
import type { App } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { sfx } from "../core/audio";
import { P, C, rgba } from "../core/palette";
import { LAMP_COLORS, type LampColor, type ModuleId } from "../game/ids";
import type { ShipState } from "../game/types";
import { currentRelay, isSealed, type RunState } from "../campaign/model";
import {
  carInfo, moduleInfo, refit, sockets, socketLabel, tenderStats, uncoupleCar, EVASION_PER_CAR, type TenderStats,
} from "../campaign/refit";
import { itemName, sellPrice } from "../campaign/catalog";
import { Zoom, brassButton, cable, glowHD, inset, tracked } from "./kit";
import { combatApi, previewGrip } from "../campaign/combat-adapter";
import * as flavor from "../content/flavor";

export const LAMP_HEX: Record<LampColor, string> = {
  amber: P.amber1, teal: P.teal1, violet: P.violet1, ember: P.ember1, ivory: P.ivory0,
};

/** Markup lines for the differences between two stat sets. */
export function statDeltas(a: TenderStats, b: TenderStats): string[] {
  const out: string[] = [];
  const line = (d: number, label: string, good = d > 0, pct = false) => {
    if (!d) return;
    out.push(`${good ? "{verd0}" : "{ember1}"}${d > 0 ? "+" : "–"}${Math.abs(d)}${pct ? "%" : ""}{/} ${label}`);
  };
  line(b.hullMax - a.hullMax, "hull");
  line(b.weaponSlots - a.weaponSlots, "hardpoint");
  line(b.droneSlots - a.droneSlots, "drone slot");
  line(b.cargo - a.cargo, "cargo");
  line(b.crew - a.crew, "berths");
  line(b.payloadMax - a.payloadMax, "payload rack");
  line(b.sparesMax - a.sparesMax, "spares");
  line(b.sensors - a.sensors, "Listening Post");
  line(Math.round((b.repair - a.repair) * 100), "repair speed", b.repair > a.repair, true);
  line(b.evasion - a.evasion, "evasion", b.evasion > a.evasion, true);
  for (const s of b.systems) if (!a.systems.includes(s)) out.push(`{verd0}+{/} ${s === "drones" ? "Drone Bay" : "Lamp-Dark Veil"}`);
  for (const s of a.systems) if (!b.systems.includes(s)) out.push(`{ember1}–{/} ${s === "drones" ? "Drone Bay" : "Lamp-Dark Veil"} (kept in storage)`);
  if (!out.length) out.push("{ivory4}no change to the numbers{/}");
  return out;
}

export function refitAllowed(run: RunState): { ok: boolean; where: "market" | "bench" | null } {
  const r = currentRelay(run);
  if (isSealed(run.map, r)) return { ok: false, where: null };
  if (r.type === "market" && r.resolved) return { ok: true, where: "market" };
  if (r.type === "bench" && r.resolved) return { ok: true, where: "bench" };
  return { ok: false, where: null };
}

interface Pending {
  label: string;
  deltas: string[];
  apply(): void;
}

export interface YardState {
  socket: string | null;
  pending: Pending | null;
  note: string;
  zoom: Zoom;
}

export function newYardState(): YardState {
  return { socket: null, pending: null, note: "", zoom: new Zoom() };
}

function clone(s: ShipState): ShipState {
  return JSON.parse(JSON.stringify(s)) as ShipState;
}

/** Draw and run the Yard tab inside (x, y, w, h). */
export function yardTab(g: Gfx, app: App, run: RunState, st: YardState, x: number, y: number, w: number, h: number, t: number, onChange: () => void) {
  const ship = run.ship;
  const allowed = refitAllowed(run);
  const stats = tenderStats(ship);
  // ── the consist, big, zoomable; sockets are clicked on the drawing itself ──
  const pw = w - 232;
  const ph = h - 84;
  inset(g, x, y, pw, ph, "#0b1120");
  for (let gx = x + 12; gx < x + pw; gx += 24) g.vline(gx, y + 1, ph - 2, rgba(P.teal4, 0.12));
  for (let gy = y + 12; gy < y + ph; gy += 24) g.hline(x + 1, gy, pw - 2, rgba(P.teal4, 0.12));
  st.zoom.handle(app, { x, y, w: pw, h: ph });
  const pg = previewGrip(ship);
  let hoverSock: string | null = null;
  g.clip(x + 1, y + 1, pw - 2, ph - 2, () => {
    st.zoom.apply(g, () => {
      if (pg && combatApi.drawShipPreview) {
        const fit = Math.min(1, (pw - 24) / pg.w, (ph - 40) / pg.h);
        const px = Math.round(x + (pw - pg.w * fit) / 2);
        const py = Math.round(y + 28 + (ph - 40 - pg.h * fit) / 2);
        // the carrier the consist hangs from
        cable(g, x - 40, py + pg.y * fit, x + pw + 40, py + pg.y * fit, 6, { hd: true, thick: 5, color: P.copper2, hi: P.copper0, lo: P.copper4 });
        g.ctx.save();
        g.ctx.translate(px, py);
        g.ctx.scale(fit, fit);
        const res = combatApi.drawShipPreview(g, ship, 0, 0, { t, crew: true, sockets: true, highlight: st.socket ?? undefined }) as { rooms?: { id: string; x: number; y: number; w: number; h: number; socket: boolean; module?: string }[] } | void;
        const pointer = st.zoom.toWorld(app.input.x, app.input.y);
        const m = { x: (pointer.x - px) / fit, y: (pointer.y - py) / fit };
        for (const r of res?.rooms ?? []) {
          if (!r.socket) continue;
          const mod = ship.modules?.[r.id];
          if (mod) {
            // module badge in the socket room
            g.rect(r.x + 3, r.y + 3, 24, 12, P.ink0);
            tracked(g, moduleInfo(mod).name.slice(0, 3).toUpperCase(), r.x + 15, r.y + 5, { font: "small", color: P.brass1, align: "center", track: 1 });
          }
          if (app.input.inRect(x, y, pw, ph) && m.x >= r.x && m.y >= r.y && m.x < r.x + r.w && m.y < r.y + r.h) {
            hoverSock = r.id;
            g.box(r.x - 1, r.y - 1, r.w + 2, r.h + 2, P.teal1);
          }
        }
        g.ctx.restore();
      } else {
        blueprint(g, ship, x, y, pw, ph, t);
      }
    });
  });
  tracked(g, allowed.ok ? "CLICK A SOCKET ROOM TO REFIT · WHEEL ZOOM · RIGHT-DRAG PAN · Z RESET" : "WHEEL ZOOM · RIGHT-DRAG PAN · Z RESET", x + 10, y + 8, { font: "small", color: P.teal2, track: 1 });
  if (hoverSock) {
    const m = ship.modules?.[hoverSock];
    app.ui.cursor = "pointer";
    app.ui.setTooltip(`{brass1}${socketLabel(hoverSock, ship)}{/}\n${m ? `${moduleInfo(m).name}: ${moduleInfo(m).desc}` : "{ivory4}Empty socket: fit a module here.{/}"}`, 260);
    if (app.input.pressed(0)) {
      app.input.consume();
      st.socket = st.socket === hoverSock ? null : hoverSock;
      st.pending = null;
      sfx.play("ui-click");
    }
  }
  // ── right column: the numbers ──
  const rx = x + pw + 12;
  const rw = w - pw - 12;
  g.panel(rx, y, rw, ph, "panel-dark");
  tracked(g, "THE CONSIST", rx + 12, y + 10, { font: "label", color: P.ivory3 });
  const rows: [string, string, string][] = [
    ["Rear car", ship.consist.rear ? carInfo(ship.consist.rear).name : "—", ship.consist.rear ? carInfo(ship.consist.rear).desc : "Nothing coupled behind the lead car."],
    ["Keel car", ship.consist.keel ? carInfo(ship.consist.keel).name : "—", ship.consist.keel ? carInfo(ship.consist.keel).desc : "Nothing slung under the lead car."],
    ["Hull", `${ship.hull}/${stats.hullMax}`, "Plating of every car, one pool."],
    ["Hardpoints", String(stats.weaponSlots), "Weapon mounts on roofs and bellies."],
    ["Drone slots", ship.systems.drones && ship.systemRooms.drones ? String(stats.droneSlots) : "no Drone Bay", "A Drone Bay needs a drone car or a Drone Bay module."],
    ["Cargo", String(stats.cargo), "Unmounted weapons and drones."],
    ["Berths", String(stats.crew), "How many crew the tender can carry."],
    ["Payloads", `max ${stats.payloadMax}`, "Payload rack capacity."],
    ["Spares", `max ${stats.sparesMax}`, "Automaton spares capacity."],
    ["Listening", stats.sensors ? `+${stats.sensors}` : "—", "Extra Listening Post levels from horns."],
    ["Repairs", stats.repair ? `+${Math.round(stats.repair * 100)}%` : "—", "Crew repair speed."],
    ["Evasion", stats.evasion ? `${stats.evasion}%` : "—", "Every coupled car costs 2% evasion: more mass swinging on the carrier."],
  ];
  rows.forEach(([k, v, tip], i) => {
    const ry = y + 26 + i * 18;
    g.text(`{ivory4}${k}{/}`, rx + 12, ry, { font: "body" });
    g.text(v, rx + rw - 12, ry, { font: "body", align: "right", color: C.text, width: rw - 90, maxLines: 1 });
    if (app.ui.hover(rx + 6, ry, rw - 12, 17)) app.ui.setTooltip(tip, 220);
  });
  // ── lower strip: socket choices / confirm / cars / livery ──
  const ly = y + ph + 8;
  if (st.pending) {
    g.panel(x, ly, w, 76, "panel-hi");
    tracked(g, st.pending.label.toUpperCase(), x + 12, ly + 8, { font: "labelb", color: P.brass0 });
    st.pending.deltas.forEach((d, i) => g.text(d, x + 12 + (i % 4) * 170, ly + 24 + Math.floor(i / 4) * 17, { font: "body" }));
    if (brassButton(app, "yard-confirm", x + w - 250, ly + 42, 120, 26, "CONFIRM", { hotkey: "Enter" })) {
      st.pending.apply();
      st.pending = null;
      sfx.play("door-close");
      onChange();
    }
    if (brassButton(app, "yard-cancel", x + w - 124, ly + 42, 112, 26, "CANCEL", { variant: "normal", hotkey: "Backspace" })) st.pending = null;
    return;
  }
  if (!allowed.ok) {
    g.text("{ivory3}Refits, coupling and the livery only at an exchange or a bench. Here the yard is for looking.{/}", x, ly + 6, { font: "body", width: w });
    if (ship.moduleStore.length) g.text(`{ivory4}In the stores: ${ship.moduleStore.map((m) => moduleInfo(m).name).join(", ")}{/}`, x, ly + 26, { font: "body", width: w });
    return;
  }
  if (st.socket) {
    const sk = st.socket;
    const cur = ship.modules[sk];
    tracked(g, socketLabel(sk, ship).toUpperCase(), x, ly + 2, { font: "labelb", color: P.teal1 });
    let bx2 = x;
    const opts: (ModuleId | null)[] = [...new Set(ship.moduleStore)];
    if (cur) opts.unshift(null);
    if (!opts.length) g.text("{ivory4}No modules in the stores. Exchanges sell them; some relays give them.{/}", x, ly + 20, { font: "body" });
    for (const m of opts) {
      const bw2 = 142;
      if (bx2 + bw2 > x + w) break;
      const probe = clone(ship);
      refit(probe, sk, m);
      const deltas = statDeltas(stats, tenderStats(probe));
      if (brassButton(app, `yard-m-${m ?? "none"}`, bx2, ly + 18, bw2, 24, m ? moduleInfo(m).name : "Remove", { variant: m ? "normal" : "danger", font: "body", tooltip: `${m ? moduleInfo(m).desc : "Take the module out (it goes back to the stores)."}\n${deltas.join("\n")}` })) {
        st.pending = {
          label: m ? `Fit ${moduleInfo(m).name}${cur ? ` (replaces ${moduleInfo(cur).name})` : ""}` : `Remove ${moduleInfo(cur!).name}`,
          deltas,
          apply: () => refit(ship, sk, m),
        };
      }
      bx2 += bw2 + 6;
    }
  }
  const cy2 = ly + (st.socket ? 50 : 8);
  let cx = x;
  for (const slot of ["rear", "keel"] as const) {
    const id = ship.consist[slot];
    if (!id) continue;
    const val = allowed.where === "market" ? Math.floor(carInfo(id).price / 2) : 0;
    const label = allowed.where === "market" ? `Sell the ${carInfo(id).name} · +${val}` : `Leave the ${carInfo(id).name}`;
    const probe = clone(ship);
    uncoupleCar(probe, slot);
    const deltas = statDeltas(stats, tenderStats(probe));
    if (brassButton(app, `yard-unc-${slot}`, cx, cy2, 250, 24, label, { variant: "normal", font: "body", tooltip: deltas.join("\n") })) {
      st.pending = {
        label: allowed.where === "market" ? `Uncouple and sell the ${carInfo(id).name}` : `Uncouple the ${carInfo(id).name} and leave it at the bench`,
        deltas,
        apply: () => {
          const out = uncoupleCar(ship, slot);
          let v = val;
          for (const it of out.items) v += sellPrice(it);
          run.inv.salvage += v;
          run.stats.salvageEarned += v;
          st.note = out.items.length ? `No room for ${out.items.map(itemName).join(", ")}: sold.` : "";
        },
      };
    }
    cx += 258;
  }
  // livery lamps
  const lx = x + w - 5 * 28 - 44;
  tracked(g, "LAMP", lx, cy2 + 7, { font: "label", color: P.ivory3 });
  LAMP_COLORS.forEach((c, i) => {
    const sx = lx + 40 + i * 28;
    const on = ship.livery.lamp === c;
    g.rect(sx, cy2, 22, 22, P.ink0);
    g.box(sx, cy2, 22, 22, on ? P.brass0 : P.brass4);
    g.rect(sx + 6, cy2 + 6, 10, 10, LAMP_HEX[c]);
    if (on) glowHD(g, sx + 11, cy2 + 11, 12, LAMP_HEX[c], 0.3);
    const lore = ((flavor as unknown as Record<string, Record<string, { name: string; lore: string }>>).LIVERY_FLAVOR)?.[c];
    if (app.ui.area(`lamp-${c}`, sx, cy2, 22, 22, { tooltip: lore ? `${lore.name} lamps. ${lore.lore}` : `${c} lamps` })) {
      ship.livery.lamp = c;
      sfx.play("lamp-on", { volume: 0.6 });
      onChange();
    }
  });
  if (st.note) g.text(`{ivory3}${st.note}{/}`, x, y + h - 14, { font: "small" });
}

/** Schematic fallback when the combat preview is not available. */
function blueprint(g: Gfx, ship: ShipState, x: number, y: number, w: number, h: number, t: number) {
  const lamp = LAMP_HEX[ship.livery?.lamp ?? "amber"];
  const cy = y + 40;
  g.hline(x + 10, cy, w - 20, P.copper2);
  const lead = { x: x + w / 2 - 60, y: cy + 30, w: 250, h: 84 };
  g.box(lead.x, lead.y, lead.w, lead.h, P.ivory1);
  glowHD(g, lead.x + lead.w + 5, lead.y + 35, 12, lamp, 0.3 + 0.1 * Math.sin(t * 2));
  if (ship.consist.rear) g.box(lead.x - 190, lead.y + 12, 170, 72, P.ivory2);
  if (ship.consist.keel) g.box(lead.x + 40, lead.y + lead.h + 26, 180, 44, P.ivory2);
  tracked(g, ship.name.toUpperCase(), lead.x + 10, lead.y + 8, { font: "small", color: P.ivory2, track: 1 });
}
