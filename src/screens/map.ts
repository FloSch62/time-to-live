// The stage chart (contract §3.2, ★ v2): braided carrier routes between relays along a stretch of the Line, drawn
// on a brass-framed chart plate over the relay view. The Seal advances from the left under a red-violet lattice and
// locks signaling behind the tender; carrier steel remains intact. Click a linked relay to select it, click again (or J / Enter) to hop.
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { art, artSettled } from "../core/assets";
import { sfx } from "../core/audio";
import { P, C, rgba } from "../core/palette";
import { HAZARD_FLAVOR, RELAY_FLAVOR, STAGE_FLAVOR } from "../content/flavor";
import { currentRelay, isSealed, type Relay, type RunState } from "../campaign/model";
import { canHop, knowledge, RELAY_STORES } from "../campaign/run";
import { hopDistances, hopsUntilSealed, sealFactor } from "../campaign/map";
import { stageName } from "../campaign/events";
import type { Session } from "./session";
import { RUN_MODAL, ROMAN, TYPE, brassButton, cable, cachedLayer, fitFont, footer, glow, header, icon, iconC, iconSize, scrim, textAt, tint, tracked } from "./kit";
import { capHeight, capTop, measure } from "../core/font";

/** The chart plate: the run-modal frame below the HUD band. */
const PANEL = RUN_MODAL;
/** The survey field inside it. */
const FIELD = { x: 66, y: 110, w: 828, h: 344 };
/** Chart units → screen: x 1:1, y compressed a little to fit the plate under the run HUD. */
const CX = 100;
const CY = FIELD.y + 12;
const SY = 0.92;
const sxOf = (r: { x: number }) => CX + r.x;
const syOf = (r: { y: number }) => Math.round(CY + r.y * SY);

export interface MapOpts {
  hopEnabled: boolean;
  onHop(to: number): void;
  onWait(): void;
}

type Kind = "combat" | "event" | "distress" | "market" | "hazard" | "bench" | "empty" | "exit" | "start" | "sealed" | "unknown";

function kindOf(run: RunState, r: Relay): Kind {
  if (isSealed(run.map, r)) return "sealed";
  const k = knowledge(run, r);
  if (k === "unknown") return "unknown";
  return r.type;
}

const LABEL: Partial<Record<Kind, string>> = {
  market: "EXCHANGE", exit: "GUARDIAN", bench: "BENCH", distress: "SIGNAL", sealed: "SEALED",
};

