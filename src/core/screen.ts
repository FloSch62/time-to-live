// HD canvas (contract "★ v3"): a 1920×1080 backing store drawn through a 2× transform, so all layout code works in
// 960×540 "layout units" while HD art (atlas/image scale 2) lands 1:1 on physical pixels at 1080p.

export const W = 960; // layout units
export const H = 540;
/** Backing pixels per layout unit. */
export const HD = 2;
export const BW = W * HD; // 1920
export const BH = H * HD; // 1080
export const BG = "#07080f";

export type ScaleMode = "auto" | "integer" | "fit";

export class Screen {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** CSS pixels per layout unit. */
  scale = 1;
  /** Device pixels per backing pixel. */
  deviceScale = 1;
  left = 0;
  top = 0;
  mode: ScaleMode = "auto";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = BW;
    canvas.height = BH;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    this.resetTransform();
    window.addEventListener("resize", () => this.resize());
    document.addEventListener("fullscreenchange", () => this.resize());
    this.resize();
  }

  /** Layout-unit transform (call at the start of every frame; scenes may save/restore on top of it). */
  resetTransform() {
    this.ctx.setTransform(HD, 0, 0, HD, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  setMode(mode: ScaleMode) {
    this.mode = mode;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Device pixels per backing pixel. Integer ≥ 1 keeps pixels even; below 1 the browser downsamples smoothly.
    const fitDev = Math.min((vw * dpr) / BW, (vh * dpr) / BH);
    const intDev = Math.floor(fitDev);
    let dev: number;
    if (this.mode === "fit" || intDev < 1) dev = fitDev;
    else if (this.mode === "integer") dev = intDev;
    else dev = intDev / fitDev >= 0.9 ? intDev : fitDev; // auto: integer when it wastes ≤ 10%, else fill smoothly
    this.deviceScale = dev;
    const cssW = (BW * dev) / dpr;
    const cssH = (BH * dev) / dpr;
    this.scale = cssW / W;
    this.left = Math.round((vw - cssW) / 2);
    this.top = Math.round((vh - cssH) / 2);
    const s = this.canvas.style;
    s.width = `${cssW}px`;
    s.height = `${cssH}px`;
    s.left = `${this.left}px`;
    s.top = `${this.top}px`;
    // Integer scales (1080p, 4K) keep hard, even pixels; any non-integer scale (1440p, small windows) is smoothed so
    // the HD pixel art stays even instead of showing irregular nearest-neighbour columns.
    const integer = Math.abs(dev - Math.round(dev)) < 0.001 && dev >= 1;
    s.imageRendering = integer ? "pixelated" : "auto";
    this.resetTransform();
  }

  /** Window (client) coordinates → layout coordinates. */
  toLogical(clientX: number, clientY: number): [number, number] {
    return [(clientX - this.left) / this.scale, (clientY - this.top) / this.scale];
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      /* not allowed: ignore */
    }
  }

  get fullscreen() {
    return !!document.fullscreenElement;
  }
}
