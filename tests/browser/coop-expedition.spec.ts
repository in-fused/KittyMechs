import {test,expect,type Page} from '@playwright/test';
import type {Vec3} from '../../shared/types';
import {climbAnchors} from '../../shared/traversal';
import {SUPPLIES} from '../../shared/supplies';
import {CoopPilot,joinWhileDefending,type RouteEvidence} from './helpers/coop-pilot';
import {WebSocketMedic} from './helpers/ws-medic';
import {horizontalDistance} from '../../shared/math';
import {CAMERA_LOOK_AHEAD} from '../../src/game/camera/framing';
const origin=()=>process.env.GAME_URL??'http://localhost:5173';
class Pilot {
  private x=720;private y=450;private yaw=0;private pitch=.06;
  constructor(readonly page:Page,readonly name:string){}
  actor(){return this.page.evaluate(name=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name===name)!,this.name);}
  async look(yaw:number,pitch=.06){
    await this.page.bringToFront();
    await expect.poll(()=>this.page.evaluate(()=>document.hasFocus())).toBe(true);
    if(!await this.page.evaluate(()=>!!document.pointerLockElement)){this.x=720;this.y=450;await this.page.mouse.move(this.x,this.y);await this.page.mouse.click(this.x,this.y);await this.page.waitForTimeout(100);}
    const delta=Math.atan2(Math.sin(yaw-this.yaw),Math.cos(yaw-this.yaw));this.x-=delta/.0021;this.y-=(pitch-this.pitch)/.0018;
    await this.page.mouse.move(this.x,this.y);this.yaw=yaw;this.pitch=pitch;
  }
  async travel(axis:'x'|'z',goal:number){
    await this.look(0);const before=(await this.actor()).position[axis],positive=goal>before,key=axis==='x'?(positive?'KeyD':'KeyA'):(positive?'KeyS':'KeyW');
    await this.page.keyboard.down(key);try{await expect.poll(async()=>{const a=await this.actor();return a.hp>0&&(positive?a.position[axis]>=goal:a.position[axis]<=goal);},{timeout:35000,intervals:[50]}).toBe(true);}finally{await this.page.keyboard.up(key);}
    await this.page.waitForTimeout(250);
  }
  async align(axis:'x'|'z',goal:number){
    await this.look(0);
    for(let i=0;i<12;i++){
      const delta=goal-(await this.actor()).position[axis];if(Math.abs(delta)<.25)return;
      const key=axis==='x'?(delta>0?'KeyD':'KeyA'):(delta>0?'KeyS':'KeyW');
      await this.page.keyboard.press(key,{delay:45});await this.page.waitForTimeout(250);
    }
    expect(Math.abs(goal-(await this.actor()).position[axis])).toBeLessThan(.3);
  }
  async aim(position:Vec3){
    const a=await this.actor(),camera=await this.page.evaluate(()=>window.kittyMechDebug!.camera()),range=Math.hypot(position.x-a.position.x,position.z-a.position.z),d=Math.max(.1,Math.hypot(camera.position.x-camera.focus.x,camera.position.z-camera.focus.z)),L=range+d;
    const sp=(position.y+.6-camera.focus.y-4+4*L/(d+CAMERA_LOOK_AHEAD))/(-d+(16+d)*L/(d+CAMERA_LOOK_AHEAD));
    await this.look(Math.atan2(-(position.x-a.position.x),-(position.z-a.position.z)),Math.asin(Math.max(-.75,Math.min(.65,sp))));
  }
}
async function deploy(page:Page,name:string,chassis:string,mode='CO-OP'){
  await page.goto(origin()+'/?debug=1');await page.getByLabel('Pilot callsign').fill(name);await page.getByRole('button',{name:`Select ${chassis}`,exact:true}).click();
  if(mode!=='CO-OP')await page.getByRole('button',{name:mode,exact:true}).click();
  await page.locator('summary').click();await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
  await expect(page.locator('.network-status')).toContainText('Connected',{timeout:40000});await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
  await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.snapshot()?.actors.find(a=>!a.bot)?.grounded),{timeout:30000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.performance().fps??0),{timeout:40000}).toBeGreaterThan(10);
}
async function invite(page:Page){await page.keyboard.down('Tab');const url=new URL(await page.getByLabel('Squad invite').inputValue());await page.keyboard.up('Tab');url.searchParams.set('debug','1');return url.toString();}

