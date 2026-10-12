import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Navigation} from '../shared/navigation.ts';
import {cityDistrict,cityBlockActive} from '../shared/cityDistrict.ts';
import {getMap} from '../shared/maps.ts';
import {OverhaulEncounter} from '../shared/overhaulEncounter.ts';
const source=process.argv[2]??'.sites-runtime/overhaul-20261009/mission-014/evidence.json',output=resolve(process.argv[3]??'.sites-runtime/overhaul-20261009/bot-cpu-001'),selected=process.argv[4]===undefined?null:Number(process.argv[4]);
await mkdir(output,{recursive:true});
const evidence=JSON.parse(await readFile(source,'utf8')),event=evidence.events.reduce((best,event)=>Math.abs(event.host.snapshot.tick-5049)<Math.abs(best.host.snapshot.tick-5049)?event:best),snapshot=event.host.snapshot,district=cityDistrict(snapshot.seed),map=getMap(snapshot.seed),encounter=new OverhaulEncounter();
for(const actor of snapshot.actors.filter(a=>a.bot)){
 const index=Number(actor.id.split('-')[1]),authored=district.npcs.find(n=>n.id===actor.id),spawn=authored?.position??(map.enemySpawns[index]?{x:map.enemySpawns[index][0],y:actor.position.y,z:map.enemySpawns[index][1]}:actor.position);
 encounter.register({...actor,position:spawn});
}
const navigation=new Navigation(snapshot.seed),rows=[],targets=snapshot.actors.filter(a=>!a.bot&&a.hp>0);navigation.setStructureFilter(b=>cityBlockActive(b,snapshot.structures));navigation.setPropFilter(p=>!p.id||(snapshot.cover.find(c=>c.id===p.id)?.hp??1)>0);
const result={scope:'Pure route-query identification fixture; retained live bot poses, current source geometry and recorded structural damage. Home/target query hypotheses are not a reconstruction of private bot memory or actual ordinary play.',source,label:event.label,tick:snapshot.tick,witnessTick:5049,seed:snapshot.seed,districtCells:district.blocks.length,actorCount:snapshot.actors.length,npcCount:snapshot.actors.filter(a=>a.bot).length,rows,status:'RUNNING'};
let caseIndex=0;
for(const actor of snapshot.actors.filter(a=>a.bot&&a.hp>0)){
 const goals=[{kind:'home',position:encounter.decision(actor.id).home},...targets.map(t=>({kind:'recorded-human-'+t.name,position:encounter.constrainGoal(actor.id,t.position)}))];
 for(const goal of goals){
  const index=caseIndex++;if(selected!==null&&index!==selected)continue;
  // Geometry filters invalidate cell/path caches exactly as accepted structural
  // damage does. Seeded prop descriptors remain warm, matching that invalidation.
  navigation.setStructureFilter(b=>cityBlockActive(b,snapshot.structures));let trace;navigation.onPathTiming=row=>{trace=row;};
  const cpu=process.cpuUsage(),at=performance.now(),path=navigation.path(actor.position,goal.position),spent=process.cpuUsage(cpu);
  rows.push({index,actor:actor.id,role:actor.role,aiState:actor.aiState,kind:goal.kind,elapsedMs:performance.now()-at,cpuMs:(spent.user+spent.system)/1000,path,trace});
  await writeFile(resolve(output,'progress.json'),JSON.stringify(result,null,2));console.log(actor.id,goal.kind,rows.at(-1).elapsedMs.toFixed(2),trace.grids.map(g=>g.comparisons).join(','));
 }
}
result.status='PATH_FIXTURE_REVIEW_REQUIRED';await writeFile(resolve(output,'evidence.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({output,status:result.status,queries:rows.length,maxMs:Math.max(...rows.map(r=>r.elapsedMs))}));
