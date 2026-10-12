import {texturelessGeometryGlb} from '../tools/textureless-geometry-glb';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AnimationMixer, Bone, Group, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { MECHS, QUADRUPED_HEIGHT, SENTINEL_HEIGHT } from '../shared/config';
import { TURN_GAITS, turnPawSupport } from '../src/game/entities/felineMotion';
import type { Chassis } from '../shared/types';

const rigs:readonly (readonly [string,Chassis,number,number,boolean])[]=[
  ...(['pounce','bastion','lynx','caracal'] as const).map(c=>[MECHS[c].model,c,MECHS[c].scale,{pounce:1.75,bastion:2.05,lynx:1.65,caracal:1.85}[c],false] as const),
  ['Sentinel_Scout','lynx',.65,1.45,true],['Sentinel_Mortar','caracal',.8,1.75,true],['Sentinel_Anchor','bastion',1.05,2.2,true],
];

describe('actual authored angular footfalls',()=>{
  it('cancels presented angular travel with grounded support sweeps and genuinely raised swing paws in all seven shipping rigs',async()=>{
    let stanceSamples=0,maxStanceDrift=0,maxLengthError=0;
    for(const [file,chassis,scale] of rigs){
      const bytes=readFileSync(`public/assets/models/${file}.glb`),gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(bytes),'');
      const root=new Group(),body=new Group();root.add(body);body.add(gltf.scene);body.scale.setScalar(scale);body.rotation.y=Math.PI;root.updateWorldMatrix(true,true);
      const sourceRoot=gltf.scene.getObjectByName('root') as Bone,rootPosition=sourceRoot.position.clone(),rootRotation=sourceRoot.quaternion.clone();
      const limbs=['FL','FR','HL','HR'].map(label=>{const upper=gltf.scene.getObjectByName(`${label}_upper`) as Bone,lower=gltf.scene.getObjectByName(`${label}_lower`) as Bone,paw=gltf.scene.getObjectByName(`${label}_paw`) as Bone;
        const a=upper.getWorldPosition(new Vector3()).distanceTo(lower.getWorldPosition(new Vector3())),b=lower.getWorldPosition(new Vector3()).distanceTo(paw.getWorldPosition(new Vector3()));
        return {label,upper,lower,paw,a,b,previous:new Vector3(),previousRotation:new Quaternion(),holding:false,minimum:Infinity,maximum:-Infinity};});
      const mixer=new AnimationMixer(gltf.scene),hip=new Vector3(),knee=new Vector3(),paw=new Vector3(),rotation=new Quaternion();
      for(const left of [true,false]){
        const clip=gltf.animations.find(c=>c.name===`FelineTurn${left?'Left':'Right'}`);expect(clip,`${file} real turn clip`).toBeDefined();mixer.stopAllAction();const action=mixer.clipAction(clip!);action.play();action.paused=true;
        for(const limb of limbs){limb.holding=false;limb.minimum=Infinity;limb.maximum=-Infinity;}
        for(let frame=0;frame<240;frame++){
          const phase=frame/240;action.time=phase*clip!.duration;mixer.update(0);root.rotation.y=(left?1:-1)*phase*TURN_GAITS[chassis].arc/TURN_GAITS[chassis].duty;root.updateWorldMatrix(true,true);
          expect(sourceRoot.position.distanceTo(rootPosition)).toBeLessThan(1e-6);expect(sourceRoot.quaternion.angleTo(rootRotation)).toBeLessThan(1e-6);
          for(const limb of limbs){limb.upper.getWorldPosition(hip);limb.lower.getWorldPosition(knee);limb.paw.getWorldPosition(paw);limb.paw.getWorldQuaternion(rotation);
            expect(paw.toArray().every(Number.isFinite)).toBe(true);maxLengthError=Math.max(maxLengthError,Math.abs(hip.distanceTo(knee)-limb.a),Math.abs(knee.distanceTo(paw)-limb.b));
            const holding=turnPawSupport(chassis,limb.label,phase,left)>.999;
            if(holding&&limb.holding){maxStanceDrift=Math.max(maxStanceDrift,paw.distanceTo(limb.previous));expect(rotation.angleTo(limb.previousRotation)).toBeLessThan(.003);stanceSamples++;}
            limb.previous.copy(paw);limb.previousRotation.copy(rotation);limb.holding=holding;limb.minimum=Math.min(limb.minimum,paw.y);limb.maximum=Math.max(limb.maximum,paw.y);
          }
        }
        for(const limb of limbs)expect(limb.maximum-limb.minimum,`${file}/${limb.label} actual swing height`).toBeGreaterThan(.09);
      }
      mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
    }
    expect(stanceSamples).toBeGreaterThan(8000);expect(maxStanceDrift).toBeLessThan(.002);expect(maxLengthError).toBeLessThan(.000002);
  },15000);

  it('admits separately measured source armor compositions without rewriting older combat evidence',()=>{
    for(const [file,chassis,,radius,bot] of rigs){
      const name=file.replace('_Quadruped','').toLowerCase();
      const turn=JSON.parse(readFileSync(`assets/reference/turn-bounds-${name}.json`,'utf8')) as {turnStyle:{arc:number;duty:number;offsets:Record<string,number>};clips:{height:number;coreRadius:number;rootTranslation:number;rootRotation:number;limbLengthError:number;stanceCancellationError:number}[]};
      expect(turn.turnStyle.arc).toBe(TURN_GAITS[chassis].arc);expect(turn.turnStyle.duty).toBe(TURN_GAITS[chassis].duty);expect(turn.turnStyle.offsets).toEqual(TURN_GAITS[chassis].offsets);
      for(const c of turn.clips){expect(c.height).toBeLessThan(bot?SENTINEL_HEIGHT:QUADRUPED_HEIGHT);expect(c.coreRadius).toBeLessThan(radius+.025);expect(c.rootTranslation).toBeLessThan(1e-7);expect(c.rootRotation).toBeLessThan(1e-7);expect(c.limbLengthError).toBeLessThan(.000002);expect(c.stanceCancellationError).toBeLessThan(.000002);}
      const composed=JSON.parse(readFileSync(`assets/reference/turn-composition-${name}.json`,'utf8')) as {samples:number;coreRadius:number;coreHeight:number;limbLengthError:number};
      expect(composed.samples).toBe(540);expect(composed.coreRadius).toBeLessThan(radius+.025);expect(composed.coreHeight).toBeLessThan(bot?SENTINEL_HEIGHT:QUADRUPED_HEIGHT);expect(composed.limbLengthError).toBeLessThan(.000002);
    }
  });
});