export function createMapScene(app: App, session: Session, opts: MapOpts): Scene {
  let selected: number | null = null;
  let hover: number | null = null;
  let t = 0;
  let closing = false;
  const scene: Scene = {
    overlay: true,
    update(dt) {
      t += dt;
    },
    draw(g, a) {
      const run = session.run;
      const map = run.map;
      const cur = currentRelay(run);
      const input = a.input;
      scrim(g, a, run);
      void art;
      void artSettled;
      g.image(cachedLayer("map-plate", `${run.stage}`, 960, 540, (lg) => drawPlate(lg, run, 0)), 0, 0);
      const title = stageName(run.stage);
      textAt(g, title, PANEL.x + 24, PANEL.y + 20, { font: TYPE.title, color: tint(run.stage).light, shadow: P.ink0 });
      const fl = STAGE_FLAVOR?.[run.stage];
      if (fl) {
        const sx = PANEL.x + 24 + Math.ceil(measure(title, TYPE.title)) + 14;
        const room = PANEL.x + PANEL.w - 24 - 96 - sx;
        const fit = fitFont(fl.plate, room, [[TYPE.note, 0]]);
        textAt(g, fl.plate, sx, PANEL.y + 20 + capHeight(TYPE.title) - capHeight(TYPE.note) - (fit.w > room ? 7 : 0), { font: TYPE.note, color: P.ivory3, width: fit.w > room ? room : undefined });
      }
      drawSeal(g, run, t);
      const linkKey = `${run.seed}|${run.stage}|${run.pos}|${map.sealX.toFixed(1)}|${run.route.length}|${run.inv.ttl > 0}`;
      g.image(cachedLayer("map-links", linkKey, 960, 540, (lg) => drawLinks(lg, run, null, null)), 0, 0);
      drawLinks(g, run, selected, hover, true);
      // relays
      hover = null;
      const reachable = new Set(cur.links.filter((j) => canHop(run, j).ok && opts.hopEnabled));
      for (const r of map.relays) {
        const x = sxOf(r);
        const y = syOf(r);
        if (a.ui.hot(`relay-${r.id}`, x - 10, y - 10, 20, 20, false)) hover = r.id;
      }
      for (const r of map.relays) drawRelay(g, run, r, t, r.id === selected, r.id === hover, reachable.has(r.id));
      // the tender marker
      const mx = sxOf(cur);
      const my = syOf(cur) - 17 + (Math.floor(t * 2) % 2);
      if (!g.anim("icons", "ship-lamplighter", t, mx, my) && !iconC(g, "ship-lamplighter-0", mx, my)) {
        g.rect(mx - 6, my - 2, 12, 5, P.ivory1);
        g.rect(mx + 5, my - 1, 2, 3, P.amber1);
      }
      // hover tooltip + interactions
      if (hover !== null) {
        const r = map.relays[hover];
        a.ui.cursor = reachable.has(hover) ? "pointer" : "arrow";
        a.ui.setTooltip(tooltipFor(run, r, reachable.has(r.id)), 260, { x: sxOf(r) - 12, y: syOf(r) - 30, w: 24, h: 54, side: sxOf(r) > 600 ? "left" : "right" });
        if (input.pressed(0)) {
          input.consume();
          if (reachable.has(hover)) {
            if (selected === hover || input.doubleClick) doHop(hover);
            else {
              selected = hover;
              sfx.play("ui-click");
            }
          } else sfx.play("power-denied", { volume: 0.6 });
        }
      }
      // keyboard: cycle linked relays, hop
      const links = [...reachable].sort((p, q) => map.relays[p].y - map.relays[q].y);
      if (links.length && (input.keyPressed("Tab") || input.keyPressed("ArrowDown") || input.keyPressed("ArrowUp"))) {
        const i = selected === null ? -1 : links.indexOf(selected);
        const d = input.keyPressed("ArrowUp") ? -1 : 1;
        selected = links[(i + d + links.length) % links.length];
        sfx.play("ui-hover", { volume: 0.4 });
      }
      bottomBar(g, a, run, selected, reachable, links);
      if (input.keyPressed("Escape") || input.keyPressed("KeyM")) {
        input.eatKey("Escape");
        input.eatKey("KeyM");
        close();
      }
    },
  };

  function close() {
    if (closing) return;
    closing = true;
    sfx.play("ui-back", { volume: 0.7 });
    session.remove(scene);
  }

  function doHop(to: number) {
    if (closing) return;
    closing = true;
    session.remove(scene);
    opts.onHop(to);
  }

  function bottomBar(g: Gfx, a: App, run: RunState, sel: number | null, reachable: Set<number>, links: number[]) {
    const y = FIELD.y + FIELD.h + 8;
    const h = PANEL.y + PANEL.h - 20 - y;
    legend(g, PANEL.x + 24, y + 2);
    // centre: selection / TTL info
    const cx = 580;
    const map = run.map;
    const toExit = hopDistances(map.relays, map.exit)[currentRelay(run).id];
    const l1 = y + Math.round(h / 2) - 13;
    if (sel !== null) {
      const r = map.relays[sel];
      const k = kindOf(run, r);
      const name = k === "unknown" ? "Unknown relay" : (RELAY_FLAVOR as Record<string, { name: string }>)[k === "start" ? "empty" : k]?.name ?? k;
      header(g, `${r.name} · ${name}`, cx, l1, { font: TYPE.strong, color: P.teal1, align: "center" });
      const seal = hopsUntilSealed(map, r);
      textAt(g, `Handshake and hop: {amber1}1 TTL{/} · ${seal === Infinity ? "the gate holds the Seal" : seal <= 1 ? "{ember1}the Seal is at the door{/}" : `Seal in ${seal} hops`}`, cx, l1 + 15, { font: TYPE.body, align: "center", color: C.textDim });
    } else {
      header(g, run.inv.ttl > 0 ? `TTL ${run.inv.ttl} · guardian ${toExit} hop${toExit === 1 ? "" : "s"} away` : "TTL 0 · the connection is dropped", cx, l1, { font: TYPE.strong, color: run.inv.ttl > 0 ? P.amber1 : P.ember1, align: "center" });
      textAt(g, run.inv.ttl > 0 ? (links.length ? "Pick a linked relay on the chart." : "Finish what is happening here first.") : "Drift on the carrier and wait for a signal. The Seal will not wait.", cx, l1 + 15, { font: TYPE.body, align: "center", color: C.textDim });
    }
    // right: buttons
    const bw = 140;
    const bx = PANEL.x + PANEL.w - 24 - bw;
    const by = y + Math.round((h - 40) / 2);
    if (run.inv.ttl <= 0 && opts.hopEnabled) {
      if (brassButton(a, "map-wait", bx, by, bw, 40, "WAIT", { hotkey: "KeyW", sub: "for a signal", variant: "danger", tooltip: "Drift on the carrier and hope something answers. The Seal advances faster while you wait." })) {
        closing = true;
        session.remove(scene);
        opts.onWait();
      }
    } else if (brassButton(a, "map-hop", bx, by, bw, 40, "HOP", { hotkey: "KeyJ", hotkeys: ["Enter"], icon: "glyph-hop", disabled: sel === null || !reachable.has(sel), sub: "handshake · 1 TTL" })) {
      if (sel !== null) doHop(sel);
    }
    if (brassButton(a, "map-close", PANEL.x + PANEL.w - 24 - 96, PANEL.y + 14, 96, 24, "CLOSE", { variant: "normal", hotkey: "KeyM", sound: null })) close();
    footer(g, a, [["TAB", "next linked relay"]], [["J", "hop"], ["M", "close"]]);
  }

  return scene;
}

