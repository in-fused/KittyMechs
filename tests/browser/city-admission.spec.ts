import {test,expect} from '@playwright/test';
import {WebSocket} from 'ws';
import {cityDistrict} from '../../shared/cityDistrict';

const origin=()=>process.env.GAME_URL??'http://localhost:5173';

test('a cold city material and rooftop fixture keep their authored solids through asset handoff and scene retirement',async({browser},testInfo)=>{
  test.setTimeout(120000);
  const context=await browser.newContext(),page=await context.newPage(),errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  let releaseFactory!:()=>void,releaseCoolant!:()=>void,factoryRequests=0,coolantRequests=0;
  const factoryGate=new Promise<void>(resolve=>{releaseFactory=resolve;}),coolantGate=new Promise<void>(resolve=>{releaseCoolant=resolve;});
  await context.route('**/Factory_Workshop.glb*',async route=>{factoryRequests++;await factoryGate;await route.continue();});
  await context.route('**/City_Coolant_Higgsfield.glb*',async route=>{coolantRequests++;await coolantGate;await route.continue();});
  const stream=()=>page.evaluate(()=>window.kittyMechDebug!.streaming());
  try{
    await page.goto(origin()+'/?debug=1');await page.getByLabel('Pilot callsign').fill('ColdCity');await page.getByRole('button',{name:'PVP',exact:true}).click();await page.getByRole('button',{name:'HOST SQUAD',exact:false}).click();
    await expect.poll(async()=>{const data=await stream();return data.world?.city?.meshes.some(mesh=>mesh.surface==='fallback');},{timeout:60000}).toBe(true);
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.performance().fps),{timeout:30000}).toBeGreaterThan(10);
    const held=await stream();
    const heldSnapshot=await page.evaluate(()=>window.kittyMechDebug!.snapshot()!);
    expect(heldSnapshot.structures).toHaveLength(123);expect(heldSnapshot.structures.every(s=>s.brokenMask===0)).toBe(true);
    const fallback=held.world!.city!.meshes.find(m=>m.surface==='fallback')!;
    expect(fallback.activeBlocks).toBe(cityDistrict(7734)!.blocks.filter(b=>b.part!=='fixture').length);expect(fallback.cells).toBe(952);expect(fallback.removedBlocks).toEqual([]);
    // Initial loading may still show its normal progress veil. This assertion
    // qualifies actual mesh ownership, not late-cold visibility or playable FPS.
    releaseFactory();
    await expect.poll(async()=>{const data=await stream();return data.world?.city?.meshes.some(mesh=>mesh.surface==='pbr');},{timeout:30000}).toBe(true);
    await expect.poll(()=>coolantRequests,{timeout:20000}).toBe(1);
    const transferred=await stream(),pbr=transferred.world!.city!.meshes.find(m=>m.surface==='pbr')!;
    expect(pbr.activeBlocks).toBe(fallback.activeBlocks);expect(pbr.cells).toBe(fallback.cells);expect(pbr.removedBlocks).toEqual([]);expect(transferred.world!.guest.tiles).toEqual(held.world!.guest.tiles);
    releaseCoolant();await expect(page.locator('.loading-overlay')).toHaveCount(0,{timeout:30000});
    await expect.poll(()=>page.evaluate(()=>window.kittyMechDebug!.performance().fps),{timeout:30000}).toBeGreaterThan(10);
    await expect.poll(()=>page.evaluate(async()=>{const a=window.kittyMechDebug!.snapshot()!.actors.find(a=>a.name==='ColdCity')!;return a.grounded&&(await window.kittyMechDebug!.contact()).some(c=>c.id===a.id&&c.paws.some(p=>p.valid));})).toBe(true);
    expect(factoryRequests).toBe(1);expect(errors).toEqual([]);
    await testInfo.attach('cold-city-owned-geometry',{body:JSON.stringify({held,transferred,factoryRequests,coolantRequests,scope:'First-load geometry handoff only; initial veil is not qualified late-cold visibility.'}),contentType:'application/json'});
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();
    await expect(page.locator('.hangar')).toBeVisible();await expect.poll(async()=>(await stream()).world).toBeNull();
    await expect.poll(async()=>{const data=await stream();return data.cache.active+data.cache.queued+data.cache.owners;}).toBe(0);
  }finally{releaseFactory();releaseCoolant();await context.unrouteAll({behavior:'wait'});await context.close();}
});

