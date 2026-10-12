import {structuralPropCollision,structuralPropCollisionReceipt,type StructuralPropBounds,type StructuralPropKind,type StructuralPropMesh,type StructuralPropComponent} from './structuralPropCollision';

export interface StructuralPropPlacement {x:number;y:number;z:number;rotation:number;scale:number;}
export interface StructuralNavigationBand {minY:number;maxY:number;}
export interface StructuralNavigationStats {testedComponents:number;testedTriangles:number;}
interface NavigationMesh {mesh:StructuralPropMesh;bounds:StructuralPropBounds;components:StructuralPropComponent[];}
const cache=new Map<StructuralPropKind,NavigationMesh>();
/** Two parallel clips of a triangle produce at most five vertices. Shared
 * scratch is safe for this synchronous CPU helper; never retain its buffers. */
const polygonA=new Float64Array(18),polygonB=new Float64Array(18);
function clip(input:Float64Array,count:number,output:Float64Array,y:number,above:boolean):number {
  let n=0;
  for(let i=0;i<count;i++){
    const a=i*3,b=((i+1)%count)*3,ay=input[a+1],by=input[b+1],insideA=above?ay>=y:ay<=y,insideB=above?by>=y:by<=y;
    if(insideA){output[n*3]=input[a];output[n*3+1]=ay;output[n*3+2]=input[a+2];n++;}
    if(insideA!==insideB){const t=(y-ay)/(by-ay);output[n*3]=input[a]+t*(input[b]-input[a]);output[n*3+1]=y;output[n*3+2]=input[a+2]+t*(input[b+2]-input[a+2]);n++;}
  }return n;
}
function segmentDistanceSquared(x:number,z:number,ax:number,az:number,bx:number,bz:number):number {
  const dx=bx-ax,dz=bz-az,length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/length)):0;
  return (x-ax-t*dx)**2+(z-az-t*dz)**2;
}
function polygonDistanceSquared(polygon:Float64Array,count:number,x:number,z:number):number {
  let distance=Infinity,inside=false;
  for(let i=0,j=count-1;i<count;j=i++){
    const ax=polygon[j*3],az=polygon[j*3+2],bx=polygon[i*3],bz=polygon[i*3+2];
    distance=Math.min(distance,segmentDistanceSquared(x,z,ax,az,bx,bz));
    if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
  }return inside?0:distance;
}
function boundsNear(bounds:StructuralPropBounds,x:number,z:number,minY:number,maxY:number,radiusSquared:number):boolean {
  if(bounds.max[1]<minY||bounds.min[1]>maxY)return false;
  const dx=Math.max(bounds.min[0]-x,x-bounds.max[0],0),dz=Math.max(bounds.min[2]-z,z-bounds.max[2],0);return dx*dx+dz*dz<=radiusSquared;
}
/** Horizontal cylinder-vs-exact-static-triangle occupancy for a caller's actual
 * world vertical band. This is navigation geometry, not physics route proof.
 * Bounds prune only; finite clipped triangle unions decide occupancy. Worst
 * case scans all retained triangles (crane 4676); components usually prune most.
 * This matches static trimesh surfaces, not filled solid volumes: callers must
 * seed routes in physics-qualified free space rather than inside closed meshes.
 * Cache is bounded to five source kinds, with no per-instance scaled buffers. */
export function structuralPropNavigationBlocked(kind:StructuralPropKind,prop:StructuralPropPlacement,point:{x:number;z:number},band:StructuralNavigationBand,clearance:number,stats?:StructuralNavigationStats):boolean {
  if(stats){stats.testedComponents=0;stats.testedTriangles=0;}
  if(![prop.x,prop.y,prop.z,prop.rotation,prop.scale,point.x,point.z,band.minY,band.maxY,clearance].every(Number.isFinite)||prop.scale<=0||clearance<0||band.maxY<band.minY)throw Error('Invalid structural navigation query');
  let entry=cache.get(kind);if(!entry){const receipt=structuralPropCollisionReceipt(kind);entry={mesh:structuralPropCollision(kind),bounds:receipt.bounds,components:receipt.components};cache.set(kind,entry);}
  const dx=point.x-prop.x,dz=point.z-prop.z,c=Math.cos(prop.rotation),s=Math.sin(prop.rotation),x=(dx*c-dz*s)/prop.scale,z=(dx*s+dz*c)/prop.scale,
    minY=(band.minY-prop.y)/prop.scale,maxY=(band.maxY-prop.y)/prop.scale,radiusSquared=(clearance/prop.scale)**2;
  if(!boundsNear(entry.bounds,x,z,minY,maxY,radiusSquared))return false;
  const {vertices,indices}=entry.mesh;
  for(const component of entry.components){
    if(!boundsNear(component.bounds,x,z,minY,maxY,radiusSquared))continue;if(stats)stats.testedComponents++;
    for(const triangle of component.triangleIds){
      if(stats)stats.testedTriangles++;
      for(let i=0;i<3;i++){const index=indices[triangle*3+i]*3;polygonA[i*3]=vertices[index];polygonA[i*3+1]=vertices[index+1];polygonA[i*3+2]=vertices[index+2];}
      const lower=clip(polygonA,3,polygonB,minY,true);if(!lower)continue;
      const count=clip(polygonB,lower,polygonA,maxY,false);if(count&&polygonDistanceSquared(polygonA,count,x,z)<=radiusSquared)return true;
    }
  }return false;
}
