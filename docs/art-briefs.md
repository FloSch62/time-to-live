# TIME TO LIVE: art briefs for the pixel-art pass

Written by L (world and design) for A (art) before A3 regenerates backgrounds, lore illustrations and the Glasswing and
Switchback hulls in the new pixel-art style (plan §2.1). Each entry says what must be visible, the region's palette
and mood, what the player should feel, and what must never appear. **Now:** notes what is wrong with the shipped image.

The prompt text lives in two places. `art-src/subjects.py` holds the vessel, background, scene, portrait and prop
subjects. `docs/art-requests.md` holds the 44 event illustrations and the extra portraits, and
`subjects.parse_requests()` reads it. Section 11 lists what L already changed there. It also lists the fixes that
belong in A's style heads in `specs.py` and in `backdrop.ts`.

---

## 0. Rules for every image

**The one test:** would a lamper riding this carrier see this? These facts come from the lore, §1–2 and §13.

- **The Line is held up, not flown to.** It is a ring of relay machinery just above the air, carried on spires that
  rise out of a permanent cloud sea. Carriers are heavy braided cables that sag between spire tops and meet only at
  relays.
- **Every car hangs.** Tenders, skiffs and derelict cars hang beneath a drive trolley whose grip arms clamp a carrier.
  - Nothing has wheels on the ground, rails or a road.
  - Nothing is a tram with a pantograph, a boat, a gondola on a rope or a hot-air balloon.
- **Nothing flies except small rotor drones**: bell-drones, cooling drones, sealing drones and gate wardens.
  - No spaceships, orbits, planets seen from space, asteroids, docking tubes or floating islands.
  - Nothing drifts free in the dark.
- **Machines are industrial**: brass, chipped ivory, verdigris and dark gunmetal, lit by small accents (teal signal,
  amber lamp, violet glass, ember). They have no faces or eyes, except the Hollow Choir's porcelain masks, and they
  are never creatures.
- **Gothic shapes only as distant spires.** The Glass Cathedral is an optical switching hall made of glass domes,
  naves and buttresses laid along the ring. It is never an Earth church standing on clouds.
- **No swords, torches, candles, open flames on consoles, scrolls or medieval props.** Lamps are electric: an amber
  guide lamp, an indicator lamp, a work lamp.
- **People are rare and small.** The Night Shift are a few hundred people; a crew is three to eight. Outside the car
  the air is too thin to breathe.
  - Most exterior scenes have nobody in them.
  - When crew appear, show one to three small figures: at a hatch, on a gantry in masks, or inside the car seen
    through a window.
  - **Never a crowd of silhouettes in the foreground, and never people standing on the cloud sea.** *(Now: nearly all
    44 event images put a theatre audience of silhouettes along the bottom edge; see §11.3.)*
- **Viewpoint:** side view, like the game. Exterior scenes are usually seen from the tender's cab window or from a
  carrier alongside. The cloud sea is always *below*.
- **Palettes:**
  - Copper Reach: verdigris, rust orange, brass, amber lamps.
  - Glass Cathedral: violet glass, frost white, teal.
  - Blackout Heart: ember red, black lattice with red seams, amber and gold queue-lights.
  - Shared scenes: ink, brass and ivory with one teal or amber accent.
- **Scenes sit behind vessels.** Backgrounds keep the middle band quiet and lower in contrast and saturation than the
  hulls, with no bright shapes behind the hull silhouettes (plan §2.1).

---

## 1. Title (`bg/title`)

**Show:**
- The Lamplighter, small in the lower middle, in strict side view.
- The car must read as a lamplighter-pattern tender: a long brass-and-ivory car, a round glass lamp cupola glowing
  amber at the nose tip, a warm cab window under it, and a keel of tanks below.
- It hangs beneath its brass drive trolley, whose grip arms clamp a heavy braided carrier. The carrier sags in a long
  curve between two dark spire tops.
- Above, the arc of the Line runs as a string of tiny lamps with **one dark stretch: the Faultline gap**.
- Slender industrial spires stand in the cloud sea far below. The upper third is quiet sky for the logo, and the lower
  left stays calm for the menu.