test('browser plus ordinary WebSocket medic restore a relay and support a real browser late join',async({browser},testInfo)=>{
  test.setTimeout(300000);
  // One focused browser uses keyboard/mouse; its network medic runs normal
  // validated inputs concurrently. A separate browser context joins afterward.
  const a=await browser.newContext({viewport:{width:1440,height:900}}),host=await a.newPage(),errors:string[]=[];
  let medic:WebSocketMedic|undefined,lateContext:Awaited<ReturnType<typeof browser.newContext>>|undefined;
  const evidence:RouteEvidence={samples:[],events:[],turns:[],beneficialRepairs:[]};
  host.on('pageerror',e=>errors.push(e.message));
  try{
    await deploy(host,'CheckpointLead','Bastion');const lead=new CoopPilot(host,'CheckpointLead',evidence);
    await lead.focus();const link=await invite(host);
    const seed=(await lead.snapshot()).seed;
    medic=await WebSocketMedic.join(link,'CheckpointMedic','CheckpointLead',evidence,seed);
    const medicStart={...medic.actor().position};
    await expect(host.locator('.network-status')).toContainText('2 PILOTS');
    const end=Date.now()+120000;
    try{while(Date.now()<end){
      const snap=await lead.snapshot();const west=snap.objectives.find(o=>o.id==='relay-west')!;if(west.complete)break;
      const player=snap.actors.find(a=>a.name==='CheckpointLead')!,support=snap.actors.find(a=>a.name==='CheckpointMedic')!;
      const leadGoal=horizontalDistance(player.position,support.position)>9?{...player.position}:{...west.position,x:west.position.x-2.15,y:west.position.y+1};
      // The medic performs the real relay interaction while Bastion guards it.
      // This makes participation an accepted capture, rather than an input attempt.
      await lead.turn(leadGoal,{duration:650,objective:west});
      expect(medic.errors).toEqual([]);
    }}finally{await lead.release();}
    await expect.poll(()=>host.evaluate(()=>window.kittyMechDebug!.snapshot()!.checkpoint?.objectiveId)).toBe('relay-west');
    await expect.poll(()=>medic!.snapshot().checkpoint?.objectiveId).toBe('relay-west');
    const captainId=(await lead.actor()).id;
    // Successful defense may leave Bastion completely uninjured. Keep the
    // non-self healing assertion, but establish its missing precondition using
    // enemy fire and ordinary movement rather than changing authoritative HP.
    {
      const supportPhase:{startedAt:number;endedAt?:number;samples:{time:number;hp:number;hurtAt:number;respawnAt:number;healerDistance:number}[]}={startedAt:medic.snapshot().time,samples:[]};
      const hasPhaseRepair=()=>evidence.beneficialRepairs.some(repair=>repair.actor===medic!.id&&repair.at>supportPhase.startedAt&&repair.targets.some(target=>target.id===captainId&&target.gain>0));
      medic.setAttacking(false);const deadline=Date.now()+45000;
      try{while(!hasPhaseRepair()&&Date.now()<deadline){
        const state=medic.snapshot(),healer=medic.actor(),threat=state.actors.filter(a=>a.bot&&a.hp>0).sort((a,b)=>horizontalDistance(a.position,healer.position)-horizontalDistance(b.position,healer.position))[0];
        const length=threat?Math.max(.001,horizontalDistance(threat.position,healer.position)):1;
        const goal={...healer.position,x:healer.position.x+(threat?(threat.position.x-healer.position.x)/length*3.4:3.4),z:healer.position.z+(threat?(threat.position.z-healer.position.z)/length*3.4:0)};
        await lead.turn(goal,{duration:400,objective:state.objectives.find(o=>o.id==='relay-west'),attack:false});
        const after=medic.snapshot(),captain=after.actors.find(a=>a.id===captainId)!,support=after.actors.find(a=>a.id===medic!.id)!;
        supportPhase.samples.push({time:after.time,hp:captain.hp,hurtAt:captain.hurtAt,respawnAt:captain.respawnAt,healerDistance:horizontalDistance(captain.position,support.position)});
      }}finally{
        supportPhase.endedAt=medic.snapshot().time;medic.setAttacking(true);await lead.release();
        await testInfo.attach('ordinary-input-injured-ally-support-phase',{body:Buffer.from(JSON.stringify(supportPhase,null,2)),contentType:'application/json'});
      }
      expect(hasPhaseRepair(),'The bounded ordinary-input support phase must produce a new accepted non-self heal').toBe(true);
    }
    const state=medic.snapshot(),west=state.objectives.find(o=>o.id==='relay-west')!,support=state.actors.find(a=>a.name==='CheckpointMedic')!,captain=state.actors.find(a=>a.name==='CheckpointLead')!;
    await testInfo.attach('independent-websocket-checkpoint-snapshot',{body:Buffer.from(JSON.stringify(state,null,2)),contentType:'application/json'});
    await testInfo.attach('browser-checkpoint-snapshot',{body:Buffer.from(JSON.stringify(await lead.snapshot(),null,2)),contentType:'application/json'});
    expect(west.complete).toBe(true);expect(support.chassis).toBe('caracal');expect(support.hp).toBeGreaterThan(0);
    expect(horizontalDistance(support.position,medicStart)).toBeGreaterThan(20);expect(horizontalDistance(support.position,west.position)).toBeLessThan(8);
    expect(evidence.events.find(e=>e.type==='capture'&&horizontalDistance(e.position,west.position)<.25)?.actor).toBe(support.id);
    expect(captain.kills+support.kills).toBeGreaterThan(0);
    expect(evidence.beneficialRepairs.some(repair=>repair.actor===support.id&&repair.targets.some(target=>target.id===captain.id&&target.gain>0)),'Caracal must actually restore an injured squadmate, verified from accepted repair and health snapshots').toBe(true);
    await expect(host.locator('.checkpoint-status')).toContainText('WEST RELAY');await host.screenshot({path:'test-results/coop-shared-checkpoint.png'});
    await medic.close();await expect(host.locator('.network-status')).toContainText('1 PILOT');
    lateContext=await browser.newContext({viewport:{width:1440,height:900}});const guest=await lateContext.newPage();guest.on('pageerror',e=>errors.push(e.message));
    await joinWhileDefending(guest,link,'LateCheckpoint','Pounce',lead,{...west.position,x:west.position.x-2.15,y:west.position.y+1});
    await expect.poll(()=>guest.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name==='LateCheckpoint')?.hp??0),{timeout:10000}).toBeGreaterThan(0);
    const joined=await guest.evaluate(()=>{const s=window.kittyMechDebug!.snapshot()!;return{checkpoint:s.checkpoint,actor:s.actors.find(a=>a.name==='LateCheckpoint')!,objective:s.objectives.find(o=>o.id==='relay-west')!};});
    expect(joined.objective.complete).toBe(true);expect(joined.checkpoint?.objectiveId).toBe('relay-west');expect(joined.actor.hp).toBeGreaterThan(0);expect(Math.hypot(joined.actor.position.x-joined.checkpoint!.position.x,joined.actor.position.z-joined.checkpoint!.position.z)).toBeLessThan(25);
    await expect(guest.locator('.checkpoint-status')).toContainText('WEST RELAY');await guest.screenshot({path:'test-results/coop-late-browser-checkpoint.png'});
    expect(joined.actor.position.z).toBeLessThan(-10);expect(errors).toEqual([]);expect(medic.errors).toEqual([]);
  }finally{
    await medic?.close();await testInfo.attach('browser-plus-ordinary-websocket-coop-evidence',{body:Buffer.from(JSON.stringify({method:'keyboard-mouse-browser-plus-ordinary-websocket-medic',...evidence,validatedCompanionMessages:medic?.messages,companionErrors:medic?.errors},null,2)),contentType:'application/json'});
    await lateContext?.close();await a.close();
  }
});

