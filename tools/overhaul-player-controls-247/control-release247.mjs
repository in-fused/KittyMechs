export const wrappedYaw=(next,previous)=>Math.atan2(Math.sin(next-previous),Math.cos(next-previous));
export function edgeWindow247(events,mark,keys){return events.filter(e=>e.at>=mark&&keys.includes(e.code));}
export function releasedPacket247(post,pre,packet,edges,requestedCodes=null){
 if(!packet||!edges.length)return null;
 const codes=requestedCodes??[...new Set(edges.filter(e=>e.kind==='keydown').map(e=>e.code))];
 if(!codes.length||codes.some(code=>!edges.some(e=>e.code===code&&e.kind==='keydown'&&e.focused)||!edges.some(e=>e.code===code&&e.kind==='keyup'&&e.focused)))return null;
 const lastUp=Math.max(...edges.filter(e=>e.kind==='keyup').map(e=>e.at));
 if(codes.some(code=>edges.findLast(e=>e.code===code)?.kind!=='keyup'))return null;
 const rows=post.input.sent.filter(s=>s.at>lastUp&&s.localId===pre.actor.id&&s.generation===pre.localReadiness.generation&&s.input.jumpEpoch===pre.actor.jumpEpoch&&s.input.seq>packet.input.seq&&s.input.forward===0&&s.input.strafe===0&&!s.input.fire&&!s.input.rocket);
 // Two later packets establish released LOOK stability; neutral axes while J/L
 // remains held never count. Return the second packet, whose ACK is required.
 for(let i=1;i<rows.length;i++)if(rows[i].input.seq>rows[i-1].input.seq&&rows[i].at>rows[i-1].at&&Math.abs(wrappedYaw(rows[i].input.yaw,rows[i-1].input.yaw))<1e-6&&Math.abs(wrappedYaw(post.input.look.yaw,rows[i].input.yaw))<1e-6)return rows[i];
 return null;
}
export function idleLook247(pre,post,key){
 const direction=key==='KeyJ'?1:-1,look=wrappedYaw(post.input.look.yaw,pre.input.look.yaw),camera=wrappedYaw(post.camera.lookYaw,pre.camera.lookYaw),ray=wrappedYaw(post.input.look.cameraRay?.yaw,pre.input.look.cameraRay?.yaw),aim=wrappedYaw(post.actor.aimYaw,pre.actor.aimYaw),body=wrappedYaw(post.actor.yaw,pre.actor.yaw),cameraDistance=Math.hypot(post.camera.position.x-pre.camera.position.x,post.camera.position.y-pre.camera.position.y,post.camera.position.z-pre.camera.position.z),displacement=Math.hypot(post.actor.position.x-pre.actor.position.x,post.actor.position.z-pre.actor.position.z);
 return {pass:direction*look>.05&&direction*camera>.05&&direction*ray>.02&&Math.abs(aim)>.02&&Math.abs(body)<.03&&displacement<.04&&cameraDistance>.02,look,camera,ray,aim,body,cameraDistance,displacement,contract:'Idle LOOK changes actual camera/look/aim, body remains idle; presentation quality unqualified'};
}
export function steering247(samples){
 const moving=samples.filter(r=>Math.hypot(r.actor.velocity.x,r.actor.velocity.z)>.3);
 const errors=moving.map(r=>({tick:r.tick,bodyError:Math.abs(wrappedYaw(r.input.look.yaw,r.actor.yaw)),travelError:Math.abs(wrappedYaw(Math.atan2(-r.actor.velocity.x,-r.actor.velocity.z),r.actor.yaw))}));
 const last=errors.at(-1),initial=Math.abs(wrappedYaw(samples[0].input.look.yaw,samples[0].actor.yaw)),peak=Math.max(...errors.map(r=>r.bodyError));
 return {pass:errors.length>=3&&initial<.2&&peak>.02&&last.bodyError<.2&&last.bodyError<peak&&last.travelError<.4,initial,peak,last,errors,contract:'Aligned W + LOOK, actual movement travel and shortest-arc body convergence after LOOK keyup while W remains held'};
}
