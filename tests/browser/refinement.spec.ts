import { test, expect } from '@playwright/test';
import { CHASSIS, MECHS } from '../../shared/config';
import { MAPS } from '../../shared/maps';

test('all four chassis deploy, move and use their ability across all three handcrafted theaters',async({page})=>{
  test.setTimeout(240000);
  const failures:string[]=[],models=new Set<string>(),revisedModels=new Set<string>();
  page.on('pageerror',error=>failures.push(error.message));
  page.on('response',response=>{
    if(response.status()>=400&&response.url().includes('/assets/'))failures.push(`${response.status()} ${response.url()}`);
    const url=new URL(response.url()),path=url.pathname;
    if(path.endsWith('.glb')&&response.ok()){
      const name=path.split('/').pop()!;models.add(name);
      const expectedRevision=name==='Pounce_Quadruped.glb'?'feline-pounce-art-12':name==='Bastion_Quadruped.glb'?'feline-bastion-art-14':name==='Lynx_Quadruped.glb'?'feline-lynx-art-15':name==='Caracal_Quadruped.glb'?'feline-caracal-art-15':'feline-upright-11';
      if(url.searchParams.get('rev')===expectedRevision)revisedModels.add(name);
    }
  });
  await page.goto('/?debug=1');
  for(const chassis of CHASSIS)for(const map of MAPS){
    await page.getByRole('button',{name:`Select ${MECHS[chassis].name}`,exact:true}).click();
    await expect(page.locator('.chassis-brief')).toContainText(MECHS[chassis].abilityName.toUpperCase());
    await page.getByLabel('Select theater').selectOption(String(map.seed));
    await expect(page.locator('.theater-preview img')).toHaveAttribute('src',map.preview);
    await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
    await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.find(a=>!a.bot)?.grounded),{timeout:20000}).toBe(true);
    const before=await page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!);
    expect(before.chassis).toBe(chassis);expect(before.maxHp).toBe(MECHS[chassis].health);
    expect(Math.abs(before.position.x-map.spawn.x)).toBeLessThan(.3);expect(Math.abs(before.position.z-map.spawn.z)).toBeLessThan(.3);
    await page.keyboard.down('KeyW');await page.waitForTimeout(900);await page.keyboard.up('KeyW');
    const moved=await page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!);
    expect(moved.position.z).toBeLessThan(before.position.z-2);expect(Number.isFinite(moved.position.y)).toBe(true);
    await page.keyboard.press('ShiftLeft');
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.abilityReadyAt)).toBeGreaterThan(0);
    await expect(page.locator('.ability-line')).toContainText(MECHS[chassis].abilityName.toUpperCase());
    if(chassis==='caracal'&&map.seed===4107){
      await page.keyboard.press('KeyM');await expect(page.getByLabel('Mission route map')).toBeVisible();await page.keyboard.press('KeyM');
    }
    await page.waitForTimeout(550);await page.screenshot({path:`test-results/refinement-${chassis}-${map.seed}.png`});
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();
    await expect(page.getByRole('button',{name:'DEPLOY SOLO',exact:true})).toBeVisible();
  }
  for(const chassis of CHASSIS){expect(models.has(`${MECHS[chassis].model}.glb`)).toBe(true);expect(revisedModels.has(`${MECHS[chassis].model}.glb`)).toBe(true);}
  expect(failures).toEqual([]);
});

