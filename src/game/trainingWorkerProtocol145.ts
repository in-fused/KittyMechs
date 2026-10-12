import type {Chassis,GameSnapshot,InputState} from '../../shared/types';
export interface TrainingOptions145 {seed:number;room:string;id:string;name:string;chassis:Chassis;}
export type TrainingRequest145=
 |{kind:'start';generation:number;inputVersion:number;layoutVersion:string;options:TrainingOptions145}
 |{kind:'input';generation:number;input:InputState}
 |{kind:'pause';generation:number;paused:boolean}
 |{kind:'stop';generation:number};
export interface TrainingMetrics145 {nativeTick:number;nativeTime:number;actors:number;paused:boolean;workerWall:number;completedTicks:number;totalStepMs:number;maxStepMs:number;frames:readonly {tick:number;time:number;stepMs:number}[];}
export type TrainingReply145=
 |{kind:'ready'|'snapshot';generation:number;state:GameSnapshot;metrics?:TrainingMetrics145}
 |{kind:'failure';generation:number;message:string};

/** Independent worker wall clock; every accepted tick is the original1/60.
 * Bounded turns yield to input/pause messages without discarding pending ticks.
 * Pause retires wall-time debt so resuming never simulates the paused interval. */
export class TrainingClock145 {
 private at:number;private debt=0;private paused=false;
 constructor(now:number){this.at=now;}
 setPaused(paused:boolean,now:number){this.paused=paused;this.at=now;this.debt=0;}
 pump(now:number,step:()=>void):number {
  const elapsed=Math.max(0,now-this.at);this.at=now;if(this.paused)return 0;this.debt+=elapsed;
  let count=0;while(this.debt+1e-9>=1000/60&&count<4){step();this.debt-=1000/60;count++;}return count;
 }
 wait():number{return this.paused?100:Math.max(0,1000/60-this.debt);}
}
