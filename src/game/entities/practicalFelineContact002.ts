import RAPIER from '@dimforge/rapier3d-compat';
import {Bone,Quaternion,Vector3} from 'three';
import {applyPawIK,type PawIK} from './pawContact';
export interface VisualContact002 {phase:'free'|'plant'|'release';owner:string|null;weight:number;queryCount:number;queryMs:number;floorError:number|null;reachRatio:number;reason:string;sampleClock:number|null;colliderHandle:number|null;hitPoint:number[]|null;hitNormal:number[]|null;}
interface Lease {collider:RAPIER.Collider;shape:RAPIER.Shape;id:string;localPoint:Vector3;localNormal:Vector3;}
export class PracticalPawContact002 {
  readonly diagnostic:VisualContact002={phase:'free',owner:null,weight:0,queryCount:0,queryMs:0,floorError:null,reachRatio:0,reason:'AUTHORED',sampleClock:null,colliderHandle:null,hitPoint:null,hitNormal:null};
  readonly scratch:PawIK={hip:new Vector3(),knee:new Vector3(),paw:new Vector3(),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:new Quaternion()};
  private lease:Lease|null=null;private nextQuery=0;private serial=0;
  private hit:{collider:RAPIER.Collider;point:Vector3;normal:Vector3}|null=null;
  private ray=new RAPIER.Ray({x:0,y:0,z:0},{x:0,y:-1,z:0});
  private normal=new Vector3();private pose=new Vector3();private q=new Quaternion();private requested=new Vector3();private diff=new Vector3();
  constructor(readonly world:RAPIER.World,readonly upper:Bone,readonly lower:Bone,readonly paw:Bone,readonly corners:readonly Vector3[],readonly scale:number){}
  reset(){this.lease=null;this.hit=null;this.nextQuery=0;this.diagnostic.weight=0;this.diagnostic.phase='free';this.diagnostic.owner=null;this.diagnostic.sampleClock=null;this.diagnostic.colliderHandle=null;this.diagnostic.hitPoint=null;this.diagnostic.hitNormal=null;}
  requestedTarget(){return this.requested.toArray();}
  private live(c:RAPIER.Collider){if(!c.isValid()||!c.isEnabled()||c.isSensor())return false;const parent=c.parent();return !parent||parent.isFixed()&&parent.isEnabled();}
  private sole(normal:Vector3){let min=0;for(const corner of this.corners){this.pose.copy(corner).applyMatrix4(this.paw.matrixWorld).sub(this.scratch.paw);min=Math.min(min,this.pose.dot(normal));}return -min+.004;}
  /** One owner, three sparse floor samples or one wall sample at30Hz. Native
   * filter flags avoid native reads in a query callback. No coverage/load proof. */
  step(time:number,dt:number,support:number,normal:Vector3|null,enabled:boolean,reset:boolean,speed:number):VisualContact002 {
    const c=this.scratch,d=this.diagnostic;d.queryCount=0;d.queryMs=0;d.floorError=null;d.reason='AUTHORED';
    if(reset)this.reset();this.upper.getWorldPosition(c.hip);this.lower.getWorldPosition(c.knee);this.paw.getWorldPosition(c.paw);this.paw.getWorldQuaternion(c.pawRotation);
    const a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw),reach=a+b;
    if(normal)this.normal.copy(normal);else this.normal.set(0,1,0);enabled=enabled&&this.corners.length>0;
    if(this.lease&&(!this.live(this.lease.collider)||this.lease.collider.shape!==this.lease.shape)){this.lease=null;d.phase='release';d.reason='RETIRED_SCENE_OWNER';}
    if(this.lease){const l=this.lease,rot=l.collider.rotation(),p=l.collider.translation();this.q.set(rot.x,rot.y,rot.z,rot.w);c.target.copy(l.localPoint).applyQuaternion(this.q).add(this.pose.set(p.x,p.y,p.z));
      const distance=c.hip.distanceTo(c.target),reserve=Math.max(.025*this.scale,speed*Math.max(0,dt)*2);
      if(!enabled||support<.1||distance>reach-reserve||c.target.distanceTo(c.paw)>.48*this.scale){d.phase='release';d.reason=!enabled?'STATE_RELEASE':support<.1?'SWING_RELEASE':'REACH_REPLANT';}
    }
    if(enabled&&time>=this.nextQuery){this.nextQuery=time+1/30;this.hit=null;d.sampleClock=time;d.colliderHandle=null;d.hitPoint=d.hitNormal=null;
      const count=normal?1:3;let selected:RAPIER.Collider|null=null;let top=-Infinity;let coherent=true;
      for(let i=0;i<count;i++){const offset=i===0?0:(i===1?1:-1)*.07*this.scale;
        this.ray.origin={x:c.paw.x+offset+this.normal.x*.25*this.scale,y:c.paw.y+this.normal.y*.25*this.scale,z:c.paw.z+offset+this.normal.z*.25*this.scale};this.ray.dir={x:-this.normal.x,y:-this.normal.y,z:-this.normal.z};
        const queryStarted=performance.now();const hit=this.world.castRayAndGetNormal(this.ray,.65*this.scale,false,RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC|RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);d.queryCount++;d.queryMs+=performance.now()-queryStarted;
        if(!hit||!Number.isFinite(hit.timeOfImpact)||hit.timeOfImpact<0||hit.timeOfImpact>.65*this.scale||![hit.normal.x,hit.normal.y,hit.normal.z].every(Number.isFinite)||hit.normal.x*this.normal.x+hit.normal.y*this.normal.y+hit.normal.z*this.normal.z<.55){coherent=false;continue;}
        const point=new Vector3(this.ray.origin.x,this.ray.origin.y,this.ray.origin.z).addScaledVector(this.normal,-hit.timeOfImpact);
        if(selected&&selected!==hit.collider)coherent=false;selected=hit.collider;
        if(i===0)this.hit={collider:hit.collider,point,normal:new Vector3(hit.normal.x,hit.normal.y,hit.normal.z)};
        top=Math.max(top,point.y);
      }
      if(!coherent)this.hit=null;else if(this.hit&&!normal&&Math.abs(top-this.hit.point.y)>.035*this.scale)this.hit=null;
      if(this.hit){d.colliderHandle=this.hit.collider.handle;d.hitPoint=this.hit.point.toArray();d.hitNormal=this.hit.normal.toArray();}
    }
    if(this.hit&&!this.live(this.hit.collider))this.hit=null;
    if(!enabled||!this.hit){if(d.phase==='plant')d.phase='release';d.reason=!enabled?'STATE_RELEASE':'NO_CURRENT_SCENE_SAMPLE';}
    if(enabled&&this.hit&&support>.55&&d.phase==='free'){
      const h=this.hit;this.normal.copy(h.normal);c.target.copy(c.paw).addScaledVector(this.normal,this.sole(this.normal)-this.diff.copy(c.paw).sub(h.point).dot(this.normal));
      if(c.hip.distanceTo(c.target)<reach-.025*this.scale&&c.target.distanceTo(c.paw)<.32*this.scale){const rot=h.collider.rotation(),p=h.collider.translation();this.q.set(rot.x,rot.y,rot.z,rot.w).invert();this.lease={collider:h.collider,shape:h.collider.shape,id:`client-scene-paw:${this.paw.name}:${h.collider.handle}:${++this.serial}`,localPoint:c.target.clone().sub(this.pose.set(p.x,p.y,p.z)).applyQuaternion(this.q),localNormal:h.normal.clone().applyQuaternion(this.q)};d.phase='plant';}
    }
    const desired=enabled&&this.lease&&d.phase==='plant'?Math.max(0,Math.min(1,support)):0;d.weight+=(desired-d.weight)*Math.min(1,Math.max(0,dt)*(desired>d.weight?22:16));
    if(d.phase==='release'&&d.weight<.015){this.lease=null;d.weight=0;d.phase='free';}
    d.owner=this.lease?.id??null;
    if(this.lease&&d.weight>0){const l=this.lease,rot=l.collider.rotation(),p=l.collider.translation();this.q.set(rot.x,rot.y,rot.z,rot.w);this.pose.copy(l.localPoint).applyQuaternion(this.q);this.pose.x+=p.x;this.pose.y+=p.y;this.pose.z+=p.z;c.target.copy(c.paw).lerp(this.pose,d.weight);this.requested.copy(c.target);d.reachRatio=c.hip.distanceTo(c.target)/reach;
      // Never let the law-of-cosines helper shorten an unreachable request.
      const distance=c.hip.distanceTo(c.target);if(distance>Math.abs(a-b)+.0001&&distance<reach-.0001){applyPawIK(this.upper,this.lower,this.paw,c);d.reason='VISUAL_IK_CURRENT_SCENE';}else{this.lease=null;d.weight=0;d.phase='free';d.reason='UNREACHABLE_AUTHORED_RELEASE';}
    }else d.reachRatio=reach>0?c.hip.distanceTo(c.paw)/reach:0;
    if(enabled&&this.hit){this.paw.getWorldPosition(c.paw);d.floorError=this.diff.copy(c.paw).sub(this.hit.point).dot(this.hit.normal)-this.sole(this.hit.normal);}
    return d;
  }
}