**Feel:** a small warm lamp against vast cold machinery. Melancholy, a little hopeful.

**Never:**
- a generic tram
- a pantograph or roof bow collector
- a lantern hanging off the nose on a bracket
- wheels under the car
- the fantasy castle-tower with conical roofs filling the right third
- bright cloud tops behind the menu

**Now:** all six of those "never" items are in the current image. It shows a tram with a pantograph and a hanging
lantern, a fantasy castle on the right, and no Faultline gap. The menu sits on the brightest clouds (plan §1.2).

## 2. Relay Seven and the line gone quiet

### `bg/relay-seven`
**Show:**
- The Relay Seven switchboard room at night: a tall manual switchboard of brass jacks, ivory panels and braided patch
  cords, filling the wall.
- Every small lamp is dark except **one small round amber indicator lamp** in the middle, blinking above an empty jack.
  An engraved plate under it is readable as a plate, with no lettering needed.
- A worn operator's chair with a headset hung on it.
- One kettle on a shelf.
- A round porthole showing the cloud sea and the arc of lamps.

**Feel:** warm, domestic, patient. Somebody has been answering this board for thirty-one years.

**Never:** a candle or open flame on the board, oil lamps, or a second kettle.

**Now:** a candle-like flame burns in the middle of the board, and there are two kettles.

### `bg/line-quiet` (game over)
**Show:** the same room, very late.
- The KEEPER lamp is blinking again.
- A patch cord hangs loose beside a cold jack.
- The chair is empty and the headset rests on the desk.
- The only light comes from the blinking lamp.

**Feel:** loss without drama. Tomorrow someone else will sit here.

**Never:** mushroom-shaped oil lamps, or warm work lamps lighting the room.

---

## 3. Regional backgrounds (behind the vessels)

**Shared constraints for every background:**
- It is seen from a carrier.
- The ring underside or spire tops fill the top band. The cloud sea and distant spires fill the bottom band.
- The middle band (25–66 % of the height) stays calm, dark sky, because the game draws the carrier and the cars over it.
- There are no vehicles in the art. The game draws the tender, the enemy and the carrier.

### Stage I · The Copper Reach (verdigris, rust, brass, amber; rough, rusty, busy)

- **`s1-a` The Reach.**
  - Top: the riveted underside of the ring gone green and orange, with gantries and hanging cable loops.
  - Bottom: a copper-and-rose cloud sea in low sun. Spire tops rise out of it, crowned with stacked containers and
    cranes. A broken ring gate stands far away.
  - Feel: the loud end of the Line.
  - Never: a planet curve.
- **`s1-b` The broken outer relays.**
  - At night, the lamp line along the ring stops at a dark break with snapped girders.
  - On the horizon the outer relay gates stand like enormous broken wheels. Wreckage hangs *snagged on carriers*
    around them.
  - Feel: where it happened.
  - Never: debris floating free, as if in orbit.
- **`s1-c` The foundries, sun side.**
  - Banked furnace vents glow dull red under the ring.
  - A copper-gold cloud sea in glare.
  - On the horizon, the **Copper Gate**: two closed gate wings on a spire.
  - Feel: heat, a destination.
- **`s1-d` The switch-tower canyon** (working landmark).
  - A colossal verdigris switch tower with pulley wheels and crane booms, cropped at the left.
  - A counterweight tower at the right, with taller carriers crossing the top diagonally between them.
  - Container islands in dark cloud far below.
  - Name it "switch-tower canyon" in notes. "Switchback" is now a tender's name.
- **`s1-e` The Sunward Drydock** (refuge).
  - A horseshoe maintenance dock at lower right with crane booms, sleeping car cradles (cars hanging from dock
    gantries by their trolleys) and small amber workshop windows.
  - **A low sun just above the far cloud horizon, partly behind a distant spire top.**
  - Feel: shelter.
  - Never: a black eclipse disk over the sun.
  - Now: the sun has a black disk bitten out of it. The subject text is fixed.

### Stage II · The Glass Cathedral (violet glass, frost white, teal; beautiful, eerie)

