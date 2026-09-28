// The relay view between events (the hub): the stage backdrop, the carrier across the top with the tender hanging
// from its drive trolley and the relay's switchyard pylon. Below the world it mirrors the combat screen so a relay
// and a fight feel continuous: the crew roster under the tender, a compact relay panel (where you are, what this
// stop offers) beside it, and the same ship bar along the bottom in planning mode (reactor and system power, weapon
// order and power, armed drones), with SHIP and CHART · HOP where combat has its commands.
// Hop = run down the carrier to the right; arrival = slide in from the left.
import { DeckControl } from "../combat/deck";
import { drawShipBar, drawCrewPanel, COMMANDS_W, type HudState } from "../combat/hud";
import { LAYOUT } from "../combat/view";
import type { App, Scene } from "../core/scene";
import { Gfx } from "../core/gfx";
import { sfx } from "../core/audio";
import { settings } from "../core/save";
import { safeRecoveryStatus } from "../campaign/run";
import { createScriptScene } from "./script";
import { P, C, rgba } from "../core/palette";
import { SPECIES_FLAVOR, HAZARD_FLAVOR, RELAY_FLAVOR } from "../content/flavor";
import { currentRelay, isSealed } from "../campaign/model";
import type { HubAction } from "../campaign/voyage";
import { speciesMaxHp } from "../campaign/shipops";
import type { Session } from "./session";
import { drawBackdrop, drawForeground, drawOnArtGrid, stageBg, twinkle } from "./backdrop";
import { carrierScene } from "./tender";
import { previewGrip } from "../campaign/combat-adapter";
import type { ShipState } from "../game/types";
import { Zoom, brassButton, cachedLayer, ease, glow, icon, runHud, tint, tracked } from "./kit";
import { createMapScene } from "./map";
import { createShipScene } from "./ship";
import { createStoreScene } from "./store";
import { createPauseMenu } from "./pause";
import { playRelayMusic } from "./music";

export interface RelayScene extends Scene {
  arrive(): Promise<void>;
  hub(): Promise<HubAction>;
}

const ARRIVE_S = 1.1;
const DEPART_S = 0.9;
const WORLD_TOP = 56;
const WORLD_BOTTOM = LAYOUT.crew.y - 4;

