/** Initial deployment and streamed actors must resolve the same cached rig. */
export function actorModelPath(model:string):string{
  if(model==='Pounce_Quadruped')return '/assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb?rev=dee43000';
  return `/assets/models/${model}.glb?rev=${model==='Pounce_Quadruped'?'feline-pounce-art-12':model==='Bastion_Quadruped'?'feline-bastion-art-14':model==='Lynx_Quadruped'?'feline-lynx-art-15':model==='Caracal_Quadruped'?'feline-caracal-art-15':'feline-upright-11'}`;
}
