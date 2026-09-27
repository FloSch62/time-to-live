// Asset registry. Images and atlases load by id; anything missing yields null so callers can draw a fallback.

export interface AtlasFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  ax: number; // anchor
  ay: number;
}
export interface AtlasAnim {
  frames: string[];
  fps: number;
  loop: boolean;
}
export interface AtlasSlice {
  x: number;
  y: number;
  w: number;
  h: number;
  l: number;
  t: number;
  r: number;
  b: number;
}
export interface Atlas {
  name: string;
  image: HTMLImageElement;
  frames: Record<string, AtlasFrame>;
  anims: Record<string, AtlasAnim>;
  slices: Record<string, AtlasSlice>;
  variants?: Record<string, Record<string, string>[]>;
  /** Anything else the atlas JSON carries (conventions documented by the sprites workstream). */
  meta: Record<string, unknown>;
}

const BASE = import.meta.env?.BASE_URL ?? "./";

/** Backing pixels per layout unit for an image (HD art = 2; code-made canvases = 1 unless they set __density). */
export function density(img: CanvasImageSource | null | undefined): number {
  return ((img as { __density?: number } | null)?.__density ?? 1) || 1;
}

/** Mark a code-made canvas as HD (drawn at half size in layout units). */
export function markHD<T extends object>(c: T, d = 2): T {
  (c as { __density?: number }).__density = d;
  return c;
}

/** Layout size of an image (its pixel size divided by its density). */
export function layoutSize(img: CanvasImageSource): { w: number; h: number } {
  const d = density(img);
  return { w: (img as HTMLImageElement).width / d, h: (img as HTMLImageElement).height / d };
}

/** Pixel scale of an atlas (JSON "scale": 2 for HD atlases). */
export function atlasScale(a: Atlas | null | undefined): number {
  return (a?.meta?.scale as number) || 1;
}

export function url(path: string): string {
  return BASE + path.replace(/^\//, "");
}

const images = new Map<string, HTMLImageElement | null>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();
const atlases = new Map<string, Atlas | null>();
const atlasPending = new Map<string, Promise<Atlas | null>>();
const json = new Map<string, unknown>();

export function loadImage(path: string): Promise<HTMLImageElement | null> {
  if (images.has(path)) return Promise.resolve(images.get(path) ?? null);
  const existing = pending.get(path);
  if (existing) return existing;
  const p = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      // Everything under public/art is authored at HD density (2 backing px per layout unit, contract ★ v3).
      if (path.startsWith("art/")) (img as HTMLImageElement & { __density?: number }).__density = 2;
      images.set(path, img);
      pending.delete(path);
      resolve(img);
    };
    img.onerror = () => {
      images.set(path, null);
      pending.delete(path);
      resolve(null);
    };
    img.src = url(path);
  });
  pending.set(path, p);
  return p;
}

/**
 * Art by id relative to public/art without extension, e.g. art("ships/lamplighter"), art("bg/s1-a").
 * Returns null until loaded (the first call starts loading) or when the file does not exist.
 */
export function art(id: string): HTMLImageElement | null {
  const path = `art/${id}.png`;
  const img = images.get(path);
  if (img !== undefined) return img;
  void loadImage(path);
  return null;
}

/** Whether an art id finished loading (successfully or not). */
export function artSettled(id: string): boolean {
  return images.has(`art/${id}.png`);
}

export function preloadArt(ids: string[]): Promise<unknown> {
  return Promise.all(ids.map((id) => loadImage(`art/${id}.png`)));
}

export async function loadJson<T>(path: string): Promise<T | null> {
  if (json.has(path)) return json.get(path) as T;
  try {
    const r = await fetch(url(path));
    if (!r.ok) throw new Error(String(r.status));
    const data = (await r.json()) as T;
    json.set(path, data);
    return data;
  } catch {
    json.set(path, null);
    return null;
  }
}

export function getJson<T>(path: string): T | null {
  return (json.get(path) as T) ?? null;
}

/** Load public/sprites/<name>.json + png. Resolves null when missing. */
export function loadAtlas(name: string): Promise<Atlas | null> {
  if (atlases.has(name)) return Promise.resolve(atlases.get(name) ?? null);
  const existing = atlasPending.get(name);
  if (existing) return existing;
  const p = (async () => {
    const data = await loadJson<Record<string, unknown>>(`sprites/${name}.json`);
    if (!data) {
      atlases.set(name, null);
      return null;
    }
    const img = await loadImage(`sprites/${(data.image as string) ?? `${name}.png`}`);
    if (!img) {
      atlases.set(name, null);
      return null;
    }
    const atlas: Atlas = {
      name,
      image: img,
      frames: (data.frames as Record<string, AtlasFrame>) ?? {},
      anims: (data.anims as Record<string, AtlasAnim>) ?? {},
      slices: (data.slices as Record<string, AtlasSlice>) ?? {},
      variants: data.variants as Atlas["variants"],
      meta: data,
    };
    for (const f of Object.values(atlas.frames)) {
      f.ax ??= 0;
      f.ay ??= 0;
    }
    atlases.set(name, atlas);
    return atlas;
  })();
  atlasPending.set(name, p);
  return p;
}

export function atlas(name: string): Atlas | null {
  const a = atlases.get(name);
  if (a !== undefined) return a;
  void loadAtlas(name);
  return null;
}

/** Drop cached entries (dev: hot reload of regenerated assets). */
export function invalidate(prefix = "") {
  for (const k of [...images.keys()]) if (k.startsWith(prefix)) images.delete(k);
  for (const k of [...atlases.keys()]) if (`sprites/${k}`.startsWith(prefix)) atlases.delete(k);
  for (const k of [...json.keys()]) if (k.startsWith(prefix)) json.delete(k);
}
