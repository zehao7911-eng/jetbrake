import assert from 'node:assert/strict';
import * as C from './core.mjs';
const p=C.profile();
const result=[];
for(const [i,site] of C.sites.entries()) {
  assert(C.unlocked(p,i));
  const fresh=C.newDrop(i);
  assert.equal(C.step(fresh,true),null);
  const crash=C.newDrop(i);
  assert(C.begin(crash));
  while(crash.phase==='fall') C.step(crash,false);
  assert.equal(crash.phase,'crash');
  const early=C.newDrop(i);
  C.begin(early);
  while(early.phase==='fall') C.step(early,true);
  assert.equal(early.phase,'crash');
  const candidates=[];
  for(let margin=.9;margin<=5;margin+=.2){
    const d=C.newDrop(i);
    C.begin(d);
    for(let tick=0;tick<6000&&d.phase==='fall';tick++){
      const held=d.alt<C.brakingDistance(d)+margin && d.speed>site.soft-1;
      C.step(d,held);
      if(tick===70){
        const restored=C.restore(JSON.parse(JSON.stringify(d)),p);
        assert.equal(restored.phase,'paused');
        assert(C.begin(restored));
        assert.deepEqual(restored,d);
      }
    }
    if(d.stars===3)candidates.push([Number(margin.toFixed(2)),Number(d.speed.toFixed(2)),Number(d.fuel.toFixed(2))]);
  }
  assert(candidates.length>=3,site.name+' must have multiple perfect braking schedules');
  p.best[i]=3;
  result.push([site.name,candidates.length,candidates[Math.floor(candidates.length/2)]]);
}
assert.equal(C.total(p),18);
console.log(JSON.stringify(result));
