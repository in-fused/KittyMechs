import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const source='public/assets/models/Pounce_Identity57_Runtime005.glb';
const raw=readFileSync(source),manifest=JSON.parse(readFileSync('src/game/entities/identity57Runtime005Manifest.json','utf8').replace(/^\uFEFF/,''));
const startedUTC=new Date().toISOString();
const gltf=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
gltf.scene.updateWorldMatrix(true,false);gltf.scene.updateMatrixWorld(true);
const meshes=[];gltf.scene.traverse(o=>{if(!o.isSkinnedMesh)return;const w=o.geometry.getAttribute('skinWeight'),idx=o.geometry.getAttribute('skinIndex');let min=Infinity,max=-Infinity,nonUnit=0;const invalid=[];
 for(let v=0;v<w.count;v++){let sum=0;for(let k=0;k<4;k++){const value=w.getComponent(v,k),index=idx.getComponent(v,k);if(!Number.isFinite(value)||value<0||!Number.isInteger(index)||index<0||index>=o.skeleton.bones.length)invalid.push({v,k,value,index});sum+=value;}if(!(sum>0)||!Number.isFinite(sum))invalid.push({v,sum});min=Math.min(min,sum);max=Math.max(max,sum);if(sum!==1)nonUnit++;}
 meshes.push({name:o.name,vertices:w.count,joints:o.skeleton.bones.length,sumMin:min,sumMax:max,nonUnitVertexCount:nonUnit,invalid,bindMode:o.bindMode,bindMatrix:o.bindMatrix.toArray(),bindMatrixInverse:o.bindMatrixInverse.toArray(),meshMatrixWorld:o.matrixWorld.toArray()});
});
const actualClips=gltf.animations.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length}));const mismatches=[];
for(const [name,contract]of Object.entries(manifest.clips)){const clip=gltf.animations.find(c=>c.name===name);const expected=contract.targets.map(t=>t.replace(/\.translation$/,'.position').replace(/\.rotation$/,'.quaternion')).sort();if(!clip||clip.duration!==contract.duration||clip.tracks.length!==contract.channels||clip.tracks.map(t=>t.name).sort().some((t,i)=>t!==expected[i]))mismatches.push('clip:'+name);}
for(const name of manifest.jointNames){const bone=gltf.scene.getObjectByName(name);if(!bone?.isBone||bone.parent?.name!==manifest.jointParents[name])mismatches.push('bone:'+name);}
const result={startedUTC,closedUTC:new Date().toISOString(),scope:'ONE actual GLTFLoader CPU parse, no renderer/GPU/native/browser',source,sha256:createHash('sha256').update(raw).digest('hex'),loaderNormalizesWeights:true,meshes,actualClips,jointContractCount:manifest.jointNames.length,contractMismatches:mismatches,acceptedMotion:false};
writeFileSync('.sites-runtime/overhaul-20261010/overhaul-camera-envelope-007/actual-loader-readback.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({meshes:meshes.map(({name,vertices,joints,sumMin,sumMax,nonUnitVertexCount,invalid})=>({name,vertices,joints,sumMin,sumMax,nonUnitVertexCount,invalidCount:invalid.length})),clips:actualClips.length,mismatches}));
if(mismatches.length||meshes.some(m=>m.invalid.length))process.exitCode=1;
