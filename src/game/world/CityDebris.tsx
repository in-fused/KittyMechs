import {useLayoutEffect,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import type {Group} from 'three';
import {cityDistrict} from '../../../shared/cityDistrict';
import {cityFractureCatalog as bakedAsset} from '../../../shared/cityFractureCatalog';
import type {CityPresentation} from './cityPresentation';
import {CityDebrisPool} from './cityFragments';
import {CityFractureRenderer} from './cityFractureRenderer';
import type {CityTextures} from '../rendering/cityTextures';

export function CityDebris({seed,presentation,textures}:{seed:number;presentation:CityPresentation;textures:CityTextures|null}){
  const district=cityDistrict(seed);
  const factory=useGLTF('/assets/models/Factory_Workshop.glb'),group=useRef<Group>(null),owner=useRef<{renderer:CityFractureRenderer;pool:CityDebrisPool}|null>(null);
  useLayoutEffect(()=>{
    if(!district||!group.current)return;
    const renderer=new CityFractureRenderer(district,bakedAsset,factory.scene,textures),parent=group.current;
    const owned={renderer,pool:new CityDebrisPool(district,bakedAsset)};owner.current=owned;parent.add(renderer.group);
    return()=>{parent.remove(renderer.group);renderer.dispose();if(owner.current===owned)owner.current=null;};
  },[district,factory,textures,presentation]);
  useFrame(()=>{
    const owned=owner.current,state=presentation.read();if(!owned)return;
    if(!state){owned.renderer.update([],0);return;}
    const clock=presentation.readClock();
    if(state.experimentalPhysicalRubble){owned.renderer.updateRubble(presentation.sampleRubble(),clock);return;}
    owned.pool.update(state.events,state.structures,clock);owned.renderer.update(owned.pool.fragments,clock);
  });
  return <group ref={group} dispose={null}/>;
}
