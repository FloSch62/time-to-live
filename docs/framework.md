# Framework guide (src/core — owned by the lead)

Run: `npm run dev` → http://127.0.0.1:5181 (the lead keeps a dev server on 5181; start your own on another port if
you need one, e.g. `npx vite --port 5182`). Type-check: `npx tsc --noEmit`. Tests: `npm test`.
Screenshots: `node tools/shot.mjs "/?dev=kit" tools/shots/<name>.png 2000 1920 1080 '[{"click":[x,y]},{"wait":300}]'`
(actions use **logical** coordinates; see the file header). Always look at your screens with the Read tool.

## App, scenes, loop
- `App` (`core/scene.ts`): `{ screen, input, g, ui, scenes, time }`; `getApp()` from `core/app.ts` anywhere.
- `Scene`: `{ overlay?, enter?(app), exit?(app), update?(dt, app), draw(g, app) }`. `update` gets a clamped variable
  dt — run fixed-step simulations inside with an accumulator. `draw` draws AND handles immediate-mode UI.
- `app.scenes.push(s)`, `.pop()`, `.remove(s)`, `.switchTo(s, fade=true)` (fade to black and replace the stack).
  An `overlay: true` scene draws above the scene below it; only the top scene gets input.
- Dev entries: create `src/<your-folder>/dev.ts` exporting `dev: Record<string, DevFactory>`; open `/?dev=<name>`.

## Drawing (`core/gfx.ts`, `Gfx`) — logical 960×540, integer pixels, no smoothing
- `g.rect/box/hline/vline/line/circle/ellipse`, `g.image(img, x, y, scale)` (backgrounds: scale 2),
  `g.sub(img, sx, sy, sw, sh, x, y, flipX)`, `g.clip(x,y,w,h, fn)`, `g.alpha(a, fn)`, `g.dim(a)`.
- Atlases (`public/sprites/<name>.json/png`, format in the sprites brief): `g.sprite(atlas, frame, x, y, {flipX, alpha,
  image, noAnchor})` draws at the frame's anchor and returns false if missing (draw a fallback then);
  `g.anim(atlas, anim, t, x, y)`, `g.animFrame(...)`, `g.animDone(...)`.
- `g.panel(x, y, w, h, variant)` 9-slice from the `ui` atlas (`panel`, `panel-hi`, `panel-danger`, `panel-glass`,
  `panel-dark`, `tooltip`, `dialog`, `button-*`) with a procedural fallback.
- `silhouette(img, key, color)` (hit flashes), `paletteSwap(img, key, map)` (crew variants), both cached.
- Art: `art("ships/lamplighter")` returns the image or null (starts loading); `preloadArt([...])`.

## Text (`core/font.ts`)
- Fonts: `body` (Jersey 10, cap 10, line 17), `head` (Jersey 15, line 24), `big` (Jersey 20, line 31), `label`
  (Silkscreen caps, line 11), `labelb` (bold), `small` (Tiny5, line 9).
- `g.text(str, x, yTop, { font, color, align, shadow, width (wrap), maxLines, reveal (0..1 typewriter), alpha })`
  returns the block height. `measure(str, font)`, `wrap(str, width, font)`, `lineHeight(font)`.
- Markup: `{teal}…{/}`, any palette name `{ember2}`, hex `{#ffb347}`, aliases (teal amber violet ember red brass gold
  ivory white verd green copper steel dim faint good bad warn blue ion title), `{icon:<icons-frame>}`, `{br}`, `\n`.

## UI (`core/ui.ts`, `app.ui`)
- `ui.button(id, x, y, w, h, label, { variant: normal|blue|danger|ghost, disabled, hotkey: "KeyJ", showKey, icon,
  tooltip, font, active, sound })` → clicked. `ui.iconButton(id, x, y, size, icon, opts)`.
- `ui.area(id, x, y, w, h, { tooltip, cursor, button })` invisible click region; `ui.hot(id, …)` hover tracking;
  `ui.hover(x,y,w,h)`; `ui.setTooltip(text, width)`; `ui.cursor = "arrow"|"pointer"|"target"|"crew-move"|"blocked"|"grab"`.
- `ui.checkbox`, `ui.slider` (0..1), `ui.tabs`, `ui.scrollArea(id, x, y, w, h, contentH, draw(offset))`,
  `ui.textField`, `ui.keycap(code, x, y)`, `ui.segBar`, `ui.bar`.
- Widgets consume clicks (`input.consume()`); world clicks should check `input.pressed()` after UI calls.

## Input (`app.input`)
`x, y, mx, my, inside, wheel, typed`, `isDown(b)`, `pressed(b)`, `released(b)`, `key(code)`, `keyPressed(code)`,
`eatKey(code)`, `inRect(...)`, `shift`, `ctrl`, `doubleClick`. Codes are `KeyboardEvent.code` (`Space`, `KeyA`, `Digit1`,
`Escape`, `F1`…). All browser keys are swallowed except F5/F12/ctrl+R; F11 / Alt+Enter toggles fullscreen globally.

## Audio (`core/audio.ts`)
- `music.play(id, "explore"|"battle")` crossfades themes; `music.setLayer("battle")` crossfades the synced
  explore/battle layers of the current theme (FTL). `music.stop()`.
- `sfx.play(id, { volume, pan, rate, throttle })`, `sfx.loop(id)` → `{ stop(), setVolume(v) }`.
- Metadata from `public/audio/music.json` and `sfx.json` (audio workstream). Missing audio is silent.

## Storage (`core/save.ts`)
`saveJson(key, v)`, `loadSaved<T>(key)`, `removeSaved(key)`, `settings` + `saveSettings()`.

## Misc
- `core/rng.ts` `Rng` (seeded sfc32: `next int range chance pick weighted shuffle fork state`), `hashString`.
- `core/palette.ts` `P` (every palette colour by name), `C` (semantic UI colours), `STAGE_TINT`.
- Pure logic (combat sim, map generation, event runtime) must not import DOM modules so `node --test` can run it
  (`node --experimental-strip-types`: use explicit `.ts` extensions in relative imports inside pure modules, and
  `import type` for types).

## HD (contract ★ v3) — read this
- The backing canvas is 1920×1080 with a 2× transform; you keep drawing in 960×540 layout units.
- `public/art/**` images are HD (density 2): `g.image(img, x, y)` draws them at half their pixel size (1:1 physical).
  Don't pass `scale = 2` for backgrounds any more: use `g.cover(img)` for full-screen art of any resolution.
- `layoutSize(img)`, `density(img)`, `markHD(canvas)` in `core/assets.ts`; `snap(v, 2)` in `core/gfx.ts`.
- Atlases with `"scale": 2` draw at half size automatically (`g.sprite`, `g.anim`, `g.panel`, inline `{icon:…}`,
  `ui.iconButton`); use `g.frameSize(atlas, frame)` for layout sizes instead of raw `frame.w/h`.
- JSON geometry for HD art (grid offsets, mounts, pivots, lens points) is in image pixels: divide by 2 for layout.
