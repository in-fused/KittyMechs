/** One fixed-patch contact solve using unchanged shipping bones and hull. */
import RAPIER from '@dimforge/rapier3d-compat';
import {AnimationClip,AnimationMixer,Bone,Group,Quaternion,QuaternionKeyframeTrack,Vector3,VectorKeyframeTrack,type InterpolationModes} from 'three';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import profiles from '../shared/building-grip-profiles.json' with {type:'json'};
import {Simulation} from '../shared/simulation';
import {buildingFaces,faceLanding} from '../shared/buildingSurfaces';
import {solveKnee} from '../src/game/entities/felineMotion';
import type {GripPatch} from '../shared/buildingGrip';
type NativeMantleQuery={
  faceRoofFloor:Simulation['faceRoofFloor'];
  facePatchSupported:Simulation['facePatchSupported'];
  solidIntersection:Simulation['solidIntersection'];
  solidCast:Simulation['solidCast'];
};

const floats=(encoded:string)=>{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer);return Float32Array.from({length:bytes.length/4},(_,i)=>view.getFloat32(i*4,true));};
const data=profiles.rigs.find(r=>r.key==='pounce')!,root=new Group(),body=new Group(),model=new Group();root.add(body);body.add(model);body.scale.setScalar(data.scale);body.rotation.y=Math.PI;
const bones=new Map(data.bones.map(b=>{const bone=new Bone();bone.name=b.name;bone.position.fromArray(b.position);bone.quaternion.fromArray(b.rotation);bone.scale.fromArray(b.scale);return[b.name,bone];}));
for(const b of data.bones)(b.parent?bones.get(b.parent)!:model).add(bones.get(b.name)!);
const clips=data.clips.map(c=>new AnimationClip(c.name,c.duration,c.tracks.map(t=>t.kind==='quaternion'?new QuaternionKeyframeTrack(t.name,floats(t.timesLE),floats(t.valuesLE),t.interpolation as InterpolationModes):new VectorKeyframeTrack(t.name,floats(t.timesLE),floats(t.valuesLE),t.interpolation as InterpolationModes)))),mixer=new AnimationMixer(model),actions=clips.map(c=>{const a=mixer.clipAction(c);a.play();a.paused=true;return a;});
const limbs=data.paws.map(p=>({name:p.name,upper:bones.get(p.name+'_upper')!,lower:bones.get(p.name+'_lower')!,paw:bones.get(p.name+'_paw')!,corners:[p.min[0],p.max[0]].flatMap(x=>[p.min[1],p.max[1]].flatMap(y=>[p.min[2],p.max[2]].map(z=>new Vector3(x,y,z))))}));
const hip=new Vector3(),knee=new Vector3(),paw=new Vector3(),joint=new Vector3(),axis=new Vector3(),pole=new Vector3(),from=new Vector3(),to=new Vector3(),rotation=new Quaternion(),parent=new Quaternion(),worldRotation=new Quaternion();
type Plant={paw:number;surface:'wall'|'roof';target:Vector3;rotation:Quaternion;offsets:Vector3[];handles:number[]};
await RAPIER.init();const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp');
try{
  const face=buildingFaces(7734).find(f=>f.buildingId.endsWith(':spawn-west')&&f.side==='north')!,internal=sim as unknown as NativeMantleQuery;
  sim.addActor('fixed-probe','Probe','pounce',false,{x:face.origin.x,y:4,z:face.origin.z+1.84});sim.step(1/60);
  const roof=internal.faceRoofFloor(face,faceLanding(face,0,1.75)!,1.75);if(roof===null)throw new Error('The actual full landing footprint has no current native roof owner');
  const finishY=roof+1.12,startY=6.8;
  const shape=new RAPIER.RoundCylinder(1.3-.12,1.75-.12,.12),identity={x:0,y:0,z:0,w:1},plants=new Map<number,Plant>(),rows:unknown[]=[];
  const pose=(position:Vector3,blend:number,phase:number)=>{
    root.position.copy(position);root.position.y-=1;root.rotation.y=0;
    for(const b of data.bones){const bone=bones.get(b.name)!;bone.position.fromArray(b.position);bone.quaternion.fromArray(b.rotation);bone.scale.fromArray(b.scale);}
    for(let i=0;i<actions.length;i++){const a=actions[i];a.enabled=true;a.time=Math.min(clips[i].duration-.00001,(i===5?phase:0)*clips[i].duration);a.setEffectiveWeight(i===3?1-blend:i===5?blend:0);}
    mixer.update(0);model.updateWorldMatrix(true,true);
  };
  const roofPlant=(index:number):Plant=>{
    const limb=limbs[index],q=limb.paw.getWorldQuaternion(new Quaternion()),offsets=limb.corners.map(p=>p.clone().multiplyScalar(data.scale).applyQuaternion(q));
    let halfZ=0,pad=0;for(const p of offsets){halfZ=Math.max(halfZ,Math.abs(p.z));pad=Math.max(pad,-p.y);}
    limb.upper.getWorldPosition(hip);
    return{paw:index,surface:'roof',target:new Vector3(hip.x,roof+pad+.004,Math.min(hip.z,face.origin.z-halfZ-.004)),rotation:q,offsets,handles:[]};
  };
  const wallPlant=(index:number):Plant=>{
    const limb=limbs[index],q=limb.paw.getWorldQuaternion(new Quaternion()),offsets=limb.corners.map(p=>p.clone().multiplyScalar(data.scale).applyQuaternion(q));
    let pad=0;for(const p of offsets)pad=Math.max(pad,-p.z);limb.paw.getWorldPosition(paw);
    return{paw:index,surface:'wall',target:new Vector3(paw.x,paw.y,face.origin.z+pad+.004),rotation:q,offsets,handles:[]};
  };
  const patch=(plant:Plant):GripPatch=>{
    const corners=plant.offsets.map(p=>p.clone().add(plant.target)),min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);for(const p of corners){min.min(p);max.max(p);}
    const points=plant.surface==='roof'?[{x:(min.x+max.x)/2,y:min.y,z:(min.z+max.z)/2},...[min.x,max.x].flatMap(x=>[min.z,max.z].map(z=>({x,y:min.y,z})))]:[{x:(min.x+max.x)/2,y:(min.y+max.y)/2,z:min.z},...[min.x,max.x].flatMap(x=>[min.y,max.y].map(y=>({x,y,z:min.z})))];
    return{eligible:false,authored:true,reach:0,targetReach:0,queryPoints:points,points,queryCorners:corners,corners,queryPivot:plant.target};
  };
  const evaluate=(plant:Plant)=>{
    const limb=limbs[plant.paw];limb.upper.getWorldPosition(hip);limb.lower.getWorldPosition(knee);limb.paw.getWorldPosition(paw);
    const upper=hip.distanceTo(knee),lower=knee.distanceTo(paw),requested=hip.distanceTo(plant.target)/(upper+lower),receipt:number[]=[];
    const owned=internal.facePatchSupported(face,patch(plant),plant.surface==='roof',{x:face.origin.x,y:roof,z:face.origin.z},data.scale,receipt);
    const witness={paw:plant.paw,surface:plant.surface,hip:{x:hip.x,y:hip.y,z:hip.z},target:{x:plant.target.x,y:plant.target.y,z:plant.target.z},upper,lower,requested,owned,handles:receipt};
    if(!owned||requested>.98)return{...witness,admitted:false};
    solveKnee(hip,knee,plant.target,upper,lower,joint,axis,pole);from.subVectors(knee,hip).normalize();to.subVectors(joint,hip).normalize();rotation.setFromUnitVectors(from,to);limb.upper.getWorldQuaternion(worldRotation);limb.upper.parent!.getWorldQuaternion(parent).invert();limb.upper.quaternion.copy(parent.multiply(rotation).multiply(worldRotation));limb.upper.updateWorldMatrix(false,true);
    limb.lower.getWorldPosition(knee);limb.paw.getWorldPosition(paw);from.subVectors(paw,knee).normalize();to.subVectors(plant.target,knee).normalize();rotation.setFromUnitVectors(from,to);limb.lower.getWorldQuaternion(worldRotation);limb.lower.parent!.getWorldQuaternion(parent).invert();limb.lower.quaternion.copy(parent.multiply(rotation).multiply(worldRotation));limb.lower.updateWorldMatrix(false,true);limb.paw.parent!.getWorldQuaternion(parent).invert();limb.paw.quaternion.copy(parent.multiply(plant.rotation));limb.paw.updateWorldMatrix(false,false);limb.paw.getWorldPosition(paw);
    const endpoint=paw.distanceTo(plant.target),actual=limb.corners.map(c=>c.clone().applyMatrix4(limb.paw.matrixWorld)),patchError=Math.max(...actual.map((c,i)=>c.distanceTo(plant.offsets[i].clone().add(plant.target))));
    return{...witness,endpoint,patchError,admitted:endpoint<1e-5&&patchError<1e-5};
  };
  const optimize=(position:Vector3,phase:number)=>{
    // Solve the one torso blend by actual 3D fixed-target distance, rather than
    // choosing a decorative pose or clamping an unreachable limb request.
    const primary=plants.has(0)?[0,1]:[2,3],cost=(blend:number)=>{pose(position,blend,phase);return Math.max(...primary.map(i=>limbs[i].upper.getWorldPosition(hip).distanceToSquared(plants.get(i)!.target)));};
    let low=0,high=1;for(let i=0;i<24;i++){const left=low+(high-low)/3,right=high-(high-low)/3;if(cost(left)<cost(right))high=right;else low=left;}
    const choices=[0,(low+high)/2,1];return choices.reduce((best,next)=>cost(next)<cost(best)?next:best,choices[0]);
  };
  let previous:Vector3|undefined,failure:unknown=null;
  const positions:Vector3[]=[];for(let y=startY;y<finishY;y+=.012)positions.push(new Vector3(face.origin.x,y,face.origin.z+1.84));positions.push(new Vector3(face.origin.x,finishY,face.origin.z+1.84));for(let n=1.828;n>=-1.88;n-=.012)positions.push(new Vector3(face.origin.x,finishY,face.origin.z+n));
  pose(positions[0],0,0);plants.set(0,roofPlant(0));plants.set(1,roofPlant(1));plants.set(2,wallPlant(2));plants.set(3,wallPlant(3));
  const initialPlants=[...plants.values()],events:unknown[]=[];let hindRoof=false;
  for(let step=0;step<positions.length;step++){
    const position=positions[step],phase=Math.min(1,Math.max(0,(position.y-startY)/(finishY-startY))),blend=optimize(position,phase);pose(position,blend,phase);
    const center={x:position.x,y:position.y+.3,z:position.z},collision=internal.solidIntersection(center,identity,shape,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    let clear=!collision;if(previous){const start={x:previous.x,y:previous.y+.3,z:previous.z},delta={x:center.x-start.x,y:center.y-start.y,z:center.z-start.z},hit=internal.solidCast(start,identity,delta,shape,0,1,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);clear&&=!hit||hit.time_of_impact>=1;}
    if(position.y>=finishY-.000001&&!hindRoof){
      const candidates=[roofPlant(2),roofPlant(3)],candidateProof=candidates.map(evaluate);
      if(candidateProof.every(p=>p.admitted)){for(const p of candidates)plants.set(p.paw,p);hindRoof=true;events.push({step,kind:'hind-roof-purchase',plants:candidates.map(p=>({paw:p.paw,target:p.target.toArray()}))});}
    }
    const contacts=[...plants.values()].map(evaluate),admitted=contacts.filter(c=>c.admitted);
    // Retire an unreachable hind wall anchor only while both fixed fore-roof
    // patches remain proven; retire fore plants only after both hind purchases.
    for(const c of contacts)if(!c.admitted&&admitted.length>=2){plants.delete(c.paw);events.push({step,kind:'release',paw:c.paw,surface:c.surface});}
    const row={step,position:{x:position.x,y:position.y,z:position.z},phase,blend,fullHullClear:clear,contacts,admitted:admitted.map(c=>c.paw)};rows.push(row);
    if(!clear||admitted.length<2||step===0&&contacts.filter(c=>c.paw<2).some(c=>!c.admitted)){failure=row;break;}previous=position.clone();
  }
  const out=resolve('.sites-runtime/overhaul-20261009/fixed-mantle-solve-001');mkdirSync(out,{recursive:true});writeFileSync(resolve(out,'contact-witness.json'),JSON.stringify({scope:'One explicit stationary fore-roof patch solve; unchanged shipping limbs/hull, not global impossibility or approval',face,actualRoofFloor:roof,plantTargets:initialPlants.map(p=>({paw:p.paw,surface:p.surface,target:{x:p.target.x,y:p.target.y,z:p.target.z},rotation:p.rotation.toArray(),offsets:p.offsets.map(v=>v.toArray())})),events,rows,failure},null,2));console.log(JSON.stringify({output:out,actualRoofFloor:roof,samples:rows.length,pathSamples:positions.length,events,failure}));
}finally{sim.dispose();world.free();}
