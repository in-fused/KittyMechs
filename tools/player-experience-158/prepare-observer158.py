from pathlib import Path
import hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
p=r/'tools/player-playability-150/play154.mjs';assert hashlib.sha256(p.read_bytes()).hexdigest()=='8f90c670e0d83444e8fa50741e943767883823c5454b5129c2af98023dbb1f43'
s=p.read_text(encoding='utf8').replace('Playable154','Playable158').replace('playability154-public','playability158-public')
s=s.replace('ONE154 explicit contact-unqualified authored-source Solo candidate, ON/OFF source animation and worker lifecycle. Public10m camera/V plus ordinary side movement clears foreground beacon.','ONE158 source155 heading/phase/mount candidate, default6m ON/OFF plus ordinary side departure. Record current yaw/phase/mount and ON owner timing; OFF owner timing unavailable. No world contact qualification.')
s=s.replace("for(let i=0;i<4;i++)await slider.press('ArrowRight');",'')
s=s.replace('velocity:a.velocity,stance:a.stance','velocity:a.velocity,yaw:a.yaw,aimYaw:a.aimYaw,aimPitch:a.aimPitch,stance:a.stance')
s=s.replace("await segment('on-beacon-departure',['KeyD'],1400,true);await gait('on');","await segment('on-beacon-departure',['KeyD'],1400,true);await gait('on');await page.keyboard.press('KeyJ',{delay:70});await segment('on-look-facing-probe',[],500);await page.keyboard.press('KeyL',{delay:70});await segment('on-look-facing-return',[],500);")
s=s.replace("['KeyW','KeyS','KeyA','Space']","['KeyW','KeyS','KeyA','KeyD','KeyC','KeyJ','KeyL','KeyR','KeyF','Space']")
target=h/'play158.mjs';assert not target.exists();target.write_text(s,encoding='utf8');print('ONE158 default6/nativeyaw/owner timing observer created; UNRUN pending independent observer review')
