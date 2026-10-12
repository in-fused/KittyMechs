import type { ActorState, MechDefinition, WeaponDefinition, WeaponId, Chassis, Vec3 } from './types';
export const TICK_RATE = 60;
export const SNAPSHOT_RATE = 20;
export const CHUNK_SIZE = 64;
export const MAX_PLAYERS = 8;
export const ACTOR_HEIGHT = 1;
export const QUADRUPED_HEIGHT=2.6;
export const SENTINEL_HEIGHT=3.2;
export const UPRIGHT_HEIGHT=3.8;
export const CLIMB_HEIGHT=2.6;
export const CLIMB_RETRACTION=.3;
export const STANCE_TRANSITION=.7;
export const actorTallHull=(actor:Pick<ActorState,'stance'|'stanceChangedAt'>,time:number)=>actor.stance==='upright'||time-actor.stanceChangedAt<STANCE_TRANSITION;
export const actorClimbHull=(actor:Pick<ActorState,'climb'|'climbDetachedAt'>,time:number)=>!!actor.climb||time-actor.climbDetachedAt<CLIMB_RETRACTION;
export const actorQuadHeight=(actor:Pick<ActorState,'bot'>)=>actor.bot?SENTINEL_HEIGHT:QUADRUPED_HEIGHT;
export const actorClimbHeight=(actor:Pick<ActorState,'bot'>)=>actor.bot?SENTINEL_HEIGHT:CLIMB_HEIGHT;
export const actorCollisionHeight=(actor:ActorState,time:number)=>actorTallHull(actor,time)?UPRIGHT_HEIGHT:actorClimbHull(actor,time)?actorClimbHeight(actor):actorQuadHeight(actor);
// Circular rounded hulls include head/shoulder reach without rotation pushing a
// character into cover. Tails and antennae remain cosmetic appendages.
export const ACTOR_RADII:Record<Chassis,number>={pounce:1.75,bastion:2.05,lynx:1.65,caracal:1.85};
export const actorHullRadius=(actor:Pick<ActorState,'chassis'|'bot'|'role'>)=>actor.bot?(actor.role==='anchor'?2.2:actor.role==='mortar'?1.75:1.45):ACTOR_RADII[actor.chassis];
export const WORLD_LIMIT = 448;
export const MECHS: Record<Chassis, MechDefinition> = {
  pounce: { name: 'Pounce', role: 'Skirmisher', description: 'Leap into close combat. A balanced hunter with explosive mobility.', model: 'Pounce_Quadruped', color: '#8fdcc9', health: 220, speed: 7.6, jump: 12.2, abilityCooldown: 4, scale: .8, ability: 'pounce', abilityName: 'Feline pounce', weaponDamage: 1, weaponInterval: 1 },
  bastion: { name: 'Bastion', role: 'Guardian', description: 'Break enemy formations with a shockwave and three seconds of reinforced armor.', model: 'Bastion_Quadruped', color: '#e4ba79', health: 340, speed: 5.6, jump: 9.4, abilityCooldown: 8, scale: .95, ability: 'shockwave', abilityName: 'Siege shockwave', weaponDamage: 1.15, weaponInterval: 1.2 },
  lynx: { name: 'Lynx', role: 'Recon', description: 'The lightest chassis. Dash along the ground to flank or escape danger.', model: 'Lynx_Quadruped', color: '#7fc9ee', health: 170, speed: 9.4, jump: 12.4, abilityCooldown: 5, scale: .76, ability: 'dash', abilityName: 'Vector dash', weaponDamage: .85, weaponInterval: .82 },
  caracal: { name: 'Caracal', role: 'Field medic', description: 'Restore your armor and nearby squadmates. Repair works on yourself in rival modes.', model: 'Caracal_Quadruped', color: '#b9e691', health: 260, speed: 6.7, jump: 10.5, abilityCooldown: 10, scale: .84, ability: 'repair', abilityName: 'Repair bloom', weaponDamage: .9, weaponInterval: 1 },
};
// Combat-form launches retain their approved values independently of quadruped agility.
export const UPRIGHT_JUMP:Record<Chassis,number>={pounce:5.76,bastion:5.2,lynx:6.56,caracal:5.6};
export const CHASSIS = Object.keys(MECHS) as Chassis[];
export const UPRIGHT:Record<Chassis,{name:string;effect:'rake'|'shield'|'snare'|'repair';speed:number;damage:number;interval:number;radius:number;duration:number;cooldown:number;energy:number}>={
  pounce:{name:'Crescent rake',effect:'rake',speed:.64,damage:1.2,interval:1.25,radius:7,duration:.7,cooldown:5,energy:30},
  bastion:{name:'Bulwark dome',effect:'shield',speed:.5,damage:1.35,interval:1.45,radius:8,duration:4,cooldown:9,energy:40},
  lynx:{name:'Ion snare',effect:'snare',speed:.75,damage:1.1,interval:.95,radius:6,duration:4.5,cooldown:7,energy:35},
  caracal:{name:'Sanctuary field',effect:'repair',speed:.62,damage:1,interval:1.15,radius:8,duration:5,cooldown:10,energy:40},
};
export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  pulse: { id: 'pulse', name: 'M-22 Pulse repeater', damage: 22, interval: .16, speed: 105, lifetime: 1.8, splash: 0, heat: 9 },
  rocket: { id: 'rocket', name: 'R-64 Micro missile', damage: 64, interval: 1.5, speed: 34, lifetime: 3.5, splash: 5, heat: 14 },
};
export const OBJECTIVES: { id: string; name: string; position: Vec3; seconds: number }[] = [
  { id: 'relay-west', name: 'WEST RELAY', position: { x: -12, y: 0, z: -35 }, seconds: 3 },
  { id: 'relay-east', name: 'EAST RELAY', position: { x: 34, y: 0, z: -30 }, seconds: 3 },
  { id: 'core', name: 'STORM CORE', position: { x: 0, y: 0, z: -76 }, seconds: 4 },
  { id: 'extraction', name: 'EXTRACTION', position: { x: -8, y: 0, z: 12 }, seconds: 8 },
];
