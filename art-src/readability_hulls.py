"""Hostile mobile silhouettes: readable armor masses, exposed suspension, faction hardware."""
HULLS = ['packet-leech','cable-wraith','scrap-foreman','scavenger-skiff','prism-widow','wire-weaver','coil-serpent','echo-tender','null-marshal','grave-reaver','demolition-engine','quarantine-drone']
def install(assets, subjects, stages, materials, side, pix):
 for key in HULLS:
  entry=assets['ships/'+key]
  base=dict(entry['versions']['h'])
  base['prompt']=(f'{pix} {side} {subjects[key]} {materials[stages[key]]} '
   'A beautiful formidable industrial enemy vessel, clear armored silhouette and physically connected components. '
   'Broad segmented steel armor plates with crisp beveled edges, exposed copper hydraulic pistons and heavy structural ribs. '
   'Strong recognizable silhouette, realistic consistent engineering scale. Clear upper drive trolley and lower machinery, '
   'large three-tone material planes, precise edge highlights, visible dark gaps separating mechanical assemblies. '
   'Keep the central rectangular passenger hull solid and unobstructed for the game cutaway overlay. '
   'All appendages are rigidly connected, no floating parts. No exterior checkerboard or random spots. '
   'No people, no text, no logos, no numbers, no labels, no stars, no background scenery, no soft blurry painterly rendering. '
   'Not a toy, no cartoon face, no medieval ornament.')
  base['denoise']=0.85
  entry['versions']['readable']=base
