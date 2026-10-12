import {test,expect,type Page} from '@playwright/test';
import {WebSocket} from 'ws';
import {WORLD_LAYOUT_VERSION} from '../../shared/layout';
import {INPUT_PROTOCOL_VERSION} from '../../shared/inputProtocol';

const origin=()=>process.env.GAME_URL??'http://localhost:5173';
const actor=(page:Page,name:string)=>page.evaluate(name=>window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name===name)!,name);
const input=(page:Page)=>page.evaluate(()=>window.kittyMechDebug!.input());
type ScheduleRow={kind:string;at:number;focused?:boolean};
const trace=(page:Page)=>page.evaluate(()=>(window as unknown as {__jumpSchedule:ScheduleRow[]}).__jumpSchedule);
async function ready(page:Page,name:string){
  await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:60000});
  await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug?.performance().fps??0),{timeout:40000}).toBeGreaterThan(10);
  await expect.poll(async()=>{const a=await actor(page,name);return !!a?.grounded&&a.hp>0;},{timeout:30000}).toBe(true);
  await page.bringToFront();await expect.poll(()=>page.evaluate(()=>document.hasFocus())).toBe(true);
}
async function invite(page:Page){await page.keyboard.down('Tab');try{return await page.getByLabel('Squad invite').inputValue();}finally{await page.keyboard.up('Tab');}}
/** A passive listener runs after ordinary controls. It adds a controlled render
 * stall or clicks the real HUD pause button; it never edits input/authority state. */
async function schedule(page:Page,stall:number,pause=false){
  await page.evaluate(`(()=>{window.__jumpSchedule=[];const up=(e)=>{if(e.code!=='Space')return;window.__jumpSchedule.push({kind:'keyup',at:performance.now()});window.removeEventListener('keyup',up);};const handle=(e)=>{if(e.code!=='Space'||e.repeat)return;const start=performance.now();window.__jumpSchedule.push({kind:'after-controls',at:start,focused:document.hasFocus()});${pause?"document.querySelector('button[aria-label=\"Pause game\"]').click();window.__jumpSchedule.push({kind:'HUD-pause',at:performance.now()});":''}while(performance.now()-start<${stall}){}window.__jumpSchedule.push({kind:'stall-end',at:performance.now()});window.removeEventListener('keydown',handle);};window.addEventListener('keydown',handle,{passive:true});window.addEventListener('keyup',up,{passive:true});})()`);
}
async function sample(page:Page,name:string,duration=2200){
  return page.evaluate(async({name,duration})=>{const rows=[],start=performance.now();while(performance.now()-start<duration){const snapshot=window.kittyMechDebug!.snapshot()!,a=snapshot.actors.find(a=>a.name===name)!;rows.push({at:performance.now(),tick:snapshot.tick,actor:structuredClone(a)});await new Promise<void>(r=>requestAnimationFrame(()=>r()));}return rows;},{name,duration});
}

