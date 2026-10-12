import RAPIER from '@dimforge/rapier3d-compat';
import mesh from './data/rainlineLampMeshCollision001.json';
import type {PropDescriptor} from './world';
/** Retained rendered source geometry, with the same instance scale/yaw/pivot. */
export function createRetainedLampColliderDescriptors(prop:PropDescriptor):RAPIER.ColliderDesc[]{
 if(prop.kind!=='lamp')return [];
 if(!Number.isFinite(prop.scale)||prop.scale<=0)throw Error('Invalid retained lamp scale');
 const vertices=Float32Array.from(mesh.vertices,n=>n*prop.scale);
 return [RAPIER.ColliderDesc.trimesh(vertices,new Uint32Array(mesh.indices))
  .setTranslation(prop.x,prop.y,prop.z)
  .setRotation({x:0,y:Math.sin(prop.rotation/2),z:0,w:Math.cos(prop.rotation/2)})
  .setFriction(.8)];
}