- **`s2-a` The Cathedral.**
  - The ring becomes a range of violet optical-glass domes, naves and buttresses on dark brass ribs, glowing faintly
    from within, with frost on the panes.
  - Glass fog pours down in veils toward the cloud sea.
  - Feel: the part of the voyage people talk about.
  - Never: an Earth church facade, or a cathedral sitting on clouds.
- **`s2-b` Glass fog.**
  - The violet underside of the ring and luminous fog banks over the cloud sea.
  - Spire tips and faint bells show through the fog.
  - Keep it soft and banded; no single-pixel speckle.
- **`s2-c` The bells.**
  - A row of violet glass bells in brass frames hangs beneath the ring. Some are the size of a lift car and faintly
    lit inside.
  - Twilight cloud sea.
  - Feel: listening.
- **`s2-d` The Mirror Reservoir** (working landmark). Two immense cracked hexagonal mirror dishes in brass gimbals stand
  at left and right, with a prism staircase and thin cyan beams. The centre stays empty.
- **`s2-e` The Quiet Observatory** (refuge).
  - A slender ivory telescope tower with a split violet dome.
  - A balcony with small amber windows, a kettle-shaped service tank and cable coils.
  - Feel: inhabited, quiet. Marit Seldon could live here.

### Stage III · The Blackout Heart (ember red, black lattice, amber/gold; solemn, urgent)

- **`s3-a` The Heart.**
  - The thickened ring in blackened copper, with ember lamps and the Seal's black lattice.
  - A vast sphere of archive machinery (concentric galleries, cooling fins) rising from the horizon, glowing ember.
  - Feel: the archive spending itself.
  - Never: spikes that read as a sea urchin, a sun, or an eye.
- **`s3-b` A dark stretch.** Almost everything is dark: the Seal's lattice with thin red seams overhead, a black cloud
  sea, one faint guide lamp on its trickle, and an ember glow on the horizon. It must still read at 1366×768; give the
  lattice one clear value step.
- **`s3-c` Inside the reach of the Heart.**
  - Cooling fins shed ember sparks, and shelving stacks hang like inverted spires.
  - Low on the horizon, through cracks in the galleries, the gold field of the **queue**.
- **`s3-d` The Radiator Graveyard** (working landmark). Broken cooling towers full of radiator slats, exchanger banks
  and catwalks descend into ash cloud, with a distant white-hot aperture behind ribs.
- **`s3-e` The Last Maintenance Sanctuary** (refuge). A huge black lattice buttress, a semicircular gallery with small
  warm windows and a lit doorway, and three archive shells around a dim red core far below-left. Warmth only in the
  refuge.

---

## 4. Endings

- **`e1` The shell opens.**
  - The concentric iris plates of the Heart's shell part, and a stream of thousands of small gold and white lights
    leaves the sphere along the carriers.
  - Feel: release, not explosion.
  - Never: fire or blast debris. The archive is intact; the lights are messages.
- **`e2` The messages run.**
  - Rivers of small lights run along the carriers and the ring: through violet glass halls and past rusted copper
    gates, then down the spires into the clouds.
  - Seen from a carrier.
  - Never: a castle city in the foreground.
- **`e3` The Faultline closes.**
  - From a spire top on the Line, the arc of lamps runs away to both horizons, coming back on segment by segment.
  - The dark gap fills with light from both ends.
  - Dawn light on the cloud sea below.
  - Never: the whole world seen from space, a planet curve, or a halo ring.
  - Now: it shows a planet from orbit. The subject text is changed (§11.1).
- **`e4` The Ground looks up.**
  - A settlement of lift-car houses at the foot of a colossal spire at night, in rain and wet ferns.
  - A few people in coats stand outside looking up. Through thin cloud, the lit arc of the Line.
  - This is the one image where a small group of people belongs.
- **`e5` The radio answers.**
  - Inside a lift-car house: a radio built from a brass-and-ivory lift panel, a transmit key, rain on a round window,
    a chipped mug.
  - The radio's teal indicator is lit.
  - Only a hand, if anyone. Never her face; canon keeps her unseen.
