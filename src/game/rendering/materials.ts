import { useTexture } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { RepeatWrapping, SRGBColorSpace } from 'three';
import { useGameStore } from '../../state/store';
import { registerSurfaceBank } from './surfaceDiagnostics';
export {dressMaterial,felineSurfaceProfile,type SurfaceProfile} from './surfaceMaterials';
const files={concrete:'/assets/textures/concrete_moss_diff.webp',concreteNormal:'/assets/textures/concrete_moss_nor_dx.webp',concreteRough:'/assets/textures/concrete_moss_rough.webp',forest:'/assets/textures/forest_ground_04_diff.webp',forestNormal:'/assets/textures/forest_ground_04_nor_gl.webp',groundRough:'/assets/textures/forest_ground_04_rough.webp',armor:'/assets/textures/armor-albedo.webp',rock:'/assets/textures/rock_ground_diff.webp',rockNormal:'/assets/textures/rock_ground_nor_gl.webp',ember:'/assets/textures/ember-ground.webp',frost:'/assets/textures/frost-ground.webp'} as const;
export function useSurfaces(){
  const seed=useGameStore(s=>s.seed);
  const groundFile=seed===1926?files.ember:seed===4107?files.frost:files.forest,normalFile=seed===7734?files.forestNormal:files.rockNormal;
  // Start the selected bank together before any individual suspense read.
  // Single-URL cache keys share common textures across theater changes.
  for(const url of new Set([files.concrete,files.concreteNormal,files.concreteRough,files.groundRough,files.armor,files.rock,files.rockNormal,groundFile,normalFile]))useTexture.preload(url);
  const concrete=useTexture(files.concrete),concreteNormal=useTexture(files.concreteNormal),concreteRough=useTexture(files.concreteRough),groundRough=useTexture(files.groundRough),armor=useTexture(files.armor),rock=useTexture(files.rock),rockNormal=useTexture(files.rockNormal),ground=useTexture(groundFile),groundNormal=useTexture(normalFile);
  const maps=useMemo(()=>{
    for(const map of new Set([concrete,concreteNormal,concreteRough,groundRough,armor,rock,rockNormal,ground,groundNormal])){map.wrapS=map.wrapT=RepeatWrapping;map.anisotropy=4;}
    for(const map of [concrete,armor,rock,ground])map.colorSpace=SRGBColorSpace;
    return {concrete,concreteNormal,concreteRough,ground,groundNormal,groundRough,armor,rock,rockNormal};
  },[concrete,concreteNormal,concreteRough,groundRough,armor,rock,rockNormal,ground,groundNormal]);
  // The opt-in page session survives leaveGame removing invite/debug URL params.
  useEffect(()=>{if(import.meta.env.DEV||window.kittyMechDebug)return registerSurfaceBank(seed,maps);},[seed,maps]);
  return maps;
}
