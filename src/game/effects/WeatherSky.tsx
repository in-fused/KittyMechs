import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Color, Mesh, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import { getMap } from '../../../shared/maps';
import { emptyWeather, weatherAt } from '../../../shared/weather';
import { useGameStore } from '../../state/store';
import { runtime } from '../runtime';

const vertex=`varying vec3 vDirection;
#include <fog_pars_vertex>
void main(){
  vDirection=position;vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
  gl_Position=projectionMatrix*mvPosition;
  // Keep the background at the far plane so existing opaque depth rejects
  // covered pixels before the procedural cloud shader runs.
  gl_Position.z=gl_Position.w;
  #include <fog_vertex>
}`;
const fragment=`varying vec3 vDirection;
#include <fog_pars_fragment>
uniform vec3 uSky;uniform float uClouds;uniform float uLight;uniform vec2 uDrift;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
  vec3 ray=normalize(vDirection);float up=max(0.0,ray.y);
  vec2 p=ray.xz/max(.22,up+.2)*2.4+uDrift*.002;
  float cloud=noise(p)*.52+noise(p*2.02)*.28+noise(p*4.11)*.14;
  float coverage=smoothstep(.61-uClouds*.26,.79-uClouds*.2,cloud);
  vec3 sky=mix(uSky*.75,uSky,smoothstep(0.0,.7,up));
  sky*=.7+uLight*.3;
  vec3 clouds=mix(vec3(.82,.86,.89),vec3(.28,.34,.39),uClouds*.7);
  vec3 color=mix(sky,clouds,coverage*smoothstep(0.0,.18,up));
  gl_FragColor=vec4(color,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // Renderer fogColor already matches the active output/render-target space.
  // Distance fog would obscure this700m sphere; only join the low horizon.
  #ifdef USE_FOG
    gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,1.0-smoothstep(0.0,.18,up));
  #endif
}`;
export function WeatherSky(){
  const seed=useGameStore(s=>s.seed),map=getMap(seed),mesh=useRef<Mesh>(null),material=useRef<ShaderMaterial>(null);
  const frame=useMemo(emptyWeather,[]),uniforms=useMemo(()=>UniformsUtils.merge([UniformsLib.fog,{uSky:{value:new Color(map.sky)},uClouds:{value:.5},uLight:{value:1},uDrift:{value:[0,0]}}]),[map]);
  useFrame(({camera})=>{
    if(!mesh.current||!material.current)return;mesh.current.position.copy(camera.position);
    const weather=weatherAt(seed,runtime.snapshot?.time??0,useGameStore.getState().settings.reducedFlashes,frame),u=material.current.uniforms;
    u.uClouds.value=weather.clouds;u.uLight.value=weather.sunlight+weather.lightning;
    u.uDrift.value[0]=weather.driftX;u.uDrift.value[1]=weather.driftZ;
  });
  return <mesh ref={mesh} renderOrder={1000} frustumCulled={false}><sphereGeometry args={[700,32,16]}/><shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} fog side={BackSide} depthTest depthWrite={false}/></mesh>;
}
