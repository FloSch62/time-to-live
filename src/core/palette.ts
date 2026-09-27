// Master palette (contract §7). Use these names in code instead of raw hex so the whole game stays on-palette.

export const P = {
  ink0: "#07080f", ink1: "#0c0f1c", ink2: "#131a2b", ink3: "#1c2640", ink4: "#283556", ink5: "#3a4a70",
  steel0: "#4a5068", steel1: "#6b7086", steel2: "#9096a8", steel3: "#c3c7d4",
  ivory0: "#f4ecd6", ivory1: "#e9dfc4", ivory2: "#cfc2a0", ivory3: "#a89b7b", ivory4: "#7d7159",
  brass0: "#ffe39a", brass1: "#f2c46b", brass2: "#d9a24a", brass3: "#b07a32", brass4: "#7f5424", brass5: "#553619",
  copper0: "#e08a55", copper1: "#c8663a", copper2: "#97452a", copper3: "#6a2d20", copper4: "#3f1b16",
  verd0: "#8fd6b6", verd1: "#6fb59a", verd2: "#3f8a74", verd3: "#2a5c52", verd4: "#1b3b38",
  teal0: "#c8fff6", teal1: "#7ff7e6", teal2: "#3fd3c9", teal3: "#1e9aa0", teal4: "#146069",
  amber0: "#fff1c2", amber1: "#ffd98a", amber2: "#ffb347", amber3: "#e8822a",
  violet0: "#e2c8ff", violet1: "#b28cf0", violet2: "#7d5bc9", violet3: "#4f3a8f", violet4: "#2c2159",
  ember0: "#ffc2a8", ember1: "#ff8a6b", ember2: "#e0443a", ember3: "#a3222e", ember4: "#5e1224",
} as const;

export type PaletteName = keyof typeof P;

/** Semantic UI colours. */
export const C = {
  bg: P.ink0,
  panel: P.ink2,
  panelDeep: P.ink1,
  frame: P.brass3,
  frameHi: P.brass1,
  frameLo: P.brass5,
  text: P.ivory1,
  textDim: P.ivory3,
  textFaint: P.ivory4,
  title: P.brass1,
  accent: P.teal2,
  good: P.verd1,
  warn: P.amber2,
  bad: P.ember2,
  blue: P.teal1, // FTL "blue option"
  ion: P.violet1,
  power: P.teal2,
  powerOff: P.steel0,
  damaged: P.ember2,
} as const;

/** Stage accent palettes. */
export const STAGE_TINT = {
  1: { main: P.copper1, light: P.verd1, dark: P.copper4, name: "The Copper Reach" },
  2: { main: P.violet1, light: P.violet0, dark: P.violet4, name: "The Glass Cathedral" },
  3: { main: P.ember2, light: P.ember1, dark: P.ember4, name: "The Blackout Heart" },
} as const;

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
