import type {ActorState} from '../../../shared/types';
export const FELINE_LIMBS=['FL','FR','HL','HR'] as const;
export type FelineLimb=typeof FELINE_LIMBS[number];
export interface FelinePadFacet {
  object:string; owner:string;
  actualBottomVerticesArmatureSource:readonly (readonly number[])[];
  actualBottomVertexIndices:readonly number[];
  boneWeights:unknown;
}
export interface FelineSourceManifest {
  sourceSHA256:string; exportBindReadbackSHA256:string;
  basis:'source-X-right-minus-Y-forward-Z-up'; scale:.8; actorMount:'Ry-pi';
  boneRest:Readonly<Record<string,{matrix:readonly (readonly number[])[];parent:string|null}>>;
  actualFivePadBinder:readonly FelinePadFacet[];
}
export interface FelinePoseCandidate {
  privateAssetUrl:string; manifest:FelineSourceManifest;
  sourceAccepted:boolean; nativeAccepted:boolean; ordinaryPlayAccepted:boolean;
}
// Admission is deliberately closed. No URL, old rig, query-string switch or
// unrelated clip can turn the pending source into an enabled candidate.
export const FELINE_POSE_OWNER002_ENABLED:boolean=false;
export const FELINE_POSE_OWNER002_CANDIDATE:FelinePoseCandidate|null=null;
export function felinePoseOwnerCandidate(actor:Pick<ActorState,'chassis'|'bot'>):FelinePoseCandidate|null {
  const c=FELINE_POSE_OWNER002_CANDIDATE;
  return FELINE_POSE_OWNER002_ENABLED&&!actor.bot&&actor.chassis==='pounce'&&c?.sourceAccepted&&c.nativeAccepted&&c.ordinaryPlayAccepted?c:null;
}
export interface FelinePoseClock {generation:number; nativeTick:number; nativeTime:number; renderTime:number; frameTime:number;}
export interface FelinePoseReceipt {clock:FelinePoseClock;kind:string;accepted:boolean;reason?:string;raw:unknown;}
export const felinePoseOwnerDiagnostics=new Map<string,{status:'UNQUALIFIED'|'CANDIDATE_CURRENT';reason:string;frames:FelinePoseReceipt[]}>();
