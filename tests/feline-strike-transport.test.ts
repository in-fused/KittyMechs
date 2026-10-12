import {it,expect} from 'vitest';
import {WebSocket,WebSocketServer} from 'ws';
import RAPIER from '@dimforge/rapier3d-compat';
import type {AddressInfo} from 'node:net';
import {Simulation} from '../shared/simulation';
import {parseInput,parseJoin} from '../shared/protocol';
import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import {emptyInput} from '../shared/types';
it('real WebSocket press/neutral coalescing strikes once and rejects the old input build',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,1926,'pvp'),server=new WebSocketServer({port:0,host:'127.0.0.1'}),clients:WebSocket[]=[];
  sim.time=3;const source=sim.addActor('wire','Wire','pounce',false,{x:200,y:24,z:208}),target=sim.addActor('target','Target','pounce',false,{x:200,y:24,z:202});
  (sim as unknown as {physics:Map<string,{protectedUntil:number}>}).physics.get(target.id)!.protectedUntil=0;
  server.on('connection',socket=>{let joined=false,count=0;socket.on('message',bytes=>{const msg=JSON.parse(bytes.toString());if(msg.type==='join'){if(!parseJoin(msg)){socket.close(1008,'Input build mismatch');return;}joined=true;socket.send(JSON.stringify({type:'life',epoch:source.jumpEpoch}));}else if(joined&&msg.type==='input'){const input=parseInput(msg.input);if(!input)return;sim.setInput(source.id,input);if(++count===2){for(let i=0;i<30;i++)sim.step(1/60);socket.send(JSON.stringify({type:'result',processed:source.strikeProcessed,hp:target.hp,impacts:sim.events.filter(e=>e.type==='impact'&&e.actor===source.id&&e.target===target.id).length}));}}});});
  try {
    await new Promise<void>(resolve=>server.on('listening',resolve));const url=`ws://127.0.0.1:${(server.address() as AddressInfo).port}`,join={type:'join',layoutVersion:WORLD_LAYOUT_VERSION,name:'Wire',room:'R',mode:'pvp',chassis:'pounce'};
    const legacy=new WebSocket(url);clients.push(legacy);expect(await new Promise<number>((resolve,reject)=>{legacy.on('error',reject);legacy.on('open',()=>legacy.send(JSON.stringify({...join,inputVersion:2})));legacy.on('close',code=>resolve(code));})).toBe(1008);
    const client=new WebSocket(url);clients.push(client);const result=await new Promise<{processed:number;hp:number;impacts:number}>((resolve,reject)=>{client.on('error',reject);client.on('open',()=>client.send(JSON.stringify({...join,inputVersion:INPUT_PROTOCOL_VERSION})));client.on('message',bytes=>{const msg=JSON.parse(bytes.toString());if(msg.type==='life'){client.send(JSON.stringify({type:'input',input:{...emptyInput(),seq:1,strikeEpoch:msg.epoch,strikeId:1,strike:true,boost:true}}));client.send(JSON.stringify({type:'input',input:{...emptyInput(),seq:2,strikeEpoch:msg.epoch}}));}else if(msg.type==='result')resolve(msg);});});expect(result).toEqual({type:'result',processed:1,hp:170,impacts:1});
  }finally{for(const client of clients)client.terminate();for(const socket of server.clients)socket.terminate();await new Promise<void>(resolve=>server.close(()=>resolve()));sim.dispose();world.free();}
});
