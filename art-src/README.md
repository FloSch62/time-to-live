# TIME TO LIVE art pipeline (Krea 2 → pixel art)

Owner: art workstream. Everything here is reproducible: prompts + seeds + settings (Krea 2 Turbo through ComfyUI)
and the deterministic pixelizer parameters are recorded per final in `manifest.json`.

## Layout

| Path | What |
|---|---|
| `specs.py`, `subjects.py` | every prompt: style heads (locked recipe) × subject briefs; `resolve("group/id:version@N")` |
| `gen.py` | ComfyUI client (port **8192**): Krea 2 Turbo fp8, qwen3vl text encoder (type krea2), qwen image VAE, optional reference image + `krea2_style_reference` LoRA, optional init + mask (img2img / inpaint), 8 steps euler/simple cfg 1 |
| `serve.sh` / `worker.py` / `loop.sh` / `q.sh` | GPU holds: `loop.sh` waits on the shared lock (`flock faultline/.work/locks/gpu.lock`), `serve.sh` starts ComfyUI with our own `comfy/input` + `comfy/output`, the worker runs queued specs and yields after 10 min when another job waits (hard stop ~17 min), ComfyUI is stopped before the lock is released |
| `init/` | programmatic hull silhouettes (`tools/art/hulls.py`): `<id>-init.png` colour-blocked init at 4x, `<id>-mask.png` repaint mask, `<id>-sil.png` exact alpha at final size, `<id>.json` grid/mounts/glow |
| `cand/<group>/<id>/` | every candidate PNG + JSON record (prompt, seed, settings, full ComfyUI workflow) |
| `sheets/` | contact sheets used for picks |
| `refs/` | locked style anchors (nearest-upscaled pixel finals) |
| `manifest.json` | group → id → provenance record of each final |
| `../tools/pixelize.py` | deterministic pixelizer (see its docstring) |
| `../tools/art/finalize.py` | candidate → `public/art/...` + manifest (+ `ships.json`) |
| `study.py`, `study.json` | DIRECTION v5 style study: prompts (`study/<cr\|gc\|cm>:<version>`) and the compared rows |
| `../tools/art/pixelscene.py` | DIRECTION v5 scene pixelizer: low-res grid, per-scene palette, banded sky, orphan cleanup |
| `../tools/art/style_study.py` | processes `study.json`, stages `public/art/_study/`, shoots relay/combat, writes the sheets |

Queue work: `bash art-src/q.sh NAME ships/lamplighter:a@3 ...`; run `bash art-src/loop.sh` in the background.
Finalize: `art-src/.venv/bin/python tools/art/finalize.py ships/lamplighter art-src/cand/ships/lamplighter/<file>.png`.

## DIRECTION v5: pixel-art scenes (A1 style study, 27 Sep 2026)

Scope: every *scene* (regional backgrounds `bg/s*`, title, Relay Seven, line-quiet, endings) and every lore
illustration (`events/*`). Sprites (hulls, cars, weapons, drones, room props, portraits) keep the DIRECTION v4 hi-bit
recipe below. The v4 scene recipe (clean illustration at 2560x1440, 2x2 cells to 1920x1080) is retired: it reads as a
posterized oil painting (see `tools/shots/art/style-study/*.png`, row R0).

**Production state (A3, 27 Sep 2026; supersedes the render sizes below).** The user capped every Krea render at
2560x1440 and at 2 candidates per item (`MAX_CANDIDATES` in `specs.py`). Scenes use the "fine hi-bit pixel" head
(`art-src/v5.py` `PIX_FINE`) at 2560x1440 → 640x360 with `pixelscene.py --preset pix8`. That preset adds a night gamma,
an accent-sparing grade and the far-plane haze clamp. Finals are written by `tools/art/finalize_v5.py`; region sheets
are in `tools/shots/art/v5/`.

What made each region work:
- The region identity goes first in the prompt (`v5.py` `IDENTITY`, `v5g`/`v5h`).
- Towers are named as machinery ("lattice relay towers", never "spires", which draws churches).
- Carriers are described as shallow sagging cables.

Events are 2560x1280 → 320x160, drawn 2x.
- Default to no people; adults only where the brief needs a person (`v5c`).
- Cars are described by shape, never as "car/tender/trolley", because those draw trams (`v5c`).
- Tender subjects: Krea kept drawing trams even with our hull in the init (plain or masked). The working method renders
  the scene without vehicles (`v5s`), then `finalize_v5.py composite_tender` lays our real hull + drive trolley +
  carrier over it (`tools/art/event_inits.py`).

The title leaves the car to the game: `title.ts` draws the real Lamplighter on its carrier over the art.
In combat, `backdrop.ts` `COMBAT_SAFE` keeps refuges and landmark-heavy paintings out of fights.

