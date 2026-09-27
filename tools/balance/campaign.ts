// Full voyages with the real fight simulation and only the player's legal economy operations.
// This is a fixed, deliberately limited policy, not an estimate of human win rates.
import { writeFileSync } from 'node:fs';
import { Rng } from '../../src/core/rng.ts';
import { loadContent } from '../../src/campaign/testkit.ts';
import { newShip, allWeapons, isWeapon } from '../../src/campaign/shipops.ts';
import { createRun, canHop, knowledge } from '../../src/campaign/run.ts';
import { currentRelay, isSealed, type RunState } from '../../src/campaign/model.ts';
import { headlessPresenter } from '../../src/campaign/headless.ts';
import { playVoyage } from '../../src/campaign/voyage.ts';
import { buyItem, buySupply, repairHullAt, storeHere, sellItem } from '../../src/campaign/store.ts';
import { upgradeCost, upgradeSystem, reactorCost, upgradeReactor } from '../../src/campaign/upgrades.ts';
import { hopDistances, hopsUntilSealed } from '../../src/campaign/map.ts';
import { WEAPONS } from '../../src/data/weapons.ts';
import { Sim } from '../../src/combat/sim/sim.ts';
import { autoFight } from '../../src/combat/sim/autoplay.ts';
import type { WeaponId, SystemId } from '../../src/game/ids.ts';

const args=process.argv.slice(2);
const opt=(key:string,fallback:string)=>{const i=args.indexOf('--'+key);return i<0?fallback:args[i+1];};
const count=Number(opt('n','24'));
const out=opt('out','');
const report=await loadContent();
if(!report.real||report.failed.length) throw new Error(JSON.stringify(report));

