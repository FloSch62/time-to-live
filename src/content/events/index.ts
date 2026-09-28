// All event decks, merged. The campaign draws random events by `pool` + `stages` (+ `requires`, `unique`,
// `weight`) and reaches `scripted` events only by id (`next`, `onWin`, `onSurrender`, or the ids below).
import type { EventDef } from "../../game/types.ts";
import { CORE_FLAGS } from "../flags.ts";
import { STAGE1_SIGNALS, STAGE1_SIGNALS_FLAGS } from "./stage1-signals.ts";
import { STAGE1_RELAYS, STAGE1_RELAYS_FLAGS } from "./stage1-relays.ts";
import { STAGE2_SIGNALS, STAGE2_SIGNALS_FLAGS } from "./stage2-signals.ts";
import { STAGE2_RELAYS, STAGE2_RELAYS_FLAGS } from "./stage2-relays.ts";
import { STAGE3_SIGNALS, STAGE3_SIGNALS_FLAGS } from "./stage3-signals.ts";
import { STAGE3_RELAYS, STAGE3_RELAYS_FLAGS } from "./stage3-relays.ts";
import { SHARED_EVENTS, SHARED_FLAGS } from "./shared.ts";
import { CHAIN_EVENTS, CHAIN_FLAGS } from "./chains.ts";
import { OPERATIONS } from "./operations.ts";

export const ALL_EVENTS: EventDef[] = [
  ...STAGE1_SIGNALS, ...STAGE1_RELAYS,
  ...STAGE2_SIGNALS, ...STAGE2_RELAYS,
  ...STAGE3_SIGNALS, ...STAGE3_RELAYS,
  ...SHARED_EVENTS, ...CHAIN_EVENTS,
  ...OPERATIONS,
];

/** Every run flag content may set or read, with a one-line meaning. */
export const ALL_FLAGS: Record<string, string> = {
  ...CORE_FLAGS,
  ...STAGE1_SIGNALS_FLAGS, ...STAGE1_RELAYS_FLAGS,
  ...STAGE2_SIGNALS_FLAGS, ...STAGE2_RELAYS_FLAGS,
  ...STAGE3_SIGNALS_FLAGS, ...STAGE3_RELAYS_FLAGS,
  ...SHARED_FLAGS, ...CHAIN_FLAGS,
};

/**
 * TTL 0: when the crew wait for a signal, the campaign picks a scripted event whose id starts with this prefix
 * (src/campaign/run.ts waitForSignal). Ours live in shared.ts.
 */
export const WAIT_EVENT_PREFIX = "wait-";
