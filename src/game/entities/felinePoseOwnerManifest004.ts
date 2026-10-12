import {firstPoseFailures004} from './felinePoseOwnerEvidence004';
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
  exportBindingReadiness:{status:'INDEPENDENT_EXPORT_BIND_READY';sourceSHA256:string;exportBindReadbackSHA256:string;independentReviewSHA256:string}; nativeAccepted:boolean; ordinaryPlayAccepted:boolean;
}
// Admission is deliberately closed. No URL, old rig, query-string switch or
// unrelated clip can turn the pending source into an enabled candidate.
export const FELINE_POSE_OWNER002_ENABLED:boolean=false;
export const FELINE_POSE_OWNER002_CANDIDATE:FelinePoseCandidate|null=null;
export function felinePoseOwnerCandidate(actor:Pick<ActorState,'chassis'|'bot'>):FelinePoseCandidate|null {
  const c=pendingCandidate004??FELINE_POSE_OWNER002_CANDIDATE;
  return !actor.bot&&actor.chassis==='pounce'&&c?.exportBindingReadiness?.status==='INDEPENDENT_EXPORT_BIND_READY'&&(pendingCandidate004===c||FELINE_POSE_OWNER002_ENABLED&&c.nativeAccepted&&c.ordinaryPlayAccepted)?c:null;
}
export interface FelinePoseClock {authorityWorldId?:string;life?:number;nativeStepTick?:number;clientSceneFrameTime?:number;generation:number; nativeTick:number; nativeTime:number; renderTime:number; frameTime:number;}
export interface FelinePoseReceipt {clock:FelinePoseClock;kind:string;accepted:boolean;reason?:string;raw:unknown;}
export const felinePoseOwnerDiagnostics=new Map<string,{status:'UNQUALIFIED'|'CANDIDATE_CURRENT';reason:string;frames:FelinePoseReceipt[]}>();

let pendingCandidate004:FelinePoseCandidate|null=null;
export const POSE_PENDING_EVENT004='kittymech-private-pose-pending004';
/** Explicit root-controlled localhost development experiment. Acceptance flags
 * stay false; ordinary shipping admission remains closed. No URL switch. */
const privateBuild004=import.meta.env.DEV||import.meta.env.VITE_ROOT_PRIVATE_POSE004==='1';
export function configureRootPendingPose004(candidate:FelinePoseCandidate|null):boolean {
  if(!privateBuild004||typeof window==='undefined'||!['localhost','127.0.0.1','[::1]'].includes(window.location.hostname))return false;
  if(candidate&&(candidate.exportBindingReadiness?.status!=='INDEPENDENT_EXPORT_BIND_READY'||candidate.exportBindingReadiness.sourceSHA256!==candidate.manifest.sourceSHA256||candidate.exportBindingReadiness.exportBindReadbackSHA256!==candidate.manifest.exportBindReadbackSHA256||!/^([a-fA-F0-9]{64})$/.test(candidate.exportBindingReadiness.independentReviewSHA256)||candidate.nativeAccepted||candidate.ordinaryPlayAccepted||!candidate.privateAssetUrl||!candidate.manifest.sourceSHA256||!candidate.manifest.exportBindReadbackSHA256))return false;
  pendingCandidate004=candidate?structuredClone(candidate):null;window.dispatchEvent(new Event(POSE_PENDING_EVENT004));return true;
}
declare global {interface Window {kittyMechPosePending004?:{configure:typeof configureRootPendingPose004;mode:'PENDING_PRIVATE_UNQUALIFIED';failures:()=>unknown[];diagnostics:()=>unknown[]};}}
if(privateBuild004&&typeof window!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(window.location.hostname))window.kittyMechPosePending004={configure:configureRootPendingPose004,mode:'PENDING_PRIVATE_UNQUALIFIED',failures:()=>structuredClone([...firstPoseFailures004.values()]),diagnostics:()=>structuredClone([...felinePoseOwnerDiagnostics.entries()])};

