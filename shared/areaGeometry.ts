import type {CoverState,Vec3} from './types';
import {terrainHeight,propCollider} from './world';
import {roofSurfaces} from './traversal';
export interface EffectSurface {center:Vec3;yaw:number;halfExtents:{x:number;z:number};}
const local=(p:Vec3,s:EffectSurface)=>{const dx=p.x-s.center.x,dz=p.z-s.center.z,c=Math.cos(s.yaw),n=Math.sin(s.yaw);return{x:dx*c-dz*n,z:dx*n+dz*c};};
const contains=(p:Vec3,s:EffectSurface)=>{const q=local(p,s);return Math.abs(q.x)<=s.halfExtents.x&&Math.abs(q.z)<=s.halfExtents.z;};
/** Exact admitted deck/cargo tops. Retired cover never remains a visual support. */
export function effectSurfaces(seed:number,cover:readonly CoverState[]=[]):EffectSurface[]{
  const gone=new Set(cover.filter(c=>c.destroyedAt!==null).map(c=>c.id));
  return roofSurfaces(seed).flatMap(r=>[r,...r.obstacles.filter(p=>!gone.has(p.id!)).flatMap(p=>{const box=propCollider(p);return box?[{center:{x:p.x,y:p.y+box[1]*2,z:p.z},yaw:p.rotation,halfExtents:{x:box[0],z:box[2]}}]:[];})]);
}
export function effectSurface(seed:number,feet:Vec3,cover:readonly CoverState[]=[],maximumDrop=3):EffectSurface|undefined {
  return effectSurfaces(seed,cover).filter(s=>contains(feet,s)&&feet.y-s.center.y>=-.12&&feet.y-s.center.y<=maximumDrop).sort((a,b)=>b.center.y-a.center.y)[0];
}
export function effectFloor(seed:number,position:Vec3,cover:readonly CoverState[]=[],maximumDrop=3):number {
  const feet={...position,y:position.y-1};return effectSurface(seed,feet,cover,maximumDrop)?.center.y??terrainHeight(position.x,position.z,seed);
}
function clipPolygon(points:Vec3[],surface:EffectSurface):Vec3[]{
  let polygon=points.map(p=>local(p,surface));
  for(const [axis,sign,limit] of [['x',1,surface.halfExtents.x],['x',-1,surface.halfExtents.x],['z',1,surface.halfExtents.z],['z',-1,surface.halfExtents.z]] as const){
    const out:typeof polygon=[];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],da=a[axis]*sign-limit,db=b[axis]*sign-limit;
      if(da<=0)out.push(a);
      if((da<0&&db>0)||(da>0&&db<0)){const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}
    }
    polygon=out;if(polygon.length<3)return[];
  }
  const c=Math.cos(surface.yaw),n=Math.sin(surface.yaw);
  return polygon.map(p=>({x:surface.center.x+p.x*c+p.z*n,y:surface.center.y+.105,z:surface.center.z-p.x*n+p.z*c}));
}
/** Ground follows graded terrain. Elevated rings are clipped to their supported
 * plane rather than making vertical curtains from a roof down to the ground. */
export function areaRing(seed:number,position:Vec3,radius:number,inner=.96,start=0,length=Math.PI*2,cover:readonly CoverState[]=[]){
  const vertices:number[]=[],indices:number[]=[],segments=64;
  const surface=effectSurface(seed,{...position,y:position.y-1},cover);
  const point=(i:number,fraction:number):Vec3=>{const angle=start+i/segments*length,r=radius*fraction,x=position.x+Math.cos(angle)*r,z=position.z-Math.sin(angle)*r;return{x,y:surface?surface.center.y+.105:terrainHeight(x,z,seed)+.105,z};};
  if(!surface){
    for(let i=0;i<=segments;i++)for(const fraction of [inner,1]){const p=point(i,fraction);vertices.push(p.x,p.y,p.z);}
    for(let i=0;i<segments;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }else for(let i=0;i<segments;i++){
    const polygon=clipPolygon([point(i,inner),point(i,1),point(i+1,1),point(i+1,inner)],surface),offset=vertices.length/3;
    polygon.forEach(p=>vertices.push(p.x,p.y,p.z));
    for(let j=1;j+1<polygon.length;j++){
      const a=polygon[0],b=polygon[j],c=polygon[j+1];
      if((b.z-a.z)*(c.x-a.x)-(b.x-a.x)*(c.z-a.z)>1e-9)indices.push(offset,offset+j,offset+j+1);
    }
  }
  return{vertices:new Float32Array(vertices),indices:new Uint32Array(indices)};
}
