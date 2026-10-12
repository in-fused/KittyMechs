import type {PoseOwnerResult} from './felinePoseOwner004';
import type {FelinePoseClock} from './felinePoseOwnerManifest004';
export interface PoseFailure004 {key:string;clock:FelinePoseClock;actor:string;result:PoseOwnerResult;durable:'PENDING'|'SAVED'|'FAILED';storageError?:string;}
/** First failure is detached synchronously before live recovery continues.
 * IndexedDB completion is observed separately; PENDING is never called saved.
 * One immutable failure per generation/world/actor/life, bounded to 64 actors. */
export const firstPoseFailures004=new Map<string,PoseFailure004>();
export function preserveFirstPoseFailure004(actor:string,clock:FelinePoseClock,result:PoseOwnerResult):PoseFailure004|null {
  if(result.status!=='UNQUALIFIED')return null;const key=`${clock.generation}:${clock.authorityWorldId}:${actor}:${clock.life}`;
  const existing=firstPoseFailures004.get(key);if(existing)return existing;
  if(firstPoseFailures004.size>=64)return {key,actor,clock:{...clock},result:structuredClone(result),durable:'FAILED',storageError:'FIRST_FAILURE_CAPACITY'};
  const entry:PoseFailure004={key,actor,clock:{...clock},result:structuredClone(result),durable:'PENDING'};firstPoseFailures004.set(key,entry);
  if(typeof indexedDB==='undefined'){entry.durable='FAILED';entry.storageError='INDEXEDDB_UNAVAILABLE';return entry;}
  let open:IDBOpenDBRequest;try{open=indexedDB.open('kittymech-pose-owner004-first-failure',1);}catch(error){entry.durable='FAILED';entry.storageError=String(error);return entry;}
  open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains('failures'))open.result.createObjectStore('failures',{keyPath:'key'});};
  open.onerror=()=>{entry.durable='FAILED';entry.storageError=String(open.error);};
  open.onsuccess=()=>{const db=open.result;try{const tx=db.transaction('failures','readwrite');const {durable,storageError,...payload}=entry;tx.objectStore('failures').add(structuredClone(payload));tx.oncomplete=()=>{entry.durable='SAVED';db.close();};tx.onabort=()=>{entry.durable='FAILED';entry.storageError=String(tx.error);db.close();};tx.onerror=()=>{entry.durable='FAILED';entry.storageError=String(tx.error);};}catch(error){entry.durable='FAILED';entry.storageError=String(error);db.close();}};
  return entry;
}

