import {expect,it,vi} from 'vitest';
import {BoxGeometry,Group,Mesh,MeshBasicMaterial} from 'three';
import {completeCameraVisual,createCameraVisualStartup044,hasCompletedCameraVisual044,registerCameraVisual} from '../src/game/camera/visualRegistry';
import {prepareVisualEnvelope} from '../src/game/camera/visualEnvelope';
import {advanceLocalPhysics043} from '../src/game/localAuthorityTiming043';
function owner(){const root=new Group(),geometry=new BoxGeometry(2,2,2),material=new MeshBasicMaterial();root.add(new Mesh(geometry,material));root.updateMatrixWorld(true);return {root,envelope:prepareVisualEnvelope(root),dispose:()=>{geometry.dispose();material.dispose();}};}
it('holds local native advancement until the actual owner completes, then survives rig replacement',()=>{
  const id='startup-044',entry=owner(),ready=createCameraVisualStartup044(id,44),native=vi.fn(),frame=()=>{if(ready())advanceLocalPhysics043(1/60,false,native);};
  frame();expect(native).not.toHaveBeenCalled();const remove=registerCameraVisual(id,entry.root,entry.envelope,44);
  try{
    frame();expect(native).not.toHaveBeenCalled();expect(hasCompletedCameraVisual044(id,44)).toBe(false);
    completeCameraVisual(id,new Group(),1,44);frame();expect(native).not.toHaveBeenCalled();
    completeCameraVisual(id,entry.root,NaN,44);frame();expect(native).not.toHaveBeenCalled();
    completeCameraVisual(id,entry.root,1,43);frame();expect(native).not.toHaveBeenCalled();
    completeCameraVisual(id,entry.root,1,44);frame();expect(native).toHaveBeenCalledTimes(1);
    remove();expect(hasCompletedCameraVisual044(id,44)).toBe(false);frame();expect(native).toHaveBeenCalledTimes(2);
    expect(createCameraVisualStartup044(id,45)()).toBe(false);
  }finally{remove();entry.dispose();}
});
it('rejects a prior arena owner and stale completion or cleanup after replacement',()=>{
  const id='replacement-044',old=owner(),next=owner(),removeOld=registerCameraVisual(id,old.root,old.envelope,44);
  completeCameraVisual(id,old.root,1,44);expect(hasCompletedCameraVisual044(id,45)).toBe(false);
  const removeNext=registerCameraVisual(id,next.root,next.envelope,45),ready=createCameraVisualStartup044(id,45);
  try{
    removeOld();completeCameraVisual(id,old.root,2,44);expect(ready()).toBe(false);
    completeCameraVisual(id,next.root,2,45);expect(ready()).toBe(true);expect(hasCompletedCameraVisual044(id,44)).toBe(false);
  }finally{removeNext();removeOld();old.dispose();next.dispose();}
});
