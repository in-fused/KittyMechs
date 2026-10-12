import {Color,Matrix4,Object3D,type InstancedMesh} from 'three';
import type {PropDescriptor} from '../../../shared/world';
import type {PresentedCityState} from './cityPresentation';

/** Own instance matrices, never the cached GLB geometry. A revision listener
 * updates visibility and tint synchronously with guest collider retirement. */
export function createPropPresentation(mesh:InstancedMesh,props:readonly PropDescriptor[],part:Matrix4):(state:PresentedCityState)=>void {
  const object=new Object3D(),tint=new Color(),damaged=new Color('#5b3020'),hidden=new Matrix4().makeScale(0,0,0);
  const matrices=props.map(p=>{object.position.set(p.x,p.y,p.z);object.rotation.set(0,p.rotation,0);object.scale.setScalar(p.scale);object.updateMatrix();return new Matrix4().multiplyMatrices(object.matrix,part);});
  return state=>{
    const cover=new Map(state.cover.map(c=>[c.id,c]));
    props.forEach((p,i)=>{
      const current=p.id?cover.get(p.id):undefined,removed=current?.destroyedAt!==null&&current?.destroyedAt!==undefined;
      mesh.setMatrixAt(i,removed?hidden:matrices[i]);
      if(p.breakableHp){const ratio=(current?.hp??p.breakableHp)/p.breakableHp;tint.setRGB(1,1,1).lerp(damaged,(1-ratio)*.72);mesh.setColorAt(i,tint);}
    });
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();
  };
}