for(const transport of ['local','server-guest','peer-guest'] as const){
  test(`${transport}: delayed quadruped/upright presses deliver once and HUD pause cancels an unsampled press`,async({browser},testInfo)=>{
    test.setTimeout(180000);
    const hostContext=await browser.newContext(),guestContext=transport==='local'?null:await browser.newContext();
    const host=await hostContext.newPage(),pilot=guestContext?await guestContext.newPage():host,name=`Jump-${transport}`;
    const errors:string[]=[],packets:unknown[]=[],evidence:unknown[]=[];
    for(const page of new Set([host,pilot])){
      page.on('pageerror',e=>errors.push(e.message));
      page.on('websocket',ws=>ws.on('framesent',e=>{try{const m=JSON.parse(String(e.payload));if(m.type==='input')packets.push({source:page===pilot?'pilot':'host',at:Date.now(),message:m});}catch{/* signaling frames are not gameplay inputs */}}));
      await page.addInitScript(()=>localStorage.setItem('kittymech-settings',JSON.stringify({quality:'medium',volume:0,sensitivity:1,cameraDistance:10,reducedFlashes:false,invertY:false})));
    }
    try{
      await host.goto(origin()+'/?debug=1');await host.getByLabel('Pilot callsign').fill(transport==='local'?name:'Jump-Host');
      await host.getByRole('button',{name:'Select Bastion',exact:true}).click();await host.getByRole('button',{name:'PVP',exact:true}).click();
      if(transport==='local')await host.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
      else{
        await host.locator('.server-options summary').click();await host.getByRole('button',{name:transport==='peer-guest'?'Host browser invite':'Host on arena server',exact:true}).click();
        await ready(host,'Jump-Host');const link=await invite(host),url=new URL(link);url.searchParams.set('debug','1');
        await pilot.goto(url.toString());await pilot.getByLabel('Pilot callsign').fill(name);await pilot.getByRole('button',{name:'Select Bastion',exact:true}).click();await pilot.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
        await expect(pilot.locator('.network-status')).toContainText('2 PILOTS',{timeout:60000});
      }
      await ready(pilot,name);
      for(const [stance,stall] of [['quadruped',300],['upright',1250]] as const){
        if(stance==='upright'){await pilot.keyboard.press('KeyR');await expect.poll(async()=>{const a=await actor(pilot,name),s=await pilot.evaluate(()=>window.kittyMechDebug!.snapshot()!);return a.stance===stance&&s.time-a.stanceChangedAt>.7;}).toBe(true);}
        await ready(pilot,name);const before=await actor(pilot,name),prior=await input(pilot);await schedule(pilot,stall);
        await pilot.keyboard.press('Space',{delay:20});const rows=await sample(pilot,name),after=await actor(pilot,name),delivery=await input(pilot);
        const scheduled=await trace(pilot),start=scheduled.find(e=>e.kind==='after-controls')!,end=scheduled.find(e=>e.kind==='stall-end')!;
        const id=prior.issued+1,launches=rows.filter((r,i)=>!r.actor.grounded&&(i===0||rows[i-1].actor.grounded)).length;
        expect(start).toBeTruthy();expect(end).toBeTruthy();expect(end.at-start.at).toBeGreaterThanOrEqual(stall);expect(start.focused).toBe(true);expect(scheduled.some(e=>e.kind==='keyup')).toBe(true);
        expect(rows.some(r=>!r.actor.grounded)).toBe(true);expect(launches).toBe(1);expect(Math.max(...rows.map(r=>r.actor.position.y))-before.position.y).toBeGreaterThan(stance==='quadruped'?1:.3);
        expect(after.grounded).toBe(true);expect(after.hp).toBeGreaterThan(0);expect(after.jumpProcessed).toBe(id);expect(delivery.issued).toBe(id);expect(delivery.pending).toBe(0);
        const events=delivery.events.filter(e=>e.id===id&&e.epoch===before.jumpEpoch&&e.owner===delivery.owner),press=events.find(e=>e.kind==='press')!,sampled=events.find(e=>e.kind==='sample')!,sent=events.find(e=>e.kind==='first-send')!,ack=events.find(e=>e.kind==='ack')!;
        expect(press).toBeTruthy();expect(sampled).toBeTruthy();expect(sent).toBeTruthy();expect(ack).toBeTruthy();expect(press.at).toBeLessThanOrEqual(start.at);expect(sampled.at).toBeGreaterThanOrEqual(end.at);expect(sent.at).toBeGreaterThanOrEqual(sampled.at);expect(ack.at).toBeGreaterThanOrEqual(sent.at);
        evidence.push({transport,stance,stall,before,after,delivery,trace:scheduled,rows,scope:'Unsampled press retention during a measured render stall. Requested20ms Playwright key delay does not establish DOM down/up spacing; actual keyup is retained.'});await pilot.screenshot({path:testInfo.outputPath(`${transport}-${stance}-landed.png`)});
      }
      await ready(pilot,name);const beforeCancel=await actor(pilot,name),priorCancel=await input(pilot);await schedule(pilot,600,true);
      const packetStart=packets.length;await pilot.keyboard.press('Space',{delay:20});await expect(pilot.getByRole('button',{name:'RESUME EXPEDITION',exact:true})).toBeVisible();
      const paused=await input(pilot);expect(paused.issued).toBe(priorCancel.issued+1);expect(paused.cancel).toBe(paused.issued);expect(paused.pending).toBe(0);
      const pauseTrace=await trace(pilot);expect(pauseTrace.some(e=>e.kind==='HUD-pause')).toBe(true);expect(pauseTrace.find(e=>e.kind==='stall-end')!.at-pauseTrace.find(e=>e.kind==='after-controls')!.at).toBeGreaterThanOrEqual(600);
      expect(paused.events.some(e=>e.kind==='first-send'&&e.id===paused.issued&&e.epoch===paused.epoch&&e.owner===paused.owner)).toBe(false);
      await pilot.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();const canceledRows=await sample(pilot,name,1400);
      expect(canceledRows.every(r=>r.actor.grounded)).toBe(true);expect((await actor(pilot,name)).jumpEpoch).toBe(beforeCancel.jumpEpoch);
      expect((packets.slice(packetStart) as {source:string;message:{input:{jump:boolean;jumpId:number;jumpEpoch:number}}}[]).some(p=>p.source==='pilot'&&p.message.input.jump&&p.message.input.jumpId===paused.issued&&p.message.input.jumpEpoch===paused.epoch)).toBe(false);
      evidence.push({transport,stage:'HUD-pause-before-sample',beforeCancel,paused,trace:pauseTrace,canceledRows});
      await pilot.keyboard.press('Space',{delay:20});const freshRows=await sample(pilot,name),fresh=await input(pilot);
      const freshActor=await actor(pilot,name),freshId=paused.issued+1;expect(freshRows.filter((r,i)=>!r.actor.grounded&&(i===0||freshRows[i-1].actor.grounded))).toHaveLength(1);expect(freshActor.grounded).toBe(true);expect(freshActor.jumpProcessed).toBe(freshId);expect(fresh.issued).toBe(freshId);expect(fresh.pending).toBe(0);expect(fresh.events.some(e=>e.kind==='ack'&&e.id===freshId&&e.epoch===freshActor.jumpEpoch&&e.owner===fresh.owner)).toBe(true);expect(errors).toEqual([]);
      evidence.push({transport,stage:'fresh-press-after-cancel',fresh,freshRows});
    }finally{
      await testInfo.attach('jump-delivery-evidence',{body:JSON.stringify({transport,errors,packets,evidence}),contentType:'application/json'});
      await guestContext?.close();await hostContext.close();
    }
  });
}

