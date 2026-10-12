import {Box3,Mesh,Raycaster,Vector3,type Object3D,type Intersection} from 'three';
const owners=new Map<string,{root:Object3D;generation:number;meshes:Mesh[]}>();
function visible(node:Object3D){for(let p:Object3D|null=node;p;p=p.parent)if(!p.visible)return false;return true;}
/** Explicit render-only ownership. No native collider or actor rule is added. */
export function registerVisualOccluder058(id:string,root:Object3D,generation:number){
  const meshes:Mesh[]=[];root.traverse(node=>{if(node instanceof Mesh&&!('isSkinnedMesh' in node))meshes.push(node);});
  const entry={root,generation,meshes};owners.set(id,entry);return()=>{if(owners.get(id)===entry)owners.delete(id);};
}
export function createVisualSight058(){return{ray:new Raycaster(),delta:new Vector3(),box:new Box3(),hits:[] as Intersection[]};}
/** Test registered current opaque triangles; conservative origin AABBs also
 * reject cameras inside a marker. Body anchors are witnesses, not skin pixels. */
export function visualSightBlocked058(s:ReturnType<typeof createVisualSight058>,from:Vector3,to:Vector3,generation:number):boolean {
  s.delta.subVectors(to,from);const distance=s.delta.length();if(!Number.isFinite(distance)||distance<.01)return true;
  s.ray.set(from,s.delta.multiplyScalar(1/distance));s.ray.near=0;s.ray.far=distance-.01;
  for(const entry of owners.values())if(entry.generation===generation&&visible(entry.root))for(const mesh of entry.meshes){
    if(!visible(mesh))continue;const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    if(!materials.some(m=>m.visible&&m.opacity>=.99&&!m.transparent))continue;
    mesh.updateWorldMatrix(true,false);if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    if(mesh.geometry.boundingBox){
      s.box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
      if(s.box.containsPoint(from))return true;
      if(!s.ray.ray.intersectsBox(s.box))continue;
    }
    s.hits.length=0;s.ray.intersectObject(mesh,false,s.hits);
    if(s.hits.some(hit=>{const material=materials[Array.isArray(mesh.material)?hit.face?.materialIndex??0:0];return material?.visible&&material.opacity>=.99&&!material.transparent;}))return true;
  }
  return false;
}
