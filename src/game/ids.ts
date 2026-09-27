// Content ids shared by every workstream (contract §4). Add ids here only through docs/requests/.

export const SYSTEM_IDS = [
  "shields", "engines", "weapons", "air", "medbay", "helm", "sensors", "doors", "drones", "veil",
] as const;
export type SystemId = (typeof SYSTEM_IDS)[number];

export const WEAPON_IDS = [
  "packet-laser", "burst-emitter", "triple-burst", "jumbo-frame", "jumbo-frame-ii", "multicast-array",
  "jammer", "flood-cannon", "fiber-lance", "trunk-lance", "payload-launcher", "breach-spike",
  "thermite-payload", "scatter-shot", "heartpulse-chain", "cathedral-chime",
] as const;
export type WeaponId = (typeof WEAPON_IDS)[number];

export const DRONE_IDS = ["firewall-drone", "relay-drone", "rigger-drone", "bulwark-drone", "crawler-drone"] as const;
export type DroneId = (typeof DRONE_IDS)[number];

export const AUGMENT_IDS = [
  "startup-config", "hot-swap-rig", "vargas-crimper", "harrows-kettle", "salvage-arm", "listening-horn",
  "brass-plating", "sprinkler-runbook", "bench-kit", "lamp-dark-coating", "second-way-home", "keepalive",
  "drone-recovery", "wireshark-tap",
] as const;
export type AugmentId = (typeof AUGMENT_IDS)[number];

export const SPECIES_IDS = ["linefolk", "warden", "rigger", "courier", "bellmaker"] as const;
export type SpeciesId = (typeof SPECIES_IDS)[number];

export const BOARDER_IDS = ["spark-mite", "splicer", "marshal-trooper"] as const;
export type BoarderId = (typeof BOARDER_IDS)[number];

export const ENEMY_IDS = [
  // Stage I · Copper Reach
  "packet-leech", "cable-wraith", "rust-prophet", "scrap-foreman", "scavenger-skiff", "static-nest",
  "ferric-colossus", "iron-regent",
  // Stage II · Glass Cathedral
  "prism-widow", "glass-echo", "wire-weaver", "glass-choir", "coil-serpent", "echo-tender", "hollow-choir",
  // Stage III · Blackout Heart
  "gate-sentinel", "null-marshal", "ash-moth", "grave-reaver", "demolition-engine", "blackout-core",
  // Any stage (sealed relays)
  "quarantine-drone",
] as const;
export type EnemyId = (typeof ENEMY_IDS)[number];

export const RESOURCE_IDS = ["salvage", "ttl", "payloads", "spares", "hull"] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export const HAZARD_IDS = [
  "debris-field", "rust-squall", "sun-glare", // Stage I
  "glass-fog", "ringing-panes", "resonance", // Stage II
  "ember-draft", "dark-stretch", "sealing-lattice", // Stage III
] as const;
export type HazardId = (typeof HAZARD_IDS)[number];

export const MUSIC_IDS = [
  "title", "relay-seven", "copper-reach", "rust-kingdom", "glass-cathedral", "choir-weather", "blackout-heart",
  "last-orders", "exchange", "iron-regent", "hollow-choir", "event-horizon", "an-answer", "line-quiet",
] as const;
export type MusicId = (typeof MUSIC_IDS)[number];

export type StageIndex = 1 | 2 | 3;

// ─── The modular tender (contract "★ DIRECTION v2.1") ────────────────────────────────────────────────────────

/** Lead cars (the tender's front car: cab, helm, drive trolley). One for now; more tenders can be added as data. */
export const LEAD_CAR_IDS = ["lamplighter"] as const;
export type LeadCarId = (typeof LEAD_CAR_IDS)[number];

/** Rear cars coupled behind the lead car (grid 5×3). */
export const REAR_CAR_IDS = ["drone-car", "armory-car", "freight-car", "bunk-car", "veil-car"] as const;
export type RearCarId = (typeof REAR_CAR_IDS)[number];

/** Keel cars slung under the lead car (grid 6×2). */
export const KEEL_CAR_IDS = ["ballast-keel", "listening-keel", "sling-keel", "workshop-keel"] as const;
export type KeelCarId = (typeof KEEL_CAR_IDS)[number];

export type CarId = LeadCarId | RearCarId | KeelCarId;
export type CarSlot = "lead" | "rear" | "keel";

/** Room modules installable into module sockets (refits). drone-bay and veil-housing carry those systems. */
export const MODULE_IDS = [
  "drone-bay", "veil-housing", "workshop", "bunks", "cargo-hold", "payload-rack", "ballast", "listening-horn-array",
  "kettle-bench",
] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

/** Livery lamp colours (cosmetic). */
export const LAMP_COLORS = ["amber", "teal", "violet", "ember", "ivory"] as const;
export type LampColor = (typeof LAMP_COLORS)[number];