test('a new client returns to the hangar on an incompatible welcome or full snapshot',async({browser},testInfo)=>{
  const evidence=[];
  for(const kind of ['welcome','snapshot'] as const){
    const context=await browser.newContext(),page=await context.newPage();let joins=0;
    try{
      // Deliberate legacy wire fixtures test feedback. They never mutate a real
      // authority; real old/new transport pairing is an independent review gate.
      await page.routeWebSocket('**/arena',socket=>socket.onMessage(message=>{
        const request=JSON.parse(String(message));if(request.type!=='join')return;joins++;
        if(kind==='welcome')socket.send(JSON.stringify({type:'welcome',id:'legacy',room:'OLD',mode:'pvp'}));
        else socket.send(JSON.stringify({type:'snapshot',state:{tick:60,time:1,seed:7734,room:'OLD',mode:'pvp',actors:[],projectiles:[],events:[],fields:[],cover:[],supplies:[],objectives:[],checkpoint:null,phase:'active',winner:null,structures:cityDistrict(7734)!.structures.map(s=>({id:s.id,layoutVersion:1,revision:0,brokenMask:0,hp:s.cells.map(()=>s.maxHp)}))}}));
      }));
      await page.goto(origin()+'/?debug=1');await page.locator('summary').click();await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
      await expect(page.getByRole('alert')).toContainText('different world build');await expect(page.locator('.hangar')).toBeVisible();expect(joins).toBe(1);
      expect(await page.evaluate(()=>window.kittyMechDebug?.snapshot())).toBeNull();evidence.push({kind,joins,error:await page.getByRole('alert').innerText()});
    }finally{await context.close();}
  }
  await testInfo.attach('incompatible-wire-feedback',{body:JSON.stringify(evidence),contentType:'application/json'});
});

test('the dedicated authority rejects legacy and wrong-layout joins before creating a room',async({request},testInfo)=>{
  const before=await (await request.get(origin()+'/health')).json(),evidence=[];
  for(const layoutVersion of [undefined,'unknown-layout']){
    const url=new URL('/arena',origin());url.protocol=url.protocol==='https:'?'wss:':'ws:';
    const result=await new Promise<{code:number;messages:unknown[]}>((resolve,reject)=>{
      const socket=new WebSocket(url),messages:unknown[]=[],timer=setTimeout(()=>{socket.terminate();reject(new Error('Incompatible join did not terminate'));},10000);
      socket.on('open',()=>socket.send(JSON.stringify({type:'join',room:'',name:'LegacyWire',chassis:'pounce',mode:'pvp',create:true,seed:7734,...(layoutVersion?{layoutVersion}:{})})));
      socket.on('message',data=>messages.push(JSON.parse(data.toString())));socket.on('error',reject);socket.on('close',code=>{clearTimeout(timer);resolve({code,messages});});
    });
    expect(result.code).toBe(1008);expect(result.messages).toEqual([{type:'error',message:'This arena uses a different world build. Reload the game and ask the host for a fresh invite.'}]);evidence.push({layoutVersion:layoutVersion??'missing',...result});
  }
  const after=await (await request.get(origin()+'/health')).json();expect(after.rooms).toBe(before.rooms);expect(after.players).toBe(before.players);
  await testInfo.attach('legacy-authority-join-rejection',{body:JSON.stringify({before,after,evidence}),contentType:'application/json'});
});