export function createRelayScene(app: App, session: Session): RelayScene {
  const run = () => session.run;
  let mode: "idle" | "arrive" | "depart" = "idle";
  let animT = 0;
  let animDone: (() => void) | null = null;
  let hubResolve: ((a: HubAction) => void) | null = null;
  let destinationName = "";
  let t = 0;
  const zoom = new Zoom();
  const deck = new DeckControl(() => session.saveFromUI(run()));
  deck.sync(run().ship);
  const hs: HudState = { selected: new Set(), weaponSel: -1, paused: false, hoverCrew: -1 };
  /** Sheave frames turned by the drive trolley (separately painted trolleys): they run while the car hops. */
  let sheave = 0;

  function openMap() {
    sfx.play("map-open");
    session.push(
      createMapScene(app, session, {
        hopEnabled: !!hubResolve,
        onHop: (to) => depart({ kind: "hop", to }),
        onWait: () => {
          const r = hubResolve;
          hubResolve = null;
          r?.({ kind: "wait" });
        },
      }),
    );
  }

  function depart(a: HubAction) {
    const r = hubResolve;
    if (!r) return;
    hubResolve = null;
    destinationName = a.kind === "hop" ? run().map.relays[a.to].name : "";
    sfx.play("hop");
    mode = "depart";
    animT = 0;
    animDone = () => r(a);
  }

  const scene: RelayScene = {
    arrive() {
      mode = "arrive";
      animT = 0;
      sfx.play("arrive", { volume: 0.8 });
      return new Promise<void>((res) => (animDone = res));
    },
    hub() {
      return new Promise<HubAction>((res) => (hubResolve = res));
    },
    enter() {
      playRelayMusic(run());
    },
    update(dt) {
      t += dt;
      deck.update(dt, run().ship);
      if (mode !== "idle" && !settings.reducedMotion) sheave += dt * 14;
      if (mode !== "idle") {
        animT += dt;
        const dur = mode === "arrive" ? ARRIVE_S : DEPART_S;
        if (animT >= dur) {
          const f = animDone;
          animDone = null;
          mode = mode === "depart" ? "depart" : "idle";
          if (mode === "depart") {
            // stay off-screen until the next arrival starts
            animT = dur;
          }
          f?.();
        }
      }
    },
    draw(g, a) {
      const r = run();
      const relay = currentRelay(r);
      const sealed = isSealed(r.map, relay);
      drawBackdrop(g, stageBg(r.stage, relay.bg, { id: relay.id, kind: relay.type, hazard: relay.hazard }), { kind: "space", stage: r.stage, seed: 4000 + r.stage * 10 + relay.bg, time: t, hazard: relay.hazard, variant: relay.bg, context: "relay",
        state: sealed ? "sealed" : relay.resolution === "released" || relay.resolution === "delivered" ? "released" : relay.pendingCombat ? "danger" : "idle" });
      twinkle(g, t, r.seed + relay.id, 22, 250);
      // the world layer (pylon, carrier, tender) zooms; the HUD never does
      if (mode === "idle") zoom.handle(a, { x: 0, y: WORLD_TOP, w: 960, h: WORLD_BOTTOM - WORLD_TOP }, false);
      else zoom.reset();
      let slide = 0;
      if (!settings.reducedMotion) {
        if (mode === "arrive") slide = -760 * (1 - ease(animT / ARRIVE_S));
        else if (mode === "depart") slide = 820 * Math.pow(Math.max(0, Math.min(1, (animT / DEPART_S - 0.3) / 0.7)), 2);
      }
      g.clip(0, WORLD_TOP, 960, WORLD_BOTTOM - WORLD_TOP, () => zoom.apply(g, () => {
        // The code-drawn tower and bench share the backdrop's art pixel grid: every stroke is whole art pixels. The
        // carrier runs through the tower's switch frame, so the tower is drawn over it.
        const tower = () => {
          drawOnArtGrid(g, (lg) => {
            const ag = new ArtGridGfx(lg.ctx);
            ag.time = lg.time;
            drawPylon(ag, r.stage, sealed, settings.reducedMotion ? 0 : t, relay.type === "market", mode !== "idle");
            if (relay.type === "bench" && !sealed) drawBench(ag, t);
          });
          if (relay.type === "bench" && !sealed) benchLabel(g);
        };
        const grip = carrierScene(g, r.ship, t, { x: 400, cableY: 82, slideX: slide, fitHeight: fitHeight(r.ship), region: r.stage, under: tower, sheave, draw: (x, y, carrier) => {
          // Panel clicks belong to the HUD even when a zoomed room lies behind it. Keep keyboard orders available
          // with the pointer over the panels; only suppress the frame carrying a pointer press.
          const enabled = a.input.enabled;
          if (a.input.y >= WORLD_BOTTOM && (a.input.pressed(0) || a.input.pressed(2))) a.input.enabled = false;
          try { deck.draw(g, a, x, y, zoom, mode === "idle", { x: 0, y: WORLD_TOP, w: 960, h: WORLD_BOTTOM - WORLD_TOP }, { carrier, sheave }); }
          finally { a.input.enabled = enabled; }
        } });
        if (mode !== "idle") {
          // The physical clamp stays around the carrier: the trolley never leaves the line.
          g.box(grip.gx - 10, grip.gy - 7, 20, 14, P.brass1, 2);
          g.rect(grip.gx - 3, grip.gy + 5, 6, 4, P.teal1);
        }
      }));
      g.clip(0, WORLD_TOP, 960, WORLD_BOTTOM - WORLD_TOP, () => drawForeground(g, r.stage, relay.hazard, t, settings.reducedMotion));
      if (sealed) sealOverlay(g, settings.reducedMotion ? 0 : t);
      if (zoom.z > 1) tracked(g, `ZOOM ${zoom.z}×  ·  MIDDLE-DRAG TO PAN  ·  Z TO RESET`, 480, 62, { font: "small", color: P.ivory3, align: "center", track: 1 });
      runHud(g, a, r);
      if (mode !== "idle") {
        g.panel(178, 62, 500, 34, "panel");
        g.text(mode === "depart" ? `HELLO · ACKNOWLEDGED · SWITCH SET · ${destinationName}` : "I HEAR YOU HEAR ME · GRIP LOCKED · ARRIVAL RECORDED", 428, 73,
          { font: "label", color: P.teal1, align: "center", width: 480, maxLines: 1 });
      }
      const idle = mode === "idle" && !!hubResolve;
      // Crew roster under the tender (same panel as in a fight).
      const picked = drawCrewPanel(g, a, deck.state.sim, deck.selected, LAYOUT.crew, {
        hint: `${deck.hint()} · R stations · Shift+R save`,
        onHover: (uid) => { deck.panelHover = uid; },
      });
      if (picked !== null) {
        const c = deck.state.sim.crew.find((q) => q.uid === picked);
        if (c) deck.select(c.id, a.input.shift);
      }
      relayPanel(g, a, session, idle, {
        service: () => {
          const resolve = hubResolve;
          hubResolve = null;
          resolve?.({ kind: "service" });
          sfx.play("repair-done", { volume: 0.6 });
        },
      });
      // The ship bar in planning mode: what you set here is how the tender enters its next fight.
      deck.state.sim.ships[0].payloads = r.inv.payloads;
      deck.state.sim.ships[0].spares = r.inv.spares;
      const inputOn = a.input.enabled;
      if (mode !== "idle") a.input.enabled = false;
      try {
        deck.plan(drawShipBar(g, a, deck.state.sim, hs, { mode: "plan", commandsW: COMMANDS_W }));
        if (mode === "idle") deck.planHotkeys(a);
      } finally { a.input.enabled = inputOn; }
      // Commands: SHIP and CHART · HOP where combat has its orders.
      const bx = 956 - 6 - COMMANDS_W;
      const by = LAYOUT.barY + 7;
      if (brassButton(a, "hub-map", bx, by, COMMANDS_W, 44, "CHART · HOP", { hotkey: "KeyM", disabled: !idle, tooltip: "Open the chart and pick the next relay (M)." })) openMap();
      if (brassButton(a, "hub-ship", bx, by + 48, COMMANDS_W, 34, "TENDER", { hotkey: "KeyU", icon: "glyph-ship", variant: "normal", disabled: mode !== "idle", tooltip: "The tender: upgrades, equipment, crew and the yard (U)." })) {
        session.push(createShipScene(a, r, () => session.saveFromUI(r)));
      }
      if (idle && a.input.keyPressed("Escape")) {
        a.input.eatKey("Escape");
        session.push(createPauseMenu(a, session));
      }
    },
  };
  return scene;
}

