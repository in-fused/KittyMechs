// Read-only assertions on the production presentation diagnostic. This proves
// internal provenance only; native support and visual quality remain separate.
export function assertCoordination172(sample,phase,actor){
 const on=phase.startsWith('on-'),off=phase.startsWith('off-');
 if((!on&&!off)||phase.includes('action-probe')||phase.includes('jump'))return;
 const owner=on?sample.feline.diagnostics.find(d=>d.actor===actor.id):null;
 const d=on?owner?.coordination164:sample.contact?.sourceCoordination164;
 if(!d||d.policy!=='FINAL_SOURCE_ROLE_FOOTPRINT_SUPPORT_AFFINE164'||d.contactQualified!==false)throw Error('164 presentation owner absent: '+phase);
 if(!d.basis||d.feet.length!==4)return; // inactive source states have no current support sample
 if(!Number.isInteger(d.queries)||d.queries<0||d.queries>4)throw Error('164 footprint query bound: '+phase);
 if(!d.foreRoleBasis||!Number.isFinite(d.foreRoleBasis.stance)||d.feet.length!==4||new Set(d.feet.map(f=>f.limb)).size!==4)throw Error('164 final-pose provenance absent: '+phase);
 const foreGesture=d.foreRoleBasis.stance>0||d.foreRoleBasis.uprightClips.length>0;
 for(const f of d.feet){
  if(!f.sole.every(Number.isFinite)||!Number.isFinite(f.load)||f.load<0)throw Error('164 invalid final sole/load: '+phase);
  if(foreGesture&&f.limb.startsWith('F')&&(f.load!==0||f.requested!==null||!['unloaded','source-only'].includes(f.role)))throw Error('164 raised fore gesture treated as floor load: '+phase);
  if(f.surface){
   if(!d.basis||!Number.isSafeInteger(d.basis.life)||d.basis.life<0||f.surface.life!==d.basis.life||!f.surfacePoint?.every(Number.isFinite)||!f.surfaceNormal?.every(Number.isFinite))throw Error('164 footprint life/plane provenance invalid: '+phase);
  }
 }
 if(!Number.isFinite(d.height)||!Number.isFinite(d.targetHeight)||Math.abs(d.height)>d.margin+1e-12||Math.abs(d.targetHeight)>d.margin+1e-12)throw Error('164 mount exceeds unchanged native margin: '+phase);
 if(d.reason&&d.targetHeight!==0)throw Error('164 unknown/incompatible source support authorized mount: '+phase);
}
export function finishCoordination172(samples){
 const result={scope:'Actual presentation-role/lease provenance, not native synchronized contacts or visual approval.',routes:{}};
 for(const route of ['on','off']){
  const rows=samples.filter(r=>r.phase.startsWith(route+'-')&&!r.phase.includes('action-probe')&&!r.phase.includes('jump')).map(r=>({phase:r.phase,d:route==='on'?r.sample.feline.diagnostics.find(d=>d.actor===r.sample.actors.find(a=>a.name==='Playable172')?.id)?.coordination164:r.sample.contact?.sourceCoordination164})).filter(r=>r.d);
  const mixed=direction=>rows.filter(r=>r.phase===route+'-moving-R-'+direction&&r.d.foreRoleBasis?.stance>0&&r.d.foreRoleBasis?.stance<1).length;
  const leases=rows.filter(r=>r.d.feet.some(f=>f.surface)).length;
  result.routes[route]={samples:rows.length,mixedUp:mixed('up'),mixedDown:mixed('down'),currentClientLeaseSamples:leases,unknownOrIncompatible:rows.filter(r=>r.d.reason).length};
  if(!mixed('up')||!mixed('down')||!leases)throw Error('164 actual both-direction R/current-client-lease coverage missing: '+route);
 }
 return result;
}
