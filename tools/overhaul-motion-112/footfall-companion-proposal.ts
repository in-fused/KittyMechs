/** ISOLATED UNINTEGRATED proposal. Retains caller's reach/lease/solve checks.
 * The selected source clip's OWN measured phase feeds this function. During R,
 * supply both active ordinary-gait samples with their real nonzero weights.
 * A blended authored lift has precedence over a correction's desired plant.
 */
type Limb112='FL'|'FR'|'HL'|'HR';
export interface AuthoredFootfall112 {sourceDuty:number;sourceOffsets:Record<Limb112,number>;unloaded:readonly Limb112[];}
export interface GaitSample112 {phase:number;weight:number;footfall:AuthoredFootfall112;}
export function authoredFootfall112(samples:readonly GaitSample112[],limb:Limb112):'stance'|'release'|'unloaded'{
 const active=samples.filter(s=>s.weight>0);
 if(!active.length)return 'release';
 if(active.every(s=>s.footfall.unloaded.includes(limb)))return 'unloaded';
 for(const s of active){
  const duty=s.footfall.sourceDuty,offset=s.footfall.sourceOffsets[limb];
  if(!Number.isFinite(s.phase)||!Number.isFinite(duty)||!Number.isFinite(offset)||duty<=0||duty>=1)throw new Error('INVALID_SOURCE_FOOTFALL112');
  const local=((s.phase+offset)%1+1)%1;
  if(s.footfall.unloaded.includes(limb)||local>=duty)return 'release';
 }
 return 'stance';
}