/** Art pixel of the 640×360 scene grid, in layout units. */
const ART_PX = 1.5;
const snapA = (v: number) => Math.round(v / ART_PX) * ART_PX;

/** A Gfx whose rectangles and lines land on whole art pixels (at least one art pixel thick), for code-drawn world
 *  pieces drawn through drawOnArtGrid. */
class ArtGridGfx extends Gfx {
  rect(x: number, y: number, w: number, h: number, color: string) {
    const x0 = snapA(x), y0 = snapA(y);
    const x1 = Math.max(x0 + ART_PX, snapA(x + w)), y1 = Math.max(y0 + ART_PX, snapA(y + h));
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  box(x: number, y: number, w: number, h: number, color: string, t = 1) {
    this.rect(x, y, w, t, color);
    this.rect(x, y + h - t, w, t, color);
    this.rect(x, y, t, h, color);
    this.rect(x + w - t, y, t, h, color);
  }
  line(x0: number, y0: number, x1: number, y1: number, color: string, t = 1) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / ART_PX));
    for (let i = 0; i <= n; i++) this.rect(x0 + (x1 - x0) * (i / n), y0 + (y1 - y0) * (i / n), t, t, color);
  }
}

/** Largest consist height that keeps the whole tender (keel car included) inside the world band. */
function fitHeight(ship: ShipState): number {
  const pg = previewGrip(ship);
  const gripY = 82 + 40; // cable height plus its sag near the centre of the view
  if (!pg) return WORLD_BOTTOM - gripY;
  const fit = Math.min(1, (WORLD_BOTTOM - 8 - gripY) / Math.max(1, pg.h - pg.y));
  return pg.h * fit;
}

