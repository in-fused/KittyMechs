/** One isolated contact-bridge candidate. Requires the parent's native quiet slot. */
import RAPIER from '@dimforge/rapier3d-compat';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import type {Simulation} from '../shared/simulation';
import {buildingFaces,faceLanding} from '../shared/buildingSurfaces';
import {buildingGripPose,captureMantleBridgeSource,mantleBridgePose,type MantleBridgePose} from '../shared/buildingGrip';
import {solveMantleBridgeTorso,type MantleBridgePlant,type MantleBridgeTorso} from '../shared/buildingVault';
import {MECHS} from '../shared/config';
import {parseInput} from '../shared/protocol';
import {emptyInput,type ClimbState,type InputState,type Vec3} from '../shared/types';

type NativeBridgeQuery={
  advanceClimb:Simulation['advanceClimb'];beginFaceVault:Simulation['beginFaceVault'];
  faceRoofFloor:Simulation['faceRoofFloor'];facePatchSupported:Simulation['facePatchSupported'];
  faceGripMasks:Simulation['faceGripMasks'];climbMotion:Simulation['climbMotion'];
  moveCharacter:Simulation['moveCharacter'];commitCharacterRubble:Simulation['commitCharacterRubble'];
  solidIntersection:Simulation['solidIntersection'];solidCast:Simulation['solidCast'];
  colliderCell:Simulation['colliderCell'];physics:Simulation['physics'];
};
const output=resolve('.sites-runtime/overhaul-20261009/contact-bridge-001');mkdirSync(output,{recursive:true});
const simulationPath=resolve('shared/simulation.ts'),shipping=readFileSync(simulationPath,'utf8');
const before='motion.blockedAscent||actor.position.y-ACTOR_HEIGHT+actorClimbHeight(actor)>=face.topY-.2';
if(shipping.split(before).length!==2)throw new Error('Expected exactly one early-height trigger; candidate refused');
const candidate=shipping.replace(before,'motion.blockedAscent'),modulePath=resolve(output,'isolated-simulation.mjs');
// Bundle only this isolated authority; all geometry, owners and query methods
// retain their source. Production files are never rewritten.
await build({entryPoints:[simulationPath],outfile:modulePath,bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'one-height-trigger',setup(context){context.onLoad({filter:/[\\/]shared[\\/]simulation\.ts$/},()=>({contents:candidate,loader:'ts',resolveDir:resolve('shared')}));}}]});
const imported:unknown=await import(pathToFileURL(modulePath).href),Candidate=(imported as {Simulation:typeof Simulation}).Simulation;
const binding={shippingSHA256:createHash('sha256').update(shipping).digest('hex'),candidateSHA256:createHash('sha256').update(candidate).digest('hex'),exactReplacement:{before,after:'motion.blockedAscent',count:1},poweredVaultDisabledInProbe:true};
await RAPIER.init();const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Candidate(world,7734,'pvp'),internal=sim as unknown as NativeBridgeQuery;
const rows:unknown[]=[],events:unknown[]=[];let failure:unknown=null,finished=false;
try{
  const actor=sim.addActor('bridge-pilot','Bridge Pilot','pounce'),face=buildingFaces(7734).find(f=>f.buildingId.endsWith(':spawn-west')&&f.side==='north')!;
  const shippingVault=internal.beginFaceVault;internal.beginFaceVault=()=>false;
  const step=(patch:Partial<InputState>)=>{sim.setInput(actor.id,parseInput({...emptyInput(),stance:actor.stance,seq:sim.tick+1,jumpEpoch:actor.jumpEpoch,yaw:0,...patch})!);sim.step(1/60);};
  const record=(stage:string,extra:object={})=>({stage,tick:sim.tick,time:sim.time,position:{...actor.position},energy:actor.energy,state:actor.climb&&{...actor.climb,contact:{...actor.climb.contact}},...extra});
  const until=(stage:string,predicate:()=>boolean,input:Partial<InputState>,limit:number)=>{
    for(let i=0;i<limit&&!predicate();i++)step(input);
    events.push(record(stage));if(!predicate())throw new Error(`${stage}: ordinary input did not reach the route checkpoint`);
  };
  for(let i=0;i<60;i++)step({});
  until('grounded backroad',()=>actor.position.z>=39,{forward:-1},420);
  for(let i=0;i<24;i++)step({});
  until('grounded centre facade approach',()=>actor.position.x<=-30,{strafe:-1},540);
  for(let i=0;i<36;i++)step({});
  if(!actor.grounded)throw new Error('Ordinary approach never settled on ground');
  step({forward:1,jump:true,jumpId:1});
  let airborne=false;for(let i=0;i<12;i++){step({forward:1});airborne||=!actor.grounded&&!actor.climb;}
  events.push(record('airborne launch',{airborne}));if(!airborne)throw new Error('No real airborne launch before catch');
  until('actual facade catch',()=>!!actor.climb,{forward:1,climb:true},120);
  if(actor.climb?.anchor!==face.id)throw new Error('Ordinary route caught a different native face');
  const hookHeight=8.24;let stalled=0,lastHeight=actor.position.y;
  for(let i=0;i<300&&actor.position.y<hookHeight;i++){
    step({forward:1,climb:true});
    if(!actor.climb){failure=record('source ascent detached');break;}
    if(actor.position.y-lastHeight<.000001)stalled++;else stalled=0;
    const motion=internal.climbMotion.get(actor.id)!;
    rows.push(record('prospective source ascent',{handles:motion.pawHandles.map(h=>[...h])}));lastHeight=actor.position.y;
    if(stalled>=24){failure=record('first held source-contact ascent gap',{heldTicks:stalled,pose:buildingGripPose(actor,actor.climb,sim.time),handles:motion.pawHandles.map(h=>[...h])});break;}
  }
  if(!failure&&actor.position.y<hookHeight)failure=record('source ascent did not reach hook');
  if(!failure&&actor.climb){
    const state:ClimbState={...actor.climb,normal:{...actor.climb.normal},contact:{...actor.climb.contact}},source=captureMantleBridgeSource(actor,state,sim.time),floor=internal.faceRoofFloor(face,faceLanding(face,0,1.75)!,1.75);
    if(floor===null)throw new Error('The original full landing footprint has no native roof floor');
    let plants=source.plants.filter(p=>p.paw>=2&&p.surface==='wall'),blend=source.weights[5],frame=0;
    if(plants.length!==2)failure=record('later-hook source lacks two hind-wall plants',{source});
    const startY=actor.position.y,finishY=floor+1.12;
    let stage:'handoff'|'fore0'|'fore1'|'pull'|'inward'|'hind0'|'hind1'|'fore-transfer0'|'fore-transfer1'|'done'='handoff',stageFrame=0,swing: {from:Vec3;plant:MantleBridgePlant}|null=null;
    const roofPlant=(paw:number,sample:MantleBridgePose):MantleBridgePlant=>{
      const limb=sample.limbs[paw],offsets=limb.offsets;
      const lowX=Math.min(...offsets.map(o=>o.x)),highX=Math.max(...offsets.map(o=>o.x)),lowZ=Math.min(...offsets.map(o=>o.z)),highZ=Math.max(...offsets.map(o=>o.z)),lowY=Math.min(...offsets.map(o=>o.y));
      const x=Math.max(face.roofCenter.x-face.roofHalfExtents.x-lowX+.004,Math.min(face.roofCenter.x+face.roofHalfExtents.x-highX-.004,limb.hip.x));
      const z=Math.max(face.roofCenter.z-face.roofHalfExtents.z-lowZ+.004,Math.min(face.roofCenter.z+face.roofHalfExtents.z-highZ-.004,limb.hip.z));
      return{paw,surface:'roof',faceId:face.id,target:{x,y:floor-lowY+.004,z},rotation:[...limb.rotation],offsets:offsets.map(o=>({...o}))};
    };
    const shape=new RAPIER.RoundCylinder(1.3-.12,1.75-.12,.12),identity={x:0,y:0,z:0,w:1};
    const shippingAdvance=internal.advanceClimb;
    internal.advanceClimb=(a,p,input,dt)=>{
      if(a.id!==actor.id)return shippingAdvance.call(sim,a,p,input,dt);
      if(failure||finished)return;
      if(!input.climb||input.jump||a.energy<=0){failure=record('candidate canceled');return;}
      const previous={...a.position},requested={x:0,y:0,z:0};
      if(stage==='pull')requested.y=Math.min(1.2*dt,finishY-a.position.y);
      if(stage==='inward')requested.z=-Math.min(1.2*dt,a.position.z-(face.origin.z-1.88));
      const rubble=internal.moveCharacter(p,requested),move=p.controller.computedMovement(),next={x:a.position.x+move.x,y:a.position.y+move.y,z:a.position.z+move.z};
      const torso: MantleBridgeTorso={source:stage==='handoff'?Math.max(0,1-(stageFrame+1)/16):0,mantle:blend,phase:Math.max(0,Math.min(1,(next.y-startY)/(finishY-startY)))};
      const prospective={...a,position:next};
      const planting=stage==='fore0'||stage==='fore1'||stage==='hind0'||stage==='hind1'||stage==='fore-transfer0'||stage==='fore-transfer1';
      let swingPlant:MantleBridgePlant|null=null;
      if(planting){
        const paw=stage==='fore0'||stage==='fore-transfer0'?0:stage==='fore1'||stage==='fore-transfer1'?1:stage==='hind0'?2:3;
        if(!swing){const free=mantleBridgePose(prospective,state,source,torso,plants.filter(p=>p.paw!==paw));swing={from:{...free.limbs[paw].endpoint},plant:roofPlant(paw,free)};plants=plants.filter(p=>p.paw!==paw);}
        const t=Math.min(1,(stageFrame+1)/12),e=t*t*(3-2*t);
        swingPlant={...swing.plant,target:{x:swing.from.x+(swing.plant.target.x-swing.from.x)*e,y:swing.from.y+(swing.plant.target.y-swing.from.y)*e,z:swing.from.z+(swing.plant.target.z-swing.from.z)*e}};
      }
      const requestedPlants=swingPlant?[...plants,swingPlant]:plants;
      const priority=(stage==='pull'||stage==='inward')?plants.filter(p=>p.paw<2&&p.surface==='roof'):plants;
      const choose=solveMantleBridgeTorso(blend,.025,value=>{
        const sampled=mantleBridgePose(prospective,state,source,{...torso,mantle:value},requestedPlants);
        return Math.max(...sampled.limbs.filter(l=>priority.some(p=>p.paw===l.paw)||swingPlant?.paw===l.paw&&stageFrame===11).map(l=>l.patch.targetReach));
      });torso.mantle=choose.blend;
      const sample=mantleBridgePose(prospective,state,source,torso,requestedPlants),retained=[...plants];
      if(swingPlant&&stageFrame===11)retained.push(swingPlant);
      let contacts=retained.map(plant=>{
        const limb=sample.limbs[plant.paw],handles:number[]=[];
        const owned=internal.facePatchSupported(face,limb.patch,plant.surface==='roof',state.contact,MECHS.pounce.scale,handles,undefined,floor);
        return{paw:plant.paw,surface:plant.surface,target:{...plant.target},hip:limb.hip,upper:limb.upper,lower:limb.lower,reach:limb.patch.targetReach,endpointError:limb.endpointError,cornerError:limb.cornerError,owned,handles,owners:handles.map(h=>internal.colliderCell.get(h)?.id??null),admitted:owned&&limb.patch.eligible};
      });
      if((stage==='pull'||stage==='inward')&&contacts.filter(c=>c.paw<2&&c.surface==='roof'&&c.admitted).length===2){
        const released=contacts.filter(c=>c.paw>=2&&c.surface==='wall'&&!c.admitted).map(c=>c.paw);
        if(released.length){for(let i=retained.length-1;i>=0;i--)if(released.includes(retained[i].paw))retained.splice(i,1);plants=plants.filter(p=>!released.includes(p.paw));contacts=contacts.filter(c=>!released.includes(c.paw));events.push(record('hind wall release',{released,foreProof:contacts.filter(c=>c.paw<2)}));}
      }
      const center={...next,y:next.y+.3},start={...previous,y:previous.y+.3},delta={x:center.x-start.x,y:center.y-start.y,z:center.z-start.z};
      const hit=internal.solidIntersection(center,identity,shape,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,undefined,p.collider,p.body),cast=internal.solidCast(start,identity,delta,shape,0,1,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,undefined,p.collider,p.body);
      const clear=!hit&&(!cast||cast.time_of_impact>=1),admitted=contacts.filter(c=>c.admitted),row=record(stage,{frame,stageFrame,proposed:next,torso,contacts,clear,blocker:hit?internal.colliderCell.get(hit.handle)?.id??hit.handle:null,cast:cast&&{toi:cast.time_of_impact,handle:cast.collider.handle},requested,computed:{x:move.x,y:move.y,z:move.z}});
      rows.push(row);
      const lost=contacts.find(c=>!c.admitted),shortMove=Math.hypot(move.x-requested.x,move.y-requested.y,move.z-requested.z)>.0001;
      if(!clear||lost||admitted.length<2||shortMove){failure={...row,reason:!clear?'full hull blocked':lost?'retained or new planted patch rejected':admitted.length<2?'fewer than two planted native contacts':'native controller blocked requested carrier move'};return;}
      blend=choose.blend;a.position=next;a.velocity={x:move.x/dt,y:move.y/dt,z:move.z/dt};a.energy=Math.max(0,a.energy-7*dt);p.body.setNextKinematicTranslation(next);internal.commitCharacterRubble(p,rubble);
      state.gripMask=contacts.reduce((m,c)=>m|(c.surface==='wall'?1<<c.paw:0),0);state.roofMask=contacts.reduce((m,c)=>m|(c.surface==='roof'?1<<c.paw:0),0);a.climb!.gripMask=state.gripMask;a.climb!.roofMask=state.roofMask;
      const motion=internal.climbMotion.get(a.id)!;motion.pawHandles=Array.from({length:4},(_,i)=>[...(contacts.find(c=>c.paw===i)?.handles??[])]);motion.checkpoint={...next};motion.stalledAt=sim.time;
      frame++;stageFrame++;
      let nextStage:typeof stage|undefined;
      if(stage==='handoff'&&stageFrame===16)nextStage='fore0';
      if(planting&&stageFrame===12){plants=retained;swing=null;nextStage=stage==='fore0'?'fore1':stage==='fore1'?'pull':stage==='hind0'?'hind1':stage==='hind1'?'fore-transfer0':stage==='fore-transfer0'?'fore-transfer1':'done';}
      if(stage==='pull'){
        if(next.y>=finishY-.000001){plants=plants.filter(p=>p.surface==='roof');nextStage='inward';}
      }
      if(stage==='inward'&&next.z<=face.origin.z-1.88+.000001)nextStage='hind0';
      if(nextStage){events.push(record('contact stage handoff',{from:stage,to:nextStage,plants}));stage=nextStage;stageFrame=0;if(stage==='done'){finished=true;events.push(record('four planted roof contacts'));}}
    };
    for(let i=0;i<540&&!failure&&!finished;i++)step({forward:1,climb:true});
    internal.advanceClimb=shippingAdvance;
    if(!failure&&!finished)failure=record('candidate did not complete bounded contact schedule');
  }
  internal.beginFaceVault=shippingVault;
}catch(error){failure={reason:error instanceof Error?error.message:String(error),tick:sim.tick,time:sim.time};}
finally{
  writeFileSync(resolve(output,'contact-witness.json'),JSON.stringify({scope:'Isolated native candidate from ordinary default-spawn input; no browser approval or production mantle integration',binding,finished,events,rows,failure},null,2));
  console.log(JSON.stringify({output,finished,samples:rows.length,failure}));sim.dispose();world.free();
}