- **`e6` GROUND.**
  - The Relay Seven switchboard close up.
  - In a lower row, a lamp that has never been lit glows warm white-gold above a small brass plate.
  - An old woman's hand reaches for the headset.
  - Never: a legible word on the plate. The game draws it.

---

## 5. Vessels (A2)

All three starting tenders are **lamplighter-pattern cars** (lore §2, §6a; current-design "Three working tenders").
Every one must show, from the side:

- the brass-and-ivory body with riveted plates and small portholes
- a **round glass lamp cupola at the nose tip** (right), with the **cab window** under it
- the **drive trolley with grip arms on the roof, physically clamping the carrier**, at the same height as the
  Lamplighter's in every view
- a **keel** of tanks or hanger lugs below
- a gangway coupler at the flat rear end (left)

Every roof fitting stands on the roof. Nothing floats above it or sits on a separate cart. They differ only in fittings
and proportions.

- **Lamplighter L-12** (reference, keep): the long lamp and rescue car, with tool mounts fore and aft.
- **Glasswing G-04**, optical inspection.
  - Compact; four decks with the 10×4 grid.
  - Under the cupola: two short brass collimator lens tubes on an external rail, teal above amber, with lens caps on
    chains.
  - A faceted violet-and-teal **prism housing** with brass calibration rings on the forward roof, ahead of the
    trolley. Slim **survey horns** aft.
  - Violet glass and teal accents.
  - Now: a flat slab with no nose, cupola or keel. Its trolley is a wheeled cart floating above the roof that never
    meets the carrier.
- **Switchback S-08**, drone retrieval.
  - Tall; five decks with the 13×5 grid.
  - On the aft roof, bolted down: a jointed **retrieval crane** with a trussed jib and hook, and **three U-shaped
    launch cradles** with parked rotor drones.
  - Dark gunmetal **retrieval shutters** along the lower deck, and a heavy drive.
  - Gunmetal and amber accents.
  - It has **the same round nose cupola** as its sisters.
  - Now: the grip arms are hairlines, the roof equipment floats, and the old subject text asked for "NOT a round lamp
    dome". That text is removed.

---

## 6. Event illustrations (44, `docs/art-requests.md`)

Frame 2:1. Readable at 1×. One light source. For people, follow §0: usually none, never a foreground crowd.

### Shared

- **`lift-car-stuck`**
  - Show: a freight lift car hanging askew in an open lattice shaft near a spire top. One amber window among dark ones.
    The tender's lamp reaches it from a carrier passing close.
  - Feel: hush, hope.
  - Never: a train carriage on a trestle.
  - Now: a tram beside a tower.
- **`relay-bench`**
  - Show: a bench in a relay switch house: work lamp, tools in outlined order, kettle, a half-open drawer of sorted
    spares, and a brass stamp press with a lever and date wheel. A small window shows carriers and the dark ring.
  - Feel: somebody was just here.
  - No figures.
- **`relay-switchyard`**
  - Show: three or four carriers converging on a squat switch house with brass switchgear and a guide-lamp mast. The
    tender rides in from the left, hanging from its trolley.
  - Never: a tram parked on the ground beside a cottage.
  - Now: exactly that.
- **`tender-radio`**
  - Show: a tender's galley at night: a lamper's radio in the wall, a teal tuning needle, a steaming mug, one crew
    shoulder and headset at the frame edge. A porthole shows the arc of lamps.
  - Feel: listening, late.
- **`lamplighter-helm`**
  - Show: inside the Lamplighter's nose under the cupola: the switch lever and brass plate cut with tally marks in
    fives. The cab window shows a carrier running into the dark.
  - Feel: inheritance.
  - Now used only for the Lamplighter's dock beat and its gated events.
- **`machine-hulk`**
  - Show: a large crawler hanging powered down from its carrier, lamps dark and grip locked, a few escort automatons
    motionless on its plating, loose cable ends. The tender's lamp picks it out from a carrier alongside.
  - Never: a floating pod.
