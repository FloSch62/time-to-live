// Browser: collect every module of src/content (Vite eager glob) into the content registry at startup.
import { registerModule, content } from "./content";

const mods = import.meta.glob<Record<string, unknown>>(["../content/**/*.ts", "!../content/**/*.test.ts"], { eager: true });

let done = false;

export function loadContentModules() {
  if (done) return;
  done = true;
  // Deck files first, the merged index last (same ids, so order only matters for origin labels).
  const entries = Object.entries(mods).sort(([a], [b]) => (a.endsWith("index.ts") ? 1 : 0) - (b.endsWith("index.ts") ? 1 : 0));
  for (const [path, mod] of entries) registerModule(path, mod);
  content.loaded = true;
}

loadContentModules();