test('an ordinary supply claim replicates once and remains unavailable to a late joiner',async({page,browser},testInfo)=>{
  test.setTimeout(120000);await deploy(page,'SupplyLead','Lynx','PVP');const pilot=new Pilot(page,'SupplyLead'),link=await invite(page);
  const selected=await page.evaluate(()=>{const s=window.kittyMechDebug!.snapshot()!,a=s.actors.find(a=>!a.bot)!;return s.supplies.filter(p=>p.kind==='energy').sort((p,q)=>Math.hypot(p.position.x-a.position.x,p.position.z-a.position.z)-Math.hypot(q.position.x-a.position.x,q.position.z-a.position.z))[0];});
  const route:RouteEvidence={samples:[],events:[],turns:[],beneficialRepairs:[]};
  const seed=await page.evaluate(()=>window.kittyMechDebug!.snapshot()!.seed);
  const driver=new CoopPilot(page,'SupplyLead',route,seed),goal={...selected.position,y:selected.position.y+1};
  const deadline=Date.now()+70000;
  // Follow admitted streets around buildings using ordinary keyboard/mouse inputs.
  try{while(horizontalDistance((await driver.actor()).position,goal)>1.5&&Date.now()<deadline){
    await driver.turn(goal,{duration:250,attack:false});expect((await driver.actor()).hp).toBeGreaterThan(0);
  }}finally{
    await driver.release();
    await testInfo.attach('ordinary-input-supply-route',{body:Buffer.from(JSON.stringify({selected,seed,goal,...route},null,2)),contentType:'application/json'});
  }
  expect(horizontalDistance((await pilot.actor()).position,goal)).toBeLessThan(1.5);
  // Upright ion snare spends energy at the cache without a dash reapproach.
  await page.keyboard.press('KeyR',{delay:100});await expect.poll(async()=>{const actor=await pilot.actor();return actor.stance==='upright'&&actor.grounded;}).toBe(true);await page.waitForTimeout(800);
  await page.keyboard.press('ShiftLeft',{delay:100});await expect.poll(async()=>(await pilot.actor()).energy).toBeLessThan(90);await page.keyboard.down('KeyE');
  try{await expect.poll(()=>page.evaluate(id=>window.kittyMechDebug!.snapshot()!.supplies.find(p=>p.id===id)?.claimedBy,selected.id)).not.toBeNull();}finally{await page.keyboard.up('KeyE');}
  await expect(page.locator('.supply-feedback')).toContainText(SUPPLIES.energy.name);await page.screenshot({path:'test-results/coop-supply-claim.png'});
  const context=await browser.newContext(),guest=await context.newPage();try{
    await guest.goto(link);await guest.getByLabel('Pilot callsign').fill('LateSupply');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:40000});
    const state=await guest.evaluate(id=>window.kittyMechDebug!.snapshot()!.supplies.find(p=>p.id===id)!,selected.id);expect(state.claimedBy).not.toBeNull();expect(state.availableAt).toBeGreaterThan(state.born+50);
    expect(await guest.evaluate(id=>window.kittyMechDebug!.snapshot()!.events.filter(e=>e.type==='supply'&&e.supplyId===id).length,selected.id)).toBeLessThanOrEqual(1);
  }finally{await context.close();}
});