- **`tender-wreck`**
  - Show: a lamplighter-pattern tender (cupola, cab window, trolley) broken on a relay gantry below its carrier, split
    along its spine, its trolley still gripping a snapped cable end.
  - Feel: the keepers who did not come back.
  - Never: a tram.
- **`derelict-car`**
  - Show: a short brass-and-ivory rear car hanging alone on a carrier from its own small trolley. Its coupling hook
    dangles, one lamp is lit, a tarpaulin flaps.
  - Never: a wagon on wheels standing on clouds.
  - Now: exactly that.
- **`refit-bay`**
  - Show: a switch house workshop. A tender's hold is opened at its socket, and a module crate with brass frame and
    ivory panels swings toward it on a chain hoist. Tools, and a kettle on a crate.
  - Now also used for the Glasswing and Switchback opening, so keep the car generic (lamplighter pattern).
- **`cold-berths`**
  - Show: a dim ivory medical room with frost-covered glass-lidded berths. All status lamps are dark except one teal.
  - Feel: a held breath.
- **`sealed-relay`**
  - Show: a relay switch house and lamp overgrown by a black geometric lattice with red seams along every joint. The
    carrier through it is **still whole**; the Seal shutters signal, it does not cut steel. Two quarantine drones on
    four rotors hold station.
  - Never: a street lamp with helicopters.
- **`machine-escort`**
  - Show: a squat ivory escort automaton with one dark lens, powered down and curled on a gantry. A gloved hand reaches
    in.
  - Feel: the first hello.
  - The current image is close; drop the onlookers.
- **`spire-top`**
  - Show: spire tops rising out of the cloud sea like islands of scaffold: containers, cranes, a few lamps, carriers
    sagging between them.
  - Wide and quiet. No figures.
- **`queue-lights`**
  - Show: seen through a crack in a vast dark shell, countless small amber-gold lights in faint rows, like a city at
    night seen from above.
  - Feel: awe and tenderness.
  - Never: ghostly white figures on clouds.
- **`radio-mast-ground`**
  - Show: the Ground at dusk in rain: a mast built from lift parts, a lift-car house with one lit window, fern valleys,
    black stone, and a spire foot rising like a mountain.
  - Deep greens.
- **`ground-lamp`**
  - Show: the Relay Seven board, very close. Rows of dark lamps and jacks; one lamp begins to glow above an engraved
    plate.
  - Never: a crowd at a counter.

### Stage I · The Copper Reach

- **`copper-market`**
  - Show: a tower of welded containers on a spire top, stalls on every landing, strings of salvaged relay lamps, a
    crane swinging a container like a lift. Patched skiffs (small cable cars) hang from carriers alongside.
  - Busy, a little funny.
  - Now: a clean interior hall. specs.py overrides this brief with an interior; decide which you want. The exterior
    tower is the canon image.
- **`pell-stall`**
  - Show: a container opened into a shop: cable, lenses, spares, a ledger on the counter, and one very good crimper on
    its own hook. Pell's hands on the ledger at most.
- **`scavenger-skiff-hail`**
  - Show: a skiff of three mismatched cars welded onto one trolley, coming alongside on a parallel carrier, salvage
    nets trailing, a crew at an open hatch waving amber hand lamps.
  - Feel: could go either way.
  - Never: tram carriages with a crowd on a platform.
- **`rust-yard`**
  - Show: a spire-top relay yard: container stacks, a gantry crane rolling its rail, condemned hardware in skips with
    chalk marks, green carriers looping overhead.
- **`sorting-office`**
  - Show: pigeonholes to the ceiling, each with a parcel and brass ticket, a polished counter, stopped clocks, dust in
    a light beam, one small parcel on the counter.
  - No crowd.
- **`lift-head`**
  - Show: a lift head at a spire top: freight gates, an open loading cage, a board of small dark amber indicator
    lamps, handprints on the gate. The shaft drops into cloud.
- **`carrier-cut`**
  - Show: a Cable Wraith on a **side carrier** beside the tender's own, its shears closed on a work span, the cut end
    whipping away in verdigris sparks. The tender's carrier holds. Seen from the rear window.
  - Never: a tram interior with passengers.
