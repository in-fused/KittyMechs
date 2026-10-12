import {test,expect,type Page} from '@playwright/test';
import {CHASSIS,MECHS,UPRIGHT} from '../../shared/config';
import type {Chassis} from '../../shared/types';

const origin=()=>process.env.GAME_URL??'http://localhost:5173';
const read=(page:Page)=>page.evaluate(async()=>({effects:await window.kittyMechDebug!.effects(),snapshot:window.kittyMechDebug!.snapshot(),performance:window.kittyMechDebug!.performance()}));
async function settings(page:Page,reduced:boolean){await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality').selectOption('medium');await page.getByLabel('Reduced flashes and camera shake').setChecked(reduced);await page.getByRole('button',{name:'Close settings',exact:true}).click();}
async function deploy(page:Page,chassis:Chassis,name:string,solo=false){
  await page.getByLabel('Pilot callsign').fill(name);await page.getByRole('button',{name:`Select ${MECHS[chassis].name}`,exact:true}).click();
  await page.getByRole('button',{name:'PVP',exact:true}).click();
  if(solo)await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();else{await page.locator('summary').click();await page.getByRole('button',{name:'Host browser invite',exact:true}).click();}
  await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
  await expect.poll(()=>page.evaluate(async name=>{const d=window.kittyMechDebug,s=d?.snapshot(),a=s?.actors.find(a=>a.name===name),i=await d?.input();return !!s&&s.tick>75&&!!a?.grounded&&!!i?.owner?.endsWith(':'+a.id);},name),{timeout:60000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.performance().fps),{timeout:40000}).toBeGreaterThan(10);
  await page.bringToFront();await expect.poll(()=>page.evaluate(()=>document.hasFocus())).toBe(true);
  await page.evaluate(()=>window.kittyMechDebug!.effects()); // Warm read-only diagnostics before timed observations.
}
async function upright(page:Page){await page.keyboard.press('KeyR');await expect.poll(()=>page.evaluate(()=>{const s=window.kittyMechDebug!.snapshot(),a=s?.actors.find(a=>!a.bot);return !!a&&a.stance==='upright'&&s!.time-a.stanceChangedAt>.75;})).toBe(true);}
async function leave(page:Page){await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();await expect(page.getByRole('button',{name:'DEPLOY SOLO',exact:true})).toBeVisible();await expect.poll(async()=>{const r=await read(page);return r.snapshot===null&&r.effects.draws.length===0&&r.effects.motes.length===0;}).toBe(true);}
for(const reduced of [false,true])test(`authored areas draw all four identities with ${reduced?'reduced':'ordinary'} flashes and retire on expiry/rehost`,async({page},info)=>{
  test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|Shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
  await page.goto(origin()+'/?debug=1');await settings(page,reduced);const records=[];
  for(const chassis of CHASSIS){
    await deploy(page,chassis,'Area-'+chassis);const empty=await read(page);expect(empty.effects.draws).toEqual([]);expect(empty.effects.motes).toEqual([]);
    await upright(page);const before=await read(page);await page.keyboard.press('ShiftLeft',{delay:40});
    await expect.poll(async()=>{const r=await read(page);return r.effects.draws.some(d=>d.kind===UPRIGHT[chassis].effect&&d.age>.08&&d.age<.45);},{timeout:12000,intervals:[20]}).toBe(true);
    const active=await read(page),d=active.effects.draws.find(d=>d.kind===UPRIGHT[chassis].effect)!;
    expect(d.radius).toBe(UPRIGHT[chassis].radius);expect(d.opacity).toBeGreaterThan(0);expect(d.triangles).toBeGreaterThan(0);expect(d.age).toBeGreaterThanOrEqual(0);
    const surface=active.effects.draws.find(row=>row.id===d.id&&row.role!=='dome')!;
    expect(surface.shaderRadius).toBe(d.radius);expect(surface.shaderCenter).toEqual({x:d.center.x,z:d.center.z});
    if(chassis==='pounce')expect(surface.front).toBeGreaterThan(0);
    const native=chassis==='pounce'?active.snapshot!.events.find(e=>e.id===d.id):active.snapshot!.fields.find(f=>f.id===d.id);expect(native).toBeDefined();expect(d.center).toEqual(native!.position);
    for(const p of active.effects.motes){const f=active.snapshot!.fields.find(f=>f.id===p.field)!;expect(f).toBeDefined();expect(Math.hypot(p.position.x-f.position.x,p.position.y-f.position.y,p.position.z-f.position.z)+p.scale).toBeLessThanOrEqual(f.radius+1e-6);}
    if(chassis==='bastion')expect(active.effects.draws.some(d=>d.role==='dome')).toBe(true);
    if(chassis==='lynx'||chassis==='caracal'){await expect.poll(async()=>(await read(page)).effects.motes.length,{intervals:[20]}).toBeGreaterThan(0);}
    await page.screenshot({path:info.outputPath(`${chassis}-${reduced?'reduced':'ordinary'}.png`)});
    const expiry=chassis==='pounce'?(native! as {at:number}).at+.7:(native! as {expires:number}).expires;
    await expect.poll(async()=>{const r=await read(page);return r.snapshot!.time>=expiry&&!r.effects.draws.some(row=>row.id===d.id)&&!r.effects.motes.some(row=>row.field===d.id);},{timeout:12000,intervals:[100]}).toBe(true);
    const ended=await read(page);records.push({chassis,reduced,empty,before,active,ended});expect(ended.snapshot!.actors.find(a=>!a.bot)!.hp).toBeGreaterThan(0);await leave(page);
  }
  expect(errors).toEqual([]);await info.attach('actual-area-draws',{body:JSON.stringify({records,errors,scope:'Ordinary controls and actual onBeforeRender hooks. PNG and diagnostic samples are nearby observations, not atomic GPU captures; fields/footprints are decorative projections, not exact LOS coverage.'}),contentType:'application/json'});
});

test('a Peer late join displays the same live shield and retires it at native expiry',async({browser},info)=>{
  test.setTimeout(120000);const a=await browser.newContext(),b=await browser.newContext(),host=await a.newPage(),guest=await b.newPage(),errors:string[]=[];
  for(const page of [host,guest]){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|Shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});}
  try{
    await host.goto(origin()+'/?debug=1');await deploy(host,'bastion','ShieldHost');await upright(host);
    await host.keyboard.down('Tab');const invite=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');invite.searchParams.set('debug','1');
    await guest.goto(invite.toString());await guest.getByLabel('Pilot callsign').fill('ShieldGuest');await guest.getByRole('button',{name:'Select Bastion',exact:true}).click();
    // Actual cold join starts after a live native4s field has been accepted.
    await host.bringToFront();await host.keyboard.press('ShiftLeft',{delay:40});await expect.poll(async()=>(await read(host)).effects.draws.some(d=>d.role==='dome')).toBe(true);
    await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:40000});
    await expect.poll(async()=>(await read(guest)).effects.draws.some(d=>d.role==='dome'),{timeout:12000,intervals:[20]}).toBe(true);
    const lead=await read(host),follow=await read(guest),field=follow.snapshot!.fields.find(f=>f.kind==='shield')!;expect(lead.snapshot!.fields.find(f=>f.id===field.id)).toEqual(field);
    expect(follow.effects.draws.find(d=>d.role==='dome')!.center).toEqual(field.position);await guest.screenshot({path:info.outputPath('peer-live-shield.png')});
    await expect.poll(async()=>{const r=await read(guest);return r.snapshot!.time>=field.expires&&!r.effects.draws.some(d=>d.id===field.id);},{timeout:12000}).toBe(true);
    expect(errors).toEqual([]);await info.attach('peer-live-field',{body:JSON.stringify({lead,follow,expired:await read(guest),errors}),contentType:'application/json'});
  }finally{await b.close();await a.close();}
});
