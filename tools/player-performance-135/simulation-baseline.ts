import {createRetainedLampColliderDescriptors} from '../../shared/rainlineLampCollision';
import {FelineNativePoseSource004} from '../../shared/felineNativePoseSource004';
import {OverhaulEncounter} from '../../shared/overhaulEncounter';
import {cityBlockColliderDesc,trackStreetCollider,streetRuinNavigationBlocks} from '../../shared/rainlineStreetAdmission';
import {OverhaulCoop,coopReviveTarget} from '../../shared/overhaulCoop';
import {coopExtractionWait,withinObjectiveReach} from '../../shared/coopExtraction';
import {INPUT_PROTOCOL_VERSION,MAX_INPUT_COUNTER,inputCounter,jumpEnvelope,validStrikePitch} from '../../shared/inputProtocol';
import {WORLD_LAYOUT_VERSION} from '../../shared/layout';
import {cityDistrict,cityBlocks,cityBlockActive,type CityBlock} from '../../shared/cityDistrict';
import {buildingFaces,faceCoordinates,faceDistance,faceLanding,facePoint,faceTangentLimit,nearbyBuildingFaces,type BuildingFace} from '../../shared/buildingSurfaces';
import {overhaulCornerCandidates,overhaulCornerSample,overhaulCornerAdvance,proveOverhaulCornerStep,type OverhaulCornerPlan,type OverhaulCornerChoices,type OverhaulCornerReceipt} from '../../shared/overhaulCornerClimb';
import {OverhaulRuinSurfaces,registerOverhaulRuinSurfaces} from '../../shared/overhaulRuinSurfaces';
import {OverhaulBondedOwner} from '../../shared/overhaulBondedOwner';
import {BONDED_SOURCE_ID,BONDED_FRAME_ID} from '../../shared/overhaulBondedMaterial';
import {buildingGripPose,buildingGripMaskCount,type GripPatch} from '../../shared/buildingGrip';
import {workshopCollision} from '../../shared/workshopCollision';
import {workshopCollisionReceipt} from '../../shared/workshopCollision';
import {isStructuralPropKind,structuralPropCollision} from '../../shared/structuralPropCollision';
import {workshopGeometry} from '../../shared/workshopGeometry';
import {MAX_AUTHORED_COVER} from '../../shared/coverState';
import {STRIKE_PROFILES,sweepFelineContact,type ActorTravel} from '../../shared/felineStrike';
import {createPair,validPair,PAIR_TIMING,PAIR_PROFILE} from '../../shared/pairedCombat';
import {OverhaulRuinsOwner} from '../../shared/overhaulRuins';
import {compileOverhaulSupport,resolveOverhaulSupport,commitOverhaulSupport,type OverhaulSupportGraph} from '../../shared/overhaulSupport';
import {OwnedCharacterMotion} from './instrumented-baseline';
import {CityRubbleOwner,MAX_CITY_RUBBLE_BODIES} from '../../shared/cityRubble';
import {CharacterRubbleImpulseBudget,type CharacterRubbleContact} from '../../shared/characterRubbleImpulse';
import {cityFractureCatalog as fractureAsset} from '../../shared/cityFractureCatalog';
import {vaultAxisStep,vaultAxisVelocity,type MantleStage} from '../../shared/buildingVault';
import RAPIER from '@dimforge/rapier3d-compat';
import { ACTOR_HEIGHT, actorClimbHeight, actorCollisionHeight, actorHullRadius, actorQuadHeight, CHUNK_SIZE, CLIMB_RETRACTION, MECHS, STANCE_TRANSITION, UPRIGHT, UPRIGHT_HEIGHT, UPRIGHT_JUMP, WEAPONS, WORLD_LIMIT } from '../../shared/config';
import { getMap } from '../../shared/maps';
import { Navigation,type NavigationPathTrace } from '../../shared/navigation';
import {localRoofDomain,proveLocalRoofRoute,type LocalRoofProof} from '../../shared/overhaulRoofLocal';
import {encounterBlocks,objectiveDefinitions,optionalEncounter,optionalEncounterSupported,rooftopEncounter} from '../../shared/encounters';
import { breakableCover, climbAnchors, roofSurfaces, traversalBlocks, type ClimbAnchor, type RoofSurface } from '../../shared/traversal';
import {onRoof,roofPath,roofPoint} from '../../shared/vertical-navigation';
import { angleLerp, clamp, direction, distance, horizontalDistance, randomSeed } from '../../shared/math';
import {REPAIR_SHARE_RADIUS,SUPPLY_COUNT,SUPPLY_REACH,supplyCandidates} from '../../shared/supplies';
import { chunkAt, chunkKeys, generateChunk, landmarkBlocks, propCollider, terrainHeight, terrainMesh,type LandmarkBlock } from '../../shared/world';
import { emptyInput, type ActorState, type AreaFieldState, type Chassis, type ClimbState, type CombatEvent, type CoverState, type EnemyRole, type GameSnapshot, type InputState, type MechStance, type MissionCheckpoint, type Mode, type ObjectiveState, type ProjectileState, type StructureState, type SupplyKind, type SupplyState, type Vec3, type WeaponId } from '../../shared/types';

import {validStanceRequest,type StanceFeedback} from '../../shared/stanceFeedback';
interface LandingJump {id:number;epoch:number;receivedAt:number;}
const LANDING_JUMP_BUFFER=.1;
interface ActorPhysics { poseActor:ActorState;poseMotionTick?:number;poseMotionTime?:number; body: RAPIER.RigidBody; collider: RAPIER.Collider; controller: RAPIER.KinematicCharacterController; input: InputState; received: number; fireReadyAt: number; protectedUntil: number; spawnSlot:number; hullStance:MechStance; climbHull:boolean; pendingJump:number; pendingJumpAt:number; landingJump:LandingJump|null; rejectedJump:number; jumpAlive:boolean;pendingStrike:number;rejectedStrike:number;strikeAim:{yaw:number;pitch:number};suppressBoost:boolean;rubbleRise:boolean; }
interface StrikeTravel extends ActorTravel {life:number;redirected:boolean;corrected?:boolean;actorCollision?:boolean;normalPathObserved?:boolean;hull?:{handle:number;halfHeight:number;radius:number;border:number;offset:Vec3};approach?:{target:string;life:number;collider:number;to:Vec3;fraction:number};}
interface ChunkPhysics { bodies: RAPIER.RigidBody[]; colliders: RAPIER.Collider[]; terrain:RAPIER.Collider; }
interface ClimbMotion {anchor:ClimbAnchor;face?:BuildingFace;cornerPlan?:OverhaulCornerPlan;wallOffset?:number;blockedAscent?:boolean;singleGripSince?:number;eligibleMask?:number;pawHandles:number[][];grabHandles:number[];landingHandles:number[];landing?:Vec3;grabFrom:Vec3;mantleFrom?:Vec3;vaultOut?:Vec3;vaultLift?:Vec3;stageFrom?:Vec3;stalledAt:number;checkpoint:Vec3;}
interface GripEvaluation {gripMask:number;roofMask:number;eligibleMask:number;wallOffset:number;adjustments:{wall:number[];roof:number[]};handles:number[][];}
interface RubbleMovement {owner:ActorPhysics;tick:number;desired:Vec3;contacts:CharacterRubbleContact[];consumed:boolean;}
const CLIMB_SPEED:Record<Chassis,number>={pounce:2.8,bastion:2,lynx:3.2,caracal:2.4};
interface BotMemory {
  home:Vec3; target?:string; lastSeen?:Vec3; seenAt:number; readyAt:number;
  nextSense:number; patrol:number; path:Vec3[]; goal?:Vec3; repathAt:number;
  stuckAt:number; checkpoint:Vec3; flankSide:number; windupAim?:Vec3; retreat:boolean;
  roofHome?:string; verticalRoof?:string; verticalRetryAt?:number; roofUntil?:number; exitRoof?:string;exitCrossing?:boolean;verticalAttachSince?:number;verticalJumpAt?:number;verticalJumpAnchor?:string;verticalJumpRetreatAt?:number;
}

