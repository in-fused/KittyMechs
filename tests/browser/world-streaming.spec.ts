import {test,expect,type Page} from '@playwright/test';

const origin=()=>process.env.GAME_URL??'http://localhost:5173';
async function stream(page:Page){return page.evaluate(()=>window.kittyMechDebug!.streaming());}
async function moveAcross(page:Page,key:string,target:number,positive:boolean){
  await page.bringToFront();await expect.poll(()=>page.evaluate(()=>document.hasFocus())).toBe(true);
  await page.keyboard.down(key);
  try{await expect.poll(()=>page.evaluate(({target,positive})=>{
    const x=window.kittyMechDebug!.snapshot()!.actors.find(actor=>actor.name==='StreamGuest')!.position.x;
    return positive?x>=target:x<=target;
  },{target,positive}),{timeout:15000,intervals:[50]}).toBe(true);}finally{await page.keyboard.up(key);}
  await expect.poll(()=>page.evaluate(()=>{
    const actor=window.kittyMechDebug!.snapshot()!.actors.find(actor=>actor.name==='StreamGuest')!;
    return Math.hypot(actor.velocity.x,actor.velocity.z)<.05&&actor.grounded;
  })).toBe(true);
}
async function quality(page:Page,value:'low'|'high'){
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'SETTINGS',exact:true}).click();
  await page.getByLabel('Graphics quality').selectOption(value);
  await page.getByRole('button',{name:'Close settings',exact:true}).click();
  await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();
}

test('a rendered arena guest keeps overlap collision handles across seams and graphics changes',async({browser},testInfo)=>{
  test.setTimeout(150000);
  const a=await browser.newContext(),b=await browser.newContext(),host=await a.newPage(),guest=await b.newPage(),errors:string[]=[];
  for(const page of [host,guest])page.on('pageerror',error=>errors.push(error.message));
  try{
    await host.goto(origin()+'/?debug=1');await host.getByLabel('Pilot callsign').fill('StreamHost');
    await host.getByRole('button',{name:'Select Bastion',exact:true}).click();await host.getByRole('button',{name:'PVP',exact:true}).click();
    await host.getByRole('button',{name:'HOST SQUAD',exact:false}).click();await expect(host.locator('.network-status')).toContainText('Connected',{timeout:40000});
    await host.keyboard.down('Tab');const invite=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');invite.searchParams.set('debug','1');
    await guest.goto(invite.toString());await guest.getByLabel('Pilot callsign').fill('StreamGuest');await guest.getByRole('button',{name:'Select Bastion',exact:true}).click();
    await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:40000});
    await expect(guest.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
    await expect.poll(async()=>{const data=await stream(guest);return data.world?.center==='-1,0'&&data.world.guest.tiles.length===9&&data.world.visibleKeys.every(key=>data.world!.readyKeys.includes(key));},{timeout:30000}).toBe(true);
    const before=(await stream(guest)).world!;
    await moveAcross(guest,'KeyD',5,true);await expect.poll(async()=>(await stream(guest)).world?.center).toBe('0,0');
    const crossed=(await stream(guest)).world!;
    const retained=before.guest.tiles.filter(tile=>crossed.guest.tiles.some(next=>next.key===tile.key));
    expect(retained).toHaveLength(6);
    for(const tile of retained)expect(crossed.guest.tiles.find(next=>next.key===tile.key)!.terrainHandle).toBe(tile.terrainHandle);
    expect(crossed.guest.created-before.guest.created).toBe(3);expect(crossed.guest.retired-before.guest.retired).toBe(3);expect(crossed.guest.tiles).toHaveLength(9);expect(crossed.guest.peakTiles).toBeLessThanOrEqual(12);
    await moveAcross(guest,'KeyA',-5,false);await expect.poll(async()=>(await stream(guest)).world?.center).toBe('-1,0');
    const returned=(await stream(guest)).world!;
    for(const tile of retained)expect(returned.guest.tiles.find(next=>next.key===tile.key)!.terrainHandle).toBe(tile.terrainHandle);
    expect(returned.guest.created-before.guest.created).toBe(6);expect(returned.guest.retired-before.guest.retired).toBe(6);
    const qualityRows=[];
    for(const value of ['low','high'] as const){
      await quality(guest,value);await expect.poll(async()=>{const data=await stream(guest);return data.world?.visibleKeys.every(key=>data.world!.readyKeys.includes(key));},{timeout:30000}).toBe(true);
      const data=await stream(guest);qualityRows.push({quality:value,...data});expect(data.world!.guest.tiles).toEqual(returned.guest.tiles);
      expect(data.cache.active).toBeLessThanOrEqual(1);expect(data.cache.queued).toBeLessThanOrEqual(64);expect(data.cache.completed).toBeLessThanOrEqual(96);
    }
    await guest.screenshot({path:'test-results/world-streaming-guest-high.png'});
    await testInfo.attach('collision-seam-retention',{body:JSON.stringify({before,crossed,returned,qualityRows}),contentType:'application/json'});
    expect(await guest.evaluate(()=>window.kittyMechDebug!.camera().violations)).toBe(0);
    await guest.keyboard.press('Escape');await guest.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();
    await expect(guest.locator('.hangar')).toBeVisible();expect((await stream(guest)).world).toBeNull();
    await expect.poll(async()=>{const data=await stream(guest);return data.cache.active+data.cache.queued+data.cache.owners;}).toBe(0);expect(errors).toEqual([]);
  }finally{await b.close();await a.close();}
});

