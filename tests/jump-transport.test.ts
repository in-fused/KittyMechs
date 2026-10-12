import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {it,expect} from 'vitest';
import {WebSocket,WebSocketServer} from 'ws';
import RAPIER from '@dimforge/rapier3d-compat';
import type {AddressInfo} from 'node:net';
import {Simulation} from '../shared/simulation';
import {emptyInput,type ActorState} from '../shared/types';
import {parseInput,parseJoin} from '../shared/protocol';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';

it('coalesced real WebSocket JSON press/neutral delivery reaches actual Rapier exactly once; legacy join fails closed',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp');
  const server=new WebSocketServer({port:0,host:'127.0.0.1'}),clients:WebSocket[]=[];
  let actor:ActorState|undefined,batch=0;
  server.on('connection',socket=>{
    let joined=false;
    socket.on('message',bytes=>{
      const msg=JSON.parse(bytes.toString());
      if(msg.type==='join'){
        if(!parseJoin(msg)){socket.close(1008,'Input build mismatch');return;}
        joined=true;actor=sim.addActor('wire','Wire','pounce');for(let i=0;i<90;i++)sim.step(1/60);socket.send(JSON.stringify({type:'life',epoch:actor.jumpEpoch}));
      }else if(joined&&msg.type==='input'){
        const input=parseInput(msg.input);if(!input)return;sim.setInput('wire',input);
        if(++batch===2){sim.step(1/60);const first=sim.snapshot().actors.find(a=>a.id==='wire')!;for(let i=0;i<180;i++){sim.setInput('wire',input);sim.step(1/60);}socket.send(JSON.stringify({type:'result',vy:first.velocity.y,processed:first.jumpProcessed,grounded:actor?.grounded}));}
      }
    });
  });
  try {
    await new Promise<void>(resolve=>server.on('listening',resolve));const url=`ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const legacy=new WebSocket(url);clients.push(legacy);
    const close=await new Promise<number>((resolve,reject)=>{legacy.on('error',reject);legacy.on('open',()=>legacy.send(JSON.stringify({type:'join',layoutVersion:WORLD_LAYOUT_VERSION,name:'Old',room:'R',mode:'pvp',chassis:'pounce'})));legacy.on('close',code=>resolve(code));});expect(close).toBe(1008);
    const client=new WebSocket(url);clients.push(client);
    const result=await new Promise<{vy:number;processed:number;grounded:boolean}>((resolve,reject)=>{
      client.on('error',reject);client.on('open',()=>client.send(JSON.stringify({type:'join',inputVersion:INPUT_PROTOCOL_VERSION,layoutVersion:WORLD_LAYOUT_VERSION,name:'New',room:'R',mode:'pvp',chassis:'pounce'})));
      client.on('message',bytes=>{const msg=JSON.parse(bytes.toString());if(msg.type==='life'){
        client.send(JSON.stringify({type:'input',input:{...emptyInput(),seq:10,jumpEpoch:msg.epoch,jumpId:1,jump:true}}));
        client.send(JSON.stringify({type:'input',input:{...emptyInput(),seq:11,jumpEpoch:msg.epoch}}));
      }else if(msg.type==='result')resolve(msg);});
    });
    expect(result.vy).toBeCloseTo(12.2-22/60,7);expect(result.processed).toBe(1);expect(result.grounded).toBe(true);
  }finally{for(const client of clients)client.terminate();for(const socket of server.clients)socket.terminate();await new Promise<void>(resolve=>server.close(()=>resolve()));sim.dispose();world.free();}
});
