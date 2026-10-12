from pathlib import Path
import re
base=Path('tools/overhaul-coop-201'); out=Path('tools/overhaul-coop-204')
p=(base/'planner.mjs').read_text(encoding='utf8')
p=p.replace("from './geometry-source.mjs'","from '../overhaul-coop-201/geometry-source.mjs'").replace("from './terrain-base.mjs'","from '../overhaul-coop-201/terrain-base.mjs'")
p=p.replace('function certifyRadius201(', 'export function certifyRadius204(').replace('certifyRadius201(', 'certifyRadius204(')
(out/'geometry204.mjs').write_text(p,encoding='utf8')
p=(base/'mission-capture.mjs').read_text(encoding='utf8')
p=re.sub(r"from '\./([^']+)'",lambda m:"from '../overhaul-coop-201/"+m[1]+"'",p)
p=p.replace("import {createMissionController201} from '../overhaul-coop-201/controller.mjs';","import {createMissionController204} from './controller.mjs';").replace('createMissionController201({','createMissionController204({motionToken:()=>motion201.active(),')
p=p.replace('Mission201Host','Mission204Host').replace('Mission201Guest','Mission204Guest').replace('coop201-public','coop204-public')
(out/'mission-capture.mjs').write_text(p,encoding='utf8')
p=(base/'controller.mjs').read_text(encoding='utf8').replace('createMissionController201','createMissionController204')
p=p.replace('beforePulse=async()=>{}})', 'beforePulse=async()=>{},motionToken=()=>null})')
p="import {command204,certifyCommand204,verifyRealized204,turnProof204} from './command-envelope.mjs';\n"+p
p=p.replace("const MOVE=['KeyW','KeyA','KeyS','KeyD'];", "const MOVE=['KeyW','KeyA','KeyS','KeyD'],TURN=['KeyJ','KeyL'];")
p=p.replace('await release(MOVE);const mark=', 'await release([...MOVE,...TURN]);const mark=')
p=p.replace("if(neutral&&r.actor.lastInput>=neutral.input.seq", "if(neutral&&neutral.input.yaw===r.current.yaw&&r.current.yaw===r.camera.movementYaw&&!TURN.some(k=>r.keys.includes(k))&&r.actor.lastInput>=neutral.input.seq")
begin=p.index('   const yaw=state.camera.movementYaw,dx=')
end=p.index('   // Aim the requested finite lease',begin)
p=p[:begin]+'''   const yaw=state.camera.movementYaw;if(!Number.isFinite(yaw))throw Error('Current public movement yaw unavailable');
   const feedback=command204(a,target,yaw);let commandCertificate=null,commandError=null;
   if(!state.snapshot)throw Error('204 complete actual lifecycle-fenced snapshot required');
   try{commandCertificate=certifyCommand204(state.snapshot,name,target,yaw,motionToken());}catch(error){commandError=error;}
   if(!commandCertificate){
    if(!commandError?.commandReceipt204)throw commandError;
    if(!feedback.turnError||commandError.commandReceipt204?.certificates.origin.clear===false||commandError.commandReceipt204?.certificates.endpoint.clear===false)throw commandError;
    const code=feedback.turnError>0?'KeyJ':'KeyL',requestedLeaseMs=Math.min(250,Math.abs(feedback.turnError)/1.9*1000),turn={iteration,start:{at:state.at,seq:state.seq,tick:state.tick,position:a.position,yaw},feedback,code,requestedLeaseMs};
    (result.turns??=[]).push(turn);let releaseReceipt;
    try{holding=true;await page.keyboard.press(code,{delay:requestedLeaseMs});}finally{releaseReceipt=await release([code]);turn.release=releaseReceipt;}
    const fresh=await settle({releaseReceipt}),r=fresh.receipt;
    try{turn.proof=turnProof204(state,fresh,code);}catch(error){evidence.failureReceipt={kind:'204_TURN_RELEASE_CURRENT_YAW_NATIVE_ACK_PROOF_MISSING',turn,fresh,error:String(error)};throw error;}
    turn.rest=fresh.rest;
    state=r;continue; // Rotation consumes the SAME original35 iteration budget.
   }
   (evidence.commandCertificates204??=[]).push(commandCertificate);
   const intended={forward:1,strafe:0},keys=['KeyW'];
''' +p[end:]
p=p.replace("const pulse={iteration,phase,target,start:","const pulse={iteration,phase,target,commandCertificate,start:")
p=p.replace("x.input.strafe===intended.strafe);", "x.input.strafe===intended.strafe&&x.input.yaw===yaw&&!x.input.boost&&!x.input.climb&&!x.input.jump&&!x.input.fire&&!x.input.rocket);")
p=p.replace("   const settled=await settle({packet,releaseReceipt});", "   const heldSends=observed.sent.filter(x=>x.at>=edges.heldStart&&x.at<=edges.heldEnd);if(heldSends.some(x=>x.input.forward!==1||x.input.strafe!==0||x.input.yaw!==yaw||x.input.boost||x.input.climb||x.input.jump)){evidence.failureReceipt={kind:'204_HELD_COMMAND_DIRECTION_CHANGED',pulse,heldSends};throw Error('204 actual held movement command changed');}\n   const settled=await settle({packet,releaseReceipt});")
p=p.replace("   pulse.actualTravel=", "   try{pulse.realizedCommandRegion=verifyRealized204(commandCertificate.command,[{position:observed.actor.position,snapshot:observed.snapshot},{position:settled.rest.position,snapshot:settled.receipt.snapshot}],name);}catch(error){evidence.failureReceipt={kind:'204_REALIZED_COMMAND_GEOMETRY_FAILURE',pulse,receipt:error.commandReceipt204};throw error;}\n   pulse.actualNativeInterval={startTime:pulse.start.time,moveAckTime:settled.ack.time,restTime:settled.rest.time,successfulHeldSends:heldSends.map(x=>({at:x.at,input:x.input})),interpretation:'Cumulative ACK/rest and observed positions; requested browser delay is not native hold duration'};\n   pulse.actualTravel=")
p=p.replace('release:()=>release(MOVE)', 'release:()=>release([...MOVE,...TURN])')
(out/'controller.mjs').write_text(p,encoding='utf8')
