import type {Object3D} from 'three';
import {createVisualEnvelopeSample,sampleVisualEnvelope,type VisualEnvelope,type VisualEnvelopeSample} from './visualEnvelope';

interface CameraVisual {root:Object3D;generation:number;envelope:VisualEnvelope;sample:VisualEnvelopeSample;result:{bounds:VisualEnvelopeSample['bounds'];corners:VisualEnvelopeSample['corners'];frameClock:number};}
const visuals=new Map<string,CameraVisual>();
export function registerCameraVisual(id:string,root:Object3D,envelope:VisualEnvelope,generation:number){
  const sample=createVisualEnvelopeSample(envelope),entry={root,generation,envelope,sample,result:{bounds:sample.bounds,corners:sample.corners,frameClock:-1}};
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
  sampleVisualEnvelope(entry.envelope,entry.sample);return entry.result;
}
