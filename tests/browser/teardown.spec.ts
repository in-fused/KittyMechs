import {test,expect,type Page} from '@playwright/test';

async function returnToHangar(page:Page){
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();
  await expect(page.getByRole('button',{name:'DEPLOY SOLO',exact:true})).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(async()=>(await window.kittyMechDebug!.contact()).length)).toBe(0);
  expect(await page.evaluate(()=>window.kittyMechDebug!.snapshot())).toBeNull();
  // Let passive provider cleanup run before checking the exact lifecycle regression.
  await page.waitForTimeout(100);
}

test('server arenas release colliders and contacts before returning to the hangar',async({page})=>{
  test.setTimeout(180000);
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/?debug=1');
  for(const seed of [7734,1926,4107]){
    await page.getByLabel('Select theater').selectOption(String(seed));
    await page.getByRole('button',{name:'PVP',exact:true}).click();
    await page.locator('.server-options summary').click();
    await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
    await expect(page.locator('.network-status')).toContainText('Connected',{timeout:40000});
    await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
    await expect.poll(()=>page.evaluate(expectedSeed=>{
      const snapshot=window.kittyMechDebug?.snapshot();
      return snapshot?.seed===expectedSeed&&snapshot.mode==='pvp'&&snapshot.actors.some(actor=>!actor.bot&&actor.grounded);
    },seed),{timeout:40000}).toBe(true);
    await expect.poll(()=>page.evaluate(async()=>(await window.kittyMechDebug!.contact()).length),{timeout:10000}).toBeGreaterThan(0);
    await returnToHangar(page);
    expect(errors).toEqual([]);
  }
});

test('local authority releases physics through three theater redeployments',async({page})=>{
  test.setTimeout(180000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/?debug=1');
  for(const seed of [7734,1926,4107]){
    await page.getByLabel('Select theater').selectOption(String(seed));
    await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
    await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
    await expect.poll(()=>page.evaluate(expectedSeed=>{
      const snapshot=window.kittyMechDebug!.snapshot();
      return snapshot?.seed===expectedSeed&&snapshot.mode==='training'&&snapshot.actors.some(actor=>!actor.bot&&actor.grounded);
    },seed),{timeout:40000}).toBe(true);
    await expect.poll(()=>page.evaluate(async()=>(await window.kittyMechDebug!.contact()).length),{timeout:10000}).toBeGreaterThan(0);
    await returnToHangar(page);expect(errors).toEqual([]);
  }
});

test('a peer authority can return with a live guest and host a fresh arena',async({browser})=>{
  test.setTimeout(150000);
  const hostContext=await browser.newContext(),guestContext=await browser.newContext();
  const host=await hostContext.newPage(),guest=await guestContext.newPage(),errors:string[]=[];
  host.on('pageerror',error=>errors.push(error.message));guest.on('pageerror',error=>errors.push(error.message));
  try{
    const origin=process.env.GAME_URL??'http://localhost:5173';
    await host.goto(origin+'/?debug=1');await host.getByRole('button',{name:'PVP',exact:true}).click();
    await host.locator('.server-options summary').click();
    await host.getByRole('button',{name:'Host browser invite',exact:true}).click();
    await expect(host.locator('.network-status')).toContainText('Squad host',{timeout:40000});
    await expect.poll(()=>host.evaluate(()=>window.kittyMechDebug!.snapshot()?.actors.filter(actor=>!actor.bot).length),{timeout:40000}).toBe(1);
    await host.keyboard.down('Tab');const invite=await host.getByLabel('Squad invite').inputValue();await host.keyboard.up('Tab');
    await guest.goto(invite);await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
    await expect(host.locator('.network-status')).toContainText('2 PILOTS',{timeout:60000});
    await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:60000});
    await returnToHangar(host);
    await host.locator('.server-options summary').click();
    await host.getByRole('button',{name:'Host browser invite',exact:true}).click();
    await expect(host.locator('.network-status')).toContainText('Squad host',{timeout:40000});
    await expect.poll(()=>host.evaluate(()=>window.kittyMechDebug!.snapshot()?.actors.filter(actor=>!actor.bot).length),{timeout:30000}).toBe(1);
    await returnToHangar(host);expect(errors).toEqual([]);
  }finally{await guestContext.close();await hostContext.close();}
});