The A2 hulls and drive trolleys have their own tools, documented in their headers:
- `tools/art/trolley.py`: a sketch-guided carriage in three kinds (standard/heavy/car), BACK/FRONT layers, 4 sheave
  frames.
- `tools/art/hull_v5.py`: family inits resampled from the Lamplighter, keyed Krea fittings, one repaint, polish.
- `tools/art/mounts_v5.py` and `tools/art/cars_v5.py`: hardpoint plates, keepClear, weaponEnvelope.

**Look.** Authored low-resolution pixel art: deliberate clusters, 1-px lattices and cables, flat colour bands in the
sky with ordered dither only in the seam between two bands, no speckle in flat areas, 32-40 colours per scene in
hue-shifted ramps (shadows lean indigo, lights amber), 3-4 depth planes by value. Dark indigo edge-of-space night; the
warm light is a thin copper/violet/ember horizon line and small lamps. The band the vessels cover (20-65 % of the
height) stays dark, quiet and low in contrast.

**Grid (lead's decision, 27 Sep).** Scenes are **640x360 art pixels, drawn 3x** (3 backing pixels per art pixel at
1080p). Events are **320x160 art pixels, drawn 2x** in the 640x320 frame (row cm-r3); figures keep faces, hands and
coats readable. (213x106 drawn 3x, rendered at 1712x848, rows cm-r3m*, would share the scene pixel exactly but loses
figure detail.) 480x270 (4x) was rejected
in game: a 4-px art pixel is four times the hull sprites' pixel, and container stacks, cranes and windows turn into
crude mosaics beside the hi-bit hulls; at 3x the lattices and cables stay single-pixel lines.

**Krea half (the key finding).** Krea 2 draws real pixel art when asked for it, and its pseudo-pixel sits on the
**8-px latent cell**. So the render is made at **8x the art grid** and one Krea pixel becomes exactly one art pixel:
5120x2880 for 640x360 scenes (315-350 s on the 4080 SUPER, 11.7 GB VRAM) and 2560x1280 for 320x160 events (about
36 s).
Settings as v4 (Krea 2 Turbo fp8, 8 steps euler/simple, cfg 1, no LoRA, no reference). At other sizes the pixel is
not reliably 8 px (a 1280x640 event came out with soft ~4-px pixels), so do not deviate from 8x. The flat "cel/graphic"
prompt (R1/R2) gives vector-poster shapes; pixelized they are legible from afar but at 300 % they show two-shade edge
halos, Kuwahara blotches and posterized texture, i.e. a filtered illustration, not pixel art.

