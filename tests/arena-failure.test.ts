import {beforeAll,describe,expect,it,vi} from 'vitest';
import {once} from 'node:events';
import {WebSocket,WebSocketServer} from 'ws';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import type {GameSnapshot} from '../shared/types';
import {admitArenaActor,advanceArenaRooms,broadcastArenaRooms,removeArenaClient,retireArenaRoom,type ArenaRoom,type ArenaClient} from '../server/arenaRooms';

beforeAll(async()=>{await RAPIER.init();});
async function fixture(test:(f:{rooms:Map<string,ArenaRoom>;clients:Map<WebSocket,ArenaClient>;connect:(code:string)=>Promise<{room:ArenaRoom;server:WebSocket;client:WebSocket;messages:{type:string;state?:GameSnapshot}[];state:GameSnapshot}>})=>Promise<void>){
  const rooms=new Map<string,ArenaRoom>(),clients=new Map<WebSocket,ArenaClient>(),wss=new WebSocketServer({host:'127.0.0.1',port:0}),peers:WebSocket[]=[];
  await once(wss,'listening');const address=wss.address();if(typeof address==='string'||!address)throw Error('Missing test WebSocket address');const port=address.port;let serial=0;
  async function connect(code:string){
    let room=rooms.get(code);if(!room){room={sim:new Simulation(new RAPIER.World({x:0,y:-22,z:0}),1926,'pvp',code),members:new Set(),emptyAt:0};rooms.set(code,room);}
    const incoming=once(wss,'connection'),client=new WebSocket(`ws://127.0.0.1:${port}`);client.on('error',()=>{});peers.push(client);await once(client,'open');
    const [server]=await incoming as [WebSocket];server.on('error',()=>{});server.on('close',()=>removeArenaClient(rooms,clients,server));
    const messages:{type:string;state?:GameSnapshot}[]=[];client.on('message',data=>messages.push(JSON.parse(data.toString()) as {type:string;state?:GameSnapshot}));
    const id=`${code}-${++serial}`;const state=admitArenaActor(rooms,clients,code,room,server,id,{name:'Native test pilot',chassis:'pounce'});expect(state).not.toBeNull();
    return{room,server,client,messages,state:state!};
  }
  try{await test({rooms,clients,connect});}finally{
    for(const [code,room] of [...rooms])retireArenaRoom(rooms,clients,code,room,Error('Test arena cleanup'));
    for(const client of peers)client.terminate();await new Promise<void>(resolve=>wss.close(()=>resolve()));
  }
}

