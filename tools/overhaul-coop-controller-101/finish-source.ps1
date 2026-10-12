$base='tools/overhaul-coop-controller-101'
$m=Get-Content "$base/capture.mjs" -Raw
$m=$m.Replace('reserve45s final close inside465s','reserve30s final close inside450s').Replace('cleanupMs:45000,inclusiveMs:465000','cleanupMs:30000,inclusiveMs:450000').Replace('101 cleanup45s/inclusive465s bound','101 cleanup30s/inclusive450s bound').Replace('Math.min(45000,465000','Math.min(30000,450000')
$m=$m.Replace('let activeRescueName=null;','let activeRescueName=null,plannedExposure=false;')
$m=$m.Replace("if(down&&!activeRescueName)","if(down&&!activeRescueName&&!plannedExposure)").Replace('if(threat){const event=', 'if(threat&&!plannedExposure){const event=')
$m=$m.Replace('activeRescueName=rescueName;','activeRescueName=rescueName;')
$needle='const enablePublicPreview='
$ix=$m.IndexOf($needle)
$planned=@"
// These are finite planned native lifecycle phases in this ONE capture, not an
// automatic replay. Real AI combat supplies every damage/down receipt.
const exposeSquad=async(kind)=>{
 currentPhase='planned-organic-'+kind;plannedExposure=true;
 try{
  const s=(await read(host)).snapshot,alive=s.actors.filter(a=>a.bot&&a.hp>0);
  const h=s.actors.find(a=>a.name==='MissionHost');
  const target=alive.sort((a,b)=>Math.hypot(a.position.x-h.position.x,a.position.z-h.position.z)-Math.hypot(b.position.x-h.position.x,b.position.z-h.position.z))[0];
  if(!target)throw Error('No real living AI for planned '+kind+'; lifecycle unqualified');
  evidence.plannedExposure??=[];evidence.plannedExposure.push({kind,tick:s.tick,time:s.time,targetId:target.id,targetPosition:target.position});
  // Independent targets retain six-meter separation for native hulls.
  const destinations=kind==='down-revive'?[{x:target.position.x+11,z:target.position.z+8},{x:target.position.x+5,z:target.position.z+8}]:[{x:target.position.x+5,z:target.position.z+8},{x:target.position.x-1,z:target.position.z+8}];
  await together(pilots.map((p,i)=>async()=>{
   try{await go(p.page,p.name,destinations[i]);}
   catch(error){const actual=(await read(p.page)).snapshot.actors.find(a=>a.name===p.name);if(!actual?.downed||!String(error).includes('downed'))throw error;}
  }));
  await Promise.all(pilots.map(p=>release(p.page)));
  const until=Date.now()+45000;let actual;
  while(Date.now()<until){guard();actual=(await read(host)).snapshot;
   if(kind==='down-revive'&&actual.actors.some(a=>!a.bot&&a.downed))break;
   if(kind==='checkpoint-retry'&&actual.coop?.status==='failed')break;
   await host.waitForTimeout(100);
  }
  await sample('planned '+kind+' actual native outcome');
  if(kind==='down-revive'){
   const humans=actual.actors.filter(a=>!a.bot),fallen=humans.find(a=>a.downed);
   if(!fallen||!humans.some(a=>a.hp>0))throw Error('Planned organic single down with survivor not observed within45s');
   plannedExposure=false;await rescuePilot(fallen.name);
   if(!successfulRevives)throw Error('Planned ordinary public revive unqualified');
  }else{
   if(actual.coop?.status!=='failed'||!actual.actors.filter(a=>!a.bot).every(a=>a.hp<=0&&a.downed))throw Error('Planned organic squad failure not observed within45s');
   const checkpoint=actual.checkpoint,attempt=actual.coop.attempt;
   if(checkpoint?.objectiveId!=='relay-west')throw Error('Retry required actual west checkpoint');
   const until=Date.now()+5000;let ready;
   while(Date.now()<until){guard();ready=(await read(host)).snapshot;if(ready.time>=ready.coop.retryReadyAt)break;await host.waitForTimeout(50);}
   if(ready.time<ready.coop.retryReadyAt)throw Error('Native retry readiness missing within5s');
   // Establish a fresh ACKed release before public rising E.
   await host.keyboard.up('KeyE');const mark=await inputRead(host,'MissionHost');let neutral;
   const releaseUntil=Date.now()+1500;
   while(Date.now()<releaseUntil){guard();const r=await inputRead(host,'MissionHost');neutral=r.sent.find(x=>x.at>=mark.at&&x.input.seq>mark.seq&&!x.input.interact);if(neutral&&r.actor.lastInput>=neutral.input.seq)break;await host.waitForTimeout(40);}
   if(!neutral)throw Error('Planned retry fresh release send missing');
   await host.keyboard.down('KeyE');
   try{
    const until=Date.now()+5000;let restored;
    while(Date.now()<until){guard();restored=(await read(host)).snapshot;if(restored.coop?.status==='active'&&restored.coop.attempt===attempt+1)break;await host.waitForTimeout(60);}
    if(restored.coop?.status!=='active'||restored.coop.attempt!==attempt+1||restored.checkpoint?.objectiveId!=='relay-west'||!restored.objectives.find(o=>o.id==='relay-west')?.complete||restored.actors.filter(a=>!a.bot).length!==2||restored.actors.filter(a=>!a.bot).some(a=>a.hp<=0||a.downed||Math.hypot(a.position.x-checkpoint.position.x,a.position.z-checkpoint.position.z)>12))throw Error('Actual native checkpoint retry/roster restoration not observed');
    evidence.actualCheckpointRetry={before:actual.coop,after:restored.coop,checkpoint:restored.checkpoint,actors:restored.actors.filter(a=>!a.bot),neutral};
    await sample('planned native checkpoint retry restored');
   }finally{await host.keyboard.up('KeyE');}
  }
 }finally{plannedExposure=false;activeRescueName=null;await Promise.all(pilots.map(p=>release(p.page)));}
};

"@
$m=$m.Substring(0,$ix)+$planned+$m.Substring($ix)
$m=$m.Replace("currentPhase='east-relay-route';", "await exposeSquad('down-revive');await exposeSquad('checkpoint-retry');`n currentPhase='east-relay-route';")
$m=$m.Replace("if(!evidence.lifecycle.checkpointRetries.length)throw Error('Full finite lifecycle unqualified: checkpoint retry not observed; first failure cannot authorize an automatic retry');", "if(!evidence.actualCheckpointRetry||!evidence.lifecycle.checkpointRetries.length)throw Error('Full finite lifecycle unqualified: actual planned checkpoint retry not observed');")
[IO.File]::WriteAllText((Join-Path (Get-Location) "$base/mission-capture.mjs"),$m)
Remove-Item -LiteralPath "$base/capture.mjs"
