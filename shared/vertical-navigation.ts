import {ACTOR_HEIGHT} from './config';
import type {Vec3} from './types';

/** Authored, horizontal supported deck; no synthetic staircase or vertical grid cells. */
export interface SupportedRoof {id:string;anchorId:string;center:Vec3;yaw:number;halfExtents:{x:number;z:number};}
const local=(roof:SupportedRoof,p:Vec3)=>{
  const dx=p.x-roof.center.x,dz=p.z-roof.center.z,c=Math.cos(roof.yaw),s=Math.sin(roof.yaw);
  return {x:dx*c-dz*s,z:dx*s+dz*c};
};
const world=(roof:SupportedRoof,x:number,z:number):Vec3=>{
  const c=Math.cos(roof.yaw),s=Math.sin(roof.yaw);
  return {x:roof.center.x+x*c+z*s,y:roof.center.y+ACTOR_HEIGHT,z:roof.center.z-x*s+z*c};
};
export const onRoof=(roof:SupportedRoof,p:Vec3)=>{
  const at=local(roof,p);return Math.abs(p.y-ACTOR_HEIGHT-roof.center.y)<1.3&&Math.abs(at.x)<=roof.halfExtents.x+.05&&Math.abs(at.z)<=roof.halfExtents.z+.05;
};
export function roofPoint(roof:SupportedRoof,p:Vec3,radius:number):Vec3 {
  const at=local(roof,p),x=Math.max(0,roof.halfExtents.x-radius-.25),z=Math.max(0,roof.halfExtents.z-radius-.25);
  return world(roof,Math.max(-x,Math.min(x,at.x)),Math.max(-z,Math.min(z,at.z)));
}
/** A small bounded grid on the actual supported surface. Clearance is supplied by
 * authoritative static hull queries, allowing newly blocked roof paths to replan. */
export function roofPath(roof:SupportedRoof,from:Vec3,to:Vec3,radius:number,clear:(p:Vec3)=>boolean):Vec3[] {
  const cell=1.5,hx=roof.halfExtents.x-radius-.25,hz=roof.halfExtents.z-radius-.25;
  if(hx<=0||hz<=0)return [];
  // Keep x/z cell counts consistent for non-square and rotated roofs.
  const rows=Math.floor(2*hz/cell)+1,cols=Math.floor(2*hx/cell)+1,total=rows*cols;
  if(total>320)return [];
  const at=(id:number)=>world(roof,-hx+(id%cols)*2*hx/Math.max(cols-1,1),-hz+Math.floor(id/cols)*2*hz/Math.max(rows-1,1));
  const openCells=new Map<number,boolean>(),free=(id:number)=>{let value=openCells.get(id);if(value===undefined){value=clear(at(id));openCells.set(id,value);}return value;};
  const nearest=(p:Vec3)=>{
    const q=local(roof,p);let best=-1,distance=Infinity;
    for(let id=0;id<total;id++){const r=local(roof,at(id)),d=Math.hypot(r.x-q.x,r.z-q.z);if(d<distance&&free(id)){best=id;distance=d;}}
    return best;
  };
  const start=nearest(from),end=nearest(roofPoint(roof,to,radius));if(start<0||end<0)return [];
  const queue=[start],parents=new Map<number,number>(),visited=new Set([start]);let found=false;
  for(let head=0;head<queue.length&&head<320;head++) {
    const id=queue[head];if(id===end){found=true;break;}
    const x=id%cols,z=Math.floor(id/cols);
    for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]) {
      if(x+dx<0||x+dx>=cols||z+dz<0||z+dz>=rows)continue;
      const next=(z+dz)*cols+x+dx;if(visited.has(next)||!free(next))continue;
      visited.add(next);parents.set(next,id);queue.push(next);
    }
  }
  if(!found)return [];
  const path:Vec3[]=[];for(let id=end;id!==start;id=parents.get(id)!)path.unshift(at(id));
  const goal=roofPoint(roof,to,radius);if(clear(goal))path.push(goal);
  return path.slice(0,64);
}
