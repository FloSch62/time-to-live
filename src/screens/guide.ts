// Compact canvas field guide, available before a voyage and from the paused encounter.
import type { App, Scene } from '../core/scene';
import { P, C } from '../core/palette';
import { HUD_BAND, TYPE, brassButton, footer, header, icon, scrim, tabRow, textAt, titlePlate } from './kit';
import { wrap } from '../core/font';
import { sfx } from '../core/audio';

type Card = { title:string; icon:string; text:string; keys:string };
const PAGES: {name:string; cards:Card[]}[] = [
  {name:'THE VOYAGE',cards:[
    {title:'KEEP MOVING',icon:'glyph-map',text:'Every hop costs 1 TTL. The Seal advances behind you. Explore unvisited relays for supplies, but leave a route to the guardian. Hover a relay to see when the Seal will reach it.',keys:'M  chart     TAB  select relay     ENTER  hop'},
    {title:'ARRIVAL ALLOCATION',icon:'res-salvage',text:'A completed arrival unlocks stores based on region and difficulty. Freight adds four salvage. One receipt per working locker; sealed relays, guardians and revisits provide no allocation.',keys:'Stores are separate from event and fight rewards.'},
    {title:'BUILD FOR THE NEXT GATE',icon:'sys-weapons-powered',text:'Save salvage for weapons as well as upgrades. Exchanges always offer a dependable weapon that needs no payloads. Sell unused equipment, repair the hull and restock payloads before the guardian.',keys:'U  tender and upgrades     S  exchange at a market'},
    {title:'ONE VOYAGE, ONE CHECKPOINT',icon:'glyph-ship',text:'Continue restores the last relay checkpoint. Leaving during an encounter restarts that encounter. A lost tender ends the voyage; discovered Runbook entries remain.',keys:'ESC  pause menu     ALT+ENTER  fullscreen'},
  ]},
  {name:'COMBAT ORDERS',cards:[
    {title:'PAUSE, PLAN, EXECUTE',icon:'sys-helm-powered',text:'Pause as often as you need. Select a weapon, then target an enemy room. Let several weapons charge together to break the ward mesh with one volley. Beam weapons target a line across rooms.',keys:'SPACE  pause     1–6  weapon     V  autofire'},
    {title:'LOOK AFTER THE CREW',icon:'sys-medbay-powered',text:'In combat, power the infirmary. At berths it uses shore power. Field service restores crew and faults for one Seal step. Send help to fires and boarders; lifts connect decks.',keys:'F1–F12 or portrait  crew     RIGHT-CLICK  move     R  stations'},
    {title:'READ BOTH VESSELS',icon:'sys-sensors-powered',text:'Hover crew, rooms, weapons and status symbols for their details. Listening Post upgrades reveal enemy crew, weapon charge and power. Each vessel has its own view controls.',keys:'WHEEL  zoom     MIDDLE-DRAG  pan     Z  reset'},
    {title:'LEAVE A WAY HOME',icon:'sys-engines-powered',text:'A manned helm and powered drive charge departure. Choose a linked relay: a combat hop spends 1 TTL, advances the Seal and arrives there. At TTL zero there is no hop. Retreat does not clear a guardian.',keys:'J  retreat when ready     ESC  cancel / pause menu'},
  ]},
  {name:'POWER & REPAIRS',cards:[
    {title:'BARS ARE A BUDGET',icon:'sys-engines-powered',text:'Reactor bars are shared. Weapons, the Shield Array, air and the Thrusters compete for them. Higher system capacity needs power to work. The Helm, Listening Post and Bulkheads are self-powered subsystems.',keys:'CLICK  add power     RIGHT-CLICK  remove power'},
    {title:'TWO BARS, ONE MESH LAYER',icon:'sys-shields-powered',text:'The Shield Array raises one mesh layer for every two powered bars. An odd level is a damage buffer, not another layer. Buy the second bar and enough reactor capacity to use the layer.',keys:'The upgrade screen shows each level and its cost.'},
    {title:'TRIAGE BEFORE FIREPOWER',icon:'sys-air-powered',text:'Red bars are damaged. Crew in the room repair them. Ion locks clear over time. Fires consume air; open connected doors to vent a fire, then close them before the crew return.',keys:'O  open doors     L  close doors     SHIFT+R  save stations'},
    {title:'TOOLS FOR A PARTICULAR JOB',icon:'sys-drones-powered',text:'Drones need a hosted Drone Bay, power and a spare to launch. A Veil can dodge an incoming volley. Rear and keel cars provide extra rooms, mounts and sockets, but their mass costs evasion.',keys:'7–0  drones     C  veil     U  equipment and yard'},
  ]},
  {name:'CARS & REFITS',cards:[
    {title:'KNOW YOUR DECK PLAN',icon:'glyph-ship',text:'Lamplighter has room for rescue gear. Glasswing has compact optics bays and one socket. Switchback has five decks, native drones and Veil. Its two sockets remain free for support.',keys:'Room distances matter when crew repair or change stations.'},
    {title:'ONE REAR COUPLING',icon:'sys-drones-powered',text:'Armory boosts guns; Drone adds a cradle and faster cycles; Veil adds defense. Freight earns stores along the route. Bunk adds crew capacity and a recovery bench.',keys:'Specialist cars need equipment and reactor power to work.'},
    {title:'ONE KEEL SUSPENSION',icon:'sys-engines-powered',text:'Sling adds a light gun mount. Ballast gives hull and debris protection. Listening reveals route information. Workshop speeds repairs and recovers hull after secured ordinary fights.',keys:'Every car costs 1–3% evasion. Compare the preview.'},
    {title:'BUY THE WHOLE PLAN',icon:'res-salvage',text:'A mount is not a gun, and system capacity is not reactor power. Keep repair money. Replace a car only when its new job helps more; its old modules return to stores.',keys:'Exchanges buy cars at half value. Benches pay nothing.'},
  ]},
  {name:'THE GUARDIANS',cards:[
    {title:'THE IRON REGENT',icon:'sys-shields-powered',text:'Its gate stops hits until two different weapons (or a weapon and a drone) land within two seconds. The exposed wardens keep repairing it. Stop those wardens, then time your volleys.',keys:'Two sources. One opening. Keep a second weapon supplied.'},
    {title:'THE HOLLOW CHOIR',icon:'sys-weapons-powered',text:'Hold an attended helm channel to open its glass, spending departure progress. Damaged bells shorten the hold. Three hits within one second are another way through; one burst can count.',keys:'Keep the helm working, or time a three-hit burst.'},
    {title:'THE BLACKOUT CORE',icon:'sys-sensors-powered',text:'Watch the active Custody step and target that machinery. Emergency runs two steps at once. In the final phase, sealing drones strengthen the shell and the Core pulls every light inward in one long beam.',keys:'Disable the isolation machinery. Preserve the archive. Send hello.'},
    {title:'PREPARE AT THE LAST EXCHANGE',icon:'glyph-map',text:'Repair before committing. Bring enough shots to strip the mesh, a way to survive payloads, and crew who can repair under pressure. A larger hull or more guns alone will not replace timing.',keys:'If a plan cannot work, retreat and change it.'},
  ]},
];

