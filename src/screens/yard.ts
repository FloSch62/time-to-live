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
  carInfo, moduleInfo, refit, refitBlocker, sockets, socketLabel, tenderStats, uncoupleCar, uncoupleBlocker, type TenderStats,
} from "../campaign/refit";
import { itemName, sellPrice } from "../campaign/catalog";
import { TYPE, Zoom, brassButton, fitFont, glowHD, header, inset, textAt, tracked } from "./kit";
import { capHeight, capTop, measure } from "../core/font";
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
  line(Math.round((b.weaponCharge - a.weaponCharge) * 100), "weapon charge", b.weaponCharge > a.weaponCharge, true);
  line(Math.round((b.droneCharge - a.droneCharge) * 100), "drone cycle", b.droneCharge > a.droneCharge, true);
  line(Math.round((b.veilCooldown - a.veilCooldown) * 100), "Veil recovery", b.veilCooldown > a.veilCooldown, true);
  line(Math.round((b.debrisProtection - a.debrisProtection) * 100), "debris protection", b.debrisProtection > a.debrisProtection, true);
  line(b.relayStores - a.relayStores, "stores / relay");
  line(b.salvageRepair - a.salvageRepair, "hull / secured fight");
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
  const rw = 236;
  const pw = w - rw - 12;
  const stripH = 66;
  const ph = h - stripH - 8;
  inset(g, x, y, pw, ph, "#0b1120");
  for (let gx = x + 12; gx < x + pw; gx += 24) g.vline(gx, y + 1, ph - 2, rgba(P.teal4, 0.12));
  for (let gy = y + 12; gy < y + ph; gy += 24) g.hline(x + 1, gy, pw - 2, rgba(P.teal4, 0.12));
  st.zoom.handle(app, { x, y, w: pw, h: ph });
  const pg = previewGrip(ship);
  let hoverSock: string | null = null;
  let hoverMountTip = "";
  const labels: { x: number; y: number; w: number; h: number; text: string; on: boolean; hot: boolean }[] = [];
  g.clip(x + 1, y + 1, pw - 2, ph - 2, () => {
    st.zoom.apply(g, () => {
      if (pg && combatApi.drawShipPreview) {
        const fit = Math.min(1, (pw - 24) / pg.w, (ph - 40) / pg.h);
        const px = Math.round(x + (pw - pg.w * fit) / 2);
        const py = Math.round(y + 26 + (ph - 36 - pg.h * fit) / 2);
        g.ctx.save();
        g.ctx.translate(px, py);
        g.ctx.scale(fit, fit);
        // The carrier the consist hangs from (the shared renderer), run across the whole inset.
        const res = combatApi.drawShipPreview(g, ship, 0, 0, { t, crew: true, sockets: false, carrier: { region: run.stage, extend: 320 } }) as { rooms?: { id: string; x: number; y: number; w: number; h: number; socket: boolean; module?: string }[] } | void;
        const pointer = st.zoom.toWorld(app.input.x, app.input.y);
        const m = { x: (pointer.x - px) / fit, y: (pointer.y - py) / fit };
        // Weapons on the hull explain themselves (ship view agent C, hull mount tooltips).
        const mounts = (res as { mounts?: { x: number; y: number; w: number; h: number; tip: () => string }[] } | void)?.mounts ?? [];
        const mount = app.input.inRect(x, y, pw, ph) ? mounts.find((q) => m.x >= q.x && m.y >= q.y && m.x < q.x + q.w && m.y < q.y + q.h) : undefined;
        if (mount) { hoverMountTip = mount.tip(); g.box(Math.round(mount.x), Math.round(mount.y), Math.round(mount.w), Math.round(mount.h), P.teal1); }
        for (const r of res?.rooms ?? []) {
          if (!r.socket) continue;
          const mod = ship.modules?.[r.id];
          const hot = app.input.inRect(x, y, pw, ph) && m.x >= r.x && m.y >= r.y && m.x < r.x + r.w && m.y < r.y + r.h;
          if (hot) hoverSock = r.id;
          const picked = st.socket === r.id;
          g.box(r.x, r.y, r.w, r.h, picked ? P.amber1 : hot ? P.teal1 : P.brass2, picked || hot ? 2 : 1);
          const s0 = st.zoom.toScreen(px + r.x * fit, py + r.y * fit, r.w * fit, r.h * fit);
          labels.push({ ...s0, text: mod ? moduleInfo(mod).name : "empty socket", on: !!mod, hot: hot || picked });
        }
        g.ctx.restore();
      } else {
        blueprint(g, ship, x, y, pw, ph, t);
      }
    });
    // socket labels in screen space (legible at any zoom)
    for (const l of labels) {
      const tw = Math.ceil(measure(l.text, TYPE.note)) + 8;
      const lx = Math.round(l.x + Math.max(1, (l.w - tw) / 2));
      const ly = Math.round(l.y + l.h - 15);
      g.alpha(0.88, () => g.rect(lx, ly, tw, 13, P.ink0));
      g.box(lx, ly, tw, 13, l.hot ? P.teal1 : l.on ? P.brass3 : P.brass5);
      g.text(l.text, lx + 4, ly + Math.round((13 - capHeight(TYPE.note)) / 2) - capTop(TYPE.note), { font: TYPE.note, color: l.hot ? P.teal0 : l.on ? P.brass0 : P.ivory2 });
    }
  });
  header(g, allowed.ok ? "Click a socket to refit · wheel zoom · right-drag pan · Z reset" : "Wheel zoom · right-drag pan · Z reset", x + 10, y + 9, { color: P.teal2 });
  if (hoverMountTip && !hoverSock) app.ui.setTooltip(hoverMountTip, 300);
  if (hoverSock) {
    const m = ship.modules?.[hoverSock];
    app.ui.cursor = allowed.ok ? "pointer" : "arrow";
    app.ui.setTooltip(`{brass1}${socketLabel(hoverSock, ship)}{/}\n${m ? `${moduleInfo(m).name}: ${moduleInfo(m).desc}` : "{ivory4}Empty socket: fit a module here.{/}"}${allowed.ok ? "" : "\n{ivory4}Refits only at an exchange or a bench.{/}"}`, 260);
    if (app.input.pressed(0) && allowed.ok) {
      app.input.consume();
      st.socket = st.socket === hoverSock ? null : hoverSock;
      st.pending = null;
      sfx.play("ui-click");
    }
  }
  // ── right column: the numbers ──
  const rx = x + pw + 12;
  g.panel(rx, y, rw, ph, "panel-dark");
  header(g, "The consist", rx + 12, y + 11);
  const rows: [string, string, string][] = [
    ["Rear car", ship.consist.rear ? carInfo(ship.consist.rear).name : "—", ship.consist.rear ? carInfo(ship.consist.rear).desc : "Nothing coupled behind the lead car."],
    ["Keel car", ship.consist.keel ? carInfo(ship.consist.keel).name : "—", ship.consist.keel ? carInfo(ship.consist.keel).desc : "Nothing slung under the lead car."],
    ["Hull", `${ship.hull}/${stats.hullMax}`, "Plating of every car, one pool."],
    ["Hardpoints", String(stats.weaponSlots), "Weapon mounts on roofs and bellies."],
    ["Drone slots", ship.systems.drones && ship.systemRooms.drones ? String(stats.droneSlots) : "no Drone Bay", "Launch from a native cradle, Drone Car, or Drone Bay module. Drones and reactor power are separate."],
    ["Cargo", String(stats.cargo), "Unmounted weapons and drones."],
    ["Berths", String(stats.crew), "How many crew the tender can carry."],
    ["Payloads", `max ${stats.payloadMax}`, "Payload rack capacity."],
    ["Spares", `max ${stats.sparesMax}`, "Automaton spares capacity."],
    ["Listening", stats.sensors ? `+${stats.sensors}` : "—", "Extra Listening Post levels from horns."],
    ["Repairs", stats.repair ? `+${Math.round(stats.repair * 100)}%` : "—", "Crew repair speed."],
    ["Evasion", stats.evasion ? `${stats.evasion}%` : "—", "Attached cars cost 1–3% evasion each, depending on mass. Their descriptions list the handling cost."],
  ];
  const rowH = Math.max(14, Math.min(18, Math.floor((ph - 30) / rows.length)));
  rows.forEach(([k, v, tip], i) => {
    const ry = y + 28 + i * rowH;
    textAt(g, k, rx + 12, ry + 2, { font: TYPE.note, color: P.ivory3 });
    const fit = fitFont(v, rw - 104, [[TYPE.body, 0], [TYPE.note, 0]]);
    textAt(g, v, rx + rw - 12, ry + (fit.font === TYPE.body ? 0 : 2), { font: fit.font, align: "right", color: C.text });
    if (app.ui.hover(rx + 6, ry - 2, rw - 12, rowH)) app.ui.setTooltip(tip, 220, { x: rx + 6, y: ry - 2, w: rw - 12, h: rowH, side: "left" });
  });
  // ── lower strip: socket choices / confirm / cars / livery ──
  const ly = y + ph + 8;
  if (st.pending) {
    g.panel(x, ly, w, stripH, "panel-hi");
    header(g, st.pending.label, x + 12, ly + 10, { font: TYPE.strong, color: P.brass0 });
    st.pending.deltas.forEach((d, i) => textAt(g, d, x + 12 + (i % 4) * 150, ly + 26 + Math.floor(i / 4) * 16, { font: TYPE.body }));
    if (brassButton(app, "yard-confirm", x + w - 262, ly + stripH - 34, 124, 26, "CONFIRM", { hotkey: "Enter" })) {
      st.pending.apply();
      st.pending = null;
      sfx.play("door-close");
      onChange();
    }
    if (brassButton(app, "yard-cancel", x + w - 132, ly + stripH - 34, 120, 26, "CANCEL", { variant: "normal", hotkey: "Backspace" })) st.pending = null;
    return;
  }
  if (!allowed.ok) {
    let ty = ly + 4;
    ty += textAt(g, "Refits, coupling and the livery happen only at an exchange or a bench. Here the yard is for looking.", x, ty, { font: TYPE.body, color: P.ivory3, width: w }) + 4;
    if (ship.moduleStore.length) textAt(g, `In the stores: ${ship.moduleStore.map((m) => moduleInfo(m).name).join(", ")}`, x, ty, { font: TYPE.note, color: P.ivory3, width: w });
    return;
  }
  let cy2 = ly;
  if (st.socket) {
    const sk = st.socket;
    const cur = ship.modules[sk];
    header(g, `${socketLabel(sk, ship)} · fit a module`, x, ly + 2, { font: TYPE.strong, color: P.teal1 });
    let bx2 = x;
    const opts: (ModuleId | null)[] = [...new Set(ship.moduleStore)];
    if (cur) opts.unshift(null);
    if (!opts.length) textAt(g, "No modules in the stores. Exchanges sell them; some relays give them.", x, ly + 20, { font: TYPE.note, color: P.ivory3 });
    for (const m of opts) {
      const label = m ? moduleInfo(m).name : "Remove";
      const bw2 = Math.max(110, Math.ceil(measure(label, TYPE.body)) + 24);
      if (bx2 + bw2 > x + w) break;
      const probe = clone(ship);
      refit(probe, sk, m);
      const deltas = statDeltas(stats, tenderStats(probe));
      const blocked = refitBlocker(ship, sk, m);
      if (brassButton(app, `yard-m-${m ?? "none"}`, bx2, ly + 16, bw2, 24, label, { disabled: !!blocked, variant: m ? "normal" : "danger", font: "body", tooltip: blocked ?? `${m ? moduleInfo(m).desc : "Take the module out (it goes back to the stores)."}\n${deltas.join("\n")}` })) {
        st.pending = {
          label: m ? `Fit ${moduleInfo(m).name}${cur ? ` (replaces ${moduleInfo(cur).name})` : ""}` : `Remove ${moduleInfo(cur!).name}`,
          deltas,
          apply: () => refit(ship, sk, m),
        };
      }
      bx2 += bw2 + 6;
    }
    cy2 = ly + 44;
  }
  let cx = x;
  const carH = st.socket ? 22 : 26;
  for (const slot of ["rear", "keel"] as const) {
    const id = ship.consist[slot];
    if (!id) continue;
    const val = allowed.where === "market" ? Math.floor(carInfo(id).price / 2) : 0;
    const label = allowed.where === "market" ? `Sell the ${carInfo(id).name} · +${val}` : `Leave the ${carInfo(id).name}`;
    const probe = clone(ship);
    uncoupleCar(probe, slot);
    const deltas = statDeltas(stats, tenderStats(probe));
    const blocked = uncoupleBlocker(ship, slot);
    const bw = Math.ceil(measure(label, TYPE.body)) + 28;
    if (brassButton(app, `yard-unc-${slot}`, cx, cy2, bw, carH, label, { disabled: !!blocked, variant: "normal", font: "body", tooltip: blocked ?? deltas.join("\n") })) {
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
    cx += bw + 8;
  }
  // livery lamps
  const lx = x + w - 5 * 28 - 58;
  const lampY = st.socket ? ly + 16 : cy2;
  header(g, "Lamp", lx, lampY + 7);
  LAMP_COLORS.forEach((c, i) => {
    const sx = lx + 50 + i * 28;
    const on = ship.livery.lamp === c;
    g.rect(sx, lampY, 22, 22, P.ink0);
    g.box(sx, lampY, 22, 22, on ? P.brass0 : P.brass4);
    g.rect(sx + 6, lampY + 6, 10, 10, LAMP_HEX[c]);
    if (on) glowHD(g, sx + 11, lampY + 11, 12, LAMP_HEX[c], 0.3);
    const lore = ((flavor as unknown as Record<string, Record<string, { name: string; lore: string }>>).LIVERY_FLAVOR)?.[c];
    if (app.ui.area(`lamp-${c}`, sx, lampY, 22, 22, { tooltip: lore ? `${lore.name} lamps. ${lore.lore}` : `${c} lamps` })) {
      ship.livery.lamp = c;
      sfx.play("lamp-on", { volume: 0.6 });
      onChange();
    }
  });
  if (st.note) textAt(g, st.note, x, y + h - 10, { font: TYPE.note, color: P.ivory3 });
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
  tracked(g, ship.name.toUpperCase(), lead.x + 10, lead.y + 8, { font: TYPE.note, color: P.ivory2 });
}
