from pathlib import Path
import hashlib
r=Path(__file__).resolve().parents[2];source=r/'tools/overhaul-play-experience-057/capture.mjs'
s=source.read_text(encoding='utf8').replace('Experience057','Experience058CPU')
s=s.replace('let browser,context,page,phase=', 'let browser,context,page,profiler,phase=')
s=s.replace("const frames=page.evaluate", "profiler=await context.newCDPSession(page);await profiler.send('Profiler.enable');await profiler.send('Profiler.setSamplingInterval',{interval:1000});await profiler.send('Profiler.start');e.profileBeganMs=Date.now()-began;\n+ const frames=page.evaluate".replace('\n+','\n'))
s=s.replace("e.frames=await frames;e.status=", "e.frames=await frames;const cpu=await profiler.send('Profiler.stop');e.profileEndedMs=Date.now()-began;await writeFile(resolve(output,'cpu.json'),JSON.stringify(cpu.profile));await profiler.detach();profiler=null;e.status=")
s=s.replace('e.video=page?.video()', "if(profiler){try{const cpu=await profiler.send('Profiler.stop');await writeFile(resolve(output,'cpu-partial.json'),JSON.stringify(cpu.profile));await profiler.detach();}catch(error){e.profileCloseError=String(error);}}\n+ e.video=page?.video()".replace('\n+','\n'))
s=s.replace("scope:'ONE normal single connected Rainline pilot, Lowest/new feline rig, forward/back/side travel and upright transformation. Public UI/held keys only. Read-only sampled state, rAF timing not GPU timing or actual IAB qualification.'", "scope:'ONE unchanged039 steady CPU diagnostic, ordinary Lowest single connected pilot and held movement/twoR.1msCDP sampling changes timing; no baseline comparison, no FPS/GPU/IAB/camera/gait/mission approval. Public UI only and read-only state, own screenshots/video preserved.'")
out=Path(__file__).with_name('capture.mjs');assert not out.exists();out.write_text(s,encoding='utf8')
print(hashlib.sha256(out.read_bytes()).hexdigest())
