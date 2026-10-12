import {runtime} from '../runtime';
import {useGameStore} from '../../state/store';
import {advanceEffectClock,areaArenaKey,createEffectClock} from './areaTimeline';
const clock=createEffectClock();
/** Shared monotonic cosmetic clock for this admitted arena. Native lifetime
 * membership still controls visual admission; no render clock mutates gameplay. */
export function readEffectTime():number {
  const snap=runtime.snapshot;if(!snap){clock.key='';clock.snapshotTime=-Infinity;clock.time=0;return 0;}
  return advanceEffectClock(clock,areaArenaKey(runtime.generation,snap),snap.time,runtime.authority?runtime.sim?.time:undefined,(performance.now()-runtime.receivedAt)/1000,runtime.transport==='training'&&useGameStore.getState().phase==='paused');
}
