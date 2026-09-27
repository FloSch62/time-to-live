# TIME TO LIVE — code-authored sprites (HD, contract v3/v4)

Hand-authored pixel art written as code: shapes, rigs and ASCII/detail stamps shaded procedurally into the palette.
No image models, no GPU, no unseeded randomness; every build is byte-for-byte reproducible.

Weapons and drones are painted by the art workstream (contract v2.2); this workstream supplies the generic overlay
fx for them (lens glows, muzzle flashes, rotor blur, exhaust) in the fx atlas.

```
tools/sprites/
  px.py            palette keys (master + HD half steps), Img canvas, drawing primitives
  hd.py            hi-bit helpers: material ramps, step(), masks, Lambert/bevel/sphere shading, occlusion,
                   selective outline, orphan cleanup, glow
  atlas.py         deterministic shelf packer + JSON writer (writes "scale": 2)
  palette-hd.json  record of every colour sprites may use (master palette + in-between steps)
  crew.py          crew atlas   -> public/sprites/crew.png/json   (skeletal rig, 5 species, 3 boarders, portraits)
  icons.py + icons_*.py        -> public/sprites/icons.png/json
  fx.py + fx_*.py              -> public/sprites/fx.png/json
  ui.py (+ui_preview.py)       -> public/sprites/ui.png/json    (9-slices, buttons, widgets, cursors, bars)
  rooms.py + rooms_*.py        -> public/sprites/rooms.png/json (side-view deck kit, TILE 72)
  build.py / validate.py / preview.py / scenes.py
```

```
/home/clab/projects/playground/tools/uv venv tools/sprites/.venv
/home/clab/projects/playground/tools/uv pip install --python tools/sprites/.venv/bin/python pillow numpy
tools/sprites/.venv/bin/python tools/sprites/build.py              # every atlas (or: build.py crew)
tools/sprites/.venv/bin/python tools/sprites/validate.py           # exit 1 on any error
tools/sprites/.venv/bin/python tools/sprites/preview.py crew --filter linefolk --scale 2 --bg floor
tools/sprites/.venv/bin/python tools/sprites/preview.py --scale 1 --bg black --tag 1x   # 1:1 = 1080p view
tools/sprites/.venv/bin/python tools/sprites/preview.py ui --slices
tools/sprites/.venv/bin/python tools/sprites/preview.py crew --scene                    # deck scene, 1x and 2x
tools/sprites/.venv/bin/python tools/sprites/rooms_preview.py mock                      # 12x4 lead car interior
```

## The bar

