// Global access to the running App (set once at boot) for modules that need to push scenes.
import type { App } from "./scene";

let current: App | null = null;

export function setApp(a: App) {
  current = a;
}

export function getApp(): App {
  if (!current) throw new Error("App not booted");
  return current;
}
