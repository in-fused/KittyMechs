/** Bounded read-only shipping-pose/full-hull feasibility witness. */
import RAPIER from '@dimforge/rapier3d-compat';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Simulation} from '../shared/simulation';
import {buildingFaces,facePoint,faceCoordinates} from '../shared/buildingSurfaces';
import {buildingGripPose} from '../shared/buildingGrip';
import {MECHS} from '../shared/config';
import type {ClimbState} from '../shared/types';
type NativeGripQuery={
  facePatchSupported:Simulation['facePatchSupported'];
  solidIntersection:Simulation['solidIntersection'];
  solidCast:Simulation['solidCast'];
  colliderCell:Simulation['colliderCell'];
};

await RAPIER.init();
const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp');
try{
  const face=buildingFaces(7734).find(f=>f.buildingId.endsWith(':spawn-west')&&f.side==='north')!,internal=sim as unknown as NativeGripQuery;
  const actor=sim.addActor('feasibility','Probe','pounce',false,{x:face.origin.x,y:4,z:face.origin.z+1.84});sim.step(1/60);
  const shape=new RAPIER.RoundCylinder(1.3-.12,1.75-.12,.12),rotation={x:0,y:0,z:0,w:1};
  const extent=face.roofHalfExtents.z,overhang=Math.max(0,faceCoordinates(face,face.roofCenter).normal+extent),offsets=[1.84,1.94,2.14,1.87+overhang];
  const rows:unknown[]=[],summary:unknown[]=[];
  for(const normal of [...new Set(offsets)].sort((a,b)=>a-b)){
    let previousClear:{x:number;y:number;z:number}|undefined;
    for(let y=6.8;y<=face.roofCenter.y+1.13;y+=.1){
      const plane=facePoint(face,0,y),position={x:plane.x+face.normal.x*normal,y:plane.y,z:plane.z+face.normal.z*normal},center={...position,y:y+.3};
      const collision=internal.solidIntersection(center,rotation,shape,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
      let sweepClear=!collision;
      if(previousClear){const start={...previousClear,y:previousClear.y+.3},delta={x:center.x-start.x,y:center.y-start.y,z:center.z-start.z},hit=internal.solidCast(start,rotation,delta,shape,0,1,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);sweepClear&&=!hit||hit.time_of_impact>=1;}
      previousClear=position;
      let best=0,winning:unknown;
      for(const phase of ['cling','climb','mantle'] as const)for(const progress of phase==='mantle'?[0,.25,.5,.75,1]:[0]){
        const contact=facePoint(face,0,Math.min(y+.4,face.topY-.1)),state:ClimbState={anchor:face.id,phase,startedAt:0,progress,normal:{...face.normal},contact,top:face.roofCenter.y,base:face.minY,height:face.height,gripMask:0,roofMask:0,mantleStage:null,mantleStageAt:0};
        const pose=buildingGripPose({...actor,position},state,1),handles:number[][]=[[],[],[],[]],wall:number[]=[],roof:number[]=[];
        for(let paw=0;paw<4;paw++){
          if(pose.wall[paw].eligible&&internal.facePatchSupported(face,pose.wall[paw],false,contact,MECHS.pounce.scale,handles[paw]))wall.push(paw);
          handles[paw]=[];
          if(pose.roof[paw].eligible&&internal.facePatchSupported(face,pose.roof[paw],true,contact,MECHS.pounce.scale,handles[paw]))roof.push(paw);
        }
        const supported=new Set([...wall,...roof]).size;
        if(supported>best){best=supported;winning={phase,progress,wall,roof,reach:pose.wall.map(p=>p.targetReach),targets:pose.wall.map(p=>({...p.queryPivot!}))};}
      }
      const row={normal,y,fullHullClear:!collision,sweepClear,blocker:collision?internal.colliderCell.get(collision.handle)?.id??String(collision.handle):null,best,winning};rows.push(row);
      if(!collision&&best<2||y>face.roofCenter.y+.9)summary.push(row);
    }
  }
  const out=resolve('.sites-runtime/overhaul-20261009/mantle-feasibility-001');mkdirSync(out,{recursive:true});writeFileSync(resolve(out,'geometry.json'),JSON.stringify({scope:'Read-only sampled shipping-pose feasibility, not a planted-path proof or approval',face,overhang,shape:{radius:1.75,height:2.6,centerOffset:.3},rows},null,2));
  console.log(JSON.stringify({output:out,face:face.id,roof:face.roofCenter.y,overhang,samples:rows.length,summary}));
}finally{sim.dispose();world.free();}
