import {mkdir,writeFile} from 'node:fs/promises';
interface FileEntry {url:string;}
await mkdir('assets/source/nature/terrain',{recursive:true});
for(const asset of ['rock_ground','forest_ground_04']){
  const response=await fetch(`https://api.polyhaven.com/files/${asset}`);if(!response.ok)throw new Error('Poly Haven metadata unavailable');
  const files=await response.json() as Record<string,Record<string,Record<string,FileEntry>>>;
  await writeFile(`assets/reference/${asset}-files.json`,JSON.stringify(files,null,2));
  const results=await Promise.allSettled(['diff','nor_gl','rough'].map(async map=>{
    const key=map==='diff'?'Diffuse':map==='rough'?'Rough':map;
    const file=files[key]['1k'].jpg;const r=await fetch(file.url);if(!r.ok)throw new Error(`${r.status}: ${file.url}`);
    await writeFile(`assets/source/nature/terrain/${asset}_${map}.jpg`,new Uint8Array(await r.arrayBuffer()));
  }));for(const r of results)if(r.status==='rejected')throw r.reason;
  console.log(`Fetched CC0 ${asset}, 1k diffuse/normal/roughness`);
}