/** The relay's switchyard on the right: a lattice pylon with the switch frame and the guide lamp. */
function drawPylon(g: Gfx, stage: 1 | 2 | 3, sealed: boolean, t: number, market: boolean, switching = false) {
  const x = 842;
  const top = 70;
  const base = 540;
  const col = P.ink2;
  const edge = sealed ? P.violet3 : P.steel0;
  // legs
  g.rect(x - 22, top + 40, 6, base - top - 40, col);
  g.rect(x + 18, top + 40, 6, base - top - 40, col);
  g.vline(x - 22, top + 40, base - top - 40, edge);
  g.vline(x + 18, top + 40, base - top - 40, edge);
  for (let y = top + 50; y < base; y += 26) {
    g.line(x - 18, y, x + 18, y + 26, P.ink3);
    g.line(x + 18, y, x - 18, y + 26, P.ink3);
    g.hline(x - 22, y, 46, edge);
  }
  // switch frame where the carrier runs through
  g.rect(x - 38, top + 12, 78, 30, P.ink1);
  g.box(x - 38, top + 12, 78, 30, sealed ? P.ember3 : P.brass4);
  g.hline(x - 37, top + 13, 76, sealed ? P.violet2 : P.brass2);
  for (let i = 0; i < 4; i++) g.rect(x - 30 + i * 18, top + 20, 10, 14, sealed ? P.ember4 : P.ink3);
  g.line(x - 30, top + 29, x + 30, top + (switching && !sealed ? 20 : 29), switching && !sealed ? P.teal1 : P.steel1, 2);
  if (switching && !sealed) for (let i = 0; i < 3; i++) g.rect(x - 22 + i * 20, top + 16, 5, 3, P.teal1);
  // market: stacks of containers under the pylon and strings of lamps
  if (market) {
    const cols = [P.copper2, P.verd3, P.brass4, P.copper3, P.steel0];
    for (let i = 0; i < 7; i++) {
      const cx = x - 90 + (i % 3) * 34 - (i > 2 ? 16 : 0);
      const cy = 330 - Math.floor(i / 3) * 18;
      g.rect(cx, cy, 32, 16, cols[i % cols.length]);
      g.box(cx, cy, 32, 16, P.ink1);
      for (let k = 4; k < 30; k += 5) g.vline(cx + k, cy + 2, 12, rgba(P.ink0, 0.3));
    }
    for (let k = 0; k < 10; k++) {
      const lx = x - 100 + k * 12;
      const ly = 290 + Math.round(Math.sin(k * 0.7) * 3);
      g.rect(lx, ly, 2, 2, (k + Math.floor(t * 2)) % 3 === 0 ? P.amber1 : P.amber3);
    }
  }
  // guide lamp
  const lampOn = sealed ? Math.floor(t * 1.4) % 2 === 0 : (t % 2.4) < 1.6;
  const lampCol = sealed ? P.ember2 : stage === 2 ? P.violet1 : P.amber1;
  g.rect(x - 6, top - 4, 13, 16, P.ink0);
  g.rect(x - 5, top - 3, 11, 14, P.brass4);
  g.rect(x - 3, top - 1, 7, 9, lampOn ? lampCol : P.brass5);
  if (lampOn) {
    g.rect(x - 1, top + 1, 3, 3, sealed ? P.ember0 : P.amber0);
    glow(g, x, top + 3, 30, lampCol, 0.3);
  }
}

