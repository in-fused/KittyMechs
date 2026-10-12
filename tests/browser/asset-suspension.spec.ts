import {test,expect} from '@playwright/test';

test('a cold late chassis load preserves browser-host authority, existing contacts and live controls',async({browser},testInfo)=>{
  test.setTimeout(150000);
  const a=await browser.newContext(),b=await browser.newContext(),host=await a.newPage(),guest=await b.newPage(),errors:string[]=[];
  host.on('pageerror',e=>errors.push(e.message));guest.on('pageerror',e=>errors.push(e.message));
  let release!:()=>void,seen!:()=>void,requests=0;
  const assetGate=new Promise<void>(resolve=>{release=resolve;}),requested=new Promise<void>(resolve=>{seen=resolve;});
  await host.route('**/Caracal_Quadruped.glb*',async route=>{requests++;seen();await assetGate;await route.continue();});
  const state=()=>host.evaluate(()=>{
    const snapshot=window.kittyMechDebug!.snapshot()!,actor=snapshot.actors.find(actor=>actor.name==='ColdHost')!;
    return {tick:snapshot.tick,time:snapshot.time,room:snapshot.room,actors:snapshot.actors.filter(actor=>!actor.bot).map(actor=>({id:actor.id,name:actor.name})),position:{...actor.position},hp:actor.hp,bodies:window.kittyMechDebug!.performance().bodies};
  });
  try{
    await host.goto((process.env.GAME_URL??'http://localhost:5173')+'/?debug=1');
    await host.getByLabel('Pilot callsign').fill('ColdHost');await host.getByRole('button',{name:'Select Bastion',exact:true}).click();await host.getByRole('button',{name:'PVP',exact:true}).click();
    await host.locator('summary').click();await host.getByRole('button',{name:'Host browser invite',exact:true}).click();
    await expect(host.locator('.network-status')).toContainText('Squad host',{timeout:40000});await expect(host.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
    await expect.poll(()=>host.evaluate(()=>window.kittyMechDebug?.snapshot()?.time??0),{timeout:40000}).toBeGreaterThan(5);
    await host.bringToFront();await expect.poll(()=>host.evaluate(()=>document.hasFocus())).toBe(true);
    await host.keyboard.down('KeyW');await host.waitForTimeout(650);await host.keyboard.up('KeyW');await host.waitForTimeout(250);
    const before=await state();
    await host.keyboard.down('Tab');const invite=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');invite.searchParams.set('debug','1');
    await guest.goto(invite.toString());await guest.getByLabel('Pilot callsign').fill('ColdGuest');await guest.getByRole('button',{name:'Select Caracal',exact:true}).click();await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
    await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:60000});
    await Promise.race([requested,host.waitForTimeout(15000).then(()=>{throw new Error('Cold Caracal request never reached the asset gate.');})]);
    await host.bringToFront();await expect.poll(()=>host.evaluate(()=>document.hasFocus())).toBe(true);
    const heldStart=await state(),hostId=before.actors.find(actor=>actor.name==='ColdHost')!.id,held:Awaited<ReturnType<typeof state>>[]=[];
    await host.keyboard.down('KeyW');
    try{for(let i=0;i<20;i++){await host.waitForTimeout(100);held.push(await state());}}finally{await host.keyboard.up('KeyW');}
    const contacts=await host.evaluate(async id=>(await window.kittyMechDebug!.contact()).find(row=>row.id===id),hostId),overlay=await host.locator('.loading-overlay').count();
    await testInfo.attach('cold-model-hold',{body:Buffer.from(JSON.stringify({before,heldStart,held,contacts,overlay,requests},null,2)),contentType:'application/json'});
    expect(requests).toBe(1);expect(held.at(-1)!.tick-heldStart.tick).toBeGreaterThan(60);
    expect(held.every(frame=>frame.tick>=before.tick&&frame.time>=before.time&&frame.room===before.room&&frame.actors.some(actor=>actor.id===hostId)&&frame.actors.some(actor=>actor.name==='ColdGuest'))).toBe(true);
    expect(Math.hypot(held.at(-1)!.position.x-heldStart.position.x,held.at(-1)!.position.z-heldStart.position.z)).toBeGreaterThan(1);
    expect(contacts?.paws.length).toBe(4);expect(overlay).toBe(0);
    release();await expect.poll(()=>host.evaluate(async()=>(await window.kittyMechDebug!.contact()).length),{timeout:30000}).toBe(2);
    const after=await state();await testInfo.attach('cold-model-revealed',{body:Buffer.from(JSON.stringify(after,null,2)),contentType:'application/json'});
    expect(after.tick).toBeGreaterThan(held.at(-1)!.tick);expect(after.time).toBeGreaterThan(held.at(-1)!.time);expect(after.room).toBe(before.room);expect(after.actors.map(actor=>actor.name).sort()).toEqual(['ColdGuest','ColdHost']);
    await host.screenshot({path:'test-results/cold-model-peer-revealed.png'});expect(errors).toEqual([]);
  }finally{release();await host.unrouteAll({behavior:'wait'});await b.close();await a.close();}
});
