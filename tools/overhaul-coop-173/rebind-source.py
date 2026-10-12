from pathlib import Path
p=Path('tools/overhaul-coop-173/motion-scheduler.mjs');t=p.read_text()
t=t.replace("throw Error('173 parked mate displacement invalidates motion commitment');", "{const error=Error('173 parked mate displacement invalidates motion commitment');error.parkedDisplaced=true;throw error;}")
start=t.index('const marks=new Map();');end=t.index('\n   await action(fresh);',start)
old=t[start:end];acquire=old[:old.index('Object.assign(receipt,')];acquire=acquire.replace('receipt.bindings=proofs.map','const bindings=proofs.map')
acquire+='return {fresh,bindings,room:s.room,epoch:s.publication.roomEpoch,tick:s.tick,sequence:s.publication.sequence,actualHandoff:s.actors.filter(a=>!a.bot)};'
anchor=' const run=async(name,goal,action,{downedPhase=false}={})=>{';assert anchor in t
t=t.replace(anchor,' const acquire=async(ps,active,downedPhase)=>{'+acquire+'};\n'+anchor)
t=t[:t.index('  try{const marks=new Map();')]+t[t.index('  try{const marks=new Map();'):].replace(old,"const admitted=await acquire(ps,active,downedPhase),fresh=admitted.fresh;Object.assign(receipt,admitted,{state:'HANDOFF_READY',activeArrival:1.1,downedPhase});delete receipt.fresh;",1)
t=t.replace(' return {page,run,commit:'," return {page,run,rebind:async()=>{if(!token)throw Error('173 motion token missing for rebind');const previous={bindings:token.bindings,certificate:token.certificate,planPublication:token.planPublication};token.state='PARKING';token.certificate=null;token.goal={intent:'UNCOMMITTED_AFTER_DISPLACEMENT'};const ps=pilots(),active=ps.find(p=>p.name===token.active),admitted=await acquire(ps,active,token.downedPhase);(token.rebindings??=[]).push({reason:'OLD_PARKED_POSE_CERTIFICATE_INVALIDATED',previous,current:admitted.bindings});Object.assign(token,admitted,{state:'HANDOFF_READY'});delete token.fresh;},commit:")
p.write_text(t)
p=Path('tools/overhaul-coop-173/mission-capture.mjs');t=p.read_text();needle="if(routeBudget.remaining--<=0)throw Error(\"173 original12 actual waypoint budget\");const result=";assert needle in t;t=t.replace(needle,"motion173.commit(next);"+needle)
needle="catch(error){await ctl.release();if(!error.routeThreat)throw error;";assert needle in t;t=t.replace(needle,"catch(error){await ctl.release();if(error.parkedDisplaced){await motion173.rebind();const current=planningRead173(await read(p),name,guard),replanned=current.route(target);(evidence.planning173??=[]).push({phase:currentPhase,kind:'DISPLACEMENT_RELEASE_NEUTRAL_ACK_REST_FRESH_ACTUAL_REPLAN',...replanned});if(!replanned.path)throw Error('173 displaced parked mate fresh actual corridor infeasible');continue;}if(!error.routeThreat)throw error;")
p.write_text(t)