function tooltipFor(run: RunState, r: Relay, reachable: boolean): string {
  const k = kindOf(run, r);
  const fl = (RELAY_FLAVOR as Record<string, { name: string; desc: string }>)[k === "start" ? "empty" : k];
  const lines: string[] = [`{brass1}${r.name}{/} · {ivory0}${fl?.name ?? "Relay"}{/}`];
  if (fl?.desc) lines.push(`{ivory3}${fl.desc}{/}`);
  if (r.hazard && k !== "unknown") {
    const hz = HAZARD_FLAVOR[r.hazard];
    lines.push(`{amber1}${hz.name}{/}: ${hz.desc}`);
  }
  if (r.visited) lines.push("{ivory4}Visited{/}");
  if (!isSealed(run.map, r) && r.type !== "start" && r.type !== "exit") {
    lines.push(r.serviceSalvage !== undefined ? "{ivory4}Maintenance stores already recovered{/}"
      : `{brass1}Clear this relay: ${RELAY_STORES[run.stage]} salvage in maintenance stores{/}`);
  }
  const seal = hopsUntilSealed(run.map, r);
  if (seal === 0) lines.push("{ember1}Sealed: quarantine patrols, nothing worth taking{/}");
  else if (seal !== Infinity) lines.push(`{ivory4}The Seal reaches it in ${seal} hop${seal === 1 ? "" : "s"}{/}`);
  if (r.id === run.pos) lines.push("{teal1}The tender is here{/}");
  else if (reachable) lines.push("{teal1}Linked · 1 TTL{/}");
  else if (currentRelay(run).links.includes(r.id)) lines.push(`{ember1}${canHop(run, r.id).reason ?? ""}{/}`);
  if (r.hazard === "sealing-lattice" || r.hazard === "glass-fog") lines.push(`{violet1}The Seal moves ×${sealFactor(r)} from here{/}`);
  return lines.join("\n");
}