test('mixed new chassis share map, movement and medic ability through multiplayer',async({browser},testInfo)=>{
  const hostContext=await browser.newContext(),guestContext=await browser.newContext();
  const host=await hostContext.newPage(),guest=await guestContext.newPage(),errors:string[]=[];
  host.on('pageerror',e=>errors.push(e.message));guest.on('pageerror',e=>errors.push(e.message));
  const origin=process.env.GAME_URL??'http://localhost:5173';
  try{
    await host.goto(origin+'/?debug=1');await host.getByRole('button',{name:'Select Caracal',exact:true}).click();await host.getByLabel('Select theater').selectOption('4107');
    await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();
    await expect(host.locator('.network-status')).toContainText('Connected',{timeout:40000});
    await host.keyboard.down('Tab');const invite=await host.getByLabel('Squad invite').inputValue();await host.keyboard.up('Tab');
    const link=new URL(invite);link.searchParams.set('debug','1');
    await guest.goto(link.toString());await guest.getByLabel('Pilot callsign').fill('ReconCat');await guest.getByRole('button',{name:'Select Lynx',exact:true}).click();await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
    await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:40000});
    const initial=await guest.evaluate(()=>window.kittyMechDebug!.snapshot()!);
    expect(initial.seed).toBe(4107);expect(initial.actors.filter(a=>!a.bot).map(a=>a.chassis).sort()).toEqual(['caracal','lynx']);
    const before=initial.actors.find(a=>a.name==='ReconCat')!.position.z;
    await guest.keyboard.down('KeyW');await guest.waitForTimeout(1000);await guest.keyboard.up('KeyW');await guest.keyboard.press('ShiftLeft');await guest.waitForTimeout(700);
    await expect.poll(()=>host.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name==='ReconCat')!.position.z)).toBeLessThan(before-4);
    // Short action taps need a mounted, foregrounded controlling page, just as
    // ordinary play does. The observer page must not own the host's input focus.
    await host.bringToFront();await expect.poll(()=>host.evaluate(()=>document.hasFocus())).toBe(true);
    await expect(host.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
    const abilityState=()=>host.evaluate(async()=>{
      const snapshot=window.kittyMechDebug!.snapshot()!,actor=snapshot.actors.find(a=>!a.bot&&a.chassis==='caracal')!;
      const contact=(await window.kittyMechDebug!.contact()).find(c=>c.id===actor.id);
      return {focused:document.hasFocus(),snapshotTime:snapshot.time,actor,contact};
    });
    await expect.poll(async()=>{const state=await abilityState();return state.focused&&state.actor.hp>0&&state.actor.grounded&&state.actor.energy>=40&&!!state.contact?.paws.some(p=>p.valid);}).toBe(true);
    const beforeAbility=await abilityState();
    await testInfo.attach('medic-input-precondition',{body:JSON.stringify(beforeAbility),contentType:'application/json'});
    await host.keyboard.press('ShiftLeft');
    await expect.poll(()=>guest.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.chassis==='caracal')!.abilityReadyAt)).toBeGreaterThan(0);
    const accepted=await guest.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot&&a.chassis==='caracal')!);
    expect(accepted.abilityReadyAt).toBeGreaterThan(beforeAbility.actor.abilityReadyAt);expect(accepted.abilityAt).toBeGreaterThanOrEqual(beforeAbility.snapshotTime);
    await testInfo.attach('medic-replicated-activation',{body:JSON.stringify(accepted),contentType:'application/json'});
    await guest.screenshot({path:'test-results/refinement-squad.png'});expect(errors).toEqual([]);
  }finally{await guestContext.close();await hostContext.close();}
});

test('touch pilots get chassis-specific ability labels and reliable brief action taps',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage();
  try{
    await page.goto((process.env.GAME_URL??'http://localhost:5173')+'/?debug=1');
    await page.getByRole('button',{name:'Select Caracal',exact:true}).tap();await page.getByLabel('Select theater').selectOption('4107');
    await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).tap();
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.find(a=>!a.bot)?.grounded),{timeout:30000}).toBe(true);
    await page.getByRole('button',{name:'Repair bloom',exact:true}).tap();
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.abilityReadyAt)).toBeGreaterThan(0);
    await page.getByRole('button',{name:'MISSILE',exact:true}).tap();
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.rocketReadyAt)).toBeGreaterThan(0);
    await page.getByRole('button',{name:'JUMP',exact:true}).tap();
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.grounded)).toBe(false);
    await page.screenshot({path:'test-results/refinement-touch.png'});await expect(page.locator('.fatal-error')).toHaveCount(0);
  }finally{await context.close();}
});
