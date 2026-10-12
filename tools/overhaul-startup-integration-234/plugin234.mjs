import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createPrivatePlugins222} from '../overhaul-native-admission-225/plugin225.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),clean=id=>id.split('?')[0].replaceAll('\\','/');
export async function createPrivatePlugins234(options){
 const {plugins,bound}=await createPrivatePlugins222(options),binding=JSON.parse(await readFile('tools/overhaul-startup-integration-234/binding.json','utf8'));
 const root=process.cwd(),canvas=resolve(root,'src/game/GameCanvas.tsx'),owner=resolve(root,'tools/overhaul-native-integration-222/nativeOwner218.ts');
 const readExact=async row=>{const b=await readFile(row.path);if(b.length!==row.bytes||sha(b)!==row.sha256)throw Error('234 selected source changed '+row.path);return b.toString('utf8');};
 let text=await readExact(binding.canvas),ownerText=await readExact(binding.owner);
 const needle='const selectedPounceURL220 = IDENTITY57_ASSET_URL034;';if(text.split(needle).length!==2)throw Error('234 selected Pounce preload boundary changed');text=text.replace(needle,'const selectedPounceURL220 = '+JSON.stringify(bound.actorAssetURL)+';');
 const integration={name:'private-startup234',enforce:'pre',load(id){if(clean(id)===clean(canvas))return text;if(clean(id)===clean(owner))return ownerText;},generateBundle(){
  const ids=[...this.getModuleIds()],canvases=ids.filter(id=>/\/GameCanvas(?:220|232)?\.tsx$/.test(clean(id))),owners=ids.filter(id=>/\/nativeOwner(?:218|230)\.ts$/.test(clean(id)));
  if(canvases.length!==1||clean(canvases[0])!==clean(canvas)||owners.length!==1||clean(owners[0])!==clean(owner))throw Error('234 split canvas or animation owner module identities');
  this.emitFile({type:'asset',fileName:'integration-identity234.json',source:JSON.stringify({status:'ONE_CANONICAL_CANVAS_AND_ANIMATION_OWNER_PRIVATE_IMPLEMENTATIONS',canvases,owners,canvasSHA256:binding.canvas.sha256,ownerSHA256:binding.owner.sha256,actorAssetURL:bound.actorAssetURL,shaderPreparation:'SOURCE_ONLY_UNQUALIFIED_UNTIL_ACTUAL_CONTEXT_AND_DRAW',gameplayQualityAccepted:false},null,2)});
 }};
 return {plugins:[integration,...plugins],bound};
}