function drawPlate(g: Gfx, run: RunState, t: number) {
  const { x, y, w, h } = PANEL;
  g.panel(x, y, w, h, "dialog");
  // chart field
  const { x: fx, y: fy, w: fw, h: fh } = FIELD;
  g.rect(fx, fy, fw, fh, P.ink1);
  g.box(fx, fy, fw, fh, P.ink3);
  g.box(fx + 2, fy + 2, fw - 4, fh - 4, rgba(P.ivory3, 0.18));
  // survey grid: faint ivory dots and the Line's outer hull bands
  for (let gx = fx + 10; gx < fx + fw - 4; gx += 20) {
    for (let gy = fy + 10; gy < fy + fh - 4; gy += 20) g.rect(gx, gy, 1, 1, rgba(P.ivory3, 0.22));
  }
  const tn = tint(run.stage);
  for (let i = 0; i < 3; i++) {
    const by = fy + 40 + i * 110;
    for (let bx = fx + 6; bx < fx + fw - 6; bx += 3) g.rect(bx, by + Math.round(Math.sin(bx / 90 + i) * 3), 1, 1, rgba(tn.main, 0.18));
  }
  // compass rose (lower right): the arrow points on toward the Heart; its label sits clear to the left
  const rx = fx + fw - 30;
  const ry = fy + fh - 30;
  g.circle(rx, ry, 14, rgba(P.ivory3, 0.35));
  g.circle(rx, ry, 9, rgba(P.ivory3, 0.2));
  g.line(rx - 18, ry, rx + 18, ry, rgba(P.ivory3, 0.35));
  g.line(rx, ry - 18, rx, ry + 18, rgba(P.ivory3, 0.35));
  g.rect(rx + 16, ry - 1, 4, 3, P.brass2);
  const lbl = run.stage === 3 ? "TO THE CORE" : "TOWARD THE HEART";
  tracked(g, lbl, rx - 24, ry - capTop(TYPE.note) - capHeight(TYPE.note) / 2, { font: TYPE.note, color: rgba(P.ivory3, 0.75), align: "right", track: 0.5 });
  // scale bar (lower left)
  const sx = fx + 16;
  const sy = fy + fh - 14;
  g.hline(sx, sy, 130, rgba(P.ivory3, 0.5));
  g.vline(sx, sy - 3, 6, rgba(P.ivory3, 0.5));
  g.vline(sx + 130, sy - 3, 6, rgba(P.ivory3, 0.5));
  tracked(g, "ONE HOP", sx + 65, sy - 12 - capTop(TYPE.note), { font: TYPE.note, color: rgba(P.ivory3, 0.75), align: "center", track: 0.5 });
  void t;
}

function drawSeal(g: Gfx, run: RunState, t: number) {
  const map = run.map;
  const sx = Math.round(CX + map.sealX);
  const left = FIELD.x + 2;
  if (sx <= left) {
    // off-chart: a hint of the red seam at the left edge
    g.alpha(0.5 + 0.2 * Math.sin(t * 3), () => g.rect(left, FIELD.y + 2, 2, FIELD.h - 4, P.ember3));
    return;
  }
  const top = FIELD.y + 14;
  const h = FIELD.h - 18;
  const lattice = cachedLayer("seal-lattice", "v1", 900, h, (lg) => {
    lg.alpha(0.3, () => lg.rect(0, 0, 900, h, P.violet4));
    lg.alpha(0.45, () => {
      for (let x = -h; x < 900; x += 14) {
        lg.line(x, 0, x + h, h, P.violet3);
        lg.line(x + h, 0, x, h, P.ember4);
      }
    });
  });
  const lw = Math.min(900, sx - left);
  if (lw > 0) g.sub(lattice, 900 - lw, 0, lw, h, left, top);
  // the front: a jagged red seam with a glow
  for (let y = top; y < top + h; y += 2) {
    const jx = sx + Math.round(Math.sin(y * 0.21 + t * 2) * 2 + Math.sin(y * 0.05) * 3);
    g.rect(jx - 1, y, 2, 2, (y >> 2) % 3 === 0 ? P.ember1 : P.ember2);
  }
  g.alpha(0.12 + 0.05 * Math.sin(t * 3), () => g.rect(sx - 6, top, 12, h, P.ember2));
  if (!iconC(g, "beacon-seal-front", sx, top - 2)) g.rect(sx - 3, top - 5, 7, 7, P.ember2);
  const lw2 = Math.ceil(measure("THE SEAL", TYPE.note)) + 8;
  const lx2 = Math.max(FIELD.x + 4, sx - 10 - lw2);
  g.alpha(0.8, () => g.rect(lx2, top - 9, lw2, 13, P.ink0));
  g.text("THE SEAL", lx2 + 4, top - 9 + Math.round((13 - capHeight(TYPE.note)) / 2) - capTop(TYPE.note), { font: TYPE.note, color: P.ember1 });
}

