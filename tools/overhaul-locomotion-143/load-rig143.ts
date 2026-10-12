import {readFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {AnimationClip,Bone,BufferAttribute,BufferGeometry,Group,InterpolateDiscrete,InterpolateLinear,Matrix4,MeshBasicMaterial,QuaternionKeyframeTrack,Skeleton,SkinnedMesh,VectorKeyframeTrack} from 'three';
/** Numerical fixture from actual decoded glTF arrays/hierarchy/inverse binds.
 * It does not emulate textures or claim browser GLTFLoader validation. */
export async function loadRig143(path:string){
 await MeshoptDecoder.ready;const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(await readFile(path)),root=doc.getRoot();
 const joints=new Set(root.listSkins().flatMap(s=>s.listJoints())),objects=new Map(root.listNodes().map(n=>{const o=joints.has(n)?new Bone():new Group();o.name=n.getName();o.position.fromArray(n.getTranslation());o.quaternion.fromArray(n.getRotation());o.scale.fromArray(n.getScale());return [n,o] as const;}));
 for(const [n,o] of objects)for(const c of n.listChildren())o.add(objects.get(c)!);
 const model=new Group();for(const n of root.listScenes()[0].listChildren())model.add(objects.get(n)!);model.updateMatrixWorld(true);
 for(const [n,o] of objects){const mesh=n.getMesh(),skin=n.getSkin();if(!mesh||!skin)continue;const inverse=skin.getInverseBindMatrices()!.getArray()!,bones=skin.listJoints().map(j=>objects.get(j) as Bone),skeleton=new Skeleton(bones,bones.map((_,i)=>new Matrix4().fromArray(inverse,i*16)));
  for(const p of mesh.listPrimitives()){const geometry=new BufferGeometry();for(const [semantic,key] of [['POSITION','position'],['JOINTS_0','skinIndex'],['WEIGHTS_0','skinWeight']] as const){const a=p.getAttribute(semantic)!;geometry.setAttribute(key,new BufferAttribute(a.getArray()! as ConstructorParameters<typeof BufferAttribute>[0],a.getElementSize(),a.getNormalized()));}const m=new SkinnedMesh(geometry,new MeshBasicMaterial());m.name=mesh.getName();o.add(m);m.bind(skeleton,new Matrix4());}
 }
 model.updateMatrixWorld(true);
 const clips=root.listAnimations().map(a=>new AnimationClip(a.getName(),-1,a.listChannels().map(c=>{const s=c.getSampler()!,path=c.getTargetPath()!,property=path==='rotation'?'quaternion':path==='translation'?'position':path;if(!['rotation','translation','scale'].includes(path)||!['LINEAR','STEP'].includes(s.getInterpolation()))throw Error('143_FIXTURE_UNSUPPORTED_CHANNEL');const name=c.getTargetNode()!.getName()+'.'+property,t=s.getInput()!.getArray()!,v=s.getOutput()!.getArray()!,interpolation=s.getInterpolation()==='STEP'?InterpolateDiscrete:InterpolateLinear;return path==='rotation'?new QuaternionKeyframeTrack(name,t,v,interpolation):new VectorKeyframeTrack(name,t,v,interpolation);})));return {model,clips};
}
