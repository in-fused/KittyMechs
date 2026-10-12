import {describe,expect,it} from 'vitest';
import {PerspectiveCamera,Vector3} from 'three';
import {cameraContainsVisual,cameraPose,createCameraFraming,fitCameraDistance} from '../src/game/camera/framing';
import {advanceFelineComposition034} from '../src/game/camera/felineFraming034';

const corners=(origin:Vector3)=>{
  const out:Vector3[]=[];
  for(const x of [-1.8,1.8])for(const y of [0,2.9])for(const z of [-2,3.5])out.push(new Vector3(x,y,z).add(origin));
  return out;
};
describe('actual moving camera containment 057',()=>{
  it('rejects a lagged camera even though its planned boom fits, then admits the exact intended view',()=>{
    const origin=new Vector3(0,0,0),focus=new Vector3(0,1.45,0),points=corners(origin),state=createCameraFraming();
    const composition={boomHeight:4,lookAhead:2,pitchReach:16};advanceFelineComposition034(composition,2.9,6,true,1,true);
    const fit=fitCameraDistance(state,focus,points,0,.06,6,59,1.6,18,composition);expect(fit.fitted).toBe(true);
    const camera=new PerspectiveCamera(59,1.6,.1,850),position=new Vector3(),look=new Vector3(),scratch=new Vector3();
    cameraPose(focus,0,.06,fit.distance,position,look,composition);
    // Backward motion advances the body toward a position still following the
    // previous frame. Keep the current look target, as CameraRig does.
    camera.position.copy(position).add(new Vector3(0,0,-3));camera.lookAt(look);
    expect(cameraContainsVisual(camera,points,scratch)).toBe(false);
    camera.position.copy(position);camera.lookAt(look);
    expect(cameraContainsVisual(camera,points,scratch)).toBe(true);
  });
  it('does not certify an occlusion-contracted or near-plane camera',()=>{
    const points=corners(new Vector3()),camera=new PerspectiveCamera(59,1.6,.1,850),look=new Vector3(0,1,0),scratch=new Vector3();
    camera.position.set(0,2,2);camera.lookAt(look);expect(cameraContainsVisual(camera,points,scratch)).toBe(false);
    camera.position.set(0,1,0);camera.lookAt(new Vector3(0,1,-1));expect(cameraContainsVisual(camera,[new Vector3(0,1,-.05)],scratch)).toBe(false);
  });
  it('tests the actual orientation without rewriting camera or visual geometry',()=>{
    const points=corners(new Vector3()),camera=new PerspectiveCamera(59,1.6,.1,850),scratch=new Vector3(),look=new Vector3();
    cameraPose({x:0,y:1.45,z:0},0,.75,6,camera.position,look);camera.lookAt(look);
    const before={position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),points:points.map(p=>p.toArray())};
    expect(cameraContainsVisual(camera,points,scratch)).toBe(false);
    expect({position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),points:points.map(p=>p.toArray())}).toEqual(before);
    expect(cameraContainsVisual(camera,[],scratch)).toBe(false);expect(cameraContainsVisual(camera,[new Vector3(NaN,0,0)],scratch)).toBe(false);
  });
});
