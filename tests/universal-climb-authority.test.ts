import {beforeAll,describe,expect,it,vi} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {buildingFaces,faceCoordinates,facePoint,type BuildingFace} from '../shared/buildingSurfaces';
import {buildingGripPose,buildingGripSources} from '../shared/buildingGrip';
import {poweredVaultPose,vaultAxisStep,vaultAxisVelocity} from '../shared/buildingVault';
import {actorHullRadius,MECHS} from '../shared/config';
import {emptyInput,type ActorState,type Chassis,type InputState} from '../shared/types';
import {cityBlocks} from '../shared/cityDistrict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Matrix4,Vector3} from 'three';
import {createClimbingProbe,probeClimbingContact} from '../src/game/entities/climbingContact';
import {registerBuildingContacts} from '../src/game/world/buildingContacts';
import {traversalClip,WALL_CLING_PHASE} from '../src/game/entities/felineMotion';
import {climbAnchors} from '../shared/traversal';
beforeAll(async()=>{await RAPIER.init();});
/** Explicit CPU approaches isolate authority rules; these are not spawn journeys. */
function fixture(chassis:Chassis,face:BuildingFace,tangent=0){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp'),radius=actorHullRadius({chassis,bot:false}),base=facePoint(face,tangent,face.minY+1),spawn={x:base.x+face.normal.x*(radius+.09),y:base.y,z:base.z+face.normal.z*(radius+.09)};
  sim.syncChunks([spawn]);const actor=sim.addActor('pilot','CPU explicit approach',chassis,false,spawn);let seq=0;
  const step=(patch:Partial<InputState>={})=>{sim.setInput(actor.id,{...emptyInput(),jumpEpoch:actor.jumpEpoch,seq:++seq,yaw:Math.atan2(face.normal.x,face.normal.z),...patch});sim.step(1/60);};
  for(let i=0;i<45;i++)step();
  return {sim,world,actor,step,close:()=>{sim.dispose();world.free();}};
}
const face=()=>buildingFaces(7734).find(f=>f.buildingId.endsWith(':extension-0')&&f.side==='east')!;
describe('actual full-facade authority',()=>{
  for(const chassis of ['pounce','bastion','lynx','caracal'] as const)it(`${chassis} retains supported wide-end grip and reaches a lateral roof`,()=>{
    const f=face(),tangent=f.width/2-actorHullRadius({chassis,bot:false})-.3,r=fixture(chassis,f,tangent);
    try{
      let attached=false,completed=false,oneSince=-1,maxSingle=0,roofContacts=0;const stages=new Set<string>(),roofStages=new Set<string>();
      for(let i=0;i<780;i++){
        r.step({climb:true,forward:1});const state=r.actor.climb;
        if(state){attached=true;expect(state.anchor).toBe(f.id);expect(state.base).toBe(f.minY);expect(state.height).toBe(f.height);
          if(state.mantleStage){stages.add(state.mantleStage);if(state.mantleStage==='out'||state.mantleStage==='lift')expect(state.gripMask|state.roofMask).toBe(0);else {expect(r.actor.position.y-1).toBeGreaterThanOrEqual(state.top+.1);if(state.roofMask){roofContacts++;roofStages.add(state.mantleStage);const pose=buildingGripPose(r.actor,state,r.sim.time,(r.sim as unknown as{gripAdjustments:{wall:number[];roof:number[]}}).gripAdjustments);for(let paw=0;paw<4;paw++)if(state.roofMask&(1<<paw)){expect(pose.roof[paw].targetReach).toBeLessThanOrEqual(.98);expect(pose.roof[paw].reach).toBeLessThanOrEqual(.98);for(const corner of pose.roof[paw].corners)expect(corner.y-state.top).toBeGreaterThanOrEqual(.00399);}}}}
          const mask=state.gripMask;if(mask&&!(mask&(mask-1))&&state.phase==='climb'){if(oneSince<0)oneSince=r.sim.time;maxSingle=Math.max(maxSingle,r.sim.time-oneSince);}else oneSince=-1;
        }else if(attached){completed=r.actor.position.y>f.roofCenter.y+.8;break;}
      }
      expect(attached).toBe(true);expect(completed).toBe(true);expect(stages.has('lift')).toBe(true);expect(stages.has('transfer')).toBe(true);expect(stages.has('settle')).toBe(true);
      expect(roofContacts).toBeGreaterThan(0);
      expect(roofStages.has('transfer')).toBe(true);expect(roofStages.has('settle')).toBe(true);
      expect(faceCoordinates(f,r.actor.position).tangent).toBeCloseTo(tangent,2);expect(maxSingle).toBeLessThanOrEqual(.1);expect(r.actor.energy).toBeGreaterThan(20);
      r.step();for(let i=0;i<45;i++)r.step();expect(r.actor.grounded).toBe(true);
    }finally{r.close();}
  });
  it('allows a real airborne grab after an accepted jump without changing strength',()=>{
    const r=fixture('pounce',face());try{r.step({jump:true,jumpId:1});expect(r.actor.velocity.y).toBeGreaterThan(10);expect(r.actor.grounded).toBe(false);r.step({climb:true});expect(r.actor.climb?.phase).toBe('grab');expect(r.actor.climb?.gripMask).toBe(0);}finally{r.close();}
  });
  it('partial Grab uses the same live minimum-sole rays and requested reach as the renderer',()=>{
    const f=face(),r=fixture('pounce',f),unregister=registerBuildingContacts(r.world,id=>r.sim.buildingCollider(id));
    const unsafe=r.sim as unknown as{facePatchSupported(f:BuildingFace,p:ReturnType<typeof buildingGripPose>['wall'][number],roof:boolean,contact:ActorState['position'],scale:number,handles:number[]):boolean;lastPatchAdjustment:number};
    try{let admitted=0,partialAdmitted=0,certified=0,partialCertified=0,shiftedCertified=0;
      for(const progress of [.2,.45,.7,.85,.95,1])for(const carrierShift of [0,.03]){
        const base=facePoint(f,0,r.actor.position.y+.4),actor={...r.actor,position:{x:r.actor.position.x+f.normal.x*carrierShift,y:r.actor.position.y,z:r.actor.position.z+f.normal.z*carrierShift}},state={anchor:f.id,phase:'grab' as const,startedAt:r.sim.time-progress*.3,progress,normal:{...f.normal},contact:base,top:f.roofCenter.y,base:f.minY,height:f.height,gripMask:0,roofMask:0,mantleStage:null,mantleStageAt:0};
        const pose=buildingGripPose(actor,state,r.sim.time),corrections={wall:[0,0,0,0],roof:[0,0,0,0]};
        for(let paw=0;paw<4;paw++){
          const patch=pose.wall[paw];if(!patch.authored)continue;
          // Identity transform with world-space anticipated corners is equivalent
          // to the renderer's bone-local corners/matrix at this rigid target.
          const corners=patch.queryCorners.map(p=>new Vector3(p.x,p.y,p.z)),probe=createClimbingProbe(),target=new Vector3();
          const client=probeClimbingContact(r.world,probe,f,corners,new Matrix4(),new Vector3(),target,false,MECHS.pounce.scale);
          const authority=unsafe.facePatchSupported(f,patch,false,state.contact,MECHS.pounce.scale,[]);
          expect(authority).toBe(client);expect(probe.casts).toBeLessThanOrEqual(5);
          if(authority){const correction=target.dot(new Vector3(f.normal.x,0,f.normal.z));expect(unsafe.lastPatchAdjustment).toBeCloseTo(correction,7);corrections.wall[paw]=correction;admitted++;if(progress<1)partialAdmitted++;}
        }
        const corrected=buildingGripPose(actor,state,r.sim.time,corrections);
        for(let paw=0;paw<4;paw++)if(corrections.wall[paw]){
          const patch=corrected.wall[paw];if(!patch.eligible)continue;
          certified++;if(progress<1)partialCertified++;if(carrierShift>0)shiftedCertified++;
          expect(patch.targetReach).toBeLessThanOrEqual(.98);expect(patch.reach).toBeLessThanOrEqual(.98);
          for(const corner of patch.corners)expect((corner.x-base.x)*f.normal.x+(corner.z-base.z)*f.normal.z).toBeGreaterThanOrEqual(.00399);
        }
      }expect(admitted).toBeGreaterThan(0);expect(partialAdmitted).toBeGreaterThan(0);expect(certified).toBeGreaterThan(0);expect(partialCertified).toBeGreaterThan(0);expect(shiftedCertified).toBeGreaterThan(0);
    }finally{unregister();r.close();}
  });
  it('does not couple a sound lower grip to an absent local roof',()=>{
    const f=face(),r=fixture('bastion',f);try{
      // Explicit destruction fixture uses the same accepted cell retirement path.
      const blocks=cityBlocks(7734).filter(b=>b.buildingId===f.buildingId&&b.support);
      const unsafe=r.sim as unknown as{retireCell(block:typeof blocks[number]):void};
      for(const block of blocks){const owner=r.sim.structures.find(s=>s.id===block.structureId);if(owner&&block.cellId!==undefined){owner.hp[block.cellId]=0;owner.brokenMask|=1<<block.cellId;unsafe.retireCell(block);}}
      expect(f.roofBlockIds.every(id=>!r.sim.buildingCollider(id))).toBe(true);
      for(let i=0;i<30;i++)r.step({climb:true});expect(r.actor.climb?.phase).toBe('cling');
    }finally{r.close();}
  });
  it('samples no more than twenty wall rays for one established actor tick',()=>{
    const r=fixture('pounce',face());try{for(let i=0;i<35;i++)r.step({climb:true});const state=r.actor.climb!;expect(state.phase).toBe('cling');
      const spy=vi.spyOn(r.world,'castRayAndGetNormal');
      const masks=(r.sim as unknown as{faceGripMasks(actor:ActorState,face:BuildingFace,state:NonNullable<ActorState['climb']>):{gripMask:number;roofMask:number}}).faceGripMasks(r.actor,face(),state);
      expect(masks.gripMask).not.toBe(0);expect(spy.mock.calls.length).toBeLessThanOrEqual(20);spy.mockRestore();
    }finally{r.close();}
  });
  it('uses at most two initial relief rays plus one fresh five-point footprint per paw',()=>{
    const r=fixture('bastion',face());try{
      const spy=vi.spyOn(r.world,'castRayAndGetNormal');r.step({climb:true});expect(r.actor.climb?.phase).toBe('grab');expect(spy.mock.calls.length).toBeLessThanOrEqual(22);spy.mockRestore();
    }finally{r.close();}
  });
  it('a prospective evaluator does not replace committed handles, adjustments, clocks or physical state',()=>{
    const f=face(),r=fixture('bastion',f);try{
      for(let i=0;i<35;i++)r.step({climb:true});const state=r.actor.climb!;
      type Receipt={gripMask:number;roofMask:number;eligibleMask:number;wallOffset:number;adjustments:{wall:number[];roof:number[]};handles:number[][]};
      const unsafe=r.sim as unknown as{candidateGrip:Receipt;gripAdjustments:Receipt['adjustments'];lastGripHandles:number[][];lastGripEligibleMask:number;lastPatchAdjustment:number;climbMotion:Map<string,unknown>;physics:Map<string,{body:RAPIER.RigidBody;collider:RAPIER.Collider}>;faceGripMasks(a:ActorState,f:BuildingFace,s:typeof state,resolve:undefined,preview:Receipt):unknown};
      const physics=unsafe.physics.get(r.actor.id)!,capture=()=>JSON.stringify({actor:r.actor,motion:unsafe.climbMotion.get(r.actor.id),adjustments:unsafe.gripAdjustments,handles:unsafe.lastGripHandles,eligible:unsafe.lastGripEligibleMask,lastAdjustment:unsafe.lastPatchAdjustment,body:physics.body.translation(),shape:physics.collider.shape,offset:physics.collider.translationWrtParent()});
      const before=capture(),candidate={...state,phase:'climb' as const,contact:{...state.contact}},actor={...r.actor,position:{...r.actor.position,y:r.actor.position.y+2}};
      unsafe.faceGripMasks(actor,f,candidate,undefined,unsafe.candidateGrip);expect(capture()).toBe(before);expect(unsafe.candidateGrip.handles.some(a=>a.length)).toBe(true);
    }finally{r.close();}
  });
  it('refuses an unsupported ascent before moving, holds the proven cycle without a roof, and retires it in the damage snapshot',()=>{
    const f=face(),r=fixture('bastion',f);try{
      for(let i=0;i<35;i++)r.step({climb:true});
      const blocks=cityBlocks(7734).filter(b=>f.roofBlockIds.includes(b.id)||f.supportingBlockIds.includes(b.id)&&b.cellId!>=4),retired=r.sim as unknown as{retireCell(b:typeof blocks[number]):void};
      for(const b of blocks){const bank=r.sim.structures.find(s=>s.id===b.structureId)!;bank.hp[b.cellId!]=0;bank.brokenMask|=1<<b.cellId!;retired.retireCell(b);}
      const spy=vi.spyOn(r.world,'castRayAndGetNormal');let maxCasts=0;
      for(let i=0;i<240;i++){spy.mockClear();r.step({climb:true,forward:1});maxCasts=Math.max(maxCasts,spy.mock.calls.length);expect(r.actor.climb).not.toBeNull();expect(r.actor.climb!.mantleStage).toBeNull();}
      expect(maxCasts).toBeLessThanOrEqual(50);const held={y:r.actor.position.y,clock:r.actor.climb!.startedAt,phase:r.actor.climb!.phase};
      for(let i=0;i<30;i++)r.step({climb:true,forward:1});expect(r.actor.position.y).toBeCloseTo(held.y,6);expect(r.actor.climb!.startedAt).toBe(held.clock);expect(r.actor.climb!.phase).toBe(held.phase);
      for(let i=0;i<20;i++)r.step({climb:true,forward:-1});expect(r.actor.position.y).toBeLessThan(held.y-.5);expect(r.actor.climb).not.toBeNull();spy.mockRestore();
      let id=71000;for(const block of cityBlocks(7734).filter(b=>f.supportingBlockIds.includes(b.id)&&b.cellId!<4)){const bank=r.sim.structures.find(s=>s.id===block.structureId)!;bank.hp[block.cellId!]=1;const q=faceCoordinates(f,{x:block.position[0],y:block.position[1],z:block.position[2]}),p=facePoint(f,q.tangent,block.position[1]);r.sim.projectiles.push({id:++id,owner:r.actor.id,kind:'pulse',age:0,position:{x:p.x+f.normal.x*.03,y:p.y,z:p.z+f.normal.z*.03},velocity:{x:-f.normal.x*40,y:0,z:-f.normal.z*40}});}
      r.step({climb:true,forward:1});expect(r.sim.events.some(e=>e.type==='structure-break')).toBe(true);expect(r.sim.snapshot().actors.find(a=>a.id===r.actor.id)!.climb).toBeNull();
    }finally{r.close();}
  });
  it('holds a surviving lower grip at a real intermediate canopy when the roof is absent, then descends',()=>{
    const f=face(),r=fixture('bastion',f);try{
      for(let i=0;i<35;i++)r.step({climb:true});expect(r.actor.climb?.phase).toBe('cling');
      const blocks=cityBlocks(7734).filter(b=>f.roofBlockIds.includes(b.id));
      const retired=r.sim as unknown as{retireCell(block:typeof blocks[number]):void};
      for(const block of blocks){const bank=r.sim.structures.find(s=>s.id===block.structureId)!;bank.hp[block.cellId!]=0;bank.brokenMask|=1<<block.cellId!;retired.retireCell(block);}
      // An actual fixed canopy blocks the entire attached hull while leaving the
      // lower wall's independently owned claw patches alive. No fake support.
      const canopy=facePoint(f,0,f.minY+5);canopy.x+=f.normal.x*1.5;canopy.z+=f.normal.z*1.5;
      r.world.createCollider(RAPIER.ColliderDesc.cuboid(3,.12,3).setTranslation(canopy.x,canopy.y,canopy.z));r.world.step();
      for(let i=0;i<200;i++)r.step({climb:true,forward:1});expect(r.actor.climb?.phase).toBe('cling');expect(r.actor.climb!.gripMask).not.toBe(0);
      const clock=r.actor.climb!.startedAt,held=r.actor.position.y;for(let i=0;i<90;i++)r.step({climb:true,forward:1});
      expect(r.actor.climb?.phase).toBe('cling');expect(r.actor.climb!.startedAt).toBe(clock);expect(r.actor.position.y).toBeCloseTo(held,3);
      for(let i=0;i<30;i++)r.step({climb:true,forward:-1});expect(r.actor.position.y).toBeLessThan(held-.7);expect(r.actor.climb).not.toBeNull();
    }finally{r.close();}
  });
  it('pins source profile identity to every actual shipping rig',()=>{
    expect(buildingGripSources).toHaveLength(7);for(const source of buildingGripSources)expect(createHash('sha256').update(readFileSync(source.path)).digest('hex')).toBe(source.sha256);
  });
  it('stable Cling samples the same shipping pose after settling, without freezing live collider validation',()=>{
    const r=fixture('pounce',face());try{
      for(let i=0;i<35;i++)r.step({climb:true});const state=r.actor.climb!;
      expect(traversalClip(state,r.sim.time,.13).phase).toBe(WALL_CLING_PHASE);
      const first=structuredClone(buildingGripPose(r.actor,state,r.sim.time));
      expect(first.wall.some(p=>p.eligible)).toBe(true);
      const later=buildingGripPose(r.actor,state,r.sim.time+9.3);
      for(let paw=0;paw<4;paw++)if(first.wall[paw].authored){expect(later.wall[paw].targetReach).toBeCloseTo(first.wall[paw].targetReach,7);for(let corner=0;corner<8;corner++)expect(later.wall[paw].corners[corner]).toEqual(first.wall[paw].corners[corner]);}
      const handles=face().supportingBlockIds.map(id=>r.sim.buildingCollider(id)).filter((p):p is RAPIER.Collider=>!!p);for(const collider of handles)collider.setEnabled(false);
      r.step({climb:true});expect(r.actor.climb).toBeNull();
    }finally{r.close();}
  });
  for(const seed of [7734,1926,4107])for(const chassis of ['pounce','bastion','lynx','caracal'] as const)it(`${seed} ${chassis} live workshop Cling and powered bypass keep bounded whole-tick queries`,()=>{
    const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,seed,'pvp'),anchor=climbAnchors(seed)[0],radius=actorHullRadius({chassis,bot:false});
    try{
      const actor=sim.addActor('pilot','Explicit clear CPU approach',chassis,false,{x:anchor.position.x+anchor.normal.x*(radius+.65),y:anchor.position.y+1,z:anchor.position.z+anchor.normal.z*(radius+.65)});let seq=0;
      const step=(forward=0,climb=false)=>{sim.setInput(actor.id,{...emptyInput(),jumpEpoch:actor.jumpEpoch,seq:++seq,forward,climb,yaw:Math.atan2(anchor.normal.x,anchor.normal.z)});sim.step(1/60);};
      for(let i=0;i<36;i++)step();for(let i=0;i<45;i++)step(1);for(let i=0;i<15;i++)step();
      let heldClock=-1;for(let i=0;i<120;i++){step(0,true);if(i===35)heldClock=actor.climb!.startedAt;if(i>=35){expect(actor.climb?.phase).toBe('cling');expect(actor.climb!.startedAt).toBe(heldClock);expect(actor.climb!.gripMask).not.toBe(0);}}
      const spy=vi.spyOn(world,'castRayAndGetNormal');let max=0,attached=false,completed=false,unsupportedStages=0;
      for(let i=0;i<660;i++){
        spy.mockClear();step(1,true);max=Math.max(max,spy.mock.calls.length);
        if(actor.climb){attached=true;if(actor.climb.mantleStage==='out'||actor.climb.mantleStage==='lift'){unsupportedStages++;expect(actor.climb.gripMask|actor.climb.roofMask).toBe(0);}}
        else if(attached){completed=actor.position.y>anchor.landing.y+.8;break;}
      }
      spy.mockRestore();expect(completed).toBe(true);expect(unsupportedStages).toBeGreaterThan(0);expect(max).toBeLessThanOrEqual(70);
      // Query count includes forecast, actual/current validation and destination
      // probes. The older single-evaluator20 assertion is deliberately separate.
    }finally{sim.dispose();world.free();}
  });
  it('never certifies a sensor owner as claw support',()=>{
    const f=face(),r=fixture('pounce',f);try{for(let i=0;i<35;i++)r.step({climb:true});const colliders=f.supportingBlockIds.map(id=>r.sim.buildingCollider(id)).filter((c):c is RAPIER.Collider=>!!c);expect(colliders.length).toBeGreaterThan(0);
      for(const collider of colliders)collider.setSensor(true);r.step({climb:true});expect(r.actor.climb).toBeNull();
    }finally{r.close();}
  });
  it('invalidates wall grip in the accepted projectile-break snapshot, not the next step',()=>{
    const f=face(),r=fixture('bastion',f);try{
      for(let i=0;i<35;i++)r.step({climb:true});expect(r.actor.climb!.gripMask).not.toBe(0);
      const walls=cityBlocks(7734).filter(b=>f.supportingBlockIds.includes(b.id));let id=50000;
      for(const block of walls){
        // Near-lethal cells and already-in-flight pulses are explicit fixtures.
        const bank=r.sim.structures.find(s=>s.id===block.structureId)!;bank.hp[block.cellId!]=1;
        const q=faceCoordinates(f,{x:block.position[0],y:block.position[1],z:block.position[2]}),p=facePoint(f,q.tangent,block.position[1]);
        r.sim.projectiles.push({id:++id,owner:r.actor.id,kind:'pulse',age:0,position:{x:p.x+f.normal.x*.03,y:p.y,z:p.z+f.normal.z*.03},velocity:{x:-f.normal.x*40,y:0,z:-f.normal.z*40}});
      }
      const before=r.sim.tick;r.step({climb:true});expect(r.sim.tick).toBe(before+1);expect(r.sim.events.some(e=>e.type==='structure-break')).toBe(true);
      const snapshot=r.sim.snapshot();expect(snapshot.tick).toBe(before+1);expect(snapshot.actors.find(a=>a.id===r.actor.id)!.climb).toBeNull();
    }finally{r.close();}
  });
  it('invalidates a powered mantle immediately when accepted pulses remove its roof',()=>{
    const f=face(),r=fixture('lynx',f);try{
      for(let i=0;i<550&&r.actor.climb?.phase!=='mantle';i++)r.step({climb:true,forward:1});expect(r.actor.climb?.phase).toBe('mantle');
      const decks=cityBlocks(7734).filter(b=>f.roofBlockIds.includes(b.id));let id=60000;
      for(const block of decks){const bank=r.sim.structures.find(s=>s.id===block.structureId)!;bank.hp[block.cellId!]=1;
        r.sim.projectiles.push({id:++id,owner:r.actor.id,kind:'pulse',age:0,position:{x:block.position[0],y:block.position[1]+block.halfExtents[1]+.03,z:block.position[2]},velocity:{x:0,y:-40,z:0}});
      }
      r.step({climb:true,forward:1});expect(r.sim.events.some(e=>e.type==='structure-break')).toBe(true);expect(r.sim.snapshot().actors.find(a=>a.id===r.actor.id)!.climb).toBeNull();
    }finally{r.close();}
  });
  it('charges powered flight and actual two-paw roof hold from the same post-move proof',()=>{
    const f=buildingFaces(7734).find(f=>f.buildingId.endsWith(':extension-19')&&f.side==='east')!,r=fixture('bastion',f);try{
      let supported=0,unsupported=0,done=false;
      for(let i=0;i<960;i++){
        const wasMantle=r.actor.climb?.phase==='mantle',energy=r.actor.energy;
        r.step({climb:true,forward:1});const state=r.actor.climb;
        if(wasMantle&&state){
          const count=(state.roofMask&1)+((state.roofMask>>1)&1)+((state.roofMask>>2)&1)+((state.roofMask>>3)&1);
          const held=(state.mantleStage==='transfer'||state.mantleStage==='settle')&&count>=2;
          expect(energy-r.actor.energy).toBeCloseTo((held?3:10)/60,8);
          if(held)supported++;else unsupported++;
          if(state.mantleStage==='out'||state.mantleStage==='lift')expect(count).toBe(0);
        }else if(wasMantle&&!state){done=true;break;}
      }
      expect(done).toBe(true);expect(supported).toBeGreaterThan(0);expect(unsupported).toBeGreaterThan(0);
      expect(r.actor.energy).toBeGreaterThan(15); // before any ground regeneration
    }finally{r.close();}
  });
  it('does not discount a stale positive roof mask after actual owned support disappears',()=>{
    const f=face(),r=fixture('bastion',f);try{
      for(let i=0;i<780;i++){r.step({climb:true,forward:1});const s=r.actor.climb;if(s?.mantleStage==='transfer'&&s.roofMask&&(s.roofMask&(s.roofMask-1)))break;}
      expect(r.actor.climb?.mantleStage).toBe('transfer');expect(r.actor.climb!.roofMask).not.toBe(0);
      for(const id of f.roofBlockIds)r.sim.buildingCollider(id)?.setEnabled(false);
      const energy=r.actor.energy;r.step({climb:true,forward:1});
      expect(r.actor.climb).toBeNull();expect(r.actor.energy).toBe(energy);
    }finally{r.close();}
  });
  it('keeps powered cost when only one real roof paw survives a local obstruction',()=>{
    const f=face(),r=fixture('bastion',f);try{
      for(let i=0;i<780;i++){r.step({climb:true,forward:1});if(r.actor.climb?.mantleStage==='settle')break;}
      expect(r.actor.climb?.mantleStage).toBe('settle');expect(r.actor.climb!.roofMask).toBe(15);
      const pose=buildingGripPose(r.actor,r.actor.climb!,r.sim.time,(r.sim as unknown as{gripAdjustments:{wall:number[];roof:number[]}}).gripAdjustments);
      // Small real foreign caps sit below the carrier hull but occlude three
      // claw-center queries. They are not allowed as owning roof support.
      for(const paw of [1,2,3]){const p=pose.roof[paw].queryPoints[0];r.world.createCollider(RAPIER.ColliderDesc.cuboid(.12,.02,.12).setTranslation(p.x,r.actor.climb!.top+.02,p.z));}
      r.world.step();const energy=r.actor.energy;r.step({climb:true,forward:1});
      expect(r.actor.climb?.mantleStage).toBe('settle');expect(r.actor.climb!.roofMask).toBe(1);
      expect(energy-r.actor.energy).toBeCloseTo(10/60,8);
    }finally{r.close();}
  });
  it('uses finite rigid footprints and releases all powered out/lift pads',()=>{
    const r=fixture('lynx',face());try{for(let i=0;i<35;i++)r.step({climb:true});const state={...r.actor.climb!,phase:'mantle' as const,mantleStage:'lift' as const,mantleStageAt:r.sim.time,progress:.2};
      const pose=buildingGripPose(r.actor,state,r.sim.time);expect(pose.wall.every(p=>!p.eligible)).toBe(true);expect(pose.roof.every(p=>!p.eligible)).toBe(true);
      for(const p of [...pose.wall,...pose.roof])for(const c of p.corners)expect([c.x,c.y,c.z].every(Number.isFinite)).toBe(true);
    }finally{r.close();}
  });
});
describe('powered vault velocity and pose',()=>{
  it('brakes before reversing instead of changing the displacement sign instantly',()=>{const next=vaultAxisVelocity(3,-2,3.8,1/60);expect(next).toBeCloseTo(2.8);expect(vaultAxisStep(next,-2,1/60)).toBeGreaterThan(0);});
  it('holds actual Air through lift and eases back into Mantle',()=>{
    const state={phase:'mantle',progress:.4,mantleStage:'lift' as const,mantleStageAt:1};expect(poweredVaultPose(state,2).air).toBe(1);
    const transfer={...state,mantleStage:'transfer' as const,mantleStageAt:2};expect(poweredVaultPose(transfer,2).air).toBe(1);expect(poweredVaultPose(transfer,2.1).mantle).toBeCloseTo(.5);expect(poweredVaultPose(transfer,2.2).air).toBe(0);
  });
});
