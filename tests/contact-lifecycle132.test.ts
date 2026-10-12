import {describe,expect,it} from 'vitest';
import {Bone,BufferGeometry,Float32BufferAttribute,Group,MeshBasicMaterial,Skeleton,SkinnedMesh,Uint16BufferAttribute,Vector3} from 'three';
import records from '../assets/source/overhaul-pounce-anatomy-121/authored-motion-records.json';
import {MovingRFeet067} from '../src/game/entities/movingRFfeet067';
import type {GroundSupport067} from '../src/game/entities/groundSupport067';
import type {AuthoredGait123,FootfallContributor123} from '../src/game/entities/authoredFootfalls123';

// Directed owner/skin fixture, not a native collision or production-pose proof.
// Actual121 phase/duty metadata drives the policy; the support is an explicit
// unit plane. The existing public-play gate must still inspect native receipts.
function contribution(name:string,phase:number,weight=1):FootfallContributor123{
 const row=records.find(r=>r.name===name)!;
 const gait:AuthoredGait123={nativeDistancePerCycle:row.nativeDistancePerCycle!,cycleStart:row.cycleStart,cycleEnd:row.cycleEnd,sourceDuty:row.sourceDuty!,sourceOffsets:row.sourceOffsets! as AuthoredGait123['sourceOffsets'],unloadedLimbs:row.kind.startsWith('upright')?['FL','FR']:[]};
 return {name,phase,weight,gait};
}
function fixture(){
 const model=new Group(),bones:Bone[]=[];
 for(const [i,limb] of ['FL','FR','HL','HR'].entries()){
  const upper=new Bone(),lower=new Bone(),paw=new Bone();upper.name=limb+'_upper';lower.name=limb+'_lower';paw.name=limb+'_paw';upper.position.set(i*2,1,0);lower.position.set(0,-.45,.18);upper.add(lower);
  if(limb.startsWith('H')){const hock=new Bone();hock.name=limb+'_hock';hock.position.set(0,-.2,-.08);paw.position.set(0,-.25,-.10);lower.add(hock);hock.add(paw);bones.push(hock);}else{paw.position.set(0,-.45,-.18);lower.add(paw);}
  model.add(upper);bones.push(upper,lower,paw);model.updateMatrixWorld(true);
  const x=i*2,geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute([x-.1,.1,-.1,x+.1,.1,-.1,x-.1,.1,.1,x+.1,.1,.1],3)).setAttribute('skinIndex',new Uint16BufferAttribute(new Array(16).fill(0),4)).setAttribute('skinWeight',new Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],4));
  const mesh=new SkinnedMesh(geometry,new MeshBasicMaterial());model.add(mesh);model.updateMatrixWorld(true);mesh.bind(new Skeleton([paw]),mesh.matrixWorld.clone());
 }
 const diagnostic={generation:0,queries:0,lastReason:null,frameClock:0,presentationTime:0,life:1,inventoryBuilds:0};
 const support={diagnostic,begin(){diagnostic.queries=0;},validate(){return true;},probe(p:Vector3){diagnostic.queries++;const lease={worldKey:'UNIT_PLANE',generation:0,life:1,ownerKey:'UNIT_PLANE',colliderHandle:0,shapePoseKey:'UNIT_PLANE'};return {point:new Vector3(p.x,.08,p.z),normal:new Vector3(0,1,0),colliderHandle:0,worldKey:lease.worldKey,shapePoseKey:lease.shapePoseKey,lease};}} as GroundSupport067;
 const owner=new MovingRFeet067(model,support),immutable=bones.map(b=>({p:b.position.toArray(),s:b.scale.toArray()}));
 let frame=0;
 const step=(x:number,footfalls:FootfallContributor123[])=>{
  owner.restoreSource();model.position.x=x;model.updateWorldMatrix(true,true);
  owner.step({time:frame/60,frameClock:frame,life:1,reset:frame===0,grounded:true,eligible:true,stance:0,phase:footfalls[0].phase!,footfalls,rootPosition:new Vector3(x,0,0),rootYaw:0});frame++;
  expect(bones.map(b=>({p:b.position.toArray(),s:b.scale.toArray()}))).toEqual(immutable);
  return owner.diagnostic.feet;
 };
 return {owner,step,bones};
}
describe('132 authored plant lifecycle (UNRUN until source admission)',()=>{
 it('acquires a short gallop plant immediately and keeps its final marker/skin fixed through signed travel',()=>{
  const f=fixture();
  for(const [x,phase] of [[0,.50],[.02,.52],[-.02,.51]]){
   const foot=f.step(x,[contribution('FelineGallop',phase)]).find(r=>r.limb==='FL')!;
   expect(foot.mode).toBe('stance');expect(foot.effectiveWeight).toBe(1);expect(foot.error).toBeLessThanOrEqual(1e-4);
   expect(foot.target![0]).toBeCloseTo(0,7);
   for(const point of foot.skinWitness.points)expect(Math.abs(point.supportNormalGap!)).toBeLessThanOrEqual(1e-4);
  }
 });
 it('retires an unreachable anchor, then reacquires current support without carrying the failed task',()=>{
  const f=fixture();f.step(0,[contribution('FelineGallop',.50)]);
  const failed=f.step(3,[contribution('FelineGallop',.51)]).find(r=>r.limb==='FL')!;
  expect(failed.mode).toBe('free');expect(failed.reason).toBe('AUTHORED_STANCE_UNREACHABLE_RETIRED');
  expect(failed.support).toBeNull();expect(failed.taskTarget).toBeNull();expect(failed.effectiveWeight).toBe(0);
  const fresh=f.step(3,[contribution('FelineGallop',.52)]).find(r=>r.limb==='FL')!;
  expect(fresh.mode).toBe('stance');expect(fresh.target![0]).toBeCloseTo(3,7);expect(fresh.error).toBeLessThanOrEqual(1e-4);
 });
 it('positive R unloading and actual gallop suspension immediately surrender the previously solved joints',()=>{
  const f=fixture();f.step(0,[contribution('FelineGallop',.50)]);
  const rows=f.step(.02,[contribution('FelineWalk',.05,.999),contribution('FelineUprightStride',.05,.001)]);
  for(const row of rows.filter(r=>r.limb.startsWith('F'))){expect(row.mode).toBe('unloaded');expect(row.support).toBeNull();expect(row.effectiveWeight).toBe(0);expect(row.marker).toEqual(row.sourceMarker);}
  const suspended=f.step(.02,[contribution('FelineGallop',.42)]);
  for(const row of suspended){expect(row.mode).toBe('swing');expect(row.support).toBeNull();expect(row.marker).toEqual(row.sourceMarker);}
 });
});
