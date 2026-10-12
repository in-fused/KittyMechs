import { getMap } from './maps';
import { terrainHeight } from './world';

/** Terrain-following road ribbons and lane markings. Upward-facing winding is
 * required because the runtime uses a one-sided surface material. */
export function buildRoadGeometry(seed:number,markings=false){
  const vertices:number[]=[],indices:number[]=[],uv:number[]=[];
  const quad=(ax:number,az:number,bx:number,bz:number,width:number,offset=0)=>{
    const length=Math.hypot(bx-ax,bz-az);if(length<.001)return;
    const nx=-(bz-az)/length,nz=(bx-ax)/length,start=vertices.length/3;
    for(const [x,z,side] of [[ax,az,-1],[ax,az,1],[bx,bz,-1],[bx,bz,1]]){
      const px=x+nx*(side*width/2+offset),pz=z+nz*(side*width/2+offset);
      vertices.push(px,terrainHeight(px,pz,seed)+(markings?.065:.035),pz);uv.push(px/7,pz/7);
    }
    indices.push(start,start+1,start+2,start+1,start+3,start+2);
  };
  for(const road of getMap(seed).roads)for(let i=1;i<road.points.length;i++){
    const a=road.points[i-1],b=road.points[i],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length/2);
    for(let j=0;j<steps;j++){
      const t=j/steps,u=(j+1)/steps,ax=a.x+(b.x-a.x)*t,az=a.z+(b.z-a.z)*t,bx=a.x+(b.x-a.x)*u,bz=a.z+(b.z-a.z)*u;
      if(markings){quad(ax,az,bx,bz,.13,road.width/2-.5);quad(ax,az,bx,bz,.13,-road.width/2+.5);if(Math.floor(j*length/steps/5)%2===0)quad(ax,az,bx,bz,.16);}
      else quad(ax,az,bx,bz,road.width);
    }
  }
  return {vertices:new Float32Array(vertices),indices:new Uint32Array(indices),uv:new Float32Array(uv)};
}
