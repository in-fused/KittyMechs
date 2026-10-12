import {SkinnedMesh,type Object3D,type Skeleton} from 'three';

/** A GPU palette depends on ordered bone owners and inverse matrices, not a
 * material primitive's geometry or its independent mesh bind transform. Call
 * once after cloning and before rendering; never share across actor clones. */
function samePalette(a:Skeleton,b:Skeleton):boolean {
 if(a.bones.length!==b.bones.length||a.boneInverses.length!==b.boneInverses.length||a.bones.length!==a.boneInverses.length)return false;
 for(let i=0;i<a.bones.length;i++){
  if(a.bones[i]!==b.bones[i])return false;
  const left=a.boneInverses[i].elements,right=b.boneInverses[i].elements;
  for(let j=0;j<16;j++)if(!Number.isFinite(left[j])||!Number.isFinite(right[j])||!Object.is(left[j],right[j]))return false;
 }
 return true;
}
export function shareSkinPalettes042(root:Object3D):Set<Skeleton> {
 const palettes=new Set<Skeleton>(),byOwners=new Map<string,Skeleton[]>(),retired=new Set<Skeleton>();
 root.traverse(node=>{
  if(!(node instanceof SkinnedMesh))return;
  const original=node.skeleton,key=original.bones.map(b=>b.uuid).join(','),candidates=byOwners.get(key)??[],shared=candidates.find(s=>samePalette(s,original));
  if(shared){node.skeleton=shared;if(original!==shared)retired.add(original);}
  else {candidates.push(original);byOwners.set(key,candidates);palettes.add(original);}
 });
 // Cloned redundant palettes have no remaining owner in this model. Preserve
 // canonical palettes exactly; no source geometry, weights or bones change.
 for(const palette of retired)if(!palettes.has(palette))palette.dispose();
 return palettes;
}
