import type {PoseOwnerResult} from './felinePoseOwner003';
import type {FelinePoseClock} from './felinePoseOwnerManifest003';
export interface PoseFailure003 {key:string;clock:FelinePoseClock;actor:string;result:PoseOwnerResult;durable:'PENDING'|'SAVED'|'FAILED';storageError?:string;}
/** First failure is detached synchronously before live recovery continues.
 * IndexedDB completion is observed separately; PENDING is never called saved.
 * One immutable failure per generation/world/actor/life, bounded to 64 actors. */
export const firstPoseFailures003=new Map<string,PoseFailure003>();
export function preserveFirstPoseFailure003(actor:string,clock:FelinePoseClock,result:PoseOwnerResult):PoseFailure003|null {
  if(result.status!=='UNQUALIFIED')return null;const key=`${clock.generation}:${clock.authorityWorldId}:${actor}:${clock.life}`;
  const existing=firstPoseFailures003.get(key);if(existing)return existing;
  if(firstPoseFailures003.size>=64)return {key,actor,clock:{...clock},result:structuredClone(result),durable:'FAILED',storageError:'FIRST_FAILURE_CAPACITY'};
  const entry:PoseFailure003={key,actor,clock:{...clock},result:structuredClone(result),durable:'PENDING'};firstPoseFailures003.set(key,entry);
  if(typeof indexedDB==='undefined'){entry.durable='FAILED';entry.storageError='INDEXEDDB_UNAVAILABLE';return entry;}
  let open:IDBOpenDBRequest;try{open=indexedDB.open('kittymech-pose-owner003-first-failure',1);}catch(error){entry.durable='FAILED';entry.storageError=String(error);return entry;}
  open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains('failures'))open.result.createObjectStore('failures',{keyPath:'key'});};
  open.onerror=()=>{entry.durable='FAILED';entry.storageError=String(open.error);};
  open.onsuccess=()=>{const db=open.result;try{const tx=db.transaction('failures','readwrite');const {durable,storageError,...payload}=entry;tx.objectStore('failures').add(structuredClone(payload));tx.oncomplete=()=>{entry.durable='SAVED';db.close();};tx.onabort=()=>{entry.durable='FAILED';entry.storageError=String(tx.error);db.close();};tx.onerror=()=>{entry.durable='FAILED';entry.storageError=String(tx.error);};}catch(error){entry.durable='FAILED';entry.storageError=String(error);db.close();}};
  return entry;
}
