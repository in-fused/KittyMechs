import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const areas=['mechs','maps','enemyTactics','integration'] as const;
const configs=new Set(['package.json','package-lock.json','index.html','vite.config.ts','vitest.config.ts','playwright.config.ts','eslint.config.js','tsconfig.json','tsconfig.app.json','tsconfig.node.json','.openai/hosting.json','Play-KittyMech-Web.cmd','Start-Online-Prototype.ps1','Stop-Public-Link.ps1','Keep-Online-Awake.ps1']);
const environmentReceipts=new Set(['assets/reference/factory-provenance.json','assets/reference/factory-bounds.json','assets/reference/foliage-provenance.json','assets/reference/environment-optimization.json','assets/reference/higgsfield-factory-sign.json']);
const uprightReceipts=new Set(['assets/reference/upright-motion-evidence.json','assets/reference/upright-contact-evidence.json','assets/reference/upright-preservation-evidence.json']);
const cityArtReceipts=new Set(['assets/reference/pounce-art-evidence.json','assets/reference/bastion-art-evidence.json','assets/reference/lynx-art-evidence.json','assets/reference/caracal-art-evidence.json','assets/reference/higgsfield-recon-medic-concept.json','assets/reference/city-district-evidence.json','assets/reference/higgsfield-coolant-runtime.json','assets/reference/higgsfield-city-art.json']);
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(p=>p&&(/^(src|shared|server|public|tests|tools)\//.test(p)||/^assets\/reference\/(?:upright|climb|combat|rig|turn)-bounds-[a-z_]+\.json$/.test(p)||/^assets\/reference\/turn-composition-[a-z_]+\.json$/.test(p)||/^assets\/reference\/upright-locomotion-(?:bounds|composition)-[a-z_]+\.json$/.test(p)||/^assets\/reference\/(?:traversal|combat|turn)-motion-evidence\.json$/.test(p)||uprightReceipts.has(p)||cityArtReceipts.has(p)||p==='assets/reference/combat-composition-evidence.json'||p==='assets/reference/higgsfield-supplies.json'||environmentReceipts.has(p)||configs.has(p))).sort();
const digest=createHash('sha256');
for(const path of files){
  const bytes=await readFile(path);
  const content=/\.(?:tsx?|jsx?|json|css|html|py|ps1|cmd|sh|toml|txt|md)$/.test(path)?Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n')):bytes;
  digest.update(path+'\0').update(createHash('sha256').update(content).digest()).update('\0');
}
const fingerprint=digest.digest('hex');
if(process.argv.includes('--fingerprint'))console.log(fingerprint);
else {
  try{
    const receipt=JSON.parse(await readFile('docs/critical-review.json','utf8')) as {reviewer:string;reviewedAt:string;fingerprint:string;areas:Record<string,string>;report:string};
    if(!receipt.reviewer||!Number.isFinite(Date.parse(receipt.reviewedAt)))throw new Error('Missing reviewer or review date.');
    for(const area of areas)if(receipt.areas?.[area]!=='APPROVE')throw new Error(`${area} has not received critic approval.`);
    if(receipt.fingerprint!==fingerprint)throw new Error('Reviewed files changed. Independent critic re-review is required.');
    if(receipt.report!=='docs/critical-review.md'||!(await readFile(receipt.report,'utf8')).trim())throw new Error('Missing critical review report.');
    console.log(`Independent critic approved all four areas. ${files.length} reviewed files match ${fingerprint}.`);
  }catch(error){console.error(`Release review blocked: ${error instanceof Error?error.message:String(error)}`);process.exitCode=1;}
}
