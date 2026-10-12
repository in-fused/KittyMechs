import type RAPIER from '@dimforge/rapier3d-compat';

/** Compound native query classification experiment. Foreign bodies never enter
 * the provider. This changes no filter arguments and supplies no hull clearance.
 * Caller reads computed collisions and stages actor motion after this returns. */
export class OwnedCharacterQuery {
  private active=false;
  constructor(private readonly rapier:typeof RAPIER,private readonly ownedBodies:()=>Iterable<RAPIER.RigidBody>){}
  computeColliderMovement(controller:RAPIER.KinematicCharacterController,...args:Parameters<RAPIER.KinematicCharacterController['computeColliderMovement']>):void {
    if(this.active)throw Error('Reentrant owned character query');
    this.active=true;
    try{
      if(args[2]!==this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC){controller.computeColliderMovement(...args);return;}
      const bodies=[...this.ownedBodies()];
      // Non-position bodies/nonzero angular velocity are unsupported: preserve
      // the original native query rather than partially classify the ownership set.
      if(bodies.some(body=>body.bodyType()!==this.rapier.RigidBodyType.KinematicPositionBased||Object.values(body.angvel()).some(value=>value!==0))){controller.computeColliderMovement(...args);return;}
      const saved=bodies.map(body=>({body,type:body.bodyType(),velocity:{...body.linvel()}}));
      const failures:unknown[]=[];
      try{
        for(const {body} of saved)body.setBodyType(this.rapier.RigidBodyType.Fixed,false);
        controller.computeColliderMovement(...args);
      }catch(error){failures.push(error);}
      finally{
        // Attempt every cleanup even after a partial flip or prior restore failure.
        for(const {body,type,velocity} of saved){
          try{body.setBodyType(this.rapier.RigidBodyType.KinematicVelocityBased,false);body.setLinvel(velocity,false);}catch(error){failures.push(error);}
          finally{try{body.setBodyType(type,false);}catch(error){failures.push(error);}}
        }
      }
      if(failures.length===1)throw failures[0];
      if(failures.length>1)throw new AggregateError(failures,'Owned character query and cleanup failed');
    }finally{this.active=false;}
  }
}