function value(id:WeaponId, run:RunState) {
  const w=WEAPONS[id];
  if(w.ammo&&run.inv.payloads===0)return 0;
  const damage=w.damage*(w.type==='beam'?2:w.shots)+(w.ion??0)*w.shots*.65;
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
function upgrade(run:RunState, beforeGuardian=false) {
  equip(run);
  const load=Math.min(8,run.ship.weapons.reduce((sum,id)=>sum+(id?WEAPONS[id].power:0),0));
  const bolts=run.ship.weapons.reduce((sum,id)=>sum+(id&&!WEAPONS[id].ammo?WEAPONS[id].shots:0),0);
  const reserve=beforeGuardian?0:Math.max(run.ship.hull<20?35:15,bolts<(run.stage===1?3:7)?(run.stage===1?45:95):0);
  const plan: [SystemId|'reactor',number][]=[['weapons',4],['reactor',10],['shields',4],['weapons',5],['reactor',12],
    ['engines',3],['weapons',6],['reactor',15],['shields',6],['weapons',8],['reactor',20],['engines',5],['doors',2],['medbay',2],['reactor',23],['shields',8]];
  for(const [id,desired] of plan) {
    const target=id==='weapons'?Math.min(desired,load):desired;
    while((id==='reactor'?run.ship.reactor:run.ship.systems[id]?.level??0)<target) {
      const cost=id==='reactor'?reactorCost(run.ship):upgradeCost(run.ship,id);
      if(cost===null||cost>run.inv.salvage-reserve)return;
      if(id==='reactor') upgradeReactor(run); else upgradeSystem(run,id);
    }
  }
}
const rows=[];
for(let i=1;i<=count;i++) {
  const seed=i*31337;
  const run=createRun(seed,newShip('Lamplighter',new Rng(seed)));
  const p=headlessPresenter(seed);
  const fights:unknown[]=[], hubs:unknown[]=[];
  p.combat=async(r,setup)=>{
    equip(r);
    const before={hull:r.ship.hull,reactor:r.ship.reactor,shields:r.ship.systems.shields?.level,weapons:r.ship.weapons,
      weaponsLevel:r.ship.systems.weapons?.level,crew:r.ship.crew.length,payloads:r.inv.payloads,salvage:r.inv.salvage};
    const sim=new Sim(r.ship,r.inv,setup);
    autoFight(sim,{fleeAt:setup.boss?0:.15},900);
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
      hull:result.ship.hull,crew:result.ship.crew.length,seconds:result.stats.seconds});
    return result;
  };
  p.store=async r=>{
    const stock=storeHere(r);
    repairHullAt(r,stock,'all');
    while(r.inv.ttl<8&&buySupply(r,stock,'ttl').ok){}
    equip(r);
    for(const id of [...r.ship.cargo]) sellItem(r,id);
    const available=stock.items.map((it,index)=>({it,index})).filter(({it})=>it.kind==='weapon'&&!it.sold)
      .sort((a,b)=>value(b.it.id as WeaponId,r)-value(a.it.id as WeaponId,r));
    for(const {it,index} of available) {
      const weapons=r.ship.weapons.filter(Boolean) as WeaponId[];
      const worst=weapons.length<r.ship.weaponSlots?0:Math.min(...weapons.map(w=>value(w,r)));
      if(value(it.id as WeaponId,r)>worst*1.2&&r.inv.salvage>=it.price+10){buyItem(r,stock,index);equip(r);for(const id of [...r.ship.cargo])sellItem(r,id);}
    }
    while(r.ship.weapons.some(w=>w&&WEAPONS[w].ammo)&&r.inv.payloads<5&&buySupply(r,stock,'payloads').ok){}
    const hire=stock.items.findIndex(it=>it.kind==='crew'&&!it.sold&&it.price<r.inv.salvage-30);
    if(r.ship.crew.length<4&&hire>=0)buyItem(r,stock,hire);
  };
  p.choose=async(_r,view)=>{
    const legal=view.choices.filter(c=>c.enabled&&!c.hidden);
    // Visible blue options first, otherwise the first offered action. Never inspect hidden outcomes.
    return (legal.find(c=>c.blue)??legal[0]).index;
  };
  p.hub=async r=>{
    const cur=currentRelay(r);
    if(cur.type==='market')await p.store(r);
    upgrade(r);
    hubs.push({stage:r.stage,relay:cur.id,hull:r.ship.hull,salvage:r.inv.salvage,earned:r.stats.salvageEarned,spent:r.stats.salvageSpent});
    if(r.inv.ttl<=0)return {kind:'wait'};
    const dist=hopDistances(r.map.relays,r.map.exit);
    const options=cur.links.filter(j=>canHop(r,j).ok);
    if(!options.length)throw new Error(`No route for ${seed}`);
    const scored=options.map(j=>{
      const next=r.map.relays[j];
      const visible=knowledge(r,next)==='type';
      let score=dist[cur.id]-dist[j];
      if(isSealed(r.map,next))score-=100;
      if(next.visited)score-=8;
      if(r.inv.ttl>dist[j]+2&&hopsUntilSealed(r.map,cur)>1)score+=(next.visited?0:5);
      if(visible&&next.type==='market')score+=r.ship.hull<22||r.inv.salvage>65?7:1;
      if(visible&&next.type==='bench'&&r.ship.hull<24)score+=4;
      if(visible&&next.type==='combat'&&r.ship.hull>22)score+=4;
      return {j,score};
    }).sort((a,b)=>b.score-a.score);
    if(scored[0].j===r.map.exit)upgrade(r,true);
    return {kind:'hop',to:scored[0].j};
  };
  let outcome:string;
  try {outcome=await playVoyage(run,p,{prologue:true});} catch(error) {
    if(!String(error).includes('Policy timeout:'))throw error;
    outcome='policy-timeout';p.log.problems.push(String(error));
  }
  const row={seed,outcome,stage:run.stage,cleared:run.stagesCleared,earned:run.stats.salvageEarned,
    spent:run.stats.salvageSpent,relays:run.stats.relaysVisited,fights,hubs,problems:p.log.problems};
  rows.push(row);
  console.log(JSON.stringify({seed,outcome,stage:run.stage,earned:row.earned,spent:row.spent,relays:row.relays,lastFight:fights.at(-1)}));
}
const summary={runs:rows.length,victories:rows.filter(r=>r.outcome==='victory').length,
  timeouts:rows.filter(r=>r.outcome==='policy-timeout').length,reached:[1,2,3].map(s=>rows.filter(r=>r.stage>=s).length),policy:'Real combat; visible blue/first choices; safe unvisited relays; legal purchases, resale, repairs and upgrades; weapon savings reserve; retreat from prolonged fights; no synthetic grants or forced wins.'};
console.log(JSON.stringify(summary));
if(out)writeFileSync(out,JSON.stringify({summary,rows},null,2));
