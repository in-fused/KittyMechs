import {expect,type Page} from '@playwright/test';
import {Navigation} from '../../../shared/navigation';
import {actorHullRadius} from '../../../shared/config';
import {CAMERA_LOOK_AHEAD} from '../../../src/game/camera/framing';
import {distance,horizontalDistance} from '../../../shared/math';
import {generateChunk,landmarkBlocks,propCollider,terrainHeight} from '../../../shared/world';
import {traversalBlocks} from '../../../shared/traversal';
import {encounterBlocks} from '../../../shared/encounters';
import {cityBlocks,cityBlockActive,type CityBlock} from '../../../shared/cityDistrict';
import type {ActorState,CombatEvent,GameSnapshot,ObjectiveState,Vec3} from '../../../shared/types';

interface Box {position:Vec3;half:[number,number,number];yaw:number;id?:string;city?:CityBlock;}
export interface RouteEvidence {
  samples:{time:number;name:string;hp:number;position:Vec3;kills:number;pulseAt:number;abilityAt:number}[];
  events:CombatEvent[];
  turns:{name:string;startedAt:number;endedAt:number;wallMs:number;requestedMs:number;goal:Vec3;objective?:string;goalDistance:number;objectiveDistance?:number;position:Vec3;hp:number;target?:string;forward:number;strafe:number;attack?:boolean}[];
  beneficialRepairs:{actor:string;at:number;targets:{id:string;before:number;after:number;gain:number;hurtAt?:number;respawnAt?:number;afterRespawnAt?:number;distance?:number;lineOfSight?:boolean}[]}[];
}
const movementKeys=['KeyW','KeyS','KeyA','KeyD'];
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

function segmentBox(from:Vec3,to:Vec3,box:Box) {
  const c=Math.cos(box.yaw),s=Math.sin(box.yaw),local=(p:Vec3)=>{const x=p.x-box.position.x,z=p.z-box.position.z;return [x*c-z*s,p.y-box.position.y,x*s+z*c];};
  const a=local(from),b=local(to);let enter=0,leave=1;
  for(let i=0;i<3;i++){
    const delta=b[i]-a[i];if(Math.abs(delta)<1e-7){if(Math.abs(a[i])>box.half[i])return false;continue;}
    const u=(-box.half[i]-a[i])/delta,v=(box.half[i]-a[i])/delta;enter=Math.max(enter,Math.min(u,v));leave=Math.min(leave,Math.max(u,v));if(enter>leave)return false;
  }
  return leave>0&&enter<.995;
}

