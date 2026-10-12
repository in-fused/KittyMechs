import {writeFileSync,mkdirSync} from 'node:fs';
import {buildOverhaulDistrict} from '../shared/overhaulDistrict';
import {rainlineStreetPlacements,RAINLINE_STREET_PREFIX} from '../shared/rainlineStreetAdmission';
import source from '../shared/data/rainlineStreetAdmission001.json' with {type:'json'};
const district=buildOverhaulDistrict(7734)!;
const proposed=district.blocks.filter(b=>b.id.includes(':population002:'));
const overlap=(a:number,ah:number,b:number,bh:number)=>Math.min(a+ah,b+bh)-Math.max(a-ah,b-bh);
const blockers:object[]=[];
for(const prop of proposed){
 const [x,y,z]=prop.position,[hx,hy,hz]=prop.halfExtents;
 if(x-hx<district.grading.minX||x+hx>district.grading.maxX||z-hz<district.grading.minZ||z+hz>district.grading.maxZ)blockers.push({id:prop.id,kind:'outside-graded-district'});
 for(const b of district.blocks){
  if(b.id===prop.id||b.id.startsWith(RAINLINE_STREET_PREFIX)&&b.id.includes(':population002:')&&b.id<prop.id)continue;
  // All authored proposed and current district blocks here use yaw0. Other
  // rotated solids are explicitly not covered by this preparation check.
  if(b.yaw!==0)continue;
  if(overlap(x,hx,b.position[0],b.halfExtents[0])>.005&&overlap(y,hy,b.position[1],b.halfExtents[1])>.005&&overlap(z,hz,b.position[2],b.halfExtents[2])>.005)blockers.push({id:prop.id,other:b.id,kind:'static-solid-overlap'});
 }
}
const originalStable=JSON.stringify(rainlineStreetPlacements.slice(0,source.placements.length))===JSON.stringify(source.placements);
const report={createdUTC:new Date().toISOString(),scope:'Preparation only: original placement identity, graded bounds, axis-aligned static solid overlap. No native support, route or art approval.',originalStable,originalCount:source.placements.length,additionalCount:proposed.length,uniqueModules:new Set(rainlineStreetPlacements.map(p=>p.module)).size,blockers};
const folder='.sites-runtime/overhaul-20261010/rainline-population-002';mkdirSync(folder,{recursive:true});writeFileSync(folder+'/placement-preparation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
if(!originalStable||blockers.length)process.exitCode=1;
