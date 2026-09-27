# TIME TO LIVE — design and production contract

*A Faultline voyage.* A real-time-with-pause roguelike in the spirit of **FTL: Faster Than Light**, set in the
Containerlab / FAULTLINE universe, in pixel art. This file is the single source of truth shared by every workstream
(code, art, audio, writing). Read it fully before starting. When something here is ambiguous, choose what makes the
game more fun and more consistent with the lore, record the decision in your own workstream notes, and keep going.

Project root: `/home/clab/projects/clab/time-to-live` (not a git repo yet; do not `git init`).
Sister project (read-only for us): `/home/clab/projects/clab/faultline` — canon lore in `docs/lore.md`, narrative in
`docs/narrative.md`, in-game story text in `src/story.ts`, `src/lore.ts`. **Never write inside the faultline folder**
except the shared lock files described below.

---

## ★ DIRECTION v2 — cable tenders, side view, higher-res pixels (2026-09-27; SUPERSEDES earlier sections where they conflict)

Review with the user: a generic top-down *spaceship* with guns is not plausible on the Line (nothing in FAULTLINE flies
between relays; the Line is **held up** on spires and hung with cables, gantries and lifts), and the top-down view can
never sit in the side-view world of the backdrops (horizon, cloud sea, spires). The sprites must also be a little
higher-res and match the lore. The game keeps FTL's mechanics exactly; the fiction and the view change:

### The vehicle: a cable tender on the carriers
- The spire tops of the Line are joined by gantries, bridges and **carriers**: heavy braided cables that carry signal
  and loads along the outside of the band ("a thousand kilometres of copper cable gone green"). **Cable tenders** ride
  them: pressurised maintenance cars hanging from a **drive trolley** that grips the carrier, built at the Reach docks
  to mend relays the inside crews could not reach. The *Lamplighter* is one: a long brass-and-ivory car with a lamp
  cupola at the nose (right), a cab window at the helm, the drive trolley and grip arms on the roof, a keel of tanks
  and ballast below, tool mounts on the roof and belly.
- **Relays are switchyards.** Carriers meet at relays; a relay's switchgear hands a tender from one carrier to the
  next. That is a **hop**. The switch only moves for a connection that completes the old greeting — the three-way
  handshake *Hello. — I hear you. — I hear you hear me.* In combat the FTL jump charge is the **handshake**: the helm
  (manned) sends it and the drive (engines powered) spools the trolley up to line speed; three segments fill
  (HELLO · I HEAR YOU · I HEAR YOU HEAR ME), then **HOP** runs you down the carrier to the next relay.
- **TTL** is literal: relays decrement the connection's hop count on every switch; at zero they drop the connection
  and refuse to switch you (FTL out-of-fuel: drift on the carrier, wait for a signal). Benches and markets re-stamp it.
- **The Seal** is literal: Cable Wraiths and Quarantine Drones follow your connection and **cut the carriers behind
  you** relay by relay; sealed relays are held by quarantine drones. The stage map is a chart of braided carrier
  routes between relays along a stretch of the Line.
- **Why fights happen:** every machine meets the tender as an unknown sender and does its duty — a cutter severs
  your carrier, a checkpoint refuses you, a recovery drone tries to "recover" you. You end their task: jam them,
  overload them, cut their power. Nobody dies; machines power down.
- **Evasion** = the drive surging, braking and swinging the car on its carrier. **Oxygen** = the Line is at the edge of
  space; outside air is too thin and cold to breathe; breaches vent into it. **Shields** = the **ward mesh**, a
  lattice of charged ward-wire around the car that catches bolts and grounds them through the carrier (FAULTLINE's
  Warden "Shield Array"). **Weapons** are relay gear and maintenance tools the Night Shift bolted on: signal emitters
  pushed until their light cuts (lasers), jammers that flood a machine's inputs with noise (ion), optical lances cut
  from Cathedral glass (beams), slug throwers that fire spliced charges through the mesh (payloads), rivet scatter
  (flak), and the Line's own maintenance drones, re-keyed. Keep all weapon/system ids; the writing workstream rewrites
  names/descriptions where needed to fit.

### ★ v2.1 — The modular tender: expand it and modify it (user request: "make sure it can be expanded and modified")

The tender is a **consist** of cars hanging from one carrier, and every part of it is data-driven (adding a car,
module, weapon or tender later = new data + art, no code change). Ids in `src/game/ids.ts`, state in
`ShipState.consist / modules / moduleStore / livery` (`src/game/types.ts`).

- **Lead car** — the *Lamplighter*: **grid 10×3** (supersedes 12×3). Cab and helm at the nose (right), drive trolley
  on the roof, 3 weapon hardpoints (roof fore, roof aft, belly fore), systems: shields, engines, weapons, air, medbay,
  helm, sensors, doors, plus **2 module sockets** (hold rooms). Hull ~**384×200**.
- **Rear car** (coupled behind, to the left, through a gangway door between the end rooms; one at a time; **grid 5×3**,
  hull ~**180×150**, its own small trolley on the same carrier):
  | id | Name | Gives |
  |---|---|---|
  | `drone-car` | Drone Car | Drone Bay system room + 1 extra drone slot + 1 socket |
  | `armory-car` | Armory Car | +1 weapon hardpoint (roof) + 1 socket |
  | `freight-car` | Freight Car | +4 cargo, +payload rack (+4 max payloads), +3 hull, 1 socket |
  | `bunk-car` | Bunk Car | +2 crew capacity, a bench (slow heal) room, 1 socket |
  | `veil-car` | Veil Car | Lamp-Dark Veil system room + 1 socket |
- **Keel car** (slung under the lead car on hangers, connected by a hatch/ladder to the lead car's lower deck; one at a
  time; **grid 6×2**, hull ~**220×90**):
  | id | Name | Gives |
  |---|---|---|
  | `ballast-keel` | Ballast Keel | +6 hull, +air reserve (air decays 50% slower) |
  | `listening-keel` | Listening Keel | horn array: +1 effective sensors level, reveals adjacent relays |
  | `sling-keel` | Sling Keel | +1 weapon hardpoint (belly), +2 max payloads |
  | `workshop-keel` | Workshop Keel | repairs 25% faster, +2 max spares, 1 socket |
- Every coupled car costs **−2% evasion** (more mass on the carrier) and adds its rooms to the fight: enemies can target
  them, fires and breaches spread through the gangway/hatch, crew walk between cars. Hull is one pool (sum of cars).
- **Module sockets & refits**: socket rooms accept a **module** (`drone-bay`, `veil-housing` — these host those systems
  when no car does; `workshop` repair +25%; `bunks` +1 crew capacity; `cargo-hold` +2 cargo; `payload-rack` +3 max
  payloads; `ballast` +3 hull; `listening-horn-array` +1 sensors; `kettle-bench` crew heal slowly in that room). Refit
  at markets and benches (cost), swap freely there; owned-but-uninstalled modules live in `moduleStore`.
- **Where cars and modules come from**: markets sell them (the Copper Market/Pell has cars), events offer derelict cars
  to couple (`Outcome.car`) and modules (`Outcome.module`), guardians and elites may drop them.
- **Livery**: the lamp colour (amber/teal/violet/ember/ivory) tints the nose cupola, cab and room lamps; the tender's
  name is painted on the lead car's name plate. Chosen on the New Voyage screen, changeable at benches.
