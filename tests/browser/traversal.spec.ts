import {test,expect,type Page} from '@playwright/test';
import {ACTOR_RADII,CHASSIS,MECHS} from '../../shared/config';
import {climbAnchors} from '../../shared/traversal';
import type {Chassis} from '../../shared/types';
const position=(page:Page)=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.position);
async function travel(page:Page,key:string,axis:'x'|'z',goal:number){
  const from=(await position(page))[axis],positive=goal>from;await page.keyboard.down(key);
  try{await expect.poll(async()=>{const p=(await position(page))[axis];return positive?p>=goal:p<=goal;},{timeout:25000,intervals:[50]}).toBe(true);}finally{await page.keyboard.up(key);}
}
async function westFacing(page:Page){
  await page.mouse.move(720,450);await page.mouse.click(720,450);await page.waitForTimeout(150);await page.mouse.move(720-Math.PI/2/.0021,450);
}
async function approach(page:Page,seed:number,chassis:Chassis){
  await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.find(a=>!a.bot)?.grounded),{timeout:30000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.performance().fps??0),{timeout:40000}).toBeGreaterThan(10);
  const anchor=climbAnchors(seed)[0],x=anchor.position.x+ACTOR_RADII[chassis]+.55;
  if(seed===7734){await travel(page,'KeyS','z',anchor.position.z);await travel(page,'KeyA','x',x);}
  else{await travel(page,'KeyS','z',seed===1926?66:42);await travel(page,'KeyD','x',x);await travel(page,'KeyW','z',anchor.position.z);}
  // Brake and align through real key taps. Controller deceleration can carry a
  // full-speed approach past the narrower scaled facade's allowed grip span.
  await page.waitForTimeout(250);
  for(let i=0;i<10;i++){const dz=anchor.position.z-(await position(page)).z;if(Math.abs(dz)<.35)break;await page.keyboard.press(dz>0?'KeyS':'KeyW',{delay:55});await page.waitForTimeout(180);}
  expect(Math.abs((await position(page)).z-anchor.position.z)).toBeLessThan(.5);
  await westFacing(page);
}
test('all four feline chassis grip, climb, mantle and move across a supported roof',async({page})=>{
  test.setTimeout(240000);const failures:string[]=[];page.on('pageerror',e=>failures.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/THREE|Shader|WebGL|GL_INVALID/i.test(m.text()))failures.push(m.text());});
  await page.goto('/?debug=1');
  for(const chassis of CHASSIS){
    await page.getByRole('button',{name:`Select ${MECHS[chassis].name}`,exact:true}).click();await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
    await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.find(a=>!a.bot)?.grounded),{timeout:20000}).toBe(true);
    await approach(page,7734,chassis);await expect(page.locator('.climb-prompt')).toContainText('FACE WALL · CLAW GRIP');
    await page.keyboard.down('KeyC');await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.climb?.phase)).toBe('cling');
    await page.screenshot({path:`test-results/traversal-grip-${chassis}.png`});await page.keyboard.down('KeyW');
    await expect.poll(()=>page.evaluate(()=>{const a=window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!;return a.position.y>12&&!a.climb;}),{timeout:16000,intervals:[50]}).toBe(true);
    await page.keyboard.up('KeyW');await page.keyboard.up('KeyC');await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.grounded)).toBe(true);
    const roof=await position(page);await page.keyboard.down('KeyW');await page.waitForTimeout(700);await page.keyboard.up('KeyW');
    const walked=await position(page);expect(walked.y).toBeGreaterThan(12);expect(walked.x).toBeLessThan(roof.x-1);
    expect(await page.evaluate(()=>window.kittyMechDebug!.camera().violations)).toBe(0);
    await page.screenshot({path:`test-results/traversal-roof-${chassis}.png`});await page.keyboard.press('Space');
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.grounded)).toBe(false);
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.grounded),{timeout:8000}).toBe(true);
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();
  }
  expect(failures).toEqual([]);
});
test('Ember and Frostline service facades use their authored roof elevations',async({page})=>{
  test.setTimeout(120000);await page.goto('/?debug=1');
  for(const seed of [1926,4107]){
    await page.getByLabel('Select theater').selectOption(String(seed));await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
    await approach(page,seed,'pounce');await page.keyboard.down('KeyC');await page.keyboard.down('KeyW');
    const top=climbAnchors(seed)[0].landing.y;
    await expect.poll(()=>page.evaluate(top=>{const a=window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!;return a.position.y>top+.9&&!a.climb;},top),{timeout:16000,intervals:[50]}).toBe(true);
    await page.keyboard.up('KeyW');await page.keyboard.up('KeyC');expect(await page.evaluate(()=>window.kittyMechDebug!.camera().violations)).toBe(0);
    await page.screenshot({path:`test-results/traversal-roof-${seed}.png`});await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();
  }
});
test('ordinary pulse fire destroys arena cover, opens its passage and persists for a late joiner',async({page,browser})=>{
  test.setTimeout(120000);
  await page.goto('/?debug=1');await page.getByRole('button',{name:'PVP',exact:true}).click();await page.locator('summary').click();await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
  await expect(page.locator('.network-status')).toContainText('Connected',{timeout:40000});
  await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.find(a=>!a.bot)?.grounded),{timeout:30000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.performance().fps??0),{timeout:40000}).toBeGreaterThan(10);
  await travel(page,'KeyW','z',-18);await travel(page,'KeyA','x',-52);await travel(page,'KeyS','z',-7);await westFacing(page);
  await page.mouse.down();try{await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.cover.find(c=>c.id==='7734:wall:-59:-7')!.hp),{timeout:12000}).toBe(0);}finally{await page.mouse.up();}
  await page.screenshot({path:'test-results/traversal-destroyed-cover.png'});await page.keyboard.down('KeyW');await page.waitForTimeout(1700);await page.keyboard.up('KeyW');
  expect((await position(page)).x).toBeLessThan(-60);expect(await page.evaluate(()=>window.kittyMechDebug!.camera().violations)).toBe(0);
  await page.keyboard.down('Tab');const invite=new URL(await page.getByLabel('Squad invite').inputValue());await page.keyboard.up('Tab');invite.searchParams.set('debug','1');
  const context=await browser.newContext(),guest=await context.newPage();
  try{await guest.goto(invite.toString());await guest.getByLabel('Pilot callsign').fill('LateCover');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
    await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:40000});await expect.poll(()=>guest.evaluate(()=>window.kittyMechDebug?.snapshot()?.cover.find(c=>c.id==='7734:wall:-59:-7')?.hp)).toBe(0);
    await expect.poll(()=>guest.evaluate(()=>window.kittyMechDebug?.performance().fps??0),{timeout:40000}).toBeGreaterThan(10);
    const before=await guest.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name==='LateCover')!.position.z);await guest.keyboard.down('KeyW');await guest.waitForTimeout(700);await guest.keyboard.up('KeyW');
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name==='LateCover')!.position.z)).toBeLessThan(before-1);
    await guest.screenshot({path:'test-results/traversal-cover-late-join.png'});expect(await guest.evaluate(()=>window.kittyMechDebug!.camera().violations)).toBe(0);
  }finally{await context.close();}
});
