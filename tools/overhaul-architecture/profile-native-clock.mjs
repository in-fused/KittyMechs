import RAPIER from '@dimforge/rapier3d-compat';
import {WebSocket,WebSocketServer} from 'ws';
import {monitorEventLoopDelay,PerformanceObserver} from 'node:perf_hooks';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Simulation} from '../../shared/simulation.ts';
import {emptyInput} from '../../shared/types.ts';
import {parseInput} from '../../shared/protocol.ts';
import {TICK_RATE,SNAPSHOT_RATE} from '../../shared/config.ts';

const path=resolve('.sites-runtime/overhaul-20261009/native-clock-profile-001.json');
const runStarted=performance.now(),metrics=new Map(),gc=[],stages=[],callbacks=[],wire={published:0,received:[0,0],receivedBytes:[0,0],skipped:0,maxBuffered:0,bytes:[]};
let stage='warm',timer,seq=0,world,sim,wss,sockets=[],peers=[],failure=null;
const observe=(name,ms)=>{if(stage==='warm')return;const key=stage+':'+name;let m=metrics.get(key);if(!m)metrics.set(key,m={count:0,sum:0,max:0,samples:[]});m.count++;m.sum+=ms;m.max=Math.max(m.max,ms);if(m.samples.length<50000)m.samples.push(ms);};
const measure=(name,fn)=>{const t=performance.now();try{return fn();}finally{observe(name,performance.now()-t);}};
const wrap=(object,key,name=key)=>{const original=object[key];if(typeof original!=='function')throw Error('Missing measured native method '+key);object[key]=function(...args){return measure(name,()=>original.apply(this,args));};};
const stats=values=>{const sorted=[...values].sort((a,b)=>a-b),pick=q=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(q*(sorted.length-1)))]:0;return {count:sorted.length,mean:sorted.reduce((a,b)=>a+b,0)/Math.max(1,sorted.length),p50:pick(.5),p95:pick(.95),p99:pick(.99),max:sorted.at(-1)??0};};
const gcObserver=new PerformanceObserver(list=>{for(const entry of list.getEntries())if(stage!=='warm')gc.push({stage,ms:entry.duration});});gcObserver.observe({entryTypes:['gc']});
const lag=monitorEventLoopDelay({resolution:10});
const route=[{x:-8,z:12},{x:-4,z:-8},{x:-4,z:-21},{x:-4,z:-27},{x:-10,z:-34}],waypoints=[0,0];
function commands(moving){
  seq++;
  for(let i=0;i<2;i++){
    const actor=sim.actors.get('profile-'+i),target=route[Math.min(waypoints[i],route.length-1)],tz=target.z+i*4;
    const dx=target.x-actor.position.x,dz=tz-actor.position.z,d=Math.hypot(dx,dz);
    if(moving&&d<1.1&&waypoints[i]<route.length-1)waypoints[i]++;
    const forward=moving&&d>=1.1?-(dz/d):0,strafe=moving&&d>=1.1?dx/d:0;
    const input=parseInput({...emptyInput(),seq,jumpEpoch:actor.jumpEpoch,strikeEpoch:actor.jumpEpoch,yaw:0,stance:'upright',forward:Math.abs(forward)>.25?Math.sign(forward):0,strafe:Math.abs(strafe)>.25?Math.sign(strafe):0,interact:moving&&waypoints[i]===route.length-1&&d<4});
    if(!input)throw Error('Native profile produced invalid input');sim.setInput(actor.id,input);
  }
}
function counts(){const snapshot=sim.snapshot();return {tick:sim.tick,time:sim.time,actors:snapshot.actors.length,bots:snapshot.actors.filter(a=>a.bot).length,liveBots:snapshot.actors.filter(a=>a.bot&&a.hp>0).length,structures:snapshot.structures.length,cells:snapshot.structures.reduce((n,s)=>n+s.hp.length,0),nativeColliders:world.colliders.len(),nativeBodies:world.bodies.len(),ruins:snapshot.ruins.length,players:snapshot.actors.filter(a=>!a.bot).map(a=>({id:a.id,position:a.position,hp:a.hp,downed:!!a.downed})),npcStates:snapshot.actors.filter(a=>a.bot).reduce((m,a)=>(m[a.aiState]=(m[a.aiState]??0)+1,m),{})};}
try{
  await RAPIER.init();world=new RAPIER.World({x:0,y:-22,z:0});sim=new Simulation(world,7734,'coop','NATIVE-CLOCK');
  sim.addActor('profile-0','Profile host','pounce');sim.addActor('profile-1','Profile guest','pounce');
  for(let i=0;i<300;i++){commands(false);sim.step(1/TICK_RATE);}
  const startCounts=counts();if(startCounts.cells!==996||startCounts.actors!==14||startCounts.bots!==12)throw Error('Actual retained district profile population differs from requested 996/14/12');
  wrap(sim,'step');wrap(world,'step','nativeWorldStep');wrap(sim,'syncChunks');wrap(sim,'snapshot');
  for(const name of ['botInput','navigate','moveCharacter','refreshRuinClimbs','solidRayNormal'])wrap(sim,name);
  wrap(sim.characterMotion,'computeColliderMovementCore','ownedNativeCharacterQuery');
  wss=new WebSocketServer({host:'127.0.0.1',port:0});wss.on('connection',ws=>sockets.push(ws));await once(wss,'listening');
  peers=[0,1].map(i=>{const ws=new WebSocket('ws://127.0.0.1:'+wss.address().port);ws.on('message',data=>{wire.received[i]++;wire.receivedBytes[i]+=data.length;});return ws;});
  await Promise.all(peers.map(ws=>once(ws,'open')));if(sockets.length!==2)throw Error('Loopback profile failed two-party admission');
  lag.enable();const cpuStart=process.cpuUsage(),measuredAt=performance.now(),initialTick=sim.tick;let previous=measuredAt,accumulator=0,broadcast=0,droppedWall=0,maxProjectiles=0,peakActiveNpc=0;
  stage='staging';stages.push({stage,at:0,start:startCounts});
  timer=setInterval(()=>{
    const now=performance.now(),raw=(now-previous)/1000;previous=now;droppedWall+=Math.max(0,raw-.15);accumulator+=Math.min(.15,raw);
    const moving=(now-measuredAt)>=4000;
    if(moving&&stage==='staging'){stages[0].end=counts();stage='route-encounter';stages.push({stage,at:now-measuredAt,start:counts()});}
    let catchup=0;const callbackAt=performance.now();
    try{
      while(accumulator>=1/TICK_RATE){measure('commands',()=>commands(moving));sim.step(1/TICK_RATE);accumulator-=1/TICK_RATE;broadcast++;catchup++;}
      if(broadcast>=TICK_RATE/SNAPSHOT_RATE){
        const snapshot=sim.snapshot(),data=measure('stringify',()=>JSON.stringify({type:'snapshot',state:snapshot}));wire.bytes.push(Buffer.byteLength(data));
        maxProjectiles=Math.max(maxProjectiles,snapshot.projectiles.length);peakActiveNpc=Math.max(peakActiveNpc,snapshot.actors.filter(a=>a.bot&&['attack','windup','pursue'].includes(a.aiState)).length);
        measure('sendBoth',()=>{for(const ws of sockets){wire.maxBuffered=Math.max(wire.maxBuffered,ws.bufferedAmount);if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<256000)ws.send(data);else wire.skipped++;}});wire.published++;broadcast=0;
      }
    }catch(error){failure=String(error);clearInterval(timer);}
    observe('timerCallback',performance.now()-callbackAt);callbacks.push({rawMs:raw*1000,catchup});
  },1000/TICK_RATE);
  await new Promise(resolve=>setTimeout(resolve,15000));clearInterval(timer);timer=undefined;
  const wallMs=performance.now()-measuredAt,cpu=process.cpuUsage(cpuStart),finalCounts=counts();stages.at(-1).end=finalCounts;
  await new Promise(resolve=>setTimeout(resolve,50));lag.disable();
  const result={scope:'One warmed actual fixed-step Rainline native room; two humans and 12 retained NPCs; loopback snapshot drain; no renderer/recording, no physics disable, no clock policy changes',path,failure,warmTicks:300,wallMs,simTicks:sim.tick-initialTick,simMs:(sim.tick-initialTick)*1000/TICK_RATE,simWallRatio:(sim.tick-initialTick)*1000/TICK_RATE/wallMs,droppedWallMs:droppedWall*1000,cpuMs:{user:cpu.user/1000,system:cpu.system/1000,total:(cpu.user+cpu.system)/1000},eventLoopMs:{mean:lag.mean/1e6,p95:lag.percentile(95)/1e6,p99:lag.percentile(99)/1e6,max:lag.max/1e6},callbackIntervals:stats(callbacks.map(c=>c.rawMs)),catchup:stats(callbacks.map(c=>c.catchup)),callbacksOver150ms:callbacks.filter(c=>c.rawMs>150).length,stages,maxProjectiles,peakActiveNpc,wire:{...wire,bytes:stats(wire.bytes)},gc:{count:gc.length,totalMs:gc.reduce((n,g)=>n+g.ms,0),maxMs:Math.max(0,...gc.map(g=>g.ms))},timings:Object.fromEntries([...metrics].map(([key,m])=>[key,{...stats(m.samples),count:m.count,mean:m.sum/m.count,totalMs:m.sum,max:m.max}])),elapsedMs:performance.now()-runStarted};
  await mkdir(resolve('.sites-runtime/overhaul-20261009'),{recursive:true});await writeFile(path,JSON.stringify(result,null,2));console.log(JSON.stringify({path,failure,elapsedMs:result.elapsedMs,wallMs,simWallRatio:result.simWallRatio,droppedWallMs:result.droppedWallMs}));
}catch(error){failure=String(error);console.error(error);process.exitCode=1;}
finally{if(timer)clearInterval(timer);gcObserver.disconnect();lag.disable();for(const peer of peers)peer.terminate();for(const socket of sockets)socket.terminate();if(wss)await new Promise(resolve=>wss.close(resolve));if(sim)sim.dispose();if(world)world.free();}
