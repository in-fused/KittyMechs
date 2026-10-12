import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve('.sites-runtime/overhaul-20261009/'+(process.argv[2]??'comparison-001'));await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const reports=[];
for(const candidate of ['r3f','three']){
  const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:resolve(root,candidate),size:{width:1920,height:1080}}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
    await page.goto((process.argv[3]??'http://localhost:5173')+'/benchmark.html?candidate='+candidate);
    await page.waitForFunction(()=>window.kittyBenchmark?.ready,{},{timeout:60000});await page.waitForTimeout(4000);
    await page.evaluate(()=>window.kittyBenchmark.start('ordinary-keyboard-route-1080p'));
    for(const [key,ms] of [['KeyW',3000],['KeyD',1600],['KeyW',2000],['KeyA',1600],['KeyS',2000]]){
      await page.keyboard.down(key);if(key==='KeyW')await page.keyboard.press('Space');await page.waitForTimeout(ms);await page.keyboard.up(key);
    }
    await page.keyboard.press('KeyR');await page.keyboard.down('KeyW');await page.waitForTimeout(2800);await page.keyboard.up('KeyW');
    await page.screenshot({path:resolve(root,candidate+'-upright.png')});
    await page.keyboard.press('KeyR');await page.keyboard.down('KeyD');await page.waitForTimeout(2500);await page.keyboard.up('KeyD');
    await page.screenshot({path:resolve(root,candidate+'-quad.png')});
    const report=await page.evaluate(()=>window.kittyBenchmark.stop());reports.push({candidate,errors,report});
    await writeFile(resolve(root,candidate+'.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({candidate,errors,fps:report.fps,intervals:report.frameIntervalsMs,calls:report.drawCalls,renderer:report.renderer,frames:report.frames}));
  }catch(e){reports.push({candidate,errors,failure:String(e)});console.log(candidate+': '+String(e));}
  await context.close();
}
await browser.close();await writeFile(resolve(root,'results.json'),JSON.stringify(reports,null,2));
