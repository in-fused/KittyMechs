import { runtime,cameraDiagnostics } from '../game/runtime';
import { useGameStore } from '../state/store';
import type {ContactDiagnostic,ReadonlyContactDiagnostic} from '../game/entities/pawContact';
import { copyContactDiagnostics } from './contactSnapshot';
import type {WorldStreamingSnapshot} from '../game/world/streamingDiagnostics';
import type {TerrainCacheStats} from '../game/world/terrainCache';
import type {inspectJumpDelivery} from '../game/input';
import type {readAreaEffects} from '../game/effects/areaEffectDiagnostics';
import type {readSurfaceBanks} from '../game/rendering/surfaceDiagnostics';
import type {Vec3} from '../../shared/types';
import {readNetworkReceipt} from '../game/networkReceipt';
function transportSnapshot(){const state=useGameStore.getState();return {connection:state.connection,error:state.error,phase:state.phase,receipt:readNetworkReceipt()};}
declare global {interface Window {kittyMechDebug?: {snapshot:()=>typeof runtime.snapshot;transport:()=>ReturnType<typeof transportSnapshot>;sight:(from:Vec3,to:Vec3)=>boolean|null;performance:()=>ReturnType<typeof useGameStore.getState>['performance'];camera:()=>typeof cameraDiagnostics;contact:()=>Promise<(ContactDiagnostic&{id:string})[]>;input:()=>Promise<ReturnType<typeof inspectJumpDelivery>>;streaming:()=>Promise<{world:WorldStreamingSnapshot|null;cache:TerrainCacheStats}>;effects:()=>Promise<ReturnType<typeof readAreaEffects>>;surfaces:()=>Promise<ReturnType<typeof readSurfaceBanks>>;};}}
let contactDiagnostics:ReadonlyMap<string,ReadonlyContactDiagnostic>|null=null;
async function contactSnapshot():Promise<(ContactDiagnostic&{id:string})[]>{
  // Load only on a diagnostic request, preserving the lazy game/physics entry.
  // Once loaded, detach at invocation before yielding. A dynamic-import wait
  // can otherwise skip a completed long frame while rendering catches up.
  if(contactDiagnostics)return copyContactDiagnostics(contactDiagnostics);
  return import('../game/entities/pawContact').then(({pawContactDiagnostics})=>{
    contactDiagnostics=pawContactDiagnostics;
    return copyContactDiagnostics(pawContactDiagnostics);
  });
}
async function streamingSnapshot(){
  const [{readWorldStreamingSnapshot},{getTerrainCacheStats}]=await Promise.all([
    import('../game/world/streamingDiagnostics'),import('../game/world/terrainCache'),
  ]);
  return {world:readWorldStreamingSnapshot(),cache:getTerrainCacheStats()};
}
async function inputSnapshot(){const {inspectJumpDelivery}=await import('../game/input');return inspectJumpDelivery();}
let effectsReader:typeof readAreaEffects|null=null;
async function effectsSnapshot(){if(effectsReader)return effectsReader();return import('../game/effects/areaEffectDiagnostics').then(({readAreaEffects:read})=>{effectsReader=read;return read();});}
let surfacesReader:typeof readSurfaceBanks|null=null;
async function surfacesSnapshot(){if(surfacesReader)return surfacesReader();return import('../game/rendering/surfaceDiagnostics').then(({readSurfaceBanks:read})=>{surfacesReader=read;return read();});}
// Read-only diagnostics are opt-in; gameplay inputs still pass through normal controls.
if(import.meta.env.DEV||new URLSearchParams(location.search).get('debug')==='1')window.kittyMechDebug={snapshot:()=>runtime.snapshot,transport:transportSnapshot,sight:(from,to)=>runtime.clearRay?.(from,to)??null,performance:()=>useGameStore.getState().performance,camera:()=>({...cameraDiagnostics,position:{...cameraDiagnostics.position},focus:{...cameraDiagnostics.focus}}),contact:contactSnapshot,input:inputSnapshot,streaming:streamingSnapshot,effects:effectsSnapshot,surfaces:surfacesSnapshot};
