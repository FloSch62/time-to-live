// Read a completed real-voyage cohort; never changes its evidence or campaign state.
import { readFileSync } from 'node:fs';
const files=process.argv.slice(2);
if(!files.length)throw new Error('Usage: node tools/balance/summarize.mjs <cohort.json> [...]');
const sum=(rows,key)=>rows.reduce((n,r)=>n+(r[key]??0),0);
const mean=(rows,key)=>Math.round(sum(rows,key)/Math.max(1,rows.length)*10)/10;
for(const file of files){
  const data=JSON.parse(readFileSync(file,'utf8'));
  const rows=data.rows;
  const report={file,sourceHash:data.summary.sourceHash,runs:rows.length,seedOffset:data.summary.seedOffset,seeds:data.summary.seedsRequested,
    modes:['easy','medium','hard'].map(difficulty=>{
      const rs=rows.filter(r=>r.difficulty===difficulty);
      return {difficulty,runs:rs.length,wins:rs.filter(r=>r.outcome==='victory').length,
        rate:Math.round(1000*rs.filter(r=>r.outcome==='victory').length/rs.length)/10,
        deathsByStage:[1,2,3].map(stage=>rs.filter(r=>r.stage===stage&&r.outcome!=='victory').length),
        finalEnemy:Object.fromEntries(Object.entries(rs.filter(r=>r.outcome!=='victory').reduce((out,r)=>{const id=r.fights.at(-1)?.enemy??'event';out[id]=(out[id]??0)+1;return out},{})).sort((a,b)=>b[1]-a[1])),
        meanEarned:mean(rs,'earned'),meanSpent:mean(rs,'spent'),meanRemaining:mean(rs,'remaining'),
        medianFights:rs.map(r=>r.fights.length).sort((a,b)=>a-b)[Math.floor(rs.length/2)],
        meanOrdinaryFights:[0,1,2].map(s=>Math.round(10*rs.reduce((n,r)=>n+r.ordinaryFights[s],0)/rs.length)/10),
        carPurchases:rs.reduce((n,r)=>n+r.purchases.filter(p=>p.kind==='car').length,0),
        runsBuyingCar:rs.filter(r=>r.purchases.some(p=>p.kind==='car')).length,
        winsBuyingCar:rs.filter(r=>r.outcome==='victory'&&r.purchases.some(p=>p.kind==='car')).length,
        adverseEvents:rs.reduce((n,r)=>n+r.losses.length,0),timeouts:rs.filter(r=>r.outcome==='policy-timeout').length};
    }),matrix:data.summary.matrix,
    wagons:Object.fromEntries(rows.flatMap(r=>r.purchases).filter(p=>p.kind==='car').reduce((out,p)=>out.set(p.id,(out.get(p.id)??0)+1),new Map())),
  };
  console.log(JSON.stringify(report,null,2));
}
