import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createStartupPlugin220} from '../overhaul-startup-220/candidate-plugin.mjs';
import {createDelivery268} from './delivery-factory268.mjs';
const clean=id=>id.split('?')[0].replaceAll('\\','/');
/** Root layers267 owner/wiring/47 registry and232/240 startup on this scoped
 * plugin. Scoped268 wiring binds47 without changing original222 source. */
export async function createPrivatePlugins268(options){
 const bound=await createDelivery268(options),root=process.cwd(),folder=resolve(root,'tools/overhaul-native-integration-222'),scoped=resolve(root,'tools/overhaul-feline-admission-268'),actors=resolve(root,'src/game/entities/Actors.tsx'),registry=resolve(root,'src/game/camera/visualRegistry.ts'),virtual='\0private-delivery222';
 const startup=await createStartupPlugin220(bound),registryText=await readFile(folder+'/visualRegistry222.ts','utf8');
 const integration={name:'private-native268',enforce:'pre',resolveId(source,importer){if(source==='virtual:delivery222')return virtual;if(importer&&source.startsWith('.')){const path=clean(resolve(dirname(clean(importer)),source));if(path===clean(actors)||path===clean(actors).replace(/\.tsx$/,''))return scoped+'/actor-bridge268.tsx';if(path===clean(folder+'/wiring222.tsx')||path===clean(folder+'/wiring222'))return scoped+'/wiring268.tsx';}},load(id){if(id===virtual)return 'export const delivery222='+JSON.stringify(bound.delivery)+';';if(clean(id)===clean(registry))return registryText;},generateBundle(){const maps=[...this.getModuleIds()].filter(id=>/\/visualRegistry(?:222)?\.ts(?:\?|$)/.test(clean(id)));if(maps.length!==1||clean(maps[0])!==clean(registry))throw Error('268 split original/private camera registry identities');this.emitFile({type:'asset',fileName:'registry-identity268.json',source:JSON.stringify({status:'ONE_CANONICAL_ORIGINAL_MODULE_WITH_PRIVATE_IMPLEMENTATION',canonical:clean(registry),modules:maps,actorAssetURL:bound.actorAssetURL,loaderReceiptSHA256:bound.loaderReceiptSHA256,resourceScope:bound.retirement.scope,originalSupervisorExitCode:1,expectedClipCount:47,requiresRuntime267:true,contactQualified:false},null,2)});}};
 return {plugins:[integration,startup],bound};
}
