from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];source=r/'tools/overhaul-coop-play-045/mission-capture.mjs'
assert hashlib.sha256(source.read_bytes()).hexdigest()=='f3fbe390f3d96a21b3ad803473ee82ab2ca0f8c28a380a598b9806243eee93c8'
s=source.read_text().replace('045','053').replace('frozen build036','frozen build037').replace("const captureMode='host';","const captureMode='both';").replace('guestVideoSize:null','guestVideoSize:recordVideo.size').replace('evidence.guestVideo=null','evidence.guestVideo=guest.video()?await guest.video().path():null')
for stage in ['west','east','core','extraction']:
 old="await host.screenshot({path:resolve(output,'route-"+stage+".png')});"
 s=s.replace(old,old+"await guest.screenshot({path:resolve(output,'guest-route-"+stage+".png')});")
s=s.replace("await host.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});","await host.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});await guest.screenshot({path:resolve(output,'failure-guest.png')}).catch(()=>{});")
s=s.replace('Math.hypot(a.position.x+8,a.position.z-12)>=4.5','Math.hypot(a.position.x+8,a.position.y-1,a.position.z-12)>=4.5')
out=r/'tools/overhaul-coop-play-053';out.mkdir(exist_ok=False);p=out/'mission-capture.mjs';p.write_text(s)
o={'baselineSourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'candidateSourceSHA256':hashlib.sha256(p.read_bytes()).hexdigest(),'scope':'One conditional new037 squad-extraction052 candidate publicmission. Same045 control/readiness20s/work420s/cleanup30s/root480s bounds and no injected native state. New both-own videos and screenshots correct missing guestpixels. Finalcompletion uses actorcenter3D reach. No replay/enlargedlimits of failed045 or046.'}
(out/'observer-handoff.json').write_text(json.dumps(o,indent=2));print(json.dumps(o))
