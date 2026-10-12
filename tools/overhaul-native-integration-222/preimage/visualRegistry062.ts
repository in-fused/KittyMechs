import {Vector3,type Object3D} from 'three';
import {createVisualEnvelopeSample,sampleVisualEnvelope,type VisualEnvelope,type VisualEnvelopeSample} from './visualEnvelope';

export interface CameraVisualProvider {create:()=>VisualEnvelopeSample;sample:(out:VisualEnvelopeSample)=>VisualEnvelopeSample;}
interface CameraVisual {root:Object3D;anchors:Object3D[];anchorPoints:Vector3[];generation:number;envelope:VisualEnvelope;sample:VisualEnvelopeSample;provider:CameraVisualProvider;result:{bounds:VisualEnvelopeSample['bounds'];corners:VisualEnvelopeSample['corners'];anchors:Vector3[];frameClock:number};}
const visuals=new Map<string,CameraVisual>();
/** Loading readiness only: an actual current-generation owner has completed a
 * visual frame. This does not certify motion, surface contact or camera fit. */
export function hasCompletedCameraVisual044(id:string,generation:number){const entry=visuals.get(id);return !!entry&&entry.generation===generation&&entry.result.frameClock>=0;}
/** One Session's startup latch. A later rig switch cannot freeze live physics. */
export function createCameraVisualStartup044(id:string,generation:number){let started=false;return ()=>{if(!started)started=hasCompletedCameraVisual044(id,generation);return started;};}
export function registerCameraVisual(id:string,root:Object3D,envelope:VisualEnvelope,generation:number,provider:CameraVisualProvider={create:()=>createVisualEnvelopeSample(envelope),sample:out=>sampleVisualEnvelope(envelope,out)}){
  const sample=provider.create(),anchors=['head','FL_upper','FR_upper'].map(name=>root.getObjectByName(name)).filter((a):a is Object3D=>!!a),entry={root,anchors,anchorPoints:anchors.map(()=>new Vector3()),generation,envelope,sample,provider,result:{bounds:sample.bounds,corners:sample.corners,anchors:[] as Vector3[],frameClock:-1}};
  visuals.set(id,entry);
  return ()=>{if(visuals.get(id)===entry)visuals.delete(id);};
}
/** The local camera samples only its own render model, after authored motion,
 * IK and tracking. Updating display matrix caches does not change transforms. */
export function completeCameraVisual(id:string,root:Object3D,frameClock:number,generation:number){
  const entry=visuals.get(id);if(entry?.root===root&&entry.generation===generation&&Number.isFinite(frameClock))entry.result.frameClock=frameClock;
}
export function cameraVisual(id:string,frameClock:number,generation:number){
  const entry=visuals.get(id);if(!entry||entry.generation!==generation||!entry.root.visible||entry.result.frameClock!==frameClock)return null;
  entry.root.updateWorldMatrix(true,false);entry.root.updateMatrixWorld(true);
  entry.provider.sample(entry.sample);entry.result.anchors.length=0;entry.anchors.forEach((anchor,i)=>{for(let p:Object3D|null=anchor;p;p=p.parent)if(!p.visible)return;anchor.getWorldPosition(entry.anchorPoints[i]);entry.result.anchors.push(entry.anchorPoints[i]);});return entry.result;
}
