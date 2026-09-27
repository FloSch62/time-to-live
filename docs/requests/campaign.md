# Requests from the campaign workstream

## 1. `PreviewResult.grip` (combat, small)

The relay view and the Yard hang the consist from a carrier drawn by the campaign. `drawShipPreview` returns the
bounding size and rooms; the campaign currently recomputes where the lead car's trolley grips the carrier by
mirroring `buildPlayerView` (`src/campaign/combat-adapter.ts previewGrip`). A `grip: { x, y }` (layout units, relative
to the preview's top-left) in `PreviewResult` / `shipPreviewSize` would remove that duplication.

## 2. Guardian beats in combat (FYI)

The campaign plays `GUARDIAN[id].approach` before the exit event and `GUARDIAN[id].defeat` after a boss victory.
`handshake`, `start`, `half` and `final` are left to the combat scene.

## 3. Salvage Arm (FYI)

Victory rewards come from `CombatResult.reward` as rolled by combat; the campaign applies them as they are (it does
not add the Salvage Arm bonus a second time).
