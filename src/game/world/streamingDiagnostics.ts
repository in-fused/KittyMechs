import type { Mode } from '../../../shared/types';
import type {CityPresentation} from './cityPresentation';

export interface GuestTileDiagnostic {key:string;terrainHandle:number;colliderCount:number;}
export interface WorldStreamingSnapshot {
  seed:number;mode:Mode;authority:boolean;center:string;
  visibleKeys:string[];readyKeys:string[];
  city?:ReturnType<CityPresentation['snapshot']>;
  cityArt?:'idle'|'loading'|'ready'|'fallback';
  guest:{tiles:GuestTileDiagnostic[];created:number;retired:number;peakTiles:number;
    createdColliders:number;removedColliders:number;coverCount:number;destroyedCoverCount:number;structuralColliders?:number;structures?:{id:string;revision:number;brokenMask:number}[];};
}

let current:{read:()=>WorldStreamingSnapshot}|null=null;

/** A later scene owns its observer even if an earlier scene cleans up afterward. */
export function registerWorldStreamingObserver(read:()=>WorldStreamingSnapshot):()=>void {
  const registration={read};current=registration;
  return()=>{if(current===registration)current=null;};
}

/** Detached, bounded observations; the registry never constructs a world or tile. */
export function readWorldStreamingSnapshot():WorldStreamingSnapshot|null {
  if(!current)return null;
  const value=current.read();
  return {
    seed:value.seed,mode:value.mode,authority:value.authority,center:value.center,
    visibleKeys:value.visibleKeys.slice(0,64),readyKeys:value.readyKeys.slice(0,64),
    cityArt:value.cityArt,
    ...(value.city?{city:{...value.city,revisions:value.city.revisions.map(s=>({...s})),meshes:value.city.meshes.map(m=>({...m,removedBlocks:[...m.removedBlocks]}))}}:{}),
    guest:{created:value.guest.created,retired:value.guest.retired,peakTiles:value.guest.peakTiles,
      createdColliders:value.guest.createdColliders,removedColliders:value.guest.removedColliders,
      coverCount:value.guest.coverCount,destroyedCoverCount:value.guest.destroyedCoverCount,
      structuralColliders:value.guest.structuralColliders??0,structures:value.guest.structures?.map(s=>({...s}))??[],
      tiles:value.guest.tiles.slice(0,16).map(tile=>({key:tile.key,terrainHandle:tile.terrainHandle,colliderCount:tile.colliderCount}))},
  };
}
