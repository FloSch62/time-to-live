// The relay view between events (the hub): the stage backdrop at 2×, the carrier across the top with the
// Lamplighter hanging from its drive trolley, the relay's switchyard pylon, crew list, HUD and the Chart / Ship /
// Exchange buttons. Hop = run down the carrier to the right; arrival = slide in from the left.
import { DeckControl } from "../combat/deck";
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { sfx } from "../core/audio";
import { P, C, rgba } from "../core/palette";
import { lineHeight, wrap } from "../core/font";
import { SPECIES_FLAVOR, HAZARD_FLAVOR, RELAY_FLAVOR } from "../content/flavor";
import { currentRelay, isSealed } from "../campaign/model";
import type { HubAction } from "../campaign/voyage";
import { speciesMaxHp } from "../campaign/shipops";
import type { Session } from "./session";
import { drawBackdrop, stageBg, twinkle } from "./backdrop";
import { carrierScene } from "./tender";
import { Zoom, brassButton, cachedLayer, ease, glow, hullColor, icon, runHud, tint, tracked, keyHints } from "./kit";
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

export function createRelayScene(app: App, session: Session): RelayScene {
  const run = () => session.run;
  let mode: "idle" | "arrive" | "depart" = "idle";
  let animT = 0;
  let animDone: (() => void) | null = null;
  let hubResolve: ((a: HubAction) => void) | null = null;
  let t = 0;
  const zoom = new Zoom();
  const deck = new DeckControl(() => session.saveFromUI(run()));
  deck.sync(run().ship);

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
      drawBackdrop(g, stageBg(r.stage, relay.bg), { kind: "space", stage: r.stage, seed: 4000 + r.stage * 10 + relay.bg });
      twinkle(g, t, r.seed + relay.id, 22, 250);
      // the world layer (pylon, carrier, tender) zooms; the HUD never does
      if (mode === "idle") zoom.handle(a, { x: 0, y: 56, w: 780, h: 325 }, false);
      else zoom.reset();
      let slide = 0;
      if (mode === "arrive") slide = -760 * (1 - ease(animT / ARRIVE_S));
      else if (mode === "depart") slide = 820 * Math.pow(Math.min(1, animT / DEPART_S), 2);
      zoom.apply(g, () => {
        drawPylon(g, r.stage, sealed, t, relay.type === "market");
        carrierScene(g, r.ship, t, { x: 390, slideX: slide, fitHeight: 250, draw: (x, y) => deck.draw(g, a, x, y, zoom, mode === "idle") });
      });
      if (sealed) sealOverlay(g, t);
      if (zoom.z > 1) tracked(g, `ZOOM ${zoom.z}×  ·  MIDDLE-DRAG TO PAN  ·  Z TO RESET`, 480, 62, { font: "small", color: P.ivory3, align: "center", track: 1 });
      runHud(g, a, r);
      crewList(g, a, session, deck);
      g.text(deck.hint() + " · R return · Shift+R save stations", 16, 373, { font: "small", color: P.teal1, shadow: P.ink0 });
      relayInfo(g, a, session);
      // buttons
      const idle = mode === "idle" && !!hubResolve;
      const bx = 960 - 8 - 156;
      let by = 540 - 8 - 40;
      if (brassButton(a, "hub-map", bx, by, 156, 40, "CHART · HOP", { hotkey: "KeyM", icon: "glyph-map", disabled: !idle, tooltip: "Open the chart and pick the next relay." })) openMap();
      by -= 34;
      if (brassButton(a, "hub-ship", bx, by, 156, 28, "SHIP", { hotkey: "KeyU", icon: "glyph-ship", variant: "normal", disabled: mode !== "idle", tooltip: "Upgrades, weapons, crew." })) {
        session.push(createShipScene(a, r, () => session.saveFromUI(r)));
      }
      if (relay.type === "market" && relay.resolved) {
        by -= 32;
        if (brassButton(a, "hub-store", bx, by, 156, 28, "EXCHANGE", { hotkey: "KeyS", icon: "glyph-store", variant: "normal", disabled: !idle, tooltip: "Trade at the Salvage Exchange." })) {
          session.push(createStoreScene(a, r, () => session.saveFromUI(r)));
        }
      }
      if (idle && a.input.keyPressed("Escape")) {
        a.input.eatKey("Escape");
        session.push(createPauseMenu(a, session));
      }
      if (idle && r.inv.ttl <= 0) {
        const pulse = Math.floor(t * 2) % 2 === 0;
        g.text(pulse ? "{ember1}TTL 0{/} · no relay will switch you" : "{amber2}TTL 0{/} · wait for a signal on the chart", bx + 78, by - 20, { font: "body", align: "center", shadow: P.ink0 });
      }
      keyHints(g, a, 8, 540 - 16, [["M", "chart"], ["U", "ship"], ["WHEEL", "zoom"], ["ESC", "menu"]]);
    },
  };
  return scene;
}