- **`foundry-mouth`**
  - Show: a banked furnace mouth glowing dull red in a black iron wall. The Ferric Colossus is **built into the wall**
    beside it, not walking.
  - Never: a gondola, or a figure walking toward it.
- **`debris-field`**
  - Show: broken ring gates like teeth against the stars, and carriers hung with snagged wreckage (plates, cable, a
    lift cage, a lamp) glittering in sunlight. The tender small on its carrier, threading through.
  - Never: a boat, a porthole, or a crowd.
- **`rust-squall`**
  - Show: an orange-brown oxide cloud pouring along the carriers, lamps blurred to amber spots, cable whipping.
  - No people on open ground.
- **`sun-glare`**
  - Show: the sun low over the cloud horizon. Copper plating and carriers throw a blinding glare, and a small fire
    flickers behind the tender's window.
  - Never: a planet curve or a ring halo.
  - Now: a planet seen from orbit.
- **`copper-gate`**
  - Show: two gate wings the height of a spire top closed across every carrier. The crowned iron bulk of the Iron
    Regent is built into the gap, still and dusty. The tender is tiny before it.
  - Feel: solemn.
  - Never: a robed king statue.

### Stage II · The Glass Cathedral

- **`glass-bells`**
  - Show: violet glass bells in iron frames under the ring, frost on the glass. One is the size of a lift car. A
    carrier runs between them, and the tender's lamp makes a pane glow.
- **`cathedral-nave`**
  - Show: from a carrier at close range, a nave of violet glass panes and buttresses on dark brass ribs, light moving
    inside the glass like slow traffic. Part-glass carriers run along its flank.
  - Never: a white Earth church on clouds, or a crowd.
- **`choir-loft`**
  - Show: empty choir stalls, a lamp still on, bells in frames, a big clock with a winding key, tuning forks on a
    cloth, violet light through glass.
  - One figure at most, or none.
- **`echo-tender-lit`**
  - Show: a lamplighter-pattern tender on its carrier, cupola lit, **nobody** at the cab window, relighting a relay's
    fading guide lamp.
  - Feel: devotion, loneliness.
  - Never: a lantern-house with ghosts.
- **`glass-fog`**
  - Show: violet-white fog pouring off the Cathedral's flanks, ice-glass glitter, frosted carriers, lamps blurred to
    halos, the tender's beam a solid bar.
- **`ringing-panes`**
  - Show: a wall of panes with visible standing-wave patterns, frost shaking loose, sparks between frames.
  - Never: a crowd in a church.
- **`resonance`**
  - Show: the Cathedral's flank humming in tune, concentric rings of light pulsing through the glass, the tender's hull
    lit in the same rhythm.
  - Never: gondolas.
- **`hollow-choir-hall`**
  - Show: a vast dark hall ringed with porcelain masks and violet bells on chains, organ-pipe spines, faint voice-shapes
    inside the glass. A carrier runs in, and the tender is small at the entrance.
  - Never: an audience.
- **`bellmakers-bench`**
  - Show: violet glass tuning forks in a rack, a small bell on a stand, a kettle, a glass pendant hanging from a lamp,
    frost on the window.
  - Warm lamp, cold room. No figures.

### Stage III · The Blackout Heart

- **`ember-archive`**
  - Show: shelving stacks the size of spires receding into red haze, carriers running through the galleries, cooling
    fins glowing ember, sparks, and the black lattice creeping over the walls.
- **`dark-stretch`**
  - Show: almost total dark. The tender's own lamp lights a few metres of carrier, one faint guide lamp is far off, and
    the Heart's glow sits at the horizon.
  - Never: crowds with children.
- **`ember-draft`**
  - Show: heat pouring off the Heart's fins in rivers of sparks, the tender running through with its plating reflecting
    red.
  - Never: gondolas and a crowd.
- **`sealing-lattice`**
  - Show: black lattice struts growing along the carriers like iron frost, red seams lit, sealing drones on rotors
    building it. The way ahead narrows.
