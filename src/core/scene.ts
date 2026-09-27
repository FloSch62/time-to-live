// Scene stack with fade transitions. The top scene receives input; lower scenes are drawn with input disabled.
import type { Gfx } from "./gfx";
import type { Input } from "./input";
import type { UI } from "./ui";
import type { Screen } from "./screen";
import { P } from "./palette";

export interface App {
  screen: Screen;
  input: Input;
  g: Gfx;
  ui: UI;
  scenes: SceneManager;
  /** Seconds since boot. */
  time: number;
}

export interface Scene {
  /** Draw lower scenes underneath (modals/overlays). */
  overlay?: boolean;
  enter?(app: App): void;
  exit?(app: App): void;
  /** Variable dt in seconds (clamped to 0.1). Run fixed-step simulations internally. */
  update?(dt: number, app: App): void;
  /** Draw and handle immediate-mode UI. */
  draw(g: Gfx, app: App): void;
}

export class SceneManager {
  stack: Scene[] = [];
  private fade = 0; // 0 = clear, 1 = black
  private fadeDir = 0;
  private pendingSwap: (() => void) | null = null;
  private fadeSpeed = 4;
  constructor(private app: () => App) {}

  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  push(s: Scene) {
    this.stack.push(s);
    s.enter?.(this.app());
  }

  pop(): Scene | undefined {
    const s = this.stack.pop();
    s?.exit?.(this.app());
    return s;
  }

  /** Remove a specific scene (e.g. a modal closing itself). */
  remove(s: Scene) {
    const i = this.stack.indexOf(s);
    if (i >= 0) {
      this.stack.splice(i, 1);
      s.exit?.(this.app());
    }
  }

  /** Replace the whole stack with a scene, optionally through a fade to black. */
  switchTo(s: Scene, fade = true, seconds = 0.35) {
    const swap = () => {
      while (this.stack.length) this.pop();
      this.push(s);
    };
    if (!fade) {
      swap();
      return;
    }
    this.fadeSpeed = 1 / Math.max(0.05, seconds);
    this.pendingSwap = swap;
    this.fadeDir = 1;
  }

  get transitioning() {
    return this.fadeDir !== 0;
  }

  update(dt: number) {
    if (this.fadeDir !== 0) {
      this.fade += this.fadeDir * dt * this.fadeSpeed;
      if (this.fadeDir > 0 && this.fade >= 1) {
        this.fade = 1;
        this.pendingSwap?.();
        this.pendingSwap = null;
        this.fadeDir = -1;
      } else if (this.fadeDir < 0 && this.fade <= 0) {
        this.fade = 0;
        this.fadeDir = 0;
      }
    }
    const top = this.top;
    top?.update?.(dt, this.app());
  }

  draw(g: Gfx) {
    const app = this.app();
    // Find the lowest scene that must be drawn (first non-overlay from the top).
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start].overlay) start--;
    for (let i = Math.max(0, start); i < this.stack.length; i++) {
      const s = this.stack[i];
      const isTop = i === this.stack.length - 1;
      app.input.enabled = isTop && this.fadeDir === 0;
      s.draw(g, app);
    }
    app.input.enabled = true;
    if (this.fade > 0) g.alpha(this.fade, () => g.rect(0, 0, 960, 540, P.ink0));
  }
}
