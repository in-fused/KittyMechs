import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
if(process.env.KITTYMECH_233_CAPABILITY_APPROVED!=='1')throw Error('Capability query not approved');
const started=Date.now(),out='.sites-runtime/overhaul-20261011/shader233-capability';await mkdir(out,{recursive:false});
let browser,context,result,error;const cleanup=[];
async function bounded(label,ms,fn){let timer;try{return await Promise.race([fn(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' timeout')),ms))]);}finally{clearTimeout(timer);}}
try{
 browser=await bounded('launch',8000,()=>chromium.launch({channel:'msedge',headless:true}));context=await browser.newContext();const page=await context.newPage();
 result=await bounded('readonly capability query',5000,()=>page.evaluate(()=>{
  const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2');if(!gl)return {status:'WEBGL2_UNAVAILABLE'};
  const debug=gl.getExtension('WEBGL_debug_renderer_info'),parallel=gl.getExtension('KHR_parallel_shader_compile');
  const value={status:'CAPABILITY_QUERY_ONLY',browser:navigator.userAgent,webgl:gl.getParameter(gl.VERSION),renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),parallelShaderCompile:parallel!==null,completionStatusKHR:parallel?.COMPLETION_STATUS_KHR??null,contextLostBefore:gl.isContextLost(),shaderProgramsCreated:0,gameAssetsLoaded:0,gameplayOrHumanPerformanceAccepted:false};
  gl.getExtension('WEBGL_lose_context')?.loseContext();return value;
 }));
}catch(e){error=String(e);process.exitCode=1;}
finally{
 for(const [label,fn] of [['context',()=>context?.close()],['browser',()=>browser?.close()]]){try{await bounded(label+' close',4000,fn);cleanup.push({label,status:'CLOSED'});}catch(e){cleanup.push({label,status:'FAILED',error:String(e)});process.exitCode=1;}}
 const receipt={writer:'CLOSED',scope:'ONE_BLANK_EDGE_WEBGL2_READONLY_CAPABILITY_QUERY_NO_MODEL_PROGRAM_OR_GAMEPLAY',result,error:error??null,cleanup,browserConnected:browser?.isConnected()??false,elapsedMs:Date.now()-started};await writeFile(out+'/evidence.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}