- **`checkpoint-gate`**
  - Show: a checkpoint built over the carriers: barred gates across the cables and a great red key-scanner eye on a
    boom.
  - Never: a festival arch with a crowd.
- **`wardens-post`**
  - Show: Harrow's post, now Bench Four: thick doors, an old logbook open on the desk, a kettle, warden armour plates
    on the wall, a dim amber lamp.
  - Heavy, quiet, kind.
- **`heart-shell`**
  - Show: concentric iris plates closed like a vast lock, ember red, with thin cracks where the gold of the queue shows
    through. Sealing drones on rotors hold station. The carriers end at it, and the tender is tiny.
  - Never: a single red eye.
  - Now: it reads as a giant eye. Keep it a lock.

---

### Proposed · two tender stories (L2)

Two new tender-gated events borrow existing art for now. When A has capacity, these ids can be added to
`docs/art-requests.md`; the event's `art` field then changes to the new id.

- **`events/glasswing-lamp-alignment`** (event `any-glasswing-pair`, Stage II; now uses `cathedral-nave`)
  - Show: seen from the Glasswing's cab, a big warning lamp on a long brass arm off a relay's flank. Its lens has
    slipped, so light sprays in the wrong directions, and the violet panes around it are lit unevenly. In the
    foreground: the two collimator lenses under the cupola, teal and amber, their caps hanging on chains, and a
    painted tool rack reading as lettering-free brush strokes.
  - Palette: violet and teal.
  - Feel: the job this car was built for.
- **`events/switchback-seventh-drone`** (event `any-switchback-seventh`, Stage I; now uses `spire-top`)
  - Show: under a relay, a work span nobody can walk. A small ivory inspection drone is wedged in a cable clamp, its
    lamp flickering. From above, the Switchback's retrieval crane lowers its hook on a long cable. The cloud sea is
    far below.
  - Palette: copper and verdigris with one amber lamp.
  - Feel: a long-owed homecoming.

## 7. Portraits

Portraits are head-and-shoulders, one subject each, lit by one small warm or teal light. Casting problems found in
the text review:

- `recruit-linefolk-b` is an older **man**, but several events cast older linefolk **women**. Some events have been
  retargeted.
  - New request: **`portraits/recruit-linefolk-c`**, an older woman (already added to art-requests.md).
- The `bellmaker` portrait is Marit Seldon, but it also stands in for four other bellmakers in Stage II, including a
  "very old" one.
  - New request: **`portraits/bellmaker-b`**, a very old bellmaker (already added).
  - The events can switch to it once it exists.
- `bench-keeper` (Hobb Tallis) also voices other old keepers (Old Dunstan, an unnamed bench radio voice). That is
  acceptable, but one more old bench-keeper face would help.
- `teal-jacket` stays faceless in shadow. Canon keeps the evening caller unseen and unconnected to the Ghost.

## 8. Props

- `lamp-tower` stands on a relay platform, not a "hull platform".
- `solar-array` stands on a spire-top mast.
- `faultline-gap` is two ends of ring structure with dangling cables, seen side-on, with no planet behind.
- Everything else is fine as written.

---

## 9. Overlays and sprites (A: `src/screens/backdrop.ts`; A/C: weapon sprites)

- **Black eclipse disk.** `backdrop.ts` `sunWeather()` draws `g.circle(x + 58, y - 4, 24, P.ink1, true)` and a steel
  line next to the sun (≈ lines 830–831, "occluding relay vane"). It reads as a black eclipse disk that belongs to no
  world object.
  - Remove it, or replace it with a recognisable silhouette crossing the sun's lower edge: a spire top, a relay mast
    or a sagging carrier.
  - Snap the rays and ghosts to the art pixel grid.
- **Overlays.** Parallax, weather and glare must depict world objects: sun, dust, fog, glass frost, ember sparks and
  snagged debris swinging on carriers. Debris must never tumble freely.
- **Payload Launcher sprite** (`weapons/payload-launcher`, seen on the hull and in the store). It reads as a rocket or
  missile with a red-orange warhead. Lore and flavor call it a pneumatic slug thrower: an iron tube, a round
  compressed-air tank and a drum of brass-and-teal charges. Make the payload a stubby brass shell with a teal tip,
  never a finned missile.

