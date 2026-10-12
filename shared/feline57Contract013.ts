/** Experimental asset contract. No registry/default or simulation activation. */
export type V3_013 = [number, number, number];
export type Q4_013 = [number, number, number, number];
/** Column-major GLTF matrices. Exported bone-local axes are not source axes. */
export type M4_013 = number[];
export type Limb013 = 'FL'|'FR'|'HL'|'HR';
export interface Node013 { name:string; parent:number|null; translation:V3_013; rotation:Q4_013; scale:V3_013; matrix?:M4_013; }
export interface Skin013 { joints:number[]; inverseBinds:M4_013[]; }
export interface Channel013 { node:number; path:'translation'|'rotation'|'scale'; interpolation:'LINEAR'|'STEP'|'CUBICSPLINE'; times:number[]; values:number[]; }
export interface Clip013 { name:string; duration:number; channels:Channel013[]; }
export interface Vertex013 { position:V3_013; joints:[number,number,number,number]|null; weights:[number,number,number,number]|null; authoredWeights:[number,number,number,number]|null; sourceId:number; }
export interface Pad013 { id:string; limb:Limb013; digit:number; bone:string; meshNode:number; skin:number|null; vertices:Vertex013[]; triangles:[number,number,number][]; }
export interface Chain013 { limb:Limb013; nodes:number[]; linkLengthsSource:number[]; kind:'fore-two-link'|'hind-three-link'; }
export interface Feline57Packet013 {
  schema:'feline57-export013'; identity:{assetSha256:string; sourceProfileSha256:string; padReadbackSha256:string; sourceOffsetsSha256:string};
  frame:{units:'GLTF-export-units-Yup'; runtimeScale:0.8; actorMountYawRadians:number; sourceToGLTF:'[x,z,-y]'; floorDatum:'source-world-Z0; exported ancestry retained; carrierY minus legacy datum only in future adapter'; carrierOwnership:'one external parent; never per-bone';};
  nodes:Node013[]; roots:number[]; skins:Skin013[]; boneNodes:number[]; chains:Chain013[]; clips:Clip013[]; pads:Pad013[];
  sourceRest:{name:string;parent:string|null;matrixBoneLocalToArmatureSource:number[][];lengthSource:number}[];
  weightPolicy:'actual post-GLTFLoader weights; authored raw slots retained separately; no runtime normalization';
  status:'EXPERIMENTAL_SOURCE_DATA_NOT_NATIVE_ADMISSION';
}
export interface Primitive013 { id:string; meshNode:number; skin:number|null; vertices:Vertex013[]; indices:number[]; triangleOwners:string[]; }
/** Tool-only dense geometry; not part of the per-tick pose packet. */
export interface Geometry013 { schema:'feline57-offline-geometry013'; assetSha256:string; primitives:Primitive013[]; }
export interface Pose013 { clip:string|null; time:number; local:M4_013[]; world:M4_013[]; bones:{node:number;name:string;matrix:M4_013}[]; pads:{id:string;limb:Limb013;points:V3_013[];triangles:[number,number,number][]}[]; }
