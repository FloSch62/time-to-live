# Third-party notices

Project code and project-created assets are licensed under GNU GPL version 3 only (`LICENSE`) with the section 7(b)
attribution terms in `ATTRIBUTION.md`. The following separately licensed materials keep their original terms.

## Inspiration

TIME TO LIVE is an independent fan game inspired by the design of *FTL: Faster Than Light* (Subset Games) and set in
the FAULTLINE / Containerlab universe. No FTL art, music, text, data or code is included.

`public/containerlab-mark.svg` is the Containerlab mark from the Containerlab app repository (MIT License,
copyright (c) 2026 SRL Labs); the licence text is in `public/containerlab-mark.LICENSE.txt`.

## Typography

Jersey 10, Jersey 15, Jersey 20 (Sarah Cadigan-Fried), Silkscreen (Jason Kottke) and Tiny5 (Stefie Justprince) are
distributed under the SIL Open Font License 1.1. They were obtained from the Google Fonts repository and rasterised
at their native pixel sizes into bitmap atlases by `tools/build_fonts.py`; no glyphs were redrawn. Licence texts are
in `public/fonts/*-OFL.txt`.

## Artwork

Paintings, ship hulls, backdrops, portraits and event scenes in `public/art/` were generated locally with Krea 2 Turbo
(ComfyUI) and converted to the game's pixel-art palette by `tools/pixelize.py`. Prompts, seeds and settings are in
`art-src/manifest.json`. Krea 2 is provided under the Krea 2 Community License, preserved in
`public/art/KREA-2-COMMUNITY-LICENSE.txt`; its commercial-use terms for the model and its outputs (including a
company-wide annual revenue threshold below USD 1 million) remain applicable to Krea-generated artwork. Sprites in
`public/sprites/` are hand-authored in code by `tools/sprites/`.

## Music and sound

The music was generated locally with `m-a-p/YuE2-3B` and the `m-a-p/YuE2-Vae` decoder from original instrumental
score plans (see `audio-src/README.md`); YuE inference code is Apache-2.0 and the model-weight licence is preserved in
`audio-src/licenses/`. Sound effects were generated locally with Stability AI's Stable Audio 3 Small SFX model under
the Stability AI Community License, layered and mastered by the scripts in `audio-src/`. Model weights are not
distributed with the game.

## Runtime and development

Vite, TypeScript and Playwright are development dependencies with their own licence files; versions are recorded in
`package-lock.json`. The game has no runtime library dependencies.
