import {describe,expect,it} from 'vitest';
import {BoxGeometry,Group,Mesh,MeshBasicMaterial} from 'three';
import {cameraVisual,completeCameraVisual,registerCameraVisual} from '../src/game/camera/visualRegistry';
import {prepareVisualEnvelope} from '../src/game/camera/visualEnvelope';

function visual(){const root=new Group(),mesh=new Mesh(new BoxGeometry(2,2,2),new MeshBasicMaterial());root.add(mesh);root.updateMatrixWorld(true);return{root,mesh,envelope:prepareVisualEnvelope(root)};}
describe('local camera visual ownership',()=>{
  it('samples final render transforms without changing their position/rotation/scale',()=>{
    const {root,mesh,envelope}=visual(),remove=registerCameraVisual('camera-owned-1',root,envelope,0);
    try{
      root.position.set(20,3,-4);root.rotation.y=Math.PI/2;root.scale.setScalar(2);
      const position=root.position.toArray(),rotation=root.quaternion.toArray(),quaternion=root.quaternion,scale=root.scale.toArray();
      expect(cameraVisual('camera-owned-1',1,0)).toBeNull();completeCameraVisual('camera-owned-1',root,1,0);
      const sample=cameraVisual('camera-owned-1',1,0)!;
      for(const [actual,expected] of [[sample.bounds.min,[18,1,-6]],[sample.bounds.max,[22,5,-2]]] as const)actual.toArray().forEach((value,i)=>expect(value).toBeCloseTo(expected[i],12));
      expect(root.position.toArray()).toEqual(position);expect(root.quaternion).toBe(quaternion);expect(root.quaternion.toArray()).toEqual(rotation);expect(root.scale.toArray()).toEqual(scale);
      expect(sample.frameClock).toBe(1);expect(cameraVisual('camera-owned-1',2,0)).toBeNull();
      root.visible=false;expect(cameraVisual('camera-owned-1',1,0)).toBeNull();root.visible=true;expect(cameraVisual('camera-owned-1',1,0)).toBe(sample);
      expect(cameraVisual('camera-owned-1',1,1)).toBeNull();completeCameraVisual('camera-owned-1',root,2,1);expect(cameraVisual('camera-owned-1',2,0)).toBeNull();
    }finally{remove();mesh.geometry.dispose();(mesh.material as MeshBasicMaterial).dispose();}
    expect(cameraVisual('camera-owned-1',1,0)).toBeNull();
  });
  it('an older cleanup cannot erase a replacement actor registered with the same ID',()=>{
    const old=visual(),next=visual(),removeOld=registerCameraVisual('camera-owned-2',old.root,old.envelope,0),removeNext=registerCameraVisual('camera-owned-2',next.root,next.envelope,1);
    try{next.root.position.x=50;removeOld();completeCameraVisual('camera-owned-2',old.root,2,0);expect(cameraVisual('camera-owned-2',2,1)).toBeNull();completeCameraVisual('camera-owned-2',next.root,2,1);expect(cameraVisual('camera-owned-2',2,1)!.bounds.min.x).toBe(49);}finally{removeNext();for(const entry of [old,next]){entry.mesh.geometry.dispose();(entry.mesh.material as MeshBasicMaterial).dispose();}}
    expect(cameraVisual('camera-owned-2',2,1)).toBeNull();
  });
  it('does not fabricate an envelope for an absent owner',()=>{expect(cameraVisual('camera-not-registered',3,0)).toBeNull();});
});
