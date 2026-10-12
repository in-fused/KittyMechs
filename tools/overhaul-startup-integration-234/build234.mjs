import {build} from 'vite';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createPrivatePlugins234} from './plugin234.mjs';
import {proveEntry220} from '../overhaul-startup-220/prove-entry.mjs';
if(process.env.KITTYMECH_234_BUILD_APPROVED!=='1')throw Error('234 private build not approved');
const sha=b=>createHash('sha256').update(b).digest('hex'),binding=JSON.parse(await readFile('tools/overhaul-startup-integration-234/binding.json','utf8')),source=JSON.parse(await readFile('tools/overhaul-startup-integration-234/source-seal.json','utf8')),rows=[...binding.files,...source.files];
async function protect(){for(const row of rows){const b=await readFile(row.path);if(b.length!==row.bytes||sha(b)!==row.sha256)throw Error('234 protected input changed '+row.path);}}
await protect();const parent=resolve('.sites-runtime/overhaul-20261011/startup234-private');if(await stat(parent).catch(()=>null))throw Error('234 output must be fresh; no automatic rebuild');
const {plugins,bound}=await createPrivatePlugins234({loaderReceiptPath:'tools/overhaul-pack-221/loader-evidence/evidence.json',loaderReceiptSHA256:'4ec83d8df252390f3cc991689229bf04861a2cb0effe8f3bd0a0baf7ef2d6232'}),out=resolve(parent,'dist');
await build({configFile:resolve('vite.config.ts'),publicDir:false,plugins,build:{outDir:out,emptyOutDir:false,rollupOptions:{output:{entryFileNames:'assets/index-jFb_gY9P.js'}}}});await protect();await proveEntry220(out);
await writeFile(resolve(parent,'delivery222.json'),JSON.stringify(bound.delivery,null,2)+'\n');
await writeFile(resolve(parent,'build-receipt.json'),JSON.stringify({status:'PRIVATE_BUILD_UNADMITTED_GAMEPLAY',actualAssetSHA:bound.delivery.contract.sha256,actorAssetURL:bound.actorAssetURL,assetValueAdmissionWithResourceCaveat:bound.retirement,canvasSource:binding.canvas,ownerSource:binding.owner,publicAssetsCopied:false,productionChanges:[],contactQualified:false,shaderStartupGain:'UNQUALIFIED'},null,2)+'\n');
