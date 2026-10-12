import {test,expect,type Page} from '@playwright/test';

async function sampleUpright(page:Page,name:string,milliseconds:number){
  return page.evaluate(async({name,milliseconds})=>{
    const start=performance.now(),releasedSincePlant=[false,false],released=new Set<number>();
    const samples:{frameClock:number;support:number[];contactAllowed:boolean}[]=[];
    let frames=0,edges=0,foreAnchors=0,forbiddenAnchors=0,maxProbes=0,maxSlip=0,maxSoleError=0,clock=-1;
    while(performance.now()-start<milliseconds){
      const actor=window.kittyMechDebug!.snapshot()?.actors.find(a=>a.name===name);
      const contact=(await window.kittyMechDebug!.contact()).find(c=>c.id===actor?.id);
      // Each copied contact row supplies its own displayed state and frame clock.
      if(contact&&contact.frameClock>clock&&contact.stanceAmount>.999&&contact.alive){
        clock=contact.frameClock;frames++;maxProbes=Math.max(maxProbes,contact.probes);
        samples.push({frameClock:contact.frameClock,support:contact.paws.slice(2).map(p=>p.support),contactAllowed:contact.contactAllowed});
        for(let i=0;i<4;i++){
          const paw=contact.paws[i];
          if(i<2&&(paw.planted||paw.weight>.001))foreAnchors++;
          if(!contact.contactAllowed&&(paw.planted||paw.weight>.001))forbiddenAnchors++;
          if(i>=2&&contact.contactAllowed){
            // A smooth release/replant crosses intermediate values over several
            // frames. Retain the release until its subsequent supported stance.
            if(paw.support<.2){released.add(i);releasedSincePlant[i-2]=true;}
            if(releasedSincePlant[i-2]&&paw.support>.55){edges++;releasedSincePlant[i-2]=false;}
          }
          if(paw.valid&&paw.planted&&paw.weight>.9){maxSlip=Math.max(maxSlip,paw.slip);maxSoleError=Math.max(maxSoleError,Math.abs(paw.soleError));}
        }
      }
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    }
    return {frames,edges,released:[...released],foreAnchors,forbiddenAnchors,maxProbes,maxSlip,maxSoleError,samples};
  },{name,milliseconds});
}

test('a joined upright Lynx takes longer strides and stepping turns on both rendered clients',async({browser},testInfo)=>{
  test.setTimeout(120000);
  const origin=process.env.GAME_URL??'http://localhost:5173',name='UprightGuest';
  const leadContext=await browser.newContext(),guestContext=await browser.newContext();
  const lead=await leadContext.newPage(),guest=await guestContext.newPage(),errors:string[]=[];
  for(const page of [lead,guest])page.on('pageerror',error=>errors.push(error.message));
  try{
    await lead.goto(origin+'/?debug=1');await lead.getByLabel('Pilot callsign').fill('UprightObserver');
    await lead.getByRole('button',{name:'Select Bastion',exact:true}).click();await lead.getByRole('button',{name:'PVP',exact:true}).click();
    await lead.getByRole('button',{name:'HOST SQUAD',exact:false}).click();
    await expect(lead.locator('.network-status')).toContainText('Connected',{timeout:40000});
    await lead.keyboard.down('Tab');const invite=new URL(await lead.getByLabel('Squad invite').inputValue());await lead.keyboard.up('Tab');invite.searchParams.set('debug','1');
    await guest.goto(invite.toString());await guest.getByLabel('Pilot callsign').fill(name);
    await guest.getByRole('button',{name:'Select Lynx',exact:true}).click();await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
    for(const page of [lead,guest]){
      await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
      await expect(page.locator('.network-status')).toContainText('2 PILOTS',{timeout:40000});
      await expect.poll(()=>page.evaluate(async name=>{
        const actor=window.kittyMechDebug?.snapshot()?.actors.find(a=>a.name===name);
        const contact=(await window.kittyMechDebug?.contact())?.find(c=>c.id===actor?.id);
        return !!actor?.grounded&&!!contact?.paws.some(p=>p.valid);
      },name)).toBe(true);
    }
    await guest.bringToFront();await expect.poll(()=>guest.evaluate(()=>document.hasFocus())).toBe(true);
    await guest.mouse.click(720,450);await expect.poll(()=>guest.evaluate(()=>document.pointerLockElement?.tagName)).toBe('CANVAS');
    await guest.keyboard.press('KeyR');
    for(const page of [lead,guest])await expect.poll(()=>page.evaluate(async name=>{
      const actor=window.kittyMechDebug!.snapshot()?.actors.find(a=>a.name===name);
      const contact=(await window.kittyMechDebug!.contact()).find(c=>c.id===actor?.id);
      return contact?.stanceAmount===1&&contact.transitionWeight===0&&contact.contactAllowed;
    },name)).toBe(true);
    const before=await guest.evaluate(name=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name===name)!.position.z,name);
    const forward=Promise.all([sampleUpright(guest,name,2700),sampleUpright(lead,name,2700)]);
    await guest.keyboard.down('KeyW');try{await guest.waitForTimeout(2300);}finally{await guest.keyboard.up('KeyW');}
    const strideRows=await forward;
    expect(await lead.evaluate(name=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name===name)!.position.z,name)).toBeLessThan(before-10);
    for(const row of strideRows){expect(row.frames).toBeGreaterThan(30);expect(row.edges).toBeGreaterThanOrEqual(6);expect(row.edges).toBeLessThanOrEqual(20);}
    await guest.waitForTimeout(400);
    const beforeTurn=await guest.evaluate(name=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name===name)!,name);
    const turns=Promise.all([sampleUpright(guest,name,3200),sampleUpright(lead,name,3200)]);
    await guest.mouse.down();
    try{for(let step=1;step<=18;step++){await guest.mouse.move(720-step*30,450);await guest.waitForTimeout(130);}}finally{await guest.mouse.up();}
    const turnRows=await turns,afterTurn=await guest.evaluate(name=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name===name)!,name);
    await testInfo.attach('upright-own-frame-contact',{body:JSON.stringify({strideRows,turnRows,beforeTurn,afterTurn,errors},null,2),contentType:'application/json'});
    expect(Math.hypot(afterTurn.position.x-beforeTurn.position.x,afterTurn.position.z-beforeTurn.position.z)).toBeLessThan(.15);
    expect(Math.abs(Math.atan2(Math.sin(afterTurn.yaw-beforeTurn.yaw),Math.cos(afterTurn.yaw-beforeTurn.yaw)))).toBeGreaterThan(.8);
    for(const row of turnRows){expect(row.frames).toBeGreaterThan(30);expect(row.released.sort()).toEqual([2,3]);expect(row.edges).toBeGreaterThan(0);}
    for(const row of [...strideRows,...turnRows]){
      expect(row.foreAnchors).toBe(0);expect(row.forbiddenAnchors).toBe(0);expect(row.maxProbes).toBeLessThanOrEqual(10);
      expect(row.maxSlip).toBeLessThan(.04);expect(row.maxSoleError).toBeLessThan(.015);
    }
    await guest.keyboard.press('KeyR');await expect.poll(()=>lead.evaluate(name=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name===name)!.stance,name)).toBe('quadruped');
    await guest.screenshot({path:'test-results/upright-joined-motion.png'});expect(errors).toEqual([]);
  }finally{await guestContext.close();await leadContext.close();}
});
