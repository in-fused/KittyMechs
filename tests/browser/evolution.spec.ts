import { test, expect } from '@playwright/test';
import { CHASSIS, MECHS, UPRIGHT } from '../../shared/config';

test('four feline forms transform, use alternate areas, move, jump and return to four paws',async({page})=>{
  test.setTimeout(180000);
  const failures:string[]=[];
  page.on('pageerror',e=>failures.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/THREE|Shader|WebGL|GL_INVALID/i.test(m.text()))failures.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))failures.push(`${r.status()} ${r.url()}`);});
  await page.goto('/?debug=1');
  for(const chassis of CHASSIS){
    await page.getByRole('button',{name:`Select ${MECHS[chassis].name}`,exact:true}).click();
    await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
    await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.find(a=>!a.bot)?.grounded),{timeout:20000}).toBe(true);
    await page.keyboard.press('KeyR');
    await expect.poll(()=>page.evaluate(()=>{const s=window.kittyMechDebug!.snapshot()!,a=s.actors.find(a=>!a.bot)!;return a.stance==='upright'&&s.time-a.stanceChangedAt>.7;})).toBe(true);
    await expect(page.locator('.ability-line')).toContainText(UPRIGHT[chassis].name.toUpperCase());
    await page.keyboard.press('ShiftLeft');
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.abilityReadyAt)).toBeGreaterThan(0);
    const state=await page.evaluate(()=>window.kittyMechDebug!.snapshot()!);
    if(chassis==='pounce')expect(state.events.some(e=>e.type==='area'&&e.effect==='rake'&&e.radius===7)).toBe(true);
    else expect(state.fields.some(f=>f.kind===(chassis==='bastion'?'shield':chassis==='lynx'?'snare':'repair')&&f.radius===UPRIGHT[chassis].radius)).toBe(true);
    await page.waitForTimeout(200);await page.screenshot({path:`test-results/evolution-upright-${chassis}.png`});
    const before=state.actors.find(a=>!a.bot)!.position.z;
    await page.keyboard.down('KeyW');await page.waitForTimeout(1000);await page.keyboard.up('KeyW');
    expect(await page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.position.z)).toBeLessThan(before-1);
    await page.keyboard.press('Space');
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.grounded)).toBe(false);
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.grounded),{timeout:8000}).toBe(true);
    await page.keyboard.press('KeyR');
    await expect.poll(()=>page.evaluate(()=>{const s=window.kittyMechDebug!.snapshot()!,a=s.actors.find(a=>!a.bot)!;return a.stance==='quadruped'&&s.time-a.stanceChangedAt>.7;})).toBe(true);
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();
  }
  expect(failures).toEqual([]);
});

test('server squad replicates combat forms and the same defensive field',async({browser})=>{
  const a=await browser.newContext(),b=await browser.newContext(),host=await a.newPage(),guest=await b.newPage();
  const origin=process.env.GAME_URL??'http://localhost:5173';
  try{
    await host.goto(origin+'/?debug=1');await host.getByRole('button',{name:'Select Bastion',exact:true}).click();
    await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();
    await expect(host.locator('.network-status')).toContainText('Connected',{timeout:40000});
    await host.keyboard.down('Tab');const invite=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');invite.searchParams.set('debug','1');
    await guest.goto(invite.toString());await guest.getByLabel('Pilot callsign').fill('FormCat');await guest.getByRole('button',{name:'Select Lynx',exact:true}).click();await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
    await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:40000});
    await host.keyboard.press('KeyR');
    await expect.poll(()=>guest.evaluate(()=>{const s=window.kittyMechDebug!.snapshot()!,actor=s.actors.find(a=>a.chassis==='bastion')!;return actor.stance==='upright'&&s.time-actor.stanceChangedAt>.7;}),{timeout:15000}).toBe(true);
    await host.keyboard.press('ShiftLeft');
    await expect.poll(()=>guest.evaluate(()=>window.kittyMechDebug!.snapshot()!.fields.some(f=>f.kind==='shield'))).toBe(true);
    const field=await guest.evaluate(()=>window.kittyMechDebug!.snapshot()!.fields.find(f=>f.kind==='shield')!);
    await expect.poll(()=>host.evaluate(id=>window.kittyMechDebug!.snapshot()!.fields.find(f=>f.id===id),field.id)).toEqual(field);
    await guest.screenshot({path:'test-results/evolution-squad-field.png'});
    await guest.keyboard.press('KeyR');
    await expect.poll(()=>host.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name==='FormCat')!.stance)).toBe('upright');
  }finally{await b.close();await a.close();}
});

test('touch form controls expose the medic sanctuary without covering the main HUD',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage();
  try{
    await page.goto((process.env.GAME_URL??'http://localhost:5173')+'/?debug=1');await page.getByRole('button',{name:'Select Caracal',exact:true}).tap();
    await page.getByLabel('Select theater').selectOption('4107');await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).tap();
    await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.find(a=>!a.bot)?.grounded),{timeout:30000}).toBe(true);
    await page.getByRole('button',{name:'Transform to upright combat stance',exact:true}).tap();
    await expect.poll(()=>page.evaluate(()=>{const s=window.kittyMechDebug!.snapshot()!,a=s.actors.find(a=>!a.bot)!;return a.stance==='upright'&&s.time-a.stanceChangedAt>.7;})).toBe(true);
    await page.getByRole('button',{name:'Sanctuary field',exact:true}).tap();
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.fields.some(f=>f.kind==='repair'&&f.radius===8))).toBe(true);
    const layout=await page.evaluate(()=>({actions:document.querySelector('.touch-actions')!.getBoundingClientRect().toJSON(),hud:document.querySelector('.weapons-hud')!.getBoundingClientRect().toJSON()}));
    expect(layout.actions.bottom).toBeLessThan(layout.hud.top);await page.screenshot({path:'test-results/evolution-touch-sanctuary.png'});
    await page.getByRole('button',{name:'Return to quadruped stance',exact:true}).tap();
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.stance)).toBe('quadruped');
    await expect(page.locator('.fatal-error')).toHaveCount(0);
  }finally{await context.close();}
});