Scene prompt = `PIX_SCENE` + `NIGHT3` + `LAYOUT3` + `CARRIERS` + subject brief + `STUDY_NEG` (`art-src/study.py`,
version `pix8c`; events: `PIX_EVENT` + brief + `STUDY_NEG`, version `pix8`). Subject briefs come from
`docs/art-briefs.md` (agent L's lore-checked briefs):
- `PIX_SCENE` names the quality bar (Eastward, The Last Night, Sea of Stars, Blasphemous), the strict pixel grid,
  ~30 colours in hue-shifted ramps, four depth planes with atmospheric perspective, banded sky, no noise/blur.
- `NIGHT3` keeps the upper two thirds deep indigo-black and the light a thin horizon line in the region's colour
  (the dusk wording made the vessel band L 0.43, far brighter than the hull wants; a copper horizon written into the
  shared head leaked into the Glass Cathedral, so colours belong in the subject brief).
- `LAYOUT3` puts the nearest landmarks in the outer thirds, the centre open and the horizon at about two thirds of
  the height (at three quarters it hides behind the relay/combat panels).
- `CARRIERS` is required: without it Krea drops the carrier cables (both `pix8n` seeds), which breaks the world.
- Name materials the lore way in the brief: glass bells are "translucent violet glass (not metal)", spires are
  "relay spires of machinery (antenna masts and optical relay housings, not churches)".
- `STUDY_NEG` adds no aircraft/birds/planets/moon/water/boats to the usual no-text/no-medieval negatives.

**Post-process half** (`tools/art/pixelscene.py --preset pix8`, deterministic):
1. align 8x8 cells to Krea's pixel lattice (`grid_phase`), OKLab median of each cell's inner 4x4;
2. night tone + hue-shift grade (gamma 1.15 on L puts the vessel band at L 0.21-0.27; grade 0.4: dark values toward
   indigo, light values toward amber; chroma 0.92);
3. find the smooth regions (sky, fog) by gradient, absorbing small holes that barely differ from the sky around
   them (stray dither dots); lift stars out; rebuild each connected region as a row-wise median field (keeps the
   horizontal band structure, drops Krea's random and moire dither), softened (`soft_y` 1.6);
4. per-scene palette (40 colours max): 10 levels for the sky/fog (one per band, so no band sits between two colours
   and turns into a wide checkerboard), k-means in OKLab for the detail, 4 accent clusters for lamps; centroids within
   0.025 of the master ramps (+2 in-between steps) snap onto them;
5. sky/fog: clean bands, Bayer 4x4 dither only in a seam 0.35 of a step wide between neighbouring band colours;
6. detail: nearest colour, then flat-area orphan cleanup (clusters of <= 2 px whose 8-ring is >= 60 % one colour and
   within 0.12 L of it); stars back as single pixels; optional R4 planes (below). A "thin line" protection for faint
   structures inside the sky exists (`line_k`) but is off: it kept moire blobs on band seams as rows of tick marks.
Events use `--preset event` (clean bands without seams, 36 colours, 5 accents).

**In game** (`src/core/gfx.ts` `pixelScene`, `src/screens/backdrop.ts`): any art image <= 960 px wide is a pixel scene
and is drawn at the smallest integer backing scale that covers the screen, smoothing off, larger images centred
(overscan); the slow drift and any offset snap to whole art pixels and an exposed edge repeats the border pixels;
`twinkle` stars sit on the art grid, one art pixel each. Dev override for reviews:
`/?dev=relay&bg=_study/<id>&bgfx=0` (`bgfx=0` hides the procedural overlays, `layers=1` draws R4 planes).

**R4 parallax planes** (`--params '{"layers":true}'`): `<id>-sky.png` (the open sky with its field continued behind
everything) and `<id>-scene.png` (alpha, everything else); the scene plane drifts over the fixed sky in whole art
pixels without holes (`tools/shots/art/style-study/r4-parallax.png`). A colour-based far/near split of the objects
was tried and dropped (haze-lit far spires are brighter than the sky, flat silhouette interiors look like sky); true
multi-plane parallax needs separately rendered planes.

**Acceptance per scene** (`python tools/art/style_study.py` prints them into the sheets): vessel band (20-65 %)
mean L 0.20-0.28, L spread <= 0.28, p95 chroma <= 0.07 (the Lamplighter hull is L 0.58 / spread 0.67 / C95 0.11);
<= 40 colours; orphans (isolated pixels in flat surroundings, seams excluded) in the low hundreds, against about
6,000 on the shipped paintings' 2x2 cells; judged at 300 % and in game behind the Lamplighter (relay and combat) at
1920x1080 and 1366x768.

Reproduce the study: prompts `art-src/study.py` (`study/<cr|gc|cm>:<cel|pix8|pix8w|pix8n|pix8c|pix8s|pix8m>`),
rows `art-src/study.json`, `python tools/art/style_study.py` -> `art-src/cand/study/_final/`,
`public/art/_study/` (review copies only, never shipped) and `tools/shots/art/style-study/`.

## The recipe (DIRECTION v4: HD hi-bit, side view, TILE 72 image px)

**Look** (contract §5, DIRECTION v2-v4, rule 8): FAULTLINE's world as serious, FTL-grade *hi-bit* pixel art at
1080p-native density. Side view. Tarnished brass, chipped ivory, verdigris copper, dark gunmetal; colour only from
small lit accents (teal signals, amber lamps, violet glass, ember warnings). Every prompt carries the no-text /
no-medieval / not-cartoon negatives.

**Krea mode**: a *clean hard-edged illustration* prompt (`ILL2` for sprites, `ENV_ILL` for scenes, `SCENE_ILL` for
events, `PORTRAIT_ILL` for portraits) rendered at ~2x the final image size (4x for small objects), 8 steps
euler/simple, cfg 1, Krea 2 Turbo fp8, no style LoRA. The model paints clean flat-shaded forms with hard edges; the
pixelizer's per-cell OKLab median turns each 2x2 block into one clean pixel and the ramp palette gives the shading
bands.

History of the exploration (evidence in `sheets/` and `cand/explore/`): pixel-art prompts put Krea's pseudo-pixels
on its 8 px latent grid (so they are only usable at 8x the final size; fine for 320x160 sprites, far too coarse for
HD); FAULTLINE's painterly oil recipe pixelizes into a posterized painting; the style-reference LoRA with the Switch
card makes grimy noisy clusters; top-down ships were dropped by DIRECTION v2.

**Vessels** (`tools/art/hulls.py`): every hull is authored as simple shapes in layout units: the room grid rectangle
(TILE 36 layout = 72 image px) + class anchoring (trolley and grip for crawlers and the player's cars,
gantry/gate/chains for installations, rotors for fliers). Hostiles first drawn for the v2 grid are moved onto their
v4 grid by a grid-anchored remap (interior stretched to the new grid, appendages keep their offsets, scaled to fit the
panel). From that we render a top-lit colour-blocked init (2x the image), a feathered repaint mask and the exact HD
silhouette. Krea repaints inside the mask at **denoise 0.8** (0.86+ drops silhouette parts, 0.72 keeps the blocky
init); "keep" regions (nose lamp, cab window, couplers, keel lugs) get a partial mask value (0.5-0.8) so Krea keeps
those init shapes. Alpha = the silhouette minus backdrop-coloured pixels outside the room grid; the grid rectangle is
always opaque. Selective 1-px dark outline. Player cars: lamp regions are a separate mask; the body is mapped without
the amber ramp and lit lamp pixels use only the four `lampColors` (livery recolour).

Glasswing and Switchback have native, different occupied grids: **10×4** and **13×5** at TILE 36; Lamplighter
remains 12×4. Glasswing is the narrower optical survey body with paired external collimators and a roof prism.
Switchback is the taller retrieval workshop with crane, drone saddles, lower retrieval shutters and an open cable
yoke. Rear and keel coupling metadata follows the actual room interfaces. Their exact full grid rectangles remain
opaque, including when the roof or exterior equipment is transparent. The rejected Switchback h4/h5 candidates
invented an extra roof cabin; h6 introduced the explicit open yoke, and h7 fully repaints that guide for finished
metal detail. Prompts, seeds, ComfyUI workflows, masks and final metadata remain in the production paths.

**Regional landmarks**: every region now has five distinct paintings (`s1-a` through `s3-e`). The new d/e pair is
Copper's switchback canyon and sunward drydock; Glass's mirror reservoir and quiet observatory; Heart's radiator
graveyard and maintenance sanctuary. The first radiator take was rejected for flat fan-like silhouettes; h2 adds
articulated radiator towers, coolant slats, access ladders and catwalks. `stageBg` selects all five by stable relay
identity, with e used for the regional refuge and the sunward painting used for Copper sun glare.

`drawBackdrop` draws loaded art with bounded distant parallax, region machinery, landmark-specific moving equipment
and the back weather layer. `drawForeground` adds nearer weather above ships and below HUD. Sun glare includes an
actual disk and eclipse, corona, rays, horizontal streaks and lens flare aligned with the sunward painting. Debris,
rust, glass fog, ringing panes, resonance, embers, darkness and sealing lattice have separate visual forms and depth.
Reduced motion keeps those silhouettes but freezes every weather and landmark layer.

**Pixelizer** (`tools/pixelize.py`, deterministic): fit → optional pre-median (weathering speckle → clean blotches)
→ per-cell OKLab median → palette = master ramps + 2 OKLab in-between steps per neighbouring ramp pair (130
candidates) + recorded k-means extras for off-ramp gradients (sky, clouds, skin) → rare-colour pruning → cap at 64
colours per asset → low-contrast orphan cleanup (stars and lamps survive) → alpha → outline.

**Objects** (`tools/art/objects.py`): weapons/drones/props are painted alone on a flat backdrop, auto-cropped to the
target aspect, pixelized with border-flood alpha; weapon pivot/muzzle/lens and drone rotor/lens points are derived
from the final alpha and lit-glass colours; weapon and drone icons (64x64) come from the same source crop.


## Bounded continuation workflow

The current production recipe uses 2560×1440 scene renders for 1920×1080 backgrounds/endings, 1280×640 event renders for 640×320 illustrations, and shared hull/portrait style anchors. Older exploratory candidates remain in `cand/` for provenance. `tools/art/deliver.py` selects current-size candidates and preserves delivered finals.

`serve.sh` runs in a user systemd unit with a 15 GiB RAM limit and 256 MiB swap limit. Keep the shared GPU lock for every model hold. Palette matching runs in bounded 65,536-pixel chunks; delivery is separately capped at 1 GiB by `tools/runtime/deliver-art.sh`. Do not start another loop while the inherited loop is running.

Validation: `python3 tools/art/audit.py` checks every specification and icon; `python3 tools/art/sheet.py ships portraits weapons events ending` writes review sheets in `tools/shots/art/`.
With Vite running, `node tools/art/browser-qa.mjs` verifies both new hulls through the runtime adapters, full room-grid
coverage, livery loading, loaded regional art motion and visible state changes, including pixel-stable reduced motion
at 1366×768 and 1920×1080. It saves new-voyage screenshots and its result in `tools/shots/art/`.

`node tools/art/atmosphere-qa.mjs` validates all 15 shipped paintings, stable landmark selection, both weather layers
for all nine hazards and pixel-stable reduced motion. `python tools/art/sheet.py regions` makes one review row per
region, five paintings in each row, at `tools/shots/art/regions.png`. Review the actual combat/relay screenshots too:
asset loading and pixel differences establish wiring, not visual quality.
