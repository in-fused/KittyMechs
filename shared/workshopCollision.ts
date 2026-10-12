import source from './data/workshopCollision.json' with {type:'json'};
import {workshopGeometryKind,type WorkshopGeometryKind} from './workshopGeometry';

interface CollisionMesh {vertices:Float32Array;indices:Uint32Array;}
const cache=new Map<WorkshopGeometryKind,CollisionMesh>();
function decode(encoded:string,unsigned:boolean):Float32Array|Uint32Array{
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer);
  if(bytes.byteLength%4)throw new Error('Invalid workshop collision stream');
  const result=unsigned?new Uint32Array(bytes.byteLength/4):new Float32Array(bytes.byteLength/4);
  for(let i=0;i<result.length;i++)result[i]=unsigned?view.getUint32(i*4,true):view.getFloat32(i*4,true);
  return result;
}
/** Cache only immutable local-space buffers. Rapier collider ownership remains
 * with each scene/tile, and scale is applied once to a separate instance buffer. */
export function workshopCollision(seed:number,scale=1):CollisionMesh{
  const kind=workshopGeometryKind(seed);let mesh=cache.get(kind);
  if(!mesh){const row=source.meshes[kind];mesh={vertices:decode(row.positionsLE,false) as Float32Array,indices:decode(row.indicesLE,true) as Uint32Array};cache.set(kind,mesh);}
  if(!Number.isFinite(scale)||scale<=0)throw new Error('Invalid workshop collision scale');
  return {vertices:scale===1?mesh.vertices:mesh.vertices.map(v=>v*scale),indices:mesh.indices};
}
export function workshopCollisionReceipt(seed:number){const {positionsLE:_,indicesLE:__,...receipt}=source.meshes[workshopGeometryKind(seed)];void _;void __;return receipt;}
