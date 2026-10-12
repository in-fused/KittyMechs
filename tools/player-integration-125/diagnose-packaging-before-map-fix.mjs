import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await MeshoptDecoder.ready;
const paths=['assets/source/overhaul-pounce-anatomy-121/Pounce_Motion121.temporary.glb','tools/overhaul-anatomy-asset-124/output/Pounce_Anatomy121.glb'];
const sha=b=>createHash('sha256').update(b).digest('hex'),inputs=await Promise.all(paths.map(readFile));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const docs=await Promise.all(paths.map(p=>io.read(p)));const [a,b]=docs.map(d=>d.getRoot());
const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y),bytes=x=>Buffer.from(x.buffer,x.byteOffset,x.byteLength);
const report={scope:'READ ONLY diagnosis of actual failed124 output; no encode/serialization/publication/threshold change',inputs:paths.map((path,i)=>({path,sha256:sha(inputs[i]),bytes:inputs[i].length})),changedRestScales:[],changedIndices:[],changedVertexAttributes:[],changedAnimationStreams:[],changedInverseBinds:[]};
for(const n of a.listNodes()){const other=b.listNodes().find(m=>m.getName()===n.getName());if(!eq(n.getScale(),other.getScale()))report.changedRestScales.push({node:n.getName(),before:n.getScale(),after:other.getScale()});}
for(const m of a.listMeshes()){const other=b.listMeshes().find(n=>n.getName()===m.getName());for(const [i,p] of m.listPrimitives().entries()){
 const q=other.listPrimitives()[i],x=p.getIndices()?.getArray(),y=q.getIndices()?.getArray();
 if(x&&y&&!bytes(x).equals(bytes(y))){let cyclicOnly=x.length===y.length;for(let k=0;cyclicOnly&&k<x.length;k+=3)cyclicOnly=[0,1,2].some(r=>[0,1,2].every(t=>x[k+t]===y[k+(t+r)%3]));report.changedIndices.push({mesh:m.getName(),primitive:i,count:x.length,cyclicOnly});}
 for(const s of p.listSemantics()){if(!bytes(p.getAttribute(s).getArray()).equals(bytes(q.getAttribute(s).getArray())))report.changedVertexAttributes.push({mesh:m.getName(),semantic:s});}
}}
for(const an of a.listAnimations()){const other=b.listAnimations().find(m=>m.getName()===an.getName());for(const [i,c] of an.listChannels().entries())for(const key of ['getInput','getOutput'])if(!bytes(c.getSampler()[key]().getArray()).equals(bytes(other.listChannels()[i].getSampler()[key]().getArray())))report.changedAnimationStreams.push({action:an.getName(),channel:i,key});}
for(const [i,s] of a.listSkins().entries())if(!bytes(s.getInverseBindMatrices().getArray()).equals(bytes(b.listSkins()[i].getInverseBindMatrices().getArray())))report.changedInverseBinds.push(i);
for(const [i,p] of paths.entries())if(sha(await readFile(p))!==sha(inputs[i]))throw Error('Read-only input changed');
await writeFile('.sites-runtime/overhaul-20261010/anatomy124-causal.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({changedRestScales:report.changedRestScales.length,changedIndexPrimitives:report.changedIndices.length,allIndexChangesCyclicOnly:report.changedIndices.every(x=>x.cyclicOnly),changedVertexAttributes:report.changedVertexAttributes.length,changedAnimationStreams:report.changedAnimationStreams.length,changedInverseBinds:report.changedInverseBinds.length}));
