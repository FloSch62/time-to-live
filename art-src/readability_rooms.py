"""Large signature machinery for readable cutaway bays; standalone side elevation props."""
ROOMS = {
 'stores': 'a pair of stacked industrial freight crates, broad ivory enamel rectangular cases with brass protective corner ribs, dark steel latches, one green pressure cylinder strapped beside them and a tidy coil of copper cable on top',
 'workshop': 'a worn ivory and brass maintenance workbench, a blue steel vise on the left and a large gear and copper motor being repaired at center, a short backboard holding three clearly shaped spanners, a small amber articulated task lamp',
 'bunks': 'two cosy narrow crew bunk beds one above the other inside a riveted brass and ivory frame, dark green blankets and ivory pillows, small amber reading lamps and a personal locker on the right, no people',

 'engines': 'one big horizontal copper-wound traction motor with a broad ribbed cylindrical stator, exposed dark steel flywheel on the right, belt drive and a small amber gauge, mounted on a low steel skid',
 'weapons': 'a red-brown steel munitions workbench with three chunky brass and ivory missile canisters hanging vertically in a rack at the left, a horizontal cannon breech assembly clamped to the table at the right, small amber inspection lamp',
 'shields': 'a large upright teal field generator, a circular copper ring enclosing luminous teal concentric field lines and a bright suspended crystal, two rectangular ivory capacitor columns flank the ring',
 'air': 'three tall green pressure cylinders with ivory metal bands, a broad horizontal copper pipe manifold joining their tops, one large white analog pressure gauge on the right and a square air filter unit at their feet',
 'medbay': 'a clean futuristic infirmary bed in side elevation with ivory frame, white pillow at the left, folded sage-green blanket, a small mint-green medical cross plate at the head, a thin brass articulated lamp above and small black heart-rate monitor at the right',
 'helm': 'a wide panoramic blue-green window in a brass structural frame, showing dark stars, a low ivory navigation console below with teal radar displays and a copper ship wheel at the right. Flat front elevation of the wall panel',
 'sensors': 'an industrial listening console with a large round violet oscilloscope screen on the left and three flared copper acoustic listening horns of ascending heights on the right, a dark ivory electronics rack at the base',
 'doors': 'a steel bulkhead control motor in front elevation, paired vertical blue-gray armored shutters, exposed copper actuator cylinders flanking the doors, a brass locking wheel at the middle and small green emergency lever',
 'drones': 'two compact ivory maintenance drones with folded steel rotor blades suspended from an ochre overhead gantry in U-shaped cradles, a teal service light and dark tool cabinet at the base',
 'veil': 'a violet stealth field generator, a tall black faceted crystal in a triangular brass mounting frame, flanked by dark louvered lamp shutters and curled copper induction tubing',
 'heart': 'a hostile industrial reactor, a white-hot ember red spherical power core suspended in a thick black iron octagonal magnetic cage, heavy coolant conduits curl into it from both sides, ominous red slit lights',
 'bells': 'two violet glass acoustic resonator bells of different heights hanging from a dark brass gantry, luminous violet rims, small copper tuning cylinders and a dark electrical chassis at the base',
 'brood': 'a hostile black iron drone hatchery, three amber glowing hexagonal incubation pods inside a heavy industrial rack, folded tiny spiderlike repair automatons inside the pods, cables coiled below, no living creatures',
 'gate': 'an armored brass gate lock motor, a giant octagonal ivory seal plate at center, four thick copper locking bolts aimed inward from sides, black iron casing and amber slit indicators',
 'socket': 'an empty modular equipment bay, two ivory industrial mounting rails with brass clamps on a steel frame, a large dark empty central recess, one neatly coiled copper hookup cable at the left, a tiny amber inspection light',
 'mess': 'a cosy spaceship mess table in side elevation, two small ivory enamel mugs and a kettle on a broad worn brass tabletop, dark green cushioned bench seats below, a small amber shaded lamp at the back, no people',
 'enemy-buffer': 'a hostile copper-green industrial pressure buffer, a single broad horizontal capsule-shaped tank with four steel bands, a square amber diagnostic window and thick black rubber intake hoses curling into both ends',
 'enemy-vault': 'an ominous archive machinery block, three tall narrow blue-black steel data stacks, copper ventilation grids, dark violet glass memory cells glowing within, a single red locking bolt across the base',
}
def install(assets, pix):
 for key, subject in ROOMS.items():
  assets['props/bay-'+key]={'size':(144,56),'gen':(1152,448),'n':1,'versions':{'readable':{
   'prompt':f'{pix} Strict orthographic SIDE ELEVATION sprite of {subject}. Beautiful detailed industrial pixel art, broad clear shapes, restrained small mechanical details, worn brass and ivory ceramic, dark steel shadows, deep desaturated colors. The object fills the wide horizontal canvas with generous margins. Isolated on an absolutely flat plain dark navy #0c0f1c background. Entire silhouette visible. No perspective floor, no room, no walls except the described object, no scenery, no characters, no labels, no typography, no text, no frame, no border, no dramatic glow or soft gradients. Readable handcrafted game prop, lit from the upper left.'}}}