- **Screen fit** (combat): lead car + rear car + keel car must fit the player half of the screen at 1:1: rear
  (180) + coupling (~16) + lead (384) ≈ 580 px wide, keel below the lead car. The combat workstream owns the exact
  composition; the art hulls for all cars share one design language (Reach-dock brass, ivory plates, rivets, the same
  window and lamp shapes) so any combination looks like one tender.

### ★ v2.2 — Weapons and drones are painted objects of the Line (user review: the code-drawn set looked generic)

Weapons and drones are produced by the **art workstream with Krea** in the same recipe and style anchor as the hulls
(side view, facing right, pixelized to the palette), NOT hand-drawn in code. Each is a specific, worn object the Night
Shift bolted onto a cable car — relay gear and maintenance tools, never a generic gun. Every weapon sits on a
**rail clamp mount** with a braided **feed cable** running into its back. Final sizes: normal ~56×28, heavy ~72×32
(pixel art at 1:1). Files `public/art/weapons/<id>.png` + `public/art/weapons/weapons.json`
(`{ "<id>": { "file", "w", "h", "pivot": {x,y} (clamp base), "muzzle": {x,y}, "lens": [{x,y,r}] (glow points the game
lights up while charging) } }`); drones `public/art/drones/<id>.png` + `drones.json` (`{ "<id>": { "file", "w", "h",
"rotors": [{x,y,w}], "lens": [{x,y,r}] } }`). Shop/inventory icons are made from the same art (downscale/crop by the
art pipeline to 32×32: `public/art/weapons/<id>-icon.png`). Charging, firing and idle animation are done by the game
(lens glow ramps, recoil nudge, muzzle flash, rotor blur, bob) with generic fx from the sprites workstream.

| id | Object |
|---|---|
| `packet-laser` | a salvaged relay signal lamp: short brass drum housing with cooling fins, one teal glass lens under a hood, riveted clamp |
| `burst-emitter` | two relay lamps stacked on one yoke, ivory enamel chipped to brass, twin teal lenses, a shared feed box |
| `triple-burst` | three small lamp heads on a rotating ring-yoke (a signal-lamp revolver), switch contacts on the ring |
| `jumbo-frame` | a big old beacon lens (amber fresnel glass) in a heavy riveted iron frame on a trunnion |
| `jumbo-frame-ii` | the beacon lens doubled on a long frame with a counterweight |
| `multicast-array` | a switchboard-like panel of twelve small lamp lenses on a tilting frame, patch cables across the back |
| `jammer` | a squat transmitter box with a flared noise horn, a violet induction coil and two whip antennas |
| `flood-cannon` | a long flared horn with stacked violet coils along it and a cooling radiator |
| `fiber-lance` | a long glass rod in a brass sleeve with focusing collars and a faceted teal prism tip |
| `trunk-lance` | a thick bundle of glass rods bound in brass bands, big prism head, heat-blued collars |
| `payload-launcher` | a pneumatic slug thrower: iron tube, air tank, drum magazine of spliced charges (canisters wrapped in copper wire) |
| `breach-spike` | a heavy spike driver: piston cylinder, long hardened spike, compressed-air reservoir |
| `thermite-payload` | a short mortar tube with ember-hot canisters in a rack, heat shields, ember warning chevrons |
| `scatter-shot` | a rivet scatter gun: six short tubes fed by a rivet hopper on top, crank handle |
| `heartpulse-chain` | a clockwork pulse emitter: stacked rings around a core lamp that light one by one, flywheel |
| `cathedral-chime` | a violet glass bell-tube from the Glass Cathedral in a brass cradle with a striker hammer |

