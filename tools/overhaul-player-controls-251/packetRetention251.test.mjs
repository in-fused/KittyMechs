import test from 'node:test';import assert from 'node:assert/strict';
import {retainPacket251} from './packetRetention251.mjs';
const pre={actor:{id:'a',jumpEpoch:2},localReadiness:{generation:3}},row=(seq,at,request=0)=>({at,localId:'a',generation:3,input:{seq,jumpEpoch:2,forward:1,stanceRequest:{seq:request,life:2}}}),matches=i=>i.forward>0&&i.stanceRequest.seq>8&&i.stanceRequest.life===2;
test('previous W before new R is not an intended combined action witness',()=>assert.equal(retainPacket251(null,[row(40,12,8)],pre,10,matches),null));
test('a delivered W+R receipt survives bounded ring eviction until independent release ACK',()=>{const intended=row(41,13,9),retained=retainPacket251(null,[intended],pre,10,matches);assert.equal(retained,intended);assert.equal(retainPacket251(retained,[row(100,40)],pre,10,matches),intended);});
test('stale actor, generation, life and pre-edge receipts cannot initialize a witness',()=>{const base=row(41,13,9);for(const bad of [{...base,localId:'other'},{...base,generation:4},{...base,input:{...base.input,jumpEpoch:3}},{...base,at:9}])assert.equal(retainPacket251(null,[bad],pre,10,matches),null);});
