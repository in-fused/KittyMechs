import {beforeAll,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {buildingGripPose} from '../shared/buildingGrip';
import {MECHS} from '../shared/config';
import {emptyInput,type ClimbState,type InputState,type ActorState} from '../shared/types';
import {parseInput} from '../shared/protocol';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';
import {terrainHeight} from '../shared/world';
import {Matrix4,Vector3} from 'three';
import {registerBuildingContacts} from '../src/game/world/buildingContacts';
import {climbCornerFaces,createClimbingProbe,probeClimbingContact} from '../src/game/entities/climbingContact';
import {buildingFaces,faceCoordinates,faceTangentLimit,envelopeFaces} from '../shared/buildingSurfaces';
import {overhaulCornerCandidates,overhaulCornerSample,overhaulCornerAdvance,overhaulCornerHoldBlend,parseOverhaulCorner,proveOverhaulCornerStep,type OverhaulCornerState} from '../shared/overhaulCornerClimb';

beforeAll(async()=>{await RAPIER.init();});
const faces=buildingFaces(7734),from=faces.find(f=>f.buildingId.endsWith(':spawn-west')&&f.side==='west')!,plan=overhaulCornerCandidates(from,faces,1,1.84)[0];
const state=(distance=0):OverhaulCornerState=>({from:from.id,to:plan.to.id,side:1,distance,radius:1.84,height:4,startedAt:1});
it('derives a complete continuous corner on actual first-district source planes',()=>{
  expect(plan).toBeTruthy();
  expect(faceCoordinates(from,overhaulCornerSample(plan,0,4).position).tangent).toBeCloseTo(faceTangentLimit(from,1.75),8);
  expect(Math.abs(faceCoordinates(plan.to,overhaulCornerSample(plan,plan.length,4).position).tangent)).toBeCloseTo(faceTangentLimit(plan.to,1.75),8);
  let previous=overhaulCornerSample(plan,0,4);
  for(let d=.01;d<plan.length;d+=.01){const sample=overhaulCornerSample(plan,d,4);expect(Math.hypot(sample.position.x-previous.position.x,sample.position.z-previous.position.z)).toBeLessThanOrEqual(.010001);expect(Math.hypot(sample.normal.x,sample.normal.z)).toBeCloseTo(1,8);expect(sample.position.y).toBe(4);previous=sample;}
  const half=overhaulCornerSample(plan,plan.approach+plan.arc/2,4);expect(half.normal.x*from.normal.x+half.normal.z*from.normal.z).toBeCloseTo(Math.SQRT1_2,8);
});
it('rejects forged/disjoint adjacency and out-of-path guest state',()=>{
  expect(parseOverhaulCorner(state(),faces,2,from.id)).toBeTruthy();
  expect(parseOverhaulCorner({...state(),to:faces.find(f=>f.buildingId!==from.buildingId)!.id},faces,2,from.id)).toBeUndefined();
  expect(parseOverhaulCorner({...state(),distance:plan.length+.01},faces,2,from.id)).toBeUndefined();
  expect(parseOverhaulCorner({...state(),startedAt:3},faces,2,from.id)).toBeUndefined();
  expect(parseOverhaulCorner({...state(),height:100},faces,2,from.id)).toBeUndefined();
  const rotated=envelopeFaces({id:'rotated',kind:'city',center:{x:3,y:0,z:5},yaw:.63,halfExtents:{x:9,z:6},height:12,roofId:'roof',roofBlockIds:['roof'],faceBlockIds:{west:['w'],east:['e'],north:['n'],south:['s']}});
  expect(overhaulCornerCandidates(rotated[0],rotated,-1,1.84)).toHaveLength(1);
});
it('release freezes the path and reverse command retraces finite distance',()=>{
  const s=state(plan.approach+plan.arc/2);expect(overhaulCornerAdvance(plan,s,0,1/60)).toBe(s.distance);
  expect(overhaulCornerAdvance(plan,s,-1,1/60)).toBeCloseTo(s.distance-1.4/60,8);
  expect(overhaulCornerAdvance(plan,s,1,1)).toBe(s.distance);
});
it('decoded original paw pose returns continuously to the ordinary source stance at a reverse endpoint',()=>{
  const corner={...state(0),startedAt:0},sample=overhaulCornerSample(plan,0,4),actor={chassis:'pounce' as const,bot:false,position:sample.position};
  const climb:ClimbState={anchor:from.id,phase:'climb',startedAt:0,progress:.3,normal:sample.normal,contact:sample.contact,top:from.roofCenter.y,base:from.minY,height:from.height,gripMask:0,roofMask:0,mantleStage:null,mantleStageAt:0};
  const decoded=(state:ClimbState)=>buildingGripPose(actor,state,1).wall.map(p=>({eligible:p.eligible,reach:p.eligible?p.targetReach:null,corners:p.eligible?p.queryCorners.map(c=>({...c})):[]}));
  const ordinary=decoded(climb),endpoint=decoded({...climb,corner});
  const common=ordinary.flatMap((paw,i)=>paw.eligible&&endpoint[i].eligible?paw.corners.map((c,j)=>Math.hypot(c.x-endpoint[i].corners[j].x,c.y-endpoint[i].corners[j].y,c.z-endpoint[i].corners[j].z)):[]);
  expect(common.length).toBeGreaterThan(0);const jump=Math.max(...common);
  expect(jump,'Deleting corner ownership must not change the decoded original paw pose').toBeLessThan(1e-6);
  expect(endpoint).toEqual(ordinary);expect(overhaulCornerHoldBlend(corner,1)).toBe(0);
  expect(overhaulCornerHoldBlend({...corner,distance:.001},1)).toBeLessThan(.0001);
  expect(overhaulCornerHoldBlend({...corner,distance:.224},1)).toBe(1);
});
it('requires the actual original native full hull to clear outward and inward solids',()=>{
  const world=new RAPIER.World({x:0,y:0,z:0});try{
    const shape=new RAPIER.RoundCylinder(1.3-.12,1.75-.12,.12),rotation={x:0,y:0,z:0,w:1},s=state(plan.approach+plan.arc/2),next=s.distance+1.4/60;
    const receipts=(sample:ReturnType<typeof overhaulCornerSample>)=>({position:sample.position,gripMask:3,pawHandles:[[1],[2],[],[]]});
    const proof={sweep:(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number})=>{
      const delta={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},hit=world.castShape(a,rotation,delta,shape,0,1,true,RAPIER.QueryFilterFlags.ONLY_FIXED);return hit&&hit.time_of_impact<1?{x:a.x+delta.x*hit.time_of_impact,y:a.y+delta.y*hit.time_of_impact,z:a.z+delta.z*hit.time_of_impact}:b;
    },grip:receipts};
    expect(proveOverhaulCornerStep(plan,s,next,proof)).toBeTruthy();
    const sample=overhaulCornerSample(plan,next,4),block=world.createCollider(RAPIER.ColliderDesc.cuboid(.2,1.3,.2).setTranslation(sample.position.x,sample.position.y,sample.position.z));world.step();
    expect(proveOverhaulCornerStep(plan,s,next,proof)).toBeNull();world.removeCollider(block,true);world.step();
    expect(proveOverhaulCornerStep(plan,s,next,{...proof,grip:()=>null})).toBeNull();
    expect(proveOverhaulCornerStep(plan,s,next,{...proof,grip:sample=>({...receipts(sample),gripMask:1,pawHandles:[[1],[],[],[]]})})).toBeNull();
  }finally{world.free();}
});
it('retains unchanged decoded Pounce reach and real source five-point paw proof along a first-district corner',()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp');try{
    const start=overhaulCornerSample(plan,0,4),actor=sim.addActor('corner-probe','Probe','pounce',false,start.position),internal=sim as unknown as {climbMotion:Simulation['climbMotion'];colliderCell:Simulation['colliderCell'];continuingFaceGrip:Simulation['continuingFaceGrip'];cornerGrip:Simulation['cornerGrip'];damageCell:Simulation['damageCell'];facePatchSupported:Simulation['facePatchSupported'];physics:Simulation['physics'];solidCast:Simulation['solidCast']},trace:unknown[]=[];
    sim.step(1/60);
    for(let distance=0;distance<=plan.length+.001;distance=Math.min(plan.length,distance+.04)){
      const sample=overhaulCornerSample(plan,distance,4),state:ClimbState={anchor:from.id,phase:'climb',startedAt:0,progress:.3,normal:sample.normal,contact:sample.contact,top:from.roofCenter.y,base:from.minY,height:from.height,gripMask:0,roofMask:0,mantleStage:null,mantleStageAt:0},prospective={...actor,position:sample.position};
      let best=0,winning:unknown;
      for(let assignment=0;assignment<16;assignment++){
        const choices=[assignment&1,(assignment>>1)&1,(assignment>>2)&1,(assignment>>3)&1] as [0|1,0|1,0|1,0|1],pose=buildingGripPose(prospective,state,1,undefined,false,{faces:[from,plan.to],choices}),handles:number[][]=[[],[],[],[]];let mask=0;
        for(let i=0;i<4;i++)if(pose.wall[i].eligible&&internal.facePatchSupported(choices[i]?plan.to:from,pose.wall[i],false,state.contact,MECHS.pounce.scale,handles[i]))mask|=1<<i;
        if(mask.toString(2).split('1').length>best.toString(2).split('1').length){best=mask;winning={choices,reach:pose.wall.map(p=>p.targetReach),handles};}
        if(best===15)break;
      }
      trace.push({distance,angle:sample.angle,position:sample.position,mask:best,winning});
      expect(best.toString(2).split('1').length-1,JSON.stringify(trace.slice(-4))).toBeGreaterThanOrEqual(2);
      if(distance===plan.length)break;
    }
  }finally{sim.dispose();world.free();}
});
const command=(sim:Simulation,actor:ActorState,patch:Partial<InputState>)=>sim.setInput(actor.id,parseInput({...emptyInput(),seq:sim.tick+1,stance:actor.stance,jumpEpoch:actor.jumpEpoch,...patch})!);
it.each([27,60])('ordinary spawn input retains real owned grip through an early north-corner %i-tick hold, reverse-out and reentry',(holdTicks)=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp');try{
    const actor=sim.addActor('early-pilot','Pilot','pounce'),internal=sim as unknown as {climbMotion:Simulation['climbMotion'];colliderCell:Simulation['colliderCell'];continuingFaceGrip:Simulation['continuingFaceGrip'];cornerGrip:Simulation['cornerGrip'];damageCell:Simulation['damageCell'];facePatchSupported:Simulation['facePatchSupported'];physics:Simulation['physics'];solidCast:Simulation['solidCast']},trace:unknown[]=[];
    const step=(patch:Partial<InputState>)=>{command(sim,actor,{yaw:0,...patch});sim.step(1/60);};
    for(let i=0;i<60;i++)step({});
    for(let i=0;i<360&&actor.position.z<=37;i++)step({forward:-1});
    expect(actor.position.z).toBeGreaterThan(37);for(let i=0;i<24;i++)step({});
    for(let i=0;i<360&&actor.position.x>=-28;i++)step({strafe:-1});
    expect(actor.position.x).toBeLessThan(-28);for(let i=0;i<24;i++)step({});
    for(let i=0;i<180&&actor.position.y<=3.8;i++)step({climb:true,forward:1});
    // Ordinary browser key release arrived a few authority ticks after its
    // sampled height predicate. Keep those real ascent commands in this trace.
    for(let i=0;i<4;i++)step({climb:true,forward:1});
    const north=faces.find(f=>f.buildingId.endsWith(':spawn-west')&&f.side==='north')!;
    expect(actor.climb?.anchor).toBe(north.id);
    for(let i=0;i<500&&!actor.climb?.corner;i++)step({climb:true,strafe:-1});
    expect(actor.climb?.corner).toBeTruthy();for(let i=0;i<2;i++)step({climb:true,strafe:-1});
    const early=actor.climb!.corner!,earlyPlan=overhaulCornerCandidates(north,faces,early.side,early.radius)[0],height=actor.position.y,d=early.distance;
    expect(d).toBeLessThan(.1);expect(d).toBeGreaterThan(0);
    const proveHeld=()=>{
      const climb=actor.climb,motion=internal.climbMotion.get(actor.id)!;trace.push({tick:sim.tick,position:{...actor.position},energy:actor.energy,climb:climb&&{anchor:climb.anchor,phase:climb.phase,mask:climb.gripMask,corner:climb.corner&&{...climb.corner}}});
      expect(climb,JSON.stringify(trace.slice(-5))).toBeTruthy();expect(actor.position.y).toBe(height);
      if(climb!.corner){
        expect(climb!.gripMask.toString(2).split('1').length-1).toBeGreaterThanOrEqual(2);
        for(let paw=0;paw<4;paw++)if(climb!.gripMask&(1<<paw)){
          const face=climb!.corner!.pawFaces![paw]?earlyPlan.to:earlyPlan.from,handles=motion.pawHandles[paw];expect(handles.length).toBeGreaterThanOrEqual(5);
          for(const handle of handles)expect(face.supportingBlockIds).toContain(internal.colliderCell.get(handle)?.id);
        }
      }else expect(internal.continuingFaceGrip(actor,motion),JSON.stringify(trace.slice(-5))).toBe(true);
    };
    const held={...actor.position};
    for(let i=0;i<holdTicks;i++){step({climb:true});proveHeld();expect(actor.climb?.corner?.distance).toBe(d);expect(actor.position).toEqual(held);}
    for(let i=0;i<21;i++){
      const wasCorner=!!actor.climb?.corner;step({climb:true,strafe:1});proveHeld();
      if(wasCorner&&!actor.climb?.corner){const motion=internal.climbMotion.get(actor.id)!;expect(motion.checkpoint).toEqual(actor.position);expect(motion.stalledAt).toBe(sim.time);}
    }
    expect(actor.climb?.corner).toBeUndefined();expect(actor.climb?.anchor).toBe(north.id);
    for(let i=0;i<12;i++){step({climb:true});proveHeld();}
    for(let i=0;i<60&&(!actor.climb?.corner||actor.climb.corner.distance<.3);i++){step({climb:true,strafe:-1});proveHeld();}
    expect(actor.climb?.corner?.distance).toBeGreaterThan(.3);expect(admitStructuralSnapshot(sim.snapshot(),null)).toBeTruthy();
  }finally{sim.dispose();world.free();}
});
it('raw D moves camera-right on the real west wall and raw A reverses it',()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp');try{
    const actor=sim.addActor('direction-pilot','Pilot','pounce',false,{x:from.origin.x+from.normal.x*2.05,y:1,z:from.origin.z}),yaw=Math.atan2(from.normal.x,from.normal.z);
    for(let i=0;i<60;i++){command(sim,actor,{});sim.step(1/60);}
    for(let i=0;i<180&&actor.position.y<3.8;i++){command(sim,actor,{climb:true,forward:1,yaw});sim.step(1/60);}
    expect(actor.climb?.anchor).toBe(from.id);const before={...actor.position};
    for(let i=0;i<18;i++){command(sim,actor,{climb:true,strafe:1,yaw});sim.step(1/60);}
    const rightTravel=(actor.position.x-before.x)*Math.cos(yaw)-(actor.position.z-before.z)*Math.sin(yaw);
    expect(rightTravel).toBeGreaterThan(.35);expect(actor.climb?.gripMask).toBeGreaterThan(0);
    for(let i=0;i<18;i++){command(sim,actor,{climb:true,strafe:-1,yaw});sim.step(1/60);}
    expect(Math.hypot(actor.position.x-before.x,actor.position.z-before.z)).toBeLessThan(.025);
  }finally{sim.dispose();world.free();}
});
it('ordinary native Pounce input climbs a facade, sweeps a convex corner, releases/reverses, then continues on the adjacent real face',()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp');try{
    const actor=sim.addActor('pilot','Pilot','pounce',false,{x:from.origin.x+from.normal.x*2.05,y:terrainHeight(from.origin.x-2.05,from.origin.z,7734)+1,z:from.origin.z}),yaw=Math.atan2(from.normal.x,from.normal.z),trace:unknown[]=[];
    for(let i=0;i<60;i++){command(sim,actor,{});sim.step(1/60);}expect(actor.grounded).toBe(true);
    for(let i=0;i<180&&actor.position.y<3.8;i++){command(sim,actor,{climb:true,forward:1,yaw});sim.step(1/60);}
    expect(actor.climb?.anchor).toBe(from.id);
    const internal=sim as unknown as {climbMotion:Simulation['climbMotion'];colliderCell:Simulation['colliderCell'];continuingFaceGrip:Simulation['continuingFaceGrip'];cornerGrip:Simulation['cornerGrip'];damageCell:Simulation['damageCell'];facePatchSupported:Simulation['facePatchSupported'];physics:Simulation['physics'];solidCast:Simulation['solidCast']},rejections:unknown[]=[];const originalGrip=internal.cornerGrip.bind(sim),originalCast=internal.solidCast.bind(sim);
    internal.cornerGrip=(...args:Parameters<typeof originalGrip>)=>{const result=originalGrip(...args);if(!result&&rejections.length<8)rejections.push({kind:'grip',position:args[0].position,phase:args[1].phase,normal:args[1].normal});return result;};
    internal.solidCast=(...args:Parameters<typeof originalCast>)=>{const hit=originalCast(...args);if(hit&&rejections.length<8)rejections.push({kind:'hull',toi:hit.time_of_impact,cell:internal.colliderCell.get(hit.collider.handle)?.id,at:args[0]});return hit;};
    let corner=false,complete=false,released=false,reversed=false,previous={...actor.position},oldSnapshot=admitStructuralSnapshot(sim.snapshot(),null);
    for(let i=0;i<850;i++){
      const c=actor.climb?.corner;
      if(c&&c.distance>plan.approach+plan.arc*.35&&!released){const at={...actor.position},d=c.distance;
        const snapshot=sim.snapshot(),admitted=admitStructuralSnapshot(snapshot,null);expect(admitted).toBeTruthy();
        const forged=structuredClone(snapshot),fc=forged.actors[0].climb!;fc.corner!.distance+=.4;const fs=overhaulCornerSample(plan,fc.corner!.distance,fc.corner!.height);forged.actors[0].position=fs.position;fc.normal=fs.normal;fc.contact=fs.contact;
        expect(admitStructuralSnapshot(forged,admitted)).toBeNull();
        for(let j=0;j<15;j++){command(sim,actor,{climb:true,yaw});sim.step(1/60);}expect(actor.climb?.corner?.distance).toBe(d);expect(actor.position).toEqual(at);released=true;
        for(let j=0;j<12;j++){command(sim,actor,{climb:true,strafe:1,yaw});sim.step(1/60);}expect(actor.climb?.corner?.distance).toBeLessThan(d);reversed=true;previous={...actor.position};
      }
      command(sim,actor,{climb:true,strafe:-1,yaw});sim.step(1/60);
      expect(Math.hypot(actor.position.x-previous.x,actor.position.z-previous.z),JSON.stringify(trace.slice(-6))).toBeLessThanOrEqual(1.4/60+.0021);previous={...actor.position};
      corner ||= !!actor.climb?.corner;
      if(i%30===0||actor.climb?.corner){trace.push({i,position:{...actor.position},climb:actor.climb&&{anchor:actor.climb.anchor,mask:actor.climb.gripMask,corner:actor.climb.corner&&{...actor.climb.corner}}});}
      if(actor.climb?.corner&&i%5===0){const admitted=admitStructuralSnapshot(sim.snapshot(),oldSnapshot);expect(admitted,JSON.stringify(trace.slice(-3))).toBeTruthy();oldSnapshot=admitted;}
      if(actor.climb?.anchor===plan.to.id&&!actor.climb.corner){complete=true;break;}
      if(!actor.climb||actor.climb.corner&&i>420&&trace.length>30&&actor.climb.corner.distance===(trace[trace.length-20] as {climb?:{corner?:{distance:number}}})?.climb?.corner?.distance)break;
    }
    expect(corner,JSON.stringify({trace:trace.slice(-8),rejections})).toBe(true);expect(complete,JSON.stringify({trace:trace.slice(-4),rejections})).toBe(true);expect(released).toBe(true);expect(reversed).toBe(true);
    expect(actor.energy).toBeGreaterThan(0);expect(actor.climb?.gripMask).toBeGreaterThan(0);
    const before=actor.position.y;for(let i=0;i<18;i++){command(sim,actor,{climb:true,forward:1,yaw:Math.atan2(plan.to.normal.x,plan.to.normal.z)});sim.step(1/60);}
    expect(actor.position.y).toBeGreaterThan(before+.3);
    command(sim,actor,{climb:false});sim.step(1/60);expect(actor.climb).toBeNull();
  }finally{sim.dispose();world.free();}
});
it('native owned corner footprints match guest probes, reject an obstacle, and detach immediately when their real source cells retire',()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp'),unregister=registerBuildingContacts(world,id=>sim.buildingCollider(id));try{
    const actor=sim.addActor('support-pilot','Pilot','pounce',false,{x:from.origin.x+from.normal.x*2.05,y:terrainHeight(from.origin.x-2.05,from.origin.z,7734)+1,z:from.origin.z}),yaw=Math.atan2(from.normal.x,from.normal.z),internal=sim as unknown as {climbMotion:Simulation['climbMotion'];colliderCell:Simulation['colliderCell'];continuingFaceGrip:Simulation['continuingFaceGrip'];cornerGrip:Simulation['cornerGrip'];damageCell:Simulation['damageCell'];facePatchSupported:Simulation['facePatchSupported'];physics:Simulation['physics'];solidCast:Simulation['solidCast']};
    for(let i=0;i<60;i++){command(sim,actor,{});sim.step(1/60);}
    for(let i=0;i<180&&actor.position.y<3.8;i++){command(sim,actor,{climb:true,forward:1,yaw});sim.step(1/60);}
    for(let i=0;i<500&&(!actor.climb?.corner||actor.climb.corner.distance<plan.approach+plan.arc*.3);i++){command(sim,actor,{climb:true,strafe:-1,yaw});sim.step(1/60);}
    expect(actor.climb?.corner).toBeTruthy();const climb=actor.climb!,c=climb.corner!;expect(c.distance).toBeGreaterThan(plan.approach+plan.arc*.25);
    const descriptors=climbCornerFaces(7734,climb)!;expect(descriptors.map(f=>f.id)).toEqual([plan.from.id,plan.to.id]);
    const pose=buildingGripPose(actor,climb,sim.time,undefined,false,{faces:descriptors,choices:c.pawFaces}),proofs:Array<{face:typeof from;corners:Vector3[];pivot:Vector3}>=[];
    for(let i=0;i<4;i++)if(climb.gripMask&(1<<i)){const patch=pose.wall[i],pivot=new Vector3(patch.queryPivot!.x,patch.queryPivot!.y,patch.queryPivot!.z),corners=patch.queryCorners.map(p=>new Vector3(p.x,p.y,p.z)),face=descriptors[c.pawFaces![i]];proofs.push({face,corners,pivot});
      expect(probeClimbingContact(world,createClimbingProbe(),face,corners,new Matrix4(),pivot,pivot.clone(),false,MECHS.pounce.scale)).toBe(true);
    }expect(proofs.length).toBeGreaterThanOrEqual(2);
    // A real new solid blocks the command. It has no paw ownership and cannot
    // turn into a diagonal carrier. Original solids are never filtered out.
    const next=overhaulCornerSample(plan,c.distance+1.4/60,c.height),dx=next.position.x-actor.position.x,dz=next.position.z-actor.position.z,length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length,clearance=1.75+.18*(Math.abs(ux)+Math.abs(uz))+.01;
    const blocker=world.createCollider(RAPIER.ColliderDesc.cuboid(.18,.3,.18).setTranslation(actor.position.x+ux*clearance,actor.position.y+.3,actor.position.z+uz*clearance));
    const physics=internal.physics.get(actor.id)!,offset=physics.collider.translationWrtParent()!;
    expect(blocker.contactShape(physics.collider.shape,{x:actor.position.x,y:actor.position.y+offset.y,z:actor.position.z},{x:0,y:0,z:0,w:1},.05)?.distance).toBeGreaterThan(0);
    world.step();const at={...actor.position},d=c.distance;command(sim,actor,{climb:true,strafe:-1,yaw});sim.step(1/60);expect(actor.position).toEqual(at);expect(actor.climb?.corner?.distance).toBe(d);
    world.removeCollider(blocker,true);world.step();command(sim,actor,{climb:true,strafe:-1,yaw});sim.step(1/60);expect(actor.climb?.corner?.distance).toBeGreaterThan(d);
    const motion=internal.climbMotion.get(actor.id)!,cells=new Map<string,Simulation['colliderCell'] extends Map<number,infer C>?C:never>();for(const h of motion.pawHandles.flat()){const cell=internal.colliderCell.get(h);if(cell)cells.set(cell.id,cell);}
    expect(cells.size).toBeGreaterThan(0);for(const cell of cells.values())internal.damageCell(cell,1e6,'qualification',{x:cell.position[0],y:cell.position[1],z:cell.position[2]},{x:0,y:-1,z:0},{x:0,y:1,z:0});
    expect(actor.climb).toBeNull();expect(admitStructuralSnapshot(sim.snapshot(),null)).toBeTruthy();
    const finalProof=proofs.some(p=>!probeClimbingContact(world,createClimbingProbe(),p.face,p.corners,new Matrix4(),p.pivot,p.pivot.clone(),false,MECHS.pounce.scale));expect(finalProof).toBe(true);
  }finally{unregister();sim.dispose();world.free();}
});
