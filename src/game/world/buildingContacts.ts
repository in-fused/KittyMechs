import type RAPIER from '@dimforge/rapier3d-compat';

type Resolver=(id:string)=>RAPIER.Collider|undefined;
const owners=new WeakMap<RAPIER.World,Resolver>();
/** Queries use current scene-owned handles, never serialized Rapier handles or
 * a second collision world. Disposal cannot clear a replacement scene owner. */
export function registerBuildingContacts(world:RAPIER.World,resolve:Resolver):()=>void{
  owners.set(world,resolve);
  return()=>{if(owners.get(world)===resolve)owners.delete(world);};
}
export function ownsBuildingContact(world:RAPIER.World,ids:readonly string[],collider:RAPIER.Collider):boolean{
  if(!collider.isValid())return false;
  const resolve=owners.get(world);return !!resolve&&ids.some(id=>resolve(id)?.handle===collider.handle);
}
