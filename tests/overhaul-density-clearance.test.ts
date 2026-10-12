import {beforeAll,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {buildOverhaulDistrict} from '../shared/overhaulDistrict';
import {buildingFaces,facePoint,faceLanding,faceTangentLimit} from '../shared/buildingSurfaces';
import {overhaulCornerCandidates,overhaulCornerSample} from '../shared/overhaulCornerClimb';
import {ACTOR_HEIGHT,actorHullRadius,actorClimbHeight,actorQuadHeight} from '../shared/config';
import {emptyInput,type InputState,type Vec3} from '../shared/types';
import {terrainHeight} from '../shared/world';
const district=buildOverhaulDistrict(7734)!,added=district.blocks.filter(b=>b.id.includes(':dressing:vista-'));
beforeAll(async()=>{await RAPIER.init();});
const rotation={x:0,y:0,z:0,w:1};
function fixture(){const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp');sim.syncChunks(district.blocks.map(b=>({x:b.position[0],y:b.position[1],z:b.position[2]})));world.step();return {world,sim,close:()=>{sim.dispose();world.free();}};}
it('adds no obstruction to continuous full original Pounce/Anchor wall, corner and mantle hull paths across 21 buildings',()=>{
 const run=fixture();try{
  expect(district.blocks.filter(b=>!b.buildingId.startsWith('7734:overhaul:extraction039:')).length).toBeLessThan(1200);expect(district.blocks.filter(b=>b.buildingId.startsWith('7734:overhaul:extraction039:')).length).toBeLessThanOrEqual(150);expect(added).toHaveLength(88);
  const colliders=added.map(b=>({block:b,collider:run.sim.buildingCollider(b.id)!}));for(const c of colliders)expect(c.collider,c.block.id).toBeTruthy();
  const owned=new Map(colliders.map(({block,collider})=>[collider.handle,block.id])),failures=new Set<string>(),check=(p:Vec3,shape:RAPIER.Shape,label:string)=>{
   // Native broadphase retains the exact same 88 owner solids and samples.
   // Only actual overlapping bounds need the expensive penetration query.
   run.world.intersectionsWithShape(p,rotation,shape,collider=>{const id=owned.get(collider.handle);if(id){const contact=shape.contactShape(p,rotation,collider.shape,collider.translation(),collider.rotation(),0);if(contact&&contact.distance< -1e-5)failures.add(label+' overlaps '+id+' by '+contact.distance);}return true;},undefined,undefined,undefined,undefined,collider=>owned.has(collider.handle));
  };
  const faces=buildingFaces(7734).filter(f=>district.buildings.some(b=>b.id===f.buildingId));
  for(const chassis of ['pounce','bastion'] as const){
   const radius=actorHullRadius({chassis,bot:false}),height=actorClimbHeight({bot:false}),shape=new RAPIER.RoundCylinder(height/2-.12,radius-.12,.12),mantle=new RAPIER.Cuboid(radius,height/2,radius);
   for(const face of faces){
    const limit=faceTangentLimit(face,radius);
    for(let tangent=-limit;tangent<=limit+.001;tangent+=.20){
     for(const base of [face.minY+.04,face.minY+2,face.topY-height]){const p=facePoint(face,tangent,base+height/2);p.x+=face.normal.x*(radius+.09);p.z+=face.normal.z*(radius+.09);check(p,shape,chassis+' wall '+face.id);}
     const landing=faceLanding(face,tangent,radius);if(landing)check({...landing,y:landing.y+.12+height/2},mantle,chassis+' roof-band '+face.id);
    }
    for(const side of [-1,1] as const)for(const plan of overhaulCornerCandidates(face,faces,side,radius+.09))for(let d=0;d<=plan.length;d+=.035){const p=overhaulCornerSample(plan,d,face.minY+height/2+.04).position;check(p,shape,chassis+' corner '+face.id);}
   }
  }
  // Actual full Anchor route hull, including tall stance, against new solids.
  const anchorRadius=actorHullRadius({chassis:'bastion',bot:false}),tall=new RAPIER.RoundCylinder(3.8/2-.12,anchorRadius-.12,.12);
  for(const road of district.streets){const a=road.center,c=Math.cos(road.yaw),s=Math.sin(road.yaw);for(let t=-road.halfExtents.z;t<=road.halfExtents.z;t+=.2)check({x:a.x+s*t,y:district.grading.height+1.94,z:a.z+c*t},tall,'Anchor road '+road.id);}
  for(const p of [{x:5,y:district.grading.height,z:-19},{x:5,y:8.92,z:-14.17},{x:-12,y:district.grading.height,z:-35},{x:34,y:district.grading.height,z:-30},{x:0,y:district.grading.height,z:-76},{x:-8,y:district.grading.height,z:12}])check({...p,y:p.y+1.94},tall,'portal/objective '+JSON.stringify(p));
  for(const actor of run.sim.actors.values())if(actor.bot){const radius=actorHullRadius(actor),height=actorQuadHeight(actor);check({...actor.position,y:actor.position.y-ACTOR_HEIGHT+height/2},new RAPIER.RoundCylinder(height/2-.12,radius-.12,.12),'native NPC initial hold '+actor.id);}
  for(const npc of district.npcs){const radius=npc.role==='anchor'?2.2:npc.role==='mortar'?1.75:1.45,height=3.2,shape=new RAPIER.RoundCylinder(height/2-.12,radius-.12,.12);
   for(let i=0;i<npc.patrol.length;i++){const a=npc.patrol[i],b=npc.patrol[(i+1)%npc.patrol.length],length=Math.hypot(b.x-a.x,b.z-a.z);for(let d=0;d<=length;d+=.1){const t=d/Math.max(length,.001);check({x:a.x+(b.x-a.x)*t,y:a.y+height/2+.04,z:a.z+(b.z-a.z)*t},shape,'NPC full patrol '+npc.id);}}
  }
  expect([...failures],'This compares new published source colliders only; inherited 4 m gantry versus 4.1 m Anchor landing is NOT certified.').toEqual([]);
 }finally{run.close();}
},30000);
it.each(district.buildings.map(b=>[b.id,b] as const))('ordinary native Pounce climbs and lands on %s',(id,building)=>{
 const run=fixture();try{
  const anchor=building.anchor,radius=actorHullRadius({chassis:'pounce',bot:false}),spawn={x:anchor.position.x+anchor.normal.x*(radius+.3),y:terrainHeight(anchor.approach.x,anchor.approach.z,7734)+1,z:anchor.position.z+anchor.normal.z*(radius+.3)};
  const actor=run.sim.addActor('density-probe','Native Pounce qualification','pounce',false,spawn);
  const step=(patch:Partial<InputState>={})=>{run.sim.setInput(actor.id,{...emptyInput(),seq:run.sim.tick+1,jumpEpoch:actor.jumpEpoch,stance:actor.stance,yaw:Math.atan2(anchor.normal.x,anchor.normal.z),...patch});run.sim.step(1/60);};
  for(let i=0;i<60;i++)step();expect(actor.grounded,id).toBe(true);
  let attached=false,transfer=false,finished=false;
  for(let i=0;i<960;i++){step({climb:true,forward:1});if(actor.climb){attached=true;transfer ||= actor.climb.mantleStage==='transfer';}else if(attached){finished=actor.position.y-1>=building.roof.center.y-.02;break;}}
  expect({attached,transfer,finished,position:actor.position},id).toMatchObject({attached:true,transfer:true,finished:true});for(let i=0;i<24;i++)step();expect(actor.grounded,id).toBe(true);
 }finally{run.close();}
},30000);
