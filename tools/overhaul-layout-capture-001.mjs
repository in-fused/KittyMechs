import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const source=resolve('assets/source/overhaul-pounce-anatomy-layout-001');
const output=resolve('.sites-runtime/overhaul-20261010/anatomy-layout-001');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1320},deviceScaleFactor:1});
const receipt={scope:'Browser raster of dimensioned SVG proposal only. No model, animation, gameplay or admission evidence.',images:[]};
try {
  for(const name of ['complete-anatomy-views','joint-sections']) {
    const path=resolve(source,name+'.svg');
    const before=await readFile(path);
    await page.goto(pathToFileURL(path).href);
    await page.locator('svg').screenshot({path:resolve(output,name+'.png')});
    const after=await readFile(path);
    if(!before.equals(after))throw Error('Source changed during capture: '+name);
    receipt.images.push({source:path,sourceSha256:createHash('sha256').update(before).digest('hex'),png:resolve(output,name+'.png')});
  }
} finally {await browser.close();}
await writeFile(resolve(output,'capture.json'),JSON.stringify(receipt,null,2));
console.log(JSON.stringify(receipt));
