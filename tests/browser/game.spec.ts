import { test, expect } from '@playwright/test';
test('hangar, offline world, movement, combat and live graphics settings',async({page})=>{
  const failures:string[]=[];
  page.on('pageerror',error=>failures.push(error.message));
  page.on('response',response=>{if(response.status()>=400&&response.url().includes('/assets/'))failures.push(`${response.status()} ${response.url()}`);});
  await page.goto('/?debug=1');await expect(page.getByRole('button',{name:'DEPLOY SOLO',exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/hangar.png'});
  await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
  await expect(page.locator('canvas')).toBeVisible();await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
  await expect(page.locator('.debug-overlay')).toContainText('tick',{timeout:30000});
  await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.performance().fps??0),{timeout:40000}).toBeGreaterThan(10);
  await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});await page.waitForTimeout(2500);await page.screenshot({path:'test-results/battlefield.png'});
  const before=await page.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.find(a=>!a.bot)?.position.z??0);
  await page.keyboard.down('KeyW');await page.waitForTimeout(2000);await page.keyboard.up('KeyW');
  await page.keyboard.press('Space');await page.keyboard.press('ShiftLeft');await page.keyboard.press('KeyQ');await page.waitForTimeout(700);
  const after=await page.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.find(a=>!a.bot)?.position.z??0);expect(after).toBeLessThan(before-3);
  await page.screenshot({path:'test-results/movement.png'});
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'RESUME EXPEDITION'})).toBeVisible();
  await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByLabel('Graphics quality').selectOption('high');await page.getByRole('button',{name:'RETURN TO MECH'}).click();await page.getByRole('button',{name:'RESUME EXPEDITION'}).click();
  await page.waitForTimeout(2500);await expect(page.locator('.debug-overlay')).toContainText('25 chunks');
  await page.screenshot({path:'test-results/high-quality.png'});
  expect(failures).toEqual([]);
  await expect(page.locator('.fatal-error')).toHaveCount(0);
});
test('responsive hangar and mobile scene',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/?debug=1');
  await expect(page.getByRole('button',{name:'DEPLOY SOLO',exact:true})).toBeVisible();await page.screenshot({path:'test-results/mobile-hangar.png',fullPage:true});
  await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();await expect(page.locator('canvas')).toBeVisible();await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.performance().fps??0),{timeout:40000}).toBeGreaterThan(10);await page.waitForTimeout(1500);await page.screenshot({path:'test-results/mobile-game.png'});
});
test('browser-hosted invite links join a second pilot and share the authoritative world',async({browser})=>{
  test.setTimeout(120000);
  const hostContext=await browser.newContext(),guestContext=await browser.newContext();
  const host=await hostContext.newPage(),guest=await guestContext.newPage();
  const errors:string[]=[];host.on('pageerror',e=>errors.push(e.message));guest.on('pageerror',e=>errors.push(e.message));
  await host.goto((process.env.GAME_URL??'http://localhost:5173')+'/?debug=1');await host.getByLabel('Pilot callsign').fill('HostCat');await host.getByRole('button',{name:'PVP',exact:true}).click();await host.locator('summary').click();await host.getByRole('button',{name:'Host browser invite',exact:true}).click();
  await expect(host.locator('.network-status')).toContainText('Squad host',{timeout:40000});
  await expect.poll(()=>host.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.some(a=>!a.bot)),{timeout:40000}).toBe(true);
  await host.keyboard.down('Tab');const invite=await host.getByLabel('Squad invite').inputValue();await host.keyboard.up('Tab');
  const guestInvite=new URL(invite);guestInvite.searchParams.set('debug','1');
  await guest.goto(guestInvite.toString());await guest.getByLabel('Pilot callsign').fill('GuestCat');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
  await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:60000});
  await expect(host.locator('.network-status')).toContainText('2 PILOTS',{timeout:20000});
  const hostCount=await host.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.filter(a=>!a.bot).length);expect(hostCount).toBe(2);
  const guestCount=await guest.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.filter(a=>!a.bot).length);expect(guestCount).toBe(2);
  await expect(guest.locator('.mission-status')).toContainText('First to 10');
  await guest.keyboard.down('KeyW');await guest.waitForTimeout(1500);await guest.keyboard.up('KeyW');await guest.waitForTimeout(600);
  const positions=await host.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.map(a=>({name:a.name,x:a.position.x,z:a.position.z,hp:a.hp})));
  const h=positions.find(a=>a.name==='HostCat')!,g=positions.find(a=>a.name==='GuestCat')!;expect(g.z).toBeLessThan(h.z-5);
  // Aim using normal pointer-lock mouse input, then verify actual networked damage.
  const yaw=Math.atan2(-(g.x-h.x),-(g.z-h.z));
  await host.mouse.move(720,450);await host.mouse.click(720,450);await host.waitForTimeout(300);
  await host.mouse.move(720-yaw/.0021,450);await host.mouse.down();
  await expect.poll(()=>host.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name==='HostCat')!.kills),{timeout:15000}).toBeGreaterThan(0);
  await host.mouse.up();await guest.screenshot({path:'test-results/multiplayer-guest.png'});expect(errors).toEqual([]);
  await guest.keyboard.press('Escape');await guest.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();await guest.waitForTimeout(500);
  await expect(guest.locator('.error-dialog')).toHaveCount(0);
  await guestContext.close();await hostContext.close();
});
test('Bastion deploys into Ember and Frostline and releases scene resources between expeditions',async({page})=>{
  const failures:string[]=[];page.on('pageerror',e=>failures.push(e.message));await page.goto('/?debug=1');
  await page.getByRole('button',{name:'Bastion',exact:false}).click();
  const counts:number[]=[];
  for(const seed of [1926,4107,1926]){
    await page.getByLabel('Select theater').selectOption(String(seed));await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.snapshot()?.seed),{timeout:40000}).toBe(seed);
    await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});await page.waitForTimeout(1800);
    const data=await page.evaluate(()=>({perf:window.kittyMechDebug!.performance(),actor:window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!}));
    expect(data.actor.chassis).toBe('bastion');expect(data.actor.maxHp).toBe(340);expect(data.perf.calls).toBeGreaterThan(100);counts.push(data.perf.geometries);
    await page.screenshot({path:`test-results/map-${seed}.png`});await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();
  }
  expect(counts[2]).toBeLessThanOrEqual(counts[0]+15);expect(failures).toEqual([]);
});
test('dedicated co-op arena joins a second pilot using its room link',async({browser})=>{
  const a=await browser.newContext(),b=await browser.newContext(),host=await a.newPage(),guest=await b.newPage();
  const origin=process.env.GAME_URL??'http://localhost:5173';
  try{
    await host.goto(origin+'/?debug=1');await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();
    await expect(host.locator('.network-status')).toContainText('Connected',{timeout:40000});
    await expect.poll(()=>host.evaluate(()=>window.kittyMechDebug?.snapshot()?.mode),{timeout:40000}).toBe('coop');
    await host.keyboard.down('Tab');const invite=await host.getByLabel('Squad invite').inputValue();await host.keyboard.up('Tab');
    await guest.goto(invite);await guest.getByLabel('Pilot callsign').fill('LANCat');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
    await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:40000});
    await expect.poll(()=>host.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.some(a=>a.name==='LANCat')),{timeout:20000}).toBe(true);
  }finally{await b.close();await a.close();}
});
