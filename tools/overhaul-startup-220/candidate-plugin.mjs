import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {startupSelectedAsset220} from './selected-asset.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
/** Default retains062/211 individual GLTF cache URLs. Optional packed delivery
 * requires real artifact+loader receipt byte identities and root-approved actor
 * using this exact URL; this plugin never edits public/global model routing. */
export async function createStartupPlugin220(options={}){
 const root=process.cwd(),original=resolve(root,'src/game/GameCanvas.tsx'),folder=resolve(root,'tools/overhaul-startup-220'),helper=resolve(root,'tools/overhaul-readiness-211/deploymentReadiness211.ts');
 if(sha(await readFile(original))!=='8fa2de3d7aaea5b31ad496ee74b4c8645a1dde51731c44bf12ebd1e6c7dbec63')throw Error('220 retained production GameCanvas changed');
 let candidate=await readFile(folder+'/GameCanvas220.tsx','utf8');const url=startupSelectedAsset220(options.delivery);
 if(url!==null){
  if(process.env.KITTYMECH_220_DELIVERY_APPROVED!=='1'||!options.packedAssetPath||!options.loaderReceiptPath||options.actorAssetURL!==url)throw Error('220 delivery requires root admission, real artifacts and exact actor cacheURL');
  if(sha(await readFile(options.packedAssetPath))!==options.delivery.contract.sha256||sha(await readFile(options.loaderReceiptPath))!==options.delivery.qualification.allArrayLoaderReceiptSHA256)throw Error('220 actual packed asset/loader proof identity changed');
  const needle='const selectedPounceURL220 = IDENTITY57_ASSET_URL034;';if(candidate.split(needle).length!==2)throw Error('220 selected URL binding boundary changed');candidate=candidate.replace(needle,'const selectedPounceURL220 = '+JSON.stringify(url)+';');
 }
 const clean=id=>id.split('?')[0].replaceAll('\\','/');
 return {name:'private-startup220',enforce:'pre',resolveId(source,importer){if(source==='./rendering/deploymentReadiness211'&&clean(importer??'')===clean(original))return helper;},load(id){if(clean(id)===clean(original))return candidate;}};
}
