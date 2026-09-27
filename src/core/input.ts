// Mouse and keyboard state in logical coordinates. Per-frame edges (pressed/released) are cleared by endFrame().
import type { Screen } from "./screen";

export type MouseButton = 0 | 1 | 2; // left, middle, right

export class Input {
  x = -100;
  y = -100;
  /** Mouse moved this frame. */
  moved = false;
  inside = false;
  wheel = 0;
  private down = new Set<number>();
  private pressedButtons = new Set<number>();
  private releasedButtons = new Set<number>();
  private keysDown = new Set<string>();
  private keysPressed = new Set<string>();
  private shiftedPresses = new Set<string>();
  private keysReleased = new Set<string>();
  /** Printable characters typed this frame (for text fields). */
  typed = "";
  /** Last user gesture timestamp; audio resumes on the first one. */
  gestures = 0;
  private gestureListeners: (() => void)[] = [];
  /** Set false while a lower scene is drawn under a modal: queries then report nothing. */
  enabled = true;
  /** A widget consumed the click this frame (so world clicks under UI are ignored). */
  consumed = false;
  lastClickTime = 0;
  doubleClick = false;

  constructor(private screen: Screen) {
    const c = screen.canvas;
    window.addEventListener("mousemove", (e) => this.move(e));
    window.addEventListener("mousedown", (e) => {
      this.move(e);
      this.down.add(e.button);
      this.pressedButtons.add(e.button);
      if (e.button === 0) {
        const now = performance.now();
        this.doubleClick = now - this.lastClickTime < 320;
        this.lastClickTime = now;
      }
      this.gesture();
      c.focus();
      e.preventDefault();
    });
    window.addEventListener("mouseup", (e) => {
      this.move(e);
      this.down.delete(e.button);
      this.releasedButtons.add(e.button);
      e.preventDefault();
    });
    window.addEventListener("wheel", (e) => {
      this.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    window.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("dragstart", (e) => e.preventDefault());
    window.addEventListener("selectstart", (e) => e.preventDefault());
    document.addEventListener("mouseleave", () => (this.inside = false));
    window.addEventListener("blur", () => {
      this.down.clear();
      this.keysDown.clear();
    });
    window.addEventListener("keydown", (e) => {
      // Keep developer tools and Ctrl+R; F1–F10 belong to crew selection. swallow everything else so the page never scrolls.
      const passthrough = e.code === "F12" || (e.ctrlKey && (e.code === "KeyR" || e.shiftKey));
      if (!passthrough) e.preventDefault();
      if (!e.repeat) {
        this.keysPressed.add(e.code);
        if (e.shiftKey) this.shiftedPresses.add(e.code);
      }
      this.keysDown.add(e.code);
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) this.typed += e.key;
      else if (e.key === "Backspace") this.typed += "\b";
      else if (e.key === "Enter") this.typed += "\n";
      this.gesture();
    });
    window.addEventListener("keyup", (e) => {
      this.keysDown.delete(e.code);
      this.keysReleased.add(e.code);
    });
  }

  private move(e: MouseEvent) {
    const [x, y] = this.screen.toLogical(e.clientX, e.clientY);
    if (x !== this.x || y !== this.y) this.moved = true;
    this.x = x;
    this.y = y;
    this.inside = x >= 0 && y >= 0 && x < 960 && y < 540;
  }

  private gesture() {
    this.gestures++;
    if (this.gestures === 1) for (const f of this.gestureListeners) f();
  }

  onFirstGesture(f: () => void) {
    if (this.gestures > 0) f();
    else this.gestureListeners.push(f);
  }

  get mx() {
    return Math.floor(this.x);
  }
  get my() {
    return Math.floor(this.y);
  }

  isDown(b: MouseButton = 0) {
    return this.enabled && this.down.has(b);
  }
  pressed(b: MouseButton = 0) {
    return this.enabled && !this.consumed && this.pressedButtons.has(b);
  }
  released(b: MouseButton = 0) {
    return this.enabled && this.releasedButtons.has(b);
  }
  /** Mark this frame's click as used by a widget. */
  consume() {
    this.consumed = true;
  }

  key(code: string) {
    return this.enabled && this.keysDown.has(code);
  }
  keyPressed(code: string) {
    return this.enabled && this.keysPressed.has(code);
  }
  /** Modifier captured with the key event, even if Shift is released before the next frame. */
  keyShifted(code: string) {
    return this.enabled && this.keysPressed.has(code) && this.shiftedPresses.has(code);
  }
  keyReleased(code: string) {
    return this.enabled && this.keysReleased.has(code);
  }
  get shift() {
    return this.keysDown.has("ShiftLeft") || this.keysDown.has("ShiftRight");
  }
  get ctrl() {
    return this.keysDown.has("ControlLeft") || this.keysDown.has("ControlRight");
  }

  inRect(x: number, y: number, w: number, h: number) {
    return this.enabled && this.x >= x && this.y >= y && this.x < x + w && this.y < y + h;
  }

  /** Consume a pressed key so other handlers in the same frame don't react to it. */
  eatKey(code: string) {
    this.keysPressed.delete(code);
  }

  endFrame() {
    this.pressedButtons.clear();
    this.releasedButtons.clear();
    this.keysPressed.clear();
    this.shiftedPresses.clear();
    this.keysReleased.clear();
    this.typed = "";
    this.wheel = 0;
    this.moved = false;
    this.consumed = false;
    this.doubleClick = false;
  }
}
