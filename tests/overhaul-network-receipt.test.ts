import {afterEach,describe,expect,it,vi} from 'vitest';
import type {WebSocket} from 'ws';
import type {Simulation} from '../shared/simulation';
import {retireArenaRoom,type ArenaRoom,type ArenaClient} from '../server/arenaRooms';
import {beginNetworkReceipt,networkCloseMessage,noteNetworkAdmission,noteNetworkClose,noteNetworkFailure,noteNetworkPacket,readNetworkReceipt} from '../src/game/networkReceipt';

afterEach(()=>{beginNetworkReceipt(false);vi.restoreAllMocks();});
describe('bounded arena failure receipt',()=>{
  it('distinguishes continuing raw clocks from schema and local ACK rejection and detaches close data',()=>{
    beginNetworkReceipt(true);noteNetworkPacket({type:'snapshot',state:{tick:3612,time:60.2}},1200,10);noteNetworkAdmission('admitted',3612,60.2,11);
    noteNetworkPacket({type:'snapshot',state:{tick:3615,time:60.25}},1200,12);noteNetworkAdmission('schema',3615,60.25,12);
    noteNetworkPacket({type:'snapshot',state:{tick:3618,time:60.3}},1200,13);noteNetworkAdmission('local-ack',3618,60.3,13);
    noteNetworkClose({code:1008,reason:'Input flood',wasClean:true},14);
    const receipt=readNetworkReceipt()!;expect(receipt).toMatchObject({rawTick:3618,admittedTick:3612,snapshots:3,admitted:1,schemaRejected:1,localAckRejected:1,close:{code:1008,reason:'Input flood'}});
    receipt.close!.reason='changed externally';expect(readNetworkReceipt()!.close!.reason).toBe('Input flood');
  });
  it('retains the first server/user cause and makes an otherwise unreported close cause explicit',()=>{
    beginNetworkReceipt(true);noteNetworkFailure('The arena stopped unexpectedly.');
    const message=networkCloseMessage({code:1011,reason:'Arena stopped'});noteNetworkClose({code:1011,reason:'Arena stopped',wasClean:true},20);noteNetworkFailure(message);
    expect(message).toContain('1011: Arena stopped');expect(readNetworkReceipt()!.firstFailure).toBe('The arena stopped unexpectedly.');
    expect(readNetworkReceipt()!.close!.code).toBe(1011);
  });
  it('logs the original room failure with the last authority clock before fallible cleanup',()=>{
    const original=new Error('native contact failure'),cleanup=new Error('native cleanup failure'),log=vi.spyOn(console,'error').mockImplementation(()=>{});
    const sim={tick:3612,time:60.2,latchPhysicsFailure:vi.fn(),dispose:()=>{throw cleanup;},world:{free:vi.fn()}} as unknown as Simulation;
    const ws={readyState:1,bufferedAmount:0,send:vi.fn(),close:vi.fn()} as unknown as WebSocket,room:ArenaRoom={sim,members:new Set([ws]),emptyAt:0},rooms=new Map([['ROOM',room]]),clients=new Map<WebSocket,ArenaClient>([[ws,{id:'pilot',room:'ROOM',rateAt:0,messages:0}]]);
    const errors=retireArenaRoom(rooms,clients,'ROOM',room,original);
    expect(log.mock.calls[0]).toEqual(['Arena retired',{room:'ROOM',tick:3612,time:60.2,members:1},original]);
    expect(errors).toContain(cleanup);expect(sim.latchPhysicsFailure).toHaveBeenCalledWith(original);expect(rooms.size).toBe(0);expect(clients.size).toBe(0);
  });
});
