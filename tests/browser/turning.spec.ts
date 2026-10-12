import { test, expect } from '@playwright/test';

test('stationary aimed turns reposition quadruped paws on the host and WebSocket observer',async({browser},testInfo)=>{
  test.setTimeout(120000);
  const origin=process.env.GAME_URL??'http://localhost:5173';
  const a=await browser.newContext(),b=await browser.newContext(),host=await a.newPage(),guest=await b.newPage(),errors:string[]=[];
  host.on('pageerror',error=>errors.push(error.message));guest.on('pageerror',error=>errors.push(error.message));
  const readiness:{observer:string;actor:unknown;contact:unknown;fps:number}[]=[];
  try{
    await host.goto(origin+'/?debug=1');await host.getByLabel('Pilot callsign').fill('TurnHost');
    // Isolate stationary paw turning from incoming CO-OP enemy fire during guest loading.
    await host.getByRole('button',{name:'Select Lynx',exact:true}).click();await host.getByRole('button',{name:'PVP',exact:true}).click();await host.getByRole('button',{name:'HOST SQUAD',exact:false}).click();
    await expect(host.locator('.network-status')).toContainText('Connected',{timeout:40000});
    await host.keyboard.down('Tab');const invite=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');invite.searchParams.set('debug','1');
    await guest.goto(invite.toString());await guest.getByLabel('Pilot callsign').fill('TurnObserver');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
    await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:40000});
    for(const page of [host,guest]){
      await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
      await expect.poll(async()=>{
        const row=await page.evaluate(async()=>{const actor=window.kittyMechDebug?.snapshot()?.actors.find(actor=>actor.name==='TurnHost');const contact=(await window.kittyMechDebug?.contact())?.find(contact=>contact.id===actor?.id);return {actor,contact,fps:window.kittyMechDebug?.performance().fps??0};});
        readiness.push({observer:page===host?'host':'guest',...row});
        return !!row.actor?.grounded&&row.actor.hp>0&&row.contact?.grounded&&row.contact.alive&&row.contact.contactAllowed&&row.contact.paws.length===4&&row.contact.paws.some(paw=>paw.valid);
      }).toBe(true);
    }
    await host.bringToFront();await expect.poll(()=>host.evaluate(()=>document.hasFocus())).toBe(true);
    await host.mouse.click(720,450);
    await expect.poll(()=>host.evaluate(()=>document.pointerLockElement?.tagName)).toBe('CANVAS');
    const before=await host.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(actor=>actor.name==='TurnHost')!);
    const collect=async(page:typeof host)=>page.evaluate(async()=>{
      const start=performance.now(),released=new Set<number>();let samples=0,maximumSlip=0,maximumSoleError=0;
      while(performance.now()-start<3200){
        const actor=window.kittyMechDebug!.snapshot()!.actors.find(actor=>actor.name==='TurnHost')!;
        const contact=(await window.kittyMechDebug!.contact()).find(contact=>contact.id===actor.id);
        if(contact){samples++;contact.paws.forEach((paw,index)=>{if(paw.support<.2)released.add(index);if(paw.planted&&paw.weight>.8){maximumSlip=Math.max(maximumSlip,paw.slip);maximumSoleError=Math.max(maximumSoleError,Math.abs(paw.soleError));}});}
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      }
      return {samples,released:[...released],maximumSlip,maximumSoleError};
    });
    const samples=Promise.all([collect(host),collect(guest)]);
    await host.mouse.down();
    try{for(let step=1;step<=18;step++){await host.mouse.move(720-step*30,450);await host.waitForTimeout(130);}}finally{await host.mouse.up();}
    const observed=await samples;
    const after=await host.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(actor=>actor.name==='TurnHost')!);
    expect(Math.hypot(after.position.x-before.position.x,after.position.z-before.position.z)).toBeLessThan(.15);
    expect(Math.abs(Math.atan2(Math.sin(after.yaw-before.yaw),Math.cos(after.yaw-before.yaw)))).toBeGreaterThan(.8);
    for(const sample of observed){expect(sample.samples).toBeGreaterThan(30);expect(sample.released.length).toBeGreaterThanOrEqual(2);expect(sample.maximumSlip).toBeLessThan(.04);expect(sample.maximumSoleError).toBeLessThan(.015);}
    expect(errors).toEqual([]);
  }finally{
    await testInfo.attach('stationary-turn-readiness',{body:Buffer.from(JSON.stringify({mode:'pvp',readiness,errors},null,2)),contentType:'application/json'});
    await b.close();await a.close();
  }
});
