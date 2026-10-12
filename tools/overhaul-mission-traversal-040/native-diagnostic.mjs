import RAPIER from '@dimforge/rapier3d-compat';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

// One diagnostic against immutable build032. No production source mutation.
// Simulation fixture creation is explicit; its only movement owner is setInput.
const started=Date.now(),runtime=resolve(process.env.KITTYMECH_SOURCE_ROOT??'.sites-runtime/overhaul-20261009/build-032/playable-root'),output=resolve(process.argv[2]??'.sites-runtime/overhaul-20261010/mission-traversal-040-native');
await mkdir(output,{recursive:false});
const module=path=>import(pathToFileURL(resolve(runtime,path)).href);
const [{Simulation},{cityDistrict},{cityBlockColliderDesc},{terrainHeight},{emptyInput},{actorHullRadius,actorCollisionHeight,ACTOR_HEIGHT}]=await Promise.all([module('shared/simulation.ts'),module('shared/cityDistrict.ts'),module('shared/rainlineStreetAdmission.ts'),module('shared/world.ts'),module('shared/types.ts'),module('shared/config.ts')]);
await RAPIER.init();const district=cityDistrict(7734),routes=['mission-spine-4','relay-link-1','west-return-2'].map(suffix=>district.streets.find(s=>s.id.endsWith(':'+suffix)));
if(routes.some(r=>!r))throw Error('Missing preserved diagnostic route');
const report={startedUTC:new Date().toISOString(),runtime,status:'RUNNING',scope:'Compare unchanged039 .05m synthetic sample contract with actual shipping Simulation input movement. Fixture spawn is diagnostic setup, never a browser/public-play claim. No prop exclusion, warps, HP edits, controller overrides or production changes.',profile:{dt:1/60,syntheticStep:.25,syntheticDown:-.1,originalCenterlineContract:.05,productionGoalTolerance:.5,productionStallTicks:120},cases:[]};
const guard=()=>{if(Date.now()-started>75000)throw Error('Native diagnostic75s cumulative bound');};
const sha=async path=>createHash('sha256').update(await readFile(resolve(runtime,path))).digest('hex');
report.sourceHashes=Object.fromEntries(await Promise.all(['shared/simulation.ts','shared/world.ts','shared/ownedCharacterMotion.ts','shared/rainlineStreetAdmission.ts'].map(async path=>[path,await sha(path)])));
const vec=v=>({x:v.x,y:v.y,z:v.z});
function contacts(controller,owners){const rows=[];for(let i=0;i<Math.min(8,controller.numComputedCollisions());i++){const h=controller.computedCollision(i);if(h)rows.push({owner:h.collider?owners.get(h.collider.handle)??'unmapped native owner':null,handle:h.collider?.handle??null,shapeType:h.collider?.shapeType()??null,colliderPosition:h.collider?vec(h.collider.translation()):null,bodyType:h.collider?.parent()?.bodyType()??null,toi:h.toi,normal1:vec(h.normal1),normal2:vec(h.normal2),applied:vec(h.translationDeltaApplied),remaining:vec(h.translationDeltaRemaining),witness1:vec(h.witness1)});}return rows;}
function metric(route,p){const [a,b]=route.points,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;return {progress:(p.x-a.x)*ux+(p.z-a.z)*uz,lateral:(p.x-a.x)*-uz+(p.z-a.z)*ux,goalDistance:Math.hypot(b.x-p.x,b.z-p.z),length};}
async function synthetic(route,chassis,stance){
 const world=new RAPIER.World({x:0,y:-22,z:0}),owners=new Map(),[a,b]=route.points,radius=actorHullRadius({chassis,bot:false}),height=stance==='upright'?3.8:2.6;
 try{for(const block of district.blocks){const c=world.createCollider(cityBlockColliderDesc(block).setTranslation(...block.position).setRotation({x:0,y:Math.sin(block.yaw/2),z:0,w:Math.cos(block.yaw/2)}));owners.set(c.handle,block.id);}
  const g=district.grading,ground=world.createCollider(RAPIER.ColliderDesc.cuboid((g.maxX-g.minX)/2,.1,(g.maxZ-g.minZ)/2).setTranslation((g.minX+g.maxX)/2,g.height-.1,(g.minZ+g.maxZ)/2));owners.set(ground.handle,'039 synthetic graded ground');
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()),collider=world.createCollider(RAPIER.ColliderDesc.roundCylinder(height/2-.12,radius-.12,.12),body),controller=world.createCharacterController(.02);
  controller.enableAutostep(.55,.2,true);controller.enableSnapToGround(.35);controller.setMaxSlopeClimbAngle(Math.PI/3.5);controller.setMinSlopeSlideAngle(Math.PI/3);world.step();
  let position={x:a.x,y:g.height+height/2+.02,z:a.z},firstContractFailure=null,maxLateral=0;body.setTranslation(position,true);world.propagateModifiedBodyPositionsToColliders();
  const length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length/.25),dx=(b.x-a.x)/steps,dz=(b.z-a.z)/steps,history=[];
  for(let step=0;step<steps;step++){guard();controller.computeColliderMovement(collider,{x:dx,y:-.1,z:dz});const move=vec(controller.computedMovement());position={x:position.x+move.x,y:position.y+move.y,z:position.z+move.z};body.setTranslation(position,true);world.propagateModifiedBodyPositionsToColliders();
   const expected={x:a.x+(step+1)*dx,z:a.z+(step+1)*dz},error=Math.hypot(position.x-expected.x,position.z-expected.z),m=metric(route,position);maxLateral=Math.max(maxLateral,Math.abs(m.lateral));
   if(!firstContractFailure&&error>.05)firstContractFailure={step:step+1,position:vec(position),expected,error,metric:m,move,bodyType:body.bodyType(),linearVelocity:vec(body.linvel()),contacts:contacts(controller,owners)};
   if(step%8===0||step===steps-1)history.push({step:step+1,position:vec(position),move,metric:m,grounded:controller.computedGrounded()});
  }
  world.removeCharacterController(controller);return {fixture:'unchanged039synthetic',radius,height,firstContractFailure,maxLateral,final:metric(route,position),history};
 }finally{world.free();}
}
async function production(route,chassis,stance){
 const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp','DIAGNOSTIC040'),[a,b]=route.points;
 try{sim.syncChunks([a,b]);const actor=sim.addActor('diagnostic040','Diagnostic040',chassis,false,{x:a.x,y:terrainHeight(a.x,a.z,7734)+ACTOR_HEIGHT,z:a.z}),p=sim.physics.get(actor.id),owners=new Map();
  for(const [id,ref] of sim.buildingColliders)owners.set(ref.collider.handle,id);
  for(const [id,ref] of sim.coverBodies)owners.set(ref.collider.handle,'cover:'+id);
  for(const [key,chunk] of sim.chunks)owners.set(chunk.terrain.handle,'production-terrain:'+key);
  world.colliders.forEach(c=>{if(!owners.has(c.handle))owners.set(c.handle,'production-native:'+c.shapeType()+':'+JSON.stringify(vec(c.translation())));});
  const step=(forward=0,yaw=0)=>{guard();sim.setInput(actor.id,{...emptyInput(),seq:sim.tick+1,jumpEpoch:actor.jumpEpoch,strikeEpoch:actor.jumpEpoch,stance,forward,yaw,aimYaw:yaw});sim.step(1/60);};
  for(let i=0;i<120;i++)step();
  if(actor.stance!==stance||actorCollisionHeight(actor,sim.time)!==(stance==='upright'?3.8:2.6))throw Error('Requested diagnostic stance did not settle: '+chassis+' '+stance+' actual '+actor.stance);
  const initial={tick:sim.tick,time:sim.time,actor:structuredClone(actor),terrain:terrainHeight(actor.position.x,actor.position.z,7734),hull:{radius:actorHullRadius(actor),height:actorCollisionHeight(actor,sim.time),center:vec(p.collider.translation()),offset:vec(p.collider.translationWrtParent())},contacts:contacts(p.controller,owners)},initialPenetrations=[];
  world.intersectionsWithShape(p.collider.translation(),p.collider.rotation(),p.collider.shape,c=>{if(c.handle===p.collider.handle)return true;const contact=p.collider.shape.contactShape(p.collider.translation(),p.collider.rotation(),c.shape,c.translation(),c.rotation(),0);if(contact&&contact.distance< -1e-5)initialPenetrations.push({owner:owners.get(c.handle)??'terrain/other native owner',distance:contact.distance});return true;},undefined,undefined,p.collider);
  let firstContractFailure=null,maxLateral=0,lastProgress=metric(route,actor.position).progress,stalled=0,exit='native-time-bound';const history=[];
  for(let i=0;i<900;i++){const before=vec(actor.position),dx=b.x-before.x,dz=b.z-before.z,d=Math.hypot(dx,dz);if(d<.5){exit='goal-vicinity';break;}const yaw=Math.atan2(-dx,-dz);step(1,yaw);const m=metric(route,actor.position);maxLateral=Math.max(maxLateral,Math.abs(m.lateral));
   if(!firstContractFailure&&Math.abs(m.lateral)>.05)firstContractFailure={tick:sim.tick,time:sim.time,position:vec(actor.position),metric:m,contacts:contacts(p.controller,owners)};
   if(m.progress-lastProgress<.001)stalled++;else stalled=0;lastProgress=m.progress;
   if(i%6===0||stalled===120)history.push({tick:sim.tick,time:sim.time,input:sim.inspectRequestedInput(actor.id),position:vec(actor.position),velocity:vec(actor.velocity),stance:actor.stance,grounded:actor.grounded,metric:m,contacts:contacts(p.controller,owners)});
   if(initialPenetrations.length){exit='invalid-initial-overlap';break;}if(actor.hp<=0){exit='unexpected-lifecycle';break;}if(stalled>=120){exit='sustained-production-stall';break;}
  }
  for(let i=0;i<90;i++)step();const final={tick:sim.tick,time:sim.time,position:vec(actor.position),velocity:vec(actor.velocity),grounded:actor.grounded,stance:actor.stance,metric:metric(route,actor.position),contacts:contacts(p.controller,owners)};
  return {fixture:'actualShippingSimulation',initial,initialPenetrations,exit,firstContractFailure,maxLateral,final,history,classification:initialPenetrations.length?'INITIAL_FIXTURE_INVALID':exit==='sustained-production-stall'?'ACTUAL_INPUT_STALL_OWNER_REVIEW_REQUIRED':final.metric.goalDistance<1?'ACTUAL_INPUT_ENDPOINT_REACHED_OLD_CONTRACT_STILL_REPORTED':'ACTUAL_INPUT_ROUTE_UNFINISHED',acceptance:'diagnostic comparison only; no old039 assertion waiver or release acceptance'};
 }finally{sim.dispose();world.free();}
}
try{for(const route of routes)for(const chassis of ['pounce','bastion'])for(const stance of ['quadruped','upright']){guard();const row={route:route.id,points:route.points,chassis,stance,synthetic:await synthetic(route,chassis,stance),production:await production(route,chassis,stance)};report.cases.push(row);await writeFile(resolve(output,'progress.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({route:route.id,chassis,stance,syntheticFailure:row.synthetic.firstContractFailure?.error,production:row.production.classification,goalDistance:row.production.final.metric.goalDistance}));}report.status='DIAGNOSTIC_COMPLETE_INDEPENDENT_REVIEW_REQUIRED';}
catch(error){report.status='FIRST_DIAGNOSTIC_FAILURE_STOP';report.failure=error.stack??String(error);process.exitCode=1;}
finally{report.endUTC=new Date().toISOString();report.elapsedMs=Date.now()-started;await writeFile(resolve(output,'evidence.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({output,status:report.status,cases:report.cases.length,failure:report.failure}));}
