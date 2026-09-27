"""Silhouette-first equipment revision. Local Krea2, one candidate per design, reviewed before promotion."""
DESIGNS = {
 'packet-laser': 'a compact single-barrel signal carbine, a long narrow teal glass barrel inside a rectangular brass cooling jacket, small square rear power cell',
 'burst-emitter': 'a twin-barrel pulse turret, two long parallel brass barrels stacked vertically, separated by a clear dark gap, teal muzzle lenses, box-shaped ivory receiver',
 'triple-burst': 'a three-barrel pulse turret with THREE distinctly separated horizontal stepped barrels, one above another, rectangular ivory rear housing with three teal capacitor bars',
 'jumbo-frame': 'a heavy industrial bolt cannon, ONE thick long square barrel and a huge rectangular breech, a large orange cylindrical capacitor under the rear, ivory armored upper shell',
 'jumbo-frame-ii': 'a massive heavy siege accelerator, a very long rectangular reinforced brass barrel with THREE separated armor collars and an angular ivory recoil housing, large copper power cylinder below',
 'multicast-array': 'a rectangular bank of FIVE slim horizontal signal-laser barrels arranged as a stepped fan, teal glowing tips, ivory angular receiver, low wide armored base',
 'flood-cannon': 'a heavy belt-fed six-barrel rotary flak cannon with a very broad truncated steel muzzle, a large cylindrical ammunition drum hanging below the receiver, copper ammo belt curving from drum to barrel',
 'jammer': 'a thin electrical lance, a long sharp central steel electrode projecting far to the right, three violet induction rings spaced along its shaft, tiny rear battery block',
 'heartpulse-chain': 'a twin-pronged ion projector, two separated horizontal copper forks framing an open gap with a violet glass capacitor between them, tall ribbed coil at the rear',
 'cathedral-chime': 'a suspended tall violet crystalline resonator bell in a triangular steel A-frame, asymmetric long focusing horn pointing right below the bell, two smaller tuning tines',
 'fiber-lance': 'an extremely slender straight teal laser cutting rail, long exposed parallel copper rails, three tiny square glass collimators along the rail, angular low-profile ivory power pack',
 'trunk-lance': 'a huge angular industrial beam cutter, a very long tapered ivory armored rail with open teal energy channel down its center, large split rectangular muzzle, heavy copper heat sink hanging below',
 'payload-launcher': 'a squat single open-ended rectangular launch tube aimed right, ONE visible orange-tipped cylindrical missile resting in the tube, ivory blast shield above and dark iron loading mechanism below',
 'breach-spike': 'a long exposed steel harpoon spike on a skeletal copper crossbow-like launch rail, a large rack and pinion piston, black angular recoil stock, restrained amber status lights',
 'scatter-shot': 'a short wide-mouthed industrial scrap mortar, broad flared hexagonal barrel aimed right and tilted slightly upward, bulky riveted iron hopper above the rear, exposed copper pressure tank below',
 'thermite-payload': 'a wide twin-chamber scatter launcher with TWO short broad steel launch tubes one above another, box magazine projecting downward from the center, ivory blast baffles and red copper shells',
}

def install(assets, pix):
 for key, subject in DESIGNS.items():
  k='weapons/'+key
  if k not in assets: continue
  assets[k]['versions']['readable']={
   'prompt': f'{pix} Single detailed engineering weapon sprite, orthographic SIDE ELEVATION, facing RIGHT. {subject}. Bolted onto a low rectangular mechanical rail clamp, centered on an absolutely flat solid navy background #0c0f1c. Tarnished brass, chipped ivory enamel, blue-black steel, restrained colored glass highlights. Strong recognisable asymmetrical silhouette, broad readable material planes, crisp machined edges, small highlights, consistent 32-bit pixel art. The entire machine is visible, wide horizontal composition. No circular shield, no disk-shaped device, no compass, no astrolabe, no decorative filigree, no medieval ornament, no people, no scenery, no text, no grid, no frame. Weapon is at rest, no projectiles or muzzle flashes.',
   'gen': (960, 512), 'n':1,
  }
