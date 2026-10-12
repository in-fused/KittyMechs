import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createStartupPlugin220} from '../overhaul-startup-220/candidate-plugin.mjs';
import {createDelivery225} from './delivery-factory225.mjs';
const clean=id=>id.split('?')[0].replaceAll('\\','/');
export async function createPrivatePlugins222(options){
 const bound=await createDelivery225(options),root=process.cwd(),folder=resolve(root,'tools/overhaul-native-integration-222'),actors=resolve(root,'src/game/entities/Actors.tsx'),registry=resolve(root,'src/game/camera/visualRegistry.ts'),virtual='\0private-delivery222';
 const startup=await createStartupPlugin220(bound),registryText=await readFile(folder+'/visualRegistry222.ts','utf8');
 const integration={name:'private-native222',enforce:'pre',resolveId(source,importer){
  if(source==='virtual:delivery222')return virtual;
  if(importer&&source.startsWith('.')){const path=clean(resolve(dirname(clean(importer)),source));if(path===clean(actors)||path===clean(actors).replace(/\.tsx$/,''))return folder+'/actor-bridge222.tsx';}
 },load(id){if(id===virtual)return 'export const delivery222='+JSON.stringify(bound.delivery)+';';if(clean(id)===clean(registry))return registryText;},generateBundle(){
  const ids=[...this.getModuleIds()],maps=ids.filter(id=>/\/visualRegistry(?:222)?\.ts(?:\?|$)/.test(clean(id)));
  if(maps.length!==1||clean(maps[0])!==clean(registry))throw Error('222 split/original-private camera registry module identities');
  this.emitFile({type:'asset',fileName:'registry-identity222.json',source:JSON.stringify({status:'ONE_CANONICAL_ORIGINAL_MODULE_WITH_PRIVATE_IMPLEMENTATION',canonical:clean(registry),modules:maps,actorAssetURL:bound.actorAssetURL,loaderReceiptSHA256:bound.loaderReceiptSHA256,contactQualified:false},null,2)});
 }};return {plugins:[integration,startup],bound};
}
