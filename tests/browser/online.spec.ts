import {test,expect} from '@playwright/test';
test('public server link hosts and joins a co-op room through secure WebSockets',async({browser})=>{
  test.skip(!process.env.ONLINE_URL,'Requires the temporary public prototype URL');test.setTimeout(120000);
  const a=await browser.newContext(),b=await browser.newContext(),host=await a.newPage(),guest=await b.newPage(),errors:string[]=[];
  host.on('pageerror',e=>errors.push(e.message));guest.on('pageerror',e=>errors.push(e.message));
  try{
    await host.goto(process.env.ONLINE_URL+'/?debug=1');await expect(host.locator('meta[name="kittymech-arena"]')).toHaveCount(1);
    await host.getByRole('button',{name:'Select Bastion',exact:true}).click();
    await host.getByRole('button',{name:'HOST SQUAD',exact:false}).click();await expect(host.locator('.network-status')).toContainText('Connected',{timeout:40000});
    await host.keyboard.down('Tab');const invite=await host.getByLabel('Squad invite').inputValue();await host.keyboard.up('Tab');
    expect(new URL(invite).hostname).toBe(new URL(process.env.ONLINE_URL!).hostname);
    const url=new URL(invite);url.searchParams.set('debug','1');await guest.goto(url.toString());await guest.getByLabel('Pilot callsign').fill('InternetCat');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
    await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:60000});await expect.poll(()=>guest.evaluate(()=>window.kittyMechDebug?.snapshot()?.mode),{timeout:30000}).toBe('coop');
    await expect(guest.locator('canvas')).toBeVisible();await expect(guest.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});await expect.poll(()=>guest.evaluate(()=>window.kittyMechDebug?.performance().fps??0),{timeout:40000}).toBeGreaterThan(10);
    await expect.poll(()=>host.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.find(a=>a.chassis==='bastion')?.grounded),{timeout:20000}).toBe(true);
    await host.keyboard.press('KeyR');
    await expect.poll(()=>guest.evaluate(()=>{const s=window.kittyMechDebug!.snapshot()!,a=s.actors.find(a=>a.chassis==='bastion')!;return a.stance==='upright'&&s.time-a.stanceChangedAt>.7;}),{timeout:15000}).toBe(true);
    await host.keyboard.press('ShiftLeft');
    await expect.poll(()=>guest.evaluate(()=>window.kittyMechDebug!.snapshot()!.fields.some(f=>f.kind==='shield'&&f.radius===8))).toBe(true);
    await guest.keyboard.down('KeyW');
    try{await expect.poll(()=>host.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.find(a=>a.name==='InternetCat')?.position.z??22),{timeout:20000}).toBeLessThan(18);}finally{await guest.keyboard.up('KeyW');}
    await expect(guest.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});await guest.screenshot({path:'test-results/public-server-guest.png'});expect(errors).toEqual([]);
  }finally{await b.close();await a.close();}
});
