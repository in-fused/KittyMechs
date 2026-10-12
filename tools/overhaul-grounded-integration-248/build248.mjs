import {build} from 'vite';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createPrivatePlugins248} from './plugin248.mjs';
import {proveEntry220} from '../overhaul-startup-220/prove-entry.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
if(process.env.KITTYMECH_248_BUILD_APPROVED!=='1')throw Error('248 build gate absent');
const criticPath=process.env.KITTYMECH_248_CRITIC_PATH,criticSHA=process.env.KITTYMECH_248_CRITIC_SHA;
if(criticPath!=='docs/overhaul/critic/grounded248-source-review.md'||!/^[a-f0-9]{64}$/.test(criticSHA??'')||sha(await readFile(criticPath))!==criticSHA)throw Error('248 exact critic required');
const binding=JSON.parse(await readFile('tools/overhaul-grounded-integration-248/binding.json','utf8')),source=JSON.parse(await readFile('tools/overhaul-grounded-integration-248/source-seal.json','utf8'));
async function protect(){for(const row of [...binding.files,...source.files]){const b=await readFile(row.path);if(b.length!==row.bytes||sha(b)!==row.sha256)throw Error('248 protected input changed '+row.path);}}
await protect();const parent=resolve('.sites-runtime/shader-startup-238/private248');if(await stat(parent).catch(()=>null))throw Error('248 output must be fresh');
const {plugins,bound}=await createPrivatePlugins248(),out=resolve(parent,'dist');
await build({configFile:resolve('vite.config.ts'),publicDir:false,plugins,build:{outDir:out,emptyOutDir:false,rollupOptions:{output:{entryFileNames:'assets/index-jFb_gY9P.js'}}}});
await protect();await proveEntry220(out);
await writeFile(resolve(parent,'delivery222.json'),JSON.stringify(bound.delivery,null,2)+'\n');
await writeFile(resolve(parent,'build-receipt.json'),JSON.stringify({writer:'CLOSED',status:'PRIVATE248_UNADMITTED_GAMEPLAY',overrides:binding.overrides,actorAssetURL:bound.actorAssetURL,assetValueResourceCaveat:bound.retirement,critic:{path:criticPath,sha256:criticSHA},productionChanges:[],contactQualified:false},null,2)+'\n');
