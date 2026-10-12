import {useEffect,useMemo,useRef,useState,type RefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {AdditiveBlending,BufferAttribute,BufferGeometry,Color,DoubleSide,Group,InstancedBufferAttribute,InstancedMesh,Mesh,Object3D,ShaderMaterial,Vector2} from 'three';
import type {AreaFieldState,CombatEvent,CoverState,Vec3} from '../../../shared/types';
import {QUALITY,useGameStore} from '../../state/store';
import {runtime} from '../runtime';
import {areaRing,effectFloor} from '../../../shared/areaGeometry';
import {EmpEffects} from './EmpEffects';
import {AREA_STYLES,areaArc,areaSeed,burstEnvelope,createFieldParticle,fieldEnvelope,sampleFieldParticle} from './areaPresentation';
import {areaArenaKey,burstKind,visibleAreaEvents,visibleAreaFields} from './areaTimeline';
import {readEffectTime as displayTime} from './effectClock';
import {beginAreaFrame,recordAreaDraw,recordAreaMotes,type AreaMoteDiagnostic} from './areaEffectDiagnostics';
const diagnose=new URLSearchParams(location.search).get('debug')==='1';
function supportedDisk(seed:number,position:Vec3,radius:number,cover:readonly CoverState[],start=0,length=Math.PI*2){
  const data=areaRing(seed,position,radius,0,start,length,cover),g=new BufferGeometry();
  g.setAttribute('position',new BufferAttribute(data.vertices,3));g.setIndex(new BufferAttribute(data.indices,1));return g;
}
const surfaceVertex=`varying vec2 vGround;uniform vec2 uCenter;uniform float uRadius;
void main(){vGround=vec2(position.x-uCenter.x,uCenter.y-position.z)/uRadius;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const surfaceFragment=`varying vec2 vGround;uniform vec3 uColor;uniform vec3 uAccent;uniform float uAge;uniform float uAlpha;uniform float uKind;uniform float uField;uniform float uFront;uniform float uTrail;uniform float uFrontWidth;uniform float uTrailWidth;uniform float uDirection;uniform float uReduced;
const float PI=3.14159265359;
float band(float radius,float outer,float width){return step(radius,outer)*(1.0-smoothstep(width*.3,width,outer-radius));}
float line(float value,float width){return 1.0-smoothstep(width*.35,width,abs(value));}
void main(){float r=length(vGround);if(r>1.0)discard;float a=atan(vGround.y,vGround.x);float edge=line(r-.975,.018);float marks=step(.5,cos(a*32.0))*line(r-.935,.014);float light=0.0;float core=0.0;
  if(uField>.5){
    light=edge*.48+marks*.17;
    if(uKind<.5){
      vec2 p=vGround*9.0;float grid=max(line(fract(p.x)-.5,.026),line(fract(p.y)-.5,.026));
      light+=grid*.025*(1.0-smoothstep(.72,.95,r));
    }else if(uKind<1.5){
      float phase=fract(r*2.2-uAge*.2);float trace=1.0-smoothstep(.025,.085,phase);
      float petals=pow(max(0.0,cos(a*6.0-uAge*.18*(1.0-uReduced))),14.0);
      light+=trace*.065*(1.0-r)+petals*.075*smoothstep(.2,.35,r)*(1.0-smoothstep(.8,.95,r));
      light+=line(r-.58,.012)*.1;
    }else{
      float spoke=pow(max(0.0,cos(a*12.0+uAge*.18*(1.0-uReduced))),32.0);
      float inward=1.0-smoothstep(.025,.1,fract(r*3.0+uAge*.25));
      light+=spoke*.16*smoothstep(.15,.3,r)*(1.0-r*.65)+inward*.06*(1.0-r);
      light+=line(r-.52,.009)*.12+line(r-.23,.01)*.08;
    }
  }else{
    core=band(r,uFront,uFrontWidth);float wake=band(r,uTrail,uTrailWidth);
    if(uKind>2.5&&uKind<3.5){
      float cone=smoothstep(.5,.62,cos(a-(PI*.5+uDirection)));
      float claws=core+band(r,max(0.0,uFront-.12),uFrontWidth*.7)*.6+band(r,max(0.0,uFront-.24),uFrontWidth*.5)*.32;
      light=(claws*.75+wake*.12)*cone;core*=cone;
    }else if(uKind<1.5){light=core*.3+wake*.12;core*=.45;}
    else{light=core*.65+wake*.12+band(r,max(0.0,uFront-.16),uFrontWidth*.4)*.15;}
  }
  float alpha=light*uAlpha;if(alpha<.002)discard;
  gl_FragColor=vec4(mix(uColor,uAccent,clamp(core*.7,0.0,.7)),alpha);
  #include <colorspace_fragment>
}`;
const domeVertex=`varying vec3 vNormal;varying vec3 vView;varying vec2 vUv;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=-mv.xyz;vUv=uv;gl_Position=projectionMatrix*mv;}`;
const domeFragment=`varying vec3 vNormal;varying vec3 vView;varying vec2 vUv;uniform vec3 uColor;uniform float uAlpha;uniform float uAge;uniform float uReduced;
void main(){float edge=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),3.0);
  vec2 size=vec2(1.0,1.7320508),p=vUv*vec2(42.0,24.0);vec2 a=mod(p,size)-size*.5,b=mod(p-size*.5,size)-size*.5;
  vec2 cell=dot(a,a)<dot(b,b)?a:b;float hex=max(abs(cell.x),dot(abs(cell),vec2(.5,.8660254)));
  float grid=1.0-smoothstep(.012,.025,abs(hex-.48));
  float scan=1.0-smoothstep(.012,.055,abs(fract(vUv.y+uAge*.12*(1.0-uReduced))-.5));
  gl_FragColor=vec4(uColor,(.008+edge*.21+grid*.045+scan*.024)*uAlpha);
  #include <colorspace_fragment>
}`;
const moteVertex=`attribute float aAlpha;varying float vAlpha;varying vec3 vColor;varying vec2 vUv;
void main(){vAlpha=aAlpha;
#ifdef USE_INSTANCING_COLOR
vColor=instanceColor;
#else
vColor=vec3(.5,1.0,.75);
#endif
vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`;
const moteFragment=`varying float vAlpha;varying vec3 vColor;varying vec2 vUv;void main(){float r=length(vUv*2.0-1.0);if(r>1.0)discard;float core=1.0-smoothstep(.0,.32,r),glow=pow(1.0-r,2.0);gl_FragColor=vec4(mix(vColor,vec3(1.0),core*.7),vAlpha*(core*.7+glow*.3));
  #include <colorspace_fragment>
}`;
const kindNumber={shield:0,repair:1,snare:2,rake:3,shockwave:4,emp:5};
interface View {key:string;fields:AreaFieldState[];events:CombatEvent[];cover:CoverState[];}
const emptyView:View={key:'',fields:[],events:[],cover:[]};
export function AreaEffects(){
  const [view,setView]=useState<View>(emptyView),signature=useRef(''),arena=useRef(''),baseArena=useRef(''),epoch=useRef(0),lastTime=useRef(-Infinity);
  const seed=useGameStore(s=>s.seed);
  useEffect(()=>()=>{if(diagnose)beginAreaFrame(runtime.generation,0);},[]);
  useFrame(()=>{
    const snap=runtime.snapshot,time=displayTime();if(diagnose)beginAreaFrame(runtime.generation,time);
    if(!snap){if(arena.current){arena.current=baseArena.current=signature.current='';lastTime.current=-Infinity;setView(emptyView);}return;}
    const base=areaArenaKey(runtime.generation,snap);
    if(baseArena.current!==base||snap.time<lastTime.current){baseArena.current=base;epoch.current++;signature.current='';}
    const nextArena=`${base}:${epoch.current}`;arena.current=nextArena;lastTime.current=snap.time;
    const fields=visibleAreaFields(snap,time),events=visibleAreaEvents(snap,time),cover=snap.cover??[];
    const next=JSON.stringify([nextArena,fields,events,cover.filter(c=>c.destroyedAt!==null).map(c=>c.id)]);
    if(signature.current!==next){signature.current=next;setView({key:nextArena,fields,events,cover});}
  },-.1);
  return <>{view.fields.map(f=><Field key={`${view.key}:${f.id}`} field={f} seed={seed} cover={view.cover} arena={view.key} owner={arena}/>)}{view.events.map(e=><Burst key={`${view.key}:${e.id}`} event={e} seed={seed} cover={view.cover} arena={view.key} owner={arena}/>)}<FieldMotes fields={view.fields} arena={view.key} owner={arena}/><EmpEffects/></>;
}
function ownsArena(key:string,owner:RefObject<string>){return !!runtime.snapshot&&key===owner.current&&key.startsWith(areaArenaKey(runtime.generation,runtime.snapshot)+':');}
function liveField(field:AreaFieldState,key:string,time:number,owner:RefObject<string>){const snap=runtime.snapshot;return ownsArena(key,owner)&&!!snap&&time>=field.born&&time<field.expires&&snap.actors.some(a=>a.id===field.owner&&a.hp>0)&&(snap.fields??[]).some(f=>f.id===field.id&&f.born===field.born&&f.expires===field.expires&&f.kind===field.kind&&f.radius===field.radius&&f.position.x===field.position.x&&f.position.y===field.position.y&&f.position.z===field.position.z);}
function surfaceUniforms(kind:keyof typeof kindNumber,position:Vec3,radius:number,isField:boolean,direction=0){const s=AREA_STYLES[kind];return{uCenter:{value:new Vector2(position.x,position.z)},uRadius:{value:radius},uColor:{value:new Color(s.color)},uAccent:{value:new Color(s.accent)},uAge:{value:0},uAlpha:{value:0},uKind:{value:kindNumber[kind]},uField:{value:isField?1:0},uFront:{value:0},uTrail:{value:0},uFrontWidth:{value:s.frontWidth},uTrailWidth:{value:s.trailWidth},uDirection:{value:direction},uReduced:{value:0}};}
function renderedSurface(mesh:Mesh){const u=(mesh.material as ShaderMaterial).uniforms,m=mesh.matrixWorld.elements;return{age:u.uAge.value as number,opacity:u.uAlpha.value as number,shaderRadius:u.uRadius?.value as number|undefined,shaderCenter:u.uCenter?{x:u.uCenter.value.x as number,z:u.uCenter.value.y as number}:undefined,worldOrigin:{x:m[12],y:m[13],z:m[14]},worldScale:{x:Math.hypot(m[0],m[1],m[2]),y:Math.hypot(m[4],m[5],m[6]),z:Math.hypot(m[8],m[9],m[10])}};}
function Field({field,seed,cover,arena,owner}:{field:AreaFieldState;seed:number;cover:CoverState[];arena:string;owner:RefObject<string>}){
  const surface=useRef<Mesh>(null),dome=useRef<Mesh>(null),group=useRef<Group>(null),surfaceMaterial=useRef<ShaderMaterial>(null),domeMaterial=useRef<ShaderMaterial>(null);
  const {x,y,z}=field.position,retired=cover.filter(c=>c.destroyedAt!==null).map(c=>c.id).join('|');
  const geometry=useMemo(()=>supportedDisk(seed,{x,y,z},field.radius,cover),[seed,x,y,z,field.radius,retired]);
  const uniforms=useMemo(()=>surfaceUniforms(field.kind,{x,y,z},field.radius,true),[field.kind,x,y,z,field.radius]);
  const domeUniforms=useMemo(()=>({uColor:{value:new Color(AREA_STYLES.shield.color)},uAlpha:{value:0},uAge:{value:0},uReduced:{value:0}}),[]);
  const base=useMemo(()=>effectFloor(seed,{x,y,z},cover),[seed,x,y,z,retired]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(()=>{
    const time=displayTime(),reduced=useGameStore.getState().settings.reducedFlashes,age=time-field.born,e=fieldEnvelope(age,field.expires-time,reduced);
    if(group.current)group.current.visible=liveField(field,arena,time,owner)&&e.visible;
    // R3F copies uniform wrappers; frame updates must target the mounted material.
    const u=surfaceMaterial.current?.uniforms,d=domeMaterial.current?.uniforms;
    if(u){u.uAge.value=age;u.uAlpha.value=e.opacity*(reduced?.65:1);u.uReduced.value=reduced?1:0;}
    if(d){d.uAlpha.value=e.opacity*(reduced?.65:1);d.uAge.value=age;d.uReduced.value=reduced?1:0;}
  });
  const report=(mesh:Mesh|null,role:'field'|'dome')=>{if(diagnose&&mesh)recordAreaDraw({id:field.id,kind:field.kind,role,center:{...field.position},radius:field.radius,...renderedSurface(mesh),vertices:mesh.geometry.getAttribute('position').count,triangles:(mesh.geometry.index?.count??0)/3});};
  return <group ref={group} visible={false}>
    <mesh ref={surface} geometry={geometry} renderOrder={3} onBeforeRender={()=>report(surface.current,'field')}><shaderMaterial ref={surfaceMaterial} uniforms={uniforms} vertexShader={surfaceVertex} fragmentShader={surfaceFragment} transparent side={DoubleSide} depthWrite={false} toneMapped={false}/></mesh>
    {field.kind==='shield'&&<mesh ref={dome} position={[field.position.x,base+.08,field.position.z]} scale={[field.radius,field.radius*.7,field.radius]} onBeforeRender={()=>report(dome.current,'dome')}><sphereGeometry args={[1,36,18,0,Math.PI*2,0,Math.PI/2]}/><shaderMaterial ref={domeMaterial} uniforms={domeUniforms} vertexShader={domeVertex} fragmentShader={domeFragment} transparent depthWrite={false} side={DoubleSide} toneMapped={false}/></mesh>}
  </group>;
}
function Burst({event,seed,cover,arena,owner}:{event:CombatEvent;seed:number;cover:CoverState[];arena:string;owner:RefObject<string>}){
  const mesh=useRef<Mesh>(null),material=useRef<ShaderMaterial>(null),kind=burstKind(event)!,radius=event.radius!,arc=areaArc(kind,event.direction);
  const {x,y,z}=event.position,retired=cover.filter(c=>c.destroyedAt!==null).map(c=>c.id).join('|');
  const geometry=useMemo(()=>supportedDisk(seed,{x,y,z},radius,cover,arc.start,arc.length),[seed,x,y,z,radius,retired,arc.start,arc.length]);
  const uniforms=useMemo(()=>surfaceUniforms(kind,{x,y,z},radius,false,event.direction),[kind,x,y,z,event.direction,radius]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(()=>{const age=displayTime()-event.at,reduced=useGameStore.getState().settings.reducedFlashes,e=burstEnvelope(kind,age,reduced);if(mesh.current)mesh.current.visible=ownsArena(arena,owner)&&e.visible;const u=material.current?.uniforms;if(u){u.uAge.value=age;u.uAlpha.value=e.opacity;u.uFront.value=e.front;u.uTrail.value=e.trail;u.uFrontWidth.value=e.frontWidth;u.uTrailWidth.value=e.trailWidth;u.uReduced.value=reduced?1:0;}});
  return <mesh ref={mesh} geometry={geometry} visible={false} renderOrder={3} onBeforeRender={()=>{if(diagnose&&mesh.current){const u=(mesh.current.material as ShaderMaterial).uniforms;recordAreaDraw({id:event.id,kind,role:'burst',center:{...event.position},radius,...renderedSurface(mesh.current),front:u.uFront.value,vertices:geometry.getAttribute('position').count,triangles:(geometry.index?.count??0)/3});}}}><shaderMaterial ref={material} uniforms={uniforms} vertexShader={surfaceVertex} fragmentShader={surfaceFragment} transparent side={DoubleSide} depthWrite={false} toneMapped={false}/></mesh>;
}
function FieldMotes({fields,arena,owner}:{fields:AreaFieldState[];arena:string;owner:RefObject<string>}){
  const mesh=useRef<InstancedMesh>(null),quality=useGameStore(s=>s.settings.quality),budget=Math.min(128,Math.floor(QUALITY[quality].particles/2));
  const alpha=useMemo(()=>new InstancedBufferAttribute(new Float32Array(budget),1),[budget]);
  const object=useMemo(()=>new Object3D(),[]),sample=useMemo(createFieldParticle,[]),rows=useRef<AreaMoteDiagnostic[]>([]);
  useFrame(state=>{
    if(!mesh.current)return;rows.current.length=0;let count=0;
    const time=displayTime(),reduced=useGameStore.getState().settings.reducedFlashes;
    const live=fields.filter(f=>f.kind!=='shield'&&liveField(f,arena,time,owner));
    const perField=Math.min(32,Math.floor(budget/Math.max(1,live.length)));
    for(const f of live){if(f.kind==='shield')continue;const age=time-f.born,e=fieldEnvelope(age,f.expires-time,reduced),color=new Color(AREA_STYLES[f.kind].color);
      for(let i=0;i<Math.min(perField,AREA_STYLES[f.kind].particleCount);i++){
        sampleFieldParticle(f.kind,areaSeed(f.id),i,perField,age,sample);if(!sample.visible)continue;
        const position={x:f.position.x+sample.x*f.radius,y:f.position.y+sample.y*f.radius,z:f.position.z+sample.z*f.radius},scale=sample.scale*f.radius;
        object.position.set(position.x,position.y,position.z);object.quaternion.copy(state.camera.quaternion);object.scale.setScalar(scale);object.updateMatrix();mesh.current.setMatrixAt(count,object.matrix);mesh.current.setColorAt(count,color);alpha.setX(count,sample.opacity*e.opacity*(reduced?.25:.6));
        if(diagnose)rows.current.push({field:f.id,kind:f.kind,position,scale,opacity:alpha.getX(count)});count++;
      }
    }
    mesh.current.count=count;mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;alpha.needsUpdate=true;
  });
  return <instancedMesh ref={mesh} args={[undefined,undefined,budget]} count={0} frustumCulled={false} renderOrder={4} onBeforeRender={()=>{if(diagnose&&mesh.current){const actual=mesh.current,attribute=actual.geometry.getAttribute('aAlpha');recordAreaMotes(rows.current.slice(0,actual.count).map((row,i)=>{actual.getMatrixAt(i,object.matrix);const m=object.matrix.elements;return{...row,position:{x:m[12],y:m[13],z:m[14]},scale:Math.hypot(m[0],m[1],m[2]),opacity:attribute.getX(i)};}));}}}><planeGeometry args={[2,2]}><primitive attach="attributes-aAlpha" object={alpha}/></planeGeometry><shaderMaterial vertexShader={moteVertex} fragmentShader={moteFragment} transparent depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></instancedMesh>;
}
