# TIME TO LIVE: art requests from the writing workstream

Every `art` / `portrait` key used by `src/content/**` that is not in the contract's standard list is briefed here.
The content validation test (`src/content/content.test.ts`) reads the backticked keys in this file, so a key the
content uses must appear here as `` `events/<id>` `` or `` `portraits/<id>` ``.

## Key conventions (how content refers to art)

- `EventDef.art` is a bare id: `"copper-market"` means `public/art/events/copper-market.png` (320×160).
- `EventDef.portrait` and `ScriptBeat.portrait` are bare ids: `"pell"` means `public/art/portraits/pell.png` (96×96).
- `ScriptBeat.art` and `CodexEntry.art` are paths under `public/art/` without extension: `"bg/relay-seven"`,
  `"ending/e3"`, `"events/queue-lights"`, `"ships/packet-leech"`, `"portraits/pell"`.
- Standard keys from the contract (not briefed here): `bg/title`, `bg/relay-seven`, `bg/line-quiet`,
  `bg/s1-a … bg/s3-c` (charts share the region's `-c` panorama), `ending/e1 … ending/e6`, `ships/lamplighter`, `ships/<enemy id>`,
  `ships/gate-warden`, `ships/sealing-drone`, and the portraits `operator`, `pell`, `scavenger`, `bench-keeper`,
  `bellmaker`, `teal-jacket`, `warden-memory`.

## General direction for event art (320×160)

FAULTLINE's world in crisp pixel art, master palette (contract §7), **side view** like the backdrops (Direction v2).
The frame is a wide letterbox: keep the subject readable at 1×, with one strong light source (amber lamp, teal
signal, violet glass, ember). Dark indigo-black sky at the edge of space, the cloud sea far below where it shows.
**Nothing flies between relays except small drones on rotors**: tenders and other cars hang from drive trolleys on
**carriers** (heavy braided cables sagging between spire tops and relays); relays are switchyards where carriers meet;
installations are built into relays, gates and halls. No spaceships, open-space docking, planets or asteroids. No people's faces in close-up (portraits do that); figures
are small and seen from behind or in silhouette. No swords, torches, scrolls or medieval props. Stage palettes:
**Stage I** copper-green verdigris and rust orange with brass; **Stage II** violet glass, frost white, teal;
**Stage III** ember red, black lattice, amber queue-lights. Shared scenes use neutral ink/brass/ivory with a teal or
amber accent.

---

## Event art · shared (any stage)

### `events/lift-car-stuck`
A freight lift car (a "shuttle") stuck in an open lattice lift shaft near the top of a spire, hanging askew on its
guide rails, cloud sea far below. Rows of small windows, all dark except one warm amber square. The tender's teal
lamp reaching it from a carrier that passes close to the shaft on the left. Mood: hush, hope. Neutral palette,
amber accent.

### `events/relay-bench`
Interior of a small relay bench room: a workbench under a single amber work lamp, tools laid out in careful order, a
brass kettle on a shelf, a drawer half open with spares sorted into labelled trays, a stamp press (brass lever, date
wheel) on the end of the bench. A window shows the dark ring outside. Mood: warmth, somebody was just here.

### `events/relay-switchyard`
A relay switchyard on the outside of the ring: three or four heavy carriers converging on a squat switch house with
brass switchgear, a guide-lamp mast above it, a small bench window lit. The tender (a long brass-and-ivory cable car
hanging from its drive trolley) riding in on a carrier from the left. Stars above, cloud sea below. Neutral palette
with a warm lamp.

### `events/tender-radio`
A tender's galley deck at night: a lamper's radio set built into the wall (brass dials, cracked speaker grille, a
glowing teal tuning needle), a mug steaming beside it, a crew member's shoulder and headset in silhouette at the
edge of frame. Through a small porthole, the arc of the Line. Mood: listening, late.

### `events/lamplighter-helm`
Close view of the Lamplighter's helm under the lamp cupola, cab window beyond showing a carrier running away into
the dark: the switch lever, worn brass, and above it cut into the metal rows of tally marks in fives, a column of
numbers, and the words LEAVE IT LIT. Lamp glow from above. Mood: inheritance.

### `events/machine-hulk`
A large crawler machine hanging powered down from its carrier after its task ended: lamps dark, grip locked, a
few escort automatons clinging motionless to its plating, loose cable ends swinging. The tender's lamp picks out its
outline from a carrier alongside. Palette neutral with rust; works for any stage.

### `events/tender-wreck`
A cable tender like ours, same lamplighter pattern, fallen from its carrier and wedged in a relay gantry below, split
along its spine, its trolley still gripping a snapped cable end above. Its cupola is cracked and dark. A name
painted on the car is half legible. Mood: the keepers who did not come back.

### `events/derelict-car`
A derelict tender car stalled alone on a carrier, uncoupled: a short brass-and-ivory rear car (freight or bunk
car) or a keel car hanging from its own small trolley, its coupling hook dangling, windows dark except one lamp, a
tarpaulin flapping. The Lamplighter's cupola lamp picking it out from the right. Neutral palette with the stage's
tint; works for any stage. Mood: a spare part with a history.

### `events/refit-bay`
A relay switch house turned workshop: a lamplighter-pattern tender's hold opened up at the socket, a module crate (brass
frame, ivory panels, stencilled lettering) swinging on a chain hoist toward it, tools laid out, a kettle on a crate.
Warm amber work lamps. Used for refits at benches and markets in any stage.

