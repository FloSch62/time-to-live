// localStorage persistence (wrapped: private windows and blocked storage must not break the game).

const PREFIX = "ttl.";

export function saveJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadSaved<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(PREFIX + key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

export function removeSaved(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  scale: "auto" | "integer" | "fit";
  screenShake: boolean;
  /** Pause automatically when a crew member is hurt / a weapon is ready etc. (FTL-style auto-pause). */
  autoPause: { onArrive: boolean; onBoarders: boolean; onFire: boolean };
  tutorialDone: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  music: 0.7,
  sfx: 0.8,
  scale: "auto",
  screenShake: true,
  autoPause: { onArrive: true, onBoarders: true, onFire: false },
  tutorialDone: false,
};

export const settings: Settings = { ...DEFAULT_SETTINGS, ...(loadSaved<Partial<Settings>>("settings") ?? {}) };

export function saveSettings() {
  saveJson("settings", settings);
}
