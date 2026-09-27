# Notes from the art workstream

Status and recipe: `art-src/PROGRESS.md`, `art-src/README.md`. Provenance of every final: `art-src/manifest.json`.

## What the code can rely on

### `public/art/ships/ships.json` (vessels and tender cars, side view; DIRECTION v4: all numbers in IMAGE pixels,
### density 2, TILE 72 image px = 36 layout units)
```
"<id>": {
  "file": "ships/<id>.png" | "ships/cars/<id>.png", "w", "h",
  "class": "player" | "rear-car" | "keel-car" | "crawler" | "installation" | "flier",
  "face": "right" | "left",
  "grid": { "x", "y", "cols", "rows", "tile": 72 } | null,  // room grid offset in the image; hull fully covers it
  "cable": { "x", "y" },                           // player cars and crawlers: grip point on the carrier line
  "couplerRear": { "x", "y" },  "keelHang": { "x", "y" },   // lead car only
  "couplerFront": { "x", "y" },                    // rear cars (gangway at their right end, middle deck)
  "hangTop": { "x", "y" },                         // keel cars (top of the hanger struts)
  "mounts": [ { "x", "y" } ],                      // hardpoints (lead: roof aft, roof fore, belly aft, belly fore)
  "glow": [ { "x", "y", "r" } ],                   // lamp / engine glow points for code-driven animation
  "lampColors": ["#fff1c2", "#ffd98a", "#ffb347", "#e8822a"]   // player cars: the ONLY pixels using these
}                                                  // colours are livery lamps (cupola, cab window, marker lamps)
```
- Consist alignment: the lead car and every rear car put their carrier grip at the same image y (20) with the grid
  top 100 px below it, so placing each car's `cable` point on the carrier line aligns the decks; the rear car's
  `couplerFront` meets the lead's `couplerRear` (both at image y 300, third deck); the keel car's `hangTop` meets the
  lead's `keelHang`.
- Image sizes (v4): lead car 1008×440 (grid 12×4 at (48,120)); rear cars 344×448 (grid 4×4); keel cars 480×248
  (grid 6×2); non-boss hostiles ≤ 688×600 (8-wide grids are 576 px, so crawler grips, shears and claws add up to
  ~110 px); guardians ≤ 960×800 (they overflow the panel as allowed); fliers gate-warden/sealing-drone 168×168.
- Livery recolour: swap the four `lampColors` (a light→dark ramp) for the livery's ramp; nothing else in the hull uses
  them (the body is pixelized with those colours excluded).

### Other groups
- Palettes (v3): each asset uses ≤ 64 colours from the master ramps plus two OKLab in-between steps per neighbouring
  pair, plus recorded k-means extras for sky/skin gradients (scenes ≤ 16, events ≤ 12, portraits ≤ 10).
- `bg/*.png`, `ending/*.png`: 1920×1080 (draw with cover).
- `events/<id>.png` 640×320 (ids exactly as in `docs/art-requests.md`).
- `portraits/<id>.png` 192×192 (ids from the contract + `docs/art-requests.md`).
- `weapons/<id>.png` 120×60 (heavy 150×70) + `<id>-icon.png` (64×64) + `weapons/weapons.json` (pivot, muzzle, lens,
  icon); `drones/<id>.png` 72×54 + `drones/drones.json` (rotors, lens). Side view, facing right, painted at rest.
- `props/<id>.png` ≤ 320×320 with alpha.

No text is painted into any final (signs and plates are blank); the game draws labels.