Serious hi-bit pixel art that sits next to painted hulls (contract hard rule 8 + v3/v4): grounded, weathered,
engineered, melancholic; realistic proportions (head ≈ 1/6 of the figure); muted materials (ivory, brass, indigo,
grey, verdigris) with colour only in small lit accents (teal signals, amber lamps, violet glass, ember warnings);
restrained, physical effects. Hard pixel edges, deliberate clusters, no blur, no noise, no semi-transparency. Every
sheet is judged at 1:1 (the 1080p view) and 2× (the game's zoom) against FAULTLINE's screenshots.

## Density and format

- **Every atlas is authored at 2× density** and declares `"scale": 2` at the top of its JSON: all rects, anchors,
  9-slice insets, `textDy`, hotspots and extra keys are in **atlas pixels**; the core draws them at half size in
  960×540 layout units (1 atlas px = 1 physical px at 1080p).
- JSON: `image`, `scale`, `size`, `frames` (`x y w h ax ay` + extras), `anims` (`frames fps loop`; a frame may
  repeat to hold), `slices` (ui), `groups` (packing bands), plus atlas extras (crew `variants`,
  `variantChannels`, `variantLooks`; rooms `livery`, `liveryFrames`; fx `cable`, `beamProfiles`).
- Pixels are fully transparent or an opaque colour of `palette-hd.json`. Fades use `globalAlpha`.

## Palette and shading

`public/palette.json` (50 colours) plus, for hi-bit ramps, the **midpoint between every pair of neighbouring steps of
a master ramp** and five bridges (`k5~s0 e4~c4 s3~i3 i0~b1 c4~b3`) — 95 colours in all, recorded in
`palette-hd.json` and checked by `validate.py`. Keys: group letter + step, higher = lighter (`k0` … `k5` ink,
`s` steel, `i` ivory, `b` brass, `c` copper, `g` verdigris, `t` teal, `a` amber, `v` violet, `e` ember); `b2h` is the
half step between `b2` and `b3`; `px.ramp("b")` returns the full HD ramp.

- Light from the **top-left**, slightly in front (`hd.LIGHT`). Materials use 5–9-step muted ramps (`hd.MAT`).
- Big surfaces snap to 4–5 light planes (clear planes, not gradients); internal separations are 1-px contour lines
  where one part overlaps another, with a little occlusion beyond (folds, under straps and trims).
- Silhouettes get a selective outline: `k0` on shadow sides, a darker step of the fill on lit edges.
- Glows, sparks and lamp spill have no outline.

## Geometry (contract v4, atlas px)

- **TILE = 72** (36 layout units). A room tile: rows 0–4 ceiling beam, 5–63 back wall, **64–71 floor plate**;
  **row 64 is the floor line**.
- **Crew**: 72×72 frames, figures ~60 px tall, anchor **(36, 71)**, drawn with the anchor on the floor line at
  `(tileX + slotX, tileY + 64)`. Station slot: x 30 facing right (console columns ~40–71, work surface rows ~28–42),
  x 42 facing left.
- Player car faces RIGHT, hostiles LEFT. Belly-mounted things are roof frames flipped vertically.

## Crew atlas (`crew`)

Species `linefolk warden rigger courier bellmaker`; boarder machines `spark-mite splicer marshal-trooper`.

The humans are built by a small **skeletal rig** in `crew.py`: posed joints with 2-bone IK, tapered capsule limbs,
a spine-aligned torso, coat skirts that drape over the legs, and a head with profile features. The rig works in a
64-unit design space and the canvas scales every shape by 72/64, so 1-px details stay single pixels. Each species
is a `Look` (material ramps + hooks for headgear, torso details, back items, back view). The rigger, the spark-mite
and the climb (back view) have their own renderers.

| anim | frames | fps | loop | notes |
|---|---|---|---|---|
| `<sp>-idle-right/left` | 3 (`-0` base, `-1` breath + lamp dips, `-2` blink) | 4 | yes | anim holds `-0` |
| `<sp>-walk-right/left` | 8 | 12 (boarders 14) | yes | grounded; the game moves the sprite |
| `<sp>-climb-up` | 4 | 8 | yes | back view on a ladder |
| `<sp>-repair-right/left` | 3 | 8 | yes | tool at chest height, sparks at the tool tip |
| `<sp>-man-right/left` | 3 | 3 | yes | standing at a console |
| `<sp>-fight-right/left` | 3 | 6 | yes | guard, wind-up, strike |
| `<sp>-hurt-right/left` | 2 | 8 | no | recoil (the hit flash is code) |
| `<sp>-stop-right/left` | 4 | 4 | no | stagger, kneel, slump, still (humans lie down; machines fold and go dark) |
| boarders: `<b>-sabotage-right/left` | 3 | 10 | yes | instead of repair/man |

- Frames are the anim name plus `-<i>`. Left frames are exact mirrors, anchor x 35.
- `<sp>-portrait`: **56×56** front-view bust, anchor (28,28), in the species' group band (recolours with it).
- UI (group `ui`): `select-ring`, `-hover`, `-enemy`, `-small` (floor brackets 44×9 / 32×9, anchor on the floor
  line under the feet); `bubble-<suffocating|alert|repair|fire|stopped>` anims (20×22 tags, anchor (10,20) = the
  hanging point, draw a few px above the head); `crew-hp-frame` 36×6 + `crew-hp-fill-<green|amber|red|empty>` 1×1.
- A selection outline is best drawn in code: the frame's silhouette offset 1 atlas px in four directions under it.

### Individual looks (palette swaps)

- `variants[species]`: list of `{fromHex: toHex}` maps; **`CrewMember.look % variants[species].length`** picks one;
  look 0 is `{}`. Linefolk 12, warden 8, courier 8, bellmaker 6, rigger 8.
- Apply the map simultaneously (not chained) with `paletteSwap`, only inside `groups[species]` (the band holding
  that species' frames and portrait).
- `variantChannels[species][channel]` has one map per option (linefolk/courier: skin hair coat lamp; warden: skin
  armour stripe; bellmaker: skin hair coat glass; rigger: shell lens); `variantLooks` says which options each look
  combines. Skin tones: fair, pale, olive, tan, brown, deep, umber.
- Swaps work on whole material ramps; the build refuses any swappable colour that another material or a fixed
  detail of the species also uses (details that take a colour from a ramp — lamp glow, glass glints, lens glints —
  follow the swap automatically). Boarders have no variants.

## Rooms atlas (`rooms`) — side-view deck kit

All anchors (0,0) unless noted. Draw order: wall tile → emblem/stencil/props/module → console → door/hatch → ladder →
crew → fx.

- `wall-<kind>-0..2` 72×72 (patterns repeat every 36 px; any order). Kinds: corridor hold quarters socket shields
  engines weapons air medbay helm sensors doors drones veil reactor. No dark variants: dim with an ink overlay and use
  `-off` console/lamp frames for unpowered or airless rooms.
- Strips: `floor-plate`, `floor-plate-grate` 72×8, `ceiling-trim` 72×5. `wall-v` 8×72, anchor (4,0) on the wall line.
  Hull edges: `hull-roof` 72×12 (0,12), `hull-belly` 72×12, `hull-end-left` 12×72 (12,0), `hull-end-right` 12×72,
  `hull-corner-*` 12×12.
- Doors `door-0..3|closed|open|locked` 14×72, anchor (7,0) on the wall line, anims `door-opening|closing`;
  `airlock-*` 18×72 (9,0); `gangway-*` 36×72 (18,0) + `gangway-opening|closing`.
- Hatches `hatch-*` 44×10, anchor (22,0) at the tile centre on the upper room's floor line, anims
  `hatch-opening|closing`; `ladder` 30×72 (15,0), rungs every 8 px, tiles down the lower room; `ladder-top` 30×20
  (15,20). Keel: `keel-hatch-*` 54×18 (27,0), `keel-tube` 44×18 (22,0).
- Consoles `console-<sys>-<right|left>-0/1` (anim, 2 fps) and `-off`: 72×72 overlays drawn before the crew.
- `emblem-<sys>(-lit)` 44×40, anchor (22,20) at (tile centre x, tileY+25); `stencil-<kind>` anchor centre-top (use a
  stencil instead of an emblem in one-tile station rooms).
- Windows (`window-slit` 40×14, `window-cab` 48×22, `porthole` 24×24, centred), lamps (`lamp-wall|ceiling|signal`
  + `-off`, anims, anchor top-centre), pipes/fittings, props (anchor bottom-centre at tileY+64).
- Modules `module-<id>-a|b`, `socket-empty-a|b`: 72×72 back-wall overlays on `wall-socket-*`.
- Livery: `livery[amber|teal|violet|ember|ivory]` swap maps (amber = identity) applied only to `liveryFrames`.

## UI atlas (`ui`)

9-slices (tiled, never stretched): panels 64×64 inset 16 (`panel`, `panel-bright`, `panel-danger`, `panel-glass`,
`panel-copper`, `panel-ember`), `panel-hi` 40 (8), `panel-dark` 24 (6), `panel-flat` 40 (4), `tooltip` 20 (6),
`dialog` 96 (32) + `dialog-crest`, `title-plate` 64×40 (20,10,20,12; `drawHeight` 40), `nameplate-brass`,
`keycap*` 22×24, `slot*` 28, buttons and iconbuttons 48×48 (6,6,6,10; pressed 6,8,6,9 with `textDy` 2),
`tab-*` 40×32, `bar-frame*`, `charge-fill-*`, slider/scroll pieces. Frames: power 24×8, reactor 32×8, hull 8×20,
shield pips 16, knobs, checkbox/radio 22, lamps 14, badges, dividers, livery `swatch-<colour>(-hover|-selected)`
40×40, cursors ~32 px (ax/ay = hotspot).

## Icons atlas (`icons`)

40×40 main, 28×28 `-sm`: `sys-<id>-<powered|unpowered|damaged|ionised>(-sm)` (engraved glyph on a riveted brass
plate with a status lamp), `sys-<id>-glyph`, `res-*`, `status-*`, `beacon-*` (+ `beacon-current` anim),
`glyph-*(-dim|-sm)`, `aug-*`, `hazard-*`, `species-*`, `pip-skill-<skill>`, `handshake-0..3`;
`pip-rarity-*` 18, `pip-skill-0..2` 20; `car-<id>`/`module-<id>` 64×64 (+40×40 `-sm`); `ship-lamplighter` 56×32
(anim) and `-sm` 36×20. Anchors: frame centre. `icons.system_glyph(id)` returns the 40×40 glyph mask.

## FX atlas (`fx`)

Everything at 2×: room tiles `fire|breach|seal-lattice|veil-shimmer` 72×72 (0,0; flames on row 64); explosions
54/90/144; bolts, ion, shells (8 rotations `rK`, K = 45° steps counter-clockwise from right), flak, beams (16-px
tiles 6/10/18 tall + `beamProfiles`), hits, `shield-ripple` 48×66, smoke/sparks/particles, `move-marker` 34×20
(17,19), reticles 57², `teleport-in` 48×64 (24,63), handshake/switch/trolley/cable-cut; `cable-carrier` 32×12 tile
(draw the sag column by column: column X mod 32 at y = 2·sag(X/2) − 6; see `cable`); overlays for painted weapons
and drones: `lens-<colour>-<5|7|9>-<0..3>` (+`-pulse`; names are layout sizes, frames 26/30/34 px),
`muzzle-<signal|jammer|lance|slug|scatter|chain|chime>` (+`-left`), `rotor-blur-<8|12|16>`, `prop-blur-*`,
`exhaust-puff`, `recoil-dust`. Anchors are listed in `fx.json` and `fx.py`.