test('terrain detail appears and scene leases retire when the terrain worker cannot start',async({browser},testInfo)=>{
  test.setTimeout(120000);
  const context=await browser.newContext(),page=await context.newPage(),errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.addInitScript(()=>{
    const NativeWorker=window.Worker;
    window.Worker=new Proxy(NativeWorker,{construct(target,args,newTarget){
      if(String(args[0]).includes('terrain.worker'))throw new Error('QA: terrain Worker startup unavailable');
      return Reflect.construct(target,args,newTarget);
    }});
  });
  const rows=[];
  try{
    await page.goto(origin()+'/?debug=1');await page.getByRole('button',{name:'Select Pounce',exact:true}).click();
    for(const seed of [7734,1926,4107]){
      await page.getByLabel('Select theater').selectOption(String(seed));await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
      await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
      await expect.poll(async()=>{const data=await stream(page);return data.world?.seed===seed&&data.world.visibleKeys.length>=9&&data.world.visibleKeys.every(key=>data.world!.readyKeys.includes(key));},{timeout:30000}).toBe(true);
      const data=await stream(page);rows.push(data);expect(data.cache.failures).toBeGreaterThanOrEqual(1);expect(data.cache.active).toBe(0);expect(data.cache.queued).toBeLessThanOrEqual(64);expect(data.cache.completed).toBeLessThanOrEqual(96);
      expect(data.world!.authority).toBe(true);expect(data.world!.guest.tiles).toEqual([]);
      await page.screenshot({path:`test-results/world-streaming-worker-fallback-${seed}.png`});
      await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();
      await expect(page.locator('.hangar')).toBeVisible();await expect.poll(async()=>(await stream(page)).world).toBeNull();
      await expect.poll(async()=>{const data=await stream(page);return data.cache.active+data.cache.queued+data.cache.owners;}).toBe(0);
    }
    await testInfo.attach('worker-startup-fallback',{body:JSON.stringify({fault:'Terrain Worker constructor only',rows}),contentType:'application/json'});expect(errors).toEqual([]);
  }finally{await context.close();}
});

test('a terrain worker execution error is handled and visible detail recovers',async({browser},testInfo)=>{
  const context=await browser.newContext(),page=await context.newPage(),errors:string[]=[];let faults=0;
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/terrain.worker-*.js*',async route=>{faults++;await route.fulfill({contentType:'text/javascript',body:"throw new Error('QA: terrain worker execution failed');"});});
  try{
    await page.goto(origin()+'/?debug=1');await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
    await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
    await expect.poll(async()=>{const data=await stream(page);return data.world?.visibleKeys.length===9&&data.world.visibleKeys.every(key=>data.world!.readyKeys.includes(key));},{timeout:30000}).toBe(true);
    const data=await stream(page);expect(faults).toBe(1);expect(data.cache.failures).toBe(1);expect(data.cache.fallback).toBe(true);expect(data.cache.active).toBe(0);
    await page.screenshot({path:'test-results/world-streaming-worker-execution-recovery.png'});
    await testInfo.attach('worker-execution-recovery',{body:JSON.stringify({faults,...data}),contentType:'application/json'});
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();await expect(page.locator('.hangar')).toBeVisible();
    await expect.poll(async()=>{const after=await stream(page);return after.cache.active+after.cache.queued+after.cache.owners;}).toBe(0);expect((await stream(page)).world).toBeNull();expect(errors).toEqual([]);
  }finally{await context.close();}
});
