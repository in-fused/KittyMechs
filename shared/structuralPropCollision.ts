import raw from './data/structuralPropCollision.json' with {type:'json'};

export const STRUCTURAL_PROP_KINDS=['cargo','tower','pipes','wall','crane'] as const;
export type StructuralPropKind=typeof STRUCTURAL_PROP_KINDS[number];
export interface StructuralPropBounds {min:number[];max:number[];}
export interface StructuralPropComponent {id:string;primitiveId:string;triangleIds:number[];bounds:StructuralPropBounds;signedVolume:number;boundaryEdges:number;nonManifoldEdges:number;closed:boolean;}
/** Query candidate is the exact connected triangle union, never its bounds fill.
 * Sloped/curved triangles outside wall/up classification remain in the collider. */
export interface StructuralPropPatch {id:string;componentId:string;orientation:'wall'|'up';normal:number[];plane:number;triangleIds:number[];bounds:StructuralPropBounds;}
export interface StructuralPropPrimitive {id:string;nodeIndex:number;nodeName:string;meshName:string;primitiveIndex:number;material:string|null;nodeWorldMatrix:number[];sourcePositionCount:number;sourceTriangleCount:number;triangleStart:number;triangleCount:number;uvAttributes:{semantic:string;count:number}[];sourceVertexIndicesLE:string;sourceTriangleIndicesLE:string;}
export interface StructuralPropReceipt {
  source:string;sourceSha256:string;bounds:StructuralPropBounds;vertexCount:number;triangleCount:number;skippedDegenerate:number;
  positionsSha256:string;indicesSha256:string;primitives:StructuralPropPrimitive[];components:StructuralPropComponent[];patches:StructuralPropPatch[];
}
interface Row extends StructuralPropReceipt {positionsLE:string;indicesLE:string;}
const source=raw as unknown as {version:number;method:string;meshes:Record<StructuralPropKind,Row>};
export interface StructuralPropMesh {vertices:Float32Array;indices:Uint32Array;}
const cache=new Map<StructuralPropKind,StructuralPropMesh>();
export function isStructuralPropKind(kind:unknown):kind is StructuralPropKind {
  return typeof kind==='string'&&(STRUCTURAL_PROP_KINDS as readonly string[]).includes(kind);
}
function rowFor(kind:StructuralPropKind):Row {
  if(!isStructuralPropKind(kind))throw Error('Unsupported structural prop kind');return source.meshes[kind];
}
function decode(encoded:string,unsigned:boolean):Float32Array|Uint32Array {
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));if(bytes.byteLength%4)throw Error('Invalid structural prop collision stream');
  const view=new DataView(bytes.buffer),out=unsigned?new Uint32Array(bytes.byteLength/4):new Float32Array(bytes.byteLength/4);
  for(let i=0;i<out.length;i++)out[i]=unsigned?view.getUint32(i*4,true):view.getFloat32(i*4,true);return out;
}
/** Immutable cached nodeWorldMatrix-baked local buffers. Scale once here; caller
 * places the resulting trimesh at prop translation/yaw, with no node reapply. */
export function structuralPropCollision(kind:StructuralPropKind,scale=1):StructuralPropMesh {
  const row=rowFor(kind);if(!Number.isFinite(scale)||scale<=0)throw Error('Invalid structural prop collision scale');
  let mesh=cache.get(kind);
  if(!mesh){
    mesh={vertices:decode(row.positionsLE,false) as Float32Array,indices:decode(row.indicesLE,true) as Uint32Array};
    if(mesh.vertices.length!==row.vertexCount*3||mesh.indices.length!==row.triangleCount*3)throw Error('Invalid structural prop collision counts');
    cache.set(kind,mesh);
  }
  return {vertices:scale===1?mesh.vertices:mesh.vertices.map(v=>v*scale),indices:mesh.indices};
}
export function structuralPropCollisionReceipt(kind:StructuralPropKind):StructuralPropReceipt {
  const {positionsLE:_,indicesLE:__,...receipt}=rowFor(kind);void _;void __;return receipt;
}
export function structuralPropPatches(kind:StructuralPropKind):readonly StructuralPropPatch[]{return rowFor(kind).patches;}
