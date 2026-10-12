import {test,expect,type Page} from '@playwright/test';
import {cityDistrict} from '../../shared/cityDistrict';
import {horizontalDistance} from '../../shared/math';
import {CoopPilot,type RouteEvidence} from './helpers/coop-pilot';

const origin=()=>process.env.GAME_URL??'http://localhost:5173';
const stream=(page:Page)=>page.evaluate(()=>window.kittyMechDebug!.streaming());
async function deploy(page:Page,name:string){
  await page.goto(origin()+'/?debug=1');await page.getByLabel('Pilot callsign').fill(name);await page.getByRole('button',{name:'PVP',exact:true}).click();await page.locator('summary').click();await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
  await expect(page.locator('.network-status')).toContainText('Connected',{timeout:40000});await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
  await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.grounded),{timeout:20000}).toBe(true);
  // The room can connect before the lazy Canvas/input effects mount. An absent
  // loading overlay alone therefore does not establish a controllable scene.
  await expect.poll(async()=>{const {world}=await stream(page);return !!world&&world.readyKeys.includes(world.center)&&world.guest.tiles.length>=9&&await page.evaluate(()=>window.kittyMechDebug!.performance().fps>=30);},{timeout:60000}).toBe(true);
}
test('late city art leaves the pilot and solids live and changes only the appearance bank',async({browser},info)=>{
  test.setTimeout(120000);const context=await browser.newContext(),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});await context.route('**/City_Facade_Windows.webp',async route=>{await gate;await route.continue();});
  try{
    await deploy(page,'LateArt');await expect.poll(async()=>(await stream(page)).world?.cityArt).toBe('loading');const held=await stream(page),before=await page.evaluate(()=>window.kittyMechDebug!.snapshot()!);
    await page.keyboard.down('KeyW');try{await page.waitForTimeout(900);}finally{await page.keyboard.up('KeyW');}
    const moved=await page.evaluate(()=>window.kittyMechDebug!.snapshot()!);expect(moved.tick).toBeGreaterThan(before.tick+30);expect(moved.actors.find(a=>a.name==='LateArt')!.position.z).toBeLessThan(before.actors.find(a=>a.name==='LateArt')!.position.z-2);expect(moved.structures).toHaveLength(123);
    release();await expect.poll(async()=>(await stream(page)).world?.cityArt,{timeout:20000}).toBe('ready');const ready=await stream(page);
    expect(ready.world?.city?.meshes[0].activeBlocks).toBe(held.world?.city?.meshes[0].activeBlocks);expect(ready.world?.city?.meshes[0].cells).toBe(952);expect(ready.world?.guest.tiles.map(t=>t.terrainHandle)).toEqual(held.world?.guest.tiles.map(t=>t.terrainHandle));expect(errors).toEqual([]);
    await page.screenshot({path:info.outputPath('city-art-ready.png')});await info.attach('late-city-art',{body:JSON.stringify({held,ready,beforeTick:before.tick,movedTick:moved.tick}),contentType:'application/json'});
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();await expect.poll(async()=>(await stream(page)).world).toBeNull();await expect.poll(async()=>{const s=await stream(page);return s.cache.active+s.cache.queued+s.cache.owners;}).toBe(0);
  }finally{release();await context.unrouteAll({behavior:'wait'});await context.close();}
});
test('a failed optional city texture retains the factory bank and normal input',async({browser},info)=>{
  const context=await browser.newContext(),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await context.route('**/City_District_Signs.webp',route=>route.fulfill({status:503,body:'Deliberate optional art fixture'}));
  try{await deploy(page,'ArtFallback');await expect.poll(async()=>(await stream(page)).world?.cityArt).toBe('fallback');const before=await page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.position.z);await page.keyboard.down('KeyW');try{await page.waitForTimeout(900);}finally{await page.keyboard.up('KeyW');}
    expect(await page.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>!a.bot)!.position.z)).toBeLessThan(before-2);await expect(page.locator('.fatal-error')).toHaveCount(0);expect(errors).toEqual([]);await page.screenshot({path:info.outputPath('city-art-fallback.png')});
  }finally{await context.close();}
});
test('ordinary controls reach the new city, mantle a roof and replicate an accepted facade opening to a late pilot',async({browser},info)=>{
  test.setTimeout(300000);const context=await browser.newContext(),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));let guestContext;
  const evidence:RouteEvidence={samples:[],events:[],turns:[],beneficialRepairs:[]},b=cityDistrict(7734)!.buildings.find(b=>b.id.endsWith(':extension-0'))!,a=b.anchor;
  const route=async(pilot:CoopPilot,goal:{x:number;y:number;z:number})=>{const end=Date.now()+150000;while(Date.now()<end&&horizontalDistance((await pilot.actor()).position,goal)>1.1)await pilot.turn(goal,{attack:false,duration:400});expect(horizontalDistance((await pilot.actor()).position,goal)).toBeLessThan(1.5);await pilot.release();};
  try{
    await deploy(page,'CityPilot');const pilot=new CoopPilot(page,'CityPilot',evidence);await route(pilot,{...a.approach,y:.92});await pilot.face(-Math.PI/2);
    await page.keyboard.down('KeyC');await page.keyboard.down('KeyW');try{await expect.poll(async()=>{const actor=await pilot.actor();return actor.position.y>b.roof.center.y+.9&&!actor.climb;},{timeout:20000,intervals:[50]}).toBe(true);}finally{await page.keyboard.up('KeyW');await page.keyboard.up('KeyC');}
    await expect.poll(async()=>(await pilot.actor()).grounded).toBe(true);await page.screenshot({path:info.outputPath('city-roof-pounce.png')});const roof=await pilot.actor();await page.keyboard.press('KeyR');await expect.poll(async()=>{const actor=await pilot.actor();return actor.stance==='upright'&&actor.grounded;}).toBe(true);await page.waitForTimeout(750);await page.keyboard.down('KeyW');try{await page.waitForTimeout(650);}finally{await page.keyboard.up('KeyW');}expect(horizontalDistance((await pilot.actor()).position,roof.position)).toBeGreaterThan(2);await page.screenshot({path:info.outputPath('city-roof-upright.png')});
    await page.keyboard.press('KeyR');await page.waitForTimeout(800);await page.keyboard.press('Space');await expect.poll(async()=>(await pilot.actor()).grounded).toBe(false);await expect.poll(async()=>(await pilot.actor()).grounded,{timeout:12000}).toBe(true);
    // Leave the roof with ordinary input, then aim at one actual ground-level
    // facade cell. No actor/collider/snapshot warp is available in this test.
    await pilot.face(Math.PI/2);await page.keyboard.down('KeyW');try{await expect.poll(async()=>(await pilot.actor()).position.x,{timeout:10000}).toBeLessThan(b.position.x-b.width/2-3);}finally{await page.keyboard.up('KeyW');}await expect.poll(async()=>(await pilot.actor()).position.y,{timeout:12000}).toBeLessThan(2);
    const bank=cityDistrict(7734)!.structures.find(s=>s.id===b.id+':facade-west')!,cell=bank.cells[1];await route(pilot,{x:a.approach.x,y:.92,z:cell.position[2]});
    for(let i=0;i<16;i++){if((await pilot.snapshot()).structures.find(s=>s.id===bank.id)!.hp[1]===0)break;await pilot.shootPoint({x:cell.position[0],y:cell.position[1],z:cell.position[2]},450);}
    const broken=(await pilot.snapshot()).structures.find(s=>s.id===bank.id)!;expect(broken.hp[1]).toBe(0);expect(broken.brokenMask&2).toBe(2);await expect.poll(async()=>(await stream(page)).world?.city?.meshes.some(m=>m.removedBlocks.includes(cell.id))).toBe(true);await page.screenshot({path:info.outputPath('city-accepted-opening.png')});
    await page.keyboard.down('Tab');const invite=new URL(await page.getByLabel('Squad invite').inputValue());await page.keyboard.up('Tab');invite.searchParams.set('debug','1');guestContext=await browser.newContext();const guest=await guestContext.newPage();guest.on('pageerror',e=>errors.push(e.message));await guest.goto(invite.toString());await guest.getByLabel('Pilot callsign').fill('LateCity');await guest.getByRole('button',{name:'Select Lynx',exact:true}).click();await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:40000});await expect(guest.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
    await expect.poll(()=>guest.evaluate(id=>window.kittyMechDebug!.snapshot()!.structures.find(s=>s.id===id)?.brokenMask,bank.id)).toBe(broken.brokenMask);await expect.poll(async()=>(await stream(guest)).world?.city?.meshes.some(m=>m.removedBlocks.includes(cell.id))).toBe(true);expect(errors).toEqual([]);
    await info.attach('city-natural-route-and-opening',{body:JSON.stringify({evidence,broken,host:await stream(page),guest:await stream(guest),scope:'Pounce natural roof/form route and accepted facade pulse. Latejoin verifies full mask/index; distant guest collision reload separately qualified in CPU units.'}),contentType:'application/json'});
  }finally{await info.attach('city-route-evidence-final',{body:JSON.stringify({evidence,errors}),contentType:'application/json'});if(guestContext)await guestContext.close();await context.close();}
});
