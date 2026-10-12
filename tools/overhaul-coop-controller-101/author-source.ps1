$base='tools/overhaul-coop-controller-101'
$c=Get-Content tools/overhaul-coop-play-076/controller.mjs -Raw
$c=$c.Replace('createWaypointController076','createMissionController101')
$c=$c.Replace('({page,name,guard,evidence})','({page,name,guard,evidence,onEvent=async()=>{}})')
$c=$c.Replace("if(!r.actor||r.actor.hp<=0)throw Error('Missing/downed public pilot');if(r.actor.hp<r.actor.maxHp||r.actor.hurtAt>=0)throw Error('Public waypoint pilot organically damaged; first failure STOP');", "if(!r.actor)throw Error(name+' missing public pilot');if(r.actor.hp<=0)throw Error(name+' downed on route');")
$c=$c.Replace('nativePose:a.nativePose','downed:a.downed')
$c=$c.Replace('const mark=await read();await release(MOVE);','await release(MOVE);const mark=await read();')
$c=$c.Replace('for(let iteration=0;iteration<35;iteration++){','for(let iteration=0;iteration<35;iteration++){')
$c=$c.Replace('guard();const a=state.actor,d=distance(a.position,target),prediction=stopPrediction(a,d);','guard();await onEvent(state);const a=state.actor,d=distance(a.position,target),prediction=stopPrediction(a,d);')
$c=$c.Replace("await Promise.all(keys.map(k=>page.keyboard.down(k)));const until=Date.now()+1500;", @"
await Promise.all(keys.map(k=>page.keyboard.down(k)));
    // Only distant travel receives a short, finite pre-observation lease.
    // The first successful-send observation still releases immediately, before ACK.
    // 250ms * observed/configured peak plus measured delay must fit remaining road.
    const leaseMs=d>6?Math.min(250,Math.max(0,((d-tolerance-prediction.predictedStopTravel)/maxSpeed)*1000-readMs-releaseMs)):0;
    pulse.preObservationLeaseMs=leaseMs;
    if(leaseMs>0)await page.waitForTimeout(leaseMs);
    guard();const until=Date.now()+1500;
"@)
$c=$c.Replace('let packet=null,observed=null,releaseReceipt=null;',"let packet=null,observed=null,releaseReceipt=null;")
$c=$c.Replace("const result={phase,target,tolerance,pulses:[],status:'RUNNING'};evidence.waypoints.push(result);","if(evidence.waypoints.length>=100)throw Error('Explicit101 waypoint record cap');const result={name,phase,target,tolerance,pulses:[],status:'RUNNING'};evidence.waypoints.push(result);")
$c=$c.Replace("return {read,lastObservation:()=>lastRead,release:()=>release(MOVE),moveTo};","return {read,lastObservation:()=>lastRead,release:()=>release(MOVE),moveTo,settle};")
[IO.File]::WriteAllText((Join-Path (Get-Location) "$base/controller.mjs"),$c)
$m=Get-Content tools/overhaul-coop-play-075/mission-capture.mjs -Raw
$m="import {createMissionController101} from './controller.mjs';`n"+$m
$m=$m.Replace('075','101').Replace('overhaul-coop-play-101','overhaul-coop-controller-101')
$m=$m.Replace("const buildReceipt=process.env.KITTYMECH_BUILD_RECEIPT;if(!buildReceipt||!/^[a-f0-9]{64}$/i.test(buildReceipt))", "const buildReceipt=process.env.KITTYMECH_BUILD_RECEIPT;if(buildReceipt!=='a7f4259eaa7f8398b9bd68bcf7302905195981ff283e6e04ae72e2a6da70abfe')")
$m=$m.Replace('reserve30s final close inside450s','reserve45s final close inside465s').Replace('101 cleanup30s/inclusive450s bound','101 cleanup45s/inclusive465s bound').Replace('Math.min(30000,450000','Math.min(45000,465000')
# Replace failed long go controller completely; no ACK-before-release route survives.
$from=$m.IndexOf('const faceNorth=')
$to=$m.IndexOf('// Track a live target',$from)
$new=@"
const routeControllers=new Map();
const controllerFor=(p,name)=>{
 if(!routeControllers.has(name))routeControllers.set(name,createMissionController101({page:p,name,guard,evidence,onEvent:async()=>{
  const v=await pilotRead(p,name),down=v.humans.find(h=>h.hp<=0&&h.downed);
  if(down)throw Error('Organic down requires coordinated rescue');
  const threat=squadThreats(v)[0];
  if(threat){const event=Error('ROUTE_COMBAT_EVENT');event.routeThreat=threat.id;throw event;}
 }}));
 return routeControllers.get(name);
};
const go=async(p,name,target,rescue=false,arrival=1.1,rescueName=null)=>{
 const ctl=controllerFor(p,name);
 // Bounded in-route encounters are mission events, not failed observations.
 // Every controller failure without an identified live threat stops immediately.
 for(let events=0;events<4;events++){
  try{return await ctl.moveTo(target,{phase:currentPhase,tolerance:arrival});}
  catch(error){await ctl.release();if(!error.routeThreat)throw error;
   await trackFire(p,name,error.routeThreat,rescue,{routeThreat:true});
  }
 }
 throw Error(name+' finite route event budget exhausted');
};
"@
$m=$m.Substring(0,$from)+$new+"`n"+$m.Substring($to)
$m=$m.Replace('events:[],errors:[],settledApproaches:[]','events:[],errors:[],waypoints:[],settledApproaches:[],bounds:{workMs:420000,cleanupMs:45000,inclusiveMs:465000,supervisorMs:480000,readinessMs:20000}')
$m=$m.Replace("const release=async p=>{for(const k of ['KeyW','KeyA','KeyS','KeyD','KeyF','KeyE','KeyJ','KeyL','KeyI','KeyK','KeyC','Space','ShiftLeft'])await p.keyboard.up(k);};", "const release=async p=>{await Promise.all(['KeyW','KeyA','KeyS','KeyD','KeyF','KeyE','KeyJ','KeyL','KeyI','KeyK','KeyC','Space','ShiftLeft'].map(k=>p.keyboard.up(k)));};")
# Remove per-waypoint health fetch and full repeated progress JSON writes; semantic native observer remains.
$af=$m.IndexOf('let authority;try{const h=')
$az=$m.IndexOf("evidence.events.push(",$af)
$m=$m.Substring(0,$af)+"const authority={source:'Exact committed WebSocket publication observer'};"+$m.Substring($az)
$m=$m.Replace("await persist('progress.json');console.log(label);", "console.log(label);")
# Native event observer provides independent organic-down witness.
$m=$m.Replace('evidence.native.bootstrap=[];', "evidence.native.bootstrap=[];evidence.lifecycle={organicDowns:[],revives:[],checkpointRetries:[]};const priorLife=new Map();")
$needle="const semantic=JSON.stringify("
$at=$m.IndexOf($needle)
$life=@"
 for(const a of s.actors.filter(a=>!a.bot)){
  const prior=priorLife.get(label+':'+a.id),now={down:!!a.downed,hp:a.hp,attempt:s.coop?.attempt};
  if(now.down&&!prior?.down)evidence.lifecycle.organicDowns.push({page:label,id:a.id,tick:s.tick,time:s.time,publication:pub,checkpoint:s.checkpoint,downed:a.downed});
  if(prior?.down&&!now.down&&now.hp>0)evidence.lifecycle.revives.push({page:label,id:a.id,tick:s.tick,time:s.time,publication:pub,attempt:s.coop?.attempt});
  if(prior?.attempt&&now.attempt>prior.attempt)evidence.lifecycle.checkpointRetries.push({page:label,id:a.id,tick:s.tick,time:s.time,publication:pub,checkpoint:s.checkpoint,from:prior.attempt,to:now.attempt});
  priorLife.set(label+':'+a.id,now);
 }
"@
$m=$m.Substring(0,$at)+$life+$m.Substring($at)
$m=$m.Replace("evidence.status='FULL_REQUIRED_MISSION_COMPLETE_INDEPENDENT_REVIEW_REQUIRED';", "if(!successfulRevives||!evidence.lifecycle.organicDowns.length||!evidence.lifecycle.revives.length)throw Error('Full mission unqualified: organic down/public revive not observed');evidence.retryQualification=evidence.lifecycle.checkpointRetries.length?'NATIVE_CHECKPOINT_RETRY_OBSERVED':'CHECKPOINT_RETRY_UNQUALIFIED_FIRST_FAILURE_STOP';if(!evidence.lifecycle.checkpointRetries.length)throw Error('Full finite lifecycle unqualified: checkpoint retry not observed; first failure cannot authorize an automatic retry');evidence.status='FULL_REQUIRED_MISSION_COMPLETE_INDEPENDENT_REVIEW_REQUIRED';")
$m=$m.Replace("r.snapshot.phase!=='extracted'||complete()", "r.snapshot.phase!=='extracted'||!r.snapshot.winner||r.snapshot.actors.filter(a=>!a.bot).length!==2||complete()")
# Lifecycle rescue navigation must not reject the already-downed target itself.
$m=$m.Replace('onEvent:async()=>{','onEvent:async()=>{').Replace("if(down)throw Error('Organic down requires coordinated rescue');","if(down&&!activeRescueName)throw Error('Organic down requires coordinated rescue');")
$m=$m.Replace('const routeControllers=new Map();','let activeRescueName=null;const routeControllers=new Map();')
$m=$m.Replace('const ctl=controllerFor(p,name);','const ctl=controllerFor(p,name);activeRescueName=rescueName;')
[IO.File]::WriteAllText((Join-Path (Get-Location) "$base/capture.mjs"),$m)
