import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {Navigation} from '../shared/navigation.ts';
import {cityBlockActive} from '../shared/cityDistrict.ts';
const output=resolve('.sites-runtime/overhaul-20261009/bot-cpu-qualification-001');await mkdir(output,{recursive:true});
const {Navigation:Before}=await import(pathToFileURL(resolve('.sites-runtime/overhaul-20261009/bot-cpu-001/navigation-before.ts')).href),fixture=JSON.parse(await readFile('.sites-runtime/overhaul-20261009/bot-cpu-001/evidence.json','utf8')),source=JSON.parse(await readFile(fixture.source,'utf8')),snapshot=source.events.find(e=>e.label===fixture.label).host.snapshot,rows=[];
for(const index of [1,14,25]){
 const query=fixture.rows[index],before=new Before(fixture.seed),after=new Navigation(fixture.seed),samples=[];
 for(const nav of [before,after])nav.setPropFilter(p=>!p.id||(snapshot.cover.find(c=>c.id===p.id)?.hp??1)>0);
 for(let n=0;n<3;n++)for(const [kind,nav] of [['before',before],['after',after]]){
  nav.setStructureFilter(b=>cityBlockActive(b,snapshot.structures));let trace;nav.onPathTiming=row=>{trace=row;};const cpu=process.cpuUsage(),at=performance.now(),path=nav.path(query.trace.from,query.trace.to),spent=process.cpuUsage(cpu);samples.push({kind,n,elapsedMs:performance.now()-at,cpuMs:(spent.user+spent.system)/1000,path,trace});
 }
 for(let n=0;n<3;n++)assert.deepEqual(samples.find(s=>s.kind==='after'&&s.n===n).path,samples.find(s=>s.kind==='before'&&s.n===n).path);
 rows.push({actor:query.actor,kind:query.kind,from:query.trace.from,to:query.trace.to,samples});console.log(query.actor,query.kind,samples.map(s=>s.kind+':'+s.elapsedMs.toFixed(1)).join(' '));
}
const summary=rows.map(row=>{const values=kind=>row.samples.filter(s=>s.kind===kind).map(s=>s.elapsedMs).sort((a,b)=>a-b);return {actor:row.actor,kind:row.kind,beforeMaxMs:Math.max(...values('before')),afterMaxMs:Math.max(...values('after')),beforeMedianMs:values('before')[1],afterMedianMs:values('after')[1]};});
await writeFile(resolve(output,'evidence.json'),JSON.stringify({scope:'Three retained real-pose route queries, three cold-occupancy repeats before/after; exact route sequence equality. Same1123cell source/filter and unchanged search/physics. Not ordinary gameplay acceptance.',source:fixture.source,tick:fixture.tick,rows,summary,status:'ROUTE_EQUIVALENCE_REVIEW_REQUIRED'},null,2));console.log(JSON.stringify({output,summary}));
