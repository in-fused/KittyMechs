import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.PLAY_URL??'http://localhost:5173/?debug=1');await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
  await page.waitForFunction(()=>window.kittyMechDebug?.performance().fps);await page.locator('.loading-overlay').waitFor({state:'hidden'});await page.waitForTimeout(2500);
  const samples=[];
  for(let i=0;i<10;i++){await page.waitForTimeout(500);samples.push(await page.evaluate(()=>window.kittyMechDebug!.performance()));}
  const renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas')!.getContext('webgl2')!,ext=gl.getExtension('WEBGL_debug_renderer_info');return {version:gl.getParameter(gl.VERSION),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR)};});
  const report={date:new Date().toISOString(),browser:'Headless Microsoft Edge',viewport:{width:1440,height:900},preset:'medium',renderer,samples,errors,note:'Short local sample, not a hardware qualification or long-session frame-time test.'};
  await writeFile('docs/browser-performance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
