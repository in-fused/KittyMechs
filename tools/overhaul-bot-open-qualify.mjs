import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {Navigation} from '../shared/navigation.ts';
import {cityBlockActive,cityDistrict} from '../shared/cityDistrict.ts';
const output=resolve('.sites-runtime/overhaul-20261009/bot-cpu-002/qualification');await mkdir(output,{recursive:true});
const {Navigation:Before}=await import(pathToFileURL(resolve('.sites-runtime/overhaul-20261009/bot-cpu-002/navigation-before.ts')).href),fixture=JSON.parse(await readFile('.sites-runtime/overhaul-20261009/bot-cpu-001/evidence.json','utf8')),source=JSON.parse(await readFile(fixture.source,'utf8')),snapshot=source.events.find(e=>e.label===fixture.label).host.snapshot;
const queries=[1,14,25].map(index=>{const q=fixture.rows[index];return {actor:q.actor,kind:q.kind,from:q.trace.from,to:q.trace.to,snapshot};});
const latest=JSON.parse(await readFile('.sites-runtime/overhaul-20261009/mission-018/authority-after-close.json','utf8')),actual=latest.diagnostics.rooms.find(r=>r.room==='AB0F16').latest['slowest-navigation'],mission=JSON.parse(await readFile('.sites-runtime/overhaul-20261009/mission-018/evidence.json','utf8')),before=mission.events.filter(e=>e.host.snapshot.tick<=actual.tick).at(-1).host.snapshot,after=mission.events.find(e=>e.host.snapshot.tick>=actual.tick).host.snapshot;
const geometryState=s=>s.structures.map(v=>({id:v.id,brokenMask:v.brokenMask,intact:v.hp.map(h=>h>0)}));assert.deepEqual(geometryState(before),geometryState(after));
queries.push({actor:actual.actor,kind:'actual-mission018-slowest-query',from:{x:actual.fromX,y:actual.fromY,z:actual.fromZ},to:{x:actual.toX,y:actual.toY,z:actual.toZ},snapshot:after,witnessTick:actual.tick,geometryBracket:[before.tick,after.tick]});
const rows=[];
for(const query of queries){
 const baseline=new Before(fixture.seed),candidate=new Navigation(fixture.seed),samples=[];
 for(const nav of [baseline,candidate])nav.setPropFilter(p=>!p.id||(query.snapshot.cover.find(c=>c.id===p.id)?.hp??1)>0);
 for(let n=0;n<3;n++)for(const [kind,nav] of [['before',baseline],['after',candidate]]){
  nav.setStructureFilter(b=>cityBlockActive(b,query.snapshot.structures));let trace;nav.onPathTiming=row=>{trace=row;};const cpu=process.cpuUsage(),at=performance.now(),path=nav.path(query.from,query.to),spent=process.cpuUsage(cpu);samples.push({kind,n,elapsedMs:performance.now()-at,cpuMs:(spent.user+spent.system)/1000,path,trace});
 }
 for(let n=0;n<3;n++){
  const a=samples.find(s=>s.kind==='after'&&s.n===n),b=samples.find(s=>s.kind==='before'&&s.n===n);assert.deepEqual(a.path,b.path);assert.deepEqual(a.trace.grids.map(g=>g.explored),b.trace.grids.map(g=>g.explored));assert.equal(a.trace.freeMisses,b.trace.freeMisses);assert.equal(a.trace.pointCalls,b.trace.pointCalls);
 }
 const values=(kind,field)=>samples.filter(s=>s.kind===kind).map(s=>s[field]).sort((a,b)=>a-b),summary={beforeMedianMs:values('before','elapsedMs')[1],afterMedianMs:values('after','elapsedMs')[1],beforeMaxMs:values('before','elapsedMs')[2],afterMaxMs:values('after','elapsedMs')[2],beforeCpuMedianMs:values('before','cpuMs')[1],afterCpuMedianMs:values('after','cpuMs')[1]};
 rows.push({...query,snapshot:undefined,snapshotTick:query.snapshot.tick,samples,summary});console.log(query.actor,JSON.stringify(summary));
}
await writeFile(resolve(output,'evidence.json'),JSON.stringify({scope:'Four retained queries × three cold-occupancy repeats. Current1123cell source, original rates/search bound/damage predicates. Exact paths, expanded cells, occupancy misses and point calls asserted. Actual018 endpoints/5049; navigation-relevant structural state equal between bracketing retained snapshots. Not a simulation/private-brain replay or ordinary frame-pacing acceptance.',districtCells:cityDistrict(fixture.seed).blocks.length,rows,status:'EXACT_ROUTE_EQUIVALENCE_PASSED'},null,2));
