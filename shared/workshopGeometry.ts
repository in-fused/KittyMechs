import roofPatches from './data/workshopRoofPatches.json' with {type:'json'};

/** Facade origins describe the dominant visible wall. Live contact is always
 * proved against the exact mesh; trim, recesses and canopies are not wall fill. */
export const WORKSHOP_GEOMETRY={
  factory:{wallHalfX:10.04964778297213,wallHalfZ:8.150179786634396,wallTop:12.000113503392223,roofTop:12.739732217360038,roofHalfX:11.5,roofHalfZ:8.999740592669454},
  stock:{wallHalfX:10.00068666646321,wallHalfZ:8.00002288888235,wallTop:12.000314436015035,roofTop:12.799456865898758,roofHalfX:11.410153508102665,roofHalfZ:8.90960798974578},
} as const;
export type WorkshopGeometryKind=keyof typeof WORKSHOP_GEOMETRY;
export function workshopGeometryKind(seed:number):WorkshopGeometryKind{return seed===7734?'factory':'stock';}
export function workshopGeometry(seed:number){return WORKSHOP_GEOMETRY[workshopGeometryKind(seed)];}
/** A roof's trim and beams can sit above its main deck. Fixed props use the
 * actual highest upward triangle at their footprint rather than a raised box. */
export function workshopRoofHeight(seed:number,x:number,z:number):number|null{
  if(!Number.isFinite(x)||!Number.isFinite(z))return null;
  let height=-Infinity;
  for(const t of roofPatches.meshes[workshopGeometryKind(seed)].triangles){
    const ax=t[0],az=t[2],bx=t[3],bz=t[5],cx=t[6],cz=t[8],denominator=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);
    if(Math.abs(denominator)<1e-12)continue;
    const a=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/denominator,b=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/denominator,c=1-a-b;
    if(a>=-1e-8&&b>=-1e-8&&c>=-1e-8)height=Math.max(height,a*t[1]+b*t[4]+c*t[7]);
  }
  return Number.isFinite(height)?height:null;
}
export function workshopRoofMax(seed:number):number{return roofPatches.meshes[workshopGeometryKind(seed)].maxY;}
/** Highest real support intersecting a rigid prop footprint, including a narrow
 * beam between its corners. Polygon clipping never invents a filled roof. */
export function workshopRoofFootprintHeight(seed:number,x:number,z:number,halfX:number,halfZ:number):number|null{
  if(![x,z,halfX,halfZ].every(Number.isFinite)||halfX<0||halfZ<0)return null;
  let height=-Infinity;
  for(const t of roofPatches.meshes[workshopGeometryKind(seed)].triangles){
    let polygon=[0,3,6].map(i=>({x:t[i],y:t[i+1],z:t[i+2]}));
    for(const [axis,bound,sign] of [['x',x-halfX,1],['x',x+halfX,-1],['z',z-halfZ,1],['z',z+halfZ,-1]] as const){
      const clipped:typeof polygon=[];
      for(let i=0;i<polygon.length;i++){
        const a=polygon[i],b=polygon[(i+1)%polygon.length],da=(a[axis]-bound)*sign,db=(b[axis]-bound)*sign;
        if(da>=0)clipped.push(a);
        if((da>=0)!==(db>=0)){const u=da/(da-db);clipped.push({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,z:a.z+(b.z-a.z)*u});}
      }
      polygon=clipped;if(!polygon.length)break;
    }
    for(const p of polygon)height=Math.max(height,p.y);
  }
  return Number.isFinite(height)?height:null;
}
