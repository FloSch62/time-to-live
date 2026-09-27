// Music choices for the campaign (contract §8.1): stage themes A/B per relay, exchange at markets, guardian tracks.
import { music } from "../core/audio";
import type { MusicId, StageIndex } from "../game/ids";
import type { RunState } from "../campaign/model";
import { currentRelay } from "../campaign/model";

export const STAGE_THEMES: Record<StageIndex, [MusicId, MusicId]> = {
  1: ["copper-reach", "rust-kingdom"],
  2: ["glass-cathedral", "choir-weather"],
  3: ["blackout-heart", "last-orders"],
};

export function relayTheme(run: RunState): MusicId {
  const r = currentRelay(run);
  return STAGE_THEMES[run.stage][r?.theme ?? 0];
}

/** Explore layer of the relay's theme (or the exchange at a market). */
export function playRelayMusic(run: RunState) {
  const r = currentRelay(run);
  if (r?.type === "market" && r.resolved) void music.play("exchange");
  else void music.play(relayTheme(run), "explore");
}

export function playMusic(id: string | undefined, layer: "explore" | "battle" = "explore") {
  if (id) void music.play(id, layer);
}
