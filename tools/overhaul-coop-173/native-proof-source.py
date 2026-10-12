from pathlib import Path
p=Path('tools/overhaul-coop-173/motion-scheduler.mjs');t=p.read_text();t=t.replace('!Number.isSafeInteger(n.nativeStepTick)||![a.position.x',"!Number.isSafeInteger(n.nativeStepTick)||n.nativeStepTick<0||n.nativeStepTick>s.tick||n.phase!=='current-native-readback'||!n.worldId||!n.hull||![n.hull.position.x,n.hull.position.y,n.hull.position.z,n.hull.handle].every(Number.isFinite)||![a.position.x")
p.write_text(t)
p=Path('tools/overhaul-coop-173/phased.test.mjs');t=p.read_text().replace('a.nativePose={enabled:false,actorId:a.id','a.nativePose={...a.nativePose,enabled:false,actorId:a.id');p.write_text(t)
