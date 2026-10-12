import {describe,expect,it} from 'vitest';
import {Box3,PerspectiveCamera,Vector3} from 'three';
import {CAMERA_FRAME_MARGIN,CAMERA_LOOK_AHEAD,cameraPose,createCameraFraming,fitCameraDistance} from '../src/game/camera/framing';

function corners(min:Vector3,max:Vector3){const result:Vector3[]=[];for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])result.push(new Vector3(x,y,z));return result;}
function project(points:Vector3[],focus:Vector3,yaw:number,pitch:number,distance:number,fov:number,aspect:number){
  const camera=new PerspectiveCamera(fov,aspect,.1,850),look=new Vector3();cameraPose(focus,yaw,pitch,distance,camera.position,look);camera.lookAt(look);camera.updateMatrixWorld();
  return points.map(p=>p.clone().project(camera));
}
describe('visual camera framing',()=>{
  for(const aspect of [1.6,16/9,9/16])for(const upright of [false,true])for(const yaw of [0,Math.PI/2,-Math.PI+.01])it(`fits a full feline body/tail at aspect${aspect}, upright${upright}, yaw${yaw}`,()=>{
    const focus=new Vector3(12,upright?2.9:1.9,-20),points=corners(new Vector3(-1.8,0,-2),new Vector3(1.8,upright?4.2:2.9,3.5)).map(p=>p.applyAxisAngle(new Vector3(0,1,0),yaw).add(new Vector3(12,0,-20)));
    const state=createCameraFraming(),before=points.map(p=>p.toArray()),fit=fitCameraDistance(state,focus,points,yaw,.06,6,59,aspect);
    expect(fit.fitted).toBe(true);expect(fit.distance).toBeGreaterThanOrEqual(6);expect(fit.distance).toBeLessThanOrEqual(18);expect(fit.probes).toBeLessThanOrEqual(23);
    const projected=project(points,focus,yaw,.06,fit.distance,59,aspect),box=new Box3().setFromPoints(projected),edge=1-2*CAMERA_FRAME_MARGIN;
    expect(box.min.x).toBeGreaterThanOrEqual(-edge-1e-12);expect(box.min.y).toBeGreaterThanOrEqual(-edge-1e-12);expect(box.max.x).toBeLessThanOrEqual(edge+1e-12);expect(box.max.y).toBeLessThanOrEqual(edge+1e-12);expect(points.map(p=>p.toArray())).toEqual(before);
  });
  it('fits the narrower actual aiming lens and preserves a fitting preferred zoom',()=>{
    const focus=new Vector3(0,2.9,0),points=corners(new Vector3(-1.7,0,-2),new Vector3(1.7,4,3.2)),state=createCameraFraming();
    const aiming=fitCameraDistance(state,focus,points,0,.06,4.5,52,1.6).distance;
    expect(aiming).toBeGreaterThan(4.5);expect(Math.max(...project(points,focus,0,.06,aiming,52,1.6).map(p=>Math.abs(p.y)))).toBeLessThanOrEqual(.9+1e-12);
    const far=fitCameraDistance(state,focus,points,0,.06,18,52,1.6);expect(far.fitted).toBe(true);expect(far.distance).toBe(18);
  });
  it('keeps steep intentional pitch and impossible fits bounded without claiming fit',()=>{
    const state=createCameraFraming(),focus=new Vector3(0,2,0),points=corners(new Vector3(-20,-20,-20),new Vector3(20,20,20));
    const impossible=fitCameraDistance(state,focus,points,0,.06,6,59,1.6);expect(impossible.fitted).toBe(false);expect(impossible.distance).toBe(6);expect(impossible.probes).toBe(13);
    for(const pitch of [-.9,.75]){const steep=fitCameraDistance(state,focus,points,0,pitch,6,59,1.6);expect(steep.distance).toBe(6);expect(steep.fitted).toBe(false);expect(steep.probes).toBe(0);}
  });
  it('handles absent/invalid visual samples without touching preferred zoom',()=>{
    const state=createCameraFraming();for(const points of [[],[new Vector3(NaN,0,0)]]){const fit=fitCameraDistance(state,new Vector3(),points,0,.06,6,59,1.6);expect(fit.distance).toBe(6);expect(fit.fitted).toBe(false);}
  });
  it('reuses scratch/output resources across lens and viewport changes',()=>{
    const state=createCameraFraming(),result=state.result,camera=state.camera,points=corners(new Vector3(-1,0,-1),new Vector3(1,3,2));
    for(const aspect of [1.6,.6,2]){expect(fitCameraDistance(state,new Vector3(0,2,0),points,0,.06,6,59,aspect)).toBe(result);expect(state.camera).toBe(camera);}
    expect(CAMERA_LOOK_AHEAD).toBe(2);
  });
});