/** Trusted authority construction only; never populated from input/join packets. */
export interface SimulationOptions {experimentalPhysicalRubble?:boolean;experimentalFacadeFracture?:boolean;experimentalBondedMaterial?:boolean;experimentalContactFrameAudit004?:boolean;}
/** One authoritative simulation, used by the server and offline training. Rendering never decides damage. */
export class Simulation {
  actors = new Map<string,ActorState>();
  projectiles: ProjectileState[] = [];
  events: CombatEvent[] = [];
  fields:AreaFieldState[]=[];
  cover=new Map<string,CoverState>();
  structures:StructureState[]=[];
  objectives: ObjectiveState[];
  checkpoint:MissionCheckpoint|null=null;
  supplies:SupplyState[]=[];
  time=0; tick=0; phase:GameSnapshot['phase']='active'; winner:string|null=null;
  /** Trusted opt-in server timing only; never populated by network packets. */
  onStepTiming:((stage:'world-step'|'bot-input'|'pair'|'climb'|'locomotion',durationMs:number)=>void)|undefined;
  onBotTiming:((row:{actor:string;role:string;aiState:string;durationMs:number;tick:number;time:number})=>void)|undefined;
  onNavigationTiming:((row:NavigationPathTrace&{actor:string;role:string;aiState:string;tick:number;time:number})=>void)|undefined;
  /** Detached diagnostic of the command actually accepted by setInput. */
  inspectRequestedInput(id:string){const p=this.physics.get(id);return p?{input:{...p.input},receivedAt:p.received}:null;}
  private physics = new Map<string,ActorPhysics>();
  private poseSource003:FelineNativePoseSource004;private poseNativeStepTick003=-1;
  private characterMotion:OwnedCharacterMotion;
  private rubbleOwner:CityRubbleOwner;
  private ruinsOwner:OverhaulRuinsOwner;
  private bondedOwner:OverhaulBondedOwner|undefined;
  private wokeRuinHandles=new Set<number>();
  private ruinSurfaces:OverhaulRuinSurfaces;
  private releaseRuinSurfaces:()=>void;
  private encounterOwner:OverhaulEncounter|null=null;
  private coopOwner:OverhaulCoop|null=null;
  private coopExtractionPilot:string|null=null;
  /** Finite placed co-op encounters stay cleared until a new Simulation/room. */
  private defeatedCoopNpcs=new Set<string>();
  private supportGraph:OverhaulSupportGraph|null=null;
  private clawWearClock=new Map<string,number>();
  private retiredStructuralBlocks=new Set<string>();
  private readonly physicalRubbleEnabled:boolean;
  private pendingRubble=new Map<string,{block:CityBlock;incoming:Vec3;impact:import('./cityRubbleImpact').CityRubbleImpact}>();
  private excludedDynamicColliders:ReadonlySet<number>|null=null;
  private rubbleControllers=new Map<RAPIER.KinematicCharacterController,{impulses:boolean;mass:number|null;dynamicStep:boolean}>();
  private rubbleHandles:ReadonlySet<number>=new Set();
  private rubbleReaction=new Map<ActorPhysics,CharacterRubbleImpulseBudget>();
  private rubbleStepDt=0;
  private physicsFailure:Error|null=null;
  private chunks = new Map<string,ChunkPhysics>();
  private serial=0;
  private streamAt=-1;
  private pounceHits=new Set<string>();
  private strikeHits=new Map<string,Set<string>>();
  private pairComboContacts=new Map<string,{combo:number;at:number}>();
  private projectileDamage=new Map<number,number>();
  private brains=new Map<string,BotMemory>();
  private navigation:Navigation;
  private coverBodies=new Map<string,{body:RAPIER.RigidBody;collider:RAPIER.Collider;chunk:string}>();
  private colliderCover=new Map<number,string>();
  private districtBodies=new Map<string,{body:RAPIER.RigidBody;collider:RAPIER.Collider;chunk:string;block:CityBlock}>();
  private buildingColliders=new Map<string,{collider:RAPIER.Collider;chunk:string}>();
  private gripQueryHandles=new Set<number>();
  private lastGripEligibleMask=0;
  private lastGripHandles=Array.from({length:4},()=>[] as number[]);
  private gripAdjustments={wall:[0,0,0,0],roof:[0,0,0,0]};
  private candidateGrip:GripEvaluation={gripMask:0,roofMask:0,eligibleMask:0,wallOffset:0,adjustments:{wall:[0,0,0,0],roof:[0,0,0,0]},handles:Array.from({length:4},()=>[])};
  private lastPatchAdjustment=0;
  private lastRoofHandles:number[]=[];
  private cellBodies=new Map<string,{body:RAPIER.RigidBody;collider:RAPIER.Collider;chunk:string;block:CityBlock}>();
  private colliderCell=new Map<number,CityBlock>();
  private anchorColliders=new Map<string,{collider:RAPIER.Collider;chunk:string}>();
  private anchorSupports=new Map<number,{anchors:string[];chunk:string}>();
  private roofSupports=new Map<number,{collider:RAPIER.Collider;chunk:string;block:Pick<LandmarkBlock,'position'|'halfExtents'|'yaw'>}>();
  private climbMotion=new Map<string,ClimbMotion>();
  private climbRetryAt=new Map<string,number>();
  private uplinkTouches=new Map<string,{claimant:string;touchedAt:number}>();
  private objectiveTouchedTick=new Map<string,number>();
  private supplyRandom:()=>number;
  private disabledMovementColliders=new Set<number>();
  // Reading Rapier state inside its query callback borrows the active collider
  // set recursively. Snapshot enabled handles before queries; predicates use JS only.
  private movementFilter=(collider:RAPIER.Collider)=>!this.disabledMovementColliders.has(collider.handle);
  private moveCharacter(p:ActorPhysics,desired:Vec3,flags=this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC):RubbleMovement|null {
    if(!this.excludedDynamicColliders){this.characterMotion.computeColliderMovement(p.controller,p.collider,desired,flags,undefined,this.movementFilter);p.poseMotionTick=this.tick;p.poseMotionTime=this.time;this.poseSource003.capture(p.poseActor,p,this.tick,this.time,desired);return null;}
    // Rapier0.19.2's automatic pass loses earlier candidates' manifolds. Replace
    // that pass, keeping its exact movement/filter/classification query. Restore
    // the captured setting before reading native contacts, even on query faults.
    const impulses=p.controller.applyImpulsesToDynamicBodies(),errors:unknown[]=[];
    try{p.controller.setApplyImpulsesToDynamicBodies(false);this.characterMotion.computeColliderMovementWithDynamics(p.controller,p.collider,desired,flags,undefined,this.movementFilter,this.excludedDynamicColliders);}
    catch(error){errors.push(error);}
    finally{try{p.controller.setApplyImpulsesToDynamicBodies(impulses);}catch(error){errors.push(error);}}
    if(errors.length===1)throw errors[0];if(errors.length)throw new AggregateError(errors,'Character rubble query/restoration failure');
    p.poseMotionTick=this.tick;p.poseMotionTime=this.time;this.poseSource003.capture(p.poseActor,p,this.tick,this.time,desired);if(!impulses)return null;
    const contacts:CharacterRubbleContact[]=[];
    for(let i=0;i<p.controller.numComputedCollisions();i++){
      const hit=p.controller.computedCollision(i),collider=hit?.collider;
      if(hit&&collider&&this.rubbleHandles.has(collider.handle))contacts.push({colliderHandle:collider.handle,point:{...hit.witness1},normal:{...hit.normal1},remainingVelocity:{x:hit.translationDeltaRemaining.x/this.rubbleStepDt,y:hit.translationDeltaRemaining.y/this.rubbleStepDt,z:hit.translationDeltaRemaining.z/this.rubbleStepDt}});
    }
    return contacts.length?{owner:p,tick:this.tick,desired:{...desired},contacts,consumed:false}:null;
  }
  private commitCharacterRubble(p:ActorPhysics,movement:RubbleMovement|null):void {
    if(!movement)return;
    if(movement.owner!==p||movement.tick!==this.tick||movement.consumed||!Number.isFinite(this.rubbleStepDt)||this.rubbleStepDt<=0)throw Error('Invalid committed character rubble movement');
    movement.consumed=true;
    let reaction=this.rubbleReaction.get(p);
    if(!reaction){reaction=new CharacterRubbleImpulseBudget(1800,{x:movement.desired.x/this.rubbleStepDt,y:movement.desired.y/this.rubbleStepDt,z:movement.desired.z/this.rubbleStepDt});this.rubbleReaction.set(p,reaction);}
    this.rubbleOwner.applyCharacterContacts(movement.contacts,reaction);
    // Persistent settled supports retain their grip until a weapon or support loss
    // awakens them. Character wake is unadmitted: candidate001 loses approach grips.
  }
  private moveLocomotion(p:ActorPhysics,desired:Vec3,at:Vec3,allowVerticalPriority:boolean):{movement:RubbleMovement|null;move:Vec3;desired:Vec3;ownedTakeoff:boolean} {
    const first=this.moveCharacter(p,desired),move={...p.controller.computedMovement()};
    const result={movement:first,move,desired,ownedTakeoff:false};
    if(!allowVerticalPriority||desired.y<=0||(desired.x===0&&desired.z===0)||!first||!first.contacts.some(c=>this.rubbleHandles.has(c.colliderHandle))||move.x!==0||move.y!==0||move.z!==0)return result;
    if(first.owner!==p||first.tick!==this.tick||first.consumed)throw Error('Invalid owned takeoff query');
    const receipt=()=>{
      const hits=[];
      for(let i=0;i<p.controller.numComputedCollisions();i++){
        const hit=p.controller.computedCollision(i);if(!hit)throw Error('Missing native takeoff collision');
        const record={collider:hit.collider?.handle??null,parent:hit.collider?.parent()?.handle??null,toi:hit.toi,normal1:{...hit.normal1},normal2:{...hit.normal2},witness1:{...hit.witness1},witness2:{...hit.witness2},applied:{...hit.translationDeltaApplied},remaining:{...hit.translationDeltaRemaining}};
        if(![record.toi,...Object.values(record.normal1),...Object.values(record.normal2),...Object.values(record.witness1),...Object.values(record.witness2),...Object.values(record.applied),...Object.values(record.remaining)].every(Number.isFinite))throw Error('Nonfinite native takeoff collision');
        hits.push(record);
      }
      return JSON.stringify({move:p.controller.computedMovement(),grounded:p.controller.computedGrounded(),hits});
    };
    const originalReceipt=receipt(),vertical={x:0,y:desired.y,z:0};
    // A blocked diagonal may still have a valid native upward path. Prioritize
    // that path once, deferring horizontal movement. This query uses the same
    // hull, skin and filters; only its selected contacts may transfer impulse.
    const candidate=this.moveCharacter(p,vertical),rise={...p.controller.computedMovement()};
    if(![rise.x,rise.y,rise.z].every(Number.isFinite))throw Error('Nonfinite native takeoff candidate');
    if(rise.y>0&&Math.abs(at.x+rise.x)<=WORLD_LIMIT&&Math.abs(at.z+rise.z)<=WORLD_LIMIT&&at.y+rise.y>=terrainHeight(at.x+rise.x,at.z+rise.z,this.seed)-5)
      return {movement:candidate,move:rise,desired:vertical,ownedTakeoff:true};
    // A ceiling, rejected endpoint or zero rise retains the original native
    // query. Never combine its token with the candidate's controller results.
    const restored=this.moveCharacter(p,desired),restoredMove={...p.controller.computedMovement()};
    if(receipt()!==originalReceipt||!restored||restored.owner!==first.owner||restored.tick!==first.tick||restored.consumed||JSON.stringify(restored.contacts)!==JSON.stringify(first.contacts))throw Error('Owned takeoff query restoration changed');
    return {movement:restored,move:restoredMove,desired,ownedTakeoff:false};
  }
  private solidArgs<T extends unknown[]>(args:T,flagIndex:number,predicateIndex:number):T {
    // A source can retire during this projectile batch, after tick-start filters.
    // Snapshot outside native callbacks so that later shots see its real wreck.
    if(!this.excludedDynamicColliders&&(this.ruinsOwner.count||this.bondedOwner?.count)){
      const excluded=new Set<number>();this.world.colliders.forEach(c=>{if(c.parent()?.isDynamic()&&!this.ruinsOwner.owns(c.handle)&&!this.bondedOwner?.owns(c.handle))excluded.add(c.handle);});
      this.excludedDynamicColliders=excluded;
    }
    if(!this.excludedDynamicColliders)return args;
    const native=[...args],flags=Number(args[flagIndex]??0),excluded=this.excludedDynamicColliders;
    if(!(flags&this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC))return args;
    const predicate=args[predicateIndex] as ((c:RAPIER.Collider)=>boolean)|undefined;
    native[flagIndex]=flags&~this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC;
    native[predicateIndex]=(c:RAPIER.Collider)=>!excluded.has(c.handle)&&(!predicate||predicate(c));
    return native as T;
  }
  private solidRay(...args:Parameters<RAPIER.World['castRay']>){return this.world.castRay(...this.solidArgs(args,3,7));}
  private solidRayNormal(...args:Parameters<RAPIER.World['castRayAndGetNormal']>){return this.world.castRayAndGetNormal(...this.solidArgs(args,3,7));}
  private solidIntersection(...args:Parameters<RAPIER.World['intersectionWithShape']>){return this.world.intersectionWithShape(...this.solidArgs(args,3,7));}
  private solidCast(...args:Parameters<RAPIER.World['castShape']>){return this.world.castShape(...this.solidArgs(args,7,11));}
  private solidIntersections(...args:Parameters<RAPIER.World['intersectionsWithShape']>){return this.world.intersectionsWithShape(...this.solidArgs(args,4,8));}
  private get map(){return getMap(this.seed);}
  constructor(public world:RAPIER.World,public seed=7734,public mode:Mode='training',public room='TRAINING',private rapier:typeof RAPIER=RAPIER,options:SimulationOptions={}) {
    this.poseSource003=new FelineNativePoseSource004(world,options.experimentalContactFrameAudit004===true);
    this.physicalRubbleEnabled=options.experimentalPhysicalRubble===true;
    this.characterMotion=new OwnedCharacterMotion(rapier,()=>[...this.physics].map(([id,p])=>({id,body:p.body,collider:p.collider})));
    this.rubbleOwner=new CityRubbleOwner(rapier,world,fractureAsset);
    const district=cityDistrict(seed);
    if(options.experimentalFacadeFracture&&options.experimentalBondedMaterial)throw Error('Material candidates cannot be combined');
    this.ruinsOwner=new OverhaulRuinsOwner(world,district?.id.includes('overhaul')?district:null,(x,z)=>terrainHeight(x,z,seed),{fractureFacades:options.experimentalFacadeFracture===true,...(options.experimentalBondedMaterial?{strictExternalActive:()=>this.bondedOwner?.active??0}:{}),onWake:handles=>this.onRuinWake(handles)});
    const materialSource=options.experimentalBondedMaterial?district?.blocks.find(b=>b.id===BONDED_SOURCE_ID):undefined;
    if(materialSource)this.bondedOwner=new OverhaulBondedOwner(world,materialSource,{frame:()=>this.buildingColliders.get(BONDED_FRAME_ID)?.collider,externalActive:()=>this.ruinsOwner.diagnostics().active,replaceCarrier:()=>{this.retiredStructuralBlocks.add(materialSource.id);this.retireCell(materialSource);this.excludedDynamicColliders=null;},onRetire:handles=>{this.invalidateBuildingSupports(handles);this.excludedDynamicColliders=null;},onWear:fraction=>{const bank=this.structures.find(s=>s.id===materialSource.structureId);if(!bank)return;bank.hp[materialSource.cellId!]=75*fraction;bank.revision++;if(fraction===0)bank.brokenMask=(bank.brokenMask|(1<<materialSource.cellId!))>>>0;}});
    this.ruinSurfaces=new OverhaulRuinSurfaces(this.ruinsOwner);
    this.releaseRuinSurfaces=registerOverhaulRuinSurfaces(world,this.ruinSurfaces);
    if(district?.id.includes('overhaul'))this.supportGraph=compileOverhaulSupport(district);
    if(mode!=='pvp'&&district?.id.includes('overhaul'))this.encounterOwner=new OverhaulEncounter();
    if(mode==='coop'&&district?.id.includes('overhaul'))this.coopOwner=new OverhaulCoop();
    this.navigation=new Navigation(seed);
    this.structures=(cityDistrict(seed)?.structures??[]).map(d=>({id:d.id,layoutVersion:1,revision:0,brokenMask:0,hp:d.cells.map(()=>d.maxHp)}));
    this.navigation.setStructureFilter(block=>cityBlockActive(block,this.structures));
    let roomSalt=2166136261;for(const char of room){roomSalt^=char.charCodeAt(0);roomSalt=Math.imul(roomSalt,16777619);}
    this.supplyRandom=randomSeed(seed^roomSalt);
    for(const prop of breakableCover(seed).slice(0,MAX_AUTHORED_COVER))if(prop.id&&prop.breakableHp)this.cover.set(prop.id,{id:prop.id,hp:prop.breakableHp,maxHp:prop.breakableHp,destroyedAt:null});
    this.navigation.setPropFilter(prop=>!prop.id||(this.cover.get(prop.id)?.hp??1)>0);
    this.objectives=objectiveDefinitions(seed).filter(o=>mode!=='pvp'||!o.optional).map((o,i)=>({...o,position:{...o.position},progress:0,complete:false,unlocked:o.optional||i<2}));
    this.syncChunks([this.map.spawn,...this.map.enemySpawns.map(([x,z])=>({x,y:0,z}))]);
    if(mode!=='pvp') {
      this.map.enemySpawns.forEach(([x,z,role],i)=>this.addActor(`bot-${i}`,role.toUpperCase(),'pounce',true,{x,y:terrainHeight(x,z,seed)+ACTOR_HEIGHT,z},role));
      const encounter=rooftopEncounter(seed),grid=optionalEncounter(seed,'city-grid');
      for(const npc of [encounter.guardian,encounter.pursuer,...(this.supportGraph&&grid?[grid.guardian,grid.pursuer]:[])])this.addActor(npc.id,npc.role==='anchor'?'UPLINK GUARDIAN':'ROOF SCOUT','pounce',true,{...npc.position,y:npc.position.y+ACTOR_HEIGHT},npc.role);
      const district=cityDistrict(seed);
      if(district){
        this.syncChunks([...this.actors.values()].map(a=>a.position).concat(district.npcs.map(n=>n.position)));
        for(const npc of district.npcs){
          const a=this.addActor(npc.id,npc.role==='anchor'?'WORKS GUARDIAN':'WORKS SCOUT','pounce',true,{...npc.position,y:npc.position.y+ACTOR_HEIGHT},npc.role),physics=this.physics.get(a.id)!;
          const roof=roofSurfaces(seed).find(r=>r.id===npc.roofId),clear=this.clearRespawn(a,physics,npc.position.x,npc.position.z,0,roof);
          if(clear){a.position=clear;physics.body.setTranslation(clear,true);physics.body.setNextKinematicTranslation(clear);}else {a.hp=0;a.respawnAt=this.time+.5;physics.collider.setEnabled(false);}
        }
      }
    }
    for(const actor of this.actors.values())this.encounterOwner?.register(actor);
    const kinds:SupplyKind[]=['repair','energy','coolant','repair','energy','coolant'];
    for(let i=kinds.length-1;i>0;i--){const j=Math.floor(this.supplyRandom()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
    for(let i=0;i<SUPPLY_COUNT;i++) {
      const position=this.supplyPosition();if(position)this.supplies.push({id:`${this.map.seed}:supply-${i}`,kind:kinds[i],position,born:this.time,availableAt:this.time,claimedBy:null});
    }
  }
  addActor(id:string,name:string,chassis:Chassis,bot=false,spawn?:Vec3,role?:EnemyRole) {
    this.assertPhysicsValid();
    const used=new Set([...this.physics.values()].map(p=>p.spawnSlot));let slot=0;while(used.has(slot))slot++;
    const origin=this.mode==='coop'&&this.checkpoint?this.checkpoint.position:this.map.spawn;
    const x=origin.x+(slot%4)*4.6,z=origin.z+Math.floor(slot/4)*4.6;
    if(!bot&&!spawn&&this.checkpoint)this.syncChunks([...this.actors.values()].map(a=>a.position).concat(origin));
    const position=spawn??{x,y:terrainHeight(x,z,this.seed)+ACTOR_HEIGHT,z};
    const maxHp=bot?(role==='anchor'?210:role==='mortar'?135:95):MECHS[chassis].health;
    const actor:ActorState={id,name,chassis,bot,role,position:{...position},velocity:{x:0,y:0,z:0},yaw:0,aimYaw:0,aimPitch:0,hp:maxHp,maxHp,energy:100,heat:0,kills:0,salvage:0,grounded:false,boostUntil:0,shieldUntil:0,windupUntil:0,abilityReadyAt:0,rocketReadyAt:0,stance:'quadruped',stanceChangedAt:-100,climb:null,climbDetachedAt:-100,pulseAt:-100,rocketAt:-100,abilityAt:-100,hurtAt:-100,diedAt:-100,disruptedUntil:0,respawnAt:0,hitAt:-100,fireAt:-100,aiState:'patrol',lastInput:0,jumpEpoch:1,jumpProcessed:0,strikeProcessed:0,strike:null,strikeEndedAt:-100};
    const body=this.world.createRigidBody(this.rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(position.x,position.y,position.z));
    const radius=actorHullRadius(actor);
    const halfHeight=actorQuadHeight(actor)/2;
    const collider=this.world.createCollider(this.rapier.ColliderDesc.roundCylinder(halfHeight-.12,radius-.12,.12).setTranslation(0,halfHeight-ACTOR_HEIGHT,0).setFriction(.1),body);
    const controller=this.world.createCharacterController(.02);
    controller.enableAutostep(.55,.2,true);controller.enableSnapToGround(.35);controller.setMaxSlopeClimbAngle(Math.PI/3.5);controller.setMinSlopeSlideAngle(Math.PI/3);
    const physics:ActorPhysics={poseActor:actor,body,collider,controller,input:emptyInput(),received:this.time,fireReadyAt:0,protectedUntil:this.time+(bot?2.5:45),spawnSlot:bot?-1:slot,hullStance:'quadruped',climbHull:false,pendingJump:0,pendingJumpAt:0,landingJump:null,rejectedJump:0,jumpAlive:true,pendingStrike:0,rejectedStrike:0,strikeAim:{yaw:0,pitch:0},suppressBoost:false,rubbleRise:false};
    this.actors.set(id,actor);this.physics.set(id,physics);
    if(!bot&&!spawn) {
      const clear=this.clearRespawn(actor,physics,x,z,0);
      if(clear){actor.position=clear;body.setTranslation(clear,true);body.setNextKinematicTranslation(clear);}
      else {actor.hp=0;actor.aiState='destroyed';actor.respawnAt=this.time+.5;collider.setEnabled(false);}
    }
    if(bot)this.brains.set(id,{home:{...position},seenAt:-100,readyAt:0,nextSense:0,patrol:0,path:[],repathAt:0,stuckAt:this.time,checkpoint:{...position},flankSide:Number(id.slice(-1))%2?1:-1,retreat:false,roofHome:role==='anchor'?roofSurfaces(this.seed).find(roof=>onRoof(roof,position))?.id:undefined});
    if(bot)this.encounterOwner?.register(actor);
    if(!bot){this.coopOwner?.join(actor,this.time);if(actor.downed){this.retireJumpLife(actor,physics);physics.collider.setEnabled(false);this.disabledMovementColliders.add(physics.collider.handle);}}
    return actor;
  }
  removeActor(id:string) {
    const actor=this.actors.get(id);if(actor)this.releasePair(actor,true);
    const p=this.physics.get(id);
    this.actors.delete(id);this.physics.delete(id);this.brains.delete(id);
    this.fields=this.fields.filter(f=>f.owner!==id);
    this.climbMotion.delete(id);this.climbRetryAt.delete(id);
    this.strikeHits.delete(id);
    if(p){this.rubbleControllers.delete(p.controller);const errors:unknown[]=[];try{this.world.removeCharacterController(p.controller);}catch(error){errors.push(error);}try{this.world.removeRigidBody(p.body);}catch(error){errors.push(error);}if(errors.length){const failure=new AggregateError(errors,'Actor physics cleanup failed');this.latchPhysicsFailure(failure);throw failure;}}
  }
  setInput(id:string,input:InputState) {
    this.assertPhysicsValid();
    const p=this.physics.get(id),actor=this.actors.get(id);
    if(!p||!actor||!inputCounter(input.seq)||!jumpEnvelope(input.jumpId,input.jumpCancel,input.jumpEpoch,input.jump)||!jumpEnvelope(input.strikeId,input.strikeCancel,input.strikeEpoch,input.strike)||!validStrikePitch(input.strikePitch)||typeof input.pitch!=='number'||!Number.isFinite(input.pitch)||Math.abs(input.pitch)>1.3||!Number.isFinite(input.aimYaw??input.yaw))return;
    if(input.jumpEpoch!==0&&input.jumpEpoch!==actor.jumpEpoch||input.strikeEpoch!==0&&input.strikeEpoch!==actor.jumpEpoch)return;
    if(input.stanceRequest!==undefined&&(!validStanceRequest(input.stanceRequest,input.seq)||input.stanceRequest.life!==actor.jumpEpoch||actor.stanceFeedback?.life===actor.jumpEpoch&&input.stanceRequest.seq===actor.stanceFeedback.requestSeq&&input.stance!==actor.stanceFeedback.target))return;
    // Cancellation is monotonic and life-bound, even on an older/equal sample.
    if(input.jumpEpoch===actor.jumpEpoch){
      // Receipt was already ACKed; a later pause/blur cancellation can equal it.
      if(p.landingJump&&input.jumpCancel>=p.landingJump.id)p.landingJump=null;
      if(input.jumpCancel>actor.jumpProcessed){
        if(p.pendingJump<=input.jumpCancel)p.pendingJump=0;
        actor.jumpProcessed=input.jumpCancel;
      }
    }
    if(input.strikeEpoch===actor.jumpEpoch){
      if(input.strikeCancel>actor.strikeProcessed){if(p.pendingStrike<=input.strikeCancel)p.pendingStrike=0;actor.strikeProcessed=input.strikeCancel;}
      if(actor.strike&&input.strikeCancel>=actor.strike.id){this.endStrike(actor);}
    }
    if(input.seq<=p.input.seq)return;
    if(!actor.bot&&p.input.seq===0)p.protectedUntil=Math.min(p.protectedUntil,this.time+2.5);
    if(!input.boost)p.suppressBoost=false;
    this.expireLandingJump(actor,p);
    if(input.jumpEpoch===actor.jumpEpoch&&input.jumpId>actor.jumpProcessed&&input.jumpId>p.rejectedJump){
      if(actor.hp<=0)actor.jumpProcessed=Math.max(actor.jumpProcessed,input.jumpId);
      else if(p.landingJump)p.rejectedJump=Math.max(p.rejectedJump,input.jumpId);
      else if(p.pendingJump===0){p.pendingJump=input.jumpId;p.pendingJumpAt=this.time;}
      else if(p.pendingJump!==input.jumpId)p.rejectedJump=Math.max(p.rejectedJump,input.jumpId);
    }
    if(input.strikeEpoch===actor.jumpEpoch&&input.strikeId>actor.strikeProcessed&&input.strikeId>p.rejectedStrike){
      if(actor.hp<=0)actor.strikeProcessed=Math.max(actor.strikeProcessed,input.strikeId);
      else if(p.pendingStrike===0){
        const strikePitch=input.strikePitch??input.pitch,aimYaw=input.aimYaw??input.yaw;
        p.pendingStrike=input.strikeId;p.strikeAim={yaw:aimYaw,pitch:strikePitch};
        actor.strikeReceipt={id:input.strikeId,life:actor.jumpEpoch,inputSeq:input.seq,queuedTick:this.tick,queuedAt:this.time,aimYaw,strikePitch,weaponPitch:input.pitch,pitchSource:input.strikePitch===undefined?'legacy-weapon':'look'};
      }
      else if(p.pendingStrike!==input.strikeId)p.rejectedStrike=Math.max(p.rejectedStrike,input.strikeId);
    }
    p.input={...input};p.received=this.time;
  }
  private consumeJump(actor:ActorState,p:ActorPhysics):boolean {
    this.expireLandingJump(actor,p);
    const id=p.pendingJump,receivedAt=p.pendingJumpAt;p.pendingJump=0;
    actor.jumpProcessed=Math.max(actor.jumpProcessed,id,p.rejectedJump);
    p.rejectedJump=0;
    const fresh=id>0&&actor.hp>0&&this.time-p.received<=.3;
    // Only a real ungrounded press is retained. ACK still means consumption,
    // and repeated packets cannot move this first authority-receipt deadline.
    if(fresh&&!actor.bot&&!actor.grounded&&this.time<=receivedAt+LANDING_JUMP_BUFFER)
      p.landingJump={id,epoch:actor.jumpEpoch,receivedAt};
    return fresh;
  }
  private expireLandingJump(actor:ActorState,p:ActorPhysics):void {
    const jump=p.landingJump;
    if(jump&&(jump.epoch!==actor.jumpEpoch||actor.hp<=0||this.time>jump.receivedAt+LANDING_JUMP_BUFFER||this.time-p.received>.3))p.landingJump=null;
  }
  private consumeStrike(actor:ActorState,p:ActorPhysics):number {
    const id=p.pendingStrike;p.pendingStrike=0;actor.strikeProcessed=Math.max(actor.strikeProcessed,id,p.rejectedStrike);p.rejectedStrike=0;
    return id>0&&actor.hp>0&&this.time-p.received<=.3?id:0;
  }
  private retireJumpLife(actor:ActorState,p:ActorPhysics):void {
    actor.jumpEpoch=Math.min(MAX_INPUT_COUNTER,actor.jumpEpoch+1);
    actor.stanceFeedback=null;delete p.input.stanceRequest;
    actor.jumpProcessed=actor.jumpEpoch===MAX_INPUT_COUNTER?MAX_INPUT_COUNTER:0;
    actor.strikeProcessed=actor.jumpProcessed;this.endStrike(actor);p.pendingStrike=p.rejectedStrike=0;p.suppressBoost=false;
    delete actor.strikeReceipt;
    p.pendingJump=p.rejectedJump=0;p.landingJump=null;p.jumpAlive=actor.hp>0;p.rubbleRise=false;
    p.input={...p.input,jump:false,jumpId:0,jumpCancel:0,jumpEpoch:actor.jumpEpoch,strike:false,strikeId:0,strikeCancel:0,strikeEpoch:actor.jumpEpoch};
  }
  syncChunks(positions:Vec3[]) {
    const retiredBuildingHandles=new Set<number>();
    const wanted=new Set(positions.flatMap(p=>chunkKeys(p.x,p.z,1)));
    const incoming:string[]=[];
    // Complete incoming ownership before retiring any preceding support.
    try {
    for(const key of wanted) if(!this.chunks.has(key)) {
      const [cx,cz]=key.split(',').map(Number),data=terrainMesh(cx,cz,32,this.seed),bodies:RAPIER.RigidBody[]=[],colliders:RAPIER.Collider[]=[];
      const terrain=this.world.createCollider(this.rapier.ColliderDesc.trimesh(data.vertices,data.indices).setFriction(.8));colliders.push(terrain);
      this.chunks.set(key,{bodies,colliders,terrain});
      incoming.push(key);
      for(const prop of generateChunk(this.seed,cx,cz).props) {
        if(prop.id&&this.cover.get(prop.id)?.hp===0)continue;
        if(prop.kind==='workshop'){
          const mesh=workshopCollision(this.seed,prop.scale),body=this.world.createRigidBody(this.rapier.RigidBodyDesc.fixed().setTranslation(prop.x,prop.y,prop.z).setRotation({x:0,y:Math.sin(prop.rotation/2),z:0,w:Math.cos(prop.rotation/2)}));
          bodies.push(body);const collider=this.world.createCollider(this.rapier.ColliderDesc.trimesh(mesh.vertices,mesh.indices).setFriction(.8),body);
          const meshId=`${prop.id}:mesh`;this.buildingColliders.set(meshId,{collider,chunk:key});
          const anchors=climbAnchors(this.seed).filter(a=>a.meshId===meshId);
          for(const a of anchors)this.anchorColliders.set(a.id,{collider,chunk:key});
          this.anchorSupports.set(collider.handle,{anchors:anchors.map(a=>a.id),chunk:key});
          const roof=roofSurfaces(this.seed).find(r=>r.meshId===meshId);
          if(roof)this.roofSupports.set(collider.handle,{collider,chunk:key,block:{position:[roof.center.x,roof.center.y-.025,roof.center.z],halfExtents:[roof.halfExtents.x,.025,roof.halfExtents.z],yaw:roof.yaw}});
          continue;
        }
        if(isStructuralPropKind(prop.kind)){
          const mesh=structuralPropCollision(prop.kind,prop.scale),body=this.world.createRigidBody(this.rapier.RigidBodyDesc.fixed().setTranslation(prop.x,prop.y,prop.z).setRotation({x:0,y:Math.sin(prop.rotation/2),z:0,w:Math.cos(prop.rotation/2)}));
          bodies.push(body);const collider=this.world.createCollider(this.rapier.ColliderDesc.trimesh(mesh.vertices,mesh.indices).setFriction(.8),body);
          if(prop.id)this.buildingColliders.set(`${prop.id}:mesh`,{collider,chunk:key});
          if(prop.id&&this.cover.has(prop.id)){this.coverBodies.set(prop.id,{body,collider,chunk:key});this.colliderCover.set(collider.handle,prop.id);}
          continue;
        }
        const lamps=createRetainedLampColliderDescriptors(prop);if(lamps.length){for(const desc of lamps)colliders.push(this.world.createCollider(desc));continue;}
        const size=propCollider(prop);if(!size)continue;
        const body=this.world.createRigidBody(this.rapier.RigidBodyDesc.fixed().setTranslation(prop.x,prop.y+size[1],prop.z).setRotation({x:0,y:Math.sin(prop.rotation/2),z:0,w:Math.cos(prop.rotation/2)}));
        bodies.push(body);const collider=this.world.createCollider(this.rapier.ColliderDesc.cuboid(...size),body);
        if(prop.id&&this.cover.has(prop.id)){this.coverBodies.set(prop.id,{body,collider,chunk:key});this.colliderCover.set(collider.handle,prop.id);}
      }
      for(const block of landmarkBlocks(this.seed))if(chunkAt(block.position[0])===cx&&chunkAt(block.position[2])===cz) {
        const body=this.world.createRigidBody(this.rapier.RigidBodyDesc.fixed().setTranslation(...block.position).setRotation({x:0,y:Math.sin(block.yaw/2),z:0,w:Math.cos(block.yaw/2)}));
        bodies.push(body);this.world.createCollider(this.rapier.ColliderDesc.cuboid(...block.halfExtents),body);
      }
      for(const block of traversalBlocks(this.seed))if(chunkAt(block.position[0])===cx&&chunkAt(block.position[2])===cz) {
        const body=this.world.createRigidBody(this.rapier.RigidBodyDesc.fixed().setTranslation(...block.position).setRotation({x:0,y:Math.sin(block.yaw/2),z:0,w:Math.cos(block.yaw/2)}));
        bodies.push(body);const collider=this.world.createCollider(this.rapier.ColliderDesc.cuboid(...block.halfExtents),body);
        if('id' in block&&typeof block.id==='string')this.buildingColliders.set(block.id,{collider,chunk:key});
        this.anchorSupports.set(collider.handle,{anchors:[block.anchorId],chunk:key});
        if(block.part==='deck')this.roofSupports.set(collider.handle,{collider,chunk:key,block});
        if(block.part==='facade')this.anchorColliders.set(block.anchorId,{collider,chunk:key});
      }
      for(const block of cityBlocks(this.seed))if(cityBlockActive(block,this.structures)&&chunkAt(block.position[0])===cx&&chunkAt(block.position[2])===cz) {
        const body=this.world.createRigidBody(this.rapier.RigidBodyDesc.fixed().setTranslation(...block.position).setRotation({x:0,y:Math.sin(block.yaw/2),z:0,w:Math.cos(block.yaw/2)}));
        bodies.push(body);const collider=trackStreetCollider(this.world,block,this.world.createCollider(cityBlockColliderDesc(block),body));
        this.districtBodies.set(block.id,{body,collider,chunk:key,block});
        this.buildingColliders.set(block.id,{collider,chunk:key});
        if(block.part==='deck'||block.part==='fixture')this.roofSupports.set(collider.handle,{collider,chunk:key,block});
        const anchors=block.anchorIds??(block.anchorId?[block.anchorId]:[]);
        if(anchors.length)this.anchorSupports.set(collider.handle,{anchors,chunk:key});
        if(block.anchorId&&(block.part==='wall'||block.part==='cell'))this.anchorColliders.set(block.anchorId,{collider,chunk:key});
        if(block.structureId!==undefined){this.cellBodies.set(block.id,{body,collider,chunk:key,block});this.colliderCell.set(collider.handle,block);}
      }
      if(this.mode!=='pvp')for(const block of encounterBlocks(this.seed))if(chunkAt(block.position[0])===cx&&chunkAt(block.position[2])===cz) {
        const body=this.world.createRigidBody(this.rapier.RigidBodyDesc.fixed().setTranslation(...block.position).setRotation({x:0,y:Math.sin(block.yaw/2),z:0,w:Math.cos(block.yaw/2)}));
        bodies.push(body);this.world.createCollider(this.rapier.ColliderDesc.cuboid(...block.halfExtents),body);
      }
    }
    }catch(error){
      for(const key of incoming)this.retireChunk(key,retiredBuildingHandles);
      if(retiredBuildingHandles.size)this.invalidateBuildingSupports(retiredBuildingHandles);
      throw error;
    }
    for(const key of this.chunks.keys())if(!wanted.has(key))this.retireChunk(key,retiredBuildingHandles);
    if(retiredBuildingHandles.size)this.invalidateBuildingSupports(retiredBuildingHandles);
  }
  private retireChunk(key:string,removed:Set<number>):void {
    const value=this.chunks.get(key);if(!value)return;
    for(const [id,ref] of this.coverBodies)if(ref.chunk===key){this.colliderCover.delete(ref.collider.handle);this.coverBodies.delete(id);}
    for(const [id,ref] of this.districtBodies)if(ref.chunk===key)this.districtBodies.delete(id);
    for(const [id,ref] of this.buildingColliders)if(ref.chunk===key){removed.add(ref.collider.handle);this.buildingColliders.delete(id);}
    for(const [id,ref] of this.cellBodies)if(ref.chunk===key){this.colliderCell.delete(ref.collider.handle);this.cellBodies.delete(id);}
    for(const [id,ref] of this.anchorColliders)if(ref.chunk===key)this.anchorColliders.delete(id);
    for(const [handle,ref] of this.anchorSupports)if(ref.chunk===key)this.anchorSupports.delete(handle);
    for(const [handle,ref] of this.roofSupports)if(ref.chunk===key)this.roofSupports.delete(handle);
    for(const body of value.bodies)if(body.isValid())this.world.removeRigidBody(body);
    for(const collider of value.colliders)if(collider.isValid())this.world.removeCollider(collider,true);
    this.chunks.delete(key);
  }
  get physicsFailed():boolean{return this.physicsFailure!==null;}
  latchPhysicsFailure(error:unknown):void{this.physicsFailure??=error instanceof Error?error:new Error('Arena physics failed',{cause:error});}
  private assertPhysicsValid():void{if(this.physicsFailure)throw this.physicsFailure;}
  step(dt:number,stepWorld=true) {
    this.assertPhysicsValid();
    try{this.advanceStep(dt,stepWorld);this.publishFelinePose003();}catch(error){this.latchPhysicsFailure(error);throw this.physicsFailure!;}
  }
  private advanceStep(dt:number,stepWorld:boolean) {
    if(this.phase==='extracted'){this.endExtractedStrikes();return;}
    this.time+=dt;this.tick++;
    this.wokeRuinHandles.clear();
    this.refreshRuinClimbs();
    if(this.coopOwner?.state.status==='failed'){
      this.rubbleStepDt=dt;this.rubbleReaction.clear();this.characterMotion.beginStep();
      for(const actor of this.actors.values())if(actor.downed)this.advanceCorpse(actor,this.physics.get(actor.id)!,dt);
      this.characterMotion.endStep();if(stepWorld){this.world.timestep=dt;if(this.onStepTiming){const at=performance.now();this.world.step();this.onStepTiming('world-step',performance.now()-at);}else this.world.step();this.poseNativeStepTick003=this.tick;}this.ruinsOwner.advance(this.time);this.bondedOwner?.advance();this.refreshRuinClimbs();
      this.advanceCoop(dt);return;
    }
    this.rubbleStepDt=dt;this.rubbleReaction.clear();
    // Queue at damage acceptance, activate next tick in both dedicated and
    // externally stepped React worlds. Neither path gives debris an extra step.
    this.rubbleOwner.expire(this.time);
    if(this.physicalRubbleEnabled)for(const {block,incoming,impact} of this.pendingRubble.values())this.rubbleOwner.spawn(block,this.time,incoming,impact);
    this.pendingRubble.clear();
    const rubbleHandles=new Set([...this.rubbleOwner.colliderHandles(),...this.ruinsOwner.handles(),...this.bondedOwner?.handles()??[]]);
    this.rubbleHandles=rubbleHandles;
    this.excludedDynamicColliders=null;
    if(rubbleHandles.size){
      const excluded=new Set<number>();
      this.world.colliders.forEach(c=>{if(c.parent()?.isDynamic()&&!rubbleHandles.has(c.handle))excluded.add(c.handle);});
      this.excludedDynamicColliders=excluded;
    }
    for(const p of this.physics.values()){
      const active=rubbleHandles.size>0;
      if(active===this.rubbleControllers.has(p.controller))continue;
      const saved=active?{impulses:p.controller.applyImpulsesToDynamicBodies(),mass:p.controller.characterMass(),dynamicStep:p.controller.autostepIncludesDynamicBodies()??true}:this.rubbleControllers.get(p.controller)!;
      p.controller.setApplyImpulsesToDynamicBodies(active?true:saved.impulses);
      p.controller.setCharacterMass(active?1800:saved.mass);
      const height=p.controller.autostepMaxHeight(),width=p.controller.autostepMinWidth();
      if(p.controller.autostepEnabled()&&height!==null&&width!==null)p.controller.enableAutostep(height,width,active?false:saved.dynamicStep);
      if(active)this.rubbleControllers.set(p.controller,saved);else this.rubbleControllers.delete(p.controller);
    }
    this.events=this.events.filter(e=>this.time-e.at<1.2);
    if(this.time>=this.streamAt) {
      const players=[...this.actors.values()].filter(a=>!a.bot);
      this.syncChunks([...players.map(a=>a.position),...[...this.actors.values()].filter(a=>a.bot).map(a=>a.position),...this.map.enemySpawns.map(([x,z])=>({x,y:0,z})),...(this.checkpoint?[this.checkpoint.position]:[])]);this.streamAt=this.time+.5;
    }
    this.encounterOwner?.advance([...this.actors.values()],this.time,id=>{const p=this.physics.get(id);return p&&this.time-p.received<=.3?p.input:null;},(from,to)=>this.clearRay(from,to));
    this.advanceSupplies();
    const travel=new Map<string,StrikeTravel>(),colliderOwners=new Map<number,string>();
    const contactTick=[...this.actors.values()].some(actor=>actor.strike?.stage==='flight'||this.physics.get(actor.id)!.pendingStrike>0);
    if(contactTick)for(const actor of this.actors.values())if(actor.hp>0){const collider=this.physics.get(actor.id)!.collider,shape=collider.shape,offset=collider.translationWrtParent();
      if(!(shape instanceof this.rapier.RoundCylinder)||!offset)continue;
      travel.set(actor.id,{from:{...actor.position},to:{...actor.position},radius:shape.radius+shape.borderRadius,height:2*(shape.halfHeight+shape.borderRadius),life:actor.jumpEpoch,redirected:false,hull:{handle:collider.handle,halfHeight:shape.halfHeight,radius:shape.radius,border:shape.borderRadius,offset:{...offset}}});colliderOwners.set(collider.handle,actor.id);
    }
    const retiringStrikes=new Set<string>();
    this.disabledMovementColliders.clear();
    this.world.colliders.forEach(collider=>{if(!collider.isEnabled())this.disabledMovementColliders.add(collider.handle);});
    this.characterMotion.beginStep();
    for(const actor of this.actors.values()) {
      const p=this.physics.get(actor.id)!;
      actor.groundedOnRubble=false;
      if(actor.hp<=0) {
        p.rubbleRise=false;
        if(p.jumpAlive)this.retireJumpLife(actor,p);this.consumeJump(actor,p);this.consumeStrike(actor,p);
        this.detachClimb(actor,p);actor.aiState='destroyed';p.collider.setEnabled(false);this.disabledMovementColliders.add(p.collider.handle);
        if(!actor.downed&&!this.defeatedCoopNpcs.has(actor.id)&&this.time>=actor.respawnAt)this.respawn(actor,p);else this.advanceCorpse(actor,p,dt);
        continue;
      }
      const jump=this.consumeJump(actor,p);
      const strikeId=this.consumeStrike(actor,p);
      const botAt=actor.bot&&(this.onStepTiming||this.onBotTiming)?performance.now():0;
      let input=actor.bot?this.botInput(actor):{...p.input,jump};
      if(actor.bot&&this.onStepTiming)this.onStepTiming('bot-input',performance.now()-botAt);
      if(actor.bot&&this.onBotTiming)this.onBotTiming({actor:actor.id,role:actor.role??'unknown',aiState:actor.aiState,durationMs:performance.now()-botAt,tick:this.tick,time:this.time});
      if(!actor.bot&&this.time-p.received>.3)input={...emptyInput(),stance:actor.stance};
      actor.lastInput=input.seq;actor.aimYaw=input.aimYaw??input.yaw;actor.aimPitch=input.pitch;
      if(input.stanceRequest)this.advanceStanceRequest(actor,p,input);
      if(actor.pair){if(this.onStepTiming){const at=performance.now();this.advancePair(actor,input,dt);this.onStepTiming('pair',performance.now()-at);}else this.advancePair(actor,input,dt);}
      const paired=!!actor.pair;
      if(paired)input={...input,forward:0,strafe:0,jump:false,fire:false,rocket:false,boost:false,climb:false,stance:actor.stance};
      if(actor.strike&&(actor.disruptedUntil>this.time||input.climb)){this.endStrike(actor);}
      if(input.climb||actor.climb||p.climbHull)p.landingJump=null;
      if(!actor.climb&&input.climb)this.attachClimb(actor,p,input);
      if(actor.climb){p.rubbleRise=false;if(this.onStepTiming){const at=performance.now();this.advanceClimb(actor,p,input,dt);this.onStepTiming('climb',performance.now()-at);}else this.advanceClimb(actor,p,input,dt);continue;}
      if(p.climbHull&&this.time-actor.climbDetachedAt>=CLIMB_RETRACTION)this.setHull(actor,p,'quadruped');
      if(!input.stanceRequest&&!actor.bot&&input.stance!==actor.stance&&actor.grounded&&this.time-actor.stanceChangedAt>=STANCE_TRANSITION&&this.time-actor.climbDetachedAt>=CLIMB_RETRACTION)this.changeStance(actor,p,input.stance);
      const transitioning=this.time-actor.stanceChangedAt<STANCE_TRANSITION;
      if(transitioning||input.stance!==actor.stance||strikeId>0||actor.strike)p.landingJump=null;
      if(actor.strike&&(transitioning||actor.strike.stage==='recovery'&&this.time>=actor.strike.endsAt)){this.endStrike(actor);}
      if(actor.strike?.stage==='flight'&&this.time>=actor.strike.endsAt)this.recoverStrike(actor);
      if(transitioning)input={...input,fire:false,rocket:false,boost:false,jump:false};
      else if(p.hullStance!==actor.stance)this.setHull(actor,p,actor.stance);
      if(actor.disruptedUntil>this.time)input={...input,fire:false,rocket:false,boost:false};
      actor.lastInput=input.seq;
      actor.aimYaw=input.aimYaw??input.yaw;actor.aimPitch=input.pitch;
      actor.energy=clamp(actor.energy+dt*(input.fire?5:13),0,100);
      actor.heat=Math.max(0,actor.heat-dt*28);
      if(this.time-actor.hitAt>7)actor.hp=Math.min(actor.maxHp,actor.hp+14*dt);
      const mech=MECHS[actor.chassis],upright=actor.stance==='upright',stanceStats=UPRIGHT[actor.chassis],ability=mech.ability,abilityEnergy=upright?stanceStats.energy:ability==='repair'?40:ability==='dash'?30:25;
      if(strikeId&&!paired&&!actor.bot&&!actor.strike&&!transitioning&&actor.disruptedUntil<=this.time&&!input.climb&&actor.energy>=STRIKE_PROFILES[actor.chassis].energy&&this.time>=actor.abilityReadyAt)this.beginStrike(actor,p,strikeId,input.strafe);
      if(input.boost&&!p.suppressBoost&&!actor.strike&&actor.energy>=abilityEnergy&&this.time>=actor.abilityReadyAt&&actor.grounded&&!actor.bot) {
        actor.energy-=abilityEnergy;actor.abilityAt=this.time;actor.abilityReadyAt=this.time+(upright?stanceStats.cooldown:mech.abilityCooldown);
        if(upright)this.uprightAbility(actor);
        else {
        this.emit(ability==='repair'?'repair':'pounce',actor.position,actor.id,undefined,undefined,undefined,{radius:ability==='repair'?10:ability==='shockwave'?7:ability==='pounce'?5:undefined,direction:actor.aimYaw,effect:ability==='repair'?'repair':ability==='shockwave'?'shockwave':undefined});this.pounceHits.delete(actor.id);
        if(ability==='pounce'){actor.boostUntil=this.time+.6;actor.velocity.y=5;}
        if(ability==='dash')actor.boostUntil=this.time+.4;
        if(ability==='shockwave'){actor.shieldUntil=this.time+3;this.splash(actor.position,7,55,actor.id,true);}
        if(ability==='repair')for(const friendly of this.actors.values()) {
          const teamHeal=this.mode==='training'||this.mode==='coop';
          if(friendly.hp>0&&!friendly.bot&&(friendly.id===actor.id||teamHeal)&&horizontalDistance(friendly.position,actor.position)<=10&&this.lineOfSight(actor.position,friendly.position))friendly.hp=Math.min(friendly.maxHp,friendly.hp+50);
        }
        }
      }
      const f=direction(input.yaw),s={x:Math.cos(input.yaw),z:-Math.sin(input.yaw)};
      let mx=f.x*input.forward+s.x*input.strafe,mz=f.z*input.forward+s.z*input.strafe;
      const len=Math.hypot(mx,mz);if(len>1){mx/=len;mz/=len;}
      const boosting=actor.boostUntil>this.time;
      const striking=actor.strike?.stage==='flight';
      const speed=(actor.bot?(actor.role==='anchor'?2.8:4.5):mech.speed)*(upright?stanceStats.speed:1)*this.fieldSpeed(actor)*(boosting?2.8:1);
      if(boosting&&(ability==='pounce'||ability==='dash')){if(len<.01||ability==='pounce'){mx=f.x;mz=f.z;}}
      const blend=1-Math.exp(-dt*(len>.01?11:14));
      if(striking){const strike=actor.strike!,profile=STRIKE_PROFILES[actor.chassis];actor.velocity.x=strike.direction.x*profile.speed;actor.velocity.z=strike.direction.z*profile.speed;actor.yaw=angleLerp(actor.yaw,Math.atan2(-strike.direction.x,-strike.direction.z),1-Math.exp(-dt*14));input={...input,fire:false,rocket:false,jump:false};}
      else {actor.velocity.x+=(mx*speed-actor.velocity.x)*blend;actor.velocity.z+=(mz*speed-actor.velocity.z)*blend;
      if(len>.1||boosting)actor.yaw=angleLerp(actor.yaw,Math.atan2(-mx,-mz),1-Math.exp(-dt*10));
      if(input.fire||input.rocket)actor.yaw=angleLerp(actor.yaw,input.yaw,1-Math.exp(-dt*9));}
      // Use the last committed native ground result at the original launch site.
      if(actor.pair){actor.velocity.x=0;actor.velocity.z=0;actor.yaw=actor.pair.yaw+(actor.pair.role==='victim'?Math.PI:0);}
      // A landing later in this KCC step can enable a jump only on the next tick.
      if((input.jump||p.landingJump)&&actor.grounded){actor.velocity.y=upright?UPRIGHT_JUMP[actor.chassis]:mech.jump;actor.grounded=false;p.landingJump=null;}
      actor.velocity.y=Math.max(-32,actor.velocity.y-22*dt);
      const desired={x:actor.velocity.x*dt,y:actor.velocity.y*dt,z:actor.velocity.z*dt};
      const beforeY=actor.position.y,locomotionAt=this.onStepTiming?performance.now():0,locomotion=this.moveLocomotion(p,desired,actor.position,!striking),rubbleMovement=locomotion.movement;
      if(this.onStepTiming)this.onStepTiming('locomotion',performance.now()-locomotionAt);
      const move=locomotion.move;
      const route=travel.get(actor.id);
      if(route)for(let i=0;i<p.controller.numComputedCollisions();i++){
        const hit=p.controller.computedCollision(i);if(!hit?.collider)continue;
        if(hit.collider.parent()?.isKinematic()!==true&&hit.normal1.y<.65)route.redirected=true;
        const target=colliderOwners.get(hit.collider.handle);if(!target)continue;route.actorCollision=true;
        // Only the first native approach is time-parameterized: it must still
        // lie on the requested straight leg. Later slide/autostep legs have no
        // admitted clock model here. Preserve real contact before the final
        // upward slide hides it in the start-to-end chord.
        if(i===0&&striking){const applied=hit.translationDeltaApplied,request=locomotion.desired,lengthSquared=request.x**2+request.y**2+request.z**2;
          const fraction=lengthSquared>0?(applied.x*request.x+applied.y*request.y+applied.z*request.z)/lengthSquared:0;
          if(Number.isFinite(fraction)&&fraction>0&&fraction<=1&&Math.hypot(applied.x-request.x*fraction,applied.y-request.y*fraction,applied.z-request.z*fraction)<=1e-5)
            route.approach={target,life:this.actors.get(target)!.jumpEpoch,collider:hit.collider.handle,to:{x:route.from.x+applied.x,y:route.from.y+applied.y,z:route.from.z+applied.z},fraction};
        }
      }
      const nextX=actor.position.x+move.x,nextZ=actor.position.z+move.z;
      if(route)route.normalPathObserved=true;
      if(route&&(Math.abs(nextX)>WORLD_LIMIT||Math.abs(nextZ)>WORLD_LIMIT))route.corrected=true;
      actor.position.x=clamp(nextX,-WORLD_LIMIT,WORLD_LIMIT);actor.position.y+=move.y;actor.position.z=clamp(nextZ,-WORLD_LIMIT,WORLD_LIMIT);
      // An actual owned contact can leave Rapier's grounded flag true during
      // upward takeoff, even in a subsequent query with no collision witness.
      // Carry that local proof only through consecutive requested AND accepted
      // rises. Remote rubble, blocked ceilings and descent cannot grant it.
      let touchesRubble=false,supportedByRubble=false;
      if(rubbleHandles.size)for(let i=0;i<p.controller.numComputedCollisions();i++){
        const hit=p.controller.computedCollision(i);if(!hit?.collider||!rubbleHandles.has(hit.collider.handle))continue;
        touchesRubble=true;if(hit.normal1.y>.5)supportedByRubble=true;
      }
      p.rubbleRise=locomotion.desired.y>0&&move.y>0&&actor.position.x===nextX&&actor.position.z===nextZ&&(p.rubbleRise||touchesRubble||locomotion.ownedTakeoff);
      const grounded=p.controller.computedGrounded()&&!p.rubbleRise;
      const landed=!actor.grounded&&grounded;actor.grounded=grounded;
      actor.groundedOnRubble=actor.grounded&&supportedByRubble;
      if(landed&&this.supportGraph&&actor.velocity.y< -8){
        const cells=new Map<string,CityBlock>();
        for(let i=0;i<p.controller.numComputedCollisions();i++){const hit=p.controller.computedCollision(i);if(hit?.collider&&hit.normal1.y>.5){const cell=this.colliderCell.get(hit.collider.handle);if(cell)cells.set(cell.id,cell);}}
        const impact=Math.min(90,(Math.abs(actor.velocity.y)-8)*4)/Math.max(1,cells.size);
        for(const cell of cells.values())this.damageCell(cell,impact,actor.id,actor.position,{x:actor.velocity.x,y:actor.velocity.y,z:actor.velocity.z},{x:0,y:1,z:0});
      }
      if(actor.grounded)actor.velocity.y=0;
      if(striking&&(actor.grounded&&actor.strike?.kind==='dive'||route?.redirected))retiringStrikes.add(actor.id);
      if(landed&&boosting&&ability==='pounce'&&!this.pounceHits.has(actor.id)){this.splash(actor.position,5,45,actor.id,true);this.emit('area',actor.position,actor.id,undefined,undefined,45,{radius:5,direction:actor.aimYaw,effect:'shockwave'});this.pounceHits.add(actor.id);}
      if(actor.position.y<terrainHeight(actor.position.x,actor.position.z,this.seed)-5){if(route)route.corrected=true;actor.position.y=terrainHeight(actor.position.x,actor.position.z,this.seed)+ACTOR_HEIGHT;actor.velocity.y=0;p.rubbleRise=false;}
      p.body.setNextKinematicTranslation(actor.position);
      if(actor.position.x===nextX&&actor.position.z===nextZ&&actor.position.y===beforeY+move.y)this.commitCharacterRubble(p,rubbleMovement);
      if(input.fire&&this.time>=p.fireReadyAt&&actor.heat<87&&this.shoot(actor,'pulse'))p.fireReadyAt=this.time+(actor.bot?(actor.role==='anchor'?1.1:.85):WEAPONS.pulse.interval*mech.weaponInterval*(upright?stanceStats.interval:1));
      if(input.rocket&&this.time>=actor.rocketReadyAt&&actor.heat<85&&this.shoot(actor,'rocket'))actor.rocketReadyAt=this.time+(actor.bot?4.5:WEAPONS.rocket.interval*mech.weaponInterval*(upright?stanceStats.interval:1));
      if(input.interact&&!actor.bot)this.interact(actor,dt);
    }
    // Freeze all accepted endpoints before resolving any simultaneous contacts.
    for(const [id,route] of travel){const actor=this.actors.get(id)!,collider=this.physics.get(id)!.collider,shape=collider.shape,offset=collider.translationWrtParent(),hull=route.hull!;route.to={...actor.position};
      const changedHull=collider.handle!==hull.handle||!(shape instanceof this.rapier.RoundCylinder)||shape.halfHeight!==hull.halfHeight||shape.radius!==hull.radius||shape.borderRadius!==hull.border||!offset||offset.x!==hull.offset.x||offset.y!==hull.offset.y||offset.z!==hull.offset.z;
      if(changedHull||route.corrected||actor.hp<=0||actor.jumpEpoch!==route.life||distance(route.from,route.to)>2+distance({x:0,y:0,z:0},actor.velocity)*dt*1.5)travel.delete(id);
    }
    this.resolveStrikes(travel,retiringStrikes);
    for(const id of retiringStrikes){const actor=this.actors.get(id);if(actor?.strike?.stage==='flight')this.recoverStrike(actor);}
    this.characterMotion.endStep();
    if(stepWorld){this.world.timestep=dt;if(this.onStepTiming){const at=performance.now();this.world.step();this.onStepTiming('world-step',performance.now()-at);}else this.world.step();this.poseNativeStepTick003=this.tick;}
    this.ruinsOwner.advance(this.time);this.bondedOwner?.advance();
    this.refreshRuinClimbs();
    this.advanceProjectiles(dt);
    this.advanceFields(dt);
    this.objectives[2].unlocked=this.objectives[0].complete&&this.objectives[1].complete;
    this.objectives[3].unlocked=this.objectives[2].complete;
    for(const uplink of this.objectives)if(uplink.optional&&!uplink.complete&&this.uplinkTouches.get(uplink.id)?.touchedAt!==this.time){uplink.progress=0;this.uplinkTouches.delete(uplink.id);}
    this.advanceCoop(dt);
    this.finishCoopExtraction();
    this.endExtractedStrikes();
  }
  private finishCoopExtraction():void {
    if(this.mode!=='coop')return;
    const objective=this.objectives.find(o=>o.id==='extraction');
    if(!objective||objective.complete)return;
    if(coopExtractionWait([...this.actors.values()],objective.position)) {
      objective.progress=0;this.coopExtractionPilot=null;return;
    }
    const pilot=this.coopExtractionPilot?this.actors.get(this.coopExtractionPilot):undefined;
    if(objective.progress<1||!pilot)return;
    // Commit after movement, damage and rescue: no stale pre-damage squad can win.
    objective.complete=true;pilot.salvage+=100;this.emit('capture',objective.position,pilot.id);
    this.phase='extracted';this.winner=pilot.id;this.coopExtractionPilot=null;
  }
  private advanceCoop(dt:number):void {
    this.coopOwner?.advance([...this.actors.values()],this.objectives,this.time,dt,{
      input:id=>{const p=this.physics.get(id);return p&&this.time-p.received<=.3?p.input:null;},
      clearRay:(from,to)=>this.clearRay(from,to),
      restore:target=>{
        const p=this.physics.get(target.id)!;
        const radius=actorHullRadius(target),height=actorQuadHeight(target);
        const center={...target.position,y:target.position.y-ACTOR_HEIGHT+height/2+.06};
        if(this.solidIntersection(center,{x:0,y:0,z:0,w:1},new this.rapier.RoundCylinder(height/2-.12,radius-.12,.12),this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC,undefined,p.collider,p.body))return false;
        if([...this.actors.values()].some(a=>a.id!==target.id&&a.hp>0&&horizontalDistance(a.position,target.position)<radius+actorHullRadius(a)+.05))return false;
        target.aiState='patrol';target.stance='quadruped';target.stanceChangedAt=-100;target.velocity={x:0,y:0,z:0};target.disruptedUntil=0;
        this.setHull(target,p,'quadruped');p.collider.setEnabled(true);this.disabledMovementColliders.delete(p.collider.handle);p.protectedUntil=this.time+2;
        p.body.setTranslation(target.position,true);p.body.setNextKinematicTranslation(target.position);return true;
      },
      retry:()=>{
        this.encounterOwner?.reset();this.projectiles=[];this.projectileDamage.clear();this.fields=[];this.uplinkTouches.clear();this.strikeHits.clear();
        for(const actor of this.actors.values()){this.releasePair(actor,true);this.endStrike(actor);if(!actor.bot)this.respawn(actor,this.physics.get(actor.id)!);}
      },
    });
  }
  private endExtractedStrikes():void {
    if(this.phase!=='extracted')return;this.rubbleOwner.dispose();this.pendingRubble.clear();for(const actor of this.actors.values()){this.endStrike(actor);this.physics.get(actor.id)!.landingJump=null;}this.strikeHits.clear();
  }
  private endStrike(actor:ActorState):void {
    if(actor.strike)actor.strikeEndedAt=this.time;actor.strike=null;this.strikeHits.delete(actor.id);
  }
  private releasePair(actor:ActorState,immediate=false,outcome:'completed'|'escaped'='completed'):void {
    const pair=actor.pair;if(!pair)return;
    this.pairComboContacts.delete(pair.id);
    const other=this.actors.get(pair.other);
    for(const participant of [actor,other])if(participant?.pair?.id===pair.id){
      if(immediate){participant.pair=null;participant.pairImmuneUntil=this.time+PAIR_TIMING.immunity;}
      else participant.pair={...participant.pair,phase:'release',phaseAt:this.time,endsAt:this.time+PAIR_TIMING.release,outcome};
    }
  }
  private advancePair(actor:ActorState,input:InputState,dt:number):void {
    const pair=actor.pair;if(!pair)return;
    const other=this.actors.get(pair.other);
    if(!validPair(actor,other)||actor.disruptedUntil>this.time||other!.disruptedUntil>this.time||
      !actor.grounded&&this.time-pair.startedAt>.15||!other!.grounded&&this.time-pair.startedAt>.15||
      horizontalDistance(actor.position,other!.position)>pair.offset+other!.pair!.offset+.8){this.releasePair(actor,true);return;}
    if(pair.phase==='release'){if(this.time>=pair.endsAt)this.releasePair(actor,true);return;}
    if(pair.role==='victim'&&this.time-pair.startedAt>=PAIR_TIMING.escapeWindow){
      const profile=PAIR_PROFILE[other!.chassis];
      pair.escape=Math.min(2,pair.escape+(input.interact?dt*profile.escapeRate:0)+(input.jump?PAIR_TIMING.escapeNeeded:0));other!.pair!.escape=pair.escape;
      if(pair.escape>=PAIR_TIMING.escapeNeeded){this.releasePair(actor,false,'escaped');return;}
    }
    if(pair.role==='attacker'){
      if(pair.phase==='impact'&&this.time>=pair.endsAt){
        for(const participant of [actor,other!])participant.pair={...participant.pair!,phase:'pin',phaseAt:this.time,endsAt:this.time+PAIR_PROFILE[actor.chassis].duration};
      }else if(pair.phase==='pin'){
        const pending=this.pairComboContacts.get(pair.id);
        if(pending&&this.time>=pending.at){
          this.pairComboContacts.delete(pair.id);
          if(pending.combo===pair.combo&&this.lineOfSight(actor.position,other!.position)){
            this.damage(other!,PAIR_PROFILE[actor.chassis].comboDamage,actor.id,other!.position);
            this.emit('impact',other!.position,actor.id,other!.id,undefined,PAIR_PROFILE[actor.chassis].comboDamage);
            if(!actor.pair||!other!.pair)return;
          }
        }
        const due=Math.floor((this.time-pair.phaseAt)/.25);
        if(input.fire&&due>pair.combo&&pair.combo<2&&this.lineOfSight(actor.position,other!.position)){
          pair.combo++;other!.pair!.combo=pair.combo;pair.comboAt=this.time;other!.pair!.comboAt=this.time;
          this.pairComboContacts.set(pair.id,{combo:pair.combo,at:this.time+PAIR_TIMING.comboContact});
        }
        if(this.time>=pair.endsAt)this.releasePair(actor);
      }
    }
  }

  private beginStrike(actor:ActorState,p:ActorPhysics,id:number,strafe:number):void {
    const profile=STRIKE_PROFILES[actor.chassis],kind=actor.stance==='upright'?'tackle':p.strikeAim.pitch<=-.3?'dive':'pounce';
    const pitch=kind==='dive'?clamp(p.strikeAim.pitch,-1.1,-.3):clamp(p.strikeAim.pitch,-.15,.2),heading=direction(p.strikeAim.yaw,pitch);
    actor.strike={id,life:actor.jumpEpoch,kind,acceptedAt:this.time,stage:'flight',stageAt:this.time,endsAt:this.time+profile.duration,direction:heading,side:strafe<0?-1:1};
    actor.strikeEndedAt=-100;
    actor.energy-=profile.energy;actor.abilityReadyAt=this.time+profile.cooldown;actor.boostUntil=0;p.suppressBoost=true;this.strikeHits.set(actor.id,new Set());
    actor.velocity.x=heading.x*profile.speed;actor.velocity.z=heading.z*profile.speed;
    actor.velocity.y=kind==='dive'?Math.min(-5,heading.y*profile.speed):Math.max(1.6,Math.min(4,actor.velocity.y));
    if(actor.chassis==='bastion'||actor.chassis==='caracal')actor.shieldUntil=Math.max(actor.shieldUntil,this.time+profile.duration+.15);
    this.emit('pounce',actor.position,actor.id,undefined,undefined,undefined,{direction:p.strikeAim.yaw});
  }
  private recoverStrike(actor:ActorState):void {
    if(actor.strike?.stage!=='flight')return;
    actor.strike={...actor.strike,stage:'recovery',stageAt:this.time,endsAt:this.time+STRIKE_PROFILES[actor.chassis].recovery};
  }
  private strikePathClear(route:ActorTravel,fraction:number):boolean {
    const center={...route.from,y:route.from.y+route.height/2-ACTOR_HEIGHT},move={x:route.to.x-route.from.x,y:route.to.y-route.from.y,z:route.to.z-route.from.z};
    const shape=new this.rapier.RoundCylinder(route.height/2-.12,route.radius-.12,.12);
    const overlaps:number[]=[];
    // Query callbacks read only JS handles; native contact queries run after
    // Rapier releases its collider-set borrow.
    this.solidIntersections(center,{x:0,y:0,z:0,w:1},shape,collider=>{overlaps.push(collider.handle);return true;},this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
    for(const handle of overlaps){const collider=this.world.getCollider(handle);const contact=shape.contactShape(center,{x:0,y:0,z:0,w:1},collider.shape,collider.translation(),collider.rotation(),0);if(contact&&contact.distance< -1e-5)return false;}
    const obstruction=this.solidCast(center,{x:0,y:0,z:0,w:1},move,shape,0,fraction,false,this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
    return !obstruction||obstruction.time_of_impact>=fraction-1e-5;
  }
  private resolveStrikes(travel:Map<string,StrikeTravel>,retiring:Set<string>):void {
    const contacts:{owner:string;target:string;actionId:number;life:number;fraction:number;point:Vec3;normal:Vec3;amount:number;impulse:number;kind:'pounce'|'tackle'|'dive'}[]=[];
    for(const actor of this.actors.values()) {
      const strike=actor.strike,route=travel.get(actor.id),hits=this.strikeHits.get(actor.id);
      if(!strike||strike.stage!=='flight'||strike.life!==actor.jumpEpoch||!route||route.redirected||!hits||actor.hp<=0||actor.climb||actor.disruptedUntil>this.time)continue;
      for(const target of this.actors.values()) {
        const other=travel.get(target.id);if(!other||other.redirected||hits.has(target.id)||hits.size>=64||!this.canDamage(actor.id,target))continue;
        const options={facingYaw:Math.atan2(-strike.direction.x,-strike.direction.z),contactDistance:.02,minFacingDot:.35};
        const candidates:{contact:NonNullable<ReturnType<typeof sweepFelineContact>>;source:ActorTravel;globalFraction:number}[]=[];
        const chord=sweepFelineContact(this.rapier,route,other,options);if(chord)candidates.push({contact:chord,source:route,globalFraction:chord.fraction});
        const leg=route.approach;
        if(leg?.target===target.id&&leg.life===target.jumpEpoch&&leg.collider===this.physics.get(target.id)!.collider.handle&&other.normalPathObserved===true&&!other.actorCollision){const until=leg.fraction,source={...route,to:leg.to},destination={...other,to:{x:other.from.x+(other.to.x-other.from.x)*until,y:other.from.y+(other.to.y-other.from.y)*until,z:other.from.z+(other.to.z-other.from.z)*until}};
          const first=sweepFelineContact(this.rapier,source,destination,options);
          if(first)candidates.push({contact:first,source,globalFraction:first.fraction*until});
        }
        candidates.sort((a,b)=>a.globalFraction-b.globalFraction);const accepted=candidates.find(candidate=>{
          const {contact,source,globalFraction}=candidate;if(contact.initialOverlap||!this.strikePathClear(source,contact.fraction)||!this.strikePathClear(other,globalFraction))return false;
          const gap=distance(contact.witnessAttacker,contact.witnessTarget);
          if(gap>1e-6){const a=contact.witnessAttacker,b=contact.witnessTarget,ray=new this.rapier.Ray(a,{x:(b.x-a.x)/gap,y:(b.y-a.y)/gap,z:(b.z-a.z)/gap});if(this.solidRay(ray,gap,true,this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC))return false;}
          return true;
        });if(!accepted)continue;const {contact,globalFraction}=accepted;
        // Reserve the physical contact, including spawn-protected targets.
        hits.add(target.id);
        const profile=STRIKE_PROFILES[actor.chassis];contacts.push({owner:actor.id,target:target.id,actionId:strike.id,life:strike.life,fraction:globalFraction,point:contact.point,normal:contact.normal,amount:profile.damage*(strike.kind==='dive'?1.12:strike.kind==='tackle'?1.05:1),impulse:profile.impulse,kind:strike.kind});
      }
    }
    const order=(a:string,b:string)=>a<b?-1:a>b?1:0;contacts.sort((a,b)=>a.fraction-b.fraction||order(a.owner,b.owner)||order(a.target,b.target));
    for(let index=0;index<contacts.length;){let end=index+1;while(end<contacts.length&&contacts[end].fraction-contacts[index].fraction<=1e-6)end++;
      // Equal-time trades are frozen together; later contacts cannot outlive a source.
      const ready=contacts.slice(index,end).filter(hit=>{const source=this.actors.get(hit.owner);return source&&source.hp>0&&source.jumpEpoch===hit.life&&source.strike?.id===hit.actionId&&source.strike.stage==='flight'&&!source.climb&&source.disruptedUntil<=this.time;});index=end;
    for(const hit of ready){const target=this.actors.get(hit.target)!;if(!this.canDamage(hit.owner,target))continue;const before=target.hp;this.damage(target,hit.amount,hit.owner,hit.point);const amount=before-target.hp;
      if(amount>0&&target.hp>0){
        const source=this.actors.get(hit.owner)!,pair=createPair(source,target,this.time,hit.normal,hit.actionId);
        if(pair){this.endStrike(source);this.endStrike(target);source.pair=pair[0];target.pair=pair[1];source.velocity.x=source.velocity.z=target.velocity.x=target.velocity.z=0;}
        else {target.velocity.x-=hit.normal.x*hit.impulse;target.velocity.z-=hit.normal.z*hit.impulse;target.velocity.y+=Math.max(1.5,-hit.normal.y*hit.impulse);if(hit.kind==='tackle'&&target.climb)this.detachClimb(target,this.physics.get(target.id)!);}
      }
      this.emit('impact',hit.point,hit.owner,target.id,undefined,amount,{normal:hit.normal});retiring.add(hit.owner);
    }
    }
  }
  private respawn(actor:ActorState,p:ActorPhysics) {
    if(actor.bot&&this.defeatedCoopNpcs.has(actor.id))return;
    const brain=this.brains.get(actor.id),roof=roofSurfaces(this.seed).find(roof=>roof.id===brain?.roofHome);
    const origin=this.mode==='coop'&&this.checkpoint?this.checkpoint.position:this.map.spawn;
    const spawn=actor.bot?[brain!.home.x,brain!.home.z]:[origin.x+(p.spawnSlot%4)*4.6,origin.z+Math.floor(p.spawnSlot/4)*4.6];
    const position=this.clearRespawn(actor,p,spawn[0],spawn[1],.06,roof);
    if(!position){p.collider.setEnabled(false);actor.respawnAt=this.time+.5;return;}
    actor.position=position;
    actor.velocity={x:0,y:0,z:0};actor.hp=actor.maxHp;actor.energy=100;actor.heat=0;actor.hitAt=this.time;actor.fireAt=-100;actor.pulseAt=-100;actor.rocketAt=-100;actor.abilityAt=-100;actor.hurtAt=-100;actor.diedAt=-100;actor.disruptedUntil=0;actor.aiState='patrol';actor.grounded=false;actor.shieldUntil=0;actor.boostUntil=0;actor.windupUntil=0;actor.stance='quadruped';actor.stanceChangedAt=-100;actor.climb=null;actor.climbDetachedAt=-100;
    this.retireJumpLife(actor,p);this.setHull(actor,p,'quadruped');p.input={...emptyInput(),seq:p.input.seq,jumpEpoch:actor.jumpEpoch};
    if(brain){brain.target=undefined;brain.lastSeen=undefined;brain.path=[];brain.goal=undefined;brain.retreat=false;brain.windupAim=undefined;brain.seenAt=-100;brain.readyAt=this.time+.5;brain.verticalRoof=undefined;brain.verticalAttachSince=undefined;brain.verticalJumpAt=undefined;brain.verticalJumpAnchor=undefined;brain.verticalJumpRetreatAt=undefined;brain.verticalRetryAt=0;brain.roofUntil=0;brain.exitRoof=undefined;brain.exitCrossing=false;}
    p.collider.setEnabled(true);this.disabledMovementColliders.delete(p.collider.handle);p.body.setTranslation(actor.position,true);p.body.setNextKinematicTranslation(actor.position);p.protectedUntil=this.time+2;
  }
  private advanceCorpse(actor:ActorState,p:ActorPhysics,dt:number) {
    // Corpses retain no blocking collider, but their authoritative pose still falls
    // against the real geometry rather than hanging at an interrupted wall grip.
    actor.velocity.x*=Math.exp(-dt*4);actor.velocity.z*=Math.exp(-dt*4);actor.velocity.y=Math.max(-32,actor.velocity.y-22*dt);
    const rubbleMovement=this.moveCharacter(p,{x:actor.velocity.x*dt,y:actor.velocity.y*dt,z:actor.velocity.z*dt},this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC|this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC);
    const move=p.controller.computedMovement();actor.position.x+=move.x;actor.position.y+=move.y;actor.position.z+=move.z;actor.grounded=p.controller.computedGrounded();
    if(actor.grounded)actor.velocity.y=0;
    p.body.setNextKinematicTranslation(actor.position);
    this.commitCharacterRubble(p,rubbleMovement);
  }
  private clearRespawn(actor:ActorState,p:ActorPhysics,x:number,z:number,lift=.06,roof?:RoofSurface):Vec3|undefined {
    const radius=actorHullRadius(actor),height=actorQuadHeight(actor),shape=new this.rapier.Cuboid(radius,height/2,radius);
    const candidates:[number,number][]=[[x,z]];
    for(const ring of [5,10,15,20])for(let direction=0;direction<8;direction++) {
      const angle=direction*Math.PI/4;candidates.push([x+Math.cos(angle)*ring,z+Math.sin(angle)*ring]);
    }
    for(const [cx,cz] of candidates) {
      if(Math.abs(cx)+radius>WORLD_LIMIT||Math.abs(cz)+radius>WORLD_LIMIT)continue;
      // The bounding box conservatively contains the complete rounded hull, and also
      // detects solid containment that Rapier's cylinder intersection can miss.
      let floor=roof?.center.y??terrainHeight(cx,cz,this.seed);
      // A center-height sample embeds a wide hull in even a gentle uphill slope.
      // Cast the same conservative hull down onto the actual streamed triangle
      // mesh, bounded by the controller's step height. Other solids remain in the
      // final clearance query: this never treats a wall/roof as ground to jump onto.
      if(!roof) {
        let supported=false,unsafe=false;
        const start={x:cx,y:floor+.56+height/2,z:cz};
        for(let tx=chunkAt(cx-radius);tx<=chunkAt(cx+radius);tx++)for(let tz=chunkAt(cz-radius);tz<=chunkAt(cz+radius);tz++) {
          const terrain=this.chunks.get(`${tx},${tz}`)?.terrain;
          if(!terrain){unsafe=true;continue;}
          const hit=terrain.castShape({x:0,y:0,z:0},shape,start,{x:0,y:0,z:0,w:1},{x:0,y:-1,z:0},0,.62,true);
          if(!hit)continue;
          const rise=.56-hit.time_of_impact;
          if(rise>.55){unsafe=true;continue;}
          supported=true;floor=Math.max(floor,start.y-height/2-hit.time_of_impact);
        }
        if(unsafe||!supported)continue;
      }
      const position={x:cx,y:floor+ACTOR_HEIGHT+lift,z:cz};
      if(roof&&(horizontalDistance(roofPoint(roof,position,radius),position)>.01||!this.roofSupported(position,radius)))continue;
      if(!Number.isFinite(position.y))continue;
      let occupied=false;
      for(const other of this.actors.values())if(other.id!==actor.id&&other.hp>0) {
        const height=actorCollisionHeight(other,this.time);
        const bottom=other.position.y-ACTOR_HEIGHT;
        if(position.y-ACTOR_HEIGHT+actorQuadHeight(actor)<=bottom||position.y-ACTOR_HEIGHT>=bottom+height)continue;
        if(horizontalDistance(position,other.position)<radius+actorHullRadius(other)+.15){occupied=true;break;}
      }
      if(occupied)continue;
      // Reject candidates outside streamed geometry; an absent collider cannot prove clearance.
      if([[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]].some(([dx,dz])=>!this.chunks.has(`${chunkAt(cx+dx)},${chunkAt(cz+dz)}`)))continue;
      // Default joins preserve their established floor position; clearance queries
      // use a small floor tolerance, while respawns actually start with that lift.
      const queryPosition={...position,y:position.y+height/2-ACTOR_HEIGHT+Math.max(0,.06-lift)};
      const blocked=this.solidIntersection(queryPosition,{x:0,y:0,z:0,w:1},shape,this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC,undefined,p.collider,p.body);
      if(!blocked)return position;
    }
  }
  private setHull(actor:ActorState,p:ActorPhysics,stance:MechStance) {
    p.rubbleRise=false;
    const halfHeight=stance==='upright'?UPRIGHT_HEIGHT/2:actorQuadHeight(actor)/2;
    p.collider.setShape(new this.rapier.RoundCylinder(halfHeight-.12,actorHullRadius(actor)-.12,.12));
    p.collider.setTranslationWrtParent({x:0,y:halfHeight-ACTOR_HEIGHT,z:0});
    p.hullStance=stance;
    p.climbHull=false;
  }
  private climbContact(actor:ActorState,anchor:ClimbAnchor):Vec3 {
    const tangent={x:-anchor.normal.z,z:anchor.normal.x};
    const lateral=(actor.position.x-anchor.position.x)*tangent.x+(actor.position.z-anchor.position.z)*tangent.z;
    return {x:anchor.position.x+tangent.x*lateral,y:clamp(actor.position.y+.4,anchor.position.y+.3,anchor.position.y+anchor.height-.1),z:anchor.position.z+tangent.z*lateral};
  }
  private anchorVisible(actor:ActorState,anchor:ClimbAnchor):boolean {
    const start={...actor.position,y:actor.position.y+.4},contact=this.climbContact(actor,anchor),length=distance(start,contact);
    if(length<.01)return false;
    const dir={x:(contact.x-start.x)/length,y:(contact.y-start.y)/length,z:(contact.z-start.z)/length};
    const hit=this.solidRay(new this.rapier.Ray(start,dir),length+.08,true,this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
    return !!hit&&!!this.anchorSupports.get(hit.collider.handle)?.anchors.includes(anchor.id);
  }
  private climbLandingClear(actor:ActorState,anchor:ClimbAnchor):boolean {
    const radius=actorHullRadius(actor),height=actorClimbHeight(actor),landing={...anchor.landing,y:anchor.landing.y+ACTOR_HEIGHT+.12};
    const occupied=[...this.actors.values()].some(other=>{
      if(other.id===actor.id||other.hp<=0)return false;
      const bottom=other.position.y-ACTOR_HEIGHT,height=actorCollisionHeight(other,this.time);
      return landing.y-ACTOR_HEIGHT+actorClimbHeight(actor)>bottom&&landing.y-ACTOR_HEIGHT<bottom+height&&horizontalDistance(landing,other.position)<radius+actorHullRadius(other)+.15;
    });
    if(occupied||!this.roofSupported(landing,radius))return false;
    const center={...landing,y:landing.y+(height/2-ACTOR_HEIGHT)};
    return !this.solidIntersection(center,{x:0,y:0,z:0,w:1},new this.rapier.Cuboid(radius,height/2,radius),this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
  }
  private buildingColliderLive(collider:RAPIER.Collider):boolean {
    if(!collider.isValid()||!collider.isEnabled()||collider.isSensor())return false;
    const body=collider.parent();return !body||body.isFixed()&&body.isEnabled();
  }
  buildingCollider(id:string):RAPIER.Collider|undefined {
    const material=this.bondedOwner?.colliderForKey(id);if(material)return material;
    const ruin=this.ruinSurfaces.collider(id);if(ruin)return ruin;
    const collider=this.buildingColliders.get(id)?.collider;return collider&&this.buildingColliderLive(collider)?collider:undefined;
  }
  private gripQueryOwners(ids:readonly string[]):void {
    this.gripQueryHandles.clear();for(const id of ids){const collider=this.buildingCollider(id);if(collider)this.gripQueryHandles.add(collider.handle);}
  }
  /** Five actual points on the conservative transformed paw projection. A
   * shared mesh handle alone never admits its opposite side, trim or soffit. */
  private facePatchSupported(face:BuildingFace,patch:GripPatch,roof:boolean,contact:Vec3,scale:number,handles:number[],cachedCenter?:{tangent:number;y:number;valid:boolean;handle:number;offset:number},roofHeight=face.roofCenter.y):boolean {
    if(!patch.authored)return false;
    const ids=roof?face.roofBlockIds:face.supportingBlockIds,normal=roof?{x:0,y:1,z:0}:face.normal;
    this.gripQueryOwners(ids);if(!this.gripQueryHandles.size)return false;
    const depth=.45*scale+.02;let lowest=Infinity,highest=-Infinity;
    for(let index=0;index<patch.queryPoints.length;index++){
      const point=patch.queryPoints[index];
      const q=faceCoordinates(face,point);
      if(!roof&&(Math.abs(q.tangent)>face.width/2+.001||point.y<face.minY-.001||point.y>face.topY+.001))return false;
      const origin={x:point.x+normal.x*depth,y:point.y+normal.y*depth,z:point.z+normal.z*depth};
      if(index===0&&cachedCenter){if(!cachedCenter.valid||Math.abs(cachedCenter.tangent-q.tangent)>=.00001||Math.abs(cachedCenter.y-point.y)>=.00001)return false;const adjustment=cachedCenter.offset-q.normal;if(Math.abs(adjustment)>.2*scale+.003)return false;handles.push(cachedCenter.handle);lowest=Math.min(lowest,adjustment);highest=Math.max(highest,adjustment);continue;}
      const ray=new this.rapier.Ray(origin,{x:-normal.x,y:-normal.y,z:-normal.z});
      const hit=this.solidRayNormal(ray,depth*2,false,this.rapier.QueryFilterFlags.ONLY_FIXED|this.rapier.QueryFilterFlags.EXCLUDE_SENSORS);
      if(!hit||!this.gripQueryHandles.has(hit.collider.handle)||Math.abs(depth-hit.timeOfImpact)>.2*scale+.003||hit.normal.x*normal.x+hit.normal.y*normal.y+hit.normal.z*normal.z<=.95)return false;
      handles.push(hit.collider.handle);
      lowest=Math.min(lowest,depth-hit.timeOfImpact);highest=Math.max(highest,depth-hit.timeOfImpact);
    }if(highest-lowest>.002*scale)return false;
    this.lastPatchAdjustment=highest+.004;
    void roofHeight;void contact;
    return true;
  }
  private faceClimbContact(actor:ActorState,face:BuildingFace):Vec3 {
    const q=faceCoordinates(face,actor.position),point=facePoint(face,q.tangent,clamp(actor.position.y+.4,face.minY+.1,face.topY-.1)),offset=this.climbMotion.get(actor.id)?.wallOffset??0;
    point.x+=face.normal.x*offset;point.z+=face.normal.z*offset;return point;
  }
  private faceGripMasks(actor:ActorState,face:BuildingFace,state:ClimbState,resolveCarrier?:()=>void,preview?:GripEvaluation,sampleTime=this.time):{gripMask:number;roofMask:number} {
    let pose=buildingGripPose(actor,state,sampleTime);let gripMask=0,roofMask=0;
    const adjustments=preview?.adjustments??this.gripAdjustments,receipts=preview?.handles??this.lastGripHandles,previousAdjustment=this.lastPatchAdjustment;
    const scale=actor.bot?actor.role==='anchor'?1.05:actor.role==='mortar'?.8:.65:MECHS[actor.chassis].scale;
    const centers:Array<{tangent:number;y:number;valid:boolean;handle:number;offset:number}|undefined>=[undefined,undefined];
    if(state.phase!=='mantle')for(let i=0;i<2;i++){
      const patch=pose.wall[i];if(!patch.authored&&!resolveCarrier)continue;const q=faceCoordinates(face,patch.queryPoints[0]);
      this.gripQueryOwners(face.supportingBlockIds);const origin=facePoint(face,q.tangent,patch.queryPoints[0].y);origin.x+=face.normal.x*.45;origin.z+=face.normal.z*.45;
      const hit=this.solidRayNormal(new this.rapier.Ray(origin,{x:-face.normal.x,y:0,z:-face.normal.z}),.9,false,this.rapier.QueryFilterFlags.ONLY_FIXED|this.rapier.QueryFilterFlags.EXCLUDE_SENSORS);
      const valid=!!hit&&this.gripQueryHandles.has(hit.collider.handle)&&hit.normal.x*face.normal.x+hit.normal.z*face.normal.z>.95;
      centers[i]={tangent:q.tangent,y:patch.queryPoints[0].y,valid,handle:hit?.collider.handle??-1,offset:.45-(hit?.timeOfImpact??.45)};
      if(valid){const offset=.45-hit!.timeOfImpact;const plane=facePoint(face,faceCoordinates(face,state.contact).tangent,state.contact.y);state.contact.x=plane.x+face.normal.x*offset;state.contact.z=plane.z+face.normal.z*offset;const motion=this.climbMotion.get(actor.id);if(!preview&&motion?.face===face)motion.wallOffset=offset;resolveCarrier?.();pose=buildingGripPose(actor,state,sampleTime);break;}
    }
    for(let i=0;i<4;i++){adjustments.wall[i]=0;adjustments.roof[i]=0;}
    for(let i=0;i<4;i++){
      const handles=receipts[i];handles.length=0;
      if(this.facePatchSupported(face,pose.wall[i],false,state.contact,scale,handles,resolveCarrier?undefined:centers[i])){gripMask|=1<<i;adjustments.wall[i]=this.lastPatchAdjustment;}
      else{handles.length=0;if(this.facePatchSupported(face,pose.roof[i],true,state.contact,scale,handles,undefined,state.top)){roofMask|=1<<i;adjustments.roof[i]=this.lastPatchAdjustment;}else handles.length=0;}
    }
    // The physical patch can be uniformly offset from the torso's reference
    // plane. Re-evaluate its actual corrected rigid target without another ray.
    pose=buildingGripPose(actor,state,sampleTime,adjustments);let eligibleMask=0;
    for(let i=0;i<4;i++){if(pose.wall[i].eligible)eligibleMask|=1<<i;if(!pose.wall[i].eligible)gripMask&=~(1<<i);if(!pose.roof[i].eligible)roofMask&=~(1<<i);if(!((gripMask|roofMask)&(1<<i)))receipts[i].length=0;}
    if(preview){preview.gripMask=gripMask;preview.roofMask=roofMask;preview.eligibleMask=eligibleMask;preview.wallOffset=faceCoordinates(face,state.contact).normal;this.lastPatchAdjustment=previousAdjustment;}
    else{this.lastGripEligibleMask=eligibleMask;const motion=this.climbMotion.get(actor.id);if(motion?.face===face){motion.eligibleMask=eligibleMask;for(let i=0;i<4;i++){motion.pawHandles[i].length=0;for(const handle of receipts[i])motion.pawHandles[i].push(handle);}}}
    return{gripMask,roofMask};
  }
  private commitGripEvaluation(motion:ClimbMotion,evaluation:GripEvaluation):void {
    motion.wallOffset=evaluation.wallOffset;motion.eligibleMask=evaluation.eligibleMask;this.lastGripEligibleMask=evaluation.eligibleMask;
    for(let i=0;i<4;i++){this.gripAdjustments.wall[i]=evaluation.adjustments.wall[i];this.gripAdjustments.roof[i]=evaluation.adjustments.roof[i];this.lastGripHandles[i].length=0;motion.pawHandles[i].length=0;for(const handle of evaluation.handles[i]){this.lastGripHandles[i].push(handle);motion.pawHandles[i].push(handle);}}
  }
  private continuingFaceGrip(actor:ActorState,motion:ClimbMotion):boolean {
    const state=actor.climb!,mask=state.gripMask|state.roofMask,count=buildingGripMaskCount(mask);
    if(count>=2){motion.singleGripSince=undefined;return true;}
    // The original Pounce climb has a brief one-paw bridge. A destroyed hole
    // cannot turn an otherwise multi-paw stance into this authored exception.
    if(count===1&&!actor.bot&&actor.chassis==='pounce'&&state.phase==='climb'&&mask===motion.eligibleMask){
      motion.singleGripSince??=this.time;return this.time-motion.singleGripSince<=.1;
    }return false;
  }
  private faceRoofFloor(face:BuildingFace,landing:Vec3,radius:number):number|null {
    this.lastRoofHandles.length=0;this.gripQueryOwners(face.roofBlockIds);if(!this.gripQueryHandles.size)return null;let highest=-Infinity;
    for(const [x,z] of [[0,0],[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]]){
      const ray=new this.rapier.Ray({x:landing.x+x,y:face.roofCenter.y+.4,z:landing.z+z},{x:0,y:-1,z:0});
      const hit=this.solidRayNormal(ray,.8,false,this.rapier.QueryFilterFlags.ONLY_FIXED|this.rapier.QueryFilterFlags.EXCLUDE_SENSORS);
      if(!hit||!this.gripQueryHandles.has(hit.collider.handle)||hit.normal.y<=.95)return null;
      this.lastRoofHandles.push(hit.collider.handle);
      highest=Math.max(highest,face.roofCenter.y+.4-hit.timeOfImpact);
    }return highest;
  }
  private faceLandingClear(actor:ActorState,face:BuildingFace,landing:Vec3):boolean {
    const radius=actorHullRadius(actor),height=actorClimbHeight(actor),floor=this.faceRoofFloor(face,landing,radius);if(floor===null)return false;
    landing={...landing,y:floor};
    const motion=this.climbMotion.get(actor.id);if(motion?.face===face){motion.landingHandles.length=0;for(const handle of this.lastRoofHandles)motion.landingHandles.push(handle);}
    for(const other of this.actors.values())if(other.id!==actor.id&&other.hp>0&&other.position.y-ACTOR_HEIGHT<landing.y+.12+height&&other.position.y-ACTOR_HEIGHT+actorCollisionHeight(other,this.time)>landing.y+.12&&horizontalDistance(landing,other.position)<radius+actorHullRadius(other)+.15)return false;
    return !this.solidIntersection({x:landing.x,y:landing.y+.12+height/2,z:landing.z},{x:0,y:0,z:0,w:1},new this.rapier.Cuboid(radius,height/2,radius),this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
  }
  private faceVaultStage(actor:ActorState,stage:MantleStage):void {
    const state=actor.climb as ClimbState&{mantleStage:MantleStage|null;mantleStageAt:number};
    state.mantleStage=stage;state.mantleStageAt=this.time;state.gripMask=0;state.roofMask=0;
    const motion=this.climbMotion.get(actor.id)!;for(const handles of motion.pawHandles)handles.length=0;motion.eligibleMask=0;
    motion.stageFrom={...actor.position};motion.checkpoint={...actor.position};motion.stalledAt=this.time;
  }
  private beginFaceVault(actor:ActorState,motion:ClimbMotion,face:BuildingFace,tangent:number):boolean {
    const radius=actorHullRadius(actor),landing=faceLanding(face,tangent,radius);
    if(!landing||actor.energy<20)return false;const floor=this.faceRoofFloor(face,landing,radius);if(floor===null)return false;landing.y=floor;
    if(!this.faceLandingClear(actor,face,landing))return false;
    let overhang=0;
    if(face.kind==='workshop'){
      const fit=workshopGeometry(this.seed),bounds=workshopCollisionReceipt(this.seed).bounds,
        scale=face.width/(2*(face.side==='east'||face.side==='west'?fit.wallHalfZ:fit.wallHalfX));
      const extent=face.side==='east'?bounds.max[0]:face.side==='west'?-bounds.min[0]:face.side==='north'?bounds.max[2]:-bounds.min[2];
      overhang=Math.max(0,(extent-(face.side==='east'||face.side==='west'?fit.wallHalfX:fit.wallHalfZ))*scale);
    }else{
      const q=faceCoordinates(face,face.roofCenter),extent=face.side==='east'||face.side==='west'?face.roofHalfExtents.x:face.roofHalfExtents.z;overhang=Math.max(0,q.normal+extent);
    }
    const point=facePoint(face,tangent,actor.position.y),out=radius+.12+overhang;
    motion.landing={...landing,y:landing.y+ACTOR_HEIGHT+.12};motion.mantleFrom={...actor.position};
    motion.vaultOut={x:point.x+face.normal.x*out,y:actor.position.y,z:point.z+face.normal.z*out};
    motion.vaultLift={...motion.vaultOut,y:landing.y+ACTOR_HEIGHT+.12};
    this.climbPhase(actor,'mantle');actor.climb!.top=floor;this.faceVaultStage(actor,'out');return true;
  }
  private advanceFaceVault(actor:ActorState,p:ActorPhysics,input:InputState,dt:number,motion:ClimbMotion,face:BuildingFace):void {
    const state=actor.climb as ClimbState&{mantleStage:MantleStage|null;mantleStageAt:number},landing=motion.landing!;
    if(!this.faceLandingClear(actor,face,{...landing,y:face.roofCenter.y})){this.detachClimb(actor,p);return;}
    let target=state.mantleStage==='out'?motion.vaultOut!:state.mantleStage==='lift'?motion.vaultLift!:landing;
    const reached=distance(actor.position,target)<(state.mantleStage==='lift'?.012:.055)&&
      (state.mantleStage!=='lift'||actor.position.y-ACTOR_HEIGHT>=state.top+.1);
    if(reached&&(state.mantleStage!=='out'||this.time-state.mantleStageAt>=.16)){
      if(state.mantleStage==='out'){this.faceVaultStage(actor,'lift');target=motion.vaultLift!;state.progress=Math.max(state.progress,.15);}
      else if(state.mantleStage==='lift'){this.faceVaultStage(actor,'transfer');target=landing;state.progress=Math.max(state.progress,.4);}
      else if(state.mantleStage==='transfer'){this.faceVaultStage(actor,'settle');state.progress=Math.max(state.progress,.9);}
      else if(this.time-state.mantleStageAt>.2){this.detachClimb(actor,p);actor.velocity={x:0,y:0,z:0};return;}
    }
    const before={...actor.position},delta={x:target.x-before.x,y:target.y-before.y,z:target.z-before.z},speed=state.mantleStage==='lift'?4.5:3.8;
    const vx=vaultAxisVelocity(actor.velocity.x,delta.x,speed,dt),vy=vaultAxisVelocity(actor.velocity.y,delta.y,speed,dt),vz=vaultAxisVelocity(actor.velocity.z,delta.z,speed,dt);
    const requested={x:vaultAxisStep(vx,delta.x,dt),y:vaultAxisStep(vy,delta.y,dt),z:vaultAxisStep(vz,delta.z,dt)};
    const rubbleMovement=this.moveCharacter(p,requested),move=p.controller.computedMovement();
    actor.position={x:before.x+move.x,y:before.y+move.y,z:before.z+move.z};actor.velocity={x:move.x/dt,y:move.y/dt,z:move.z/dt};actor.yaw=Math.atan2(face.normal.x,face.normal.z);actor.grounded=false;p.body.setNextKinematicTranslation(actor.position);
    this.commitCharacterRubble(p,rubbleMovement);
    actor.heat=Math.max(0,actor.heat-dt*28);
    const from=motion.stageFrom!,dx=target.x-from.x,dy=target.y-from.y,dz=target.z-from.z,total=Math.max(.000001,dx*dx+dy*dy+dz*dz),traveled=clamp(((actor.position.x-from.x)*dx+(actor.position.y-from.y)*dy+(actor.position.z-from.z)*dz)/total,0,1),start=state.mantleStage==='out'?0:state.mantleStage==='lift'?.15:state.mantleStage==='transfer'?.4:.9,end=state.mantleStage==='out'?.15:state.mantleStage==='lift'?.4:state.mantleStage==='transfer'?.9:1;
    state.progress=Math.max(state.progress,start+(end-start)*traveled);state.contact=this.faceClimbContact(actor,face);
    if(state.mantleStage==='out'||state.mantleStage==='lift'){state.gripMask=0;state.roofMask=0;}else Object.assign(state,this.faceGripMasks(actor,face,state));
    // Only this same-clock, post-KCC full-footprint proof can replace powered
    // thrust with a supported roof hold. Prior masks never discount a flight.
    const roofHeld=(state.mantleStage==='transfer'||state.mantleStage==='settle')&&buildingGripMaskCount(state.roofMask)>=2;
    actor.energy=Math.max(0,actor.energy-dt*(roofHeld?3:10));
    if(distance(actor.position,motion.checkpoint)>.04){motion.checkpoint={...actor.position};motion.stalledAt=this.time;}else if(distance(actor.position,target)>.06&&this.time-motion.stalledAt>.7)this.detachClimb(actor,p);
    if(actor.energy<=0)this.detachClimb(actor,p);
    void input;
  }
  private refreshRuinClimbs(){
    this.navigation.setRainlineStreetRuins(streetRuinNavigationBlocks(cityDistrict(this.seed),this.ruinsOwner.snapshot()));
    const retired=this.ruinSurfaces.sync();
    for(const [id,motion] of this.climbMotion)if(motion.face?.id.startsWith('ruin-face:')&&(retired.has(motion.face.id)||!this.ruinSurfaces.live(motion.face))){
      const actor=this.actors.get(id),p=this.physics.get(id);if(actor&&p)this.detachClimb(actor,p);
    }
  }
  private onRuinWake(handles:ReadonlySet<number>){
    for(const handle of handles)this.wokeRuinHandles.add(handle);
    this.invalidateBuildingSupports(handles);this.refreshRuinClimbs();
    for(const [id,p] of this.physics){
      let movingSupport=false,stableSupport=false;
      for(let i=0;i<p.controller.numComputedCollisions();i++){
        const hit=p.controller.computedCollision(i);if(!hit?.collider||hit.normal1.y<=.5)continue;
        if(this.wokeRuinHandles.has(hit.collider.handle))movingSupport=true;else stableSupport=true;
      }
      if(movingSupport&&!stableSupport){const actor=this.actors.get(id);if(actor){actor.grounded=false;actor.groundedOnRubble=false;}p.rubbleRise=false;}
    }
  }
  private attachClimb(actor:ActorState,p:ActorPhysics,input:InputState) {
    if(actor.stance!=='quadruped'||this.time-actor.stanceChangedAt<STANCE_TRANSITION||actor.boostUntil>this.time||actor.energy<8||actor.disruptedUntil>this.time||this.time<(this.climbRetryAt.get(actor.id)??0))return;
    const radius=actorHullRadius(actor),height=actorClimbHeight(actor),facing=direction(input.yaw);
    const hint=actor.bot?climbAnchors(this.seed).filter(a=>horizontalDistance(a.position,actor.position)<radius+2).find(a=>facing.x*-a.normal.x+facing.z*-a.normal.z>.7):undefined;
    const originalFaces=nearbyBuildingFaces(this.seed,actor.position,radius+1.3,16).map(face=>this.bondedOwner?.count?{...face,supportingBlockIds:face.supportingBlockIds.flatMap(id=>id===BONDED_SOURCE_ID?this.bondedOwner!.fixedKeys():[id])}:face);
    const candidates=[...originalFaces,...this.ruinSurfaces.nearby(actor.position,radius+1.3,16)].sort((a,b)=>faceDistance(a,actor.position)-faceDistance(b,actor.position)||a.id.localeCompare(b.id)).slice(0,16);
    for(const face of candidates){
      if(actor.bot&&hint&&(face.buildingId!==hint.propId||face.normal.x*hint.normal.x+face.normal.z*hint.normal.z<.999))continue;
      // The measured relief search spans +/- .45m around this nominal plane.
      // Actual hit, fixed-length reach and the complete KCC sweep decide admission.
      const q=faceCoordinates(face,actor.position);if(q.normal<radius-.475||q.normal>radius+.75||Math.abs(q.tangent)>faceTangentLimit(face,radius)||actor.position.y-ACTOR_HEIGHT<face.minY-.65||facing.x*-face.normal.x+facing.z*-face.normal.z<.7)continue;
      if(face.id.startsWith('ruin-face:')){const landing=faceLanding(face,q.tangent,radius);if(!landing||!this.faceLandingClear(actor,face,landing))continue;}
      const prospective={...actor,position:{...actor.position}};
      const contact=this.faceClimbContact(prospective,face),state={anchor:hint?.id??face.id,phase:'cling',startedAt:this.time-.16,progress:clamp((actor.position.y-ACTOR_HEIGHT-face.minY)/face.height,0,1),normal:{...face.normal},contact,top:face.roofCenter.y,base:face.minY,height:face.height,gripMask:0,roofMask:0,mantleStage:null,mantleStageAt:0} as ClimbState;
      const masks=this.faceGripMasks(prospective,face,state,()=>{
        const offset=faceCoordinates(face,state.contact).normal,shift=radius+.09+offset-q.normal;
        const oldShape=p.collider.shape,oldOffset=p.collider.translationWrtParent()!;
        try{
          p.collider.setShape(new this.rapier.RoundCylinder(height/2-.12,radius-.12,.12));p.collider.setTranslationWrtParent({x:0,y:height/2-ACTOR_HEIGHT,z:0});
          this.moveCharacter(p,{x:face.normal.x*shift,y:0,z:face.normal.z*shift});
          const move=p.controller.computedMovement();prospective.position={x:actor.position.x+move.x,y:actor.position.y+move.y,z:actor.position.z+move.z};
        }finally{p.collider.setShape(oldShape);p.collider.setTranslationWrtParent(oldOffset);}
      });if(buildingGripMaskCount(masks.gripMask)<2||!(masks.gripMask&3))continue;
      // Sweep the actual attachment displacement before committing state.
      const center={x:prospective.position.x,y:prospective.position.y+height/2-ACTOR_HEIGHT+.04,z:prospective.position.z};
      if(this.solidIntersection(center,{x:0,y:0,z:0,w:1},new this.rapier.RoundCylinder(height/2-.12,radius-.12,.12),this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC))continue;
      state.phase='grab';state.startedAt=this.time;state.progress=0;Object.assign(state,{gripMask:0,roofMask:0});actor.climb=state;
      const anchor:ClimbAnchor={id:face.id,propId:face.buildingId,position:face.origin,normal:face.normal,width:face.width,height:face.height,landing:faceLanding(face,q.tangent,radius)??facePoint(face,q.tangent,face.roofCenter.y),approach:actor.position};
      this.climbMotion.set(actor.id,{anchor,face,wallOffset:faceCoordinates(face,state.contact).normal,pawHandles:Array.from({length:4},()=>[]),grabHandles:this.lastGripHandles.flat(),landingHandles:[],grabFrom:{...actor.position},stalledAt:this.time,checkpoint:{...actor.position}});
      actor.energy-=8;actor.boostUntil=0;actor.velocity={x:0,y:0,z:0};actor.grounded=false;
      p.collider.setShape(new this.rapier.RoundCylinder(height/2-.12,radius-.12,.12));p.collider.setTranslationWrtParent({x:0,y:height/2-ACTOR_HEIGHT,z:0});p.climbHull=true;p.rubbleRise=false;p.controller.disableSnapToGround();p.controller.disableAutostep();this.emit('climb',actor.position,actor.id);return;
    }
  }
  private advanceClimb(actor:ActorState,p:ActorPhysics,input:InputState,dt:number) {
    const motion=this.climbMotion.get(actor.id);if(!motion?.face){this.detachClimb(actor,p);return;}
    if(motion.face.id.startsWith('ruin-face:')&&!this.ruinSurfaces.live(motion.face)){this.detachClimb(actor,p);return;}
    const face=motion.face,state=actor.climb!,radius=actorHullRadius(actor);
    if(!input.climb||input.jump||actor.hp<=0||actor.energy<=0||actor.disruptedUntil>this.time){this.detachClimb(actor,p);return;}
    if(state.phase==='mantle'){this.advanceFaceVault(actor,p,input,dt,motion,face);return;}
    // Face tangents point toward the climber's left. Keep A/D consistent with
    // ground movement while following a wall or its connected convex corner.
    input={...input,strafe:-input.strafe};
    if(state.corner&&motion.cornerPlan){this.advanceCornerClimb(actor,p,input,dt,motion);return;}
    if(state.phase!=='grab'&&Math.abs(input.strafe)>.05){
      const side=input.strafe>0?1:-1,q=faceCoordinates(face,actor.position),limit=faceTangentLimit(face,radius);
      if(Math.abs(q.tangent-side*limit)<.002){
        const plan=overhaulCornerCandidates(face,buildingFaces(this.seed),side,radius+.09)[0];
        if(plan){const sample=overhaulCornerSample(plan,0,actor.position.y);
          if(distance(sample.position,actor.position)<.002){state.corner={from:face.id,to:plan.to.id,side,distance:0,radius:radius+.09,height:actor.position.y,startedAt:this.time};motion.cornerPlan=plan;this.advanceCornerClimb(actor,p,input,dt,motion);return;}
        }
      }
    }
    const committed={...state,normal:{...state.normal},contact:{...state.contact}};
    state.contact=this.faceClimbContact(actor,face);const masks='gripMask' in state?{gripMask:Number(state.gripMask),roofMask:Number((state as ClimbState&{roofMask:number}).roofMask)}:{gripMask:0,roofMask:0};
    if(state.phase!=='grab'&&buildingGripMaskCount(masks.gripMask|masks.roofMask)===0){this.detachClimb(actor,p);return;}
    const q=faceCoordinates(face,actor.position),lateral=clamp(q.tangent+input.strafe*1.4*dt,-faceTangentLimit(face,radius),faceTangentLimit(face,radius));
    const plane=facePoint(face,lateral,actor.position.y),goal={x:plane.x+face.normal.x*(radius+.09+(motion.wallOffset??0)),y:actor.position.y,z:plane.z+face.normal.z*(radius+.09+(motion.wallOffset??0))};
    if(state.phase==='grab'){
      const t=clamp((this.time-state.startedAt)/.3,0,1);goal.x=motion.grabFrom.x+(goal.x-motion.grabFrom.x)*t;goal.z=motion.grabFrom.z+(goal.z-motion.grabFrom.z)*t;state.progress=t;
      if(t===1){this.climbPhase(actor,'cling');state.progress=clamp((actor.position.y-ACTOR_HEIGHT-face.minY)/face.height,0,1);}
    }else{
      goal.y=Math.max(face.minY+ACTOR_HEIGHT+.02,actor.position.y+input.forward*CLIMB_SPEED[actor.chassis]*this.fieldSpeed(actor)*dt);
      state.progress=clamp((actor.position.y-ACTOR_HEIGHT-face.minY)/face.height,0,1);
      if(input.forward<0&&actor.position.y<=face.minY+ACTOR_HEIGHT+.03){this.detachClimb(actor,p);return;}
      if(input.forward<=0)motion.blockedAscent=false;
      if(input.forward>0&&(motion.blockedAscent||actor.position.y-ACTOR_HEIGHT+actorClimbHeight(actor)>=face.topY-.2)){
        Object.assign(state,this.faceGripMasks(actor,face,state));
        if(!this.continuingFaceGrip(actor,motion)){this.detachClimb(actor,p);return;}
        if(this.beginFaceVault(actor,motion,face,lateral)){this.advanceFaceVault(actor,p,input,dt,motion,face);return;}
        goal.y=actor.position.y;if(state.phase!=='cling'){state.phase='cling';state.startedAt=this.time;state.progress=0;}
      }else {
        // Releasing ascent freezes its height-driven authored cycle. Switching
        // to Cling can withdraw a sound claw during the entry blend; keep this
        // exact phase/clock and prove its current physical footprints below.
        // Initial Grab and explicit obstructed-ascent Cling remain distinct.
        const settledClimb=state.phase==='climb'&&this.time-state.startedAt>=.16;
        const phase=Math.abs(input.forward)>.05||settledClimb?'climb':'cling';
        if(state.phase!==phase){state.phase=phase;state.startedAt=this.time;state.progress=0;}
      }
    }
    const before={...actor.position},rubbleMovement=this.moveCharacter(p,{x:goal.x-before.x,y:goal.y-before.y,z:goal.z-before.z});
    const move=p.controller.computedMovement(),nextPosition={x:before.x+move.x,y:before.y+move.y,z:before.z+move.z};let predicted=false;
    if(committed.phase!=='grab'&&goal.y-before.y>.005){
      const prospective={...actor,position:nextPosition},candidate={...state,normal:{...state.normal},contact:this.faceClimbContact(prospective,face),progress:clamp((nextPosition.y-ACTOR_HEIGHT-face.minY)/face.height,0,1)};
      let rejected=false;
      // Forecast the next authority-clock blend while the current contact is
      // still sound. A supported settled endpoint cannot certify its intervening
      // poses. This extra query lasts only through the .16s activation blend.
      if(candidate.phase==='climb'&&this.time-candidate.startedAt<.16){
        Object.assign(candidate,this.faceGripMasks(prospective,face,candidate,undefined,this.candidateGrip,this.time+dt));
        rejected=!this.continuingFaceGrip({...prospective,climb:candidate},{...motion,eligibleMask:this.candidateGrip.eligibleMask});
        candidate.contact=this.faceClimbContact(prospective,face);
      }
      if(!rejected){Object.assign(candidate,this.faceGripMasks(prospective,face,candidate,undefined,this.candidateGrip));rejected=!this.continuingFaceGrip({...prospective,climb:candidate},{...motion,eligibleMask:this.candidateGrip.eligibleMask});}
      if(rejected){
        // Prospective receipts never replace the currently committed contact.
        // Keep its exact phase/clock, then prove that actual held pose now.
        Object.assign(state,committed);state.contact=this.faceClimbContact(actor,face);
        Object.assign(state,this.faceGripMasks(actor,face,state));
        if(!this.continuingFaceGrip(actor,motion)){this.detachClimb(actor,p);return;}
        actor.velocity={x:0,y:0,z:0};p.body.setNextKinematicTranslation(actor.position);
        if(this.beginFaceVault(actor,motion,face,q.tangent))return;
        actor.energy=Math.max(0,actor.energy-dt*(state.phase==='cling'?3:7));actor.heat=Math.max(0,actor.heat-28*dt);
        motion.checkpoint={...actor.position};motion.stalledAt=this.time;
        if(actor.energy<=0)this.detachClimb(actor,p);return;
      }
      Object.assign(state,candidate);this.commitGripEvaluation(motion,this.candidateGrip);predicted=true;
    }
    actor.energy=Math.max(0,actor.energy-dt*(state.phase==='cling'?3:7));actor.heat=Math.max(0,actor.heat-28*dt);
    actor.position=nextPosition;actor.velocity={x:move.x/dt,y:move.y/dt,z:move.z/dt};actor.yaw=Math.atan2(face.normal.x,face.normal.z);actor.grounded=false;p.body.setNextKinematicTranslation(actor.position);
    this.commitCharacterRubble(p,rubbleMovement);
    if(state.phase!==committed.phase&&committed.phase!=='grab')this.emit('climb',actor.position,actor.id);
    // Intermediate real canopies trigger the same clearance-first powered arc.
    if(input.forward>0&&goal.y-before.y>.005&&move.y<(goal.y-before.y)*.25){
      if(this.beginFaceVault(actor,motion,face,lateral))return;
      // A real canopy may block a sound lower grip while its roof is unavailable.
      // Hold one stable cling clock; descending explicitly clears this obstruction.
      motion.blockedAscent=true;this.climbPhase(actor,'cling');goal.y=actor.position.y;predicted=false;
    }
    if(state.phase==='cling'||state.phase==='climb')state.progress=clamp((actor.position.y-ACTOR_HEIGHT-face.minY)/face.height,0,1);
    if(!predicted){state.contact=this.faceClimbContact(actor,face);Object.assign(state,this.faceGripMasks(actor,face,state));}
    if(state.phase!=='grab'&&!this.continuingFaceGrip(actor,motion)){this.detachClimb(actor,p);return;}
    if(this.supportGraph&&state.phase==='climb'&&Math.abs(input.forward)+Math.abs(input.strafe)>.05&&this.time>=(this.clawWearClock.get(actor.id)??0)){
      this.clawWearClock.set(actor.id,this.time+.25);
      const cells=new Map<string,CityBlock>();
      for(let paw=0;paw<4;paw++)if(state.gripMask&(1<<paw))for(const handle of motion.pawHandles[paw]){const cell=this.colliderCell.get(handle);if(cell)cells.set(cell.id,cell);}
      const amount=3/Math.max(1,cells.size);
      for(const cell of cells.values()){const point=this.cellBodies.get(cell.id)?.collider.projectPoint(state.contact,false)?.point??state.contact;this.damageCell(cell,amount,actor.id,point,{x:-face.normal.x,y:-.3,z:-face.normal.z},face.normal);}
      if(!actor.climb)return;
    }
    // A sound held grip may retain a small normal standoff error because real
    // trim blocks its rounded body. Only requested wall-relative travel can
    // stall; the current live claw proof, not carrier alignment, decides hold.
    const requestedTravel=Math.hypot(goal.y-before.y,faceCoordinates(face,goal).tangent-faceCoordinates(face,before).tangent);
    if(requestedTravel>.01){if(distance(actor.position,motion.checkpoint)>.06){motion.checkpoint={...actor.position};motion.stalledAt=this.time;}else if(this.time-motion.stalledAt>.7)this.detachClimb(actor,p);}
    else{motion.checkpoint={...actor.position};motion.stalledAt=this.time;}
    if(actor.energy<=0||Math.abs(actor.position.x)+radius>WORLD_LIMIT||Math.abs(actor.position.z)+radius>WORLD_LIMIT)this.detachClimb(actor,p);
  }
  /** Native corner receipts are preview-only until the whole full-hull arc
   * increment passes. Each paw has one exact actual face, never union ownership. */
  private cornerGrip(actor:ActorState,state:ClimbState,plan:OverhaulCornerPlan):(OverhaulCornerReceipt&{choices:OverhaulCornerChoices})|null {
    const scale=actor.bot?actor.role==='anchor'?1.05:actor.role==='mortar'?.8:.65:MECHS[actor.chassis].scale,savedAdjustment=this.lastPatchAdjustment,choices:[0|1,0|1,0|1,0|1]=[0,0,0,0],handles:number[][]=[[],[],[],[]],adjustments={wall:[0,0,0,0],roof:[0,0,0,0]},costs=[Infinity,Infinity,Infinity,Infinity];let mask=0;
    // Limbs are independent bone branches: evaluate both real plane targets,
    // then replay only the individually proven assignments with corrections.
    for(const choice of [0,1] as const){const face=choice?plan.to:plan.from,context={faces:[plan.from,plan.to] as const,choices:[choice,choice,choice,choice] as OverhaulCornerChoices},pose=buildingGripPose(actor,state,this.time,undefined,false,context);
      for(let i=0;i<4;i++){const receipt:number[]=[];if(pose.wall[i].eligible&&pose.wall[i].targetReach<costs[i]&&this.facePatchSupported(face,pose.wall[i],false,state.contact,scale,receipt)){mask|=1<<i;choices[i]=choice;costs[i]=pose.wall[i].targetReach;handles[i]=receipt;adjustments.wall[i]=this.lastPatchAdjustment;}}
    }
    const final=buildingGripPose(actor,state,this.time,adjustments,false,{faces:[plan.from,plan.to],choices});
    for(let i=0;i<4;i++)if(!final.wall[i].eligible){mask&=~(1<<i);handles[i].length=0;}
    this.lastPatchAdjustment=savedAdjustment;return buildingGripMaskCount(mask)>=2?{position:{...actor.position},gripMask:mask,pawHandles:handles,choices}:null;
  }
  private advanceCornerClimb(actor:ActorState,p:ActorPhysics,input:InputState,dt:number,motion:ClimbMotion):void {
    const state=actor.climb!,corner=state.corner!,plan=motion.cornerPlan!,before={...actor.position},current=overhaulCornerSample(plan,corner.distance,corner.height);
    if(distance(current.position,before)>.002){this.detachClimb(actor,p);return;}
    const held=this.cornerGrip(actor,state,plan);if(!held){this.detachClimb(actor,p);return;}
    const next=overhaulCornerAdvance(plan,corner,input.strafe,dt),offset=p.collider.translationWrtParent()!,shape=p.collider.shape,rotation=p.collider.rotation();
    const receipt=proveOverhaulCornerStep(plan,corner,next,{
      sweep:(from,to)=>{const delta={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z},center={x:from.x+offset.x,y:from.y+offset.y,z:from.z+offset.z};
        const hit=this.solidCast(center,rotation,delta,shape,0,1,true,this.rapier.QueryFilterFlags.EXCLUDE_SENSORS,undefined,p.collider,p.body,c=>c.isEnabled()&&!this.disabledMovementColliders.has(c.handle));
        return hit&&hit.time_of_impact<1?{x:from.x+delta.x*hit.time_of_impact,y:from.y+delta.y*hit.time_of_impact,z:from.z+delta.z*hit.time_of_impact}:to;
      },
      grip:sample=>{
        return this.cornerGrip({...actor,position:sample.position},{...state,normal:sample.normal,contact:sample.contact,corner:{...corner,distance:sample.distance}},plan);
      },
    }) as (OverhaulCornerReceipt&{choices:OverhaulCornerChoices})|null;
    const accepted=receipt??held,acceptedDistance=receipt?next:corner.distance,sample=overhaulCornerSample(plan,acceptedDistance,corner.height);
    actor.position={...accepted.position};actor.velocity={x:(actor.position.x-before.x)/dt,y:0,z:(actor.position.z-before.z)/dt};actor.yaw=Math.atan2(sample.normal.x,sample.normal.z);actor.grounded=false;
    state.normal=sample.normal;state.contact=sample.contact;state.gripMask=accepted.gripMask;state.roofMask=0;corner.distance=acceptedDistance;corner.pawFaces=accepted.choices;
    motion.pawHandles=accepted.pawHandles.map(h=>[...h]);motion.eligibleMask=accepted.gripMask;p.body.setNextKinematicTranslation(actor.position);
    actor.energy=Math.max(0,actor.energy-dt*(Math.abs(input.strafe)>.05?7:3));actor.heat=Math.max(0,actor.heat-28*dt);
    if(this.supportGraph&&Math.abs(input.strafe)>.05&&this.time>=(this.clawWearClock.get(actor.id)??0)){
      this.clawWearClock.set(actor.id,this.time+.25);const cells=new Map<string,{cell:CityBlock;face:BuildingFace}>();
      for(let paw=0;paw<4;paw++)for(const handle of motion.pawHandles[paw]){const cell=this.colliderCell.get(handle);if(cell)cells.set(cell.id,{cell,face:accepted.choices[paw]?plan.to:plan.from});}
      for(const {cell,face} of cells.values()){const point=this.cellBodies.get(cell.id)?.collider.projectPoint(actor.position,false)?.point??actor.position;this.damageCell(cell,3/Math.max(1,cells.size),actor.id,point,{x:-face.normal.x,y:-.3,z:-face.normal.z},face.normal);}if(!actor.climb)return;
    }
    if(acceptedDistance===plan.length||acceptedDistance===0&&input.strafe*plan.side<0){const face=acceptedDistance===plan.length?plan.to:plan.from;motion.face=face;motion.wallOffset=0;delete motion.cornerPlan;delete state.corner;state.anchor=face.id;state.normal={...face.normal};state.base=face.minY;state.height=face.height;state.top=face.roofCenter.y;state.contact=this.faceClimbContact(actor,face);
      // Corner holds/reversals own their swept path and grip proofs. Start the
      // ordinary requested-travel stall clock at its actual handoff endpoint.
      motion.checkpoint={...actor.position};motion.stalledAt=this.time;
    }
    if(actor.energy<=0)this.detachClimb(actor,p);
  }
  private detachClimb(actor:ActorState,p:ActorPhysics) {
    if(!actor.climb)return;
    actor.climb=null;actor.climbDetachedAt=this.time;p.rubbleRise=false;this.climbMotion.delete(actor.id);this.climbRetryAt.set(actor.id,this.time+.4);
    p.controller.enableAutostep(.55,.2,this.excludedDynamicColliders===null);p.controller.enableSnapToGround(.35);actor.grounded=false;
    this.emit('climb',actor.position,actor.id);
  }
  private climbPhase(actor:ActorState,phase:ClimbState['phase']) {
    const state=actor.climb!;if(state.phase===phase)return;
    state.phase=phase;state.startedAt=this.time;state.progress=0;this.emit('climb',actor.position,actor.id);
  }
  private advanceStanceRequest(actor:ActorState,p:ActorPhysics,input:InputState) {
    const request=input.stanceRequest!;
    if(request.seq===0||request.life!==actor.jumpEpoch||actor.bot)return;
    const old=actor.stanceFeedback;
    if(old?.life===request.life&&(request.seq<old.requestSeq||request.seq===old.requestSeq&&old.status!=='deferred'))return;
    const result=(status:StanceFeedback['status'],reason:StanceFeedback['reason'],blocker?:StanceFeedback['blocker'])=>{
      actor.stanceFeedback={requestSeq:request.seq,inputSeq:input.seq,life:request.life,target:input.stance,status,reason,time:this.time,...(blocker?{blocker}:{})};
    };
    if(actor.hp<=0){result('blocked','destroyed');return;}
    if(actor.pair){result('deferred','paired');return;}
    if(actor.climb){result('deferred','climbing');return;}
    if(!actor.grounded){result('deferred','ground');return;}
    if(this.time-actor.stanceChangedAt<STANCE_TRANSITION||this.time-actor.climbDetachedAt<CLIMB_RETRACTION){result('deferred','cooldown');return;}
    if(actor.stance===input.stance){result('accepted','accepted');return;}
    const blocked=this.changeStance(actor,p,input.stance);
    if(blocked){const cell=this.colliderCell.get(blocked.handle);result('blocked','headroom',{handle:blocked.handle,owner:cell?.id??null});}
    else result('accepted','accepted');
  }
  private changeStance(actor:ActorState,p:ActorPhysics,stance:MechStance):RAPIER.Collider|null {
    if(stance==='upright') {
      // Only test newly occupied headroom. Existing floor contact cannot reject expansion.
      const addedHeight=UPRIGHT_HEIGHT-actorQuadHeight(actor)+.01;
      // A conservative box also rejects headroom fully contained inside a thick slab;
      // the actual movement/hit hull remains an accurately rounded cylinder.
      const shape=new this.rapier.Cuboid(actorHullRadius(actor),addedHeight/2,actorHullRadius(actor));
      const center={...actor.position,y:actor.position.y-ACTOR_HEIGHT+actorQuadHeight(actor)-.01+addedHeight/2};
      const blocked=this.solidIntersection(center,{x:0,y:0,z:0,w:1},shape,this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC,undefined,p.collider,p.body);
      if(blocked)return blocked;
    }
    actor.stance=stance;actor.stanceChangedAt=this.time;actor.boostUntil=0;
    // Retraction keeps the taller collision and hit volume until the animation finishes.
    if(stance==='upright')this.setHull(actor,p,stance);
    this.emit('transform',actor.position,actor.id);
    return null;
  }
  private friendly(owner:string,target:ActorState):boolean {
    const source=this.actors.get(owner);
    return !!source&&source.hp>0&&target.hp>0&&(owner===target.id||((this.mode==='training'||this.mode==='coop')&&!source.bot&&!target.bot));
  }
  private fieldContains(field:AreaFieldState,actor:ActorState):boolean {
    return distance(field.position,actor.position)<=field.radius&&this.lineOfSight(field.position,actor.position);
  }
  private fieldLive(field:AreaFieldState):boolean {return this.time>=field.born&&this.time<field.expires&&(this.actors.get(field.owner)?.hp??0)>0;}
  private fieldSpeed(actor:ActorState):number {
    return this.fields.some(f=>f.kind==='snare'&&this.fieldLive(f)&&this.canDamage(f.owner,actor)&&this.fieldContains(f,actor))?.55:1;
  }
  private uprightAbility(actor:ActorState) {
    const def=UPRIGHT[actor.chassis];
    if(def.effect==='rake') {
      this.emit('area',actor.position,actor.id,undefined,undefined,45,{radius:def.radius,direction:actor.aimYaw,effect:'rake'});
      const f=direction(actor.aimYaw);
      for(const target of this.actors.values())if(this.canDamage(actor.id,target)) {
        const d=horizontalDistance(actor.position,target.position);if(d>def.radius||Math.abs(target.position.y-actor.position.y)>3)continue;
        const dot=((target.position.x-actor.position.x)*f.x+(target.position.z-actor.position.z)*f.z)/Math.max(d,.001);
        if(dot>=Math.cos(Math.PI/3)&&this.lineOfSight(actor.position,target.position))this.damage(target,45,actor.id,target.position);
      }
      return;
    }
    let position={...actor.position};
    if(def.effect==='snare') {
      const f=direction(actor.aimYaw),start={...actor.position,y:actor.position.y+.65};
      const hit=this.solidRay(new this.rapier.Ray(start,f),7,true,this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
      const range=hit?Math.max(0,hit.timeOfImpact-.4):7;
      position={x:clamp(actor.position.x+f.x*range,-WORLD_LIMIT,WORLD_LIMIT),y:0,z:clamp(actor.position.z+f.z*range,-WORLD_LIMIT,WORLD_LIMIT)};
      const support=this.solidRay(new this.rapier.Ray({...position,y:actor.position.y+.65},{x:0,y:-1,z:0}),64,true,this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
      position.y=(support?actor.position.y+.65-support.timeOfImpact:terrainHeight(position.x,position.z,this.seed))+ACTOR_HEIGHT;
    }
    this.fields=this.fields.filter(f=>this.fieldLive(f));
    if(this.fields.length>=12)this.fields.shift();
    this.fields.push({id:++this.serial,kind:def.effect,owner:actor.id,position,radius:def.radius,born:this.time,expires:this.time+def.duration});
    this.emit('area',position,actor.id,undefined,undefined,undefined,{radius:def.radius,direction:actor.aimYaw,effect:def.effect});
  }
  private advanceFields(dt:number) {
    for(const field of [...this.fields]) {
      if((this.actors.get(field.owner)?.hp??0)<=0)continue;
      const active=Math.max(0,Math.min(this.time,field.expires)-Math.max(this.time-dt,field.born));
      if(!active||field.kind==='shield')continue;
      for(const actor of this.actors.values()) {
        if(actor.hp<=0||!this.fieldContains(field,actor))continue;
        if(field.kind==='repair'&&this.friendly(field.owner,actor))actor.hp=Math.min(actor.maxHp,actor.hp+10*active);
        if(field.kind==='snare'&&this.canDamage(field.owner,actor))this.damage(actor,8*active,field.owner,actor.position);
      }
    }
    this.fields=this.fields.filter(f=>this.fieldLive(f));
  }
  private botInput(actor:ActorState):InputState {
    const input=emptyInput(),brain=this.brains.get(actor.id)!;
    const disrupted=actor.disruptedUntil>this.time;
    if(disrupted){actor.windupUntil=0;brain.windupAim=undefined;}
    input.yaw=actor.yaw;
    const encounter=this.encounterOwner?.decision(actor.id);
    if(encounter){
      brain.target=encounter.target??undefined;const target=encounter.target?this.actors.get(encounter.target):undefined;
      brain.lastSeen=target?{...target.position}:undefined;brain.seenAt=target?this.time:-100;
      if(!target){actor.windupUntil=0;brain.windupAim=undefined;actor.aiState='patrol';if(horizontalDistance(actor.position,encounter.home)>.3)this.navigate(actor,encounter.home,input,brain);return input;}
      if(this.time<encounter.telegraphUntil){actor.aiState='windup';actor.windupUntil=encounter.telegraphUntil;input.yaw=Math.atan2(-(target.position.x-actor.position.x),-(target.position.z-actor.position.z));return input;}
    }
    if(!encounter&&this.time>=brain.nextSense) {
      brain.nextSense=this.time+.15;
      const players=[...this.actors.values()].filter(a=>!a.bot&&a.hp>0);
      const visible=players.filter(p=>{
        const d=horizontalDistance(p.position,actor.position);if(d>60)return false;
        if(actor.role==='anchor'&&horizontalDistance(p.position,this.guardPoint(brain))>38)return false;
        const angle=Math.atan2(-(p.position.x-actor.position.x),-(p.position.z-actor.position.z));
        const facing=Math.cos(angle-actor.yaw)>-.25;
        return (d<12||p.id===brain.target||facing)&&this.lineOfSight(actor.position,p.position);
      }).sort((a,b)=>horizontalDistance(a.position,actor.position)-horizontalDistance(b.position,actor.position));
      const seen=visible.find(p=>p.id===brain.target)??visible[0];
      if(seen) {
        if(brain.target!==seen.id)brain.readyAt=this.time+.45;
        brain.target=seen.id;brain.lastSeen={...seen.position};brain.seenAt=this.time;
      } else {
        // Hearing stores a sound location, never an occluded actor's live position.
        const heard=players.find(p=>this.time-p.fireAt<.7&&horizontalDistance(p.position,actor.position)<30);
        if(heard){brain.lastSeen={...heard.position};brain.seenAt=this.time;brain.target=undefined;}
        if(this.time-brain.seenAt>5){brain.target=undefined;brain.lastSeen=undefined;}
      }
    }
    const target=brain.target?this.actors.get(brain.target):undefined;
    const visible=!!target&&target.hp>0&&horizontalDistance(actor.position,target.position)<=(encounter?32:60)&&this.lineOfSight(actor.position,target.position);
    const remembered=brain.lastSeen;
    if(actor.hp<actor.maxHp*.3)brain.retreat=true;
    if(actor.hp>actor.maxHp*.55)brain.retreat=false;
    if(actor.climb) {
      input.climb=!disrupted&&!brain.retreat;input.forward=1;input.yaw=Math.atan2(actor.climb.normal.x,actor.climb.normal.z);actor.aiState='pursue';
      return input;
    }
    if(this.verticalInput(actor,input,brain,remembered,visible))return input;
    if(brain.retreat&&remembered) {
      actor.aiState='retreat';actor.windupUntil=0;brain.windupAim=undefined;
      const d=Math.max(1,horizontalDistance(actor.position,remembered));
      this.navigate(actor,{x:actor.position.x+(actor.position.x-remembered.x)/d*17,y:actor.position.y,z:actor.position.z+(actor.position.z-remembered.z)/d*17},input,brain);
      return input;
    }
    if(!visible) {
      actor.windupUntil=0;brain.windupAim=undefined;
      if(remembered){actor.aiState='investigate';this.navigate(actor,remembered,input,brain);}
      else this.patrol(actor,input,brain);
      return input;
    }
    const point=target!.position,dist=horizontalDistance(actor.position,point);
    input.yaw=Math.atan2(-(point.x-actor.position.x),-(point.z-actor.position.z));
    input.pitch=Math.atan2(point.y-actor.position.y,Math.max(dist,.01));
    if(actor.role==='mortar') {
      if(dist<15) {actor.windupUntil=0;brain.windupAim=undefined;actor.aiState='retreat';const d=Math.max(dist,1);this.navigate(actor,{x:actor.position.x+(actor.position.x-point.x)/d*12,y:actor.position.y,z:actor.position.z+(actor.position.z-point.z)/d*12},input,brain);}
      else if(dist>37){actor.windupUntil=0;brain.windupAim=undefined;actor.aiState='pursue';this.navigate(actor,point,input,brain);}
      else {
        actor.aiState='attack';
        if(!disrupted&&this.time>4&&this.time>=brain.readyAt&&this.time>=actor.rocketReadyAt) {
          if(!brain.windupAim){brain.windupAim={...point};actor.windupUntil=this.time+.9;}
          actor.aiState='windup';
          const aim=brain.windupAim,aimDistance=horizontalDistance(actor.position,aim);
          input.yaw=Math.atan2(-(aim.x-actor.position.x),-(aim.z-actor.position.z));input.pitch=Math.atan2(aim.y-actor.position.y,aimDistance);
          if(this.time>=actor.windupUntil){input.rocket=this.lineOfSight(actor.position,aim);brain.windupAim=undefined;actor.windupUntil=0;actor.aiState='attack';}
        }
      }
    } else if(actor.role==='scout'&&dist>14&&this.time-brain.readyAt<3.5) {
      actor.aiState='flank';const dx=(point.x-actor.position.x)/dist,dz=(point.z-actor.position.z)/dist;
      this.navigate(actor,{x:point.x+dz*brain.flankSide*11-dx*9,y:point.y,z:point.z-dx*brain.flankSide*11-dz*9},input,brain);
    } else if(dist>(actor.role==='anchor'?18:24)) {
      actor.aiState='pursue';this.navigate(actor,point,input,brain);
    } else {
      actor.aiState=actor.role==='anchor'?'attack':'strafe';
      if(actor.role!=='anchor') {
        const side=Math.sin(this.time*.65+brain.flankSide)>.0?1:-1;
        const destination={x:actor.position.x+Math.cos(input.yaw)*side*4,y:actor.position.y,z:actor.position.z-Math.sin(input.yaw)*side*4};
        if(this.navigation.walkable(destination))input.strafe=.65*side;
      }
    }
    if(!disrupted&&actor.role!=='mortar'&&dist<42&&this.time>4&&this.time>=brain.readyAt) {
      input.fire=true;input.yaw+=Math.sin(this.time*2.2+brain.flankSide)*.045;
    }
    return input;
  }
  private lineOfSight(from:Vec3,to:Vec3):boolean {
    return this.clearRay({...from,y:from.y+.65},{...to,y:to.y+.4});
  }
  private clearRay(start:Vec3,end:Vec3):boolean {
    const length=distance(start,end);
    if(length<.1)return true;
    const dir={x:(end.x-start.x)/length,y:(end.y-start.y)/length,z:(end.z-start.z)/length};
    const hit=this.solidRay(new this.rapier.Ray(start,dir),length,true,this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
    return !hit||hit.timeOfImpact>=length-.3;
  }
  private patrol(actor:ActorState,input:InputState,brain:BotMemory) {
    actor.aiState='patrol';
    const index=Number(actor.id.split('-')[1])||0,route=cityDistrict(this.seed)?.npcs.find(n=>n.id===actor.id)?.patrol??this.map.routes[index%this.map.routes.length];
    let goal=route[brain.patrol%route.length];
    if(actor.role==='anchor') {
      goal=this.guardPoint(brain);
      // A guard holds a defensible nearby position without permanently blocking interaction.
      goal={...goal,x:goal.x+9,z:goal.z+3};
    } else if(horizontalDistance(actor.position,goal)<3){brain.patrol=(brain.patrol+1)%route.length;goal=route[brain.patrol];}
    this.navigate(actor,goal,input,brain);
    if(!brain.path.length&&horizontalDistance(actor.position,goal)>4&&this.time>=brain.repathAt-.1)brain.patrol++;
  }
  private guardPoint(brain:BotMemory):Vec3 {
    if(brain.roofHome)return brain.home;
    return this.objectives.filter(o=>!o.optional&&!o.complete).sort((a,b)=>horizontalDistance(a.position,brain.home)-horizontalDistance(b.position,brain.home))[0]?.position??brain.home;
  }
  private verticalInput(actor:ActorState,input:InputState,brain:BotMemory,remembered:Vec3|undefined,visible:boolean):boolean {
    const roofs=roofSurfaces(this.seed),own=roofs.find(roof=>onRoof(roof,actor.position)),targetRoof=remembered?roofs.find(roof=>onRoof(roof,remembered)):undefined;
    const home=roofs.find(roof=>roof.id===brain.roofHome);
    if(own) {
      brain.verticalAttachSince=undefined;brain.verticalJumpAt=undefined;brain.verticalJumpAnchor=undefined;brain.verticalJumpRetreatAt=undefined;
      if(brain.roofUntil===undefined||brain.roofUntil===0)brain.roofUntil=this.time+6;
      const leave=!home&&((remembered&&!targetRoof)||(!remembered&&this.time>brain.roofUntil)||brain.retreat);
      if(leave) {
        if(brain.exitRoof!==own.id){brain.exitRoof=own.id;brain.exitCrossing=false;}
        actor.aiState='retreat';const lip=roofPoint(own,own.exit,actorHullRadius(actor));
        if(!brain.exitCrossing&&horizontalDistance(actor.position,lip)>.8)this.navigateRoof(actor,own,lip,input,brain);
        else {brain.exitCrossing=true;this.steer(actor,own.exit,input,true);}
        return true;
      }
      brain.exitRoof=undefined;brain.exitCrossing=false;
      let goal:Vec3;
      if(remembered) {
        actor.aiState=visible?'flank':'investigate';goal=roofPoint(own,remembered,actorHullRadius(actor));
        if(visible&&targetRoof?.id===own.id) {
          const d=Math.max(1,horizontalDistance(actor.position,remembered)),dx=(remembered.x-actor.position.x)/d,dz=(remembered.z-actor.position.z)/d;
          goal=roofPoint(own,{x:remembered.x+dz*brain.flankSide*5-dx*5,y:remembered.y,z:remembered.z-dx*brain.flankSide*5-dz*5},actorHullRadius(actor));
        }
      } else {
        actor.aiState='patrol';goal={...own.patrol[brain.patrol%own.patrol.length],y:own.center.y+ACTOR_HEIGHT};
        if(horizontalDistance(actor.position,goal)<1.3){brain.patrol++;goal={...own.patrol[brain.patrol%own.patrol.length],y:own.center.y+ACTOR_HEIGHT};}
      }
      this.navigateRoof(actor,own,goal,input,brain);
      if(visible&&remembered) {
        const d=horizontalDistance(actor.position,remembered);input.yaw=Math.atan2(-(remembered.x-actor.position.x),-(remembered.z-actor.position.z));input.pitch=Math.atan2(remembered.y-actor.position.y,Math.max(d,.01));
        // Retarget movement after aiming rather than turning a patrol vector into a different direction.
        if(brain.path[0])this.steer(actor,brain.path[0],input,false);
        if(this.time>4&&this.time>=brain.readyAt&&actor.disruptedUntil<=this.time&&d<42)input.fire=true;
      }
      return true;
    }
    const exiting=roofs.find(roof=>roof.id===brain.exitRoof);
    if(exiting&&actor.position.y-ACTOR_HEIGHT>terrainHeight(actor.position.x,actor.position.z,this.seed)+.8) {
      actor.aiState='retreat';this.steer(actor,{...exiting.outside,y:actor.position.y},input,true);return true;
    }
    if(brain.exitRoof){brain.exitRoof=undefined;brain.exitCrossing=false;brain.verticalRoof=undefined;brain.roofUntil=0;brain.path=[];brain.goal=undefined;brain.repathAt=0;}
    const wanted=home??(actor.role==='scout'?targetRoof:undefined);if(!wanted)return false;
    actor.aiState=home?'patrol':'pursue';const anchor=climbAnchors(this.seed).filter(a=>(wanted.anchorIds??[wanted.anchorId]).includes(a.id)&&this.climbLandingClear(actor,a)).sort((a,b)=>horizontalDistance(actor.position,a.approach)-horizontalDistance(actor.position,b.approach)||a.id.localeCompare(b.id))[0];if(!anchor){brain.verticalRetryAt=this.time+2;return true;}
    if(brain.verticalRoof!==wanted.id){brain.verticalRoof=wanted.id;brain.verticalAttachSince=undefined;brain.verticalJumpAt=undefined;brain.verticalJumpAnchor=undefined;brain.verticalJumpRetreatAt=undefined;brain.path=[];brain.goal=undefined;brain.repathAt=0;}
    if(actor.disruptedUntil>this.time) {
      actor.aiState='retreat';const side=Math.sin(this.time*.7+brain.flankSide)>0?4:-4;
      const goal={x:anchor.position.x+anchor.normal.x*7-anchor.normal.z*side,y:actor.position.y,z:anchor.position.z+anchor.normal.z*7+anchor.normal.x*side};
      if(actor.grounded)this.navigate(actor,goal,input,brain);
      return true;
    }
    if(this.time<(brain.verticalRetryAt??0))return true;
    const required=8+(anchor.height/CLIMB_SPEED[actor.chassis]+1.1)*7+8;
    if(actor.energy<required){brain.verticalRetryAt=this.time+1;return true;}
    if(horizontalDistance(actor.position,anchor.approach)>7){this.navigate(actor,{...anchor.approach,y:anchor.position.y+ACTOR_HEIGHT},input,brain);return true;}
    const grip={x:anchor.position.x+anchor.normal.x*(actorHullRadius(actor)+.3),y:anchor.position.y+ACTOR_HEIGHT,z:anchor.position.z+anchor.normal.z*(actorHullRadius(actor)+.3)};
    if(!this.climbLandingClear(actor,anchor)){brain.verticalRetryAt=this.time+2;return true;}
    const nearGrip=horizontalDistance(actor.position,grip)<1.2;
    // One ordinary jump per selected approach can clear a real lower beam.
    // The launch tick does not grab and immediately detach; subsequent airborne
    // ticks keep facing/trying the same actual facade, within a bounded window.
    const jumpActive=brain.verticalJumpAnchor===anchor.id&&brain.verticalJumpAt!==undefined&&this.time-brain.verticalJumpAt<1.4;
    if(!actor.grounded&&!jumpActive)return true;
    if(brain.verticalJumpAnchor===anchor.id&&brain.verticalJumpAt===undefined){
      input.yaw=Math.atan2(anchor.normal.x,anchor.normal.z);input.strafe=0;
      const normalDistance=(actor.position.x-anchor.position.x)*anchor.normal.x+(actor.position.z-anchor.position.z)*anchor.normal.z;
      if(this.time-(brain.verticalJumpRetreatAt??this.time)>2){brain.verticalJumpAt=this.time-1.4;brain.verticalRetryAt=this.time+2;return true;}
      if(!actor.grounded)return true;
      if(normalDistance<actorHullRadius(actor)+1.25){input.forward=-1;return true;}
      // Brake through normal movement filtering before reversing into the jump.
      const outwardSpeed=actor.velocity.x*anchor.normal.x+actor.velocity.z*anchor.normal.z;
      if(Math.abs(outwardSpeed)>.4)return true;
      brain.verticalJumpAt=this.time;input.forward=1;input.jump=true;return true;
    }
    this.steer(actor,grip,input,true);
    if(nearGrip){
      input.yaw=Math.atan2(anchor.normal.x,anchor.normal.z);input.forward=1;input.strafe=0;input.climb=true;
      if(actor.grounded&&brain.verticalJumpAnchor!==anchor.id){
        brain.verticalAttachSince??=this.time;
        if(this.time-brain.verticalAttachSince>=.45){brain.verticalJumpAnchor=anchor.id;brain.verticalJumpRetreatAt=this.time;input.climb=false;}
      }
    }else if(actor.grounded){brain.verticalAttachSince=undefined;}
    return true;
  }
  /** Every corner and center must still have solid deck at the declared floor.
   * Clearance alone cannot distinguish an empty hole from a walkable surface. */
  private roofSupported(position:Vec3,radius:number):boolean {
    const floor=position.y-ACTOR_HEIGHT;
    // Owned roof geometry is indexed separately from climbable facade cells.
    // Conservative envelopes only prune impossible candidates; the five exact
    // collider rays below still decide full-footprint support.
    const candidates=[...this.roofSupports.values()].filter(({block})=>{
      const [x,y,z]=block.position,[hx,hy,hz]=block.halfExtents;
      if(Math.abs(y+hy-floor)>.4)return false;
      const dx=position.x-x,dz=position.z-z,c=Math.cos(block.yaw),s=Math.sin(block.yaw),reach=radius*Math.SQRT2+.02;
      return Math.abs(dx*c-dz*s)<=hx+reach&&Math.abs(dx*s+dz*c)<=hz+reach;
    });
    for(const [x,z] of [[0,0],[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]]) {
      const start={x:position.x+x,y:position.y-ACTOR_HEIGHT+.12,z:position.z+z};
      const ray=new this.rapier.Ray(start,{x:0,y:-1,z:0});let supported=false;
      // Owned static decks can be queried before the world's first broad-phase
      // update (initial NPC admission). Direct collider casts still use exact geometry.
      for(const {collider} of candidates){const hit=collider.castRay(ray,.4,true);if(hit>=0&&hit<=.35){supported=true;break;}}
      if(!supported)return false;
    }
    return true;
  }
  private roofClear(actor:ActorState,position:Vec3):boolean {
    const radius=actorHullRadius(actor),height=actorQuadHeight(actor),center={...position,y:position.y+height/2-ACTOR_HEIGHT+.08};
    return this.roofSupported(position,radius)&&!this.solidIntersection(center,{x:0,y:0,z:0,w:1},new this.rapier.Cuboid(radius,height/2,radius),this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC|this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC);
  }
  private navigateRoof(actor:ActorState,roof:RoofSurface,goal:Vec3,input:InputState,brain:BotMemory) {
    if(this.encounterOwner)goal=this.encounterOwner.constrainGoal(actor.id,goal);
    if(this.time-brain.stuckAt>1.5) {
      if(horizontalDistance(actor.position,brain.checkpoint)<.6){brain.repathAt=0;brain.path=[];brain.patrol++;}
      brain.checkpoint={...actor.position};brain.stuckAt=this.time;
    }
    if(this.time>=brain.repathAt||!brain.goal||horizontalDistance(brain.goal,goal)>3||Math.abs(brain.goal.y-goal.y)>1) {
      brain.path=roofPath(roof,actor.position,goal,actorHullRadius(actor),p=>this.roofClear(actor,p));brain.goal={...goal};brain.repathAt=this.time+1.2;
    }
    while(brain.path.length&&horizontalDistance(actor.position,brain.path[0])<.7)brain.path.shift();
    if(brain.path[0])this.steer(actor,brain.path[0],input,true);
  }
  private steer(actor:ActorState,goal:Vec3,input:InputState,turn:boolean) {
    let dx=goal.x-actor.position.x,dz=goal.z-actor.position.z;
    if(Math.hypot(dx,dz)<.1)return;
    for(const other of this.actors.values())if(other.id!==actor.id&&other.hp>0&&Math.abs(other.position.y-actor.position.y)<2) {
      const d=horizontalDistance(actor.position,other.position),spacing=actorHullRadius(actor)+actorHullRadius(other)+.4;
      if(d>.01&&d<spacing){dx+=(actor.position.x-other.position.x)/d*(spacing-d);dz+=(actor.position.z-other.position.z)/d*(spacing-d);}
    }
    const length=Math.max(.001,Math.hypot(dx,dz));dx/=length;dz/=length;
    if(turn)input.yaw=Math.atan2(-dx,-dz);
    input.forward=-Math.sin(input.yaw)*dx-Math.cos(input.yaw)*dz;input.strafe=Math.cos(input.yaw)*dx-Math.sin(input.yaw)*dz;
  }
  private localRoofRoute(actor:ActorState,goal:Vec3):LocalRoofProof|null {
    if(!this.encounterOwner||!roofSurfaces(this.seed).some(roof=>localRoofDomain(roof,actor.position,goal)))return null;
    const height=actorCollisionHeight(actor,this.time),radius=actorHullRadius(actor),shape=new this.rapier.RoundCylinder(height/2-.12,radius-.12,.12),center=(position:Vec3)=>({...position,y:position.y+height/2-ACTOR_HEIGHT}),flags=this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC;
    const clear=(position:Vec3)=>{const at=center(position),handles:number[]=[];this.solidIntersections(at,{x:0,y:0,z:0,w:1},shape,collider=>{handles.push(collider.handle);return true;},flags);return handles.every(handle=>{const collider=this.world.getCollider(handle);if(!collider)return false;const contact=shape.contactShape(at,{x:0,y:0,z:0,w:1},collider.shape,collider.translation(),collider.rotation(),0);return !contact||contact.distance>=-1e-5;});};
    return proveLocalRoofRoute(this.rapier,actor.position,goal,radius,this.roofSupports.values(),clear,(from,to)=>{const move={x:to.x-from.x,y:0,z:to.z-from.z},hit=this.solidCast(center(from),{x:0,y:0,z:0,w:1},move,shape,0,1,false,flags);return !hit||hit.time_of_impact>=1-1e-5;});
  }
  private navigate(actor:ActorState,goal:Vec3,input:InputState,brain:BotMemory) {
    if(this.encounterOwner)goal=this.encounterOwner.constrainGoal(actor.id,goal);
    // A roof home is never projected into the ground grid for a local request.
    // Revalidate current native support/obstructions even inside a cached repath
    // interval, so damage or a newly occupied corridor cannot keep stale intent.
    const local=this.localRoofRoute(actor,goal);
    if(local){brain.path=local.path;brain.goal={...goal};brain.repathAt=this.time+1.2;while(brain.path.length&&horizontalDistance(actor.position,brain.path[0])<1.35)brain.path.shift();if(brain.path[0])this.steer(actor,brain.path[0],input,true);return;}
    if(this.time-brain.stuckAt>1.5) {
      if(horizontalDistance(actor.position,brain.checkpoint)<.6){brain.repathAt=0;brain.path=[];brain.patrol++;}
      brain.checkpoint={...actor.position};brain.stuckAt=this.time;
    }
    if(this.time>=brain.repathAt||!brain.goal||horizontalDistance(brain.goal,goal)>5) {
      if(this.onNavigationTiming){const observer=this.onNavigationTiming,prior=this.navigation.onPathTiming;this.navigation.onPathTiming=trace=>observer({...trace,actor:actor.id,role:actor.role??'unknown',aiState:actor.aiState,tick:this.tick,time:this.time});try{brain.path=this.navigation.path(actor.position,goal);}finally{this.navigation.onPathTiming=prior;}}
      else brain.path=this.navigation.path(actor.position,goal);
      brain.goal={...goal};brain.repathAt=this.time+1.2;
    }
    while(brain.path.length&&horizontalDistance(actor.position,brain.path[0])<1.35)brain.path.shift();
    const next=brain.path[0];if(!next)return;
    let dx=next.x-actor.position.x,dz=next.z-actor.position.z;
    for(const other of this.actors.values())if(other.id!==actor.id&&other.hp>0&&Math.abs(other.position.y-actor.position.y)<2) {
      const d=horizontalDistance(actor.position,other.position),spacing=actorHullRadius(actor)+actorHullRadius(other)+.4;if(d>.01&&d<spacing){dx+=(actor.position.x-other.position.x)/d*(spacing-d)*.8;dz+=(actor.position.z-other.position.z)/d*(spacing-d)*.8;}
    }
    const length=Math.max(.001,Math.hypot(dx,dz));dx/=length;dz/=length;
    input.forward=-Math.sin(input.yaw)*dx-Math.cos(input.yaw)*dz;input.strafe=Math.cos(input.yaw)*dx-Math.sin(input.yaw)*dz;
    if(actor.aiState==='patrol'||actor.aiState==='investigate'||actor.aiState==='retreat'){input.yaw=Math.atan2(-dx,-dz);input.forward=1;input.strafe=0;}
  }
  private shoot(actor:ActorState,kind:WeaponId) {
    if(this.projectiles.length>=192||actor.hp<=0||actor.disruptedUntil>this.time)return false;
    const def=WEAPONS[kind],dir=direction(actor.aimYaw,actor.aimPitch);
    const position={x:actor.position.x+dir.x*1.3,y:actor.position.y+(actor.stance==='upright'?1.65:.65),z:actor.position.z+dir.z*1.3};
    const id=++this.serial;
    this.projectiles.push({id,owner:actor.id,kind,position,velocity:{x:dir.x*def.speed,y:dir.y*def.speed,z:dir.z*def.speed},age:0});
    this.projectileDamage.set(id,actor.bot?.55:MECHS[actor.chassis].weaponDamage*(actor.stance==='upright'?UPRIGHT[actor.chassis].damage:1));
    actor.heat=clamp(actor.heat+def.heat,0,100);actor.fireAt=this.time;
    if(kind==='pulse')actor.pulseAt=this.time;else actor.rocketAt=this.time;
    this.emit('shot',position,actor.id,undefined,kind,undefined,{radius:kind==='rocket'?def.splash:undefined,direction:actor.aimYaw});
    return true;
  }
  private canDamage(owner:string,target:ActorState) {
    const source=this.actors.get(owner);
    return owner!==target.id&&target.hp>0&&!(source?.bot&&target.bot)&&!((this.mode==='training'||this.mode==='coop')&&!source?.bot&&!target.bot);
  }
  private advanceProjectiles(dt:number) {
    const surviving:ProjectileState[]=[];
    for(const shot of this.projectiles) {
      shot.age+=dt;if(shot.age>WEAPONS[shot.kind].lifetime){this.projectileDamage.delete(shot.id);continue;}
      const from=shot.position,to={x:from.x+shot.velocity.x*dt,y:from.y+shot.velocity.y*dt,z:from.z+shot.velocity.z*dt};
      const length=distance(from,to);if(length<.0001)continue;
      const dir={x:(to.x-from.x)/length,y:(to.y-from.y)/length,z:(to.z-from.z)/length};
      const hit=this.solidRayNormal(new this.rapier.Ray(from,dir),length,true,this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
      let t=hit?hit.timeOfImpact/length:2;let target:ActorState|undefined;
      for(const actor of this.actors.values()) {
        if(!this.canDamage(shot.owner,actor))continue;
        const impact=this.physics.get(actor.id)!.collider.castRay(new this.rapier.Ray(from,dir),length,true);
        const fraction=impact<0?null:impact/length;
        if(fraction!==null&&fraction<t){t=fraction;target=actor;}
      }
      if(t<=1) {
        const impact={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,z:from.z+(to.z-from.z)*t};
        const multiplier=this.projectileDamage.get(shot.id)??1;
        const coverId=!target&&hit?this.colliderCover.get(hit.collider.handle):undefined;
        const cell=!target&&hit?this.colliderCell.get(hit.collider.handle):undefined;
        const wreck=!target&&hit?this.ruinsOwner.blockForHandle(hit.collider.handle):undefined;
        const materialHit=!target&&hit&&this.bondedOwner&&(this.bondedOwner.owns(hit.collider.handle)||cell?.id===BONDED_SOURCE_ID);
        if(materialHit){
          const source=this.bondedOwner!.source,bank=this.structures.find(s=>s.id===source.structureId)!,before=bank.hp[source.cellId!];
          this.bondedOwner!.hit(this.bondedOwner!.owns(hit!.collider.handle)?hit!.collider.handle:undefined,{point:impact,incoming:dir,normal:hit!.normal,weapon:shot.kind,strength:WEAPONS[shot.kind].damage*multiplier});
          this.emit('structure-hit',impact,shot.owner,undefined,shot.kind,before-bank.hp[source.cellId!],{structureId:source.structureId,cellId:source.cellId,incoming:dir,normal:hit!.normal});this.excludedDynamicColliders=null;this.refreshRuinClimbs();continue;
        }
        if(shot.kind==='rocket') {
          // Evaluate actor and cover visibility against the intact geometry. Removing
          // the struck wall first would let this same explosion leak through it.
          const coverDamage=this.coverBlast(impact,WEAPONS.rocket.splash,WEAPONS.rocket.damage*multiplier,coverId);
          const cellDamage=this.structureBlast(impact,dir,WEAPONS.rocket.splash,WEAPONS.rocket.damage*multiplier,cell);
          const wreckHandles:number[]=[];
          if(wreck)wreckHandles.push(hit!.collider.handle);
          const start={x:impact.x-dir.x*.03,y:impact.y-dir.y*.03,z:impact.z-dir.z*.03};
          for(const candidate of this.ruinsOwner.impactCandidates(impact,WEAPONS.rocket.splash)){
            if(wreckHandles.includes(candidate.handle))continue;
            const d=distance(start,candidate.point),rayDirection={x:(candidate.point.x-start.x)/Math.max(d,.001),y:(candidate.point.y-start.y)/Math.max(d,.001),z:(candidate.point.z-start.z)/Math.max(d,.001)};
            const blocker=d<.001?null:this.solidRay(new this.rapier.Ray(start,rayDirection),d+.02,true,this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
            if(d<.001||!blocker||blocker.collider.handle===candidate.handle)wreckHandles.push(candidate.handle);
          }
          this.splash(impact,WEAPONS.rocket.splash,WEAPONS.rocket.damage*multiplier,shot.owner,false,true);
          for(const [block,amount] of cellDamage)this.damageCell(block,amount,shot.owner,impact,dir,hit?.normal??{x:0,y:0,z:0},shot.kind,false);
          for(const [id,amount] of coverDamage)this.damageCover(id,amount,shot.owner,impact,shot.kind,false);
          for(const [id] of coverDamage)if(this.cover.get(id)?.hp===0)this.retireCover(id);
          for(const [block] of cellDamage)if(!cityBlockActive(block,this.structures))this.retireCell(block);
          // One hit's work budget is shared by visible existing wrecks and
          // directly blast-damaged newly retired owners, never multiplied by
          // support-closure descendants. Those acquire gravity on their own.
          for(const [block] of cellDamage)wreckHandles.push(...this.ruinsOwner.sourceColliders(block).map(c=>c.handle));
          if(wreckHandles.length)this.ruinsOwner.applyWeaponImpact(wreckHandles,{point:impact,incoming:dir,normal:hit?.normal??{x:0,y:0,z:0},weapon:shot.kind,strength:WEAPONS.rocket.damage*multiplier},this.time,cell?.material??wreck?.material);
        }
        else if(target)this.damage(target,WEAPONS.pulse.damage*multiplier,shot.owner,impact,shot.kind,true);
        else if(cell){
          this.damageCell(cell,WEAPONS.pulse.damage*multiplier,shot.owner,impact,dir,hit!.normal,shot.kind);
          const colliders=this.ruinsOwner.sourceColliders(cell);if(colliders.length)this.ruinsOwner.applyWeaponImpact(colliders.map(c=>c.handle),{point:impact,incoming:dir,normal:hit!.normal,weapon:shot.kind,strength:WEAPONS.pulse.damage*multiplier},this.time,cell.material);
        }
        else if(wreck)this.ruinsOwner.applyWeaponImpact([hit!.collider.handle],{point:impact,incoming:dir,normal:hit!.normal,weapon:shot.kind,strength:WEAPONS.pulse.damage*multiplier},this.time,wreck.material);
        else if(coverId)this.damageCover(coverId,WEAPONS.pulse.damage*multiplier,shot.owner,impact,shot.kind);
        this.projectileDamage.delete(shot.id);
        this.emit(shot.kind==='rocket'?'explosion':'impact',impact,shot.owner,target?.id,shot.kind,undefined,{radius:shot.kind==='rocket'?WEAPONS.rocket.splash:undefined,direction:Math.atan2(-dir.x,-dir.z),effect:shot.kind==='rocket'?'shockwave':undefined});
      } else {shot.position=to;surviving.push(shot);}
    }
    this.projectiles=surviving;
  }
  private structureBlast(point:Vec3,incoming:Vec3,radius:number,amount:number,direct?:CityBlock):Map<CityBlock,number> {
    const result=new Map<CityBlock,number>();if(direct)result.set(direct,amount);
    const start={x:point.x-incoming.x*.03,y:point.y-incoming.y*.03,z:point.z-incoming.z*.03};
    for(const ref of this.cellBodies.values()) {
      if(ref.block===direct||!cityBlockActive(ref.block,this.structures))continue;
      const projection=ref.collider.projectPoint(start,true);if(!projection)continue;
      const nearest=projection.point,d=distance(start,nearest);if(d>radius)continue;
      const dir={x:(nearest.x-start.x)/Math.max(d,.001),y:(nearest.y-start.y)/Math.max(d,.001),z:(nearest.z-start.z)/Math.max(d,.001)};
      const hit=this.solidRay(new this.rapier.Ray(start,dir),d+.02,true,this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
      if(d<.001||!hit||hit.collider.handle===ref.collider.handle)result.set(ref.block,amount*(1-.55*d/radius));
    }
    return result;
  }
  private damageCell(block:CityBlock,amount:number,owner:string,point:Vec3,incoming:Vec3,normal:Vec3,weapon?:WeaponId,retire=true) {
    const state=this.structures.find(s=>s.id===block.structureId),index=block.cellId;
    if(!state||index===undefined||state.hp[index]<=0||!Number.isFinite(amount)||amount<=0)return;
    const strength=amount;amount=Math.min(state.hp[index],amount);state.hp[index]=Math.max(0,state.hp[index]-amount);state.revision++;
    const metadata={structureId:state.id,cellId:index,incoming:{...incoming},normal:{...normal}};
    this.emit('structure-hit',point,owner,undefined,weapon,amount,metadata);
    if(state.hp[index]===0){state.brokenMask=(state.brokenMask|(1<<index))>>>0;this.emit('structure-break',point,owner,undefined,weapon,amount,metadata);if(this.physicalRubbleEnabled&&weapon){this.pendingRubble.set(block.id,{block,incoming:{...incoming},impact:{point:{...point},incoming:{...incoming},normal:{...normal},weapon,strength}});while(this.pendingRubble.size>MAX_CITY_RUBBLE_BODIES/8)this.pendingRubble.delete(this.pendingRubble.keys().next().value!);}if(retire)this.retireCell(block);}
  }
  private retireCell(block:CityBlock) {
    if(this.supportGraph&&!this.retiredStructuralBlocks.has(block.id)){
      const closure=resolveOverhaulSupport(this.supportGraph,this.structures,this.retiredStructuralBlocks);
      commitOverhaulSupport(closure,this.structures);
      const sources=closure.newlyDetachedBlockIds.map(id=>this.supportGraph!.byBlock.get(id)?.block).filter((source):source is CityBlock=>!!source);
      this.ruinsOwner.preflightDetach(sources);
      const event=[...this.events].reverse().find(e=>e.structureId===block.structureId&&e.cellId===block.cellId&&e.incoming);
      for(const source of sources)this.retiredStructuralBlocks.add(source.id);
      // Retire every original collider before capacity-limited settling queries.
      // A detached piece must never land on its own soon-to-disappear roof.
      for(const source of sources)this.retireCell(source);
      for(const source of sources)this.ruinsOwner.detach(source,this.time,event?.incoming??{x:0,y:-1,z:0});
      this.refreshRuinClimbs();
      return;
    }
    const ref=this.cellBodies.get(block.id);if(!ref)return;
    const chunk=this.chunks.get(ref.chunk);if(chunk)chunk.bodies=chunk.bodies.filter(body=>body.handle!==ref.body.handle);
    const removed=new Set<number>([ref.collider.handle]);
    this.colliderCell.delete(ref.collider.handle);this.anchorSupports.delete(ref.collider.handle);this.roofSupports.delete(ref.collider.handle);this.cellBodies.delete(block.id);this.districtBodies.delete(block.id);this.buildingColliders.delete(block.id);this.world.removeRigidBody(ref.body);
    if(block.anchorId&&this.anchorColliders.get(block.anchorId)?.collider.handle===ref.collider.handle){
      const surviving=[...this.districtBodies.values()].find(r=>r.block.anchorId===block.anchorId&&(r.block.part==='wall'||r.block.part==='cell'));
      if(surviving)this.anchorColliders.set(block.anchorId,{collider:surviving.collider,chunk:surviving.chunk});else this.anchorColliders.delete(block.anchorId);
    }
    for(const [id,dependent] of this.districtBodies)if(dependent.block.support&&!cityBlockActive(dependent.block,this.structures)){const owner=this.chunks.get(dependent.chunk);if(owner)owner.bodies=owner.bodies.filter(body=>body.handle!==dependent.body.handle);removed.add(dependent.collider.handle);this.anchorSupports.delete(dependent.collider.handle);this.roofSupports.delete(dependent.collider.handle);this.colliderCell.delete(dependent.collider.handle);this.cellBodies.delete(id);this.buildingColliders.delete(id);this.world.removeRigidBody(dependent.body);this.districtBodies.delete(id);}
    // Projectile damage runs after actor advancement. Invalidate receipts now,
    // before the accepted-break snapshot, rather than waiting one more step.
    this.invalidateBuildingSupports(removed);
    this.navigation.setStructureFilter(block=>cityBlockActive(block,this.structures));
    for(const brain of this.brains.values()){brain.path=[];brain.goal=undefined;brain.repathAt=0;brain.nextSense=0;}
  }
  private invalidateBuildingSupports(removed:ReadonlySet<number>):void {
    for(const [id,motion] of this.climbMotion){
      const actor=this.actors.get(id),p=this.physics.get(id);if(!actor?.climb||!p||!motion.face)continue;
      const state=actor.climb;
      if(state.phase==='mantle'&&motion.landingHandles.some(handle=>removed.has(handle))||state.phase==='grab'&&motion.grabHandles.some(handle=>removed.has(handle))){this.detachClimb(actor,p);continue;}
      for(let i=0;i<4;i++)if(motion.pawHandles[i].some(handle=>removed.has(handle))){state.gripMask&=~(1<<i);state.roofMask&=~(1<<i);motion.pawHandles[i].length=0;}
      if(state.phase!=='grab'&&state.phase!=='mantle'&&(state.corner?buildingGripMaskCount(state.gripMask)<2:!this.continuingFaceGrip(actor,motion)))this.detachClimb(actor,p);
    }
  }
  private coverBlast(point:Vec3,radius:number,amount:number,direct?:string):Map<string,number> {
    const damage=new Map<string,number>();if(direct)damage.set(direct,amount);
    for(const [id,ref] of this.coverBodies) {
      if(id===direct||this.cover.get(id)?.hp===0)continue;
      const projection=ref.collider.projectPoint(point,true);if(!projection)continue;
      const nearest=projection.point,d=distance(point,nearest);if(d>radius)continue;
      let visible=d<.01;
      if(!visible) {
        const dir={x:(nearest.x-point.x)/d,y:(nearest.y-point.y)/d,z:(nearest.z-point.z)/d};
        const hit=this.solidRay(new this.rapier.Ray(point,dir),d+.08,true,this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
        visible=!hit||hit.collider.handle===ref.collider.handle;
      }
      if(visible)damage.set(id,amount*(1-.55*d/radius));
    }
    return damage;
  }
  private damageCover(id:string,amount:number,owner:string,point:Vec3,weapon:WeaponId,retire=true) {
    const cover=this.cover.get(id);if(!cover||cover.hp<=0)return;
    amount=Math.max(0,Math.min(cover.hp,amount));cover.hp=Math.max(0,cover.hp-amount);
    this.emit('cover-hit',point,owner,undefined,weapon,amount,{coverId:id});
    if(cover.hp===0) {
      cover.destroyedAt=this.time;this.emit('cover-break',point,owner,undefined,weapon,amount,{coverId:id});
      if(retire)this.retireCover(id);
    }
  }
  private retireCover(id:string) {
    const ref=this.coverBodies.get(id);if(!ref)return;
    const chunk=this.chunks.get(ref.chunk);if(chunk)chunk.bodies=chunk.bodies.filter(body=>body.handle!==ref.body.handle);
    const handle=ref.collider.handle;
    this.colliderCover.delete(handle);this.coverBodies.delete(id);
    for(const [key,owner] of this.buildingColliders)if(owner.collider.handle===handle)this.buildingColliders.delete(key);
    for(const [key,owner] of this.anchorColliders)if(owner.collider.handle===handle)this.anchorColliders.delete(key);
    this.anchorSupports.delete(handle);this.roofSupports.delete(handle);
    this.world.removeRigidBody(ref.body);
    // Projectile damage runs after actor movement. Clear current support receipts
    // now, before the same tick snapshot can expose the removed geometry.
    this.invalidateBuildingSupports(new Set([handle]));
    this.navigation.setPropFilter(prop=>!prop.id||(this.cover.get(prop.id)?.hp??1)>0);
    for(const brain of this.brains.values()){brain.path=[];brain.goal=undefined;brain.repathAt=0;brain.nextSense=0;}
  }
  private damage(target:ActorState,amount:number,owner:string,point:Vec3,weapon?:WeaponId,scaled=false) {
    if(target.hp<=0||amount<=0||this.physics.get(target.id)!.protectedUntil>this.time)return;
    const attacker=this.actors.get(owner);
    if(target.pair&&target.pair.other!==owner&&amount>=10)this.releasePair(target);
    if(weapon&&attacker&&!scaled)amount*=attacker.bot?.55:MECHS[attacker.chassis].weaponDamage*(attacker.stance==='upright'?UPRIGHT[attacker.chassis].damage:1);
    const dome=this.fields.some(f=>f.kind==='shield'&&this.fieldLive(f)&&this.friendly(f.owner,target)&&this.fieldContains(f,target));
    if(dome)amount*=.5;else if(target.shieldUntil>this.time)amount*=.7;
    target.hp=Math.max(0,target.hp-amount);target.hitAt=this.time;target.hurtAt=this.time;
    if(target.hp===0) {
      this.releasePair(target,true);
      target.diedAt=this.time;this.retireJumpLife(target,this.physics.get(target.id)!);
      this.detachClimb(target,this.physics.get(target.id)!);
      if(target.bot&&this.coopOwner)this.defeatedCoopNpcs.add(target.id);
      target.respawnAt=this.time+(target.bot?22:5);const collider=this.physics.get(target.id)!.collider;collider.setEnabled(false);this.disabledMovementColliders.add(collider.handle);
      if(!target.bot)this.coopOwner?.down(target,this.time);
      this.fields=this.fields.filter(f=>f.owner!==target.id);
      const source=this.actors.get(owner);if(source){source.kills++;source.salvage+=target.bot?35:60;if(this.mode==='pvp'&&source.kills>=10){this.phase='extracted';this.winner=source.id;}}
      this.emit('death',point,owner,target.id,weapon,amount);
    }
  }
  private splash(point:Vec3,radius:number,amount:number,owner:string,ability=false,scaled=false) {
    for(const actor of this.actors.values()) if(this.canDamage(owner,actor)) {
      const d=distance(point,actor.position);if(d>radius)continue;
      // Solid cover blocks blast damage, as it blocks projectile sweeps.
      const dir={x:(actor.position.x-point.x)/Math.max(d,.001),y:(actor.position.y-point.y)/Math.max(d,.001),z:(actor.position.z-point.z)/Math.max(d,.001)};
      const blocked=this.solidRay(new this.rapier.Ray(point,dir),Math.max(0,d-.3),false,this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC);
      if(blocked&&blocked.timeOfImpact<d-.5)continue;
      this.damage(actor,amount*(1-.55*d/radius),owner,point,ability?undefined:'rocket',scaled);
      actor.velocity.x+=dir.x*5;actor.velocity.z+=dir.z*5;actor.velocity.y+=2;
    }
  }
  private interact(actor:ActorState,dt:number) {
    if(this.coopOwner&&coopReviveTarget([...this.actors.values()],actor))return;
    if(this.claimSupply(actor))return;
    if(this.mode==='pvp')return;
    const o=this.objectives.find(o=>o.unlocked&&!o.complete&&withinObjectiveReach(actor,o.position));
    if(!o)return;
    if(o.optional){this.interactUplink(actor,o,dt);return;}
    if(this.mode==='coop'&&o.id==='extraction'&&coopExtractionWait([...this.actors.values()],o.position)) {
      o.progress=0;this.coopExtractionPilot=null;return;
    }
    const enemyNear=[...this.actors.values()].some(a=>a.bot&&a.hp>0&&horizontalDistance(a.position,o.position)<7);
    if(enemyNear)return;
    if(this.mode==='coop') {
      // Squads may work different relays in parallel; piling onto one relay does
      // not shorten its displayed hold duration or issue duplicate captures.
      if(this.objectiveTouchedTick.get(o.id)===this.tick)return;
      this.objectiveTouchedTick.set(o.id,this.tick);
    }
    const definition=this.map.objectives.find(d=>d.id===o.id)!;
    o.progress=clamp(o.progress+dt/definition.seconds,0,1);
    if(this.mode==='coop'&&o.id==='extraction') {
      if(o.progress>=1)this.coopExtractionPilot=actor.id;
      return;
    }
    if(o.progress>=1) {
      o.complete=true;actor.salvage+=100;this.emit('capture',o.position,actor.id);
      if(this.mode==='coop'&&o.id!=='extraction') {
        this.checkpoint={objectiveId:o.id,name:o.name,position:{...o.position},activatedAt:this.time};this.emit('checkpoint',o.position,actor.id);
      }
      if(o.id==='extraction'){this.phase='extracted';this.winner=actor.id;}
    }
  }
  private interactUplink(actor:ActorState,objective:ObjectiveState,dt:number) {
    const encounter=optionalEncounter(this.seed,objective.id);if(!encounter||!optionalEncounterSupported(this.seed,objective.id,this.structures))return;
    const at={...objective.position,y:objective.position.y+ACTOR_HEIGHT};
    if(!actor.grounded||actor.climb||Math.abs(actor.position.y-ACTOR_HEIGHT-objective.position.y)>.75||distance(actor.position,at)>=4.5||!this.clearRay({...actor.position,y:actor.position.y+.4},encounter.interactionPoint))return;
    if((this.actors.get(encounter.guardian.id)?.hp??0)>0)return;
    if([...this.actors.values()].some(a=>a.bot&&a.hp>0&&distance(a.position,at)<7))return;
    const touch=this.uplinkTouches.get(objective.id);if(touch?.touchedAt===this.time)return;
    if(touch?.claimant!==actor.id||this.time-touch.touchedAt>dt*1.5)objective.progress=0;
    this.uplinkTouches.set(objective.id,{claimant:actor.id,touchedAt:this.time});objective.progress=clamp(objective.progress+dt/encounter.objective.seconds,0,1);
    if(objective.progress<1)return;
    objective.complete=true;actor.salvage+=encounter.salvage;this.emit('capture',objective.position,actor.id);
    this.emit('area',encounter.pulseOrigin,actor.id,undefined,undefined,undefined,{radius:encounter.radius,effect:'emp'});
    actor.energy=100;
    for(const target of this.actors.values()) {
      if(target.hp<=0||distance(encounter.pulseOrigin,target.position)>encounter.radius||!this.clearRay(encounter.pulseOrigin,{...target.position,y:target.position.y+.4}))continue;
      if(target.bot) {
        target.disruptedUntil=Math.max(target.disruptedUntil,this.time+encounter.duration);target.windupUntil=0;
        const brain=this.brains.get(target.id);if(brain)brain.windupAim=undefined;
        this.emit('emp-hit',target.position,actor.id,target.id,undefined,encounter.duration,{effect:'emp'});
      } else if(this.mode==='coop')target.energy=100;
    }
  }
  private supplyPosition(except?:string):Vec3|undefined {
    const positions=supplyCandidates(this.seed),start=Math.floor(this.supplyRandom()*positions.length);
    for(let offset=0;offset<positions.length;offset++) {
      const candidate=positions[(start+offset)%positions.length];
      if(this.supplies.some(s=>s.id!==except&&horizontalDistance(s.position,candidate)<9))continue;
      if([...this.actors.values()].some(a=>a.hp>0&&candidate.y+.8>a.position.y-ACTOR_HEIGHT&&candidate.y<a.position.y-ACTOR_HEIGHT+actorCollisionHeight(a,this.time)&&horizontalDistance(a.position,candidate)<Math.max(3,actorHullRadius(a)+.8)))continue;
      if(this.solidIntersection({...candidate,y:candidate.y+.65},{x:0,y:0,z:0,w:1},new this.rapier.Cuboid(.6,.6,.6),this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC|this.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC))continue;
      return {...candidate};
    }
  }
  private advanceSupplies() {
    for(const supply of this.supplies)if(supply.claimedBy!==null&&this.time>=supply.availableAt) {
      const position=this.supplyPosition(supply.id);
      if(!position){supply.availableAt=this.time+.5;continue;}
      supply.position=position;supply.kind=(['repair','energy','coolant'] as SupplyKind[])[Math.floor(this.supplyRandom()*3)];supply.born=this.time;supply.availableAt=this.time;supply.claimedBy=null;
    }
  }
  private claimSupply(actor:ActorState):boolean {
    if(actor.bot||actor.hp<=0||!actor.grounded||actor.climb)return false;
    const supply=this.supplies.find(s=>s.claimedBy===null&&this.time>=s.availableAt&&distance(actor.position,{...s.position,y:s.position.y+ACTOR_HEIGHT})<=SUPPLY_REACH&&this.lineOfSight({...s.position,y:s.position.y+.05},actor.position));
    if(!supply)return false;
    let amount=0;
    if(supply.kind==='repair') {
      for(const target of this.actors.values())if(target.hp>0&&!target.bot&&(target.id===actor.id||(this.mode==='coop'&&distance(actor.position,target.position)<=REPAIR_SHARE_RADIUS&&this.lineOfSight(actor.position,target.position)))) {
        const next=Math.min(target.maxHp,target.hp+target.maxHp*.25);amount+=next-target.hp;target.hp=next;
      }
    } else if(supply.kind==='energy') {const next=Math.min(100,actor.energy+45);amount=next-actor.energy;actor.energy=next;}
    else {amount=Math.min(actor.heat,65)+Math.max(0,actor.rocketReadyAt-this.time);actor.heat=Math.max(0,actor.heat-65);actor.rocketReadyAt=Math.min(actor.rocketReadyAt,this.time);}
    if(amount<=0)return false;
    supply.claimedBy=actor.id;supply.availableAt=this.time+55+this.supplyRandom()*20;
    this.emit('supply',supply.position,actor.id,undefined,undefined,amount,{supplyId:supply.id,supplyKind:supply.kind});
    return true;
  }
  private emit(type:CombatEvent['type'],position:Vec3,actor?:string,target?:string,weapon?:WeaponId,amount?:number,area?:Pick<CombatEvent,'radius'|'direction'|'effect'|'coverId'|'supplyId'|'supplyKind'|'structureId'|'cellId'|'incoming'|'normal'>) {
    this.events.push({id:++this.serial,type,position:{...position},actor,target,weapon,amount,at:this.time,...area});
    if(this.events.length>96)this.events.shift();
  }
inspectNativePoseFailure004(){return structuredClone(this.poseSource003.firstFailure);}
inspectNativeContactFrameRows004(){return structuredClone(this.poseSource003.lastFrameRows);}
  private publishFelinePose003(){this.poseSource003.begin();for(const actor of this.actors.values())if(actor.chassis==='pounce'&&!actor.bot){const p=this.physics.get(actor.id);actor.nativePose=p?this.poseSource003.read(actor,p,this.tick,this.time,this.poseNativeStepTick003):undefined;}}
  snapshot():GameSnapshot {this.assertPhysicsValid();try{this.publishFelinePose003();return {experimentalPhysicalRubble:this.physicalRubbleEnabled,ruinFragmentVersion:this.ruinsOwner.fragmentVersion,inputVersion:INPUT_PROTOCOL_VERSION,worldLayoutVersion:WORLD_LAYOUT_VERSION,tick:this.tick,time:this.time,seed:this.seed,room:this.room,mode:this.mode,actors:[...this.actors.values()].map(a=>({...a,strikeReceipt:a.strikeReceipt?{...a.strikeReceipt}:undefined,nativePose:a.nativePose?structuredClone(a.nativePose):undefined,position:{...a.position},velocity:{...a.velocity},downed:a.downed?{...a.downed}:null,pair:a.pair?{...a.pair,anchor:{...a.pair.anchor}}:null,strike:a.strike?{...a.strike,direction:{...a.strike.direction}}:null,climb:a.climb?{...a.climb,normal:{...a.climb.normal},contact:{...a.climb.contact},...(a.climb.corner?{corner:{...a.climb.corner,pawFaces:a.climb.corner.pawFaces?[...a.climb.corner.pawFaces] as unknown as OverhaulCornerChoices:undefined}}:{})}:null})),projectiles:this.projectiles.map(p=>({...p,position:{...p.position},velocity:{...p.velocity}})),events:this.events.map(e=>({...e,position:{...e.position},...(e.incoming?{incoming:{...e.incoming}}:{}),...(e.normal?{normal:{...e.normal}}:{})})),fields:this.fields.map(f=>({...f,position:{...f.position}})),cover:[...this.cover.values()].map(c=>({...c})),structures:this.structures.map(s=>({...s,hp:[...s.hp]})),rubble:this.rubbleOwner.snapshot(),ruins:this.ruinsOwner.snapshot(),bondedMaterial:this.bondedOwner?.snapshot(),coop:this.coopOwner?.snapshot(),supplies:this.supplies.map(s=>({...s,position:{...s.position}})),objectives:this.objectives.map(o=>({...o,position:{...o.position}})),checkpoint:this.checkpoint?{...this.checkpoint,position:{...this.checkpoint.position}}:null,phase:this.phase,winner:this.winner};}catch(error){this.latchPhysicsFailure(error);throw this.physicsFailure!;}}
  get activeChunks(){return this.chunks.size;}
  get experimentalPhysicalRubble():boolean{return this.physicalRubbleEnabled;}
  get rubble(){this.assertPhysicsValid();try{return this.rubbleOwner.snapshot();}catch(error){this.latchPhysicsFailure(error);throw this.physicsFailure!;}}
  get actorChunk(){return [...this.actors.values()].filter(a=>!a.bot).map(a=>`${chunkAt(a.position.x)},${chunkAt(a.position.z)}:${CHUNK_SIZE}`);}
  dispose() {
    const errors:unknown[]=[],cleanup=(operation:()=>void)=>{try{operation();}catch(error){errors.push(error);}};
    cleanup(()=>this.releaseRuinSurfaces());cleanup(()=>this.ruinsOwner.dispose());cleanup(()=>this.bondedOwner?.dispose());this.retiredStructuralBlocks.clear();
    cleanup(()=>this.rubbleOwner.dispose());this.pendingRubble.clear();this.rubbleControllers.clear();this.rubbleHandles=new Set();this.excludedDynamicColliders=null;
    for(const id of [...this.actors.keys()])cleanup(()=>this.removeActor(id));
    for(const c of this.chunks.values()){for(const b of c.bodies)cleanup(()=>this.world.removeRigidBody(b));for(const collider of c.colliders)cleanup(()=>this.world.removeCollider(collider,true));}
    this.chunks.clear();this.coverBodies.clear();this.colliderCover.clear();this.districtBodies.clear();this.buildingColliders.clear();this.gripQueryHandles.clear();this.cellBodies.clear();this.colliderCell.clear();this.structures=[];this.anchorColliders.clear();this.anchorSupports.clear();this.roofSupports.clear();this.uplinkTouches.clear();this.cover.clear();this.climbMotion.clear();this.climbRetryAt.clear();this.navigation.clear();this.projectiles=[];this.projectileDamage.clear();this.events=[];this.fields=[];this.supplies=[];this.objectiveTouchedTick.clear();this.checkpoint=null;
    if(errors.length){const failure=new AggregateError(errors,'Arena physics cleanup failed');this.latchPhysicsFailure(failure);throw failure;}
  }
}





