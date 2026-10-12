import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openSync,writeSync,fsyncSync,closeSync,statSync,mkdirSync,readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {validateRecordedNumbers} from './geometry';
import RAPIER from '@dimforge/rapier3d-compat';

export const OUT=resolve('.sites-runtime/overhaul-20261010/overhaul-street-owner-boundary-001');
const CAP=128*1024*1024,RESERVE=32*1024*1024;
export const hash=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
// Invalid raw values remain distinguishable in durable JSON; validation uses originals.
export const json=(v:unknown)=>JSON.stringify(v,(_k,x:unknown)=>typeof x==='number'&&!Number.isFinite(x)?{rawNonfiniteNumber:String(x)}:ArrayBuffer.isView(x)?Array.from(x as unknown as ArrayLike<number>):x);
export class Evidence {
  private fd:number;private offset=0;private seq=0;private previous='GENESIS';private closed=false;
  constructor(){mkdirSync(OUT,{recursive:true});this.fd=openSync(resolve(OUT,'raw.ndjson'),'wx');}
  private artifactBytes(){return readdirSync(OUT).reduce((sum,name)=>{const s=statSync(resolve(OUT,name));return sum+(s.isFile()?s.size:0);},0);}
  guard(){assert.ok(this.artifactBytes()<CAP-RESERVE,'artifact normal capacity exhausted before native query/step');}
  row(kind:string,data:unknown,validate=true){
    assert.ok(!this.closed,'writer closed');const payload={seq:++this.seq,offset:this.offset,previousSha256:this.previous,kind,data};
    const raw=json(payload),bytes=Buffer.from(raw+'\n');assert.ok(this.artifactBytes()+bytes.length<=CAP,'artifact hard cap failure');
    let written=0;while(written<bytes.length){const n=writeSync(this.fd,bytes,written,bytes.length-written);assert.ok(n>0,'zero durable write');written+=n;}
    fsyncSync(this.fd);this.offset+=bytes.length;this.previous=hash(raw);assert.equal(statSync(resolve(OUT,'raw.ndjson')).size,this.offset);
    if(validate)validateRecordedNumbers(data);return this.previous;
  }
  verify(){const seal=JSON.parse(readFileSync(resolve(OUT,'source-seal.json'),'utf8')) as {inputs:{path:string;sha256:string}[]};return seal.inputs.map(r=>{const actual=hash(readFileSync(r.path));assert.equal(actual.toUpperCase(),r.sha256.toUpperCase(),`sealed input changed: ${r.path}`);return {path:r.path,sha256:actual};});}
  close(){if(!this.closed){fsyncSync(this.fd);closeSync(this.fd);this.closed=true;}}
}

// Copies data only. Never calls native readers during a query callback/borrow.
export function plainNative(value:unknown):unknown {
  if(value instanceof RAPIER.Collider)return {nativeColliderHandle:value.handle};
  if(value instanceof RAPIER.RigidBody)return {nativeBodyHandle:value.handle};
  if(ArrayBuffer.isView(value))return Array.from(value as unknown as ArrayLike<number>);
  if(Array.isArray(value))return value.map(plainNative);
  if(typeof value==='function')return {callback:'original query predicate/callback; unchanged'};
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,plainNative(v)]));
  return value;
}
export function observeQueries(e:Evidence,world:RAPIER.World,label:string,clock:()=>unknown){
  const originals:{object:Record<string,unknown>;name:string;original:(...args:unknown[])=>unknown}[]=[];
  const shapes=new Set<string>();
  const request=(v:unknown):unknown=>{
    if(v instanceof RAPIER.Shape){const data=plainNative(v),key=hash(json(data));if(!shapes.has(key)){e.row('immutable-native-query-shape-once',{geometrySha256:key,data});shapes.add(key);}return {nativeQueriedShapeSha256:key};}
    return plainNative(v);
  };
  const validateResult=(name:string,value:unknown,args:unknown[],handle?:number)=>{
    if(name==='castRay'&&typeof value==='number'){assert.ok(value===-1||(value>=0&&value<=Number(args[1])),'native ray scalar invalid interval');return;}
    if(!value||typeof value!=='object')return;const raw=value as Record<string,unknown>;
    if('timeOfImpact' in raw)assert.ok(typeof raw.timeOfImpact==='number'&&raw.timeOfImpact>=0&&raw.timeOfImpact<=Number(args[1]),'native ray invalid interval');
    if('time_of_impact' in raw)assert.ok(typeof raw.time_of_impact==='number'&&raw.time_of_impact>=0&&raw.time_of_impact<=Number(args[handle===undefined?5:6]),'native cast invalid interval');
  };
  const wrap=(object:Record<string,unknown>,name:string,handle?:number)=>{const original=object[name];if(typeof original!=='function')return;originals.push({object,name,original:original as (...args:unknown[])=>unknown});object[name]=function(this:unknown,...args:unknown[]){e.guard();const requested=args.map(request);e.row('native-query-request',{clock:clock(),world:label,colliderHandle:handle,method:name,requested});try{const value=(original as (...args:unknown[])=>unknown).apply(this,args);e.row('native-query-return',{clock:clock(),world:label,colliderHandle:handle,method:name,raw:plainNative(value)});validateResult(name,value,args,handle);return value;}catch(error){e.row('native-query-threw',{clock:clock(),world:label,colliderHandle:handle,method:name,error:String(error)},false);throw error;}};};
  for(const name of ['castRay','castRayAndGetNormal','castShape','projectPoint','intersectionsWithShape','collidersWithAabbIntersectingAabb','contactPair','contactPairsWith'])wrap(world as unknown as Record<string,unknown>,name);
  const create=world.createCollider.bind(world);
  world.createCollider=(...args:Parameters<RAPIER.World['createCollider']>)=>{e.guard();const c=create(...args);for(const name of ['castRay','castRayAndGetNormal','castShape','contactCollider','contactShape','projectPoint','projectPointAndGetFeature'])wrap(c as unknown as Record<string,unknown>,name,c.handle);return c;};
  // Restore the world factory separately; no production owner disposal relies on observers.
  return ()=>{world.createCollider=create;for(const o of originals)o.object[o.name]=o.original;};
}