/** Red-violet quarantine lattice over a sealed relay. */
function sealOverlay(g: Gfx, t: number) {
  const layer = cachedLayer("relay-seal", "v1", 960, 540, (lg) => {
    lg.alpha(0.22, () => {
      for (let x = -540; x < 960; x += 24) {
        lg.line(x, 0, x + 540, 540, P.violet2);
        lg.line(x + 540, 0, x, 540, P.ember3);
      }
    });
  });
  g.image(layer, 0, 0);
  const seam = Math.floor(t * 3) % 2 ? P.ember2 : P.ember1;
  g.alpha(0.35, () => g.rect(0, 64, 960, 1, seam));
}

/** Where the tender is and what this stop offers: name and kind, one or two lines of description, receipts, and
 *  the stop's own actions (exchange, field service, look around) in a column on the right. */
function relayPanel(g: Gfx, app: App, session: Session, idle: boolean, cb: { service: () => void }) {
  const r = session.run;
  const relay = currentRelay(r);
  const sealed = isSealed(r.map, relay);
  const kind = sealed ? "sealed" : relay.type === "start" ? "empty" : relay.type;
  const fl = (RELAY_FLAVOR as Record<string, { name: string; desc: string }>)[kind];
  const hz = relay.hazard ? HAZARD_FLAVOR[relay.hazard] : null;
  const { x, y, w, h } = LAYOUT.comms;
  g.panel(x, y, w, h, sealed ? "panel-danger" : "panel-dark");
  // Actions of this stop, right column.
  const actions: { id: string; label: string; sub?: string; disabled: boolean; tip: string; hotkey?: string; run: () => void }[] = [];
  if (relay.type === "market" && relay.resolved) actions.push({ id: "hub-store", label: "EXCHANGE", hotkey: "KeyE", disabled: !idle, tip: "Trade at the Salvage Exchange (E).", run: () => session.push(createStoreScene(app, r, () => session.saveFromUI(r))) });
  const recovery = safeRecoveryStatus(r);
  if (recovery.crewInjured || recovery.systemsDamaged) actions.push({ id: "hub-recover", label: "FIELD SERVICE", sub: "+1 SEAL STEP", disabled: !idle || !recovery.ok,
    tip: recovery.reason ?? `Heal crew and patch damaged systems. Costs one Seal step; no hull repair.${recovery.patrolRisk ? " WARNING: the Seal will reach this berth. A quarantine patrol follows the service." : " Reading and ordinary crew orders cost no steps."}`, run: cb.service });
  if (relay.glimpse) actions.push({ id: "hub-inspect", label: "LOOK AROUND", disabled: !idle, tip: "Read this quiet stop's observation. No time or resources pass.", run: () => {
    let observation: Scene;
    observation = createScriptScene(app, [{ art: stageBg(r.stage, relay.bg), text: relay.glimpse!.text, speaker: relay.glimpse!.title }], { kind: "dev", run: r, onDone: () => session.remove(observation) });
    observation.overlay = true;
    session.push(observation);
  } });
  const aw = actions.length ? 118 : 0;
  const ah = actions.length ? Math.min(26, Math.floor((h - 8 - (actions.length - 1) * 3) / actions.length)) : 0;
  actions.forEach((ac, i) => {
    const ay = y + 4 + i * (ah + 3);
    if (app.ui.button(ac.id, x + w - aw - 5, ay, aw, ah, ac.sub && ah >= 22 ? "" : ac.label, { font: "small", disabled: ac.disabled, tooltip: ac.tip, hotkey: ac.hotkey, showKey: !!ac.hotkey })) ac.run();
    if (ac.sub && ah >= 22) {
      g.text(ac.label, x + w - aw / 2 - 5, ay + 3, { font: "small", color: ac.disabled ? C.textFaint : C.text, align: "center" });
      g.text(ac.sub, x + w - aw / 2 - 5, ay + 12, { font: "small", color: ac.disabled ? C.textFaint : P.amber2, align: "center" });
    }
  });
  const tw = w - 16 - (aw ? aw + 8 : 0);
  const t = tint(r.stage);
  g.text(`${relay.name.toUpperCase()} · ${(fl?.name ?? kind).toUpperCase()}`, x + 8, y + 4, { font: "labelb", color: sealed ? P.ember1 : t.light, width: tw, maxLines: 1 });
  let ty = y + 17;
  const lh = 9;
  const receipts: string[] = [];
  if (relay.serviceSalvage) receipts.push(`Arrival allocation +${relay.serviceSalvage} salvage, claimed once`);
  if (relay.systemsPatched) receipts.push(`crew patched ${relay.systemsPatched} system bars`);
  if (relay.hullRecovered) receipts.push(`workshop recovered ${relay.hullRecovered} hull`);
  const warn = idle && r.inv.ttl <= 0 ? "{ember1}TTL 0: open the chart and wait for a signal.{/}" : "";
  const bodyLines = Math.floor((y + h - 4 - ty) / lh) - (receipts.length ? 1 : 0) - (warn ? 1 : 0);
  const body = hz ? `{amber1}${hz.name}{/} · ${hz.desc}` : fl?.desc ?? "";
  if (body && bodyLines > 0) ty += g.text(body, x + 8, ty, { font: "small", color: C.textDim, width: tw, maxLines: bodyLines });
  if (receipts.length) {
    const line = receipts.join(" · ");
    g.text(line, x + 8, ty, { font: "small", color: P.brass1, width: tw, maxLines: 1 });
    if (app.ui.hover(x + 4, ty - 1, tw + 4, lh + 1)) app.ui.setTooltip(receipts.join("\n"), 260);
    ty += lh;
  }
  if (warn) {
    const pulse = settings.reducedMotion || Math.floor(app.time * 2) % 2 === 0;
    g.text(warn, x + 8, ty, { font: "small", width: tw, maxLines: 1, alpha: pulse ? 1 : 0.7 });
  }
}

