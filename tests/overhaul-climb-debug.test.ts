import {beforeAll,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {cityDistrict} from '../shared/cityDistrict';
import {actorHullRadius} from '../shared/config';
import {buildingFaces,faceLanding} from '../shared/buildingSurfaces';
import {parseInput} from '../shared/protocol';
import {emptyInput,type ActorState,type InputState} from '../shared/types';
import {terrainHeight} from '../shared/world';
import {Navigation} from '../shared/navigation';

beforeAll(async()=>{await RAPIER.init();});
const command=(sim:Simulation,a:ActorState,patch:Partial<InputState>)=>sim.setInput(a.id,parseInput({...emptyInput(),stance:a.stance,seq:sim.tick+1,jumpEpoch:a.jumpEpoch,...patch})!);
for(const [name,route] of [['relay-east-entry',false],['entry-gantry',false],['entry-gantry',true]] as const)it(`Pounce ${route?'walks from mission spawn, then ':''}reaches and physically lands on ${name} using ordinary climb input`,()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp');
  try{
    const b=cityDistrict(7734)!.buildings.find(b=>b.id.endsWith(`:${name}`))!,anchor=b.anchor,radius=actorHullRadius({bot:false,chassis:'pounce'});
    const a=sim.addActor('pilot','Pilot','pounce',false,route?undefined:{x:anchor.position.x+anchor.normal.x*(radius+.3),y:terrainHeight(anchor.approach.x,anchor.approach.z,7734)+1,z:anchor.position.z+anchor.normal.z*(radius+.3)});
    const trace:unknown[]=[],grips=new Map<string,unknown>(),obstructions=new Map<string,unknown>(),internal=sim as unknown as {beginFaceVault:Simulation['beginFaceVault'];colliderCell:Simulation['colliderCell'];faceGripMasks:Simulation['faceGripMasks'];solidIntersection:Simulation['solidIntersection']};
    const grip=internal.faceGripMasks.bind(sim),vault=internal.beginFaceVault.bind(sim);
    internal.faceGripMasks=(...args:Parameters<typeof grip>)=>{const result=grip(...args);grips.set(args[1].id,{...result,position:{...args[0].position},phase:args[2].phase,owners:args[1].supportingBlockIds});return result;};
    internal.beginFaceVault=(...args:Parameters<typeof vault>)=>{const result=vault(...args);if(trace.length<45)trace.push({vault:result,t:sim.time,face:args[2].id,landing:faceLanding(args[2],args[3],radius),position:{...a.position}});return result;};
    const intersection=internal.solidIntersection.bind(sim);
    internal.solidIntersection=(...args:Parameters<typeof intersection>)=>{const hit=intersection(...args);if(hit){const block=internal.colliderCell.get(hit.handle);obstructions.set(block?.id??String(hit.handle),{block,position:args[0],shape:args[2]});}return hit;};
    for(let i=0;i<60;i++){command(sim,a,{});sim.step(1/60);}expect(a.grounded).toBe(true);
    if(route){
      const path=new Navigation(7734).path(a.position,{...anchor.approach,y:a.position.y});expect(path.length).toBeGreaterThan(0);
      let next=0;
      for(let i=0;i<2400&&next<path.length;i++){
        const point=path[next],dx=point.x-a.position.x,dz=point.z-a.position.z;
        if(Math.hypot(dx,dz)<.65){next++;continue;}
        command(sim,a,{forward:1,yaw:Math.atan2(-dx,-dz)});sim.step(1/60);
      }
      expect(next,JSON.stringify({path,position:a.position})).toBe(path.length);
      // Navigation returns grid centers. Finish the final physical approach
      // using ordinary steering before asking for a face-relative ascent.
      for(let i=0;i<360;i++){
        const dx=anchor.approach.x-a.position.x,dz=anchor.approach.z-a.position.z;
        if(Math.hypot(dx,dz)<.2)break;
        command(sim,a,{forward:1,yaw:Math.atan2(-dx,-dz)});sim.step(1/60);
      }
      expect(Math.hypot(anchor.approach.x-a.position.x,anchor.approach.z-a.position.z)).toBeLessThan(.2);
    }
    let grabbed=false,mantled=false,finished=false,previous='';
    const yaw=Math.atan2(anchor.normal.x,anchor.normal.z);
    for(let i=0;i<960;i++){
      command(sim,a,{climb:true,forward:1,yaw});sim.step(1/60);
      const phase=a.climb?`${a.climb.anchor}:${a.climb.phase}:${a.climb.mantleStage}`:'none';
      if(phase!==previous||i%120===0){trace.push({i,phase,position:{...a.position},energy:a.energy,masks:a.climb&&[a.climb.gripMask,a.climb.roofMask]});previous=phase;}
      if(a.climb){grabbed=true;mantled ||= a.climb.phase==='mantle';
        if(a.climb.phase==='mantle'&&(a.climb.mantleStage==='out'||a.climb.mantleStage==='lift'))expect(a.climb.gripMask|a.climb.roofMask).toBe(0);
        if(a.climb.phase==='mantle'&&(a.climb.mantleStage==='transfer'||a.climb.mantleStage==='settle'))expect(a.position.y-1).toBeGreaterThanOrEqual(a.climb.top+.1);
      }else if(grabbed){finished=true;break;}
    }
    const evidence=JSON.stringify({name,grabbed,mantled,finished,trace,grips:[...grips.values()],obstructions:[...obstructions.values()],faces:buildingFaces(7734).filter(f=>f.buildingId===b.id).map(f=>({id:f.id,origin:f.origin,owners:f.supportingBlockIds}))},null,2);
    expect(grabbed,evidence).toBe(true);expect(finished,evidence).toBe(true);expect(mantled,evidence).toBe(true);expect(a.energy,evidence).toBeGreaterThan(35);
    for(let i=0;i<24;i++){command(sim,a,{});sim.step(1/60);}
    expect(a.grounded,evidence).toBe(true);expect(a.position.y-1,evidence).toBeGreaterThanOrEqual(b.roof.center.y-.02);
    // Bridge travel follows its physical longitudinal deck. Continuing straight
    // inward from a side portal for 7m would deliberately walk off a 4m deck.
    const walkYaw=name==='entry-gantry'?-Math.PI/2:yaw;
    const walkStart={...a.position};
    for(let i=0;i<60;i++){command(sim,a,{forward:1,yaw:walkYaw});sim.step(1/60);}
    expect(Math.hypot(a.position.x-walkStart.x,a.position.z-walkStart.z),evidence).toBeGreaterThan(3);
    expect(a.grounded,evidence).toBe(true);
    expect(a.position.y-1,evidence).toBeGreaterThanOrEqual(b.roof.center.y-.02);
  }finally{sim.dispose();world.free();}
});