function drawLinks(g: Gfx, run: RunState, selected: number | null, hover: number | null, onlyHighlighted = false) {
  const map = run.map;
  const cur = currentRelay(run);
  // visited route segments
  const routeEdges = new Set<string>();
  const route = run.route.filter((e) => e.stage === run.stage);
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1].relay;
    const b = route[i].relay;
    routeEdges.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  }
  for (const r of map.relays) {
    for (const j of r.links) {
      if (j < r.id) continue;
      const q = map.relays[j];
      const a = { x: sxOf(r), y: syOf(r) };
      const b = { x: sxOf(q), y: syOf(q) };
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const sag = Math.round(d * 0.07);
      const key = `${r.id}-${j}`;
      const fromCur = (r.id === cur.id || j === cur.id);
      const toSel = selected !== null && ((r.id === cur.id && j === selected) || (j === cur.id && r.id === selected));
      const toHover = hover !== null && ((r.id === cur.id && j === hover) || (j === cur.id && r.id === hover));
      if (onlyHighlighted && !toSel && !toHover) continue;
      const sa = isSealed(map, r);
      const sb = isSealed(map, q);
      let color: string = P.copper2;
      let hi: string = P.copper1;
      let lo: string = P.copper4;
      if (routeEdges.has(key)) {
        color = P.brass3;
        hi = P.brass1;
        lo = P.brass5;
      }
      if (fromCur && run.inv.ttl > 0) {
        color = P.teal3;
        hi = P.teal2;
        lo = P.teal4;
      }
      if (toSel || toHover) {
        color = P.teal1;
        hi = P.teal0;
        lo = P.teal3;
      }
      // Quarantine locks signaling and service access, not the supporting cable.
      cable(g, a.x, a.y, b.x, b.y, sag, { color: sa && sb ? P.violet4 : color,
        hi: sa && sb ? P.violet3 : hi, lo: sa && sb ? P.ink0 : lo, thick: 2 });
      if (sa || sb) {
        const u = sa && sb ? 0.5 : sealCrossing(map.sealX + CX, a, b);
        const lx = a.x + (b.x - a.x) * u;
        const ly = a.y + (b.y - a.y) * u + 4 * sag * u * (1 - u);
        g.rect(lx - 4, ly - 5, 8, 10, P.ink1);
        g.box(lx - 4, ly - 5, 8, 10, P.ember2);
        g.hline(lx - 2, ly, 4, P.ember1);
      }
    }
  }
}

function sealCrossing(sx: number, a: { x: number }, b: { x: number }): number {
  if (b.x === a.x) return 0.5;
  return Math.max(0, Math.min(1, (sx - a.x) / (b.x - a.x)));
}

function frayed(g: Gfx, a: { x: number; y: number }, b: { x: number; y: number }, sag: number, u0: number, u1: number) {
  for (const [u, dir] of [[u0, 1], [u1, -1]] as [number, number][]) {
    const x = a.x + (b.x - a.x) * u;
    const y = a.y + (b.y - a.y) * u + sag * 4 * u * (1 - u);
    g.rect(Math.round(x) + dir, Math.round(y) + 1, 1, 2, P.copper1);
    g.rect(Math.round(x) + dir * 2, Math.round(y) - 1, 1, 1, P.copper0);
    g.rect(Math.round(x), Math.round(y) + 2, 1, 1, P.ember2);
  }
}

