import {buildOverhaulDistrict} from '../../shared/overhaulDistrict';
import {rainlinePopulatedPlacements} from '../../shared/rainlineStreetPopulation002';
import {writeFileSync} from 'node:fs';
const district=buildOverhaulDistrict(7734)!;
const modules=['generator_skid','repair_trolley','cable_reel','covered_machine_pallet','stacked_industrial_cases','hydraulic_manifold'];
const placements=[];
for(const [pocket,x,z] of [['entry-west',-18,0],['entry-east',9,8],['relay-west',-13,-41],['relay-east',10,-26],['core-west',-13,-103],['core-east',11,-103]] as const){
 for(let i=0;i<3;i++){
  const module=modules[(placements.length)%modules.length],template=rainlinePopulatedPlacements.find(p=>p.module===module)!;
  const pivot=[x,-.08,z+(i-1)*2.6],center=pivot.map((v,a)=>v+template.center[a]),half=template.halfExtents;
  const collision=district.blocks.filter(b=>b.position[1]+b.halfExtents[1]>.2).find(b=>{const c=Math.abs(Math.cos(b.yaw)),s=Math.abs(Math.sin(b.yaw));const h=[c*b.halfExtents[0]+s*b.halfExtents[2],b.halfExtents[1],s*b.halfExtents[0]+c*b.halfExtents[2]];return center.every((v,a)=>Math.abs(v-b.position[a])<half[a]+h[a]+.25);});
  const approach=district.buildings.flatMap(b=>b.anchors).find(a=>Math.hypot(Math.max(0,Math.abs(center[0]-a.approach.x)-half[0]),Math.max(0,Math.abs(center[2]-a.approach.z)-half[2]))<2);
  const road=district.streets.find(r=>{const dx=center[0]-r.center.x,dz=center[2]-r.center.z,c=Math.cos(r.yaw),s=Math.sin(r.yaw);return Math.abs(dx*c-dz*s)<r.halfExtents.x+half[0]+1&&Math.abs(dx*s+dz*c)<r.halfExtents.z+half[2]+1;});
  if(collision||approach||road){console.log(JSON.stringify({rejected:pocket,i,collision:collision?.id,approach:approach?.id,road:road?.id}));continue;}
  placements.push({id:`street001:population030:${pocket}:${i}`,module,pivot,yaw:0});
 }
}
writeFileSync('tools/overhaul-root-round-026/street030-plan.json',JSON.stringify({placements,scope:'Conservative ground-space clearance against existing compiled blocks and facade approach centers; actual gameplay review still required.'},null,2));
console.log(JSON.stringify({accepted:placements.length,placements}));

