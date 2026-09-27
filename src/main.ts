import { loadCombatMeta } from "./combat/assets";
// Boot: canvas, input, fonts, core atlases, audio; then the title scene (or a dev scene via ?dev=<name>).
import { Screen, W, H } from "./core/screen";
import { Input } from "./core/input";
import { Gfx } from "./core/gfx";
import { UI } from "./core/ui";
import { SceneManager, type App, type Scene } from "./core/scene";
import { loadFonts } from "./core/font";
import { loadAtlas } from "./core/assets";
import { audio } from "./core/audio";
import { settings } from "./core/save";
import { P } from "./core/palette";
import { setApp } from "./core/app";
import { devScenes } from "./dev";
import { createTitle } from "./screens/title";

const CORE_ATLASES = ["ui", "icons", "crew", "fx", "rooms"];

async function boot() {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const screen = new Screen(canvas);
  screen.setMode(settings.scale);
  const input = new Input(screen);
  const g = new Gfx(screen.ctx);
  const ui = new UI(g, input);
  let app!: App;
  const scenes = new SceneManager(() => app);
  app = { screen, input, g, ui, scenes, time: 0 };
  setApp(app);

  audio.volumes = { master: settings.master, music: settings.music, sfx: settings.sfx };
  input.onFirstGesture(() => audio.unlock());

  // Loading screen drawn in the canvas while fonts and atlases arrive.
  let progress = 0;
  let loading = true;
  const drawLoading = () => {
    screen.resetTransform();
    const c = screen.ctx;
    c.fillStyle = P.ink0;
    c.fillRect(0, 0, W, H);
    const bw = 240;
    const x = (W - bw) / 2;
    const y = H / 2 + 20;
    c.fillStyle = P.ink3;
    c.fillRect(x, y, bw, 4);
    c.fillStyle = P.amber2;
    c.fillRect(x, y, Math.round(bw * progress), 4);
    // the lamp
    const blink = Math.floor(performance.now() / 600) % 2 === 0;
    c.fillStyle = blink ? P.amber1 : P.brass4;
    c.fillRect(W / 2 - 3, y - 26, 6, 6);
    if (blink) {
      c.fillStyle = P.amber3;
      c.fillRect(W / 2 - 4, y - 25, 1, 4);
      c.fillRect(W / 2 + 3, y - 25, 1, 4);
    }
    if (loading) requestAnimationFrame(drawLoading);
  };
  requestAnimationFrame(drawLoading);

  const tasks: Promise<unknown>[] = [loadFonts(), loadCombatMeta(), audio.init(), ...CORE_ATLASES.map((a) => loadAtlas(a))];
  let done = 0;
  await Promise.all(tasks.map((t) => t.then(() => (progress = ++done / tasks.length))));
  loading = false;

  const params = new URLSearchParams(location.search);
  const dev = params.get("dev");
  let first: Scene;
  if (dev && devScenes[dev]) first = await devScenes[dev](app, params);
  else first = createTitle(app);
  scenes.push(first);

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    app.time += dt;
    g.time = app.time;
    scenes.update(dt);
    screen.resetTransform();
    ui.begin(app.time);
    scenes.draw(g);
    ui.end();
    input.endFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Global keys: fullscreen.
  window.addEventListener("keydown", (e) => {
    if (e.code === "F11" || (e.code === "Enter" && e.altKey)) {
      e.preventDefault();
      void screen.toggleFullscreen();
    }
  });
  (window as unknown as { __ttl: App }).__ttl = app;
}

void boot();
