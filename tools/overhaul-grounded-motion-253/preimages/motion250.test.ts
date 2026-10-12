import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {Bone,Group,SkinnedMesh,Vector3} from 'three';
import {loadRig250} from './load-rig250';
import {SourceTask250} from './sourceTask250';
import {createGroundSupport067} from '../../src/game/entities/groundSupport067';
const output='tools/overhaul-grounded-motion-250/actual-cases250.json',evidence:any={status:'RUNNING',scope:'actual decoded 61 rig; constructed fixed Rapier floor/carrier cases, not native trajectory or browser gameplay',cases:[],firstFailure:null,counts:{frames:0,fulfilled:0,touch:0,release:0,independentChecks:0},maxSamePointError:0,maxMinDifference:0};
let last:any=null;
const deadline=setTimeout(()=>{evidence.status='TIMEOUT';void writeFile(output,JSON.stringify(evidence,null,2)).finally(()=>process.exit(1));},30000);
try{
 await RAPIER.init();const contract=JSON.parse(await readFile('tools/overhaul-native-214/raw209-contract214.json','utf8'));
 const {model,clips}=await loadRig250('tools/overhaul-delivery-209/output/Pounce_Anatomy209.glb');
 const root=new Group(),body=new Group();root.add(body);body.add(model);root.position.y=.02;body.rotation.y=Math.PI;body.scale.setScalar(.8);root.updateMatrixWorld(true);
 const world=new RAPIER.World({x:0,y:-9.81,z:0}),floor=world.createCollider(RAPIER.ColliderDesc.cuboid(100,.1,100).setTranslation(0,-.1,0));world.step();let generation=1;
 const support=createGroundSupport067(world,RAPIER,()=>generation),task=new SourceTask250(model,clips,contract.clips);
 const feet=['FL','FR','HL','HR'],meshes:SkinnedMesh[]=[];model.traverse(o=>{if(o instanceof SkinnedMesh)meshes.push(o);});
 const complete=new Map<string,{mesh:SkinnedMesh;index:number}[]>();for(const limb of feet){const paw=model.getObjectByName(limb+'_paw')!,family=new Set<string>();paw.traverse(o=>{if(o instanceof Bone)family.add(o.name);});const points:any[]=[];for(const mesh of meshes){const ix=mesh.geometry.getAttribute('skinIndex'),w=mesh.geometry.getAttribute('skinWeight');for(let i=0;i<ix.count;i++){let owned=0;for(let j=0;j<4;j++)if(family.has(mesh.skeleton.bones[ix.getComponent(i,j)]?.name))owned+=w.getComponent(i,j);if(owned>.99)points.push({mesh,index:i});}}complete.set(limb,points);}
 const sourceLocals=task.bones.map(b=>({bone:b,position:b.position.clone(),scale:b.scale.clone()}));
 const gaits=['FelineWalk','FelineTrot','FelineGallop','FelineUprightWalkLong','FelineUprightStride'];let clock=1;
 for(const name of gaits){for(const direction of [1,-1]){
  generation++;task.cancelGround250('CASE_RESET');root.position.set(0,.02,0);root.rotation.y=0;root.updateMatrixWorld(true);const up=name.includes('Upright'),row:any={name,direction,fulfilled:0,maxPointError:0,releaseReasons:[],frames:[]};evidence.cases.push(row);
  for(let i=0;i<96;i++){
   const phase=((direction*i/96)%1+1)%1,stance=up?1:0,dt=1/60;clock+=dt;root.position.z-=direction*contract.clips[name].measuredGait.nativeDistancePerCycle/96;root.rotation.y=i>48?(i-48)*Math.PI/96:0;root.updateMatrixWorld(true);
   task.setGroundContext250({support,frameClock:clock,time:clock,dt,generation,life:1,reset:false,grounded:true,basisKnown:true,shape:{halfHeight:1.18,borderRadius:.12}});
   const diag=task.step([{name,weight:1}],phase,stance,1,{});last={name,direction,i,phase,stance,root:root.matrixWorld.toArray(),diagnostic:diag};evidence.counts.frames++;
   for(const foot of diag.grounded250.feet){if(foot.state==='touch')evidence.counts.touch++;if(foot.finalState==='release'){evidence.counts.release++;if(!row.releaseReasons.includes(foot.reason))row.releaseReasons.push(foot.reason);}if(foot.fulfilled){row.fulfilled++;evidence.counts.fulfilled++;row.maxPointError=Math.max(row.maxPointError,foot.samePointError);evidence.maxSamePointError=Math.max(evidence.maxSamePointError,foot.samePointError);assert.ok(foot.samePointError<=2e-5);assert.ok(foot.normalGap>=-2e-5);}if(up&&foot.limb.startsWith('F'))assert.equal(foot.lease,null);}
   for(const {bone,position,scale} of sourceLocals){if(bone.name!=='root')assert.ok(bone.position.distanceTo(position)<=2e-5);assert.ok(bone.scale.distanceTo(scale)<=2e-5);}
   if(i%24===0){task.soles.beginPose(true);for(const limb of feet){const observed=task.soles.minimum(limb,new Vector3(),new Vector3(0,1,0));let direct=Infinity;for(const {mesh,index} of complete.get(limb)!){const p=new Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'),index);mesh.applyBoneTransform(index,p);mesh.localToWorld(p);direct=Math.min(direct,p.y);}const error=Math.abs(direct-observed.gap);evidence.maxMinDifference=Math.max(evidence.maxMinDifference,error);assert.ok(error<=2e-5);evidence.counts.independentChecks++;}row.frames.push(last);}
  }
  assert.ok(row.fulfilled>0,'NO_ACTUAL_CORRECTION:'+name+':'+direction);
 }}
 // Mixed R both ways, then source stop and actual fixed-support retirement.
 for(const direction of [1,-1]){generation++;task.cancelGround250('R_RESET');const row:any={name:'MOVING_R',direction,fulfilled:0,frames:[]};evidence.cases.push(row);for(let i=0;i<60;i++){clock+=1/60;const stance=direction>0?i/59:1-i/59,phase=(i/60)%1;root.position.z-=.01;root.updateMatrixWorld(true);task.setGroundContext250({support,frameClock:clock,time:clock,dt:1/60,generation,life:2,reset:false,grounded:true,basisKnown:true,shape:{halfHeight:1.18,borderRadius:.12}});const diag=task.step([{name:'FelineWalk',weight:1-stance},{name:'FelineUprightWalkLong',weight:stance}].filter(a=>a.weight>0),phase,stance,1,{});last={name:'MOVING_R',direction,i,phase,stance,diagnostic:diag};for(const foot of diag.grounded250.feet){if(stance>0&&foot.limb.startsWith('F'))assert.equal(foot.lease,null);if(foot.fulfilled)row.fulfilled++;}if(i%10===0)row.frames.push(last);}assert.ok(row.fulfilled>0,'NO_R_HIND_CORRECTION');}
 floor.setEnabled(false);world.step();clock+=1/60;task.setGroundContext250({support,frameClock:clock,time:clock,dt:1/60,generation,life:2,reset:false,grounded:true,basisKnown:true,shape:{halfHeight:1.18,borderRadius:.12}});const lost=task.step([{name:'FelineWalk',weight:1}],.5,0,1,{});assert.ok(lost.grounded250.feet.every((f:any)=>f.lease===null&&!f.fulfilled));evidence.supportLoss=lost.grounded250;
 task.cancelGround250('GENERATION_RESET');generation++;assert.equal(task.completeAction202('FelineAir',.2).contactQualified,false);world.free();
 evidence.status='PASS_NUMERIC_SOURCE_CANDIDATE_ONLY';
}catch(error){evidence.status='FIRST_REMAINING_FIXTURE_FAILURE';evidence.firstFailure={reason:String(error),operands:(error as any).operands??null,last};process.exitCode=1;}
finally{clearTimeout(deadline);await writeFile(output,JSON.stringify(evidence,null,2));console.log(JSON.stringify({status:evidence.status,counts:evidence.counts,firstFailure:evidence.firstFailure?.reason,maxSamePointError:evidence.maxSamePointError,maxMinDifference:evidence.maxMinDifference}));}
