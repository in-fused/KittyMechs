import {WebSocket} from 'ws';
import {Navigation} from '../../../shared/navigation';
import {actorHullRadius} from '../../../shared/config';
import {distance,horizontalDistance} from '../../../shared/math';
import {generateChunk,landmarkBlocks,propCollider,terrainHeight} from '../../../shared/world';
import {traversalBlocks} from '../../../shared/traversal';
import {encounterBlocks} from '../../../shared/encounters';
import {parseInput,parseJoin} from '../../../shared/protocol';
import {WORLD_LAYOUT_VERSION} from '../../../shared/layout';
import {INPUT_PROTOCOL_VERSION} from '../../../shared/inputProtocol';
import {emptyInput,type ClientMessage,type GameSnapshot,type InputState,type ServerMessage,type Vec3} from '../../../shared/types';
import type {RouteEvidence} from './coop-pilot';

interface Box {position:Vec3;half:[number,number,number];yaw:number;id?:string;}
function segmentBox(from:Vec3,to:Vec3,box:Box) {
  const c=Math.cos(box.yaw),s=Math.sin(box.yaw),local=(p:Vec3)=>{const x=p.x-box.position.x,z=p.z-box.position.z;return [x*c-z*s,p.y-box.position.y,x*s+z*c];};
  const a=local(from),b=local(to);let enter=0,leave=1;
  for(let i=0;i<3;i++){
    const delta=b[i]-a[i];if(Math.abs(delta)<1e-7){if(Math.abs(a[i])>box.half[i])return false;continue;}
    const u=(-box.half[i]-a[i])/delta,v=(box.half[i]-a[i])/delta;enter=Math.max(enter,Math.min(u,v));leave=Math.min(leave,Math.max(u,v));if(enter>leave)return false;
  }
  return leave>0&&enter<.995;
}

/** Ordinary network companion, not a second rendered/browser pilot. No authority
 * imports or state writes: only validated join/input and real server snapshots. */
