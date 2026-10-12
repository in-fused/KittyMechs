import type {AreaEffectKind,AreaFieldState,Vec3} from '../../../shared/types';

export interface AreaStyle {
  readonly color:string;readonly accent:string;readonly lifetime:number;
  /** Normalized inward thicknesses; the outer front never exceeds radius. */
  readonly frontWidth:number;readonly trailWidth:number;readonly particleCount:number;
}
const style=(value:AreaStyle):Readonly<AreaStyle>=>Object.freeze(value);
/** Presentation lifetimes, not field expiry or gameplay ability durations. */
export const AREA_STYLES:Readonly<Record<AreaEffectKind,Readonly<AreaStyle>>>=Object.freeze({
  rake:style({color:'#ffbe7b',accent:'#ffe1ad',lifetime:.7,frontWidth:.07,trailWidth:.2,particleCount:0}),
  shockwave:style({color:'#ffb65f',accent:'#fff0bf',lifetime:1,frontWidth:.05,trailWidth:.16,particleCount:0}),
  shield:style({color:'#69d9ff',accent:'#c2f2ff',lifetime:.85,frontWidth:.04,trailWidth:.12,particleCount:0}),
  repair:style({color:'#83efad',accent:'#d6ffe3',lifetime:1.2,frontWidth:.06,trailWidth:.24,particleCount:24}),
  snare:style({color:'#ae8dff',accent:'#ded2ff',lifetime:1.1,frontWidth:.045,trailWidth:.18,particleCount:32}),
  emp:style({color:'#83dfff',accent:'#d8f9ff',lifetime:1.4,frontWidth:.035,trailWidth:.2,particleCount:0}),
});
export const MAX_FIELD_PARTICLES=32;
const unit=(value:number)=>Math.max(0,Math.min(1,value));
const smooth=(value:number)=>{const t=unit(value);return t*t*(3-2*t);};
const finite=(value:number)=>typeof value==='number'&&Number.isFinite(value);

export interface BurstEnvelope {
  visible:boolean;progress:number;opacity:number;front:number;trail:number;frontWidth:number;trailWidth:number;
}
/** Front/trail are outer radii in native-radius units; widths extend inward.
 * Root owns supported geometry/cover clipping and uses the actual event radius.
 * Reduced flashes slows the one front and entrance within the same lifetime;
 * it never expands the footprint or adds repeating brightness pulses. */
export function burstEnvelope(kind:AreaEffectKind,age:number,reducedFlashes=false):BurstEnvelope {
  const s=AREA_STYLES[kind];
  if(!s||!finite(age)||age<0||age>=s.lifetime)return{visible:false,progress:0,opacity:0,front:0,trail:0,frontWidth:0,trailWidth:0};
  const progress=age/s.lifetime,front=smooth(progress/(reducedFlashes?.95:.78));
  const opacity=smooth(progress/(reducedFlashes?.2:.12))*(1-smooth((progress-.45)/.55))*(reducedFlashes?.45:1);
  return{visible:opacity>0,progress,opacity,front,trail:Math.max(0,front-s.frontWidth*.75),frontWidth:s.frontWidth,trailWidth:s.trailWidth};
}
export interface FieldEnvelope {visible:boolean;opacity:number;modulation:number;}
/** Finite snapshot-clock age/remaining only: no wall clock or expiry extension.
 * A low-frequency smooth modulation has no hard flashes or frame accumulation. */
export function fieldEnvelope(age:number,remaining:number,reducedFlashes=false):FieldEnvelope {
  if(!finite(age)||!finite(remaining)||age<0||remaining<=0)return{visible:false,opacity:0,modulation:1};
  const modulation=reducedFlashes?1:.92+.08*Math.sin((age%Math.PI)*2);
  const opacity=smooth(age/.25)*smooth(remaining/.45)*modulation;
  return{visible:opacity>0,opacity,modulation};
}
export interface AreaArc {start:number;length:number;}
/** areaRing uses (cos(angle), -sin(angle)); native forward is
 * (-sin(yaw), -cos(yaw)). No additional decorative arc outside the rake cone. */
export function areaArc(kind:AreaEffectKind,direction=0):AreaArc {
  const yaw=finite(direction)?direction:0;
  return kind==='rake'?{start:Math.PI/2+yaw-Math.PI/3,length:Math.PI*2/3}:{start:0,length:Math.PI*2};
}
/** Stable ID seed, including numeric IDs, without ambient/random state. */
export function areaSeed(id:number|string):number {
  if(typeof id!=='string'&&!finite(id))return 0;
  const text=String(id);let hash=2166136261;
  for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}
function fraction(seed:number,index:number):number {
  let bits=(seed^Math.imul(index+1,0x9e3779b9))>>>0;
  bits=Math.imul(bits^(bits>>>16),0x85ebca6b);bits=Math.imul(bits^(bits>>>13),0xc2b2ae35);
  return ((bits^(bits>>>16))>>>0)/4294967296;
}
export interface FieldParticle extends Vec3 {visible:boolean;opacity:number;scale:number;}
export function createFieldParticle():FieldParticle{return{x:0,y:0,z:0,visible:false,opacity:0,scale:0};}
/** Allocation-free instanced center/scale in field-position, native-radius
 * coordinates. Repair rises on stable columns; snare curls inward. Center plus
 * a unit-bounded sprite of `scale` stays inside the full 3D native sphere.
 * Root multiplies by actual radius and applies field opacity/support clipping.
 * This is a visual cue, not LOS, allegiance, damage or healing eligibility. */
export function sampleFieldParticle(kind:Exclude<AreaFieldState['kind'],'shield'>,seed:number,index:number,count:number,age:number,out:FieldParticle):FieldParticle {
  out.x=out.y=out.z=out.opacity=out.scale=0;out.visible=false;
  if((kind!=='repair'&&kind!=='snare')||!finite(seed)||!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isInteger(index)||index<0||!Number.isInteger(count)||count<=0||index>=Math.min(count,MAX_FIELD_PARTICLES)||!finite(age)||age<0)return out;
  const random=fraction(seed,index),cycle=kind==='repair'?2.2:2.8;
  const phase=(age/cycle+random)%1,angle=index*2.399963229728653+random*Math.PI*2;
  const visibility=smooth(phase/.16)*(1-smooth((phase-.78)/.22));
  if(kind==='repair'){
    const radius=.2+.45*fraction(seed^0x4ad51,index);
    out.x=Math.cos(angle)*radius;out.z=Math.sin(angle)*radius;
    out.y=phase*.75*Math.sqrt(1-radius*radius);out.scale=.024;
  }else{
    const radius=.82*(1-.68*phase),theta=angle-phase*Math.PI*1.5;
    out.x=Math.cos(theta)*radius;out.z=Math.sin(theta)*radius;
    out.y=.08*Math.sin(phase*Math.PI);out.scale=.018;
  }
  out.opacity=visibility;out.visible=visibility>0;return out;
}