function drawRelay(g: Gfx, run: RunState, r: Relay, t: number, selected: boolean, hovered: boolean, reachable: boolean) {
  const x = sxOf(r);
  const y = syOf(r);
  const k = kindOf(run, r);
  const isCur = r.id === run.pos;
  const dim = r.visited && r.resolved && !isCur && k !== "market" && k !== "sealed";
  if (reachable) {
    const p = 0.5 + 0.5 * Math.sin(t * 4 + r.id);
    g.alpha(0.25 + 0.2 * p, () => g.circle(x, y, 11, P.teal2));
  }
  if (selected) {
    if (!iconC(g, "beacon-ring-select", x, y)) g.circle(x, y, 12, P.teal1);
  } else if (hovered) {
    if (!iconC(g, "beacon-ring-hover", x, y)) g.circle(x, y, 12, P.ivory2);
  }
  const frame = isCur ? null : k === "unknown" ? "beacon-unknown" : k === "start" ? "beacon-visited" : `beacon-${k}`;
  let drawn = false;
  if (isCur) drawn = g.anim("icons", "beacon-current", t, x, y) || iconC(g, "beacon-current-0", x, y);
  else if (frame) {
    const s = iconSize(frame);
    if (s) {
      drawn = icon(g, frame, Math.round(x - s.w / 2), Math.round(y - s.h / 2), dim ? 0.55 : 1);
    }
  }
  if (!drawn) fallbackBeacon(g, x, y, isCur ? "current" : k, dim);
  if (r.visited && !isCur && k !== "sealed") g.rect(x + 6, y + 5, 2, 2, P.brass1);
  if (k === "market" || k === "exit") glow(g, x, y, 12, k === "exit" ? P.ember2 : P.amber2, 0.18);
  const label = LABEL[k];
  if (label && (k !== "sealed" || isCur)) relayLabel(g, label, x, y + 12, k === "exit" ? P.ember1 : k === "market" ? P.amber1 : k === "sealed" ? P.ember2 : P.ivory2);
  else if (k === "hazard" && r.hazard) relayLabel(g, HAZARD_FLAVOR[r.hazard].name.toUpperCase(), x, y + 12, P.amber2);
}

function fallbackBeacon(g: Gfx, x: number, y: number, k: string, dim: boolean) {
  const col: Record<string, string> = {
    combat: P.ember2, event: P.teal2, distress: P.amber2, market: P.brass1, hazard: P.amber3, bench: P.verd1,
    empty: P.steel2, exit: P.ember1, start: P.ivory3, sealed: P.violet2, unknown: P.steel1, current: P.teal1,
  };
  g.circle(x, y, 6, P.ink0, true);
  g.circle(x, y, 5, dim ? P.ink4 : P.ink3, true);
  g.circle(x, y, 5, col[k] ?? P.ivory2);
  g.rect(x - 1, y - 1, 3, 3, col[k] ?? P.ivory2);
}

/** A relay's kind under its beacon: note caps on a dark backing so it reads over the cables. */
function relayLabel(g: Gfx, text: string, cx: number, y: number, color: string) {
  const w = Math.ceil(measure(text, TYPE.note)) + 6;
  const x = Math.round(cx - w / 2);
  g.alpha(0.72, () => g.rect(x, y, w, 12, P.ink0));
  g.text(text, x + 3, y + Math.round((12 - capHeight(TYPE.note)) / 2) - capTop(TYPE.note), { font: TYPE.note, color });
}

function legend(g: Gfx, x: number, y: number) {
  const items: [string, string][] = [
    ["beacon-market", "Exchange"], ["beacon-bench", "Bench"], ["beacon-distress", "Signal"], ["beacon-hazard", "Hazard"],
    ["beacon-unknown", "Unknown"], ["beacon-sealed", "Sealed"], ["beacon-exit", "Guardian"],
  ];
  items.forEach(([f, label], i) => {
    const cx = x + (i % 4) * 88;
    const cy = y + Math.floor(i / 4) * 20;
    if (!iconC(g, f, cx + 8, cy + 8)) fallbackBeacon(g, cx + 8, cy + 8, f.replace("beacon-", ""), false);
    textAt(g, label, cx + 20, cy + 4.5, { font: TYPE.note, color: P.ivory2 });
  });
}
