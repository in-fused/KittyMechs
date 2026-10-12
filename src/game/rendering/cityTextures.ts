import {useEffect,useMemo,useState} from 'react';
import {ClampToEdgeWrapping,LoadingManager,RepeatWrapping,SRGBColorSpace,TextureLoader,type Texture} from 'three';

export interface CityTextures {concrete:Texture;asphalt:Texture;window:Texture;sign:Texture;}
export interface CityTextureState {seed:number;status:'idle'|'loading'|'ready'|'fallback';maps:CityTextures|null;}
const files=['City_Concrete_Cast.webp','City_Asphalt_Service.webp','City_Facade_Windows.webp','City_District_Signs.webp'];
/** Scene-owned optional art never suspends simulation or replaces its solids.
 * One failed map retains the admitted factory appearance for the entire bank. */
export function useCityTextures(seed:number):CityTextureState {
  const owner=useMemo(()=>({seed}),[seed]);
  const [loaded,setLoaded]=useState<{owner:typeof owner;state:CityTextureState}>({owner,state:{seed,status:seed===7734?'loading':'idle',maps:null}});
  useEffect(()=>{
    if(seed!==7734)return;
    let retired=false;const owned:Texture[]=[],loader=new TextureLoader(new LoadingManager());
    const jobs=files.map((file,i)=>new Promise<Texture>((resolve,reject)=>{
      const texture=loader.load(`/assets/textures/${file}`,loaded=>{if(retired){loaded.dispose();return;}resolve(loaded);},undefined,reject);
      texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;texture.flipY=i<2;
      texture.wrapS=texture.wrapT=i<2?RepeatWrapping:ClampToEdgeWrapping;owned.push(texture);
    }));
    Promise.all(jobs).then(([concrete,asphalt,window,sign])=>{if(!retired)setLoaded({owner,state:{seed,status:'ready',maps:{concrete,asphalt,window,sign}}});}).catch(()=>{if(!retired)setLoaded({owner,state:{seed,status:'fallback',maps:null}});});
    return()=>{retired=true;for(const map of owned)map.dispose();};
  },[seed,owner]);
  // Revisiting a seed gets a distinct owner before passive effects run. The
  // previous scene's disposed maps can therefore never be returned as ready.
  return loaded.owner===owner?loaded.state:{seed,status:seed===7734?'loading':'idle',maps:null};
}
