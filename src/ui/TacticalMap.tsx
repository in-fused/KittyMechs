import { getMap,serviceApproaches } from '../../shared/maps';
import type { GameSnapshot } from '../../shared/types';
import {breakableCover} from '../../shared/traversal';
import {buildingFaces,facePoint} from '../../shared/buildingSurfaces';
import {SUPPLIES} from '../../shared/supplies';

const plans=new Map<number,ReturnType<typeof createPlan>>();
function createPlan(seed:number){
  const map=getMap(seed),faces=buildingFaces(seed);
  const buildings=faces.filter(f=>f.side==='north').map(north=>{
    const south=faces.find(f=>f.buildingId===north.buildingId&&f.side==='south')!;
    const corners=[facePoint(north,-north.width/2,north.minY),facePoint(north,north.width/2,north.minY),facePoint(south,-south.width/2,south.minY),facePoint(south,south.width/2,south.minY)];
    return{id:north.buildingId,kind:north.kind,corners,points:corners.map(p=>`${p.x},${p.z}`).join(' ')};
  });
  // Include road widths and every admitted footprint, including the eastern
  // city extension. A fixed viewport hid playable routes beyond x=120.
  const points=[map.spawn,...map.objectives.map(o=>o.position),...serviceApproaches(seed).flat(),...buildings.flatMap(b=>b.corners),
    ...map.roads.flatMap(r=>r.points.flatMap(p=>[{x:p.x-r.width/2,z:p.z-r.width/2},{x:p.x+r.width/2,z:p.z+r.width/2}]))];
  const x=Math.min(...points.map(p=>p.x))-14,z=Math.min(...points.map(p=>p.z))-14;
  const width=Math.max(...points.map(p=>p.x))-x+14,height=Math.max(...points.map(p=>p.z))-z+14;
  return{buildings,x,z,width,height};
}

export function TacticalMap({snapshot,playerId}:{snapshot:GameSnapshot;playerId:string}) {
  const map=getMap(snapshot.seed);
  let plan=plans.get(map.seed);if(!plan){plan=createPlan(map.seed);plans.set(map.seed,plan);}
  const pilots=snapshot.actors.filter(a=>!a.bot&&a.hp>0&&(snapshot.mode!=='pvpve'||a.id===playerId));
  const supplies=snapshot.supplies.filter(p=>p.claimedBy===null&&p.availableAt<=snapshot.time);
  const markers=[...pilots.map(a=>a.position),...supplies.map(p=>p.position),...snapshot.objectives.map(o=>o.position),...(snapshot.checkpoint?[snapshot.checkpoint.position]:[])];
  // Expand in grid-sized steps as visible squad markers leave the authored
  // districts. Hidden PvPvE pilots must not affect either markers or bounds.
  const x=Math.min(plan.x,...markers.map(p=>Math.floor((p.x-14)/20)*20)),z=Math.min(plan.z,...markers.map(p=>Math.floor((p.z-14)/20)*20));
  const width=Math.max(plan.x+plan.width,...markers.map(p=>Math.ceil((p.x+14)/20)*20))-x,
    height=Math.max(plan.z+plan.height,...markers.map(p=>Math.ceil((p.z+14)/20)*20))-z;
  return <section className="tactical-map" aria-label="Mission route map">
    <div><span className="eyebrow">MISSION ROUTES</span><small>M TO CLOSE</small></div>
    <svg viewBox={`${x} ${z} ${width} ${height}`} role="img" aria-label={`${map.name} buildings, roads, objectives and squad positions`}>
      <defs><pattern id="map-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#86a8ad" strokeWidth=".2" opacity=".2"/></pattern></defs>
      <rect x={x} y={z} width={width} height={height} fill="url(#map-grid)"/>
      {map.roads.map((r,i)=><polyline key={i} points={r.points.map(p=>`${p.x},${p.z}`).join(' ')} fill="none" stroke="#819a9b" strokeWidth={r.width/2} opacity=".35" strokeLinejoin="round" strokeLinecap="round"/>)}
      {plan.buildings.map(b=><polygon key={b.id} points={b.points} fill="#94e5ce" fillOpacity=".08" stroke="#94e5ce" strokeWidth=".65"><title>{b.kind==='workshop'?'Workshop':'City building'}</title></polygon>)}
      {serviceApproaches(snapshot.seed).map((path,i)=><polyline key={i} points={path.map(p=>`${p.x},${p.z}`).join(' ')} fill="none" stroke="#94e5ce" strokeWidth=".9" strokeDasharray="2 2" opacity=".7"/>)}
      {snapshot.objectives.map(o=><g key={o.id} transform={`translate(${o.position.x} ${o.position.z})`}><circle r={o.optional?3:4} fill={o.complete?'#93d7b2':o.optional?'#86dfff':o.unlocked?'#f0c584':'#4d686e'}/><text y="-8" textAnchor="middle" fill="#d9e6dc" fontSize="5">{o.optional?'↑ OPTIONAL UPLINK':o.name}</text></g>)}
      {snapshot.checkpoint&&<g transform={`translate(${snapshot.checkpoint.position.x} ${snapshot.checkpoint.position.z})`}><circle r="6" fill="none" stroke="#b4ffe4" strokeWidth="1"/><text y="10" textAnchor="middle" fill="#b4ffe4" fontSize="5">SQUAD CHECKPOINT</text></g>}
      {supplies.map(p=><g key={p.id} transform={`translate(${p.position.x} ${p.position.z})`}><path d="M0 -2L2 0L0 2L-2 0Z" fill={SUPPLIES[p.kind].color}/><title>{SUPPLIES[p.kind].name}</title></g>)}
      {breakableCover(snapshot.seed).filter(p=>!snapshot.cover?.some(c=>c.id===p.id&&c.destroyedAt!==null)).map(p=><path key={p.id} transform={`translate(${p.x} ${p.z})`} d="M-3 -3L3 3M3 -3L-3 3" stroke="#f0ac72" strokeWidth="1.5"/>)}
      {pilots.map(a=><g key={a.id} transform={`translate(${a.position.x} ${a.position.z}) rotate(${-a.yaw*180/Math.PI})`}><path d="M0 -5L3 3L0 1L-3 3Z" fill={a.id===playerId?'#b4ffe4':'#a7cbed'}/></g>)}
      <text x={x+8} y={z+10} fill="#c3d8d5" fontSize="6">N ↑</text>
    </svg>
    <p>Green outline: building footprint. Amber ×: breakable cover.<br/>Optional roof uplink: clear its guardian, then trigger an EMP.<br/>{snapshot.mode==='coop'?'Relays and core unlock shared squad respawn checkpoints.':'Restore relays, recover the core, return to extraction.'}</p>
  </section>;
}