describe('dedicated adapters isolate failed native rooms over real WebSockets',()=>{
  it('distinguishes same-tick bootstrap, shared broadcast, removal and recreated room publications',async()=>fixture(async f=>{
    const host=await f.connect('IDENTITY'),initial=host.state;
    expect(initial.publication).toMatchObject({sequence:1,kind:'bootstrap'});
    const first=once(host.client,'message');broadcastArenaRooms(f.rooms,f.clients);await first;
    const beforeJoin=host.messages.at(-1)!.state!;
    expect(beforeJoin.publication).toMatchObject({roomEpoch:initial.publication!.roomEpoch,sequence:2,kind:'broadcast'});
    const guest=await f.connect('IDENTITY'),bootstrap=guest.state;
    expect(bootstrap.tick).toBe(beforeJoin.tick);expect(bootstrap.time).toBe(beforeJoin.time);
    expect(bootstrap.actors).toHaveLength(beforeJoin.actors.length+1);
    expect(bootstrap.publication).toMatchObject({roomEpoch:initial.publication!.roomEpoch,sequence:3,kind:'bootstrap'});
    // The immediate join snapshot is delivered only to its joining socket.
    const bootstrapMessage=once(guest.client,'message');guest.server.send(JSON.stringify({type:'snapshot',state:bootstrap}));await bootstrapMessage;
    expect(guest.messages.at(-1)!.state!.publication).toEqual(bootstrap.publication);
    expect(host.messages.at(-1)!.state!.publication).toEqual(beforeJoin.publication);
    const both=[once(host.client,'message'),once(guest.client,'message')];broadcastArenaRooms(f.rooms,f.clients);await Promise.all(both);
    const shared=host.messages.at(-1)!.state!;
    expect(shared).toEqual(guest.messages.at(-1)!.state);
    expect(shared.publication).toMatchObject({roomEpoch:initial.publication!.roomEpoch,sequence:4,kind:'broadcast'});
    expect(shared.tick).toBe(initial.tick);expect(shared.time).toBe(initial.time);
    const guestId=f.clients.get(guest.server)!.id,guestCount=guest.messages.length;
    removeArenaClient(f.rooms,f.clients,guest.server);
    const afterRemove=once(host.client,'message');broadcastArenaRooms(f.rooms,f.clients);await afterRemove;
    const removed=host.messages.at(-1)!.state!;
    expect(removed.publication).toMatchObject({sequence:5,kind:'broadcast'});
    expect(removed.tick).toBe(shared.tick);expect(removed.time).toBe(shared.time);
    expect(removed.actors.some(a=>a.id===guestId)).toBe(false);expect(guest.messages).toHaveLength(guestCount);
    const closed=once(host.client,'close');retireArenaRoom(f.rooms,f.clients,'IDENTITY',host.room,Error('Identity retirement'));await closed;
    const retiredMessages=host.messages.length,snapshot=vi.spyOn(host.room.sim,'snapshot');
    broadcastArenaRooms(f.rooms,f.clients);expect(snapshot).not.toHaveBeenCalled();expect(host.messages).toHaveLength(retiredMessages);snapshot.mockRestore();
    const recreated=await f.connect('IDENTITY');
    expect(recreated.state.publication).toMatchObject({sequence:1,kind:'bootstrap'});
    expect(recreated.state.publication!.roomEpoch).not.toBe(initial.publication!.roomEpoch);
    expect(recreated.state.tick).toBe(initial.tick);
  }));

  it('retires a native-step failure before broadcast while another room keeps ticking',async()=>fixture(async f=>{
    const bad=await f.connect('BAD'),good=await f.connect('GOOD'),native=bad.room.sim.world.step.bind(bad.room.sim.world),failure=Error('Injected native world-step failure');
    bad.room.sim.world.step=(...args)=>{native(...args);throw failure;};
    let closeSawRetirement=false;bad.server.on('close',()=>{closeSawRetirement=!f.rooms.has('BAD')&&!f.clients.has(bad.server)&&bad.room.members.size===0;});
    const closed=once(bad.client,'close'),serverClosed=once(bad.server,'close'),message=once(good.client,'message');advanceArenaRooms(f.rooms,f.clients,1/60);broadcastArenaRooms(f.rooms,f.clients);
    const [code]=await closed;await serverClosed;await message;expect(code).toBe(1011);expect(bad.room.sim.physicsFailed).toBe(true);expect(closeSawRetirement).toBe(true);
    expect(bad.messages.map(m=>m.type)).toEqual(['error']);expect(good.messages.map(m=>m.type)).toEqual(['snapshot']);expect(good.room.sim.tick).toBe(1);
    expect(f.rooms.has('GOOD')).toBe(true);expect(f.clients.has(good.server)).toBe(true);advanceArenaRooms(f.rooms,f.clients,1/60);expect(good.room.sim.tick).toBe(2);
  }));

  it('retires a failed snapshot without broadcasting that room or disrupting another',async()=>fixture(async f=>{
    const bad=await f.connect('BAD'),good=await f.connect('GOOD');bad.room.sim.snapshot=()=>{throw Error('Injected snapshot failure');};
    const closed=once(bad.client,'close'),message=once(good.client,'message');broadcastArenaRooms(f.rooms,f.clients);await closed;await message;
    expect(f.rooms.has('BAD')).toBe(false);expect(f.clients.has(bad.server)).toBe(false);expect(bad.messages.map(m=>m.type)).toEqual(['error']);expect(good.messages.map(m=>m.type)).toEqual(['snapshot']);
  }));

  it('rejects a new join snapshot failure and clears the existing room first',async()=>fixture(async f=>{
    const existing=await f.connect('BAD');existing.room.sim.snapshot=()=>{throw Error('Injected late join snapshot failure');};
    // A second genuine server socket is not registered until its snapshot exists.
    const server=new WebSocketServer({host:'127.0.0.1',port:0});await once(server,'listening');const address=server.address();if(typeof address==='string'||!address)throw Error('Missing join test address');
    const incoming=once(server,'connection'),joining=new WebSocket(`ws://127.0.0.1:${address.port}`);joining.on('error',()=>{});await once(joining,'open');const [socket]=await incoming as [WebSocket];socket.on('error',()=>{});
    const messages:{type:string}[]=[];joining.on('message',data=>messages.push(JSON.parse(data.toString()) as {type:string}));
    try{const closed=once(joining,'close'),oldClosed=once(existing.client,'close');const state=admitArenaActor(f.rooms,f.clients,'BAD',existing.room,socket,'late',{name:'Late pilot',chassis:'lynx'});expect(state).toBeNull();await closed;await oldClosed;
      expect(f.rooms.size).toBe(0);expect(f.clients.size).toBe(0);expect(existing.room.members.size).toBe(0);expect(messages.map(m=>m.type)).toEqual(['error']);
    }finally{joining.terminate();await new Promise<void>(resolve=>server.close(()=>resolve()));}
  }));

  it('continues socket/world cleanup after independent cleanup faults',async()=>fixture(async f=>{
    const bad=await f.connect('BAD'),good=await f.connect('GOOD'),dispose=bad.room.sim.dispose.bind(bad.room.sim),free=bad.room.sim.world.free.bind(bad.room.sim.world),logged=vi.spyOn(console,'error').mockImplementation(()=>{});let freed=0;
    bad.server.close=()=>{throw Error('Injected close failure');};bad.room.sim.dispose=()=>{dispose();throw Error('Injected disposal failure');};bad.room.sim.world.free=()=>{freed++;free();};
    try{const closed=once(bad.client,'close');const errors=retireArenaRoom(f.rooms,f.clients,'BAD',bad.room,Error('Failed arena'));await closed;
      expect(errors).toHaveLength(2);expect(freed).toBe(1);expect(logged).toHaveBeenCalled();expect(f.rooms.has('BAD')).toBe(false);expect(f.clients.has(bad.server)).toBe(false);expect(bad.room.members.size).toBe(0);
      advanceArenaRooms(f.rooms,f.clients,1/60);expect(good.room.sim.tick).toBe(1);expect(retireArenaRoom(f.rooms,f.clients,'BAD',bad.room,Error('Duplicate retirement'))).toEqual([]);expect(freed).toBe(1);
    }finally{logged.mockRestore();}
  }));
});
