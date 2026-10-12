import type RAPIER from '@dimforge/rapier3d-compat';
export interface PhysicsOwner {readonly physicsFailed:boolean;latchPhysicsFailure(error:unknown):void}

/** The provider's native step follows its before-step callbacks. A failed owner
 * must keep this guard closed even if Session cleanup runs inside a callback. */
export function guardOwnedWorldStep(world:RAPIER.World,owner:PhysicsOwner,onFailure:(error:unknown)=>void):()=>void {
  const original=world.step;
  const guarded=(...args:Parameters<RAPIER.World['step']>):void=>{
    if(owner.physicsFailed)return;
    try{original.apply(world,args);}catch(error){owner.latchPhysicsFailure(error);try{onFailure(error);}catch(notificationError){throw new AggregateError([error,notificationError],'Arena step and retirement failed');}throw error;}
  };
  world.step=guarded;
  return()=>{if(!owner.physicsFailed&&world.step===guarded)world.step=original;};
}
