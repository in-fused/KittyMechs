import type {AnimationClip,Object3D} from 'three';
import manifest from './practicalFelineAssetProfiles002.json';
export type PracticalAssetProfile002=typeof manifest.profiles[number];
export const PRACTICAL_PAIR_PATH002='/assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb?rev=dee43000';
export function practicalAssetProfile002(url:string):PracticalAssetProfile002 {
  const path='public'+url.split('?')[0],profile=manifest.profiles.find(p=>p.path===path);if(!profile)throw new Error('No actual asset motion profile:'+path);return profile;
}
export function validatePracticalClips002(profile:PracticalAssetProfile002,clips:AnimationClip[],model:Object3D):string[]{
  const failures:string[]=[],required=new Set([...profile.base,...profile.reactions.flat(),...profile.references].filter((n):n is string=>typeof n==='string'));
  const catalog=profile.clips as Record<string,{duration:number;trackCount:number;trackLayout:string[]|null}>;
  for(const name of required){const clip=clips.find(c=>c.name===name),expected=catalog[name];if(!clip||!expected){failures.push('required:'+name);continue;}if(clip.duration!==expected.duration||clip.tracks.length!==expected.trackCount)failures.push('actual duration/tracks:'+name);const layout=clip.tracks.map(t=>t.name).sort();if(JSON.stringify(layout)!==JSON.stringify(expected.trackLayout??profile.trackLayout))failures.push('actual track targets:'+name);}
  for(const joint of profile.rig){const actual=model.getObjectByName(joint.name);if(!actual||actual.parent?.name!==joint.parent)failures.push('actual parent:'+joint.name);}
  return failures;
}
export function validatePracticalPairClips002(clips:AnimationClip[]):string[]{
  const profile=practicalAssetProfile002(PRACTICAL_PAIR_PATH002),catalog=profile.clips as Record<string,{duration:number;trackCount:number;trackLayout:string[]|null}>,failures:string[]=[];
  for(const name of Object.keys(catalog).filter(n=>/Pair(?:Impact|Pin|Claw|Release|Escape)/.test(n))){const actual=clips.find(c=>c.name===name),expected=catalog[name];if(!actual){failures.push('pair source:'+name);continue;}if(actual.duration!==expected.duration||actual.tracks.length!==expected.trackCount||JSON.stringify(actual.tracks.map(t=>t.name).sort())!==JSON.stringify(expected.trackLayout??profile.trackLayout))failures.push('pair source tracks/duration:'+name);}
  return failures;
}
