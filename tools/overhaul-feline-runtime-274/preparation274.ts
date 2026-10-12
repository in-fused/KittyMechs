import {Quaternion} from 'three';
export type Preparation267={key:string;direction:'up'|'down';progress:number;extent:number};
const ease=(n:number)=>n*n*(3-2*n);
/** Relative rotation chart: actual authored preparation minus its actual
 * endpoint interpolation. Zero endpoint correction keeps distance-owned gait. */
export class PreparationChart267 {
 private key:string|null=null;private previous=new Map<string,Quaternion>();private carry=new Map<string,Quaternion>();
 cancel(){this.key=null;this.previous.clear();this.carry.clear();}
 evaluate(request:Preparation267|undefined,names:string[],sample:(time:'start'|'end'|'current')=>Map<string,{q:Quaternion}>){
  if(!request){this.cancel();return new Map<string,Quaternion>();}
  const u=request.progress;if(!(u>=0&&u<=1&&request.extent>=0&&request.extent<=1))throw Error('267_INVALID_PREPARATION_CLOCK');
  if(request.key!==this.key){this.carry=new Map([...this.previous].map(([n,q])=>[n,q.clone()]));this.key=request.key;}
  // At u=1 both carry and residual are exactly identity. Retire the chart
  // without sampling clips or writing a pose; a later reversal starts at zero.
  if(u===1){this.previous.clear();this.carry.clear();return new Map<string,Quaternion>();}
  const out=new Map<string,Quaternion>(),a=sample('start'),b=sample('end'),p=sample('current');
  for(const name of names){if(name==='root'||name==='head')continue;
   const residual=u===0||u===1?new Quaternion():p.get(name)!.q.clone().multiply(a.get(name)!.q.clone().slerp(b.get(name)!.q,u).invert());
   const delta=(this.carry.get(name)?.clone()??new Quaternion()).slerp(new Quaternion(),ease(u)).multiply(new Quaternion().slerp(residual,request.extent));
   if(Math.abs(delta.length()-1)>2e-5)throw Error('267_PREPARATION_NONUNIT:'+name);out.set(name,delta);
  }
  this.previous=new Map([...out].map(([n,q])=>[n,q.clone()]));return out;
 }
}
/** Native command clocks remain authority; only visual blend starts from the
 * last displayed stance on interruption instead of swapping whole endpoints. */
export class PreparationControl267 {
 private key:string|null=null;private from=0;private displayed=0;private extent=0;
 reset(stance:number){this.key=null;this.from=this.displayed=stance;this.extent=0;}
 step(key:string,up:boolean,progress:number){
  const target=up?1:0;if(this.key!==key){this.key=key;this.from=this.displayed;this.extent=Math.abs(target-this.from);}
  this.displayed=this.from+(target-this.from)*progress;
  return {stance:this.displayed,request:{key,direction:up?'up':'down',progress,extent:this.extent} as Preparation267};
 }
}
