import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
interface AssetFile {url:string;size:number;include?:Record<string,AssetFile>;}
async function download(file:AssetFile,path:string){await mkdir(dirname(path),{recursive:true});const response=await fetch(file.url);if(!response.ok)throw new Error(`${response.status}: ${file.url}`);await writeFile(path,new Uint8Array(await response.arrayBuffer()));console.log(`Fetched ${path}`);}
const tree=JSON.parse(await readFile('assets/reference/fir-files.json','utf8')) as Record<string,Record<string,Record<string,AssetFile>>>;
const textures=tree.blend['1k'].blend.include!;
const selected=['textures/fir_tree_01_twig_diff_1k.png','textures/fir_tree_01_twig_alpha_1k.png','textures/fir_tree_01_twig_nor_gl_1k.png','textures/fir_tree_01_bark_diff_1k.png','textures/fir_tree_01_bark_nor_gl_1k.png'];
const results=await Promise.allSettled(selected.map(name=>download(textures[name],resolve('assets/source/nature',name))));
for(const r of results)if(r.status==='rejected')throw r.reason;
const rock=JSON.parse(await readFile('assets/reference/rock-files.json','utf8')) as {gltf:Record<string,{gltf:AssetFile}>};
const files=rock.gltf['1k'].gltf;
await download(files,resolve('assets/source/nature/coast_rocks_02.gltf'));
const more=await Promise.allSettled(Object.entries(files.include!).map(([name,file])=>download(file,resolve('assets/source/nature',name))));
for(const r of more)if(r.status==='rejected')throw r.reason;
await writeFile('assets/reference/nature-provenance.json',JSON.stringify({license:'CC0',sources:['https://polyhaven.com/a/fir_tree_01','https://polyhaven.com/a/coast_rocks_02','https://polyhaven.com/a/kloetzle_blei'],notes:'Fir branch photographs are used in a new low-poly 3D canopy. Full 478 MB LOD0 tree is not shipped. Rock photogrammetry will be simplified before delivery.'},null,2));
