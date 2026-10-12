import type { CombatEvent } from '../../shared/types';
import { useGameStore } from '../state/store';
class GameAudio {
  private context:AudioContext|null=null;
  private buffers=new Map<string,AudioBuffer>();
  private lastPulse=-Infinity;
  resetRound(){this.lastPulse=-Infinity;}
  async unlock(){
    if(!this.context)this.context=new AudioContext();await this.context.resume();
    for(const name of ['S_Impact','S_Boost','S_Objective','S_Danger'])if(!this.buffers.has(name))fetch(`/assets/audio/${name}.wav`).then(r=>r.arrayBuffer()).then(b=>this.context!.decodeAudioData(b)).then(b=>this.buffers.set(name,b)).catch(()=>{});
  }
  private sample(name:string,gain:number){const ctx=this.context,buffer=this.buffers.get(name),level=gain*useGameStore.getState().settings.volume;if(!ctx||!buffer||level<=0)return;const source=ctx.createBufferSource(),volume=ctx.createGain();source.buffer=buffer;volume.gain.value=level;source.connect(volume);volume.connect(ctx.destination);source.start();source.onended=()=>{source.disconnect();volume.disconnect();};}
  private tone(freq:number,duration:number,gain:number){const ctx=this.context,level=gain*useGameStore.getState().settings.volume;if(!ctx||ctx.state!=='running'||level<=0)return;const osc=ctx.createOscillator(),volume=ctx.createGain();osc.type='sawtooth';osc.frequency.setValueAtTime(freq,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(35,ctx.currentTime+duration);volume.gain.setValueAtTime(level,ctx.currentTime);volume.gain.exponentialRampToValueAtTime(Math.min(.001,level*.01),ctx.currentTime+duration);osc.connect(volume);volume.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration);osc.onended=()=>{osc.disconnect();volume.disconnect();};}
  event(e:CombatEvent,local:string){
    if(e.type==='shot'&&e.actor===local){if(e.weapon==='rocket')this.tone(180,.3,.2);else if(e.at-this.lastPulse>.08){this.tone(130,.06,.1);this.lastPulse=e.at;}}
    if(e.type==='impact'&&e.target===local)this.sample('S_Impact',.45);
    // Only an authoritative physical contact without a projectile weapon gives
    // the attacker this cue; anticipation and particles cannot fabricate a hit.
    if(e.type==='impact'&&e.actor===local&&e.target!==local&&!e.weapon)this.sample('S_Impact',.2);
    if(e.type==='structure-hit'&&e.actor===local)this.tone(115,.09,.025);
    if(e.type==='structure-break'&&e.actor===local){this.tone(65,.45,.1);this.sample('S_Impact',.18);}
    if(e.type==='explosion'||e.type==='death')this.tone(90,.5,.12);
    if(e.type==='cover-break'){this.tone(65,.55,.16);this.sample('S_Impact',.22);}
    if(e.type==='climb'&&e.actor===local)this.tone(240,.08,.035);
    if(e.type==='capture')this.sample('S_Objective',.55);
    if(e.type==='supply'&&e.actor===local){this.tone(e.supplyKind==='repair'?420:e.supplyKind==='energy'?520:280,.24,.045);this.sample('S_Objective',.2);}
    if(e.type==='checkpoint')this.tone(440,.35,.035);
    if(e.type==='pounce'&&e.actor===local)this.sample('S_Boost',.4);
    if(e.type==='repair'&&e.actor===local)this.sample('S_Objective',.35);
    if(e.type==='transform'&&e.actor===local){this.tone(360,.45,.065);this.sample('S_Boost',.2);}
    if(e.type==='area'&&e.actor===local)this.tone(e.effect==='snare'?320:e.effect==='shield'?160:240,.32,.075);
  }
}
export const audio=new GameAudio();
