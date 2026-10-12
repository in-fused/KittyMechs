from pathlib import Path
import hashlib
r=Path(__file__).resolve().parents[2];base=r/'tools/overhaul-coop-play-053/mission-capture.mjs'
assert hashlib.sha256(base.read_bytes()).hexdigest()=='9086be81576fa02213d4ed2bd954704c09fbbcfd6c67f240bc3c72fca08c7229'
s=base.read_text(encoding='utf8');a=s.index('const release=async p=>');b=s.index('const enablePublicPreview=')
s=s[:a]+"const parallelFailure=null;const release=async()=>{};\n"+s[b:]
s=s.replace("import {pilotAim,pilotGunAligned,pilotLatency} from '../overhaul-pilot-aim.ts';\n",'').replace("import {squadThreats} from '../overhaul-squad-policy.ts';\n",'')
a=s.index(" await sample('both pilots retain");b=s.index('}catch(error){evidence.status=',a)
s=s[:a]+r'''
 const last=evidence.events.at(-1);
 for(const [label,name] of [['host','MissionHost'],['guest','MissionGuest']]){
  const state=last[label],actor=state.snapshot.actors.find(a=>a.name===name),owner=state.owners?.diagnostics?.find(o=>o.actor===actor?.id);
  if(!owner||owner.firstFailure||owner.missingBones.length||owner.missingClips.length||owner.frameClock<0||state.camera.visualFrameClock!==state.camera.frameClock||state.camera.visualCorners!==8||!state.camera.fitAvailable)throw Error('055 missing actual selected owner/completed fitted local visual '+label);
 }
 if(evidence.native.parity.length<3)throw Error('055 insufficient exact native publications');
 await host.screenshot({path:resolve(output,'ready-host.png')});await guest.screenshot({path:resolve(output,'ready-guest.png')});evidence.status='SINGLE_OBSERVED_STARTUP_READY_INDEPENDENT_REVIEW_REQUIRED';
''' +s[b:]
s=s.replace('420000','100000').replace('450000','130000').replace('053420s work bound; reserve30s final close inside450s','055100s work bound; reserve30s final close inside130s').replace('053 cleanup30s/inclusive450s bound','055 cleanup30s/inclusive130s bound').replace("String(error).includes('053420s')","String(error).includes('055100s')")
s=s.replace("frozen build037",'frozen build038').replace("'.sites-runtime/overhaul-20261011/coop053-public'","'.sites-runtime/overhaul-20261010/startup055-public'")
s=s.replace("scope:'ONE ordinary two-client CO-OP mission through both relays, core and extraction. Public UI/keys and read-only diagnostics; no injected actors/HP/damage/warp/objectives. First genuine failure stops the capture. Optional roof objectives are not required mission phases.'","scope:'055 ONE uninstrumented startup-only public two-client038 candidate; same053UI/20s readiness/viewports/ownvideos. Stop before navigation. No native injection/profiler or performance/mission approval.'")
s=s.replace('camera:window.kittyMechDebug.camera(),performance:', 'camera:window.kittyMechDebug.camera(),owners:window.kittyIdentity57Runtime005?.read?.(),performance:')
s=s.replace('const ready=async(p,name)=>{guard();let timer;try{','const ready=async(p,name)=>{guard();let timer;const began=Date.now();let succeeded=false;try{')
s=s.replace('})]);}finally{clearTimeout(timer);}guard();};','})]);succeeded=true;}finally{clearTimeout(timer);(evidence.readiness??=[]).push({name,beganMs:began-start,elapsedMs:Date.now()-began,succeeded,boundMs:20000});}guard();};')
out=r/'tools/overhaul-startup-rig-055/startup-capture.mjs';assert not out.exists();out.write_text(s,encoding='utf8');print(hashlib.sha256(out.read_bytes()).hexdigest())
