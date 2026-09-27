import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, claimRelayStores, RELAY_STORES, advanceStage } from './run.ts';
import { currentRelay } from './model.ts';
import { serialize, deserialize } from './savegame.ts';
import { loadContent, testShip } from './testkit.ts';
import { runEncounter } from './voyage.ts';
import { headlessPresenter } from './headless.ts';

before(async()=>{await loadContent();});

test('maintenance stores pay once per cleared relay, including after save and restore',async()=>{
  const run=createRun(771,testShip());
  run.pos=run.map.relays.find(r=>r.type!=='start'&&r.type!=='exit')!.id;
  const relay=currentRelay(run);
  relay.eventId=undefined; // Resolve a cleared empty connection through the real encounter bridge.
  const before=run.inv.salvage;
  assert.equal(claimRelayStores(run),0,'arrival alone does not earn the stores');
  assert.equal(await runEncounter(run,headlessPresenter(771)), 'done');
  assert.equal(run.inv.salvage,before+RELAY_STORES[1]);
  assert.equal(run.stats.salvageEarned,RELAY_STORES[1]);
  const back=deserialize(serialize(run))!;
  assert.ok(back);
  assert.equal(currentRelay(back).serviceSalvage,RELAY_STORES[1]);
  assert.equal(claimRelayStores(back),0,'revisits and restored saves cannot farm stores');
  assert.equal(back.inv.salvage,run.inv.salvage);
});

test('start, exit, unfinished and sealed relays never award maintenance stores',()=>{
  const run=createRun(772,testShip());
  assert.equal(claimRelayStores(run),0);
  run.pos=run.map.exit;
  currentRelay(run).resolved=true;
  assert.equal(claimRelayStores(run),0);
  run.pos=run.map.relays.find(r=>r.type!=='start'&&r.type!=='exit')!.id;
  assert.equal(claimRelayStores(run),0);
  currentRelay(run).resolved=true;
  currentRelay(run).sealedVisit=true;
  assert.equal(claimRelayStores(run),0);
  currentRelay(run).sealedVisit=false;
  run.map.sealX=currentRelay(run).x+1;
  assert.equal(claimRelayStores(run),0);
  assert.equal(run.stats.salvageEarned,0);
});

test('later-stage maintenance stores follow the actual stage and cannot reuse earlier claims',()=>{
  const run=createRun(773,testShip());
  for(const stage of [1,2,3] as const) {
    if(stage>1)advanceStage(run);
    run.pos=run.map.relays.find(r=>r.type!=='start'&&r.type!=='exit')!.id;
    currentRelay(run).resolved=true;
    assert.equal(claimRelayStores(run),RELAY_STORES[stage]);
    assert.equal(claimRelayStores(run),0);
  }
  assert.equal(run.stats.salvageEarned,108);
});

test('exchanges always stock an affordable class of ammo-free weapon for their stage',async()=>{
  const {rollStock}=await import('./store.ts');
  const {catalog}=await import('./catalog.ts');
  const {WEAPONS}=await import('../data/weapons.ts');
  const dependable={1:['packet-laser','burst-emitter'],2:['triple-burst','jumbo-frame-ii'],3:['triple-burst','jumbo-frame-ii','multicast-array']};
  for(let seed=1;seed<=60;seed++) {
    const run=createRun(seed,testShip());
    for(const stage of [1,2,3] as const) {
      if(stage>1)advanceStage(run);
      const stock=rollStock(run,1);
      assert.ok(stock.items.some(it=>it.kind==='weapon'&&dependable[stage].includes(it.id)));
      for(const it of stock.items.filter(it=>it.kind==='weapon')) {
        assert.ok((catalog.weapons[it.id as keyof typeof WEAPONS].minStage??1)<=stage);
      }
      assert.deepEqual(rollStock(run,1),stock,'stock remains deterministic');
    }
  }
});
