// The stage chart (contract §3.2, ★ v2): braided carrier routes between relays along a stretch of the Line, drawn
// on a brass-framed chart plate over the relay view. The Seal advances from the left under a red-violet lattice and
// cuts the carriers behind the tender. Click a linked relay to select it, click again (or J / Enter) to hop.
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
import { ROMAN, brassButton, cable, cachedLayer, glow, icon, iconC, iconSize, keyHints, runHud, tint, titlePlate, tracked } from "./kit";

const CX = 100;
const CY = 112;
const PANEL = { x: 36, y: 60, w: 888, h: 470 };

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
      g.dim(0.55);
      // Use the region panorama behind the brass chart plate.
      const bgId = `bg/s${run.stage}-c`;
      const bgImg = art(bgId);
      if (bgImg) g.cover(bgImg, 0.9);
      void artSettled;
      g.image(cachedLayer("map-plate", `${run.stage}`, 960, 540, (lg) => drawPlate(lg, run, 0)), 0, 0);
      titlePlate(g, 480, PANEL.y - 11, `STAGE ${ROMAN[run.stage]} · ${stageName(run.stage).toUpperCase()}`, { w: 360, color: tint(run.stage).light });
      const fl = STAGE_FLAVOR?.[run.stage];
      if (fl) g.text(`{ivory3}${fl.plate}{/}`, 480, PANEL.y + 15, { font: "body", align: "center", width: 760, maxLines: 1 });
      drawSeal(g, run, t);
      const linkKey = `${run.seed}|${run.stage}|${run.pos}|${map.sealX.toFixed(1)}|${run.route.length}|${run.inv.ttl > 0}`;
      g.image(cachedLayer("map-links", linkKey, 960, 540, (lg) => drawLinks(lg, run, null, null)), 0, 0);
      drawLinks(g, run, selected, hover, true);
      // relays
      hover = null;
      const reachable = new Set(cur.links.filter((j) => canHop(run, j).ok && opts.hopEnabled));
      for (const r of map.relays) {
        const x = CX + r.x;
        const y = CY + r.y;
        if (a.ui.hot(`relay-${r.id}`, x - 10, y - 10, 20, 20, false)) hover = r.id;
      }
      for (const r of map.relays) drawRelay(g, run, r, t, r.id === selected, r.id === hover, reachable.has(r.id));
      // the tender marker
      const mx = CX + cur.x;
      const my = CY + cur.y - 17 + (Math.floor(t * 2) % 2);
      if (!g.anim("icons", "ship-lamplighter", t, mx, my) && !iconC(g, "ship-lamplighter-0", mx, my)) {
        g.rect(mx - 6, my - 2, 12, 5, P.ivory1);
        g.rect(mx + 5, my - 1, 2, 3, P.amber1);
      }
      // hover tooltip + interactions
      if (hover !== null) {
        const r = map.relays[hover];
        a.ui.cursor = reachable.has(hover) ? "pointer" : "arrow";
        a.ui.setTooltip(tooltipFor(run, r, reachable.has(r.id)), 250);
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
      runHud(g, a, run, { compact: true });
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
    const y = PANEL.y + PANEL.h - 50;
    legend(g, PANEL.x + 18, y + 2);
    // centre: selection / TTL info
    const cx = 580;
    const map = run.map;
    const toExit = hopDistances(map.relays, map.exit)[currentRelay(run).id];
    if (sel !== null) {
      const r = map.relays[sel];
      const k = kindOf(run, r);
      const name = k === "unknown" ? "Unknown relay" : (RELAY_FLAVOR as Record<string, { name: string }>)[k === "start" ? "empty" : k]?.name ?? k;
      tracked(g, `${r.name.toUpperCase()} · ${name.toUpperCase()}`, cx, y + 4, { font: "labelb", color: P.teal1, align: "center" });
      const seal = hopsUntilSealed(map, r);
      g.text(`Handshake and hop: {amber1}1 TTL{/} · ${seal === Infinity ? "the gate holds the Seal" : seal <= 1 ? "{ember1}the Seal is at the door{/}" : `Seal in ${seal} hops`}`, cx, y + 18, { font: "body", align: "center", color: C.textDim });
    } else {
      tracked(g, run.inv.ttl > 0 ? `TTL ${run.inv.ttl} · GUARDIAN ${toExit} HOP${toExit === 1 ? "" : "S"} AWAY` : "TTL 0 · THE CONNECTION IS DROPPED", cx, y + 4, { font: "labelb", color: run.inv.ttl > 0 ? P.amber1 : P.ember1, align: "center" });
      g.text(run.inv.ttl > 0 ? (links.length ? "Pick a linked relay on the chart." : "Finish what is happening here first.") : "Drift on the carrier and wait for a signal. The Seal will not wait.", cx, y + 18, { font: "body", align: "center", color: C.textDim });
    }
    // right: buttons
    const bx = PANEL.x + PANEL.w - 18 - 132;
    if (run.inv.ttl <= 0 && opts.hopEnabled) {
      if (brassButton(a, "map-wait", bx, y - 4, 132, 40, "WAIT", { hotkey: "KeyW", sub: "for a signal", variant: "danger", tooltip: "Drift on the carrier and hope something answers. The Seal advances faster while you wait." })) {
        closing = true;
        session.remove(scene);
        opts.onWait();
      }
    } else if (brassButton(a, "map-hop", bx, y - 4, 132, 40, "HOP", { hotkey: "KeyJ", hotkeys: ["Enter"], icon: "glyph-hop", disabled: sel === null || !reachable.has(sel), sub: "handshake · 1 TTL" })) {
      if (sel !== null) doHop(sel);
    }
    if (brassButton(a, "map-close", PANEL.x + PANEL.w - 100, PANEL.y + 10, 84, 22, "CLOSE", { variant: "normal", font: "label", sound: null })) close();
    keyHints(g, a, PANEL.x + PANEL.w - 18, PANEL.y + PANEL.h + 4, [["TAB", "cycle"], ["J", "hop"], ["M", "close"]], "right");
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
  const fx = CX - 34;
  const fy = CY - 34 + 10;
  const fw = 760 + 68;
  const fh = 330 + 50;
  g.rect(fx, fy, fw, fh, P.ink1);
  g.box(fx, fy, fw, fh, P.ink3);
  g.box(fx + 2, fy + 2, fw - 4, fh - 4, rgba(P.ivory3, 0.18));
  // survey grid: faint ivory dots and the Line's outer hull bands
  for (let gx = fx + 10; gx < fx + fw - 4; gx += 20) {
    for (let gy = fy + 10; gy < fy + fh - 4; gy += 20) g.rect(gx, gy, 1, 1, rgba(P.ivory3, 0.22));
  }
  const tn = tint(run.stage);
  for (let i = 0; i < 3; i++) {
    const by = fy + 40 + i * 120;
    for (let bx = fx + 6; bx < fx + fw - 6; bx += 3) g.rect(bx, by + Math.round(Math.sin(bx / 90 + i) * 3), 1, 1, rgba(tn.main, 0.18));
  }
  // compass rose (lower right) and scale bar
  const rx = fx + fw - 34;
  const ry = fy + fh - 34;
  g.circle(rx, ry, 14, rgba(P.ivory3, 0.35));
  g.circle(rx, ry, 9, rgba(P.ivory3, 0.2));
  g.line(rx - 18, ry, rx + 18, ry, rgba(P.ivory3, 0.35));
  g.line(rx, ry - 18, rx, ry + 18, rgba(P.ivory3, 0.35));
  g.rect(rx + 16, ry - 1, 4, 3, P.brass2);
  tracked(g, "HEART", rx + 20, ry - 14, { font: "small", color: rgba(P.ivory3, 0.6), align: "right", track: 1 });
  const sx = fx + 16;
  const sy = fy + fh - 18;
  g.hline(sx, sy, 130, rgba(P.ivory3, 0.5));
  g.vline(sx, sy - 3, 6, rgba(P.ivory3, 0.5));
  g.vline(sx + 130, sy - 3, 6, rgba(P.ivory3, 0.5));
  tracked(g, "ONE HOP", sx + 65, sy - 11, { font: "small", color: rgba(P.ivory3, 0.6), align: "center", track: 1 });
  void t;
}