test('forward combat roof supports an upright field and networked movement',async({page,browser})=>{
  test.setTimeout(150000);await deploy(page,'RoofGuardian','Bastion','PVP');const pilot=new Pilot(page,'RoofGuardian'),anchor=climbAnchors(7734)[1];
  await pilot.travel('z',-30);await pilot.travel('x',73);await pilot.travel('z',-62);await pilot.travel('x',anchor.position.x+2.05+.45);await pilot.align('z',anchor.position.z);await pilot.align('x',anchor.position.x+2.05+.45);await pilot.look(Math.PI/2);
  await page.keyboard.down('KeyC');await page.keyboard.down('KeyW');try{await expect.poll(async()=>{const a=await pilot.actor();return !a.climb&&a.position.y>anchor.landing.y+.9;},{timeout:17000,intervals:[50]}).toBe(true);}finally{await page.keyboard.up('KeyW');await page.keyboard.up('KeyC');}
  await expect.poll(async()=>(await pilot.actor()).grounded).toBe(true);await page.keyboard.press('KeyR');await expect.poll(async()=>(await pilot.actor()).stance).toBe('upright');await page.waitForTimeout(750);await page.keyboard.press('ShiftLeft');
  await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.snapshot()!.fields.some(f=>f.kind==='shield'&&f.position.y>10))).toBe(true);await page.screenshot({path:'test-results/vertical-forward-roof-field.png'});
  expect(await page.evaluate(()=>window.kittyMechDebug!.camera().violations)).toBe(0);const link=await invite(page),context=await browser.newContext(),guest=await context.newPage();
  try{await guest.goto(link);await guest.getByLabel('Pilot callsign').fill('RoofObserver');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await expect(guest.locator('.network-status')).toContainText('2 PILOTS',{timeout:40000});
    await expect.poll(()=>guest.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name==='RoofGuardian')!.position.y)).toBeGreaterThan(anchor.landing.y+.9);
    const before=await guest.evaluate(()=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name==='RoofGuardian')!.position.z);
    await page.keyboard.down('KeyA');await page.waitForTimeout(700);await page.keyboard.up('KeyA');await expect.poll(()=>guest.evaluate(before=>Math.abs(window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name==='RoofGuardian')!.position.z-before),before)).toBeGreaterThan(.5);
  }finally{await context.close();}
});
