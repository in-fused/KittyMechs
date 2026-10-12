import { test, expect } from '@playwright/test';

test('rendered contact state clears air and form anchors at their own presentation boundaries on both WebSocket clients',async({browser},testInfo)=>{
  test.setTimeout(120000);
  const origin=process.env.GAME_URL??'http://localhost:5173',a=await browser.newContext(),b=await browser.newContext();
  const host=await a.newPage(),observer=await b.newPage(),errors:string[]=[];
  let stage='joining',collectors:Promise<unknown>|undefined;
  host.on('pageerror',e=>errors.push(e.message));observer.on('pageerror',e=>errors.push(e.message));
  const current=async()=>host.evaluate(async()=>{
    const id=window.kittyMechDebug?.snapshot()?.actors.find(actor=>actor.name==='StateHost')?.id;
    return (await window.kittyMechDebug?.contact())?.find(row=>row.id===id);
  });
  try{
    await host.goto(origin+'/?debug=1');await host.getByLabel('Pilot callsign').fill('StateHost');
    await host.getByRole('button',{name:'Select Bastion',exact:true}).click();await host.getByRole('button',{name:'PVP',exact:true}).click();await host.getByRole('button',{name:'HOST SQUAD',exact:false}).click();
    await expect(host.locator('.network-status')).toContainText('Connected',{timeout:40000});
    await host.keyboard.down('Tab');const invite=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');invite.searchParams.set('debug','1');
    await observer.goto(invite.toString());await observer.getByLabel('Pilot callsign').fill('StateObserver');await observer.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
    await expect(observer.locator('.network-status')).toContainText('2 PILOTS',{timeout:40000});
    for(const page of [host,observer]){
      await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
      await expect.poll(()=>page.evaluate(async()=>{
        const id=window.kittyMechDebug?.snapshot()?.actors.find(actor=>actor.name==='StateHost')?.id;
        const row=(await window.kittyMechDebug?.contact())?.find(row=>row.id===id);
        return !!row?.grounded&&row.contactAllowed&&row.frameClock>0&&row.paws.some(paw=>paw.planted&&paw.weight>.8);
      }),{timeout:20000}).toBe(true);
    }
    const collect=async(page:typeof host)=>page.evaluate(async()=>{
      const id=window.kittyMechDebug!.snapshot()!.actors.find(actor=>actor.name==='StateHost')!.id,start=performance.now();
      let samples=0,air=0,transitions=0,upright=0,strong=0,invalidAnchors=0,uprightForeAnchors=0,clockReversals=0,nonfinite=0,previousClock=-Infinity,previousTime=-Infinity;
      while(performance.now()-start<12000){
        const row=(await window.kittyMechDebug!.contact()).find(row=>row.id===id);
        if(row){
          samples++;air+=Number(!row.grounded);transitions+=Number(row.transitionWeight>0);upright+=Number(row.stanceAmount>.999&&row.transitionWeight===0&&row.grounded);
          strong+=row.paws.filter(paw=>paw.valid&&paw.planted&&paw.weight>=.9).length;
          if(!row.contactAllowed)invalidAnchors+=row.paws.filter(paw=>paw.weight>.001||paw.planted).length;
          if(row.stanceAmount>.06)uprightForeAnchors+=row.paws.slice(0,2).filter(paw=>paw.weight>.001||paw.planted).length;
          if(row.frameClock<previousClock||row.renderTime<previousTime)clockReversals++;
          if(![row.frameClock,row.renderTime,row.position.x,row.position.y,row.position.z].every(Number.isFinite))nonfinite++;
          previousClock=row.frameClock;previousTime=row.renderTime;
        }
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      }
      return {samples,air,transitions,upright,strong,invalidAnchors,uprightForeAnchors,clockReversals,nonfinite};
    });
    await host.bringToFront();await expect.poll(()=>host.evaluate(()=>document.hasFocus())).toBe(true);
    const collecting=Promise.all([collect(host),collect(observer)]);
    collectors=collecting;
    // Cleanup must not mask an earlier input/assertion failure with an unhandled
    // rejection from the still-running read-only observers.
    void collecting.catch(()=>{});
    stage='quadruped jump acceptance';
    await host.keyboard.press('Space');await expect.poll(async()=>(await current())?.grounded).toBe(false);await expect.poll(async()=>(await current())?.grounded,{timeout:10000}).toBe(true);
    stage='upright transformation';
    await host.keyboard.press('KeyR');await expect.poll(async()=>(await current())?.stanceAmount,{timeout:10000}).toBe(1);
    await expect.poll(async()=>(await current())?.transitionWeight).toBe(0);
    await observer.screenshot({path:'test-results/contact-state-observer-upright.png'});
    await host.bringToFront();await expect.poll(()=>host.evaluate(()=>document.hasFocus())).toBe(true);
    stage='upright jump acceptance';
    await host.waitForTimeout(350);await host.keyboard.press('Space');await expect.poll(async()=>(await current())?.grounded).toBe(false);await expect.poll(async()=>(await current())?.grounded,{timeout:10000}).toBe(true);
    await host.keyboard.press('KeyR');await expect.poll(async()=>(await current())?.stanceAmount,{timeout:10000}).toBe(0);
    stage='contact sample assertions';
    for(const result of await collecting){
      expect(result.samples).toBeGreaterThan(100);expect(result.air).toBeGreaterThan(5);expect(result.transitions).toBeGreaterThan(5);expect(result.upright).toBeGreaterThan(5);expect(result.strong).toBeGreaterThan(20);
      expect(result.invalidAnchors).toBe(0);expect(result.uprightForeAnchors).toBe(0);expect(result.clockReversals).toBe(0);expect(result.nonfinite).toBe(0);
    }
    expect(errors).toEqual([]);
  }catch(error){
    const states=await Promise.all([host,observer].map(page=>page.evaluate(async()=>({focused:document.hasFocus(),activeElement:document.activeElement?.tagName,snapshot:window.kittyMechDebug?.snapshot(),contact:await window.kittyMechDebug?.contact()})).catch(readError=>({readError:String(readError)}))));
    await testInfo.attach('contact-state-original-failure',{body:JSON.stringify({stage,error:String(error),errors,states}),contentType:'application/json'});
    throw error;
  }finally{await b.close();await a.close();await collectors?.catch(()=>{});}
});
