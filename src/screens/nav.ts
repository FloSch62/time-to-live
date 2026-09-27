// Navigation without import cycles: the title registers itself; other screens ask to go back to it.
import type { App, Scene } from "../core/scene";

let titleFactory: ((app: App) => Scene) | null = null;

export function registerTitle(f: (app: App) => Scene) {
  titleFactory = f;
}

/** Fade to the title screen. */
export function goToTitle(app: App, seconds = 0.6) {
  if (titleFactory) app.scenes.switchTo(titleFactory(app), true, seconds);
}
