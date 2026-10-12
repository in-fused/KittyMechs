import RAPIER from '@dimforge/rapier3d-compat';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { MAX_PLAYERS, SNAPSHOT_RATE, TICK_RATE } from '../shared/config';
import { parseInput, parseJoin } from '../shared/protocol';
import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import { Simulation } from '../shared/simulation';
import type { ServerMessage } from '../shared/types';
import {admitArenaActor,advanceArenaRooms,broadcastArenaRooms,removeArenaClient,retireArenaRoom,type ArenaRoom,type ArenaClient} from './arenaRooms';
import {arenaClock,arenaRoomClock,beginArenaClock,endArenaClock,readArenaClock,recordArenaClock,recordArenaPump} from './arenaDiagnostics';
import {createClientReports092,handleClientReports092} from './clientReports092';

await RAPIER.init();
const production=process.argv.includes('--production');
const port=Number(process.env.PORT)||8787;
const root=resolve('dist');
const contentTypes:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.wav':'audio/wav','.mp4':'video/mp4','.hdr':'application/octet-stream','.wasm':'application/wasm'};
const rooms=new Map<string,ArenaRoom>();
const clients=new Map<WebSocket,ArenaClient>();
const clientReports092=createClientReports092(),clientReporting092=process.env.KITTYMECH_CLIENT_DIAGNOSTICS==='1';
const send=(ws:WebSocket,message:ServerMessage)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<256000)ws.send(JSON.stringify(message));};
const server=createServer(async(req,res)=>{
  if(await handleClientReports092(req,res,clientReports092,clientReporting092))return;
  if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({status:'ok',rooms:rooms.size,players:clients.size,tickRate:TICK_RATE,...(arenaClock.enabled?{diagnostics:readArenaClock()}: {})}));return;}
  if(!production){res.writeHead(200,{'Content-Type':'text/plain'});res.end('KittyMech arena is ready. Open http://localhost:5173');return;}
  try {
    const url=new URL(req.url??'/', 'http://localhost');
    let file=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+sep)&&file!==root){res.writeHead(403);res.end();return;}
    if(file===root||!(await stat(file).catch(()=>null))?.isFile())file=resolve(root,'index.html');
    let data=await readFile(file);
    if(extname(file)==='.html')data=Buffer.from(data.toString().replace('</head>','<meta name="kittymech-arena" content="same-origin"/>'+(clientReporting092?'<meta name="kittymech-client-report" content="local"/>':'')+'</head>'));
    res.writeHead(200,{'Content-Type':contentTypes[extname(file)]??'application/octet-stream','Cache-Control':extname(file)==='.html'?'no-cache':'public, max-age=3600'});res.end(data);
  }catch{res.writeHead(404);res.end('Asset unavailable');}
});
const wss=new WebSocketServer({server,path:'/arena',maxPayload:4096});
wss.on('connection',ws=>{
  const joinDeadline=setTimeout(()=>{if(!clients.has(ws))ws.close(1008,'Join timeout');},10000);
  ws.on('error',()=>{ /* close cleans up the room */ });
  ws.on('message',buffer=>{
    let message:Record<string,unknown>;
    try{message=JSON.parse(buffer.toString()) as Record<string,unknown>;}catch{return;}
    if(message.type==='join') {
      if(clients.has(ws))return;
      if(message.layoutVersion!==WORLD_LAYOUT_VERSION){send(ws,{type:'error',message:'This arena uses a different world build. Reload the game and ask the host for a fresh invite.'});ws.close(1008,'World build mismatch');return;}
      if(message.inputVersion!==INPUT_PROTOCOL_VERSION){send(ws,{type:'error',message:'This arena uses a different input build. Reload the game and ask the host for a fresh invite.'});ws.close(1008,'Input build mismatch');return;}
      const join=parseJoin(message);if(!join){send(ws,{type:'error',message:'Invalid deployment request.'});return;}
      const code=join.create?randomBytes(3).toString('hex').toUpperCase():join.room;
      let room=rooms.get(code);
      if(!room&&join.create){
        if(rooms.size>=32){send(ws,{type:'error',message:'All arenas are occupied.'});return;}
        const world=new RAPIER.World({x:0,y:-22,z:0});
        try{room={sim:new Simulation(world,join.seed,join.mode,code),members:new Set(),emptyAt:0};rooms.set(code,room);}catch(error){try{world.free();}catch(cleanupError){console.error('Arena initialization cleanup failed',cleanupError);}console.error('Arena initialization failed',error);send(ws,{type:'error',message:'The arena could not start. Try a fresh deployment.'});ws.close(1011,'Arena initialization failed');return;}
      }
      if(!room){send(ws,{type:'error',message:'Arena not found. Ask the host for a fresh invite.'});return;}
      if(room.members.size>=MAX_PLAYERS){send(ws,{type:'error',message:'This arena has eight pilots. Create another.'});return;}
      if(room.sim.phase!=='active'){send(ws,{type:'error',message:'This match has ended. Create a new deployment.'});return;}
      const id=randomUUID(),state=admitArenaActor(rooms,clients,code,room,ws,id,join);if(!state)return;clearTimeout(joinDeadline);
      send(ws,{type:'welcome',id,room:code,mode:room.sim.mode,layoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION});send(ws,{type:'snapshot',state});return;
    }
    const client=clients.get(ws);if(!client)return;
    const now=performance.now();if(now-client.rateAt>1000){client.rateAt=now;client.messages=0;}
    if(++client.messages>150){ws.close(1008,'Input flood');return;}
    if(message.type==='input'){const input=parseInput(message.input),room=rooms.get(client.room);if(input&&room){const start=beginArenaClock();try{room.sim.setInput(client.id,input);}catch(error){retireArenaRoom(rooms,clients,client.room,room,error);}finally{if(start){const admitted=room.sim.inspectRequestedInput(client.id);recordArenaClock(arenaClock,client.room,'input',{...endArenaClock(start),...arenaRoomClock(room.sim),client:client.id,seq:input.seq,forward:input.forward,strafe:input.strafe,yaw:input.yaw,aimYaw:input.aimYaw??input.yaw,jumpEpoch:input.jumpEpoch,admittedSeq:admitted?.input.seq??null,admittedForward:admitted?.input.forward??null,admittedStrafe:admitted?.input.strafe??null,admittedYaw:admitted?.input.yaw??null,admittedAimYaw:admitted?.input.aimYaw??admitted?.input.yaw??null,receivedNativeAt:admitted?.receivedAt??null,actorLastInput:room.sim.actors.get(client.id)?.lastInput??null});}}}
      else if(arenaClock.enabled)recordArenaClock(arenaClock,client.room,'input-rejected',{at:performance.now(),wall:Date.now(),client:client.id,reason:input?'room-missing':'schema'});
    }
    if(message.type==='ping'&&typeof message.time==='number')send(ws,{type:'pong',time:message.time});
  });
  ws.on('close',(code,reason)=>{const client=clients.get(ws),room=client&&rooms.get(client.room);if(client&&room)recordArenaClock(arenaClock,client.room,'client-close',{at:performance.now(),wall:Date.now(),...arenaRoomClock(room.sim),client:client.id,code,reason:reason.toString()});clearTimeout(joinDeadline);removeArenaClient(rooms,clients,ws);});
});
let previous=performance.now(),accumulator=0,broadcast=0;
const timer=setInterval(()=>{
  const start=beginArenaClock();
  const now=performance.now(),gapMs=now-previous;accumulator+=Math.min(.15,(now-previous)/1000);previous=now;
  let steps=0;const accumulatorBefore=accumulator;
  while(accumulator>=1/TICK_RATE){advanceArenaRooms(rooms,clients,1/TICK_RATE);accumulator-=1/TICK_RATE;broadcast++;steps++;}
  const published=broadcast>=TICK_RATE/SNAPSHOT_RATE;
  if(published){broadcastArenaRooms(rooms,clients);broadcast=0;}
  for(const [code,room] of [...rooms])if(room.emptyAt&&now-room.emptyAt>60000)retireArenaRoom(rooms,clients,code,room,new Error('Empty arena expired'));
  if(start)recordArenaPump(arenaClock,{...endArenaClock(start),gapMs,clippedMs:Math.max(0,gapMs-150),accruedMs:Math.min(150,gapMs),accumulatorBeforeMs:accumulatorBefore*1000,accumulatorAfterMs:accumulator*1000,steps,published,rooms:rooms.size,players:clients.size});
},1000/TICK_RATE);
server.listen(port,'0.0.0.0',()=>console.log(`KittyMech authoritative arena: http://localhost:${port} | ${TICK_RATE} Hz | ${production?'production':'development'}`));
function shutdown(){clearInterval(timer);for(const [code,room] of [...rooms])retireArenaRoom(rooms,clients,code,room,new Error('Arena server stopped'));wss.close();server.close(()=>process.exit(0));}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
