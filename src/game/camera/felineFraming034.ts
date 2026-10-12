import {clamp} from '../../../shared/math';
import {LEGACY_CAMERA_COMPOSITION,type CameraComposition} from './framing';

/** Presentation follows the measured body; no native occupancy is inferred.
 * Damping also joins the small preview and larger unsupported-action fallback. */
export function advanceFelineComposition034(out:CameraComposition,height:number,distance:number,enabled:boolean,dt:number,reset:boolean){
 const measured=enabled&&Number.isFinite(height)&&height>0;
 const target=measured?{boomHeight:clamp(height*.95,1.4,3),lookAhead:clamp(height*.7,1,2),pitchReach:clamp(distance*.8,4,12)}:LEGACY_CAMERA_COMPOSITION;
 const alpha=reset?1:1-Math.exp(-Math.max(0,dt)*7);
 for(const k of ['boomHeight','lookAhead','pitchReach'] as const)out[k]+=(target[k]-out[k])*alpha;
}