/** The relay's switchyard on the right: a lattice pylon with the switch frame and the guide lamp. */
function drawPylon(g: Gfx, stage: 1 | 2 | 3, sealed: boolean, t: number, market: boolean) {
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

function crewList(g: Gfx, app: App, session: Session, deck: DeckControl) {
  const crew = session.run.ship.crew;
  const cols = Math.min(5, Math.max(1, crew.length));
  const rows = Math.ceil(crew.length / cols);
  const x = 8, y = 390, w = 770, rowH = 29;
  const cw = Math.floor((w - 16) / cols);
  g.panel(x, y, w, 18 + rows * rowH, "panel");
  tracked(g, `CREW · ${crew.length}  /  SELECT PORTRAIT OR F1–F${crew.length}`, x + 10, y + 5, { font: "small", color: P.ivory3 });
  crew.forEach((c, i) => {
    const rx = x + 8 + (i % cols) * cw;
    const ry = y + 17 + Math.floor(i / cols) * rowH;
    const hp = c.hp / speciesMaxHp(c.species);
    g.rect(rx, ry, cw - 4, rowH - 3, deck.isSelected(c.id) ? P.ink4 : P.ink1);
    g.sprite("crew", `${c.species}-portrait`, rx, ry - 1, { noAnchor: true });
    g.box(rx, ry, cw - 4, rowH - 3, deck.isSelected(c.id) ? P.teal1 : P.brass5);
    g.text(c.name, rx + 32, ry + 2, { font: "small", color: C.text, width: cw - 40, maxLines: 1 });
    g.rect(rx + 32, ry + 17, cw - 42, 4, P.ink0);
    g.rect(rx + 32, ry + 17, Math.max(1, Math.round((cw - 42) * hp)), 4, hullColor(hp));
    if (app.ui.area(`crew-${c.id}`, rx, ry, cw - 4, rowH - 3, { tooltip: deck.tooltip(c.id), cursor: "pointer" })) deck.select(c.id, app.input.shift);
  });
}

function relayInfo(g: Gfx, app: App, session: Session) {
  const r = session.run;
  const relay = currentRelay(r);
  const sealed = isSealed(r.map, relay);
  const kind = sealed ? "sealed" : relay.type === "start" ? "empty" : relay.type;
  const fl = (RELAY_FLAVOR as Record<string, { name: string; desc: string }>)[kind];
  const hz = relay.hazard ? HAZARD_FLAVOR[relay.hazard] : null;
  const x = 8;
  const w = 770;
  const lines = hz ? Math.min(2, wrap(`${hz.name} · ${hz.desc}`, w - 24, "body").length) : 1;
  const h = 30 + lines * lineHeight("body") + (relay.serviceSalvage ? 16 : 0);
  const y = 540 - 8 - h;
  g.panel(x, y, w, h, sealed ? "panel-danger" : "panel");
  const t = tint(r.stage);
  tracked(g, `${relay.name.toUpperCase()} · ${(fl?.name ?? kind).toUpperCase()}`, x + 12, y + 8, { font: "labelb", color: sealed ? P.ember1 : t.light });
  if (hz) {
    icon(g, `hazard-${relay.hazard}`, x + w - 26, y + 6);
    g.text(`{amber1}${hz.name}{/} · ${hz.desc}`, x + 12, y + 22, { font: "body", color: C.textDim, width: w - 24, maxLines: 2 });
  } else {
    g.text(fl?.desc ?? "", x + 12, y + 22, { font: "body", color: C.textDim, width: w - 24, maxLines: 1 });
  }
  if (relay.serviceSalvage) {
    g.text(`RELAY STORES RECOVERED  ·  +${relay.serviceSalvage} SALVAGE`, x + 12, y + h - 16,
      { font: "small", color: P.brass1 });
  }
  void app;
}
