// Full voyages with the real fight simulation and only the player's legal economy operations.
// This is a fixed, deliberately limited policy, not an estimate of human win rates.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Rng } from '../../src/core/rng.ts';
import { loadContent } from '../../src/campaign/testkit.ts';
import { newShip, allWeapons, isWeapon } from '../../src/campaign/shipops.ts';
import { createRun, canHop, knowledge, safeRecoveryStatus } from '../../src/campaign/run.ts';
import { currentRelay, isSealed, type RunState } from '../../src/campaign/model.ts';
import { headlessPresenter } from '../../src/campaign/headless.ts';
import { playVoyage } from '../../src/campaign/voyage.ts';
import { buyItem, buySupply, repairHullAt, storeHere, sellItem } from '../../src/campaign/store.ts';
import { upgradeCost, upgradeSystem, reactorCost, upgradeReactor, powerDemand } from '../../src/campaign/upgrades.ts';
import { hopDistances, hopsUntilSealed, sealFactor } from '../../src/campaign/map.ts';
import { WEAPONS } from '../../src/data/weapons.ts';
import { Sim } from '../../src/combat/sim/sim.ts';
import { autoFight } from '../../src/combat/sim/autoplay.ts';
import { orderMove, updateDeckMovement } from '../../src/combat/sim/crew.ts';
import { LEAD_CAR_IDS, type WeaponId, type SystemId } from '../../src/game/ids.ts';
import { DIFFICULTY_IDS, DIFFICULTIES } from '../../src/data/difficulty.ts';
import { carSlot, type AttachCarId } from '../../src/campaign/refit.ts';

const args=process.argv.slice(2);
const opt=(key:string,fallback:string)=>{const i=args.indexOf('--'+key);return i<0?fallback:args[i+1];};
const count=Number(opt('n','24'));
const offset=Number(opt('offset','0'));
const findWin=args.includes('--find-win');
const out=opt('out','');
const trace=args.includes('--trace');
const tenderOption=opt('tender','all');
const policyOption=opt('policy','equipment');
const policies=['conservative','aggressive','equipment','upgrades','support'].filter(p=>policyOption==='all'||policyOption.split(',').includes(p));
if(!policies.length)throw new Error(`Unknown policy ${policyOption}`);
const difficultyOption=opt('difficulty','medium');
const difficulties=DIFFICULTY_IDS.filter(d=>difficultyOption==='all'||difficultyOption.split(',').includes(d));
if(!difficulties.length)throw new Error(`Unknown difficulty ${difficultyOption}`);
const tenders=LEAD_CAR_IDS.filter(id=>tenderOption==='all'||tenderOption===id);
if(!tenders.length)throw new Error(`Unknown tender ${tenderOption}`);
const report=await loadContent();
if(!report.real||report.failed.length) throw new Error(JSON.stringify(report));
const snapshot=createHash('sha256');
for(const dir of ['src/campaign','src/data','src/game','src/content','src/combat/sim'])for(const file of readdirSync(dir,{recursive:true}).map(String).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).sort())snapshot.update(dir+'/'+file).update(readFileSync(dir+'/'+file));
snapshot.update(readFileSync('tools/balance/campaign.ts'));
const sourceHash=snapshot.digest('hex');