test('touch jump uses the acknowledged press path through a delayed frame',async({browser},testInfo)=>{
  test.setTimeout(120000);const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:800,height:600}}),page=await context.newPage(),errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(()=>localStorage.setItem('kittymech-settings',JSON.stringify({quality:'medium',volume:0,sensitivity:1,cameraDistance:10,reducedFlashes:false,invertY:false})));
    await page.goto(origin()+'/?debug=1');await page.getByLabel('Pilot callsign').fill('TouchJump');await page.getByRole('button',{name:'PVP',exact:true}).click();await page.getByRole('button',{name:'HOST SQUAD',exact:false}).click();await ready(page,'TouchJump');
    expect(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches)).toBe(true);await expect(page.getByRole('button',{name:'JUMP',exact:true})).toBeVisible({timeout:10000});
    const before=await actor(page,'TouchJump'),prior=await input(page);
    await page.evaluate(`(()=>{window.__jumpSchedule=[];const block=(e)=>{const button=e.target.closest('.touch-actions button');if(button?.textContent!=='JUMP')return;const start=performance.now();window.__jumpSchedule.push({kind:'after-controls',at:start});while(performance.now()-start<300){}window.__jumpSchedule.push({kind:'stall-end',at:performance.now()});window.removeEventListener('click',block);};window.addEventListener('click',block,{passive:true});})()`);
    await page.getByRole('button',{name:'JUMP',exact:true}).tap();const rows=await sample(page,'TouchJump'),delivery=await input(page),after=await actor(page,'TouchJump');
    const scheduled=await trace(page);expect(scheduled.find(e=>e.kind==='stall-end')!.at-scheduled.find(e=>e.kind==='after-controls')!.at).toBeGreaterThanOrEqual(300);
    expect(rows.filter((r,i)=>!r.actor.grounded&&(i===0||rows[i-1].actor.grounded))).toHaveLength(1);expect(after.grounded).toBe(true);expect(after.jumpProcessed).toBe(prior.issued+1);expect(delivery.pending).toBe(0);expect(delivery.events.some(e=>e.kind==='first-send'&&e.id===after.jumpProcessed)).toBe(true);expect(delivery.events.some(e=>e.kind==='ack'&&e.id===after.jumpProcessed)).toBe(true);expect(errors).toEqual([]);
    const edge=delivery.events.filter(e=>e.id===after.jumpProcessed&&e.epoch===before.jumpEpoch&&e.owner===delivery.owner),pressed=edge.find(e=>e.kind==='press')!,sampled=edge.find(e=>e.kind==='sample')!,sent=edge.find(e=>e.kind==='first-send')!,acked=edge.find(e=>e.kind==='ack')!;
    expect(pressed).toBeTruthy();expect(sampled).toBeTruthy();expect(sent).toBeTruthy();expect(acked).toBeTruthy();expect(pressed.at).toBeLessThanOrEqual(scheduled[0].at);expect(sampled.at).toBeGreaterThanOrEqual(scheduled[1].at);expect(sent.at).toBeGreaterThanOrEqual(sampled.at);expect(acked.at).toBeGreaterThanOrEqual(sent.at);
    await page.screenshot({path:testInfo.outputPath('touch-jump-landed.png')});await testInfo.attach('touch-delivery',{body:JSON.stringify({before,after,delivery,trace:scheduled,rows,errors}),contentType:'application/json'});
  }finally{await context.close();}
});

