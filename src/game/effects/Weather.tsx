import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, type LineBasicMaterial } from 'three';
import { randomSeed } from '../../../shared/math';
import { getMap } from '../../../shared/maps';
import { QUALITY, useGameStore } from '../../state/store';
import { runtime } from '../runtime';
import { emptyWeather, weatherAt, wrapWeather } from '../../../shared/weather';
export function Weather(){
  const seed=useGameStore(s=>s.seed),quality=useGameStore(s=>s.settings.quality),map=getMap(seed);
  const count=QUALITY[quality].particles*2;
  const data=useMemo(()=>{const rng=randomSeed(seed),points=Array.from({length:count},()=>({x:(rng()-.5)*55,z:(rng()-.5)*55,y:rng()*24,speed:12+rng()*15})),positions=new Float32Array(count*6),geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(positions,3));return {points,positions,geometry};},[seed,count]);
  const material=useRef<LineBasicMaterial>(null),frame=useMemo(emptyWeather,[]);
  useEffect(()=>()=>data.geometry.dispose(),[data]);
  useFrame(()=>{const snap=runtime.snapshot,actor=snap?.actors.find(a=>a.id===runtime.localId);if(!snap||!actor)return;
    const weather=weatherAt(seed,snap.time,useGameStore.getState().settings.reducedFlashes,frame),rain=weather.kind==='rain',visible=Math.floor(count*weather.intensity);
    data.geometry.setDrawRange(0,visible*2);
    for(let i=0;i<visible;i++){const p=data.points[i],time=snap.time,y=(p.y-time*p.speed*(rain?1:.08))%24;
      const px=actor.position.x+wrapWeather(p.x+weather.driftX*.35),py=actor.position.y+(y+24)%24-3,pz=actor.position.z+wrapWeather(p.z+weather.driftZ*.35);
      data.positions.set([px,py,pz,px-weather.windX*(rain?.025:.01),py+(rain?.6:.04),pz-weather.windZ*(rain?.025:.01)],i*6);
    }
    if(material.current)material.current.opacity=rain?.12+weather.intensity*.13:.35+weather.intensity*.25;
    data.geometry.attributes.position.needsUpdate=true;
  });
  return <lineSegments geometry={data.geometry} frustumCulled={false}><lineBasicMaterial ref={material} color={map.weather==='snow'?'#ecf7ff':map.weather==='ash'?'#b6a995':'#c5deea'} transparent opacity={map.weather==='rain'?.18:.5} depthWrite={false}/></lineSegments>;
}
