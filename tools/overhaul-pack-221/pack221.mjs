import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {preparePack214,input214,inputSHA214} from '../overhaul-native-214/pack214.mjs';
import {readGLB206,hash206} from '../overhaul-delivery-206/convert206.mjs';
import {encode209} from '../overhaul-delivery-209/convert209.mjs';
if(!process.argv.includes('--root-approved-pack221'))throw Error('221_PACK_NOT_APPROVED');
const folder='tools/overhaul-pack-221',receipt={scope:'ONE_PRIVATE_PACK_ONLY_ACTUAL_LOADER_UNADMITTED',status:'INCOMPLETE',contactQualified:false,operands:[]};let failure;
try{
 const bytes=await readFile(input214),inputSHA=hash206(bytes);receipt.input={path:input214,bytes:bytes.length,sha256:inputSHA};if(inputSHA!==inputSHA214)throw Error('221_RAW209_SHA_CHANGED');
 const source=readGLB206(bytes);receipt.sourceLayout={bufferViews:source.doc.bufferViews,accessors:source.doc.accessors,meshes:source.doc.meshes,skins:source.doc.skins};
 const prepared=await preparePack214(source,receipt.operands),output=encode209(prepared),path=folder+'/output/Pounce_Anatomy221.glb';
 await mkdir(folder+'/output',{recursive:true});await writeFile(path,output,{flag:'wx'});
 Object.assign(receipt,{status:'PRIVATE_PACK_PASS_ACTUAL_LOADER_UNADMITTED',output:{path,bytes:output.length,sha256:hash206(output)},ratio:output.length/bytes.length,semanticMaps:prepared.semanticMaps,liveViews:prepared.liveViews,liveAccessors:prepared.liveAccessors,removedViews:prepared.removedViews,removedAccessors:prepared.removedAccessors,clips:prepared.doc.animations.length,primitives:prepared.doc.meshes.reduce((s,m)=>s+m.primitives.length,0),skins:prepared.doc.skins.map(s=>s.joints.length),original39LawsPreservedByUnchangedFunction:true});
}catch(e){failure=e;receipt.status='FIRST_PACK_FAILURE';receipt.error=String(e.stack??e);}
finally{await writeFile(folder+'/pack221-receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify({status:receipt.status,input:receipt.input,output:receipt.output,error:receipt.error,views:receipt.liveViews,accessors:receipt.liveAccessors}));}
if(failure)process.exitCode=1;
