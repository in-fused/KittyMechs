import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createPrivatePlugins222} from '../overhaul-native-admission-225/plugin225.mjs';
const clean=id=>id.split('?')[0].replaceAll('\\','/'),sha=b=>createHash('sha256').update(b).digest('hex');
export async function createPrivatePlugins258(){
 const binding=JSON.parse(await readFile('tools/overhaul-grounded-integration-258/binding.json','utf8'));
 if(binding.writer!=='CLOSED')throw Error('258 integration binding incomplete');
 const {plugins,bound}=await createPrivatePlugins222({loaderReceiptPath:'tools/overhaul-pack-221/loader-evidence/evidence.json',loaderReceiptSHA256:'4ec83d8df258390f3cc991689229bf04861a2cb0effe8f3bd0a0baf7ef2d6232'});
 const overrides=new Map();
 for(const row of binding.overrides){let b=await readFile(row.path);if(b.length!==row.bytes||sha(b)!==row.sha256)throw Error('258 override changed '+row.path);let text=b.toString('utf8');if(row.canonical==='src/game/GameCanvas.tsx'){const needle='const selectedPounceURL220 = IDENTITY57_ASSET_URL034;';if(text.split(needle).length!==2)throw Error('258 selected preload boundary');text=text.replace(needle,'const selectedPounceURL220 = '+JSON.stringify(bound.actorAssetURL)+';');}overrides.set(clean(resolve(row.canonical)),text);}
 const overlay={name:'private-grounded258',enforce:'pre',load(id){return overrides.get(clean(id));},generateBundle(){
  const ids=[...this.getModuleIds()].map(clean),canonical={actor:clean(resolve('tools/overhaul-native-integration-222/NativeActor222.tsx')),canvas:clean(resolve('src/game/GameCanvas.tsx')),shader:clean(resolve('tools/overhaul-shader-startup-232/shaderStartup232.tsx')),owner:clean(resolve('tools/overhaul-native-integration-222/nativeOwner218.ts')),registry:clean(resolve('src/game/camera/visualRegistry.ts'))};
  for(const [key,suffix] of [['actor',/\/NativeActor(?:\d+)?\.tsx$/],['canvas',/\/GameCanvas(?:\d+)?\.tsx$/],['shader',/\/shaderStartup(?:\d+)?\.tsx$/],['owner',/\/nativeOwner(?:\d+)?\.ts$/],['registry',/\/visualRegistry(?:\d+)?\.ts$/]]){const found=ids.filter(id=>suffix.test(id));if(found.length!==1||found[0]!==canonical[key])throw Error('258 split '+key+' identity');}
  this.emitFile({type:'asset',fileName:'integration-identity258.json',source:JSON.stringify({writer:'CLOSED',scope:'PRIVATE_INTEGRATION_NOT_GAMEPLAY_APPROVAL',canonical,overrides:binding.overrides,actorAssetURL:bound.actorAssetURL,contactQualified:false},null,2)});
 }};
 return {plugins:[overlay,...plugins],bound};
}
