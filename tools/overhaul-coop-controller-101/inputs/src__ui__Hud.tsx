import { useEffect, useState } from 'react';
import { getMap } from '../../shared/maps';
import { MECHS, STANCE_TRANSITION, UPRIGHT } from '../../shared/config';
import { distance, horizontalDistance } from '../../shared/math';
import { useGameStore } from '../state/store';
import { leaveGame } from '../game/network';
import { cameraDiagnostics, runtime } from '../game/runtime';
import { TouchControls } from './TouchControls';
import { TacticalMap } from './TacticalMap';
import { inspectStanceDelivery,toggleStance } from '../game/input';
import { weatherAt } from '../../shared/weather';
import {faceCoordinates,faceTangentLimit,nearbyBuildingFaces} from '../../shared/buildingSurfaces';
import {actorHullRadius} from '../../shared/config';
import {SUPPLIES,SUPPLY_REACH,REPAIR_SHARE_RADIUS} from '../../shared/supplies';
import {optionalEncounter,optionalEncounterSupported} from '../../shared/encounters';
import {COOP_REVIVE,coopReviveTarget} from '../../shared/overhaulCoop';
import {coopExtractionWait,withinObjectiveReach,OBJECTIVE_REACH} from '../../shared/coopExtraction';
export function Hud(){
  const state=useGameStore(),snap=state.hud,actor=snap?.actors.find(a=>a.id===state.playerId),map=getMap(state.seed);
  const stanceNotice=inspectStanceDelivery().notice;
  const [copied,setCopied]=useState(false),[scoreOpen,setScoreOpen]=useState(false),[mapOpen,setMapOpen]=useState(false);
  useEffect(()=>{const down=(e:KeyboardEvent)=>{if(e.code==='KeyM'&&!e.repeat&&!(e.target instanceof HTMLInputElement))setMapOpen(v=>!v);};window.addEventListener('keydown',down);return()=>window.removeEventListener('keydown',down);},[]);
  useEffect(()=>{const down=(e:KeyboardEvent)=>{if(e.code==='Tab'){e.preventDefault();setScoreOpen(true);}},up=(e:KeyboardEvent)=>{if(e.code==='Tab')setScoreOpen(false);};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};},[]);
  const copy=async()=>{document.exitPointerLock?.();try{await navigator.clipboard.writeText(state.invite);setCopied(true);setTimeout(()=>setCopied(false),2500);}catch{setScoreOpen(true);}};
  const reach=(position:{x:number;y:number;z:number})=>actor?distance(actor.position,{...position,y:position.y+1}):Infinity;
  const coopFailed=snap?.coop?.status==='failed';
  const reviveNear=snap?.coop&&actor?coopReviveTarget(snap.actors,actor):undefined;
  const reviveBlocked=reviveNear&&actor&&runtime.clearRay?.({...actor.position,y:actor.position.y+.4},{...reviveNear.position,y:reviveNear.position.y+.4})===false;
  const reviveNeedsRoom=reviveNear&&snap?.actors.some(a=>a.id!==reviveNear.id&&a.hp>0&&horizontalDistance(a.position,reviveNear.position)<actorHullRadius(reviveNear)+actorHullRadius(a)+.05);
  const nearest=snap?.objectives.filter(o=>o.unlocked&&!o.complete&&(!o.optional||optionalEncounterSupported(state.seed,o.id,snap.structures))).sort((a,b)=>reach(a.position)-reach(b.position))[0];
  const interaction=!coopFailed&&!reviveNear&&snap?.mode!=='pvp'&&actor&&actor.hp>0&&nearest&&withinObjectiveReach(actor,nearest.position)&&(!nearest.optional||(actor.grounded&&!actor.climb&&Math.abs(actor.position.y-1-nearest.position.y)<.75));
  const extractionWait=snap?.mode==='coop'&&nearest?.id==='extraction'?coopExtractionWait(snap.actors,nearest.position):null;
  const contested=interaction&&snap?.actors.some(a=>a.bot&&a.hp>0&&((nearest!.optional&&a.id===optionalEncounter(state.seed,nearest!.id)?.guardian.id)||(nearest!.optional?distance(a.position,{...nearest!.position,y:nearest!.position.y+1}):horizontalDistance(a.position,nearest!.position))<7));
  const encounter=nearest?.optional?optionalEncounter(state.seed,nearest.id):null;
  const objectiveBlocked=interaction&&encounter&&runtime.clearRay?.({...actor.position,y:actor.position.y+.4},encounter.interactionPoint)===false;
  const supply=actor?.hp&&actor.grounded&&!actor.climb?snap?.supplies.filter(p=>p.claimedBy===null&&p.availableAt<=snap.time&&reach(p.position)<SUPPLY_REACH).sort((a,b)=>reach(a.position)-reach(b.position))[0]:undefined;
  const supplyBlocked=supply&&actor&&runtime.clearRay?.({...supply.position,y:supply.position.y+.7},{...actor.position,y:actor.position.y+.4})===false;
  const supplyUseful=supply&&actor&&(supply.kind==='energy'?actor.energy<100:supply.kind==='coolant'?actor.heat>0||actor.rocketReadyAt>(snap?.time??0):snap?.actors.some(a=>a.hp>0&&!a.bot&&a.hp<a.maxHp&&(a.id===actor.id||(snap.mode==='coop'&&distance(a.position,actor.position)<=REPAIR_SHARE_RADIUS&&runtime.clearRay?.({...actor.position,y:actor.position.y+.65},{...a.position,y:a.position.y+.4})!==false))));
  const pickup=snap?.events.filter(e=>e.type==='supply'&&e.actor===actor?.id&&snap.time-e.at<2.5).slice(-1)[0];
  const pvp=snap?.mode==='pvp';
  const upright=actor?.stance==='upright',changing=!!actor&&(snap?.time??0)-actor.stanceChangedAt<STANCE_TRANSITION,airborne=!!actor&&!actor.grounded&&!actor.climb,ability=airborne?(upright?'Aerial tackle':actor.aimPitch<=-.3?'Diving strike':'Feline pounce'):upright?UPRIGHT[actor?.chassis??state.chassis].name:MECHS[actor?.chassis??state.chassis].abilityName;
  const weather=weatherAt(state.seed,snap?.time??0,state.settings.reducedFlashes);
  // Use current view bearing, not the delayed authority gun direction. Only
  // unobstructed windups or an actual recent hit reveal a source to the pilot.
  const viewYaw=Math.atan2(cameraDiagnostics.position.x-cameraDiagnostics.focus.x,cameraDiagnostics.position.z-cameraDiagnostics.focus.z);
  const viewBearing=(position:{x:number;z:number})=>{
    if(!actor)return 'AHEAD';
    const yaw=Math.atan2(actor.position.x-position.x,actor.position.z-position.z)-viewYaw;
    const delta=Math.atan2(Math.sin(yaw),Math.cos(yaw));
    return Math.abs(delta)<Math.PI/4?'AHEAD':Math.abs(delta)>Math.PI*3/4?'BEHIND':delta<0?'RIGHT':'LEFT';
  };
  // Shared squad telemetry remains available through cover; it never reveals
  // an enemy location. Keep rescue needs visible outside interaction range.
  const squadNeeds=actor&&actor.hp>0&&snap?.mode==='coop'&&!coopFailed?snap.actors.filter(ally=>
    !ally.bot&&ally.id!==actor.id&&(!!ally.downed||(ally.hp>0&&snap.time>=ally.hurtAt&&snap.time-ally.hurtAt<1.5))
  ).sort((a,b)=>Number(!!b.downed)-Number(!!a.downed)||distance(a.position,actor.position)-distance(b.position,actor.position)).slice(0,2):[];
  const threats=actor&&actor.hp>0&&snap?snap.actors.filter(enemy=>{
    if(enemy.id===actor.id||(!enemy.bot&&snap.mode!=='pvp'&&snap.mode!=='pvpve'))return false;
    const recentHit=snap.events.some(e=>e.target===actor.id&&e.actor===enemy.id&&(e.type==='impact'||e.type==='explosion')&&snap.time>=e.at&&snap.time-e.at<1.2);
    return recentHit||(enemy.hp>0&&enemy.windupUntil>snap.time&&distance(enemy.position,actor.position)<40&&runtime.clearRay?.({...actor.position,y:actor.position.y+.65},{...enemy.position,y:enemy.position.y+.65})===true);
  }).sort((a,b)=>distance(a.position,actor.position)-distance(b.position,actor.position)).slice(0,2).map(enemy=>{
    const recentHit=snap.events.some(e=>e.target===actor.id&&e.actor===enemy.id&&(e.type==='impact'||e.type==='explosion')&&snap.time>=e.at&&snap.time-e.at<1.2);
    const bearing=viewBearing(enemy.position);
    return {id:enemy.id,name:enemy.name,bearing,range:Math.round(distance(enemy.position,actor.position)),high:enemy.position.y-actor.position.y>3,recentHit};
  }):[];
  const rescueUnderFire=!!reviveNear&&!!actor&&!!snap&&snap.time-actor.hurtAt<.3;
  const touch=matchMedia('(pointer:coarse)').matches;
  const climbNear=!reviveNear&&actor&&actor.hp>0&&!actor.climb&&nearbyBuildingFaces(state.seed,actor.position,actorHullRadius(actor)+1.4,16).find(face=>{const q=faceCoordinates(face,actor.position);return q.normal>=actorHullRadius(actor)-.5&&q.normal<actorHullRadius(actor)+1.4&&Math.abs(q.tangent)<=faceTangentLimit(face,actorHullRadius(actor))&&actor.position.y+.4>=face.minY&&actor.position.y-1<face.topY;});
  return <div className="hud">
    <div className="mission-status"><span className="eyebrow">{pvp?'PILOT DUEL':snap?.mode==='pvpve'?'CONTESTED EXPEDITION':snap?.mode==='training'?'SOLO EXPEDITION':'SQUAD EXPEDITION'}</span><strong>{map.name}</strong><p>{pvp?'First to 10 eliminations':nearest?`${nearest.name} · ${Math.round(reach(nearest.position))} m`:'Expedition complete'}</p><div className="mission-steps">{pvp?<span>{actor?.kills??0} / 10 ELIMINATIONS</span>:snap?.objectives.filter(o=>!o.optional).map(o=><span key={o.id} className={o.complete?'done':o.unlocked?'available':''}>{o.complete?'✓':'◇'} {o.name.replace(' RELAY','')}</span>)}</div></div>
    <div className="hud-topright"><span className="network-status"><i/>{state.connection} · {snap?.actors.filter(a=>!a.bot).length??1} PILOT{(snap?.actors.filter(a=>!a.bot).length??1)>1?'S':''}</span><div className="hud-buttons">{state.invite&&<button onClick={()=>void copy()}>{copied?'LINK COPIED ✓':'COPY INVITE ↗'}</button>}<button aria-label="Pause game" onClick={()=>{document.exitPointerLock?.();state.setPhase('paused');}}>Ⅱ</button></div></div>
    <div className="weather-label">{weather.front}{snap?.mode==='coop'&&<span className="checkpoint-status" role="status">SQUAD CHECKPOINT · {snap.checkpoint?.name??'LANDING ZONE'}</span>}</div>
    {pickup?.supplyKind&&<div className="supply-feedback" role="status">{SUPPLIES[pickup.supplyKind].name} COLLECTED</div>}
    {supply&&!reviveNear&&!interaction&&!actor?.climb&&!climbNear&&<div className="interaction-prompt supply-prompt"><span className="keycap">{supplyBlocked?'BLOCKED':!supplyUseful?'FULL':touch?'USE':'E'}</span><span>{SUPPLIES[supply.kind].name}</span><small>{supplyBlocked?'MOVE TO AN OPEN APPROACH':!supplyUseful?'LEAVE THIS CACHE FOR A PILOT WHO NEEDS IT':supply.kind==='repair'&&snap?.mode!=='coop'?'Restore 25% armor':SUPPLIES[supply.kind].description}</small></div>}
    {reviveNear&&<div className="interaction-prompt" role="status"><span className="keycap">{touch?'USE':'E'}</span><span>{reviveBlocked?'MOVE TO AN OPEN APPROACH':reviveNeedsRoom?'GIVE YOUR TEAMMATE ROOM TO STAND':`HOLD TO REVIVE ${reviveNear.name}`}</span><small>{rescueUnderFire?'UNDER FIRE · CLEAR THE THREAT BEFORE RESCUING':reviveNeedsRoom?`CLEAR THE BODY · KEEP WITHIN ${COOP_REVIVE.reach} m`:`STAND STILL · ${COOP_REVIVE.seconds} SECOND RESCUE · DAMAGE INTERRUPTS`}</small><div className="interact-track"><i style={{width:`${(reviveNear.downed?.reviveProgress??0)*100}%`}}/></div></div>}
    <button className={`stance-toggle ${upright?'stance-active':''}`} aria-label={upright?'Return to quadruped stance':'Transform to upright combat stance'} title="Change form on the ground with room overhead" disabled={!actor||actor.hp<=0||changing} onClick={toggleStance}>{changing?'TRANSFORMING':upright?'R · QUADRUPED FORM':'R · COMBAT FORM'}</button>
    {stanceNotice&&<div data-stance-feedback={stanceNotice.status} role="status" aria-live="polite" style={{position:'absolute',top:'7rem',left:'50%',transform:'translateX(-50%)',padding:'.5rem .8rem',background:'rgba(5,16,22,.92)',color:'#ecfaff',border:'1px solid #77bbc5',borderRadius:6,pointerEvents:'none',maxWidth:'min(90vw,28rem)',textAlign:'center'}}>{stanceNotice.text}</div>}
    <div className="crosshair" aria-hidden="true"><i/><i/><i/><i/><b/></div>
    {threats.length>0&&<div className="combat-threats">{threats.map(threat=><div key={threat.id} className={threat.recentHit?'threat-hit':''}><strong>{threat.recentHit?'TAKING FIRE':'ENEMY AIMING'} · {threat.bearing}{threat.high?' · ABOVE':''}</strong><span>{threat.name} · {threat.range} m</span></div>)}</div>}
    {squadNeeds.length>0&&<div className="squad-rescue" role="status">{squadNeeds.map(ally=><div key={ally.id}><strong>{ally.downed?'RESCUE REQUIRED':'TEAMMATE UNDER FIRE'}</strong><span>{ally.name} · {viewBearing(ally.position)} · {Math.round(distance(ally.position,actor!.position))} m</span><small>{ally.downed?(ally.downed.reviverId?`RESCUE ${Math.round(ally.downed.reviveProgress*100)}%`:'APPROACH · HOLD E TO REVIVE'):`${Math.ceil(ally.hp)} / ${ally.maxHp} ARMOR`}</small></div>)}</div>}
    {snap&&!pvp&&<button className="map-toggle" aria-expanded={mapOpen} onClick={()=>setMapOpen(v=>!v)}>M · {mapOpen?'CLOSE MAP':'ROUTE MAP'}</button>}
    {mapOpen&&snap&&!pvp&&<TacticalMap snapshot={snap} playerId={state.playerId}/>}
    {actor?.climb?<div className="interaction-prompt climb-prompt" role="status"><span className="keycap">{touch?'HOLD CLIMB':'HOLD C'}</span><span>{actor.climb.phase==='mantle'?'POWERED ROOF VAULT':actor.climb.phase==='grab'?'LOCKING CLAWS':touch?'JOYSTICK ↑ / ↓ · CLIMB':'W / S · ASCEND / DESCEND'}</span><small>{touch?'RELEASE CLIMB':'RELEASE C'} TO DROP · {Math.round(actor.energy)} ENERGY</small><div className="interact-track"><i style={{width:`${actor.climb.progress*100}%`}}/></div></div>:climbNear?<div className="interaction-prompt climb-prompt"><span className="keycap">{touch?'CLIMB + JOYSTICK':'HOLD C + W'}</span><span>{actor.stance==='upright'?'RETURN TO FOUR PAWS TO GRIP':actor.energy<8?'RECHARGE ENERGY TO CLIMB':'FACE WALL · CLAW GRIP'}</span><small>RELEASE TO DROP · CLAW ENERGY REQUIRED</small></div>:interaction&&<div className="interaction-prompt"><span className="keycap">{touch?'USE':'E'}</span><span>{objectiveBlocked?'MOVE TO AN OPEN APPROACH':contested?'CLEAR NEARBY HOSTILES':extractionWait==='revive'?'REVIVE ALL PILOTS BEFORE EXTRACTION':extractionWait==='assemble'?`BRING ALL PILOTS WITHIN ${OBJECTIVE_REACH} m`:`HOLD TO ${nearest?.id==='extraction'?'EXTRACT':nearest?.optional?'ACTIVATE':'RESTORE'} ${nearest?.name}`}</span><div className="interact-track"><i style={{width:`${(nearest?.progress??0)*100}%`}}/></div></div>}
    <div className="mech-status"><div className="pilot-heading"><span>{actor?.name??state.name}</span><small>{state.chassis.toUpperCase()} / ONLINE</small></div><div className="resource-label"><span>ARMOR INTEGRITY</span><strong>{Math.ceil(actor?.hp??220)}<small> / {actor?.maxHp??220}</small></strong></div><div className={`armor-bar ${(actor?.hp??220)<70?'critical':''}`}><i style={{width:`${(actor?.hp??220)/(actor?.maxHp??220)*100}%`}}/></div><div className="energy-line"><span>ENERGY</span><div><i style={{width:`${actor?.energy??100}%`}}/></div><strong>{Math.round(actor?.energy??100)}</strong></div><div className="stats-line"><span>◇ {actor?.salvage??0} SALVAGE</span><span>⌖ {actor?.kills??0} ELIMINATIONS</span></div></div>
    <div className="weapons-hud"><div><span className="keycap">LMB / F</span><section><strong>M-22</strong><span>{upright?'UPRIGHT FIRE CONFIG':'PULSE REPEATER'}</span><div className="heat-bar"><i style={{width:`${actor?.heat??0}%`}}/></div></section><b>∞</b></div><div><span className="keycap">Q / RMB</span><section><strong>R-64</strong><span>MICRO MISSILE</span></section><b className={(actor?.rocketReadyAt??0)>(snap?.time??0)?'cooling':''}>{(actor?.rocketReadyAt??0)>(snap?.time??0)?((actor?.rocketReadyAt??0)-(snap?.time??0)).toFixed(1)+'s':'READY'}</b></div><div className="ability-line"><span className="keycap">SHIFT</span><span>{ability.toUpperCase()}</span><strong>{(actor?.abilityReadyAt??0)>(snap?.time??0)?((actor?.abilityReadyAt??0)-(snap?.time??0)).toFixed(1)+'s':'READY'}</strong></div></div>
    <div className="controls-hint">{airborne?'SHIFT POUNCE · AIM DOWN + SHIFT DIVE · UPRIGHT + SHIFT TACKLE · V LEVEL VIEW':'WASD MOVE · IJKL LOOK · V LEVEL VIEW · R FORM · HOLD C + W CLIMB · SPACE JUMP · SHIFT ABILITY · E INTERACT · TAB SQUAD · ESC MENU'}</div>
    {actor&&actor.hp<=0&&<div className="death-overlay" role="status"><span className="eyebrow">{coopFailed?'SQUAD DOWN':actor.downed?'RESCUE REQUIRED':'CHASSIS COMPROMISED'}</span><h2>{coopFailed?'Expedition failed.':actor.downed?'Hold on, pilot.':'Another life. Another fight.'}</h2><p>{coopFailed?(snap!.time<(snap!.coop!.retryReadyAt??0)?'Checkpoint retry ready shortly.':`${touch?'Release and press USE':'Release and press E'} to retry at ${snap!.checkpoint?.name??'the landing zone'}.`):actor.downed?(actor.downed.reviverId?`RESCUE IN PROGRESS · ${Math.round(actor.downed.reviveProgress*100)}%`:'A teammate must hold E nearby to revive you.'):`Rebuilding in ${Math.max(0,Math.ceil(actor.respawnAt-(snap?.time??0)))} seconds`}</p></div>}
    {actor&&(snap?.time??0)>=actor.hurtAt&&(snap?.time??0)-actor.hurtAt<.25&&!state.settings.reducedFlashes&&<div className="damage-vignette"/>}
    {scoreOpen&&<div className="scoreboard"><span className="eyebrow">SQUAD TELEMETRY</span><h2>{pvp?'Pilot standings':'Expedition roster'}</h2>{snap?.actors.filter(a=>!a.bot).sort((a,b)=>b.kills-a.kills).map(a=><div className="score-row" key={a.id}><span>{a.name}{a.id===state.playerId?' (YOU)':''}</span><strong>{a.kills} K / {a.salvage} ◇</strong></div>)}{state.invite&&<input readOnly aria-label="Squad invite" value={state.invite} onClick={e=>e.currentTarget.select()}/>}</div>}
    {state.phase==='paused'&&<div className="modal-scrim"><section className="pause-panel"><span className="eyebrow">NEURAL LINK ON STANDBY</span><h2>Take a breath, pilot.</h2><p>{runtime.transport==='training'?'Your expedition is paused.':'Your arena stays live while this menu is open.'}</p><button className="primary" onClick={()=>state.setPhase('playing')}>RESUME EXPEDITION</button><button onClick={()=>useGameStore.setState({settingsOpen:true})}>SETTINGS</button><button className="quiet" onClick={leaveGame}>RETURN TO HANGAR</button></section></div>}
    {state.phase==='results'&&<div className="modal-scrim"><section className="results-panel"><span className="eyebrow">{pvp?'DUEL COMPLETE':'EXTRACTION CONFIRMED'}</span><h2>{snap?.mode==='pvpve'||pvp?`${snap?.actors.find(a=>a.id===snap.winner)?.name??'Pilot'} wins.`:'Home in one piece.'}</h2><p>{map.name} · {Math.floor((snap?.time??0)/60)}m {Math.floor((snap?.time??0)%60)}s</p><div className="results-stats"><div><strong>{actor?.kills??0}</strong><span>ELIMINATIONS</span></div><div><strong>{actor?.salvage??0}</strong><span>SALVAGE RECOVERED</span></div></div><button className="primary" onClick={leaveGame}>RETURN TO HANGAR</button></section></div>}
    <TouchControls/>
    {(import.meta.env.DEV||new URLSearchParams(location.search).get('debug')==='1')&&new URLSearchParams(location.search).get('debug')==='1'&&<div className="debug-overlay">{state.performance.fps} FPS · {state.performance.calls} calls · {Math.round(state.performance.triangles/1000)}k triangles<br/>{state.performance.chunks} chunks · {state.performance.bodies} bodies · {state.performance.geometries} geometries · {state.performance.textures} textures<br/>tick {snap?.tick??0} · {runtime.transport} · {actor?`${actor.position.x.toFixed(1)}, ${actor.position.y.toFixed(1)}, ${actor.position.z.toFixed(1)}`:''}</div>}
  </div>;
}
