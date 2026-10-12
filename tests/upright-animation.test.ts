import {texturelessGeometryGlb} from '../tools/textureless-geometry-glb';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {AnimationMixer,Bone,Group,Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {ACTOR_RADII,MECHS,UPRIGHT_HEIGHT} from '../shared/config';
import {createUprightMotion,uprightPawSupport,UPRIGHT_GAITS} from '../src/game/entities/felineMotion';

describe('shipping original upright locomotion',()=>{
  it('contains actual longer rigid stance sweeps, raised swing feet and zero-root signed turn steps',async()=>{
    let supportSamples=0,maxCancellation=0,maxLengthError=0;
    for(const chassis of ['pounce','bastion','lynx','caracal'] as const){
      const bytes=readFileSync(`public/assets/models/${MECHS[chassis].model}.glb`),gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(bytes),'');
      expect(gltf.animations).toHaveLength(32);
      const root=new Group(),body=new Group();root.add(body);body.add(gltf.scene);body.rotation.y=Math.PI;body.scale.setScalar(MECHS[chassis].scale);
      const mixer=new AnimationMixer(gltf.scene),sourceRoot=gltf.scene.getObjectByName('root') as Bone;
      const bones=['HL','HR'].map(label=>({label,upper:gltf.scene.getObjectByName(`${label}_upper`) as Bone,lower:gltf.scene.getObjectByName(`${label}_lower`) as Bone,paw:gltf.scene.getObjectByName(`${label}_paw`) as Bone,a:0,b:0,previous:new Vector3(),holding:false,minY:Infinity,maxY:-Infinity}));
      const hip=new Vector3(),knee=new Vector3(),paw=new Vector3(),pelvis=new Vector3(),profile=UPRIGHT_GAITS[chassis];
      for(const [index,name] of ['WalkLong','Stride','TurnLeft','TurnRight'].entries()){
        const clip=gltf.animations.find(c=>c.name===`FelineUpright${name}`);expect(clip).toBeDefined();mixer.stopAllAction();const action=mixer.clipAction(clip!);action.play();action.paused=true;
        for(const limb of bones){limb.holding=false;limb.minY=Infinity;limb.maxY=-Infinity;}
        let pelvisLow=Infinity,pelvisHigh=-Infinity;
        const pose=createUprightMotion();pose.idle=0;if(index===0)pose.walk=1;else if(index===1)pose.stride=1;else{pose.turn.weight=1;pose.turn.left=index===2?1:0;}
        for(let frame=0;frame<240;frame++){
          const phase=frame/240;pose.phase=pose.turn.phase=phase;action.time=phase*clip!.duration;
          root.position.z=index<2?-phase*profile.strides[index]*MECHS[chassis].scale/profile.duties[index]:0;root.rotation.y=index<2?0:(index===2?1:-1)*phase*profile.arc/profile.turnDuty;
          mixer.update(0);root.updateWorldMatrix(true,true);
          expect(sourceRoot.position.length()).toBeLessThan(1e-7);expect(sourceRoot.quaternion.angleTo(sourceRoot.quaternion.clone().identity())).toBeLessThan(1e-7);
          gltf.scene.getObjectByName('pelvis')!.getWorldPosition(pelvis);pelvisLow=Math.min(pelvisLow,pelvis.y);pelvisHigh=Math.max(pelvisHigh,pelvis.y);
          for(const limb of bones){limb.upper.getWorldPosition(hip);limb.lower.getWorldPosition(knee);limb.paw.getWorldPosition(paw);
            if(frame===0){limb.a=hip.distanceTo(knee);limb.b=knee.distanceTo(paw);}
            maxLengthError=Math.max(maxLengthError,Math.abs(hip.distanceTo(knee)-limb.a),Math.abs(knee.distanceTo(paw)-limb.b));
            expect(hip.distanceTo(paw)/(limb.a+limb.b)).toBeLessThan(.98);expect(paw.toArray().every(Number.isFinite)).toBe(true);
            const holding=uprightPawSupport(chassis,limb.label,pose)>.999;
            if(holding&&limb.holding){maxCancellation=Math.max(maxCancellation,paw.distanceTo(limb.previous));supportSamples++;}
            limb.previous.copy(paw);limb.holding=holding;limb.minY=Math.min(limb.minY,paw.y);limb.maxY=Math.max(limb.maxY,paw.y);
          }
        }
        expect(pelvisHigh-pelvisLow).toBeGreaterThan(.015);for(const limb of bones)expect(limb.maxY-limb.minY).toBeGreaterThan(.09);
      }
      mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
    }
    expect(supportSamples).toBeGreaterThan(4000);expect(maxCancellation).toBeLessThan(.003);expect(maxLengthError).toBeLessThan(.000002);
  },15000);
  it('uses separately measured tracked source core/rigid evidence without replacing prior admitted poses',()=>{
    for(const c of ['pounce','bastion','lynx','caracal'] as const){
      const standalone=JSON.parse(readFileSync(`assets/reference/upright-locomotion-bounds-${c}.json`,'utf8')) as {profile:{strides:number[];duties:number[]};clips:{height:number;coreRadius:number;floor:number;limbLengthError:number;maxSupportReach:number;rootTranslation:number;rootRotation:number}[]};
      expect(standalone.profile.strides).toEqual(UPRIGHT_GAITS[c].strides);expect(standalone.profile.duties).toEqual(UPRIGHT_GAITS[c].duties);expect(standalone.clips).toHaveLength(4);
      for(const p of standalone.clips){expect(p.height).toBeLessThan(UPRIGHT_HEIGHT);expect(p.coreRadius).toBeLessThan(ACTOR_RADII[c]);expect(p.floor).toBeGreaterThan(0);expect(p.limbLengthError).toBeLessThan(.000002);expect(p.maxSupportReach).toBeLessThan(.98);expect(p.rootTranslation+p.rootRotation).toBe(0);}
      const composed=JSON.parse(readFileSync(`assets/reference/upright-locomotion-composition-${c}.json`,'utf8')) as {samples:number;coreRadius:number;coreHeight:number;coreFloor:number;limbLengthError:number;maxHindReach:number;rootTranslation:number;rootRotation:number};
      expect(composed.samples).toBe(648);expect(composed.coreRadius).toBeLessThan(ACTOR_RADII[c]);expect(composed.coreHeight).toBeLessThan(UPRIGHT_HEIGHT);expect(composed.coreFloor).toBeGreaterThan(0);expect(composed.limbLengthError).toBeLessThan(.000002);expect(composed.maxHindReach).toBeLessThan(.98);expect(composed.rootTranslation+composed.rootRotation).toBe(0);
    }
  });
});
