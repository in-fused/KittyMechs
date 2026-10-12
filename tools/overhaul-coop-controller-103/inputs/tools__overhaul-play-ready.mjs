/** Browser readiness is sampled synchronously; async input inspection is
 * awaited outside waitForFunction so a Promise cannot qualify an empty frame. */
export async function readyForOrdinaryPlay(page,name){
 const deadline=Date.now()+60000;
 await page.waitForFunction(n=>{const d=window.kittyMechDebug;return !!d?.snapshot()?.actors.some(a=>a.name===n)&&d.camera().preferredDistance>0&&d.camera().frameClock>0&&!document.querySelector('.loading-overlay');},name,{timeout:60000});
 while(Date.now()<deadline){
  const mounted=await page.evaluate(async()=>{const i=await window.kittyMechDebug.input();return i.mountedAt!==null&&i.phase==='playing';});
  if(mounted){await page.locator('canvas').click({position:{x:720,y:450}});return;}
  await page.waitForTimeout(50);
 }
 throw Error('Ordinary input did not mount within readiness bound');
}
