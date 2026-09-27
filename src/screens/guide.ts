// Compact canvas field guide, available before a voyage and from the paused encounter.
import type { App, Scene } from '../core/scene';
import { P, C } from '../core/palette';
import { brassButton, titlePlate, tracked, icon } from './kit';
import { sfx } from '../core/audio';
import { RELAY_STORES } from '../campaign/run';

type Card = { title:string; icon:string; text:string; keys:string };
const PAGES: {name:string; cards:Card[]}[] = [
  {name:'THE VOYAGE',cards:[
    {title:'KEEP MOVING',icon:'glyph-map',text:'Every hop costs 1 TTL. The Seal advances behind you. Explore unvisited relays for supplies, but leave a route to the guardian. Hover a relay to see when the Seal will reach it.',keys:'M  chart     TAB  select relay     ENTER  hop'},
    {title:'MAINTENANCE STORES',icon:'res-salvage',text:`Clear a relay to open its stores: ${RELAY_STORES[1]} salvage in the Reach, ${RELAY_STORES[2]} in the Cathedral, ${RELAY_STORES[3]} near the Heart. A locker pays once. Sealed relays and guardians have no maintenance stores.`,keys:'Stores are separate from event and fight rewards.'},
    {title:'BUILD FOR THE NEXT GATE',icon:'sys-weapons-powered',text:'Save salvage for weapons as well as upgrades. Exchanges always offer a dependable ammunition-free weapon. Sell unused equipment, repair the hull and restock payloads before the guardian.',keys:'U  ship and upgrades     S  exchange at a market'},
    {title:'ONE VOYAGE, ONE CHECKPOINT',icon:'glyph-ship',text:'Continue restores the last relay checkpoint. Leaving during an encounter restarts that encounter. A lost tender ends the voyage; discovered Runbook entries remain.',keys:'ESC  pause menu     ALT+ENTER  fullscreen'},
  ]},
  {name:'COMBAT ORDERS',cards:[
    {title:'PAUSE, PLAN, EXECUTE',icon:'sys-helm-powered',text:'Pause as often as you need. Select a weapon, then target an enemy room. Let several weapons charge together to break shields with one volley. Beam weapons target a line across rooms.',keys:'SPACE  pause     1–6  weapon     V  autofire'},
    {title:'LOOK AFTER THE CREW',icon:'sys-medbay-powered',text:'Keep somebody at the helm to evade and charge the hop drive. Move injured crew into a powered infirmary. Send help to fires, damaged systems and boarders. Lifts connect decks. You can also move crew at relays.',keys:'F1–F10  crew     RIGHT-CLICK  move     R  stations'},
    {title:'READ BOTH VESSELS',icon:'sys-sensors-powered',text:'Hover crew, rooms, weapons and status symbols for their details. Listening Post upgrades reveal enemy crew, weapon charge and power. Each vessel has its own view controls.',keys:'WHEEL  zoom     MIDDLE-DRAG  pan     Z  reset'},
    {title:'LEAVE A WAY HOME',icon:'sys-engines-powered',text:'A manned helm and powered drive complete the three-part handshake. HOP retreats from the fight when it is ready, including at a guardian. You must still beat the guardian to leave the stage.',keys:'J  retreat when ready     ESC  cancel / pause menu'},
  ]},
  {name:'POWER & REPAIRS',cards:[
    {title:'BARS ARE A BUDGET',icon:'sys-engines-powered',text:'Reactor bars are shared. Weapons, shields, air and engines compete for them. Higher system capacity needs power to work. Helm, sensors and doors are self-powered subsystems.',keys:'CLICK  add power     RIGHT-CLICK  remove power'},
    {title:'TWO BARS, ONE SHIELD',icon:'sys-shields-powered',text:'Shields gain a layer every two powered bars. An odd level is a damage buffer, not another layer. Buy the second bar and enough reactor capacity to use the layer.',keys:'The upgrade screen shows each level and its cost.'},
    {title:'TRIAGE BEFORE FIREPOWER',icon:'sys-air-powered',text:'Red bars are damaged. Crew in the room repair them. Ion locks clear over time. Fires consume air; open connected doors to vent a fire, then close them before the crew return.',keys:'O  open doors     L  close doors     SHIFT+R  save stations'},
    {title:'TOOLS FOR A PARTICULAR JOB',icon:'sys-drones-powered',text:'Drones need a hosted Drone Bay, power and a spare to launch. A Veil can dodge an incoming volley. Rear and keel cars provide extra rooms, mounts and sockets, but their mass costs evasion.',keys:'7–9  drones     C  veil     U  equipment and yard'},
  ]},
  {name:'THE GUARDIANS',cards:[
    {title:'THE IRON REGENT',icon:'sys-shields-powered',text:'Its gate stops hits until two different weapons (or a weapon and a drone) land within two seconds. The exposed wardens keep repairing it. Destroy those wardens, then time your volleys.',keys:'Two sources. One opening. Keep a second weapon supplied.'},
    {title:'THE HOLLOW CHOIR',icon:'sys-weapons-powered',text:'Three hits together shatter its glass ward. A burst or a coordinated volley makes an opening. Damage the bell machinery to stop it rebuilding the glass while you attack.',keys:'Let the volley charge before you release it.'},
    {title:'THE BLACKOUT CORE',icon:'sys-sensors-powered',text:'Watch the active Custody step and target that machinery. Emergency runs two steps at once. In the final phase, sealing drones strengthen the shell and the Heart powers a devastating beam.',keys:'Disable the active gun. Break the drones. Silence the Heart.'},
    {title:'PREPARE AT THE LAST EXCHANGE',icon:'glyph-map',text:'Repair before committing. Bring enough shots to strip the mesh, a way to survive payloads, and crew who can repair under pressure. A larger hull or more guns alone will not replace timing.',keys:'If a plan cannot work, retreat and change it.'},
  ]},
];

export function createGuideScene(app:App):Scene {
  let page=0;
  const scene:Scene={overlay:true,draw(g,a){
    g.dim(.8);
    g.panel(54,35,852,468,'dialog');
    titlePlate(g,480,23,'LAMPLIGHTER FIELD GUIDE',{w:430});
    PAGES.forEach((p,i)=>{
      if(brassButton(a,`guide-tab-${i}`,78+i*202,68,196,28,p.name,{variant:page===i?'brass':'normal',font:'label'}))page=i;
    });
    PAGES[page].cards.forEach((c,i)=>{
      const x=78+(i%2)*406,y=112+Math.floor(i/2)*166;
      g.panel(x,y,390,154,'panel-dark');
      icon(g,c.icon,x+12,y+12);
      tracked(g,c.title,x+36,y+12,{font:'labelb',color:P.brass1});
      g.text(c.text,x+14,y+36,{font:'body',color:C.text,width:362});
      g.text(c.keys,x+14,y+123,{font:'small',color:P.teal1,width:362,maxLines:2});
    });
    g.text(`${page+1} / ${PAGES.length}   ·   LEFT / RIGHT to turn the page`,78,465,{font:'small',color:C.textDim});
    if(a.input.keyPressed('ArrowLeft')){a.input.eatKey('ArrowLeft');page=(page+PAGES.length-1)%PAGES.length;}
    if(a.input.keyPressed('ArrowRight')){a.input.eatKey('ArrowRight');page=(page+1)%PAGES.length;}
    if(brassButton(a,'guide-close',714,459,168,28,'BACK',{hotkey:'Escape',hotkeys:['F1'],font:'label'})){
      sfx.play('ui-back');app.scenes.remove(scene);
    }
  }};
  return scene;
}