export function createGuideScene(app:App):Scene {
  let page=0;
  const scene:Scene={overlay:true,draw(g,a){
    scrim(g);
    const X=40, Y=HUD_BAND+10, W=880, H=514-Y;
    g.panel(X,Y,W,H,'dialog');
    titlePlate(g,480,Y-11,'CABLE TENDER FIELD GUIDE',{w:430});
    const ix=X+24, iw=W-48;
    page=tabRow(a,'guide-tab',ix,Y+20,iw,26,PAGES.map((p)=>({label:p.name})),page,6);
    const cw=Math.floor((iw-12)/2), top=Y+56, ch=Math.floor((H-56-52-10)/2);
    PAGES[page].cards.forEach((c,i)=>{
      const x=ix+(i%2)*(cw+12),y=top+Math.floor(i/2)*(ch+10);
      g.panel(x,y,cw,ch,'panel-dark');
      icon(g,c.icon,x+12,y+10);
      header(g,c.title,x+40,y+16,{font:TYPE.strong,color:P.brass1});
      textAt(g,c.text,x+14,y+36,{font:TYPE.body,color:C.text,width:cw-28});
      const kl=wrap(c.keys,cw-28,TYPE.note).length;
      textAt(g,c.keys,x+14,y+ch-10-kl*13+2.5,{font:TYPE.note,color:P.teal1,width:cw-28});
    });
    header(g,`Page ${page+1} of ${PAGES.length}`,ix,Y+H-34,{color:P.ivory3});
    if(a.input.keyPressed('ArrowLeft')){a.input.eatKey('ArrowLeft');page=(page+PAGES.length-1)%PAGES.length;}
    if(a.input.keyPressed('ArrowRight')){a.input.eatKey('ArrowRight');page=(page+1)%PAGES.length;}
    footer(g,a,[['←→','turn the page']],[['ESC','back']]);
    if(brassButton(a,'guide-close',ix+iw-168,Y+H-44,168,28,'BACK',{hotkey:'Escape',hotkeys:['F1']})){
      sfx.play('ui-back');app.scenes.remove(scene);
    }
  }};
  return scene;
}