### `events/cold-berths`
A medical bay on the Line: a row of frost-covered cold berths (glass-lidded capsules) in a dim ivory room. All the
status lamps are dark except one, which glows teal. Frost on the glass. Mood: a held breath.

### `events/sealed-relay`
A relay closed by the Seal: a black geometric lattice grown over the relay's switch house and lamp, a thin red seam
of light running along every joint, the carrier running through it still whole (the Seal shutters signal conduits,
it does not cut steel), two Quarantine Drones (black shells, red seams, four rotors) holding station nearby. The lamp is still faintly visible behind the lattice. Mood: patient,
closed. Works for any stage (tint the backdrop per stage).

### `events/machine-escort`
An escort automaton (squat ivory shell, one lens, tool arms) powered down on a gantry, curled like a sleeping
animal, its single lens dark. A crew member's glove reaching into frame toward it. Mood: the first hello.

### `events/spire-top`
Spire tops rising out of the cloud sea like islands of scaffold: containers, cranes, gantries, a few lamps, and
the carriers sagging between them in long curves. Wide and quiet. Neutral with brass, good for empty relays in any
stage.

### `events/queue-lights`
Seen through a crack in a vast dark shell: a field of countless small amber-gold lights, thirty-one years of
messages, each a tiny glowing point, arranged in faint rows like a city at night seen from above. Mood: awe and
tenderness. Stage III palette, but gold rather than red.

### `events/radio-mast-ground`
The Ground at dusk in the rain: a radio mast built from lift parts on a hill, a lift-car house with a lit window at
its foot, fern valleys, black stone, the foot of a spire rising like a mountain into the cloud ceiling. Deep greens,
lamplight. Mood: somebody is still calling.

### `events/ground-lamp`
The Relay Seven switchboard, very close: rows of dark brass lamps and jacks, and one lamp beginning to glow above an
engraved plate. (Used on the Stage III side of the story; distinct from the ending panel e6.) Amber on ink.

---

## Event art · Stage I · The Copper Reach (verdigris, rust, brass)

### `events/copper-market`
The Copper Market: shipping containers stacked and welded into a tower on a Reach spire top, stalls on every
landing, strings of salvaged relay lamps, a crane swinging a container like a lift, patched skiffs (small cable cars)
hanging from carriers alongside.
Warm amber lamps against copper-green rust. Busy, a little funny.