| drone id | Object (the Line's maintenance drones, re-keyed; small fliers ~32×24) |
|---|---|
| `firewall-drone` | a ward picket: small ivory disc body with a spinning charged-wire ring |
| `relay-drone` | a relay repeater drone: lamp-lens nose, twin rotors, antenna |
| `rigger-drone` | a hull mender: squat body, rivet arm, spool of patch plates |
| `bulwark-drone` | an anti-drone picket with a net launcher and a brass guard cage |
| `crawler-drone` | a cable crawler: clamping legs and a cutter, latches onto a hull and walks in |

### Hostiles have one of three mobility classes (they need not be vehicles)
- **Crawlers** ride or clamp onto a carrier or gantry rail like the tender (low evasion):
  packet-leech, cable-wraith, scrap-foreman (gantry crane), scavenger-skiff (salvaged cable car, human crew),
  prism-widow (on glass-web cables), wire-weaver, coil-serpent, echo-tender, null-marshal, grave-reaver,
  demolition-engine.
- **Installations** are built into a relay, a gate or a hall; you fight them as your carrier passes (0% evasion,
  heavier plating): rust-prophet (beacon mast), static-nest (hive under a relay platform), ferric-colossus (foundry
  guardian), glass-choir (three bells on a frame), gate-sentinel (checkpoint), and all three guardians: iron-regent
  (the Copper Gate itself), hollow-choir (the Cathedral's engine hung in the glass hall), blackout-core (the Heart's
  shell).
- **Fliers** are the Line's drones on rotors and thrusters (high evasion): glass-echo, ash-moth, quarantine-drone,
  gate-warden, sealing-drone.
The game draws the carrier cables procedurally across the scene (the player's carrier across the top of the left
half; a crawler's carrier on the right); hull art includes only the trolley/grip, mounting structure or rotors.

### View and scale — side view, TILE = 32 (supersedes TILE 24 and top-down)
- **Side-view cutaway** ("dollhouse"), the way the backdrops see the world. Rooms are rectangles on a grid of
  **32×32 px tiles**; each grid row is one **deck** (1 tile high). Crew walk left/right along a deck; vertically adjacent
  rooms connect through **hatches with ladders** (crew climb); horizontally adjacent rooms connect through doors. The
  FTL rules on the grid are unchanged (room capacity = tiles, doors/hatches block fire/air/boarders, airlocks on the
  outer edge).
- **Player (Lamplighter) grid: 10×3 tiles** (320×96, three decks; see v2.1 for rear/keel cars). Hull art ~**384×200** with the grid at an offset
  recorded in `public/art/ships/ships.json`; the drive trolley and grip arms rise above the roof to where the game
  draws the carrier line (record the grip point `cable: {x, y}` in ships.json). Nose/cab faces RIGHT.
- **Enemy grids (cols×rows, TILE 32, side view, hostiles face LEFT)**:
  `packet-leech 7×3 · cable-wraith 9×2 · rust-prophet 4×5 · scrap-foreman 7×3 · scavenger-skiff 6×3 · static-nest 5×4 ·
  ferric-colossus 8×4 · iron-regent 9×5 · prism-widow 7×3 · glass-echo 5×2 · wire-weaver 7×3 · glass-choir 8×3 ·
  coil-serpent 9×2 · echo-tender 8×3 · hollow-choir 9×5 · gate-sentinel 6×4 · null-marshal 7×3 · ash-moth 5×3 ·
  grave-reaver 8×3 · demolition-engine 8×4 · quarantine-drone 5×3 · blackout-core 9×6`. gate-warden and sealing-drone
  stay roomless flier sprites (~72×72). Crawlers record their `cable` grip point; installations include their
  anchoring structure (gantry stub, gate frame, hall chains) in the art.
- **Higher-res pixel sprites**: crew are drawn in **32×32 frames** (figures ~26–28 px tall), side view: idle, walk
  (left/right), climb (ladder), repair, man-station (at a console, facing right and left), fight, stopped. Faces,
  headsets, chest lamps, visors and tool arms must read. Icons 20×20 (keep 12–16 px small variants for inline text),
  UI frames richer (3–4 px brass bevel, ivory inner line, corner rivets/ornaments like FAULTLINE's frames).
- The logical screen stays **960×540** (2× on 1080p).

### Crew look (lore, FAULTLINE §14 visuals: network/future/antique mix)
Linefolk: worn work coats/overalls in chipped ivory and dark brass, headsets with a boom mic, a small amber or teal
chest lamp, tool belts, varied skin tones/hair. Wardens: dark armour plates, brass visor band, ember stripe, heavier
build. Riggers: squat reclaimed ivory maintenance automatons with one teal lens and tool arms (no face). Couriers:
light long coats, satchels, goggles pushed up, amber lamp. Bellmakers: long violet-trimmed coats, glass tuning forks,
a glass pendant. No medieval props, no generic fantasy/RPG townsfolk look.

---

## ★ DIRECTION v5 — readable, appealing tender; lifts instead of ladders; zoom + pan (2026-09-27, user review)

User, after seeing the combat screen: *"the ladders are ugly … it should be appealing, better readable"* — and then:
*"forget what I said about the size, the size is good, just make it readable. While zoomed, let's pan around."*
**All v4 sizes stay** (TILE 36 layout = 72 px, lead car 12×4, rear 4×4, keel 6×2, crew 72×72 frames, enemies at
TILE 72). What changes:

- **No ladders anywhere.** Decks connect only through **lift shafts**: each car has one (the lead car may have two)
  1-tile-wide **lift shaft** spanning all its decks, with a **brass lift cage** (ivory panels, a small lamp, cables
  and counterweight — a miniature of the Line's spire lifts) that rides up and down. Crew walk into the shaft on
  their deck, the cage carries them (queue if busy; ~0.6 s per deck), they walk out. Rooms on the same deck connect by
  doors. This is the in-world equivalent of FTL's quick room-to-room movement; nothing teleports on the Line.
- **Readable interiors** (FTL clarity, side view): each room is a clearly lit cabin — warm, lighter back walls (lamp-lit
  ivory/brass panels, not dark indigo clutter), a floor plate, thick dark walls and door frames between rooms so
  room boundaries read instantly, one large clear **system emblem** on the back wall of every system room, only a few
  well-placed props. The dark weathered hull outside frames the lit interior like a lit train car at night. Crew
  stand out against the walls (lit by the room lamps). Damaged rooms, fire, breach, low air and ion read at a glance.
  The room grid must align exactly with the hull art's grid offsets.
- **Zoom + pan**: wheel zooms 1× → 1.5× → 2× around the cursor; **while zoomed the player can pan freely**: drag
  with the middle or right mouse button, WASD / arrow keys, and edge-scrolling at the screen border; the camera is
  clamped to the consist; `Z` / double-middle-click resets to 1×. Same for the enemy panel (its own camera) and the
  ship/yard screen.

## ★ DIRECTION v4 — FTL-sized tender, big detailed crew, zoom (2026-09-27, user review; SUPERSEDES all sizes above)

User: *"The cable tender is too small, think about the sizes in FTL … pixel look, but good details, full HD or
higher (lower doesn't matter). The tender needs to be big enough to have awesome crew sprites/graphics, zoom,
tooltips."* FTL's Kestrel fills ~45% of the screen width at 720p with its crew clearly readable; ours must match or
beat that at 1080p, with richer detail.

- **Target display**: 1920×1080 and up. Everything is authored at **1080p-native density** (1 image px = 1 physical
  px at 1080p = ½ layout unit). Below 1080p is not a target.
- **TILE = 36 layout units = 72 image px** (supersedes 32/64). One deck = one tile row.
- **Crew**: **72×72 px frames**, figures **~60 px tall** (hi-bit detail: faces, hands, headset, chest lamp glow, coat
  folds, tools), anchor on the feet at (36, 71); walk 8 frames, idle breathing, smooth grounded motion.
- **Lead car (Lamplighter): grid 12×4** (4 decks, 864×288 px interior; supersedes 10×3) — FTL-Kestrel-sized: more
  rooms and space for the crew; hull image ~**1010×440 px** (trolley and grip above, ballast/keel line below, nose
  cupola and cab right, tail coupler left). Hardpoints 4 (roof fore, roof aft, belly fore, belly aft). Sockets 2.
- **Rear car: grid 4×4** (288×288 px interior, same deck lines as the lead car; image ~**340×400**).
  **Keel car: grid 6×2** (432×144 px; image ~**480×210**) hung under the lead car.
- **Screen budget (layout units)**: player area x 0…630 holds rear car (144) + coupling (12) + lead car (432) +
  nose/tail ≈ 628; enemy panel x 640…950. Vertical: HUD top ~50, bottom ~95; lead car + keel ≈ 300 fits.
- **Enemy grids** at TILE 36: non-boss hostiles max **8** tiles wide (cable-wraith and coil-serpent become **8×2**);
  the three guardians keep 9 wide and may overflow their panel for scale. Other grids unchanged.
- **Zoom**: in combat (and on the ship/yard screen), mouse wheel zooms the tender view **1× → 2×** around the cursor
  (discrete steps 1, 1.5, 2 with a short ease; right-drag or edge-pan when zoomed; `Z` or middle-click resets); the
  enemy panel zooms independently. The HUD never zooms. At 2× on 1080p a crew member is ~120 px tall.
- **Tooltips everywhere** (FTL-level): rooms (system, level, power, damage, air, fire/breach, crew inside),
  crew (name, species, health, skills with pips, current task), weapons (stats, charge, target), doors, hazards,
  enemy rooms and systems (when sensors allow), resources, map relays, store items.

## ★ DIRECTION v3 — HD pixel art ("hi-bit"), not chunky sprites (2026-09-27, user review; SUPERSEDES sizes above)

User: *"way too sprity, HD … is what we seek"*. The target is **HD / hi-bit pixel art**: fine, detailed pixels at
full-HD density, rich shading and light, many colours per ramp, atmosphere — the detail level of FTL's own art and
of modern hi-bit games — still pixel art (hard pixel edges, deliberate clusters, no blur), still serious.

- **Canvas**: the backing store is now **1920×1080**; all layout code keeps working in **960×540 layout units** through
  a 2× transform (`src/core/screen.ts`: `HD = 2`). Nothing in existing layouts moves.
- **HD assets are authored at 2× density** (2 image pixels per layout unit = 1:1 physical pixels at 1080p):
  - **Everything under `public/art/` is HD by definition** (the loader marks it density 2). A hull that occupies
    384×200 layout units is a **768×400 px** image; `g.image(img, x, y)` draws it at 384×200 layout. Grid offsets,
    mounts, pivots, lens points etc. in the art JSON files are in **image pixels** (divide by 2 for layout).
    Room TILE stays 32 layout units = **64 image px**.
  - **Backgrounds and key art**: author at **1920×1080** (full HD), drawn with `g.cover(img)` (fits any size).
  - **Sprite atlases** declare `"scale": 2` at the top level of their JSON when authored at HD density; frame
    rects, anchors and 9-slice insets are then in atlas pixels and the core draws them at half size. Crew frames:
    **64×64 px** (figures ~50–54 px tall, realistic proportions), icons **40×40 px** (24×24 small), room tiles 64 px.
  - Code-made canvases stay layout-density unless marked with `markHD(canvas)` (then draw at half size).
- **Primitive drawing** (`g.rect`, `g.line`…) still works in layout units (2×2 backing pixels per unit). For fine HD
  lines/particles use half-unit coordinates (x.5) — `snap(v, 2)` rounds to the backing grid.
- **Fonts** stay the bitmap pixel fonts at layout size (2× physical): chunky, readable UI text is intended.
- **Krea → pixelizer**: render at ~2× the final HD image size and downsample 2× (not 4×), extend the palette per
  asset where needed (up to ~64 colours built from the master ramps plus in-between steps, recorded in the manifest)
  so shading reads smooth and rich; keep hard edges, no dithering noise, clean clusters, 1-px dark outlines only
  where they help the silhouette.

---

## 0. Hard rules (all workstreams)

1. **No browser look, ever.** The game is one `<canvas>` rendered at a logical **960×540**, scaled with nearest
   neighbour to the window (integer scale when it fits, otherwise fit + letterbox drawn in the game's own dark
   colour). No DOM buttons, inputs, scrollbars, selects, native tooltips, alert/confirm, default fonts, focus rings,
   text selection, context menu or drag ghosts. All text uses our bundled **bitmap pixel fonts**. The system cursor is
   hidden; the game draws its own pixel cursor. Loading screen is also drawn in the canvas.
2. **Pixel art discipline.** Every sprite is drawn at **1 art pixel = 1 logical pixel**, at integer positions, no
   rotation/scaling of sprites except: full-screen backgrounds and key art are authored at **480×270** and drawn at
   exactly **2×**. No smoothing (`imageSmoothingEnabled = false`). Motion is allowed to be sub-pixel only for
   particles/projectiles, which are drawn rounded to integer pixels. Shared palette in §7.
3. **GPU rule — Krea 2, YuE2 and Stable Audio NEVER run in parallel.** Every GPU job, without exception, runs under
   `flock /home/clab/projects/clab/faultline/.work/locks/gpu.lock <command>` (the lock is shared with other projects on
   this machine). Hold the lock for **at most ~20 minutes** at a time, then release it so the other workstream can
   run. ComfyUI must only be started inside a lock hold and stopped before releasing it (see
   `faultline/.work/lore/art/batch.sh` / `serve.sh` for the pattern). Never leave a model resident on the GPU after
   your hold. Check `nvidia-smi` before a hold if something looks off.
4. **Ownership.** Each workstream writes only in the folders it owns (§9). Shared type contracts live in
   `src/game/types.ts` and `src/game/ids.ts` (owned by the lead; request changes by writing a note in
   `docs/requests/<your-workstream>.md`, the lead merges them). Everything is TypeScript, ES modules, Vite.
5. **Provenance.** Every generated asset (image, music, sound) keeps its prompt, seed, model and settings in a
   manifest JSON next to its source folder, like FAULTLINE does. Candidates and rejects stay out of `public/`.
6. **Tone.** Follow FAULTLINE's §14 "Writing the Line": understated, nobody is evil, machines keep duties, no chosen
   ones, no swords/torches/scrolls, ordinary messages carry the weight, no exclamation marks in narrative text.
   Humour is allowed (dry, human, Night-Shift gallows humour) — this game may be warmer and funnier than FAULTLINE.
7. **Alpha complete.** Three full stages, a full run start→ending playable without dev tools, save/continue,
   settings, credits, game over, victory. No placeholder text in shipping content. No `TODO` screens.

8. **Serious look, never cartoon.** The visual tone is as serious as FAULTLINE and FTL: grounded, weathered,
   engineered, melancholic. No cartoon, chibi, cute or toy-like shapes; no big heads, no rounded "mascot" machines, no
   candy-bright saturated colours, no bouncy exaggerated animation. People have realistic proportions (head ≈ 1/6–1/7
   of height), muted clothing in ivory, brass, indigo and grey; machines are heavy, worn, riveted, functional; colour
   comes from small lit accents (teal signals, amber lamps, violet glass, ember warnings) on dark, desaturated forms.
   Effects are restrained and physical (sparks, arcs, smoke, light), not comic. When in doubt, compare with FAULTLINE's
   screenshots and FTL's ships and crew.
---

## 1. The pitch

Thirty-one years after the Night of the Fault, the lamp at Relay Seven blinks. You answer the page. The Operator
plugs a cord into the jack, says *"Go ahead"*, and stamps your connection with a **TTL of 16 hops**. Your vessel is
the **Lamplighter**, an old relay tender dragged out of the Reach docks. Fly it hop by hop along the dark outside of
the Line — through the rust kingdom of the **Copper Reach**, the singing violet **Glass Cathedral**, and into the
ember-red **Blackout Heart** — and prove to the Blackout Core that a route can hold.

Behind you, the quarantine's cutters follow your connection and **seal** the Line relay by relay (FTL's rebel fleet).
Ahead of you, every machine of the Line meets you as an unknown sender.

Title card: **TIME TO LIVE** — subtitle *a Faultline voyage* — tagline *Every hop costs a little life.*

---

## 2. Lore expansion (canon for this game)

Everything in `faultline/docs/lore.md` stays true. This game adds (the writing workstream deepens this into
`docs/lore.md`, which then becomes the canon for this game):

- **Relay tenders.** The linefolk kept a small fleet of **tenders**: narrow hulls that flew the outside of the ring
  on cable-thrust in the thin air at the edge of space, relighting relay lamps and chasing faults the inside crews
  could not reach. The Reach docks built them. Tenders fly between relays by **hopping**: a working relay throws a
  tender along its guide beam to the next relay's lamp (FTL jump = a *hop*; beacon = a *relay*). After the Fault the
  tenders sat in the docks for thirty-one years. The keeper's tender is the *Lamplighter*.
- **TTL (the fuel).** A connection has a hop limit. Every hop spends 1 **TTL**. Relay benches, markets and some
  events can re-stamp it (+TTL). At TTL 0 the connection is dropped: the tender drifts (FTL out-of-fuel), and can only
  wait and hope for a passing signal. *Must-arrive messages carried no TTL; that is what made the storm. Yours does.*
- **The Seal (the pursuing fleet).** The quarantine machinery reads a live connection crossing the Line as storm
  traffic. Cable Wraiths and Quarantine Drones follow the keeper's route and **seal** each relay behind it. On the
  stage map the Seal advances from the left each hop; sealed relays hold Quarantine Drone patrols and no rewards.
- **The machines fly.** The Runbook's automata were never bound to the inside: recovery drones, cutters, beacons and
  smelters all have flying bodies built for the outer hull. They are crewless (like FTL auto-ships) but many carry
  **escort automatons** that walk their corridors and repair them. Beating a machine ends its task; it never "dies".
- **People out here.** The Night Shift has a few other hulls: **scavengers** from the Copper Market who need parts
  more than they need to be kind (human crews; they can surrender; accepting is always an option), a **bench
  keeper** or two, and **echo tenders** — the tenders of earlier keepers, still flying their last route on autopilot,
  lamps lit, nobody aboard.
- **The keeper** is whoever answers. The player is the tender's crew as a whole; there is no avatar. The first crew
  are Night Shift volunteers. More join on the way (freed from stasis, rescued from drifting cars, reprogrammed
  escort automatons, a bellmaker who stayed behind in the Cathedral).
- **Message fragments.** Each stage leaks fragments of the queue as its guardians weaken (collectible lore, like
  FAULTLINE). The teal-jacket woman's evening calls are fragments too (*Unknown sender · priority low*). Never
  connect her to the Ghost in text.
- **The ending.** Beating the Blackout Core proves the route holds; the shell opens, the queue is delivered, the lamps
  return segment by segment, the Faultline closes, *And then, an answer.* At Relay Seven a lamp labelled **GROUND**
  begins to glow. The open questions of FAULTLINE §12 stay open.

### Crew species (FTL races)

| id | Name | HP | Move | Repair | Combat | Breathes | Special | Look |
|---|---|---|---|---|---|---|---|---|
| `linefolk` | Linefolk | 100 | 1.0 | 1.0 | 1.0 | yes | Learns station skills 1.5× faster | ivory/brass work gear, headset, teal or amber lamp on the chest |
| `warden` | Warden | 130 | 0.85 | 0.8 | 1.5 | yes | Fire damage ×0.5; +10% shield charge when manning shields | dark armour plates, brass visor, ember stripe |
| `rigger` | Rigger | 90 | 1.0 | 2.0 | 0.5 | **no** | Reclaimed maintenance automaton; immune to suffocation; cannot use the medbay (repairs itself 1 HP/s slowly while repairing a system) | squat ivory shell, one teal lens, tool arms |
| `courier` | Courier | 80 | 1.4 | 1.0 | 0.8 | yes | Evasion +3% while piloting or at engines | light coat, satchel, goggles, amber lamp |
| `bellmaker` | Bellmaker | 70 | 1.0 | 1.0 | 0.6 | yes | **Tunes** the system in their room: +1 free power to it (Zoltan-like). Event-only recruit | violet glass tuning forks, long coat, glass pendant |

Hostile boarders (machines): `spark-mite` (small, 40 HP, fast, sabotages systems), `splicer` (80 HP, cuts doors and
breaches), `marshal-trooper` (140 HP, armoured, Stage III). They are not "killed": they are **stopped**.

---

## 3. Game design (FTL-faithful, re-skinned)

### 3.1 Run structure
Title → New voyage (name the tender, confirm crew) → **Prologue at Relay Seven** (the Operator, the page, the cord,
*Go ahead*) → Stage I map → Guardian I → stage transition → Stage II → Guardian II → Stage III → Blackout Core
(3 phases) → Ending sequence → Credits. Death → *The line goes quiet* game-over screen with the run's route and stats,
then title. Save on every arrival at a relay and on quit; one active voyage; **Continue** on the title.

### 3.2 Stage map (FTL sector map)
- One map per stage, ~20–24 relays placed with Poisson-disc sampling on a wide chart, connected to neighbours within
  a hop radius (planar-ish, 2–5 links each), start on the left, **exit relay** on the far right.
- The **Seal** starts off-map left and advances each hop (and faster when you wait/linger); relays it covers become
  *sealed*.
- Relay types: combat, event, distress (unknown), **market** (store; ~2–3 per stage), hazard (stage-specific),
  bench (safe rest: small heal/repair or crew event), empty, **exit** (the guardian: stage exit is guarded by the
  stage guardian — you must win to leave; the exit relay is revealed from the start, as FTL shows the exit).
- The map screen shows: route lines, visited/unvisited, market icons if known (sensors/listening upgrades reveal),
  the Seal's front, TTL cost, a stage title plate. Hops are 1 TTL each.
- Stage hazards (FTL environments):
  - Stage I Copper Reach: **Debris field** (outer-relay wreckage: random small hull hits to both ships), **Rust
    squall** (−1 to a random system power each 20 s… or corrosion: slow hull damage to machines only, choose what's
    fun), **Sun glare** (sun-side: periodic fires in random rooms of both ships).
  - Stage II Glass Cathedral: **Glass fog** (nebula: sensors offline for both; enemies rarer; Seal slower),
    **Ringing panes** (periodic ion pulse that ionises a random system of both ships), **Resonance** (weapons charge
    10% faster for everyone).
  - Stage III Blackout Heart: **Ember draft** (fires spread faster; periodic fires), **Dark stretch** (sensors off,
    no markets), **Sealing lattice** (the Seal moves twice as fast from this relay).

### 3.3 Combat (FTL real-time with pause)
- **Pause with Space** at any time; orders are given while paused. Game speed ×1 only.
- Two ships: player on the left (large area), enemy in a panel on the right. Both ships show rooms, doors, systems,
  crew (enemy crew visibility requires sensors ≥ 2 or a manned sensor room, as in FTL).
- **Reactor & power:** each system has a level (max bars) and allocated power; the reactor has N bars. Left-click a
  system icon to add power, right-click to remove; hotkeys like FTL (A shields? — use: `A` weapons autofire toggle,
  `1–4` select weapon, `F1–F4`… implement a clear, discoverable scheme and show it in tooltips).
- **Systems** (id → name → effect):
  - `shields` → **Shield Array**: every 2 power = 1 layer; layers recharge (2 s base); each projectile hit strips one
    layer; beams are reduced by layers.
  - `engines` → **Thrusters**: evasion (5/10/15/20/25/28/31/35% by power), also charges the **hop drive**.
  - `weapons` → **Weapons Bay**: power for mounted weapons (each weapon needs its power).
  - `air` → **Air Plant** (oxygen): refills air ship-wide; unpowered → air decays; crew suffocate below 5% air.
  - `medbay` → **Bench Infirmary**: heals crew in the room.
  - `helm` → **Helm** (piloting, subsystem): must be manned for evasion and hop charge; level = evasion bonus when
    unmanned (auto-pilot at levels 2–3).
  - `sensors` → **Listening Post** (subsystem): L1 see own ship interior in the dark (hull breached rooms etc.), L2 see
    enemy interior & crew, L3 see enemy weapon charge, L4 see enemy power.
  - `doors` → **Bulkheads** (subsystem): open/close doors; higher levels resist boarders.
  - `drones` → **Drone Bay** (purchasable system): launches drones, consumes **spares**.
  - `veil` → **Lamp-Dark Veil** (purchasable; FTL cloak): the tender douses every lamp and goes silent; +60% evasion,
    enemy weapons pause charging for its duration; cooldown.
- **Manning:** helm/engines/weapons/shields give a manning bonus (evasion +, charge speed +, shield recharge +) that
  improves with the crew member's skill (0/1/2 skill levels learned by use).
- **Weapons:** charge while powered; select a weapon then click an enemy room to target; autofire toggle; volleys
  fly across (visible projectiles), hit or miss by evasion, check shields, apply damage to the room's system and to
  the hull, may start **fire** or **breach**. Beams are drawn as a line across rooms.
- **Damage model:** hull points (player 30); system bars can be damaged (red) → lose power; crew repair them
  standing in the room. Fire spreads, damages systems and crew, consumes air; breaches vent air until repaired.
  Doors can be opened to space to vent fires.
- **Hop drive:** charges during combat (engines powered + helm manned). When full, the **HOP** button lets you flee
  to the map. Fleeing forfeits rewards.
- **Enemy AI:** machines power systems per their profile, pick targets (weapons, shields, helm, random), use their
  special abilities; escort automatons repair; human crews fight boarders and may **surrender** at low hull (offer:
  salvage/resources in exchange for sparing them; accepting ends combat).
- **Win:** enemy hull 0 (the machine powers down / *task ended*) or all crew stopped (human ships) → reward screen:
  salvage + chance of TTL, payloads, spares, weapon/drone/augment/crew.
- **Lose:** player hull 0 or all crew lost.

### 3.4 Resources
| id | Name | FTL equivalent | Icon idea |
|---|---|---|---|
| `salvage` | Salvage | Scrap | a small bent brass gear with copper wire |
| `ttl` | TTL | Fuel | a lit amber lamp with "TTL" hop ticks |
| `payloads` | Payloads | Missiles | a stubby brass payload shell with teal tip |
| `spares` | Spares | Drone parts | a teal lens in an ivory ring (automaton spare) |
| `hull` | Hull | Hull | green→amber→red bar made of plating segments |

### 3.5 Store — the **Salvage Exchange** (Stage I also has **Pell's stall** at the Copper Market)
Tabs: Weapons / Drones / Systems & Upgrades / Crew / Augments / Supplies & Repair. Sell (half price) weapons, drones
and augments. Repair hull (per point). Buy TTL, payloads, spares.

### 3.6 Upgrades
Ship screen (FTL "Ship" menu): spend salvage to add system levels and reactor bars; manage weapon order and
cargo; crew list with names, species, skills; augments (max 3).

---

## 4. Content IDs (the glue — use these exact ids)

### 4.1 Systems
`shields engines weapons air medbay helm sensors doors drones veil`

### 4.2 Weapons (baseline FTL numbers; combat workstream balances)
| id | Name | Type | Dmg×shots | Power | Charge s | Notes |
|---|---|---|---|---|---|---|
| `packet-laser` | Packet Laser | laser | 1×1 | 1 | 9 | starter |
| `burst-emitter` | Burst Emitter | laser | 1×2 | 2 | 12 | starter (FTL Burst II ≈ 3 shots; start with 2) |
| `triple-burst` | Triple Burst | laser | 1×3 | 2 | 12 | |
| `jumbo-frame` | Jumbo Frame | laser | 2×1 | 1 | 9 | heavy |
| `jumbo-frame-ii` | Jumbo Frame II | laser | 2×2 | 3 | 13 | |
| `multicast-array` | Multicast Array | laser | 1×5 | 4 | 19 | |
| `jammer` | Jammer | ion | ion 1 | 1 | 8 | |
| `flood-cannon` | Flood Cannon | ion | ion 2 | 3 | 13 | |
| `fiber-lance` | Fiber Lance | beam | 1/room, short | 2 | 12 | |
| `trunk-lance` | Trunk Lance | beam | 2/room, long | 3 | 17 | |
| `payload-launcher` | Payload Launcher | payload | 3 | 1 | 11 | 1 payload per shot, ignores shields |
| `breach-spike` | Breach Spike | payload | 4 | 3 | 22 | high breach |
| `thermite-payload` | Thermite Payload | payload | 1 | 1 | 10 | 90% fire |
| `scatter-shot` | Scatter Shot | flak | 1×3 spread | 2 | 10 | |
| `heartpulse-chain` | Heartpulse Chain | laser (chain) | 1×2 | 2 | 16→ faster each volley | rare |
| `cathedral-chime` | Cathedral Chime | beam+ion | 1/room + ion | 3 | 16 | Stage II rare |
Starter loadout: `burst-emitter` + `packet-laser`… or `burst-emitter` + `payload-launcher` with 8 payloads (choose the
more fun one).

### 4.3 Drones
`firewall-drone` (defence: shoots down payloads), `relay-drone` (combat laser drone), `rigger-drone` (hull repair,
consumed after use), `bulwark-drone` (anti-drone), `crawler-drone` (boarding drone, sabotage systems).

### 4.4 Augments (max 3; FTL-equivalent in brackets)
| id | Name | Effect |
|---|---|---|
| `startup-config` | Startup Config | weapons start combat charged [pre-igniter] |
| `hot-swap-rig` | Hot Swap Rig | weapons charge 10% faster [auto-reloader] |
| `vargas-crimper` | Varga's Crimper | repair 1 hull after every hop… or 10% salvage? (pick fun) [nano-repair] |
| `harrows-kettle` | Harrow's Kettle | all crew heal fully after each hop [—] |
| `salvage-arm` | Salvage Arm | +15% salvage from victories [scrap recovery arm] |
| `listening-horn` | Listening Horn | reveal adjacent relay contents on the map [long-range scanners] |
| `brass-plating` | Brass Plating | 15% chance to negate hull damage [reinforced plating] |
| `sprinkler-runbook` | Sprinkler Runbook | fires in unmanned rooms die out faster [fire suppression] |
| `bench-kit` | Bench Kit | crew heal slowly anywhere on the ship [med bots] |
| `lamp-dark-coating` | Lamp-Dark Coating | +5% evasion [stealth] |
| `second-way-home` | Second Way Home | once per stage, survive a lethal hit at 1 hull |
| `keepalive` | Keepalive | shields recharge 15% faster [shield charge booster] |
| `drone-recovery` | Drone Recovery | spare drones return after combat |
| `wireshark-tap` | Wireshark Tap | see enemy weapon charge regardless of sensors |

### 4.5 Enemy vessels (machines unless noted) — art needs every one
Stage I · Copper Reach
- `packet-leech` Packet Leech — recovery drone hulk: bulbous overflowing buffer tank, grasping intake arms, green
  copper plating, amber buffer glow. Lasers + a clamp that drains shields.
- `cable-wraith` Cable Wraith — isolation cutter: long thin hull, enormous shears at the nose, trailing severed
  cables. Beam weapon.
- `rust-prophet` Rust Prophet — maintenance beacon: tall mast, broadcasting horns, flaking rust, warning lamp. Ion.
- `scrap-foreman` Scrap Foreman — yard crane machine: crane arm, container frame hung under it. Payloads + laser.
- `scavenger-skiff` Scavenger Skiff — **human crew**, patched Night Shift hull, mismatched plates, salvage nets.
  Lasers; can surrender.
- `static-nest` Static Nest — brood hive of spark mites; launches boarders.
- `ferric-colossus` Ferric Colossus — **elite**: smelter guardian, heavy iron, furnace mouth glowing.
- **Guardian I** `iron-regent` The Iron Regent — the Copper Gate's border machine: crowned armoured bulk with gate
  wings, tarnished brass crown (its routing authority). Escorted by `gate-warden` drones (small gate-piece drones).
  Law: *no passage without proof of a second way home*.
Stage II · Glass Cathedral
- `prism-widow` Prism Widow — optical repair automaton: spider silhouette, violet glass legs, webs of light.
- `glass-echo` Glass Echo — small fast bell-drone with glass fins; very evasive.
- `wire-weaver` Wire Weaver — wiring automaton: many arms, cable spools; launches drones.
- `glass-choir` Glass Choir — three linked announcement bells on a frame.
- `coil-serpent` Coil Serpent — long segmented cable-recovery coil.
- `echo-tender` Echo Tender — a previous keeper's tender on autopilot; nobody aboard; lamp still lit (often an event
  rather than a fight).
- **Guardian II** `hollow-choir` The Hollow Choir — cathedral engine of violet glass bells, masks and organ-pipe
  spines; voices sealed in glass. Break it with plurality (many simultaneous hits).
Stage III · Blackout Heart
- `gate-sentinel` Gate Sentinel — checkpoint platform: key-scanner eye, barred gates.
- `null-marshal` Null Marshal — angular armoured escort; boards with marshal troopers.
- `ash-moth` Ash Moth — cooling drone with radiator-fin wings; sheds conductive ash (fires).
- `grave-reaver` Grave Reaver — reactor dismantler: huge claws; breach payloads.
- `demolition-engine` Demolition Engine — **elite**, decommissioning machine.
- `quarantine-drone` Quarantine Drone — the Seal's sealing drone (black shell, red seam light); appears in sealed
  relays in every stage.
- **Guardian III** `blackout-core` The Blackout Core — sphere of archive machinery, ember red, concentric shells,
  sealing drones (`sealing-drone`). Three phases: *Custody* (cut, breach, jam, strike rotation), *Emergency* (at half
  integrity, spends reserve: more power, faster), *Event Horizon* (pulls light inward, raises sealing drones).

### 4.5b Enemy room grids (fixed; the art hull covers the whole rectangle)
Tiles of 24 px, cols×rows. Rooms are laid out by the combat workstream inside this rectangle; the exact pixel offset
of the grid on each hull image comes from `public/art/ships/ships.json` (`grid.x`, `grid.y`), with `mounts` (weapon
hardpoints) and `glow` points. Enemies face LEFT.
`packet-leech 7×5 · cable-wraith 10×3 · rust-prophet 6×6 · scrap-foreman 8×5 · scavenger-skiff 7×4 · static-nest 6×5 ·
ferric-colossus 9×6 · iron-regent 10×7 · prism-widow 8×5 · glass-echo 6×3 · wire-weaver 8×5 · glass-choir 9×4 ·
coil-serpent 10×3 · echo-tender 9×4 · hollow-choir 10×7 · gate-sentinel 7×6 · null-marshal 8×4 · ash-moth 6×5 ·
grave-reaver 9×5 · demolition-engine 9×6 · quarantine-drone 6×4 · blackout-core 10×8`. `gate-warden` and
`sealing-drone` are roomless escort sprites (~64×64) that fly beside their boss (they have hull points and can be
targeted as a single "room", or act like FTL drones — combat workstream decides).

### 4.6 Player vessel
`lamplighter` — the Lamplighter, a Reach-dock relay tender: narrow brass-and-ivory hull, riveted plates, a lamp
cupola at the nose, cable-thrust engines at the back, small dorsal weapon hardpoints. Layout (tile = 24 logical px,
nose points right, 12×6 grid; letters are rooms):

```
......WW....      E engines (0,2,2,2)      a hold-a/drones slot (2,1,2,2)   b hold-b/veil slot (2,3,2,2)
..aaOOWWsSS.      O air (4,1,2,1)          h hall (4,2,2,2)                 D doors (4,4,2,1)
EEaahhggcSSP      W weapons (6,0,2,2)      g galley (6,2,2,2)               M medbay (6,4,2,2)
EEbbhhggckkP      s sensors (8,1,1,1)      c corridor (8,2,1,2)             q quarters (8,4,1,1)
..bbDDMMqkk.      S shields (9,1,2,2)      k hold-c (9,3,2,2)               P helm (11,2,1,2)
......MM....
```
Doors: automatic, one per adjacent room pair (at the middle of the shared edge), plus airlocks at `E` (left),
`W` (top), `M` (bottom). Hull image **416×224** px with the room grid (288×144) placed at offset **(56, 40)**.
The hull art must fully cover the grid footprint and extend: engines/nacelles behind x<56, a nose + lamp cupola in
front past x=344, dorsal/ventral fins. Weapon hardpoints: 4 mounts on the hull's top/bottom edges near W and S.

---

## 5. Art (Krea 2 → pixel art)

**Look:** FAULTLINE's world in crisp pixel art — FTL readability with FAULTLINE's palette and moods: dark
indigo-black space at the edge of the atmosphere, the cloud sea far below, the ring of the Line as a long arc of
dark machinery and lamps, spires rising out of the clouds, tarnished brass, chipped ivory, teal signal light, warm
amber lamps; Stage I copper-green and rust, Stage II violet glass, Stage III ember red.

**Pipeline** (art workstream): Krea 2 Turbo (ComfyUI, the faultline recipe) paints large images from pixel-art
prompts (optionally img2img from a programmatic silhouette so hulls match the room grid), then a deterministic
**pixelizer** (`tools/pixelize.py`) downsamples to the target size (area/median per cell), snaps to the master
palette (§7) in OKLab, cleans stray pixels, adds a 1-px dark outline for sprites, and produces alpha. The pixelizer
and every recipe are committed so the whole set is reproducible and consistent.

Deliverables (paths are under `public/art/`, PNG, alpha where noted). Target sizes are **final pixel sizes**:
| Group | Path | Size | Notes |
|---|---|---|---|
| Player hull | `ships/lamplighter.png` | 416×224, alpha | grid offset (56,40) per §4.6 |
| Enemy hulls | `ships/<id>.png` | fit in **288×224**, alpha | one per §4.5 id; bosses up to **320×288**; `gate-warden`, `sealing-drone` ~64×64 |
| Stage backdrops | `bg/s1-a.png … s3-c.png` | 480×270 (drawn 2×) | 3 per stage: the Line's outer hull, cloud sea below, spires, stars; leave the middle band quiet for ships |
| Title key art | `bg/title.png` | 480×270 | the Lamplighter along the dark Line, the Faultline gap in the arc of lights |
| Relay Seven | `bg/relay-seven.png` | 480×270 | the switchboard room, the blinking KEEPER lamp, the Operator's chair |
| Map charts | `bg/s1-c..s3-c.png` + code-drawn plate | 1920×1080 panorama | region panorama behind the brass carrier chart |
| Set pieces | `props/<id>.png` | ≤160×160, alpha | FTL "planets": spire tops, broken ring gate, relay lamp towers, Copper Market stacks, Glass Cathedral dome, the Heart sphere, the Faultline gap, a lift car, the cloud floor, etc. (~12) |
| Portraits | `portraits/<id>.png` | 96×96 | operator, pell, scavenger, bench-keeper, bellmaker, teal-jacket (radio, face mostly in shadow), warden-memory (Harrow, only as an old badge photo?), plus 2 per crew species for recruits (~16) |
| Event art | `events/<id>.png` | 320×160 | ~30 scenes (list comes from the writing workstream in `docs/art-requests.md`; start with the obvious ones: drifting lift car, relay bench with kettle, Copper Market, echo tender with lamp lit, glass bells, the queue lights, sealed relay, debris field, radio mast on the Ground, the GROUND lamp) |
| Ending panels | `ending/e1..e6.png` | 480×270 | shell opens; messages race along the Line; lamps return segment by segment; the Ground under thin clouds, lift-car houses; a radio in the rain; the GROUND lamp at Relay Seven |
| Game over | `bg/line-quiet.png` | 480×270 | Relay Seven, the lamp blinking again, empty chair |

## 6. Code-authored pixel sprites (sprites workstream)
Drawn by deterministic scripts (Python/PIL or TS→PNG) into `public/sprites/`, each atlas with a JSON of frames:
- **Crew** (`crew.png/json`): 5 species × (idle 2f, walk 4f × 4 dirs or 2 dirs mirrored, repair 2f, fight 2f,
  man-station 2f, death/stop 3f), ~20×20 frames, plus 3 boarder machines. Palette-variants for individual crew
  (lamp colour, coat colour).
- **Icons** (`icons.png/json`): systems (10) in 3 states (powered/unpowered/damaged/ionised), resources (5),
  map beacons (combat/event/market/hazard/bench/exit/sealed/unknown/visited/current), statuses (fire, breach, air,
  pause, sensors, evasion), buttons glyphs (hop, pause, ship, map, settings, sound, fullscreen, close).
- **Weapons** (`weapons.png/json`): each weapon type's hardpoint sprite in 4 charge frames + firing frame, left and
  right facing (enemy mounts face left).
- **Drones** (`drones.png/json`): each drone, 2–4 frames.
- **Effects** (`fx.png/json`): laser bolts (per type colour), ion balls, payload shells with trail, flak pellets,
  explosion frames (3 sizes), hull-hit sparks, fire (animated, room-tile), breach (animated), smoke, shield bubble
  segment/ripple, hop-drive charge glow, sealing lattice, glass shards, ember motes.
- **UI** (`ui.png/json`): 9-slice panels (dark brass frame with ivory inner line; variants: default, highlighted,
  danger, glass/violet, ember), buttons (normal/hover/pressed/disabled), tabs, bars (power bar segments, hull
  segments, charge bars), scroll thumb, checkbox, slider, tooltip frame, dialogue frame, cursor set (arrow, target,
  crew-select, move, blocked), room floor tiles, walls, doors (open/closed/animated), system room floor emblems.

## 7. Master palette (50 colours) — `public/palette.json`
```
ink        #07080f #0c0f1c #131a2b #1c2640 #283556 #3a4a70
steel      #4a5068 #6b7086 #9096a8 #c3c7d4
ivory      #f4ecd6 #e9dfc4 #cfc2a0 #a89b7b #7d7159
brass      #ffe39a #f2c46b #d9a24a #b07a32 #7f5424 #553619
copper     #e08a55 #c8663a #97452a #6a2d20 #3f1b16
verdigris  #8fd6b6 #6fb59a #3f8a74 #2a5c52 #1b3b38
teal       #c8fff6 #7ff7e6 #3fd3c9 #1e9aa0 #146069
amber      #fff1c2 #ffd98a #ffb347 #e8822a
violet     #e2c8ff #b28cf0 #7d5bc9 #4f3a8f #2c2159
ember      #ffc2a8 #ff8a6b #e0443a #a3222e #5e1224
```
Backgrounds may add up to 16 extra in-between colours per image (cloud and sky gradients), recorded in the manifest.

## 8. Audio

### 8.1 Music (YuE2, like FAULTLINE's `soundtrack/`)
Sound: **Ben Prunty's FTL** and the **FTL: Multiverse** soundtrack first — warm analog-synth arpeggios, pads,
sequenced bass, retro-cinematic space atmosphere, occasional clean guitar, piano and strings, melodic and spacious;
with FAULTLINE's colours (felt piano, cello, glass bells, a lamp-pulse tick, violet glass mallets in Stage II, low
brass and ember drones in Stage III). Instrumental only; no vocals, words or choir singing words.
Each area theme comes in an **explore** and a **battle** version built from the same plan (same key, BPM, form and
length) so the game can crossfade between them in sync, FTL-style. Delivery: `public/audio/music/<id>-explore.ogg`,
`<id>-battle.ogg` (48 kHz stereo Vorbis, −19 LUFS, −2 dBTP like FAULTLINE), plus a `public/audio/music.json` with
BPM, bars, loop points and durations.
| id | Where | Notes |
|---|---|---|
| `title` | title screen | main theme "Time to Live" (single version) |
| `relay-seven` | prologue, Relay Seven | intimate: felt piano, analog pad, the lamp tick (single) |
| `copper-reach` | Stage I theme A | explore + battle |
| `rust-kingdom` | Stage I theme B | explore + battle |
| `glass-cathedral` | Stage II theme A | explore + battle |
| `choir-weather` | Stage II theme B | explore + battle |
| `blackout-heart` | Stage III theme A | explore + battle |
| `last-orders` | Stage III theme B | explore + battle |
| `exchange` | store / Copper Market | single, warm and a little funny |
| `iron-regent` | Guardian I | single, battle |
| `hollow-choir` | Guardian II | single, battle |
| `event-horizon` | Blackout Core | single, 3-phase intensity (or phase layers) |
| `an-answer` | ending | single, the answer; hopeful |
| `line-quiet` | game over | short, single |

### 8.2 Sound effects (Stable Audio 3 Small SFX + synthesis)
`public/audio/sfx/<id>.ogg` + `public/audio/sfx.json`. Cues (1–3 variants each where useful): `laser-fire`,
`laser-heavy`, `ion-fire`, `beam-fire`, `payload-launch`, `flak-fire`, `shield-hit`, `shield-up`, `shield-down`,
`hull-hit-small`, `hull-hit-big`, `miss`, `explosion-room`, `ship-destroyed` (machine powering down: a task
ending, not gore), `fire-loop`, `breach`, `air-alarm`, `hull-alarm`, `door-open`, `door-close`, `repair-loop`,
`repair-done`, `crew-select`, `crew-move`, `crew-fight`, `crew-stopped`, `boarders`, `power-up`, `power-down`,
`power-denied`, `weapon-charged`, `weapon-select`, `hop-charge`, `hop-ready`, `hop` (the relay throws the tender:
a rising cable-thrum then whoosh), `arrive`, `ui-click`, `ui-hover`, `ui-back`, `ui-open`, `buy`, `sell`,
`salvage-pickup`, `event-open`, `map-open`, `seal-advance`, `lamp-on`, `glass-bell`, `radio-squelch`, `page-lamp`
(the Relay Seven page), `victory-sting`, `defeat-sting`, `drone-launch`, `veil-on`, `veil-off`, `ion-hit`,
`teleport-in` (boarders latching). The lore folder `faultline/.work/lore/score/sfx/` has a proven Stable Audio setup
and some cues (glass bell, radio squelch, lamp on, relay click) to learn from.

## 9. Code architecture & ownership

```
src/main.ts                 boot, loop                                   (lead)
src/core/*                  canvas scaling, input, bitmap font, UI kit,  (lead)
                            assets, audio engine, scenes, rng, save
src/game/types.ts, ids.ts   shared data contracts                        (lead)
src/combat/*                combat sim + combat scene + ship rendering   (combat workstream)
src/data/*                  ships, weapons, drones, augments, crew,      (combat workstream)
                            enemies, balance
src/campaign/*              run state, stage maps, events runtime,       (campaign workstream)
                            store, upgrades, save/continue
src/screens/*               title, prologue, map, event, store, ship,    (campaign workstream)
                            game over, ending, credits, settings, codex
src/content/*               events, lore codex, names, dialogue, ending  (writing workstream)
docs/lore.md                expanded canon for this game                 (writing workstream)
tools/pixelize.py, art-src/ Krea pipeline, prompts, manifests            (art workstream)
public/art/*                final pixel art                              (art workstream)
tools/sprites/*, public/sprites/*  code-authored sprites                 (sprites workstream)
audio-src/*, public/audio/* music + sfx pipeline and delivery            (audio workstream)
```

- Logical resolution 960×540. `TILE = 24`. Fixed simulation step 1/60 s; the sim is deterministic given a seed
  and pure TypeScript (no DOM) so it can be unit-tested with `node --test` and balanced headlessly.
- Assets are loaded by id through `src/core/assets.ts`; a missing asset renders a clean procedural fallback (never a
  broken image), so code and art can progress independently.
- Tests: `npm test` (sim + content validation: every event id/reference resolves, every choice has an outcome, every
  referenced asset exists or has a fallback), `npm run build`. Browser checks with Playwright (reuse
  `/home/clab/projects/clab/faultline/node_modules` if needed, or install locally).
