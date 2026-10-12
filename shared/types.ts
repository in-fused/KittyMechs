import type {INPUT_PROTOCOL_VERSION} from './inputProtocol';
import type {WORLD_LAYOUT_VERSION} from './layout';
import type {CityRubbleState} from './cityRubble';
import type {PairedAction} from './pairedCombat';
import type {OverhaulRuinState} from './overhaulRuins';
import type {OverhaulCornerState} from './overhaulCornerClimb';
import type {StanceFeedback} from './stanceFeedback';
export type Vec3 = { x: number; y: number; z: number };
export type Chassis = 'pounce' | 'bastion' | 'lynx' | 'caracal';
export type WeaponId = 'pulse' | 'rocket';
export type Mode = 'training' | 'coop' | 'pvp' | 'pvpve';
export type EnemyRole = 'scout' | 'mortar' | 'anchor';
export type MechStance = 'quadruped' | 'upright';
export interface InputState {
  seq: number; forward: number; strafe: number; yaw: number; pitch: number;
  /** Accepted crosshair heading; omission retains legacy movement/view yaw. */
  aimYaw?:number;
  /** Player look pitch for strike intent; weapon pitch remains muzzle aim.
   * Omission retains legacy weapon-pitch selection in protocol4. */
  strikePitch?:number;
  /** First input sequence of a life-bound transform; seq0 is explicit neutral. */
  stanceRequest?:{seq:number;life:number};
  jumpId:number; jumpCancel:number; jumpEpoch:number;
  strikeId:number; strikeCancel:number; strikeEpoch:number; strike:boolean;
  fire: boolean; rocket: boolean; jump: boolean; boost: boolean; interact: boolean; stance: MechStance; climb:boolean;
}
export const emptyInput = (): InputState => ({ seq: 0, jumpId:0,jumpCancel:0,jumpEpoch:0,strikeId:0,strikeCancel:0,strikeEpoch:0,strike:false,forward: 0, strafe: 0, yaw: 0, pitch: 0, fire: false, rocket: false, jump: false, boost: false, interact: false, stance:'quadruped',climb:false });
export interface FelineStrikeState {id:number;life:number;kind:'pounce'|'tackle'|'dive';acceptedAt:number;stage:'flight'|'recovery';stageAt:number;endsAt:number;direction:Vec3;side:-1|1;}
/** Latest first authority queue, retained after the action ends; read-only evidence. */
export interface StrikeInputReceipt {id:number;life:number;inputSeq:number;queuedTick:number;queuedAt:number;aimYaw:number;strikePitch:number;weaponPitch:number;pitchSource:'look'|'legacy-weapon';}
export interface ClimbState { anchor:string;phase:'grab'|'cling'|'climb'|'mantle';startedAt:number;progress:number;normal:Vec3;contact:Vec3;top:number;base:number;height:number;gripMask:number;roofMask:number;mantleStage:'out'|'lift'|'transfer'|'settle'|null;mantleStageAt:number;corner?:OverhaulCornerState; }
export interface CoverState { id:string;hp:number;maxHp:number;destroyedAt:number|null; }
export interface StructureState {id:string;layoutVersion:1;revision:number;brokenMask:number;hp:number[];}
export interface StructuralImpact {structureId:string;cellId:number;incoming:Vec3;normal:Vec3;}
export interface DownedState {at:number;reviveProgress:number;reviverId:string|null;}
export interface CoopMissionState {status:'active'|'failed';failedAt:number|null;retryReadyAt:number|null;attempt:number;}
export interface ActorState {
  /** Optional actual authoritative native readback; never a local guest KCC. */
  nativePose?:import('./felineNativePose004').FelineNativePose004;
  /** Explicit co-op rescue state. A blocked initial spawn is not downed. */
  downed?:DownedState|null;
  pair?:PairedAction|null;pairImmuneUntil?:number;
  id: string; name: string; chassis: Chassis; role?: EnemyRole; bot: boolean;
  position: Vec3; velocity: Vec3; yaw: number; aimYaw: number; aimPitch: number;
  hp: number; maxHp: number; energy: number; heat: number; kills: number; salvage: number;
  grounded: boolean; groundedOnRubble?:boolean; boostUntil: number; shieldUntil: number; windupUntil: number; abilityReadyAt: number; rocketReadyAt: number;
  stance:MechStance; stanceChangedAt:number; stanceFeedback?:StanceFeedback|null; climb:ClimbState|null;climbDetachedAt:number;
  pulseAt:number; rocketAt:number; abilityAt:number; hurtAt:number; diedAt:number; disruptedUntil:number;
  respawnAt: number; hitAt: number; fireAt: number; aiState: 'patrol' | 'pursue' | 'strafe' | 'attack' | 'destroyed' | 'investigate' | 'flank' | 'retreat' | 'windup';
  lastInput: number; jumpEpoch:number; jumpProcessed:number;strikeProcessed:number;strike:FelineStrikeState|null;strikeEndedAt:number;
  strikeReceipt?:StrikeInputReceipt;
}
export interface ProjectileState { id: number; owner: string; kind: WeaponId; position: Vec3; velocity: Vec3; age: number; }
export type AreaEffectKind = 'rake' | 'shockwave' | 'shield' | 'repair' | 'snare' | 'emp';
export interface AreaFieldState {id:number;kind:'shield'|'repair'|'snare';owner:string;position:Vec3;radius:number;born:number;expires:number;}
export interface CombatEvent { id: number; type: 'shot' | 'impact' | 'explosion' | 'death' | 'capture' | 'checkpoint' | 'supply' | 'pounce' | 'repair' | 'transform' | 'area' | 'climb' | 'cover-hit' | 'cover-break' | 'emp-hit' | 'structure-hit' | 'structure-break'; position: Vec3; actor?: string; target?: string; weapon?: WeaponId; amount?: number; at: number; radius?:number; direction?:number; effect?:AreaEffectKind; coverId?:string;supplyId?:string;supplyKind?:SupplyKind; structureId?:string;cellId?:number;incoming?:Vec3;normal?:Vec3; }
export interface ObjectiveState { id: string; name: string; position: Vec3; progress: number; complete: boolean; unlocked: boolean; optional?:boolean; }
export interface MissionCheckpoint {objectiveId:string;name:string;position:Vec3;activatedAt:number;}
export type SupplyKind='repair'|'energy'|'coolant';
export interface SupplyState {id:string;kind:SupplyKind;position:Vec3;born:number;availableAt:number;claimedBy:string|null;}
/** Server publication identity, independent of simulation tick. Immediate
 * admission snapshots and broadcasts can observe different worlds at one tick.
 * Omitted by standalone/offline Simulation snapshots for backwards compatibility. */
