import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import {createHash} from 'node:crypto';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const receipts=[];
for(const file of await readdir('public/assets/models'))if(file.endsWith('.glb')){
  const document=await io.read(`public/assets/models/${file}`),root=document.getRoot();
  if(!root.listMeshes().length)throw new Error(`${file}: empty model`);
  for(const accessor of root.listAccessors()){const array=accessor.getArray();if(array)for(const value of array)if(!Number.isFinite(value))throw new Error(`${file}: nonfinite accessor`);}
  const animations=root.listAnimations().map(a=>a.getName());
  if((file.startsWith('Pounce_Feline')||file.includes('Quadruped')||file.startsWith('Sentinel_'))&&!['FelineIdle','FelineGallop','FelineAir'].every(name=>animations.some(a=>a.includes(name))))throw new Error(`${file}: missing feline clip: ${animations.join(',')}`);
  if((file.includes('Quadruped')||file.startsWith('Sentinel_'))&&!['FelineWalk','FelineTrot'].every(name=>animations.some(a=>a.includes(name))))throw new Error(`${file}: missing speed-specific gait`);
  if(file.includes('Quadruped')&&!['FelineUprightIdle','FelineUprightWalk','FelineUprightAir','FelineTransformUp','FelineTransformDown'].every(name=>animations.some(a=>a.includes(name))))throw new Error(`${file}: missing combat-form clip`);
  if(file.includes('Quadruped')&&!['FelineUprightWalkLong','FelineUprightStride','FelineUprightTurnLeft','FelineUprightTurnRight'].every(name=>animations.includes(name)))throw new Error(`${file}: missing upright locomotion/turn clip`);
  if(file.includes('Quadruped')&&!['FelineGrab','FelineCling','FelineClimb','FelineMantle'].every(name=>animations.includes(name)))throw new Error(`${file}: missing traversal clip`);
  if(file.includes('Quadruped')||file.startsWith('Sentinel_')){
    if(!['FelineGrab','FelineCling','FelineClimb','FelineMantle','FelinePulse','FelineMissile','FelineAbility','FelineHit','FelineDeath','FelineCombatBase'].every(name=>animations.includes(name)))throw new Error(`${file}: missing authored traversal/combat clip`);
    if(file.includes('Quadruped')&&!['Pulse','Missile','Ability','Hit','Death','CombatBase'].every(name=>animations.includes('FelineUpright'+name)))throw new Error(`${file}: missing combat-form reaction`);
    if(!['FelineTurnLeft','FelineTurnRight'].every(name=>animations.includes(name)))throw new Error(`${file}: missing angular turn footfalls`);
    if(animations.length!==(file.startsWith('Sentinel_')?17:32))throw new Error(`${file}: unexpected action count`);
    if(root.listSkins().length!==1||root.listSkins()[0].listJoints().length!==25)throw new Error(`${file}: expected articulated 25-bone rig`);
  }
  const bytes=(await readFile(`public/assets/models/${file}`)).length;
  if(bytes>5_000_000)throw new Error(`${file}: runtime asset exceeds 5 MB budget`);
  receipts.push({file,bytes,meshes:root.listMeshes().length,primitives:root.listMeshes().reduce((s,m)=>s+m.listPrimitives().length,0),materials:root.listMaterials().length,animations});
}
const art=JSON.parse(await readFile('assets/reference/higgsfield-supplies.json','utf8')) as {assets:{runtime:string;runtimeSha256:string;runtimeBytes:number}[]};
for(const asset of art.assets){const bytes=await readFile(asset.runtime);if(bytes.length>64_000||bytes.length!==asset.runtimeBytes||createHash('sha256').update(bytes).digest('hex')!==asset.runtimeSha256)throw new Error(`${asset.runtime}: admitted supply texture changed or exceeds budget`);}
const environment=JSON.parse(await readFile('assets/reference/environment-optimization.json','utf8')) as {file:string;runtimeBytes:number;sha256:string}[];
const cityArt=JSON.parse(await readFile('assets/reference/higgsfield-city-art.json','utf8')) as {assets:{runtime:string;runtimeSha256:string;runtimeBytes:number;dimensions:number[]}[]};
let cityBytes=0;for(const asset of cityArt.assets){
  const bytes=await readFile(asset.runtime);cityBytes+=bytes.length;
  if(bytes.length!==asset.runtimeBytes||bytes.length>600_000||createHash('sha256').update(bytes).digest('hex')!==asset.runtimeSha256||Math.max(...asset.dimensions)>1024)throw new Error(`${asset.runtime}: city color texture admission changed or exceeds budget`);
}if(cityBytes>2_000_000)throw new Error('City texture bank exceeds2MB');
for(const asset of environment){
  const data=await readFile(`public/assets/models/${asset.file}`);
  if(data.length!==asset.runtimeBytes||createHash('sha256').update(data).digest('hex')!==asset.sha256)throw new Error(`${asset.file}: environment admission hash/size changed`);
  const document=await io.read(`public/assets/models/${asset.file}`);
  for(const mesh of document.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
    const material=primitive.getMaterial();if(!material)throw new Error(`${asset.file}: unassigned material`);
    if(material.getBaseColorTexture()&&!primitive.getAttribute(`TEXCOORD_${material.getBaseColorTextureInfo()!.getTexCoord()}`))throw new Error(`${asset.file}: textured primitive lacks source UVs`);
    if(/^PH_/.test(material.getName())&&(!material.getBaseColorTexture()||!material.getNormalTexture()||!material.getMetallicRoughnessTexture()))throw new Error(`${asset.file}: matched foliage PBR maps lost`);
    if(/PH_(?:Fir_Needles|Fern_Leaves)/.test(material.getName())&&(material.getAlphaMode()!=='MASK'||!material.getDoubleSided()))throw new Error(`${asset.file}: invalid leaf alpha policy`);
  }
}
const sign=JSON.parse(await readFile('assets/reference/higgsfield-factory-sign.json','utf8')) as {embeddedSha256?:string};
if(sign.embeddedSha256){
  const document=await io.read('public/assets/models/Factory_Workshop.glb');
  const material=document.getRoot().listMaterials().find(m=>m.getName()==='Factory_Original_RainlineWorks_Sign_Paint');
  const image=material?.getBaseColorTexture()?.getImage();
  if(!image||createHash('sha256').update(image).digest('hex')!==sign.embeddedSha256)throw new Error('Higgsfield workshop sign missing or changed');
}
await writeFile('docs/asset-validation.json',JSON.stringify(receipts,null,2));console.log(`Validated ${receipts.length} GLBs; finite data, required animation clips and size budget.`);
