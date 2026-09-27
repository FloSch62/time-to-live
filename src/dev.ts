// Dev entry points: open the game with ?dev=<name>[&param=…]. Each workstream registers its own entries in
// src/<folder>/dev.ts exporting `dev: Record<string, DevFactory>`; they are collected here automatically.
import type { App, Scene } from "./core/scene";

export type DevFactory = (app: App, params: URLSearchParams) => Scene | Promise<Scene>;

const modules = import.meta.glob<{ dev: Record<string, DevFactory> }>("./*/dev.ts", { eager: true });

export const devScenes: Record<string, DevFactory> = {};
for (const m of Object.values(modules)) Object.assign(devScenes, m.dev ?? {});