/** Snapshot reasoning is read-only. Every action uses real page keyboard/mouse input. */
export class CoopPilot {
  private x=720;private y=450;private yaw=0;private pitch=.06;private hot=false;
  private navigation:Navigation;private geometry:Box[]=[];private coverKey='';
  private path:Vec3[]=[];private goal?:Vec3;private repathAt=0;
  private seenEvents=new Set<number>();
  constructor(readonly page:Page,readonly name:string,readonly evidence:RouteEvidence,private seed=7734) {
    this.navigation=new Navigation(seed);
    for(let cx=-2;cx<=2;cx++)for(let cz=-3;cz<=1;cz++)for(const prop of generateChunk(seed,cx,cz).props){
      const half=propCollider(prop);if(half)this.geometry.push({position:{x:prop.x,y:prop.y+half[1],z:prop.z},half,yaw:prop.rotation,id:prop.id});
    }
    for(const block of [...landmarkBlocks(seed),...traversalBlocks(seed),...encounterBlocks(seed)])this.geometry.push({position:{x:block.position[0],y:block.position[1],z:block.position[2]},half:block.halfExtents,yaw:block.yaw});
    for(const block of cityBlocks(seed))this.geometry.push({position:{x:block.position[0],y:block.position[1],z:block.position[2]},half:block.halfExtents,yaw:block.yaw,city:block});
  }
  async snapshot() {
    const state=await this.page.evaluate(()=>window.kittyMechDebug!.snapshot()!);
    for(const event of state.events)if(!this.seenEvents.has(event.id)){
      this.seenEvents.add(event.id);if(!this.evidence.events.some(e=>e.id===event.id))this.evidence.events.push(event);
    }
    const actor=state.actors.find(a=>a.name===this.name);
    if(actor)this.evidence.samples.push({time:state.time,name:this.name,hp:actor.hp,position:{...actor.position},kills:actor.kills,pulseAt:actor.pulseAt,abilityAt:actor.abilityAt});
    return state;
  }
  async actor(){return (await this.snapshot()).actors.find(a=>a.name===this.name)!;}
  private clear(state:GameSnapshot,from:Vec3,to:Vec3) {
    const destroyed=new Set(state.cover.filter(c=>c.hp<=0).map(c=>c.id));
    if(this.geometry.some(box=>!(box.id&&destroyed.has(box.id))&&(!box.city||cityBlockActive(box.city,state.structures))&&segmentBox(from,to,box)))return false;
    const steps=Math.ceil(horizontalDistance(from,to)/2);
    for(let i=1;i<steps;i++){const t=i/steps,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;if(from.y+(to.y-from.y)*t<terrainHeight(x,z,this.seed)+.04)return false;}
    return true;
  }
  async focus() {
    await this.page.bringToFront();
    await expect.poll(()=>this.page.evaluate(()=>document.hasFocus()),{timeout:5000}).toBe(true);
    if(!await this.page.evaluate(()=>!!document.pointerLockElement)){
      this.x=720;this.y=450;await this.page.mouse.move(this.x,this.y);await this.page.mouse.click(this.x,this.y);await this.page.waitForTimeout(100);
    }
  }
  async release() {
    await this.page.mouse.up();
    for(const key of [...movementKeys,'KeyE','ShiftLeft','KeyQ'])await this.page.keyboard.up(key);
  }
  private async look(yaw:number,pitch:number) {
    const delta=Math.atan2(Math.sin(yaw-this.yaw),Math.cos(yaw-this.yaw));this.x-=delta/.0021;this.y-=(pitch-this.pitch)/.0018;
    await this.page.mouse.move(this.x,this.y);this.yaw=yaw;this.pitch=pitch;
  }
  async face(yaw:number,pitch=.06){await this.focus();await this.release();await this.look(yaw,pitch);}
  async shootPoint(point:Vec3,duration=500){
    await this.focus();await this.release();const actor=await this.actor(),camera=await this.page.evaluate(()=>window.kittyMechDebug!.camera());
    const range=horizontalDistance(actor.position,point),d=clamp(horizontalDistance(camera.position,camera.focus),3,18),L=range+d;
    const sp=(point.y-camera.focus.y-4+4*L/(d+CAMERA_LOOK_AHEAD))/(-d+(16+d)*L/(d+CAMERA_LOOK_AHEAD));
    await this.look(Math.atan2(-(point.x-actor.position.x),-(point.z-actor.position.z)),Math.asin(clamp(sp,-.75,.65)));
    await this.page.mouse.down();try{await this.page.waitForTimeout(duration);}finally{await this.release();}
  }
  private movement(state:GameSnapshot,actor:ActorState,goal:Vec3) {
    const signature=state.cover.filter(c=>c.hp<=0).map(c=>c.id).join('|')+'|'+state.structures.map(s=>s.revision).join(',');
    if(signature!==this.coverKey){this.coverKey=signature;this.navigation.setPropFilter(prop=>!prop.id||!state.cover.some(c=>c.id===prop.id&&c.hp<=0));this.navigation.setStructureFilter(block=>cityBlockActive(block,state.structures));this.repathAt=0;}
    if(state.time>=this.repathAt||!this.goal||horizontalDistance(this.goal,goal)>3){this.path=this.navigation.path(actor.position,goal);this.goal={...goal};this.repathAt=state.time+1;}
    while(this.path.length&&horizontalDistance(actor.position,this.path[0])<1.2)this.path.shift();
    const near=horizontalDistance(actor.position,goal)<5,next=near?goal:this.path[0];
    let x=next?next.x-actor.position.x:0,z=next?next.z-actor.position.z:0;
    if(horizontalDistance(actor.position,goal)<.5){x=0;z=0;}
    for(const other of state.actors)if(other.id!==actor.id&&other.hp>0&&Math.abs(other.position.y-actor.position.y)<2){
      const d=horizontalDistance(actor.position,other.position),spacing=actorHullRadius(actor)+actorHullRadius(other)+.3;
      if(d>.01&&d<spacing){x+=(actor.position.x-other.position.x)/d*(spacing-d)*2;z+=(actor.position.z-other.position.z)/d*(spacing-d)*2;}
    }
    const length=Math.hypot(x,z);return length>1?{x:x/length,z:z/length}:{x,z};
  }
  async turn(goal:Vec3,options:{interact?:boolean;duration?:number;objective?:Pick<ObjectiveState,'id'|'position'>;attack?:boolean}={}) {
    const startedWall=Date.now();
    await this.focus();await this.release();
    const state=await this.snapshot(),actor=state.actors.find(a=>a.name===this.name)!;
    const objective=options.objective??state.objectives.find(o=>!o.optional&&!o.complete&&o.unlocked);
    const record=(after:GameSnapshot,forward=0,strafe=0,target?:string)=>{
      const current=after.actors.find(a=>a.id===actor.id)!;
      this.evidence.turns.push({name:this.name,startedAt:state.time,endedAt:after.time,wallMs:Date.now()-startedWall,requestedMs:options.duration??500,goal:{...goal},objective:objective?.id,goalDistance:distance(current.position,goal),objectiveDistance:objective?distance(current.position,{...objective.position,y:objective.position.y+1}):undefined,position:{...current.position},hp:current.hp,target,forward,strafe,attack:options.attack??true});
    };
    if(actor.hp<=0){await this.page.waitForTimeout(200);record(await this.snapshot());return;}
    const camera=await this.page.evaluate(()=>window.kittyMechDebug!.camera());
    const origin={...actor.position,y:actor.position.y+.65};
    const threats=state.actors.filter(a=>a.bot&&a.hp>0&&horizontalDistance(a.position,actor.position)<44&&this.clear(state,origin,{...a.position,y:a.position.y+.6})&&this.clear(state,camera.position,{...a.position,y:a.position.y+.6})).sort((a,b)=>horizontalDistance(actor.position,a.position)-horizontalDistance(actor.position,b.position));
    const target=threats[0],move=this.movement(state,actor,goal);let yaw=this.yaw,pitch=.06;
    if(target){
      const travel=Math.min(.25,horizontalDistance(actor.position,target.position)/105),point={x:target.position.x+target.velocity.x*travel,y:target.position.y+.6,z:target.position.z+target.velocity.z*travel};
      const range=horizontalDistance(actor.position,point),d=clamp(horizontalDistance(camera.position,camera.focus),3,18),L=range+d;
      const sp=(point.y-camera.focus.y-4+4*L/(d+CAMERA_LOOK_AHEAD))/(-d+(16+d)*L/(d+CAMERA_LOOK_AHEAD));
      yaw=Math.atan2(-(point.x-actor.position.x),-(point.z-actor.position.z));pitch=Math.asin(clamp(sp,-.75,.65));
    }else if(Math.hypot(move.x,move.z)>.1)yaw=Math.atan2(-move.x,-move.z);
    await this.look(yaw,pitch);
    const forward=-Math.sin(yaw)*move.x-Math.cos(yaw)*move.z,strafe=Math.cos(yaw)*move.x-Math.sin(yaw)*move.z;
    if(Math.abs(forward)>.28)await this.page.keyboard.down(forward>0?'KeyW':'KeyS');
    if(Math.abs(strafe)>.28)await this.page.keyboard.down(strafe>0?'KeyD':'KeyA');
    if(actor.heat>77)this.hot=true;if(actor.heat<48)this.hot=false;
    if(options.attack!==false&&target&&!this.hot)await this.page.mouse.down();
    if(options.attack!==false&&target&&!this.hot&&actor.rocketReadyAt<=state.time&&horizontalDistance(actor.position,target.position)>8&&target.hp>60)await this.page.keyboard.press('KeyQ',{delay:60});
    const injured=state.actors.some(a=>!a.bot&&a.hp>0&&a.maxHp-a.hp>5&&distance(a.position,actor.position)<9.8&&this.clear(state,origin,{...a.position,y:a.position.y+.4}));
    if(options.attack!==false&&actor.grounded&&actor.abilityReadyAt<=state.time&&((actor.chassis==='caracal'&&actor.energy>=40&&injured)||(actor.chassis==='bastion'&&actor.energy>=25&&threats.some(a=>distance(a.position,actor.position)<6.7)))){
      const before=actor.chassis==='caracal'?await this.snapshot():undefined;
      await this.page.keyboard.press('ShiftLeft',{delay:60});
      if(before){
        // A repair event alone does not state a healed amount. Fresh health
        // snapshots establish a real gain while passive regeneration is gated.
        const healer=before.actors.find(a=>a.id===actor.id)!;
        const deadline=Date.now()+500;let after=await this.snapshot();
        while(after.actors.find(a=>a.id===actor.id)!.abilityAt<=healer.abilityAt&&Date.now()<deadline){await this.page.waitForTimeout(50);after=await this.snapshot();}
        const accepted=after.events.find(e=>e.type==='repair'&&e.actor===actor.id&&e.at>before.time-.02&&e.at===after.actors.find(a=>a.id===actor.id)!.abilityAt);
        if(accepted&&!after.events.some(e=>e.type==='supply'&&e.at>=before.time-.02&&e.at<=after.time)){
          const targets=before.actors.filter(a=>!a.bot&&a.hp>0&&a.hp<a.maxHp&&before.time-a.hurtAt<6&&distance(a.position,healer.position)<9.8).flatMap(a=>{
            const healed=after.actors.find(b=>b.id===a.id),gain=healed?healed.hp-a.hp:0;
            return healed&&gain>0&&after.time-a.hurtAt<7&&healed.respawnAt===a.respawnAt?[{id:a.id,before:a.hp,after:healed.hp,gain}]:[];
          });
          if(targets.length)this.evidence.beneficialRepairs.push({actor:actor.id,at:accepted.at,targets});
        }
      }
    }
    if(options.interact&&actor.grounded&&objective&&distance(actor.position,{...objective.position,y:objective.position.y+1})<4.4)await this.page.keyboard.down('KeyE');
    try{await this.page.waitForTimeout(options.duration??500);}finally{await this.release();}
    record(await this.snapshot(),forward,strafe,target?.id);
  }
}

/** Guest assets load in the background while the already deployed pilot defends. */
export async function joinWhileDefending(page:Page,link:string,name:string,chassis:string,defender:CoopPilot,home:Vec3) {
  let joined=false,loadError:unknown;
  const loading=(async()=>{
    await page.bringToFront();await page.goto(link);await page.getByLabel('Pilot callsign').fill(name);
    await page.getByRole('button',{name:`Select ${chassis}`,exact:true}).click();await page.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();joined=true;
  })().catch(error=>{loadError=error;});
  const end=Date.now()+90000;let ready=false;
  while(Date.now()<end){
    await defender.turn(home,{duration:600});
    if(loadError)throw loadError;
    if(!joined)continue;
    ready=await page.evaluate(name=>!!window.kittyMechDebug?.snapshot()?.actors.some(a=>a.name===name),name)&&await page.locator('canvas').count()===1&&await page.locator('.loading-overlay').count()===0;
    if(ready)break;
  }
  await loading;
  expect(ready,'Guest must load while the host actively defends').toBe(true);
  await page.bringToFront();await expect.poll(()=>page.evaluate(()=>document.hasFocus()),{timeout:5000}).toBe(true);
  await expect(page.locator('.network-status')).toContainText('2 PILOTS',{timeout:10000});
}
