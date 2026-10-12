import {describe,expect,it} from 'vitest';
import {writeFileSync} from 'node:fs';
import {AnimationMixer,AnimationUtils,Group,Vector3,type Bone} from 'three';
import manifest from '../src/game/entities/identity57Runtime121Manifest.json';
import {loadRig143} from '../tools/overhaul-locomotion-143/load-rig143';
import {LocomotionTasks143,offGaits143,selectedGaits143,solveBodyLoad143} from '../src/game/entities/locomotionTasks143';
import {selectedFootfalls123,type AuthoredGait123} from '../src/game/entities/authoredFootfalls123';
import type {GroundSupport067} from '../src/game/entities/groundSupport067';
const cases143:unknown[]=[];

function plane143(){const d={generation:0,queries:0,lastReason:null,frameClock:0,presentationTime:0,life:1,inventoryBuilds:0};return {diagnostic:d,begin(frameClock:number,time:number,life:number){Object.assign(d,{frameClock,presentationTime:time,life,queries:0});},validate(){return true;},probe(p:Vector3){d.queries++;const lease={worldKey:'EXPLICIT_UNIT_PLANE',generation:0,life:d.life,ownerKey:'PLANE',colliderHandle:0,shapePoseKey:'PLANE'};return {point:new Vector3(p.x,0,p.z),normal:new Vector3(0,1,0),worldKey:lease.worldKey,colliderHandle:0,shapePoseKey:'PLANE',lease};}} as GroundSupport067;}
describe('143 source tasks and fixed-chain body load',()=>{
 it('intersects true inner and outer reach limits, rejects horizontal or competing impossibility',()=>{
  const a={hip:new Vector3(0,2,0),end:new Vector3(.5,0,0),minimum:.1,maximum:1.5};
  const load=solveBodyLoad143([a],0)!;expect(load).toBeLessThan(0);expect(a.hip.clone().add(new Vector3(0,load,0)).distanceTo(a.end)).toBeCloseTo(1.5,10);
  expect(solveBodyLoad143([{...a,end:new Vector3(2,0,0)}],0)).toBeNull();
  expect(solveBodyLoad143([a,{...a,hip:new Vector3(0,-2,0)}],0)).toBeNull();
  const folded={hip:new Vector3(),end:new Vector3(),minimum:1,maximum:2};expect(Math.abs(solveBodyLoad143([folded],0)!)).toBe(1);
 });
 it('crosses both bands continuously without changing native stride intent',()=>{
  for(const edge of [.16,.52,.88]){const a=selectedGaits143(edge*7.6-1e-5,7.6,0),b=selectedGaits143(edge*7.6+1e-5,7.6,0);for(const name of ['FelineWalk','FelineTrot','FelineGallop'])expect(Math.abs((a.find(c=>c.name===name)?.weight??0)-(b.find(c=>c.name===name)?.weight??0))).toBeLessThan(1e-4);}
  expect(selectedGaits143(3,7.6,1).every(c=>c.name.includes('Upright'))).toBe(true);
 });
 for(const rig of ['OFF25','ON57'] as const)it(rig+' actual decoded locomotion, band/reverse/R and interruption preserve fixed local transforms',async()=>{
  const path=rig==='OFF25'?'public/assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb':'public'+manifest.publicURL;
  const {model,clips:raw}=await loadRig143(path),native=new Group(),mount=new Group();native.add(mount);mount.add(model);mount.rotation.y=Math.PI;mount.scale.setScalar(.8);
  const catalog:Record<string,{measuredGait?:AuthoredGait123;duration?:number}>=rig==='OFF25'?offGaits143(raw,.8):manifest.clips;
  const clips=raw.map(c=>{if(c.name!=='FelineTransitionArc106')return c;const a=c.clone(),record=manifest.clips.FelineTransitionBase106;AnimationUtils.makeClipAdditive(a,record.sampleInterval.start*60,raw.find(x=>x.name==='FelineTransitionBase106')!,60);return a;});
  const mixer=new AnimationMixer(model),actions=new Map(clips.map(c=>{const a=mixer.clipAction(c);a.play();a.paused=true;a.setEffectiveWeight(0);return[c.name,a] as const;}));model.updateMatrixWorld(true);
  const owner=new LocomotionTasks143(model,plane143(),clips,rig==='OFF25'?.98:1),bones:Bone[]=[];model.traverse(o=>{if((o as Bone).isBone)bones.push(o as Bone);});
  let tick=0;
  const step=(selection:{name:string;weight:number}[],phase:number,z:number,stance=0,eligible=true)=>{
   owner.restoreSource();mount.position.set(0,0,0);native.position.z=z;for(const a of actions.values())a.setEffectiveWeight(0);
   for(const c of selection){const a=actions.get(c.name)!,g=catalog[c.name].measuredGait!;a.time=g.cycleStart!+phase*(g.cycleEnd!-g.cycleStart!);a.setEffectiveWeight(c.weight);}
   if(rig==='ON57'&&stance>0&&stance<1){const a=actions.get('FelineTransitionArc106')!,r=manifest.clips.FelineTransitionArc106;a.time=r.sampleInterval.start+stance*(r.sampleInterval.end-r.sampleInterval.start);a.setEffectiveWeight(1);}
   mixer.update(0);model.updateWorldMatrix(true,true);const source=bones.map(b=>b.quaternion.toArray()),fixedSource=bones.map(b=>({name:b.name,p:b.position.toArray(),s:b.scale.toArray()})),footfalls=selectedFootfalls123(actions,catalog);
   owner.step({time:tick/60,frameClock:tick,life:1,reset:tick===0,grounded:true,eligible,stance,phase,footfalls,rootPosition:native.position,rootYaw:0},mount,[...actions].filter(([,a])=>a.getEffectiveWeight()>0).map(([name,a])=>({name,time:a.time,weight:a.getEffectiveWeight(),additive:name==='FelineTransitionArc106'})));tick++;
   cases143.push({rig,selection,phase,z,stance,eligible,failure:owner.diagnostic.firstFailure143,body:owner.diagnostic.bodyTask143,feet:owner.diagnostic.feet.map(r=>({limb:r.limb,mode:r.mode,source:r.sourceMarker,marker:r.marker,task:r.taskTarget,error:r.taskError,skinGaps:r.skinWitness.points.map(p=>p.supportNormalGap)}))});writeFileSync('tools/overhaul-locomotion-143/actual-source-cases143.json',JSON.stringify({writer:'CLOSED',provenance:'NUMERICAL_ACTUAL_DECODED_SOURCE_ON_EXPLICIT_UNIT_PLANE_NO_BROWSER_OR_NATIVE_CONTACT_CERTIFICATE',cases:cases143},null,2));
   expect(owner.diagnostic.firstFailure143,JSON.stringify({selection,phase,stance,body:owner.diagnostic.bodyTask143})).toBeNull();
   // Exact no-mutation check across the OWNER. The retained source's Float32
   // animated local keys need not equal its glTF rest arrays bit-for-bit.
   expect(bones.map(b=>({name:b.name,p:b.position.toArray(),s:b.scale.toArray()}))).toEqual(fixedSource);
   for(const row of owner.diagnostic.feet){expect(row.taskError).toBeLessThanOrEqual(1e-4);if(row.mode==='stance'){expect(row.error).toBeLessThanOrEqual(1e-4);expect(row.support).not.toBeNull();const gaps=row.skinWitness.points.map(p=>p.supportNormalGap!);expect(Math.min(...gaps)).toBeGreaterThanOrEqual(-1e-4);expect(Math.abs(Math.min(...gaps))).toBeLessThanOrEqual(1e-4);}}
   if(!eligible)expect(bones.map(b=>b.quaternion.toArray())).toEqual(source);
   return owner.diagnostic.feet;
  };
  // Fresh start at each actual gait phase is deliberate: body/plant admission
  // must work on the real source, not merely a hand-picked synthetic skeleton.
  for(const name of ['FelineWalk','FelineTrot','FelineGallop','FelineUprightWalkLong','FelineUprightStride'])for(const phase of [0,.12,.28,.48,.62,.82,.98]){
   owner.step({time:tick/60,frameClock:tick,life:1,reset:true,grounded:true,eligible:false,stance:0,phase:0,rootPosition:native.position,rootYaw:0},mount,[]);
   step([{name,weight:1}],phase,0,name.includes('Upright')?1:0);
  }
  for(const [speed,phase,z,stance] of [[1,.05,0,0],[2,.08,-.02,0],[3,.10,-.05,0],[4,.09,-.03,.2],[4,.07,0,.5],[4,.05,.03,.8],[4,.08,0,1],[4,.10,-.03,.5],[2,.12,-.04,0]])step(selectedGaits143(speed,7.6,stance),phase,z,stance);
  step([{name:'FelineWalk',weight:1}],.12,0,0,false);step([{name:'FelineWalk',weight:1}],.13,0);
  owner.dispose();mixer.stopAllAction();
 },30000);
});
