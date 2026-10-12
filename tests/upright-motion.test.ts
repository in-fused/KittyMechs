import {describe,expect,it} from 'vitest';
import {MECHS,UPRIGHT} from '../shared/config';
import {createUprightMotion,pawSupport,gaitWeights,uprightMotion,uprightPawSupport,UPRIGHT_GAITS} from '../src/game/entities/felineMotion';

const chassis=['pounce','bastion','lynx','caracal'] as const;
describe('realized original upright footfalls',()=>{
  it('reduces full-speed cadence through longer reachable sweeps rather than a playback cap',()=>{
    const old=[10.24,5.89474,13.80661,8.32882];
    for(const [i,c] of chassis.entries()){
      const profile=UPRIGHT_GAITS[c],top=MECHS[c].speed*UPRIGHT[c].speed,cycle=profile.strides[1]*MECHS[c].scale/profile.duties[1],out=createUprightMotion();
      for(let frame=0;frame<120;frame++)uprightMotion(c,0,0,top,top,MECHS[c].scale,1,1/60,true,false,out);
      expect(out.stride).toBeGreaterThan(.999);const before=out.phase;
      uprightMotion(c,cycle*.1,0,top,top,MECHS[c].scale,1,1/60,true,false,out);
      expect(out.phase-before).toBeCloseTo(.1,6);expect(2*top/cycle).toBeLessThan(old[i]*.65);
      const stopped=out.phase;for(let frame=0;frame<120;frame++)uprightMotion(c,0,0,0,top,MECHS[c].scale,1,1/60,true,false,out);
      expect(out.phase).toBe(stopped);expect(out.idle).toBeGreaterThan(.999);expect(uprightPawSupport(c,'HL',out)).toBe(1);
    }
  });
  it('gives Lynx actual brief double release while Bastion retains deliberate double support',()=>{
    let lynxFlight=0,bastionFlight=0;
    for(let frame=0;frame<1000;frame++)for(const c of ['lynx','bastion'] as const){const out=createUprightMotion();out.idle=0;out.stride=1;out.phase=frame/1000;
      if(uprightPawSupport(c,'HL',out)===0&&uprightPawSupport(c,'HR',out)===0){if(c==='lynx')lynxFlight++;else bastionFlight++;}
      expect(uprightPawSupport(c,'FL',out)).toBe(0);
    }
    expect(lynxFlight).toBeGreaterThanOrEqual(80);expect(lynxFlight).toBeLessThan(90);expect(bastionFlight).toBe(0);
  });
  it('releases any contributing lifted limb across idle, slow/fast and mirrored turn mixtures',()=>{
    const idle=gaitWeights(0,8,true);
    for(const c of chassis){const out=createUprightMotion();out.phase=.48;out.walk=.4;out.stride=.6;out.idle=0;
      const fast=createUprightMotion();fast.phase=out.phase;fast.stride=1;fast.idle=0;
      for(const limb of ['HL','HR'])expect(uprightPawSupport(c,limb,out)).toBeLessThanOrEqual(uprightPawSupport(c,limb,fast));
      out.walk=.02;out.stride=0;out.idle=.98;out.phase=.9;expect(uprightPawSupport(c,'HL',out)).toBe(0);
      out.turn.weight=1;out.turn.left=.5;out.turn.phase=.9;
      for(const limb of ['HL','HR'])expect(pawSupport(c,limb,0,idle,true,undefined,true,out)).toBe(uprightPawSupport(c,limb,out));
      expect(uprightPawSupport(c,'HL',out)).toBe(0);expect(uprightPawSupport(c,'HR',out)).toBe(0);
    }
  });
  it('steps at zero translation with signed actual angular travel, freezes a held heading and resets excluded states',()=>{
    for(const c of chassis){const out=createUprightMotion(),p=UPRIGHT_GAITS[c];
      uprightMotion(c,0,.1,0,5,MECHS[c].scale,1,1/60,true,false,out);
      expect(out.turn.phase).toBeCloseTo(.1*p.turnDuty/p.arc);expect(out.phase).toBe(0);
      const held=out.turn.phase;for(let i=0;i<120;i++)uprightMotion(c,0,0,0,5,MECHS[c].scale,1,1/60,true,false,out);
      expect(out.turn.phase).toBe(held);expect(out.turn.weight).toBe(0);
      uprightMotion(c,0,-.1,0,5,MECHS[c].scale,1,1/60,true,false,out);expect(out.turn.left).toBe(0);
      for(const gate of [{allowed:true,reset:true},{allowed:false,reset:false}]){uprightMotion(c,.5,.2,4,5,MECHS[c].scale,1,1/60,gate.allowed,gate.reset,out);expect(out).toEqual(createUprightMotion());}
    }
  });
  it('keeps weight sums and traveled phase continuous under taps, reversals and analog speed changes',()=>{
    for(const c of chassis){const out=createUprightMotion(),top=MECHS[c].speed*UPRIGHT[c].speed;
      for(let frame=0;frame<1200;frame++){const speed=frame%180<30?0:top*(.5+.5*Math.sin(frame*.021));
        uprightMotion(c,speed/60,frame%60<10?.02:-.01,speed,top,MECHS[c].scale,frame%300<150?1:-1,1/60,true,false,out);
        expect(out.idle+out.walk+out.stride).toBeCloseTo(1);expect(Math.min(out.idle,out.walk,out.stride)).toBeGreaterThanOrEqual(0);
        expect(out.phase).toBeGreaterThanOrEqual(0);expect(out.phase).toBeLessThan(1);
        expect(Number.isFinite(uprightPawSupport(c,'HL',out))).toBe(true);
      }
    }
  });
});