## 10. Hull check of the enemies (A4) against the lore

These points are world-sense only; A4 covers the art quality.

- Crawlers show a trolley or grip on top, because the game draws the carrier.
- Installations show their anchoring (gate frame, girder, foundry wall).
- Fliers show rotors.
- The **Iron Regent** is a gate machine built into a gate frame with two gate wings. It has no arms, gauntlets or
  legs. Its crown is its routing authority, so a crown shape must stay readable.
  - The script no longer mentions gauntlets.
  - specs.py's `readable-regent` prompt says "no triangular crown spikes". Keep some crown reading, or the lore's
    "crown dims" beat has nothing to point at.
- The **Scavenger Skiff** is people in a patched car. It must not look like a machine with a face.

---

## 11. What changed, and what A should change

### 11.1 L's edits in `art-src/subjects.py` (ids unchanged; `python3 -c "import specs"` loads 186 assets, the two new portrait requests included)

- `SHIPS["glasswing"]` and `SHIPS["switchback"]` are rewritten as lamplighter-pattern cars (§5). The "NOT a round lamp
  dome" instruction is gone.
- `SCENES["title"]` is rewritten (§1).
- `SCENES["relay-seven"]`: the KEEPER lamp is a small indicator lamp, "no flame, no candle".
- `BG["s1-e"]`: the sun sits behind a spire top, and there is no black relay disk.
- Legacy `EVENTS` (not read by specs.py): drifting lift car, echo tender "flying", bench "on the outer hull" and
  tumbling debris are made consistent. `PROPS` lamp-tower and solar-array; `PORTRAITS["scavenger"]` "cockpit" becomes
  "cab".
- `SCENES["e3"]`: seen from a spire top on the Line, not "from afar above the cloud-wrapped world … the curve of the
  world" (a planet seen from space).

### 11.2 L's edits in `docs/art-requests.md` (headings and ids unchanged; `parse_requests()` still returns 44 events)

- `tender-radio` and `refit-bay` are generic tenders now, not the Lamplighter.
- `sealed-relay`: the carrier is still whole.
- `carrier-cut`: a Wraith cuts a side span. It is not "the Seal".
- `copper-market`: the skiffs hang from carriers ("moored" is gone).
- `foundry-mouth`: the Colossus is built into the wall.
- `cold-berths`: the lamp is teal, not green.
- Two new portrait requests: `recruit-linefolk-c` and `bellmaker-b`.

### 11.3 Changes that belong to A (style heads in `art-src/specs.py`)

- **`EVENT_WORLD`** ends with *"Figures are small, seen from behind or in silhouette, with no close-up faces."* The model
  reads that as "add a row of silhouettes", which produced the foreground crowd in almost every event image. Proposed
  replacement: *"Most scenes have no people. When crew appear they are one to three small figures inside the car, at
  a hatch or on a gantry in masks, never a crowd, never in the foreground edge, never standing on the cloud sea. No
  close-up faces."* Also add to NEG for events: *"no crowd, no audience, no wheels, no tram, no boat, no gondola, no
  church."*
- **`ENV_HEAD`** says "monumental weathered orbital network infrastructure", and **`FIG_HEAD`** says "set on a ruined
  orbital relay megastructure". The Line is held up on spires, not in orbit. Proposed replacement: *"a ring of relay
  machinery held up on spires above a permanent cloud sea at the edge of space"*.
- **`ILL`** says "for a top-down space game". Proposed replacement: "for a side-view game".
- **`readable-regent`** prompt says "guarding an ancient orbital relay". Proposed replacement: "built into the Copper
  Gate between two gate wings".
- **`LAMPLIGHTER`** (legacy constant) begins "A small spaceship … two cable-thrust engine nacelles". If anything still
  reads it, replace it with `TENDER_V2`.
- **`copper-market`** override in `_events()`: an interior market hall. It is acceptable, but the art request and the
  codex describe the exterior container tower. Choose one and keep them consistent.
