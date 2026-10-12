import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {expect,test} from 'vitest';
import {AnimationMixer,Bone,BufferGeometry,Float32BufferAttribute,Matrix4,MeshBasicMaterial,Skeleton,SkinnedMesh,Uint16BufferAttribute,Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {prepareWeightedVisualEnvelope007,createWeightedVisualEnvelopeSample007,sampleWeightedVisualEnvelope007} from '../../src/game/camera/weightedVisualEnvelope007';

// Independent CPU emulation of installed skinning_vertex/project_vertex:
// uploaded Float32 matrices, weighted vec4, bindInverse, xyz, reset w=1.
type V4=[number,number,number,number];
function mul(matrix:ArrayLike<number>,v:V4):V4 {const result:V4=[0,0,0,0];for(let row=0;row<4;row++)for(let col=0;col<4;col++)result[row]=Math.fround(result[row]+Math.fround(Math.fround(matrix[col*4+row])*v[col]));return result;}
function shader(mesh:SkinnedMesh,vertex:number):Vector3 {
 const p=mesh.geometry.getAttribute('position'),w=mesh.geometry.getAttribute('skinWeight'),indices=mesh.geometry.getAttribute('skinIndex');
 const bound=mul(mesh.bindMatrix.elements,[Math.fround(p.getX(vertex)),Math.fround(p.getY(vertex)),Math.fround(p.getZ(vertex)),1]);const blend:V4=[0,0,0,0];
 for(let slot=0;slot<4;slot++){const index=indices.getComponent(vertex,slot),joint=mesh.skeleton.boneMatrices.subarray(index*16,index*16+16),q=mul(joint,bound),weight=Math.fround(w.getComponent(vertex,slot));for(let k=0;k<4;k++)blend[k]=Math.fround(blend[k]+Math.fround(q[k]*weight));}
 const local=mul(mesh.bindMatrixInverse.elements,blend),world=mul(mesh.matrixWorld.elements,[local[0],local[1],local[2],1]);return new Vector3(world[0],world[1],world[2]);
}
function synthetic(weightOverride?:number){const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([-1,0,.2,.8,.6,-.4,.3,1,.5,-.6,.5,-.2],3));g.setAttribute('skinIndex',new Uint16BufferAttribute([0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0],4));g.setAttribute('skinWeight',new Float32BufferAttribute([.2,.3,0,0,.7,1.3,0,0,.4,.60000004,0,0,.4,.59999996,0,0],4));if(weightOverride!==undefined)g.getAttribute('skinWeight').setX(0,weightOverride);const m=new SkinnedMesh(g,new MeshBasicMaterial()),a=new Bone(),b=new Bone();a.name='first';b.name='second';a.add(b);b.position.y=1;m.add(a);m.updateMatrixWorld(true);m.bind(new Skeleton([a,b]));m.position.set(37,5,-19);m.rotation.set(.17,.42,-.09);a.rotation.z=.36;b.rotation.x=-.54;m.updateMatrixWorld(true);m.skeleton.update();return m;}
function check(mesh:SkinnedMesh){mesh.updateWorldMatrix(true,false);mesh.updateMatrixWorld(true);mesh.skeleton.update();const weights=mesh.geometry.getAttribute('skinWeight'),snapshot=()=>Array.from({length:weights.count*4},(_,i)=>weights.getComponent(Math.floor(i/4),i%4)),before=snapshot(),e=prepareWeightedVisualEnvelope007(mesh),s=createWeightedVisualEnvelopeSample007(e);sampleWeightedVisualEnvelope007(e,s);let checked=0;for(let v=0;v<mesh.geometry.getAttribute('position').count;v++){const p=shader(mesh,v);expect(s.bounds.containsPoint(p),`shader vertex ${v} outside bounds`).toBe(true);checked++;}expect(snapshot()).toEqual(before);return {checked,ranges:e.weightSumRanges,bounds:{min:s.bounds.min.toArray(),max:s.bounds.max.toArray()}};}

test('actual shader affine containment: translated rotated nonunit skin and immutable source004 selected poses',async()=>{
 const rows:unknown[]=[];const mesh=synthetic();rows.push({case:'translated-rotated-positive-nonunit',...check(mesh)});
 const exact=shader(mesh,1),helper=mesh.getVertexPosition(1,new Vector3()).applyMatrix4(mesh.matrixWorld);expect(exact.distanceTo(helper)).toBeGreaterThan(10);rows.push({case:'Vector3-helper-is-not-nonunit-shader',shader:exact.toArray(),helper:helper.toArray()});
 for(const invalid of [-.1,NaN,Infinity])expect(()=>prepareWeightedVisualEnvelope007(synthetic(invalid))).toThrow(/invalid skin weight/);
 const path=resolve('public/assets/models/Pounce_Identity57_Runtime005.glb'),raw=readFileSync(path),hash=createHash('sha256').update(raw).digest('hex');expect(hash).toBe('e6b90c02919c910cff8f678341302b8c19460712ba259e5bb78dc7c413d11dae');
 const gltf=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength) as ArrayBuffer,'');const mixer=new AnimationMixer(gltf.scene);
 for(const name of ['FelineWalk','FelineUprightStride']){const clip=gltf.animations.find(c=>c.name===name);expect(clip,`actual source clip ${name}`).toBeDefined();mixer.stopAllAction();mixer.clipAction(clip!).play();mixer.update(.23);gltf.scene.position.set(29,3,-17);gltf.scene.rotation.y=.31;gltf.scene.updateMatrixWorld(true);const e=prepareWeightedVisualEnvelope007(gltf.scene),s=createWeightedVisualEnvelopeSample007(e);sampleWeightedVisualEnvelope007(e,s);let checked=0;gltf.scene.traverse(o=>{if(o instanceof SkinnedMesh){o.skeleton.update();for(let v=0;v<o.geometry.getAttribute('position').count;v++){expect(s.bounds.containsPoint(shader(o,v)),`${name}/${o.name}/${v}`).toBe(true);checked++;}}});rows.push({case:name,checked,ranges:e.weightSumRanges,bounds:{min:s.bounds.min.toArray(),max:s.bounds.max.toArray()}});}
 mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);gltf.scene.traverse(o=>{if(o instanceof SkinnedMesh){o.skeleton.dispose();o.geometry.dispose();}});mesh.skeleton.dispose();mesh.geometry.dispose();(mesh.material as MeshBasicMaterial).dispose();
 writeFileSync(resolve('.sites-runtime/overhaul-20261010/overhaul-camera-envelope-007/containment-result.json'),JSON.stringify({status:'CPU_SHADER_CONTAINMENT_ONLY',sourceSHA256:hash,rows,noGPU:true,noNative:true,noPlayApproval:true},null,2));
},20000);