### `events/pell-stall`
Pell's stall inside the market: a container opened up into a shop, shelves of cable, lenses, spares, a ledger on the
counter, a hand-painted sign PELL · SALVAGE · FAIR PRICES · NO LENDING, one very good crimper hanging behind the
counter on its own hook. No face (Pell's portrait does that); maybe her hands on the ledger.

### `events/scavenger-skiff-hail`
A scavenger skiff coming alongside on a parallel carrier: three dead cable cars welded onto one working trolley,
mismatched plates, salvage nets trailing, crew waving hand lamps from an open hatch. Rust and verdigris, amber hand
lamps. Mood: could go either way.

### `events/rust-yard`
A relay yard on a spire top: container stacks, a gantry crane still rolling its rail on its own, condemned hardware
piled in skips, chalk marks on everything, green copper carriers hanging in loops overhead. Rust orange and
verdigris.

### `events/sorting-office`
The Reach sorting office: pigeonholes to the ceiling, each with a parcel and a brass ticket, a polished counter,
stopped clocks, dust in a slanting beam of light. On the counter, one small wrapped parcel. Warm brass, dusty.

### `events/lift-head`
A lift head at the top of a spire: freight gates, a loading cage hanging open, a departure board with old amber
letters still showing the last departures, handprints on the gate. The shaft drops away into cloud. Copper and brass.

### `events/carrier-cut`
A work span parting: a Cable Wraith (a long thin crawler with enormous shears at its nose) clamped on a side carrier
that runs beside the tender's own, shears closed, the severed cable end whipping away in a spray of verdigris and
sparks. The carrier the tender hangs from holds. Seen from the tender's rear window. Copper and teal sparks. Used for
wraith cuts only; ordinary quarantine closes conduits and never cuts steel.

### `events/foundry-mouth`
A Reach foundry seen from outside: a vast furnace mouth in a black iron wall, glowing dull red because it was
banked, not doused. Iron and ember in a copper landscape. The silhouette of a Ferric Colossus built into the foundry
wall beside the mouth, standing guard.

### `events/debris-field`
The outer relays after the break: great broken ring gates like teeth against the stars, and the carriers around them
hung with snagged wreckage (plates, cable, a lift cage, a lamp) swinging and glittering in sunlight. The tender
small on its carrier, threading through.

### `events/rust-squall`
A rust squall: an orange-brown cloud of oxide dust pouring along the carriers, lamps showing as blurred amber spots
in it, cable whipping. Visibility low. Rust palette.

### `events/sun-glare`
Sun-side of the ring: the sun low on the horizon of the world, copper plating and carriers throwing a blinding glare,
heat shimmer, a small fire flickering in the tender's window. Bright brass and copper against black.

### `events/copper-gate`
The Copper Gate: two enormous gate wings the height of a spire top, closed across every carrier, and built into the
gap between them the crowned iron bulk of the Iron Regent, still and dusty, its tarnished brass crown faintly lit.
The tender tiny on its carrier before it. Verdigris and brass, solemn.

---

## Event art · Stage II · The Glass Cathedral (violet, frost, teal)

### `events/glass-bells`
Under the ring: great violet glass bells hanging in iron frames like strange fruit, frost on the glass, faint light
inside some of them. One bell is the size of a lift car. A carrier runs between them, and the tender's teal lamp is
making a pane glow. Eerie, lovely.

### `events/cathedral-nave`
The Glass Cathedral from a carrier at close range: a nave of violet glass panes and buttresses, frost patterns,
light moving inside the glass like slow traffic. The panes ringing is suggested by faint concentric lines. Part-glass
carriers run along its flank.

### `events/choir-loft`
Inside the north nave's choir loft: rows of empty choir stalls, a lamp still on, bells in their frames, a big clock
with a winding key, tuning forks laid out on a cloth. Violet light through glass. Someone keeps winding the clock.

### `events/echo-tender-lit`
An echo tender: a cable tender like ours on its carrier, lamp cupola lit, nobody at the cab window, stopped under a
relay's guide lamp that it is relighting and that is already fading. Violet backdrop. Mood: devotion, loneliness.

### `events/glass-fog`
Glass fog: a violet-white fog pouring off the Cathedral's flanks and hanging under the ring, tiny ice-glass crystals
glittering, frost on the carriers, lamps blurred to halos, the tender's beam a solid bar in the fog.

### `events/ringing-panes`
A wall of Cathedral panes vibrating: visible standing-wave patterns in the glass, frost shaking loose in bursts,
sparks of ion light jumping between the frames. Violet and teal.

### `events/resonance`
The whole flank of the Cathedral humming in tune: concentric rings of light pulsing outward through the glass in
time, the tender's hull lit in the same rhythm. Violet with a warm pulse.

### `events/hollow-choir-hall`
The Hollow Choir's hall: a vast dark space ringed with porcelain masks and violet glass bells hung on chains,
organ-pipe spines rising, faint shapes of voices inside the glass. A carrier runs into the hall, and the tender is
small at the entrance. Violet and ivory.

### `events/bellmakers-bench`
A bellmaker's bench in the Cathedral: tuning forks of violet glass in a rack, a small bell on a stand, a kettle, a
glass pendant hanging from a lamp. Frost on the window. Warm lamp in a cold violet room.

---

## Event art · Stage III · The Blackout Heart (ember, black lattice, amber)

### `events/ember-archive`
Inside the Heart's outer galleries: shelving stacks the size of spires receding into red haze, carriers running
through the galleries, cooling fins glowing ember, sparks rising, the Seal's black lattice creeping over the walls.
Solemn, hot.

### `events/dark-stretch`
A dark stretch of the ring: total darkness except the tender's own lamp lighting a few metres of carrier, and one
faint guide lamp far away on its trickle. The Heart's red glow barely visible at the horizon. Mostly ink.

### `events/ember-draft`
Ember drafts: heat pouring off the Heart's cooling fins in rivers of sparks and glowing ash, the tender running
through it on its carrier with its plating reflecting red. Ember palette.

### `events/sealing-lattice`
The Seal's lattice growing ahead of itself along the carriers: black geometric struts reaching across the ring like
frost made of iron, red seams lit, sealing drones on rotors building it. The way ahead narrowing. Ember and ink.

### `events/checkpoint-gate`
A trust-boundary checkpoint in the Heart built over the carriers: barred gates across the cables, a great
key-scanner eye glowing red, stencilled Runbook lettering PRESENT KEY. Ember and steel.

### `events/wardens-post`
Harrow's post, now Bench Four: a small warden station behind thick doors, an old log book open on the desk, a
kettle on the shelf, warden armour plates hung on the wall, a dim amber lamp. Heavy, quiet, kind.

### `events/heart-shell`
The shell at the centre of the Heart: concentric iris plates closed like a vast eye, ember red, with thin cracks
through which the gold of the queue shows. Sealing drones hovering around it on rotors. The carriers end at it. The
tender tiny. Awe.

---

## Portraits (96×96) not in the contract list

### `portraits/moss`
Moss Adair, scavenger captain of the Second Helping: fifties, weathered, a patched Night Shift coat with too many
pockets, a salvage hook on his belt, a battered amber hand lamp. Wry, tired, decent. Copper-rust backdrop.

### `portraits/ennis`
Ennis Rook, keeper of the last bench before the Heart: an old warden in his late forties to fifties, grey stubble,
dark armour plates worn over a knitted jumper, brass visor pushed up, an ember stripe on the shoulder. Quiet eyes.
Ember-dark backdrop.

### `portraits/recruit-linefolk-a`
A linefolk recruit: ivory-and-brass work gear, headset around the neck, a teal lamp on the chest, thirties, soot on
one cheek. Neutral backdrop.

### `portraits/recruit-linefolk-b`
A second linefolk recruit: older, sixties, amber chest lamp, knitted cap, a cook's or clerk's look, amused.

### `portraits/recruit-warden-a`
A warden recruit: dark armour plates, brass visor up, ember stripe, young (twenties), serious.

### `portraits/recruit-warden-b`
A second warden: older, visor down, a chipped plate repaired with brass rivets, a small kettle charm on the strap.

### `portraits/recruit-rigger-a`
A rigger: squat ivory automaton shell, one teal lens, tool arms folded, a painted designation on the shell
(e.g. 7-TERN) and a tiny bird stencil.

### `portraits/recruit-rigger-b`
A second rigger: more battered, a replaced plate of a different colour, lens slightly cracked but teal, a scrap of
cloth tied round one arm by a crew member.

### `portraits/recruit-courier-a`
A courier: light coat, satchel strap across the chest, goggles pushed up, amber lamp, twenties, quick grin.

### `portraits/recruit-courier-b`
A second courier: forties, goggles down, scarf, a bundle of letters tied with string visible in the satchel.

### `portraits/recruit-linefolk-c`
A third linefolk recruit, an older woman: sixties, grey hair in a short plait under a knitted cap, reading glasses on
a cord, worn ivory work coat, amber chest lamp, a clerk's or cook's steady face.

### `portraits/bellmaker-b`
A second bellmaker, very old: eighties, thin white hair, a long violet-trimmed coat gone grey at the cuffs, a glass
tuning fork held close to the ear, a small glass pendant. Violet glass behind.
