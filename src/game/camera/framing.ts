import {PerspectiveCamera, Vector3} from 'three';
import type {Vec3} from '../../../shared/types';
import {clamp} from '../../../shared/math';

/** A shorter forward focus leaves room for the feline silhouette below aim. */
export const CAMERA_LOOK_AHEAD=2;
export const CAMERA_BOOM_HEIGHT=4;
export const CAMERA_PITCH_REACH=16;
export const CAMERA_FRAME_MARGIN=.05;

export interface CameraComposition {boomHeight:number;lookAhead:number;pitchReach:number;bodyOrbit?:boolean;}
export const LEGACY_CAMERA_COMPOSITION:CameraComposition={boomHeight:CAMERA_BOOM_HEIGHT,lookAhead:CAMERA_LOOK_AHEAD,pitchReach:CAMERA_PITCH_REACH};
export function cameraPose(focus:Vec3,yaw:number,pitch:number,distance:number,position:Vector3,look:Vector3,composition:CameraComposition=LEGACY_CAMERA_COMPOSITION){
  const sine=Math.sin(pitch),sx=Math.sin(yaw),cz=Math.cos(yaw);
  if(composition.bodyOrbit){
    const cosine=Math.cos(pitch),height=composition.boomHeight;
    // Camera-up composition offset keeps the body below aim at every pitch.
    // Optical yaw/pitch remain the public look controls, not a distant target.
    const px=focus.x+sx*sine*height,py=focus.y+cosine*height,pz=focus.z+cz*sine*height;
    position.set(px+sx*cosine*distance,py-sine*distance,pz+cz*cosine*distance);
    look.set(px-sx*cosine*composition.lookAhead,py+sine*composition.lookAhead,pz-cz*cosine*composition.lookAhead);
    return;
  }
  position.set(focus.x+sx*distance,focus.y+composition.boomHeight-sine*distance,focus.z+cz*distance);
  look.set(focus.x-sx*composition.lookAhead,focus.y+sine*composition.pitchReach,focus.z-cz*composition.lookAhead);
}

export function createCameraFraming(){
  return {camera:new PerspectiveCamera(60,1,.1,850),look:new Vector3(),point:new Vector3(),result:{distance:0,fitted:false,probes:0}};
}
export type CameraFraming=ReturnType<typeof createCameraFraming>;

/** Validate the camera actually used for rendering, including tracking lag
 * and cover correction. An ideal boom fit alone cannot prove this view. */
export function cameraContainsVisual(camera:PerspectiveCamera,corners:readonly Vector3[],point:Vector3):boolean {
  if(!corners.length)return false;
  camera.updateMatrixWorld();
  const edge=1-2*CAMERA_FRAME_MARGIN;
  for(const corner of corners){
    point.copy(corner).applyMatrix4(camera.matrixWorldInverse);
    if(!Number.isFinite(point.x+point.y+point.z)||point.z>=-camera.near)return false;
    point.applyMatrix4(camera.projectionMatrix);
    if(!Number.isFinite(point.x+point.y)||Math.abs(point.x)>edge||Math.abs(point.y)>edge)return false;
  }
  return true;
}

/** Fit the rendered visual envelope, never its physical collision proxy.
 * The scratch camera and corners are presentation data. Cover clearance still
 * owns the final camera, and deliberate steep pitch can constrain this fit. */
export function fitCameraDistance(state:CameraFraming,focus:Vec3,corners:readonly Vector3[],yaw:number,pitch:number,preferred:number,fov:number,aspect:number,maxDistance=18,composition:CameraComposition=LEGACY_CAMERA_COMPOSITION){
  const out=state.result;out.distance=preferred;out.fitted=false;out.probes=0;
  if(!corners.length||![focus.x,focus.y,focus.z,yaw,pitch,preferred,fov,aspect,maxDistance].every(Number.isFinite)||preferred<=0||aspect<=0||fov<=0||fov>=179||maxDistance<preferred)return out;
  // Looking deliberately above/below the mech keeps that freedom instead of
  // dragging the boom to its limit in an attempt to frame a different subject.
  const weight=composition.bodyOrbit?1:1-clamp((Math.abs(pitch)-.12)/.18,0,1);
  if(weight===0)return out;
  const camera=state.camera;camera.fov=fov;camera.aspect=aspect;camera.updateProjectionMatrix();
  const edge=1-2*CAMERA_FRAME_MARGIN;
  const fits=(distance:number)=>{
    out.probes++;
    cameraPose(focus,yaw,pitch,distance,camera.position,state.look,composition);camera.lookAt(state.look);camera.updateMatrixWorld();
    for(const corner of corners){
      state.point.copy(corner).applyMatrix4(camera.matrixWorldInverse);
      if(!Number.isFinite(state.point.x+state.point.y+state.point.z)||state.point.z>=-camera.near)return false;
      state.point.applyMatrix4(camera.projectionMatrix);
      if(Math.abs(state.point.x)>edge||Math.abs(state.point.y)>edge)return false;
    }
    return true;
  };
  if(fits(preferred)){out.fitted=true;return out;}
  // Bounded ascending search avoids assuming fit is monotone at steep pitch.
  let low=preferred,high=preferred;
  for(let step=1;step<=12;step++){
    high=preferred+(maxDistance-preferred)*step/12;
    if(fits(high)){
      for(let refinement=0;refinement<10;refinement++){const middle=(low+high)/2;if(fits(middle))high=middle;else low=middle;}
      out.distance=preferred+(high-preferred)*weight;
      out.fitted=weight===1;
      return out;
    }
    low=high;
  }
  // No feasible bounded fit: retain preferred zoom, without overriding cover,
  // mouse pitch, or inventing a guarantee for a constrained camera.
  return out;
}