test('input-only version rejection is readable before a dedicated room is created',async({request},testInfo)=>{
  const before=await (await request.get(origin()+'/health')).json(),evidence=[];
  for(const inputVersion of [undefined,INPUT_PROTOCOL_VERSION-1]){
    const url=new URL('/arena',origin());url.protocol=url.protocol==='https:'?'wss:':'ws:';
    const result=await new Promise<{code:number;messages:unknown[]}>((resolve,reject)=>{
      const socket=new WebSocket(url),messages:unknown[]=[],timer=setTimeout(()=>{socket.terminate();reject(Error('Input-incompatible join did not terminate'));},10000);
      socket.on('open',()=>socket.send(JSON.stringify({type:'join',room:'',name:'OldInput',chassis:'pounce',mode:'pvp',create:true,seed:7734,layoutVersion:WORLD_LAYOUT_VERSION,...(inputVersion===undefined?{}:{inputVersion})})));
      socket.on('message',data=>messages.push(JSON.parse(data.toString())));socket.on('error',reject);socket.on('close',code=>{clearTimeout(timer);resolve({code,messages});});
    });
    expect(result.code).toBe(1008);expect(result.messages).toEqual([{type:'error',message:'This arena uses a different input build. Reload the game and ask the host for a fresh invite.'}]);evidence.push({inputVersion:inputVersion??'missing',...result});
  }
  const after=await (await request.get(origin()+'/health')).json();expect(after.rooms).toBe(before.rooms);expect(after.players).toBe(before.players);
  await testInfo.attach('input-version-rejection',{body:JSON.stringify({before,after,evidence}),contentType:'application/json'});
});
