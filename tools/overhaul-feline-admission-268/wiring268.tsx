import {Component,Suspense,useCallback,useMemo,useEffect,useState,type ReactNode,type ErrorInfo} from 'react';
import {useGLTF} from '@react-three/drei';
import type {ActorState} from '../../shared/types';
import {MAX_PLAYERS} from '../../shared/config';
import {NativeActor218} from '../overhaul-native-integration-222/NativeActor222';
import type {Contract214} from '../overhaul-native-integration-222/nativeOwner218';
export interface PrivateDelivery218 {contract:Contract214;qualification:{privateOnly:true;packedFromSHA256:string;allArrayLoaderReceiptSHA256:string;deliveryBaseSHA256:string;geometryAncestorSHA256:string;authoredSourceSHA256:string};}
const base221='5147c2c2e46f4b2328d5d97ac091da70204244cb68882592d6328cec53489473',source264='a1aa8bab5601a12448a169602827146b226b126e6012bf7a94cf44d0c13fa9d6';
const raw209='64cc5c99ffb7ca038c20e56b50e0281643559cd44db2fd92deab48ca134864e7',sha=(s:string)=>/^[0-9a-f]{64}$/.test(s);
export function privateRequested218(actor:Pick<ActorState,'chassis'|'bot'>,preview:boolean,delivery:PrivateDelivery218|null|undefined,debug005:boolean){return !!delivery&&preview&&!debug005&&!actor.bot&&actor.chassis==='pounce'&&delivery.qualification.privateOnly===true&&delivery.qualification.packedFromSHA256===base221&&delivery.qualification.deliveryBaseSHA256===base221&&delivery.qualification.geometryAncestorSHA256===raw209&&delivery.qualification.authoredSourceSHA256===source264&&sha(delivery.qualification.allArrayLoaderReceiptSHA256)&&delivery.contract.sha256===source264&&delivery.contract.publicURL==='/assets/private/Pounce_Feline264.glb'&&Object.keys(delivery.contract.clips).length===47;}
type Scope218={actor:string;generation:number;assetSHA256:string;token:symbol};
export function createRegistry218(){
 const rows=new Map<string,{scope:Scope218;diagnostic:any}>(),loads=new Map<string,{scope:Scope218;reason:string}>(),actors=new Map<string,number>();let generation=-1,asset:string|null=null;
 return {
  observe(current:Pick<ActorState,'id'|'jumpEpoch'>[],gen:number,assetSHA:string|null){generation=gen;asset=assetSHA;actors.clear();for(const a of current)actors.set(a.id,a.jumpEpoch);for(const [id,e] of rows)if(!actors.has(id)||e.scope.generation!==gen||e.scope.assetSHA256!==asset)rows.delete(id);for(const [id,e] of loads)if(!actors.has(id)||e.scope.generation!==gen||e.scope.assetSHA256!==asset)loads.delete(id);},
  publish(scope:Scope218,diagnostic:any|null){if(diagnostic===null){if(rows.get(scope.actor)?.scope.token===scope.token)rows.delete(scope.actor);return;}if(!rows.has(scope.actor)&&rows.size>=MAX_PLAYERS)throw Error('218_PEER_REGISTRY_PLAYER_CAP');rows.set(scope.actor,{scope,diagnostic});},
  loadFailure(scope:Scope218,error:unknown){loads.set(scope.actor,{scope,reason:String(error)});},
  forget(scope:Scope218){if(rows.get(scope.actor)?.scope.token===scope.token)rows.delete(scope.actor);if(loads.get(scope.actor)?.scope.token===scope.token)loads.delete(scope.actor);},
  compatible(id:string){const e=rows.get(id),life=actors.get(id),d=e?.diagnostic;return !!e&&e.scope.generation===generation&&e.scope.assetSHA256===asset&&life!==undefined&&d.actorPresent===true&&d.actor===id&&d.generation===generation&&d.life===life&&d.assetSHA256===asset&&d.browserClipContract?.expected===47&&d.browserClipContract?.loaded===47&&d.browserClipContract?.passed===true&&!d.fatal&&d.status!=='disposed'&&!loads.has(id);},
  read(){return {generation,assetSHA256:asset,contactQualified:false,rows:[...rows.values()].map(e=>({actor:e.scope.actor,generation:e.scope.generation,assetSHA256:e.scope.assetSHA256,diagnostic:structuredClone(e.diagnostic)})),loadFailures:[...loads.values()].map(e=>({actor:e.scope.actor,generation:e.scope.generation,assetSHA256:e.scope.assetSHA256,reason:e.reason}))};}
 };
}
type Registry218=ReturnType<typeof createRegistry218>;
class AssetBoundary218 extends Component<{fallback:ReactNode;onFailure:(e:unknown)=>void;children:ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:Error,_info:ErrorInfo){this.props.onFailure(error);}
 render(){return this.state.failed?this.props.fallback:this.props.children;}
}
/** Parent key includes ID/generation/SHA. Flag OFF unmounts this complete slot;
 * an explicit later ON remount resets the boundary. No automatic cache retry. */
const failedURLs218=new Map<string,string>();
export function NativeSlot218({actor,generation,delivery,registry,fallback,resetToken}:{actor:Pick<ActorState,'id'>;generation:number;delivery:PrivateDelivery218;registry:Registry218;fallback:ReactNode;resetToken:string}){
 const scope=useMemo(()=>({actor:actor.id,generation,assetSHA256:delivery.contract.sha256,token:Symbol('218-owner')}),[actor.id,generation,delivery.contract.sha256]);
 const publish=useCallback((id:string,d:any|null)=>{if(id!==scope.actor)throw Error('218_DIAGNOSTIC_ACTOR');registry.publish(scope,d);},[registry,scope]);
 const url=delivery.contract.publicURL+'?sha='+delivery.contract.sha256.slice(0,12);
 const fail=useCallback((e:unknown)=>{registry.loadFailure(scope,e);if(!failedURLs218.has(url)&&failedURLs218.size>=MAX_PLAYERS)failedURLs218.delete(failedURLs218.keys().next().value!);failedURLs218.set(url,resetToken);},[registry,scope,url,resetToken]);
 const peer=useCallback((id:string)=>registry.compatible(id),[registry]);
 const dispose=useCallback(()=>registry.forget(scope),[registry,scope]),[ready,setReady]=useState(false);
 useEffect(()=>{const failed=failedURLs218.get(url);if(failed!==undefined&&failed!==resetToken){useGLTF.clear(url);failedURLs218.delete(url);}setReady(true);return()=>registry.forget(scope);},[url,resetToken,registry,scope]);
 // One shared attempt token changes only on explicit toggle/newgen/newSHA.
 // Other actors mounting inside the same failed attempt never clear/retry.
 return ready?<AssetBoundary218 fallback={fallback} onFailure={fail}><Suspense fallback={fallback}><NativeActor218 actor={actor} contract={delivery.contract} fallback={fallback} peerCompatible={peer} onDiagnostic={publish} onDispose={dispose}/></Suspense></AssetBoundary218>:<>{fallback}</>;
}
