import type RAPIER from '@dimforge/rapier3d-compat';
import type {Simulation} from '../../shared/simulation';
import type {CityBlock} from '../../shared/cityDistrict';
import type {OverhaulBondedOwner} from '../../shared/overhaulBondedOwner';
import type {OverhaulRuinsOwner,OverhaulRuinState} from '../../shared/overhaulRuins';
import {overhaulFragmentKey} from '../../shared/overhaulFracture';
import {SecondaryFractureOwner,type SecondaryOwnerOptions} from './owner';
import {SECONDARY_COMBINED_ACTIVE} from './material';

/** Source-authored tool-only authority adapter. This never changes production
 * defaults, input/join, layout admission or guest packet parsing. The runtime
 * owner is a DISTINCT17-collider/18-active version, not a frozen16 alias. */
export function installSecondaryFixture(sim:Simulation,world:RAPIER.World,source:CityBlock,externalSupportKey:SecondaryOwnerOptions['externalSupportKey']){
 const internal=sim as unknown as {bondedOwner:OverhaulBondedOwner;ruinsOwner:OverhaulRuinsOwner};
 const base=internal.bondedOwner as unknown as {options:Omit<SecondaryOwnerOptions,'externalSupportKey'>;dispose:()=>void;count:number};
 if(base.count!==0)throw Error('Secondary definition must be constructed before initial material damage');
 const owner=new SecondaryFractureOwner(world,source,{...base.options,externalSupportKey});base.dispose();internal.bondedOwner=owner as unknown as OverhaulBondedOwner;
 type LegacyRuin={state:OverhaulRuinState};
 const ruin=internal.ruinsOwner as unknown as {ruins:Map<number,LegacyRuin>;makeDynamicCapacity:(exclude?:LegacyRuin,protectedRuins?:ReadonlySet<LegacyRuin>)=>void;preflightDetach:(blocks:readonly CityBlock[])=>void};
 ruin.makeDynamicCapacity=(exclude?:LegacyRuin)=>{const active=[...ruin.ruins.values()].filter(r=>r!==exclude&&!r.state.settled).length;if(active+owner.active>=SECONDARY_COMBINED_ACTIVE)throw Error('New18-active version cannot wake another whole wreck; no cap settlement/eviction');};
 // The caller supplies native existing city blocks. Source IDs identify existing
 // whole wrecks; original shared detach still creates complete source geometry.
 ruin.preflightDetach=(blocks:readonly CityBlock[])=>{
  const district=(internal.ruinsOwner as unknown as {district:{blocks:CityBlock[]}|null}).district;
  if(!district)throw Error('Missing complete existing city catalog');
  const incoming=blocks.filter(b=>{const i=district.blocks.indexOf(b);return i>=0&&!ruin.ruins.has(overhaulFragmentKey(i));}).length,active=[...ruin.ruins.values()].filter(r=>!r.state.settled).length;
  if(ruin.ruins.size+incoming>1)throw Error('Source-specific prototype preserves one whole column; no additional header/city damage admitted');
  if(active+owner.active+incoming>SECONDARY_COMBINED_ACTIVE)throw Error('New18-active version detach preflight denied before mutation');
  // This17+1 version owns the preflight. Calling the frozen16 preflight here
  // would falsely present a new catalog as compatible with the old definition.
 };
 return owner;
}
