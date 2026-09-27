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

Queue work: `bash art-src/q.sh NAME ships/lamplighter:a@3 ...`; run `bash art-src/loop.sh` in the background.
Finalize: `art-src/.venv/bin/python tools/art/finalize.py ships/lamplighter art-src/cand/ships/lamplighter/<file>.png`.

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
