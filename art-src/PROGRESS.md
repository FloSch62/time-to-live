# Art progress log (TIME TO LIVE)

Newest entry on top. Finals live in `public/art/`, provenance in `art-src/manifest.json`, recipe in `art-src/README.md`.

## 2026-09-27 03:14 · alpha delivery complete

- All 146 primary assets delivered: 25 hulls, nine cars, 17 portraits, 16 weapons, five drones, 44 event scenes,
  12 backgrounds, six endings, and 12 props. All required dimensions and weapon/drone HUD icons pass the audit.
- Reviewed the complete category sheets and the three guardians in the running game. Enemy panes fit the actual
  hull bounds and retain independent zoom/pan; rear and keel attachments fit the yard preview.
- Corrected six recruit portraits for single-subject composition and mechanical Rigger identities, the Copper
  Market for an industrial interior, and the cloud bank for natural clouds. Exact candidates and notes are in
  the manifest. The final cloud candidate is `cloud-bank-h-2026092702.png`.
- Backgrounds use 2560×1440 Krea renders delivered at 1920×1080. Geometry and palette recipes in the manifest
  supersede the exploratory sizes below. Hand-authored animation atlases supply 1,726 frames in 310 animations.
- Palette matching now processes bounded chunks instead of allocating a full image-by-palette array. Generation
  and delivery run in separate memory-limited services. The completed generator loop has been stopped.

## 2026-09-27 00:45 · DIRECTION v3 (HD hi-bit) and v4 (TILE 72, lead car 12x4) absorbed

- All finals are now HD images (density 2). Hull geometry: lead car 1008x440 (grid 12x4), rear cars 344x448 (4x4),
  keel cars 480x248 (6x2), hostiles remapped to TILE 72 grids (8-wide max for non-bosses), guardians up to 840x688.
  All 34 silhouettes regenerated; consist alignment re-checked by compositing.
- Pixelizer: ramp-extended palette (master + 2 in-between steps per ramp pair), 64-colour cap, 2x downsample from
  ~2x renders. Backdrops render at 3840x2176 (about 2 min each).
- `bg/s1-a.png` (480x270, v2 era) is superseded and will be replaced at 1920x1080 this round.
- Queued: lead car v4 x6, HD portrait/event style tests, Stage I hostiles x3, weapons + drones x3, Stage I
  backdrops + title at 3840.

## 2026-09-27 00:00 · direction v2 / v2.1 / v2.2 / rule 8 absorbed (hold 2 done, hold 3 queued)

- Top-down hulls dropped. All 25 vessel silhouettes rebuilt as side-view cutaways on TILE 32 with the fixed v2 grids
  and mobility classes (crawlers: trolley + `cable` point; installations: gantry/gate frame/chains; fliers: rotors).
  Lead car is 10x3 (384x200) with rear gangway coupler + keel lugs; 5 rear cars (5x3, 184x184) and 4 keel cars (6x2,
  224x120) share its body and deck alignment (checked by compositing a consist).
- Livery lamps: lamp regions are tracked as a mask per car; the pixelizer maps everything else without the amber
  ramp and paints lit lamp pixels only with `#fff1c2 #ffd98a #ffb347 #e8822a` (listed as `lampColors`).
- Recipes found: hulls = clean hard-edged illustration prompt + programmatic init/mask, denoise 0.8, 4x, median
  pixelize (0.86+ drops silhouette parts). Events = pixel-art prompt at 8x (2560x1280): Krea locks its pseudo-pixels
  onto the 8 px latent grid, so snapped sampling gives true 1:1 pixel art. Portraits = pixel-art prompt at 768.
- Prompts now carry rule 8 (serious, not cartoon) and the writing workstream's art-requests ids (44 events, 17
  portraits incl. moss/ennis/recruit-*).
- Queued: lead car x6, backdrop tests (rich ILL, hybrid img2img, 8x pixel art), weapon style test.

## 2026-09-26 23:30 · hold 1 (style exploration, 10 min, yielded to audio)

- Pipeline up: `art-src/{gen,worker}.py`, `serve.sh`/`loop.sh` (port 8192, own comfy in/out, flock on the shared
  GPU lock, yields after 10 min when another job waits), `tools/pixelize.py`, `tools/art/{hulls,recipes,finalize}.py`.
- All 25 hull silhouettes (player, 22 enemies, gate-warden, sealing-drone) built programmatically with the lead's
  fixed room grids; grid coverage and canvas limits are asserted.
- Findings so far: Krea draws convincing top-down pixel ships; the "clean hard-edged illustration" prompt pixelizes
  into crisp 1:1 pixel art at 4x, while explicit "pixel art" prompts put pseudo-pixels on the 8 px latent grid
  (= 2x2 chunky pixels at 4x). Painterly (FAULTLINE oil) renders pixelize into a posterized look: rejected.
  Master palette has no skin ramp: portraits need a few recorded extra colours.
- No finals yet. Next: denoise sweep for silhouette control, 8x-native pixel-art tests, then the Lamplighter.