function value(id:WeaponId, run:RunState) {
  const w=WEAPONS[id];
  if(w.ammo&&run.inv.payloads===0)return 0;
  const damage=w.damage*(w.type==='beam'?(run.stage===1?2:3):w.shots)+(w.ion??0)*w.shots*.65;
  return damage/w.charge/Math.sqrt(w.power)*(w.ammo?.35:1)+(w.type==='laser'?w.shots*.025:0);
}
function equip(run:RunState) {
  // The same free reordering/mount-to-cargo moves offered by the equipment screen. No item is created or lost.
  const all=allWeapons(run.ship).sort((a,b)=>value(b,run)-value(a,run));
  const other=run.ship.cargo.filter(x=>!isWeapon(x));
  run.ship.weapons=Array.from({length:run.ship.weaponSlots},(_,i)=>all[i]??null);
  run.ship.cargo=[...other,...all.slice(run.ship.weaponSlots)];
  run.ship.weaponPower=run.ship.weapons.map(Boolean);
}
function dockCare(run:RunState) {
  // Use the same calm deck walking/healing routine as the tender UI. No combat, skill XP or route time passes.
  const sim=new Sim(run.ship,run.inv,{enemy:'packet-leech',stage:run.stage,depth:0,seed:run.seed});
  sim.crew=sim.playerCrew();
  const ship=sim.ships[0];
  let restored=0;
  for(const crew of sim.playerCrew()) {
    if(crew.hp>=crew.maxHp)continue;
    const med=ship.sys.medbay;
    const room=crew.medbay&&med&&med.damage<med.level?ship.rooms[med.room]:ship.rooms.find(r=>r.bench>0);
    if(!room||!orderMove(sim,crew,room.i))continue;
    const before=crew.hp;
    for(let tick=0;tick<120*15&&crew.hp<crew.maxHp;tick++)updateDeckMovement(sim,1/15);
    restored+=crew.hp-before;
    orderMove(sim,crew,crew.stationRoom);
    for(let tick=0;tick<30*15&&crew.path.length;tick++)updateDeckMovement(sim,1/15);
  }
  for(const crew of sim.playerCrew()) {
    const member=run.ship.crew.find(c=>c.id===crew.id)!;
    member.hp=Math.max(member.hp,Math.floor(crew.hp));
    member.room=ship.rooms[ship.tileRoom[crew.tile]].id;
  }
  return restored;
}
function upgrade(run:RunState, policy:string, purchases:unknown[], beforeGuardian=false) {
  equip(run);
  const load=Math.min(8,run.ship.weapons.reduce((sum,id)=>sum+(id?WEAPONS[id].power:0),0));
  const bolts=run.ship.weapons.reduce((sum,id)=>sum+(id&&!WEAPONS[id].ammo?WEAPONS[id].shots:0),0);
  const wagonFund=(policy==='support'&&!run.ship.consist.keel)||(policy==='equipment'&&bolts>=4&&!run.ship.consist.rear);
  const shieldFund=policy==='support'&&!run.ship.systems.shields;
  const reserve=beforeGuardian||policy==='upgrades'?0:Math.max(run.ship.hull<20?35:15,shieldFund?100:0,wagonFund?85:0,bolts<(run.stage===1?4:7)?(run.stage===1?45:95):0);
  const plan: [SystemId|'reactor',number][]=!run.ship.systems.shields?
    [['veil',2],['weapons',load],['reactor',12],['medbay',2],['engines',4],['weapons',5],['reactor',15],['veil',3],['weapons',6],['engines',5],['doors',2],['weapons',8],['reactor',19],['engines',7]]:[['shields',4],['weapons',load],['reactor',10],['weapons',5],['reactor',12],
    ['engines',3],['weapons',6],['reactor',15],['shields',6],['weapons',8],['reactor',20],['engines',5],['doors',2],['medbay',2],['reactor',23],['shields',8]];
  for(const [id,desired] of plan) {
    const target=id==='weapons'?Math.min(desired,load):id==='reactor'?Math.min(desired,powerDemand(run.ship)):desired;
    while((id==='reactor'?run.ship.reactor:run.ship.systems[id]?.level??0)<target) {
      const cost=id==='reactor'?reactorCost(run.ship):upgradeCost(run.ship,id);
      if(cost===null||cost>run.inv.salvage-reserve)return;
      if(id==='reactor') upgradeReactor(run); else upgradeSystem(run,id);
      purchases.push({stage:run.stage,relay:run.pos,kind:'upgrade',id,cost});
    }
  }
}
const rows=[];
for(const difficulty of difficulties) for(const tender of tenders) for(const policy of policies) for(let i=offset+1;i<=offset+count;i++) {
  const seed=i*31337;
  const run=createRun(seed,newShip(tender,new Rng(seed),'amber',tender),undefined,difficulty);
  const p=headlessPresenter(seed);
  const fights:unknown[]=[], hubs:unknown[]=[], purchases:unknown[]=[], rejected:unknown[]=[], losses:unknown[]=[];
  let serviceStops=0,saleReceipts=0,dockHealthRestored=0;
  const originalOutcome=p.outcome;
  p.outcome=async(r,a,v)=>{
    for(const delta of a.deltas)if(delta.amount<0)losses.push({stage:r.stage,relay:r.pos,event:v.id,...delta});
    for(const notice of a.notices)if(['crew-hurt','crew-loss','system'].includes(notice.kind))losses.push({stage:r.stage,relay:r.pos,event:v.id,kind:notice.kind,text:notice.text});
    await originalOutcome(r,a,v);
  };
  const record=(r:RunState,kind:string,id:string,before:number)=>{
    const cost=before-r.inv.salvage;
    if(cost>0)purchases.push({stage:r.stage,relay:r.pos,kind,id,cost});
  };
  const supply=(r:RunState,stock:ReturnType<typeof storeHere>,kind:'ttl'|'spares'|'payloads',target:number)=>{
    const before=r.inv.salvage;
    while(r.inv[kind]<target&&buySupply(r,stock,kind).ok){}
    record(r,'supply',kind,before);
  };
  const sellCargo=(r:RunState)=>{
    for(const id of [...r.ship.cargo]){const before=r.inv.salvage;sellItem(r,id);saleReceipts+=r.inv.salvage-before;}
  };
  p.combat=async(r,setup)=>{
    if(trace)console.error(JSON.stringify({trace:'combat',difficulty,tender,policy,seed,stage:r.stage,relay:r.pos,enemy:setup.enemy,hull:r.ship.hull}));
    equip(r);
    const before={hull:r.ship.hull,reactor:r.ship.reactor,shields:r.ship.systems.shields?.level,weapons:r.ship.weapons,
      veil:r.ship.systems.veil?.level,drones:r.ship.drones,droneLevel:r.ship.systems.drones?.level,consist:{...r.ship.consist},
      weaponsLevel:r.ship.systems.weapons?.level,crew:r.ship.crew.length,payloads:r.inv.payloads,spares:r.inv.spares,salvage:r.inv.salvage,
      damage:Object.fromEntries(Object.entries(r.ship.systems).filter(([,s])=>s?.damage).map(([id,s])=>[id,s?.damage]))};
    const sim=new Sim(r.ship,r.inv,setup);
    const freeBolts=sim.ships[0].weapons.filter(w=>!w.def.ammo&&w.def.type!=='beam').reduce((n,w)=>n+w.def.shots,0);
    const payloadReserve=!setup.boss&&freeBolts>sim.ships[1].shields?3:0;
    autoFight(sim,{fleeAt:setup.boss?0:policy==='conservative'?.4:.2,payloadReserve},900);
    if(!sim.outcome) {
      // An inconclusive fight is not a free retreat: issue the same power/crew orders a player can issue,
      // then let the drive charge under enemy fire. Never fabricate an outcome or teleport the crew.
      const player=sim.ships[0];
      player.weapons.forEach((_w,index)=>sim.setWeaponPower(index,false));
      player.drones.forEach((_d,index)=>sim.setDronePower(index,false));
      for(const id of ['shields','medbay','veil'] as const) {
        const sys=player.sys[id];
        while(sys&&sys.power>(id==='shields'?2:0)&&sim.removePower(id)){}
      }
      while(player.sys.engines&&player.sys.engines.power<2&&sim.addPower('engines')){}
      const pilot=sim.playerCrew().find(c=>!c.dead);
      if(pilot&&player.sys.helm)sim.moveCrew([pilot.uid],player.sys.helm.room);
      for(let tick=0;tick<90*60&&!sim.outcome&&!sim.hopReady();tick++)sim.step(1/60);
      if(!sim.outcome&&!sim.hop())throw new Error(`Policy timeout: ${setup.enemy}; hull ${player.hull}; retreat ready ${sim.hopReady()}`);
    }
    const result=sim.result();
    fights.push({stage:r.stage,enemy:setup.enemy,boss:setup.boss,before,outcome:result.outcome,
      hull:result.ship.hull,crew:result.ship.crew.length,seconds:result.stats.seconds,
      enemyHull:sim.ships[1].hull,phase:sim.ships[1].boss.core?.phase});
    return result;
  };
  p.store=async r=>{
    const stock=storeHere(r);
    const repairBefore=r.inv.salvage;
    repairHullAt(r,stock,policy==='aggressive'?Math.max(0,24-r.ship.hull):'all');
    record(r,'repair','hull',repairBefore);
    supply(r,stock,'ttl',Math.max(5,hopDistances(r.map.relays,r.map.exit)[r.pos]+2));
    if(r.ship.systems.drones)supply(r,stock,'spares',4);
    equip(r);
    sellCargo(r);
    if(!r.ship.systems.shields&&(policy==='conservative'||policy==='support')){
      const index=stock.items.findIndex(it=>it.kind==='system'&&it.id==='shields');
      if(index>=0){const before=r.inv.salvage;buyItem(r,stock,index);record(r,'system','shields',before);}
    }
    if(r.stage>=2&&!r.ship.systems.veil&&(policy==='equipment'||policy==='support'||policy==='conservative')){
      const index=stock.items.findIndex(it=>it.kind==='system'&&it.id==='veil'&&!it.sold);
      if(index>=0&&r.inv.salvage>=stock.items[index].price+20){
        const before=r.inv.salvage;buyItem(r,stock,index);record(r,'system','veil',before);
      }
    }
    if(tender==='switchback'&&(policy==='aggressive'||policy==='equipment'||policy==='support')&&r.ship.drones.filter(d=>d==='relay-drone').length<2){
      const index=stock.items.findIndex(it=>it.kind==='drone'&&it.id==='relay-drone'&&!it.sold);
      if(index>=0&&r.inv.salvage>=stock.items[index].price+10){
        const before=r.inv.salvage;
        if(buyItem(r,stock,index).ok){
          const cargo=r.ship.cargo.indexOf('relay-drone');
          const slot=r.ship.drones.findIndex(d=>d==='firewall-drone');
          if(cargo>=0&&slot>=0){r.ship.cargo[cargo]='firewall-drone';r.ship.drones[slot]='relay-drone';}
          record(r,'drone','relay-drone',before);
        }
      }
    }
    const available=stock.items.map((it,index)=>({it,index})).filter(({it})=>it.kind==='weapon'&&!it.sold)
      .sort((a,b)=>value(b.it.id as WeaponId,r)-value(a.it.id as WeaponId,r));
    for(const {it,index} of available) {
      const weapons=r.ship.weapons.filter(Boolean) as WeaponId[];
      const worst=weapons.length<r.ship.weaponSlots?0:Math.min(...weapons.map(w=>value(w,r)));
      if(value(it.id as WeaponId,r)>worst*1.2){
        const future=[...weapons,it.id as WeaponId].sort((a,b)=>value(b,r)-value(a,r)).slice(0,r.ship.weaponSlots);
        const level=Math.min(8,future.reduce((n,id)=>n+WEAPONS[id].power,0));
        if(r.inv.salvage>=it.price+10){
          const before=r.inv.salvage;buyItem(r,stock,index);record(r,'weapon',it.id,before);equip(r);sellCargo(r);
          while(r.ship.systems.weapons!.level<level){const cost=upgradeCost(r.ship,'weapons');if(cost===null||cost>r.inv.salvage-10||!upgradeSystem(r,'weapons'))break;purchases.push({stage:r.stage,relay:r.pos,kind:'upgrade',id:'weapons',cost});}
        }else rejected.push({stage:r.stage,relay:r.pos,id:it.id,price:it.price,salvage:r.inv.salvage});
      }
    }
    // A coherent, paid wagon plan. Only fit empty positions so a useful refit is never casually discarded.
    const wanted=policy==='support'?['workshop-keel','freight-car','ballast-keel','bunk-car']:
      tender==='switchback'?['drone-car','sling-keel','workshop-keel','armory-car']:['armory-car','sling-keel','workshop-keel'];
    if(policy==='equipment'||policy==='support')for(const id of wanted){
      const index=stock.items.findIndex(it=>it.kind==='car'&&it.id===id&&!it.sold);
      if(index<0||r.ship.consist[carSlot(id as AttachCarId)])continue;
      const reserve=policy==='support'?20:35;
      if(r.inv.salvage<stock.items[index].price+reserve)continue;
      const before=r.inv.salvage;
      if(buyItem(r,stock,index).ok)record(r,'car',id,before);
    }
    if(r.ship.weapons.some(w=>w&&WEAPONS[w].ammo))supply(r,stock,'payloads',8);
    const hire=stock.items.findIndex(it=>it.kind==='crew'&&!it.sold&&it.price<r.inv.salvage-30);
    if(r.ship.crew.length<4&&hire>=0){const before=r.inv.salvage;buyItem(r,stock,hire);record(r,'crew',stock.items[hire].id,before);}
  };
  p.choose=async(_r,view)=>{
    const legal=view.choices.filter(c=>c.enabled&&!c.hidden);
    // Visible blue options first, otherwise the first offered action. Never inspect hidden outcomes.
    const cautious=policy==='conservative'?legal.find(c=>/^(Leave|Keep moving|Pass|Continue|Stay clear|Let .* pass|Do not|Go on|Decline|Give .* room|Keep your)/i.test(c.text)):undefined;
    return (legal.find(c=>c.blue)??cautious??legal[0]).index;
  };
  p.hub=async r=>{
    if(hubs.length>150)throw new Error('Policy timeout: route exceeded 150 hub visits');
    if(trace)console.error(JSON.stringify({trace:'hub',difficulty,tender,policy,seed,stage:r.stage,relay:r.pos,hull:r.ship.hull,ttl:r.inv.ttl}));
    const cur=currentRelay(r);
    if(cur.type==='market')await p.store(r);
    dockHealthRestored+=dockCare(r);
    const recovery=safeRecoveryStatus(r);
    if(recovery.ok&&(recovery.systemsDamaged>0||r.ship.crew.some(c=>c.hp<55))){serviceStops++;return {kind:'service'};}
    upgrade(r,policy,purchases);
    hubs.push({stage:r.stage,relay:cur.id,hull:r.ship.hull,salvage:r.inv.salvage,earned:r.stats.salvageEarned,spent:r.stats.salvageSpent});
    if(r.inv.ttl<=0)return {kind:'wait'};
    const dist=hopDistances(r.map.relays,r.map.exit);
    const options=cur.links.filter(j=>canHop(r,j).ok);
    if(!options.length)throw new Error(`No route for ${seed}`);
    const scored=options.map(j=>{
      const next=r.map.relays[j];
      const visible=knowledge(r,next)!=='unknown';
      const progress=dist[cur.id]-dist[j];
      let score=progress*(r.inv.ttl<=dist[cur.id]+2?12:policy==='conservative'?3:1);
      const nextSeal=r.map.sealX+r.map.sealStep*sealFactor(cur);
      if(isSealed(r.map,next)||(next.id!==r.map.exit&&next.x<nextSeal))score-=100;
      if(next.visited)score-=8;
      if(r.inv.ttl>dist[j]+2&&hopsUntilSealed(r.map,cur)>(policy==='conservative'?3:1))score+=(next.visited?0:policy==='conservative'?2:5);
      if(visible&&next.type==='market'){
        const useful=!next.visited||(r.ship.hull<r.ship.hullMax*.65&&r.inv.salvage>=10)
          ||(r.inv.ttl<dist[cur.id]+2&&(next.store?.ttl??0)>0&&r.inv.salvage>=4);
        if(useful)score+=r.ship.hull<22||r.inv.salvage>65?7:1;
      }
      if(visible&&next.type==='bench'&&r.ship.hull<24)score+=4;
      if(visible&&next.type==='combat')score+=policy==='conservative'?-4:policy==='aggressive'?6:2;
      return {j,score};
    }).sort((a,b)=>b.score-a.score);
    if(scored[0].j===r.map.exit)upgrade(r,policy,purchases,true);
    return {kind:'hop',to:scored[0].j};
  };
  let outcome:string;
  try {outcome=await playVoyage(run,p,{prologue:true});} catch(error) {
    if(!String(error).includes('Policy timeout:'))throw error;
    outcome='policy-timeout';p.log.problems.push(String(error));
  }
  const row={difficulty,tender,policy,seed,outcome,consist:run.ship.consist,finalSystems:Object.fromEntries(Object.entries(run.ship.systems).map(([id,s])=>[id,s?.level])),reactor:run.ship.reactor,remaining:run.inv.salvage,ordinaryFights:[1,2,3].map(stage=>fights.filter(f=>(f as {stage:number;boss?:boolean}).stage===stage&&!(f as {boss?:boolean}).boss).length),stage:run.stage,cleared:run.stagesCleared,earned:run.stats.salvageEarned,
    saleReceipts,netReceipts:run.stats.salvageEarned-saleReceipts,spent:run.stats.salvageSpent,serviceStops,dockHealthRestored,purchases,rejected,losses,relays:run.stats.relaysVisited,fights,hubs,problems:p.log.problems};
  rows.push(row);
  console.log(JSON.stringify({difficulty,tender,policy,seed,outcome,stage:run.stage,earned:row.earned,spent:row.spent,relays:row.relays,lastFight:fights.at(-1)}));
  if(findWin&&outcome==='victory')break;
}
const summary={runs:rows.length,byTender:Object.fromEntries(tenders.map(t=>{const rs=rows.filter(r=>r.tender===t);return [t,{runs:rs.length,victories:rs.filter(r=>r.outcome==='victory').length,averageFights:rs.reduce((n,r)=>n+r.fights.length,0)/rs.length}]})),victories:rows.filter(r=>r.outcome==='victory').length,
  sourceHash,
  matrix:difficulties.flatMap(d=>tenders.flatMap(t=>policies.map(p=>{const rs=rows.filter(r=>r.difficulty===d&&r.tender===t&&r.policy===p);return {difficulty:d,tender:t,policy:p,runs:rs.length,wins:rs.filter(r=>r.outcome==='victory').length,reached:[1,2,3].map(s=>rs.filter(r=>r.stage>=s).length),carPurchases:rs.reduce((n,r)=>n+r.purchases.filter(x=>(x as {kind:string}).kind==='car').length,0)};}))),
  difficultyRules:DIFFICULTIES,
  byPolicy:Object.fromEntries(policies.map(p=>{const rs=rows.filter(r=>r.policy===p);return [p,{runs:rs.length,victories:rs.filter(r=>r.outcome==='victory').length,reached:[1,2,3].map(s=>rs.filter(r=>r.stage>=s).length)}]})),
  timeouts:rows.filter(r=>r.outcome==='policy-timeout').length,reached:[1,2,3].map(s=>rows.filter(r=>r.stage>=s).length),seedOffset:offset,seedsRequested:count,selectedWinSearch:findWin,
  policy:'Real combat; visible choices; reachable relays; legal purchases, resale, repairs, dockside medicine, field service and upgrades. Equipment prioritizes gun/drone refits; support uses freight/repair refits and may install shields. No hidden outcomes, synthetic grants or forced wins.'};
console.log(JSON.stringify(summary));
if(out)writeFileSync(out,JSON.stringify({summary,rows},null,2));