function drawSeal(g: Gfx, run: RunState, t: number) {
  const map = run.map;
  const sx = Math.round(CX + map.sealX);
  const left = CX - 32;
  if (sx <= left) {
    // off-chart: a hint of the red seam at the left edge
    g.alpha(0.5 + 0.2 * Math.sin(t * 3), () => g.rect(left, CY - 22, 2, 368, P.ember3));
    return;
  }
  const top = CY - 12;
  const h = 360;
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
  tracked(g, "THE SEAL", sx - 6, top + h + 4, { font: "small", color: P.ember1, align: "right", track: 1 });
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
      const a = { x: CX + r.x, y: CY + r.y };
      const b = { x: CX + q.x, y: CY + q.y };
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
      if (sa && sb) {
        // cut on both ends: dark cable with a gap in the middle
        cable(g, a.x, a.y, b.x, b.y, sag, { color: P.violet4, hi: P.violet3, lo: P.ink0, thick: 2, to: 0.42 });
        cable(g, a.x, a.y, b.x, b.y, sag, { color: P.violet4, hi: P.violet3, lo: P.ink0, thick: 2, from: 0.58 });
        frayed(g, a, b, sag, 0.42, 0.58);
      } else if (sa || sb) {
        // severed at the Seal's front: the sealed side is dark, the live side ends in frayed strands
        const sealU = sealCrossing(map.sealX + CX, a, b);
        const [u0, u1] = sa ? [sealU - 0.05, sealU + 0.05] : [sealU - 0.05, sealU + 0.05];
        if (sa) {
          cable(g, a.x, a.y, b.x, b.y, sag, { color: P.violet4, hi: P.violet3, lo: P.ink0, thick: 2, to: Math.max(0, u0) });
          cable(g, a.x, a.y, b.x, b.y, sag, { color, hi, lo, thick: 2, from: Math.min(1, u1) });
        } else {
          cable(g, a.x, a.y, b.x, b.y, sag, { color, hi, lo, thick: 2, to: Math.max(0, u0) });
          cable(g, a.x, a.y, b.x, b.y, sag, { color: P.violet4, hi: P.violet3, lo: P.ink0, thick: 2, from: Math.min(1, u1) });
        }
        frayed(g, a, b, sag, Math.max(0, u0), Math.min(1, u1));
      } else {
        // braided carrier
        cable(g, a.x, a.y, b.x, b.y, sag, { color, hi, lo, thick: 2 });
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
  const x = CX + r.x;
  const y = CY + r.y;
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
  if (label && (k !== "sealed" || isCur)) tracked(g, label, x, y + 11, { font: "small", color: k === "exit" ? P.ember1 : k === "market" ? P.amber1 : k === "sealed" ? P.ember2 : P.ivory3, align: "center", track: 1 });
  else if (k === "hazard" && r.hazard) tracked(g, HAZARD_FLAVOR[r.hazard].name.toUpperCase(), x, y + 11, { font: "small", color: P.amber3, align: "center", track: 1 });
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

function legend(g: Gfx, x: number, y: number) {
  const items: [string, string][] = [
    ["beacon-market", "Exchange"], ["beacon-bench", "Bench"], ["beacon-distress", "Signal"], ["beacon-hazard", "Hazard"],
    ["beacon-unknown", "Unknown"], ["beacon-sealed", "Sealed"], ["beacon-exit", "Guardian"],
  ];
  items.forEach(([f, label], i) => {
    const cx = x + (i % 4) * 88;
    const cy = y + Math.floor(i / 4) * 20;
    if (!iconC(g, f, cx + 8, cy + 7)) fallbackBeacon(g, cx + 8, cy + 7, f.replace("beacon-", ""), false);
    g.text(label, cx + 20, cy, { font: "body", color: C.textDim });
  });
}
