from pathlib import Path
p=Path('tools/overhaul-coop-173/mission-capture.mjs');t=p.read_text()
def swap(a,b):
 global t
 if a not in t:raise RuntimeError('missing exact source pattern '+a[:80])
 t=t.replace(a,b,1)
swap("import {reserve173,planSquadStage173,finalExtraction173} from './squad-stage.mjs';","import {chooseActiveStage173,finalExtraction173} from './phased-stage.mjs';\nimport {createMotionScheduler173} from './motion-scheduler.mjs';")
swap("let stageReservations173=[];const planningRead173=(observed,name,check)=>createPlanningRead173({...observed,reservations173:stageReservations173},name,check);","const planningRead173=createPlanningRead173;\nconst motion173=createMotionScheduler173({pilots:()=>pilots,controller:(p,n)=>controllerFor(p,n),read,release,guard,evidence});")
swap("const g=reserve173(geometry173(state.snapshot,state.actor.id),stageReservations173),segment=", "motion173.validate(state.snapshot);const g=geometry173(state.snapshot,state.actor.id),segment=")
swap("const go=async(p,name,target,rescue=false,arrival=1.1,rescueName=null,stage=null)=>{", "const go=async(p,name,target,rescue=false,arrival=1.1,rescueName=null,stage=null)=>motion173.run(name,{intent:'UNCOMMITTED',target,stage},()=>goOwned173(p,name,target,rescue,arrival,rescueName,stage));\nconst goOwned173=async(p,name,target,rescue=false,arrival=1.1,rescueName=null,stage=null)=>{")
swap("const goal=initial.point??target,binding=initialRead.read,routeBudget={remaining:12};", "motion173.commit(initial);const goal=initial.point??target,binding=initialRead.read,routeBudget={remaining:12};")
start=t.index('const stageSquad173=async(');end=t.index('const squadGo=',start)
t=t[:start]+'''const activeStage173=async(p,name,objective,options)=>motion173.run(name,{intent:'UNCOMMITTED_ACTIVE_STAGE',objective,options},async fresh=>{
 const plan=chooseActiveStage173(fresh.snapshot,name,objective,{...options,guard});(evidence.phasedStages173??=[]).push(plan);
 if(!plan.path){evidence.failureReceipt={kind:'173_ACTIVE_STAGE_REJECTED',plan};throw Error('173 current active complete-arrival stage infeasible');}
 await goOwned173(p,name,plan.point);
});
const stageSquad173=async(objective,{hostReach=4,guestReach=10,extraction=false}={})=>{
 // Later host goal is never a currently occupied reservation during guest travel.
 await activeStage173(guest,'Mission173Guest',objective,{reach:guestReach,cover:true});
 await activeStage173(host,'Mission173Host',objective,{reach:extraction?4.5:hostReach,extraction});
 if(extraction)await motion173.run('Mission173Guest',{intent:'UNCOMMITTED_FINAL_EXTRACTION',objective},async fresh=>{
  const plan=finalExtraction173(fresh.snapshot,'Mission173Host','Mission173Guest',objective,guard);(evidence.phasedStages173??=[]).push({kind:'ACTUAL_PARKED_HOST_FINAL_EXTRACTION',...plan});
  if(!plan.path){evidence.failureReceipt={kind:'173_SEQUENTIAL_EXTRACTION_INFEASIBLE',plan};throw Error('173 active guest fullarrival/parkedhost extraction infeasible');}
  await goOwned173(guest,'Mission173Guest',plan.point);
 });
 if(extraction){const ended=(await read(host)).snapshot,humans=ended.actors.filter(a=>!a.bot);if(humans.length!==2||humans.some(a=>a.hp<=0||a.downed||Math.hypot(a.position.x-objective.x,a.position.y-(objective.y+1),a.position.z-objective.z)>=4.5))throw Error('173 actual twoalive3D extraction staging missing');}
};
''' +t[end:]
t=t.replace('plannedExposure=true;stageReservations173=[];','plannedExposure=true;')
swap("host=await hc.newPage();observeNative(host,'host');guard();", "host=motion173.page(await hc.newPage(),'Mission173Host');observeNative(host,'host');guard();")
swap("guest=await gc.newPage();observeNative(guest,'guest');guard();", "guest=motion173.page(await gc.newPage(),'Mission173Guest');observeNative(guest,'guest');guard();")
swap("await sample('planned native checkpoint retry restored');","motion173.reset();await sample('planned native checkpoint retry restored');")
p.write_text(t)
p=Path('tools/overhaul-coop-173/planning-read.mjs');t=p.read_text().replace("import {reserve173} from './squad-stage.mjs';\n",'').replace('const g=reserve173(geometry173(snapshot,actor.id),observed.reservations173??[]),','const g=geometry173(snapshot,actor.id),');p.write_text(t)
