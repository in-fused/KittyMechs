import RAPIER from '@dimforge/rapier3d-compat';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Simulation} from '../shared/simulation.ts';
import {cityDistrict,cityBlockActive} from '../shared/cityDistrict.ts';
const output=resolve('.sites-runtime/overhaul-20261009/roof-domain-001');await mkdir(output,{recursive:true});await RAPIER.init();
const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'coop'),actor=sim.actors.get('roof-guardian'),home={...actor.position},original={x:-34.037769057006145,y:11.940099705950589,z:-60.797690398593836},oldGoal={x:-34,y:11.92,z:-60.5},from={...home,y:home.y+.02,z:home.z+1.7},samples=[],postLoss=[];world.step();
try{
 for(let n=0;n<3;n++){
  const states=sim.snapshot().structures;sim.navigation.setStructureFilter(block=>cityBlockActive(block,states));let trace;sim.navigation.onPathTiming=t=>{trace=t;};let at=performance.now(),cpu=process.cpuUsage(),path=sim.navigation.path(original,oldGoal),spent=process.cpuUsage(cpu);samples.push({n,kind:'original-wrong-ground-domain',elapsedMs:performance.now()-at,cpuMs:(spent.user+spent.system)/1000,path,trace});
  for(const [kind,position,goal] of [['original-native-occupied',original,oldGoal],['corrected-native-supported-corridor',from,home]]){at=performance.now();cpu=process.cpuUsage();const proof=sim.localRoofRoute({...actor,position},goal);spent=process.cpuUsage(cpu);samples.push({n,kind,elapsedMs:performance.now()-at,cpuMs:(spent.user+spent.system)/1000,proof});}
 }
 const deck=cityDistrict(7734).blocks.find(b=>b.id.endsWith('west-relay-yard:roof-0'));sim.damageCell(deck,10000,'controlled-native-fixture',home,{x:0,y:0,z:0},{x:0,y:1,z:0});
 for(let n=0;n<=96;n++){if(n%16===0){const support=world.castRay(new RAPIER.Ray({...actor.position,y:actor.position.y-1+.12},{x:0,y:-1,z:0}),.6,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);postLoss.push({steps:n,tick:sim.tick,position:{...actor.position},grounded:actor.grounded,hp:actor.hp,aiState:actor.aiState,localProof:sim.localRoofRoute(actor,home),nativeCenterSupport:support?{handle:support.collider.handle,ownedRuin:sim.ruinsOwner.owns(support.collider.handle),dynamic:support.collider.parent()?.isDynamic()??false,toi:support.timeOfImpact}:null});}if(n<96)sim.step(1/60);}
 await writeFile(resolve(output,'evidence.json'),JSON.stringify({scope:'Native controlled geometry/damage/query qualification,12NPCs and full3.2h/2.2r anchor. Original failure retained; original query ground-grid timings vs explicit native rejection and corrected supported route. No exact full-live brain/cache replay, ordinary weapon/UI or60Hz acceptance.',districtCells:cityDistrict(7734).blocks.length,npcCount:[...sim.actors.values()].filter(a=>a.bot).length,home,original,oldGoal,from,samples,postLoss,status:'NATIVE_CONTROLLED_REVIEW_REQUIRED'},null,2));console.log(JSON.stringify({output,samples:samples.map(s=>({n:s.n,kind:s.kind,elapsedMs:s.elapsedMs,status:s.proof?.status})),postLoss}));
}finally{sim.dispose();world.free();}