export interface SnapshotPublication {roomEpoch:string;sequence:number;kind:'bootstrap'|'broadcast';}
export interface GameSnapshot {
  publication?:SnapshotPublication;
  /** Present only for the integrated overhaul co-op mission. */
  coop?:CoopMissionState;
  ruins?:OverhaulRuinState[];
  ruinFragmentVersion?:'facade-quad-1'|'whole-piece-legacy-1';
  bondedMaterial?:import('./overhaulBondedMaterial').BondedMaterialState;
  /** Authority construction mode; omission means the established cosmetic path. */
  experimentalPhysicalRubble?:boolean;
  inputVersion:typeof INPUT_PROTOCOL_VERSION; worldLayoutVersion:typeof WORLD_LAYOUT_VERSION; tick: number; time: number; seed: number; room: string; mode: Mode;
  actors: ActorState[]; projectiles: ProjectileState[]; events: CombatEvent[];
  fields:AreaFieldState[]; cover:CoverState[];structures:StructureState[];rubble:CityRubbleState[];supplies:SupplyState[];
  objectives: ObjectiveState[]; checkpoint:MissionCheckpoint|null; phase: 'active' | 'extracted'; winner: string | null;
}
export interface JoinRequest { type: 'join';inputVersion:typeof INPUT_PROTOCOL_VERSION;layoutVersion:typeof WORLD_LAYOUT_VERSION; room: string; name: string; chassis: Chassis; mode: 'coop' | 'pvp' | 'pvpve'; create: boolean; seed?: number; }
export type ClientMessage = JoinRequest | { type: 'input'; input: InputState } | { type: 'ping'; time: number };
export type ServerMessage = { type: 'welcome';inputVersion:typeof INPUT_PROTOCOL_VERSION;layoutVersion:typeof WORLD_LAYOUT_VERSION; id: string; room: string; mode: Mode } | { type: 'snapshot'; state: GameSnapshot } | { type: 'error'; message: string } | { type: 'pong'; time: number };
export interface WeaponDefinition { id: WeaponId; name: string; damage: number; interval: number; speed: number; lifetime: number; splash: number; heat: number; }
export interface MechDefinition {
  name: string; role: string; description: string; model: string; color: string;
  health: number; speed: number; jump: number; abilityCooldown: number; scale: number;
  ability: 'pounce' | 'shockwave' | 'dash' | 'repair'; abilityName: string;
  weaponDamage: number; weaponInterval: number;
}


