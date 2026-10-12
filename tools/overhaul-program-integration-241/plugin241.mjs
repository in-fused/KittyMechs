import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createPrivatePlugins234} from '../overhaul-startup-integration-234/plugin234.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),clean=id=>id.split('?')[0].replaceAll('\\','/');
export async function createPrivatePlugins241(options){
 const {plugins,bound}=await createPrivatePlugins234(options),binding=JSON.parse(await readFile('tools/overhaul-program-integration-241/binding.json','utf8'));
 const canonical=resolve('tools/overhaul-shader-startup-232/shaderStartup232.tsx'),row=binding.helper,b=await readFile(row.path);
 if(b.length!==row.bytes||sha(b)!==row.sha256)throw Error('241 shader implementation source changed');
 const overlay={name:'private-program241',enforce:'pre',load(id){if(clean(id)===clean(canonical))return b.toString('utf8');},generateBundle(){
  const helpers=[...this.getModuleIds()].filter(id=>/\/shaderStartup(?:232|240)\.tsx$/.test(clean(id)));
  if(helpers.length!==1||clean(helpers[0])!==clean(canonical))throw Error('241 split shader owner module identities');
  this.emitFile({type:'asset',fileName:'integration-identity241.json',source:JSON.stringify({status:'ONE_CANONICAL_SHADER_OWNER_WITH_PRIVATE240_IMPLEMENTATION',helpers,helperSHA256:row.sha256,canvasSHA256:binding.canvas.sha256,animationOwnerSHA256:binding.owner.sha256,actorAssetURL:bound.actorAssetURL,gameplayQualityAccepted:false},null,2)});
 }};return {plugins:[overlay,...plugins],bound};
}