export class WebSocketMedic {
  id='';readonly messages:{wallMs:number;time?:number;message:ClientMessage}[]=[];readonly errors:string[]=[];
  private current?:GameSnapshot;private timer?:ReturnType<typeof setInterval>;private sequence=0;private hot=false;
  private path:Vec3[]=[];private goal?:Vec3;private repathAt=0;private coverKey='';private events=new Set<number>();
  private navigation:Navigation;private boxes:Box[]=[];private began=Date.now();private stopped=false;private attacking=true;
  private constructor(private ws:WebSocket,readonly name:string,private leadName:string,private evidence:RouteEvidence,private seed:number) {
    this.navigation=new Navigation(seed);
    for(let cx=-2;cx<=2;cx++)for(let cz=-3;cz<=1;cz++)for(const p of generateChunk(seed,cx,cz).props){const half=propCollider(p);if(half)this.boxes.push({position:{x:p.x,y:p.y+half[1],z:p.z},half,yaw:p.rotation,id:p.id});}
    for(const b of [...landmarkBlocks(seed),...traversalBlocks(seed),...encounterBlocks(seed)])this.boxes.push({position:{x:b.position[0],y:b.position[1],z:b.position[2]},half:b.halfExtents,yaw:b.yaw});
  }
  static async join(invite:string,name:string,leadName:string,evidence:RouteEvidence,seed:number) {
    const link=new URL(invite),endpoint=new URL(invite);endpoint.protocol=link.protocol==='https:'?'wss:':'ws:';endpoint.pathname='/arena';endpoint.search='';endpoint.hash='';
    const ws=new WebSocket(endpoint),medic=new WebSocketMedic(ws,name,leadName,evidence,seed);
    try {
      await new Promise<void>((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('Ordinary medic join timed out')),15000);
        ws.on('open',()=>{const join=parseJoin({type:'join',room:link.searchParams.get('room')??'',name,chassis:'caracal',mode:'coop',create:false,seed,layoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION});if(!join||!join.room){clearTimeout(timeout);reject(new Error('Invalid arena invite for medic'));return;}medic.write(join);});
        ws.on('message',data=>{
          try {
            const message=JSON.parse(data.toString()) as ServerMessage;
            if(message.type==='welcome')medic.id=message.id;
            else if(message.type==='snapshot'){medic.observe(message.state);if(medic.id){clearTimeout(timeout);resolve();}}
            else if(message.type==='error'){medic.errors.push(message.message);clearTimeout(timeout);reject(new Error(message.message));}
          }catch(error){medic.errors.push(String(error));clearTimeout(timeout);reject(error);}
        });
        ws.on('error',error=>{medic.errors.push(String(error));clearTimeout(timeout);reject(error);});
        ws.on('close',()=>{if(!medic.stopped)medic.errors.push('Ordinary medic socket closed unexpectedly');});
      });
      medic.timer=setInterval(()=>{
        try{if(Date.now()-medic.began>180000){medic.errors.push('Bounded180-second medic window expired');void medic.close();return;}medic.control();}
        catch(error){medic.errors.push(String(error));void medic.close();}
      },50);
      return medic;
    }catch(error){await medic.close();throw error;}
  }
  snapshot(){if(!this.current)throw new Error('Medic has no real snapshot yet');return this.current;}
  actor(){return this.snapshot().actors.find(a=>a.id===this.id)!;}
  /** A support exercise still sends ordinary inputs and permits real repair. */
  setAttacking(enabled:boolean){this.attacking=enabled;this.control();}
  private observe(state:GameSnapshot) {
    const before=this.current;this.current=state;
    for(const event of state.events)if(!this.events.has(event.id)){
      this.events.add(event.id);if(!this.evidence.events.some(e=>e.id===event.id))this.evidence.events.push(event);
      if(before&&event.type==='repair'&&event.actor===this.id&&event.at>before.time-.02&&!state.events.some(e=>e.type==='supply'&&e.at>=before.time-.02&&e.at<=state.time)) {
        const healer=before.actors.find(a=>a.id===this.id);
        const targets=before.actors.filter(a=>healer&&!a.bot&&a.hp>0&&a.hp<a.maxHp&&before.time-a.hurtAt<6&&distance(a.position,healer.position)<9.8).flatMap(a=>{
          const healed=state.actors.find(b=>b.id===a.id),gain=healed?healed.hp-a.hp:0;
          const lineOfSight=!!healer&&this.clear(before,{...healer.position,y:healer.position.y+.65},{...a.position,y:a.position.y+.4});
          return healed&&gain>0&&state.time-a.hurtAt<7&&healed.respawnAt===a.respawnAt&&lineOfSight?[{id:a.id,before:a.hp,after:healed.hp,gain,hurtAt:a.hurtAt,respawnAt:a.respawnAt,afterRespawnAt:healed.respawnAt,distance:distance(a.position,healer!.position),lineOfSight}]:[];
        });
        if(targets.length)this.evidence.beneficialRepairs.push({actor:this.id,at:event.at,targets});
      }
    }
    const actor=state.actors.find(a=>a.id===this.id);
    if(actor)this.evidence.samples.push({time:state.time,name:this.name,hp:actor.hp,position:{...actor.position},kills:actor.kills,pulseAt:actor.pulseAt,abilityAt:actor.abilityAt});
  }
  private write(message:ClientMessage){if(this.ws.readyState!==WebSocket.OPEN)return;this.messages.push({wallMs:Date.now()-this.began,time:this.current?.time,message});this.ws.send(JSON.stringify(message));}
  private send(patch:Partial<InputState>){const actor=this.current?.actors.find(a=>a.id===this.id);const input=parseInput({...emptyInput(),seq:++this.sequence,jumpEpoch:actor?.jumpEpoch??0,...patch});if(!input)throw new Error('Invalid medic input construction');this.write({type:'input',input});}
  private clear(state:GameSnapshot,from:Vec3,to:Vec3) {
    const destroyed=new Set(state.cover.filter(c=>c.hp<=0).map(c=>c.id));if(this.boxes.some(b=>!(b.id&&destroyed.has(b.id))&&segmentBox(from,to,b)))return false;
    const steps=Math.ceil(horizontalDistance(from,to)/2);for(let i=1;i<steps;i++){const t=i/steps,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;if(from.y+(to.y-from.y)*t<terrainHeight(x,z,this.seed)+.04)return false;}return true;
  }
  private control() {
    const state=this.current,actor=state?.actors.find(a=>a.id===this.id);if(!state||!actor||this.stopped)return;
    if(actor.hp<=0){this.path=[];this.repathAt=0;this.send({});return;}
    // Always escort/capture/guard West. Completion never advances this pilot to
    // East or another objective while browser checkpoint assertions are running.
    const west=state.objectives.find(o=>o.id==='relay-west')!,lead=state.actors.find(a=>a.name===this.leadName);
    let goal={...west.position,x:west.position.x+2.15,y:west.position.y+1};
    if(!west.complete&&lead&&lead.hp>0&&horizontalDistance(lead.position,west.position)>8&&horizontalDistance(actor.position,lead.position)>9)goal={...lead.position,x:lead.position.x+4.4};
    const cover=state.cover.filter(c=>c.hp<=0).map(c=>c.id).join('|');if(cover!==this.coverKey){this.coverKey=cover;this.navigation.setPropFilter(p=>!p.id||!state.cover.some(c=>c.id===p.id&&c.hp<=0));this.repathAt=0;}
    if(state.time>=this.repathAt||!this.goal||horizontalDistance(this.goal,goal)>3){this.path=this.navigation.path(actor.position,goal);this.goal=goal;this.repathAt=state.time+1;}
    while(this.path.length&&horizontalDistance(actor.position,this.path[0])<1.05)this.path.shift();
    const next=horizontalDistance(actor.position,goal)<6?goal:this.path[0]??actor.position;let mx=next.x-actor.position.x,mz=next.z-actor.position.z;
    if(horizontalDistance(actor.position,goal)<.35){mx=0;mz=0;}
    for(const other of state.actors)if(other.id!==actor.id&&other.hp>0&&Math.abs(actor.position.y-other.position.y)<2){const d=horizontalDistance(actor.position,other.position),spacing=actorHullRadius(actor)+actorHullRadius(other)+.3;if(d>.01&&d<spacing){mx+=(actor.position.x-other.position.x)/d*(spacing-d)*1.5;mz+=(actor.position.z-other.position.z)/d*(spacing-d)*1.5;}}
    const length=Math.hypot(mx,mz);if(length>1){mx/=length;mz/=length;}
    const muzzle={...actor.position,y:actor.position.y+.65};
    const threats=state.actors.filter(a=>a.bot&&a.hp>0&&horizontalDistance(actor.position,a.position)<44&&this.clear(state,muzzle,{...a.position,y:a.position.y+.6})).sort((a,b)=>horizontalDistance(a.position,west.position)-horizontalDistance(b.position,west.position)||horizontalDistance(a.position,actor.position)-horizontalDistance(b.position,actor.position));
    const target=threats[0];let yaw=length>.1?Math.atan2(-mx,-mz):actor.aimYaw,pitch=0;
    if(target){const travel=Math.min(.35,horizontalDistance(actor.position,target.position)/105),dx=target.position.x+target.velocity.x*travel-actor.position.x,dz=target.position.z+target.velocity.z*travel-actor.position.z;yaw=Math.atan2(-dx,-dz);pitch=Math.atan2(target.position.y+.6-muzzle.y,Math.max(1,Math.hypot(dx,dz)-1.3));}
    if(actor.heat>77)this.hot=true;if(actor.heat<48)this.hot=false;
    const injured=state.actors.some(a=>!a.bot&&a.hp>0&&a.maxHp-a.hp>5&&distance(a.position,actor.position)<9.8&&this.clear(state,muzzle,{...a.position,y:a.position.y+.4}));
    const boost=actor.grounded&&actor.energy>=40&&actor.abilityReadyAt<=state.time&&injured;
    const interact=!west.complete&&actor.grounded&&distance(actor.position,{...west.position,y:west.position.y+1})<4.4;
    const rocket=this.attacking&&!!target&&!this.hot&&actor.rocketReadyAt<=state.time&&horizontalDistance(actor.position,target.position)>8&&horizontalDistance(actor.position,target.position)<35&&target.hp>65;
    this.send({forward:-Math.sin(yaw)*mx-Math.cos(yaw)*mz,strafe:Math.cos(yaw)*mx-Math.sin(yaw)*mz,yaw,pitch,fire:this.attacking&&!!target&&!this.hot,rocket,boost,interact});
  }
  async close(){
    if(this.stopped)return;this.stopped=true;if(this.timer)clearInterval(this.timer);this.send({});
    if(this.ws.readyState===WebSocket.CLOSED)return;
    await new Promise<void>(resolve=>{const timeout=setTimeout(()=>{this.ws.terminate();resolve();},1000);this.ws.once('close',()=>{clearTimeout(timeout);resolve();});this.ws.close();});
  }
}