function drawBench(g: Gfx, t: number) {
  g.rect(792, 272, 126, 6, P.brass3);
  g.rect(798, 278, 6, 30, P.ink2);
  g.rect(906, 278, 6, 30, P.ink2);
  g.box(792, 272, 126, 6, P.brass1);
  // A warm lamp, kettle and spare cups identify a place to stop without a new chore.
  g.rect(800, 246, 4, 26, P.steel0);
  g.rect(794, 244, 16, 5, P.amber1);
  glow(g, 803, 252, 36, P.amber1, 0.3);
  g.rect(829, 258, 19, 14, P.copper2);
  g.box(829, 258, 19, 14, P.copper0);
  g.rect(834, 254, 9, 4, P.brass1);
  g.line(848, 266, 855, 258, P.copper0, 3);
  for (let i = 0; i < 3; i++) { g.rect(867 + i * 14, 264, 8, 8, P.ivory2); g.box(874 + i * 14, 266, 4, 4, P.ivory3); }
  if (!settings.reducedMotion) for (let i = 0; i < 3; i++) {
    const rise = (t * 8 + i * 6) % 22;
    g.rect(837 + Math.sin(t + i) * 3, 253 - rise, 2, 4, rgba(P.ivory2, 0.45 * (1 - rise / 22)));
  }
}

/** The bench's plate (screen text stays on the screen grid). */
function benchLabel(g: Gfx) {
  g.panel(855 - 74, 311, 148, 15, "panel-dark");
  g.text("BENCH · THE KETTLE IS ON", 855, 314, { font: "label", color: P.amber1, align: "center" });
}
