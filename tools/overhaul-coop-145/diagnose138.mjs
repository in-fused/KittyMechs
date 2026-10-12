import {readFileSync,writeFileSync} from 'node:fs';
import {groundGeometry138,groundPointClear138,planGroundPath138} from '../overhaul-coop-138/exposure-planner.mjs';
import {actorHullRadius,QUADRUPED_HEIGHT} from '../../shared/config.ts';
const start=performance.now();
const rows=JSON.parse(readFileSync('.sites-runtime/overhaul-20261010/coop138-public/native-keyframes.json','utf8'));
const e=JSON.parse(readFileSync('.sites-runtime/overhaul-20261010/coop138-public/evidence.json','utf8'));
const route=e.groundRoutes.at(-1),row=rows.find(r=>r.tick===route.tick&&r.shared.actors.some(a=>a.name===route.name));
if(!row)throw Error('Exact failed route native keyframe missing; do not substitute another tick');
const s=row.shared,actor=s.actors.find(a=>a.name===route.name),target=route.target;
const candidates=s.actors.filter(a=>a.id!==actor.id&&a.hp>0).map(a=>({id:a.id,bot:a.bot,position:a.position,radius:actorHullRadius(a),distance:Math.hypot(target.x-a.position.x,target.z-a.position.z),vertical:Math.abs(actor.position.y-a.position.y)}));
const out={scope:'EXACT_RETAINED138_COMPILED_PLANNER_DIAGNOSIS_ONLY_NO_NATIVE_PLAY',tick:row.tick,publication:row.publication,target,from:actor.position,candidates,modes:[]};
for(const [name,parked] of [['all',s.actors],['humans',s.actors.filter(a=>!a.bot)],['none',[]]]){
 const g=groundGeometry138(s);g.moverId=actor.id;g.parked=parked;g.movementYaw=0;
 out.modes.push({name,pointClear:groundPointClear138(g,target),path:planGroundPath138(g,actor.position,target)});
 if(performance.now()-start>6500)throw Error('Offline diagnostic exceeded6.5s work bound');
}
out.elapsedMs=performance.now()-start;
writeFileSync('tools/overhaul-coop-145/diagnosis138.json',JSON.stringify(out,null,2));
console.log(JSON.stringify({tick:out.tick,elapsedMs:out.elapsedMs,modes:out.modes,nearTarget:candidates.filter(a=>a.distance<1.75+1.1+a.radius&&a.vertical<QUADRUPED_HEIGHT)}));
