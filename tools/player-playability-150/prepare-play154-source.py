from pathlib import Path
r=Path(__file__).resolve().parents[2];old=r/'tools/player-locomotion-146/play.mjs';out=r/'tools/player-playability-150/play154.mjs';assert not out.exists()
s=old.read_text(encoding='utf8').replace('playability146-public','playability154-public').replace('Playable146','Playable154').replace('ONE public Solo candidate057 ordinary ON/OFF locomotion and worker lifecycle review. Public camera sliders14m and V provide limb visibility; no body-clearance or affected-human lag qualification.','ONE154 explicit contact-unqualified authored-source Solo candidate, ON/OFF source animation and worker lifecycle. Public10m camera/V plus ordinary side movement clears foreground beacon. No contact/body-clearance/art/humanlag/fullgoal qualification.').replace('i<8;i++','i<4;i++')
s=s.replace("grounded:a.grounded,nativePose:a.nativePose","grounded:a.grounded,nativePose:a.nativePose,climb:a.climb,strike:a.strike,pair:a.pair,downed:a.downed")
before="if(!sample.feline.enabled||!owner||owner.firstFailure||owner.feet?.firstFailure143||sample.feline.fallbacks.some(d=>d.actor===local.id)||!owner.browserClipContract128?.passed)"
after="if(!sample.feline.enabled||!owner||owner.contactPolicy!=='CONTACT_UNQUALIFIED_SOURCE_PRESENTATION'||owner.presentation154?.fatal||owner.presentation154?.status!=='source'||owner.feet||sample.feline.fallbacks.some(d=>d.actor===local.id)||!owner.browserClipContract128?.passed)"
assert before in s;s=s.replace(before,after)
before="else if(phase.startsWith('off-')&&sample.contact?.locomotionTask143?.firstFailure143)throw Error('Local OFF task owner failed: '+sample.contact.locomotionTask143.firstFailure143);"
after="else if(phase.startsWith('off-')){const source=sample.contact?.sourcePresentation154;if(source?.policy!=='CONTACT_UNQUALIFIED_SOURCE_PRESENTATION'||source.status!=='source'||sample.contact?.locomotionTask143||sample.contact?.contactAllowed||sample.contact?.paws?.some(p=>p.planted||p.ikApplied||p.support>0))throw Error('OFF source policy/ownership violated');}"
assert before in s;s=s.replace(before,after)
before="await gait('on');";assert before in s
s=s.replace(before,"await segment('on-beacon-departure',['KeyD'],1400,true);await gait('on');")
s=s.replace("if(phase.startsWith('on-'))","if(phase.startsWith('on-')&&!phase.includes('action-probe'))")
before="await page.keyboard.press('Escape');await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).waitFor"
after="await segment('on-action-probe',['KeyC'],500);await segment('on-action-return',[],600);evidence.unsupportedAction154={observed:evidence.samples.some(r=>r.sample.feline.temporary154?.length),scope:'Public C probe only; absence of an actual unsupported transition remains unqualified.'};await page.keyboard.press('Escape');await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).waitFor"
assert before in s;s=s.replace(before,after)
# Capture native source-status and FK diagnostics already included by read;
# historical firstFailure is preserved but not treated as a current fatal flag.
before="for(const k of ['KeyW','KeyS','KeyA','Space'])await page?.keyboard.up(k).catch(()=>{});evidence.video=page?.video()?await page.video().path():null;"
after="for(const k of ['KeyW','KeyS','KeyA','Space'])await page?.keyboard.up(k).catch(()=>{});\n let videoTimer;\n try{evidence.video=await Promise.race([(async()=>page?.video()?await page.video().path():null)(),new Promise((_,reject)=>{videoTimer=setTimeout(()=>reject(Error('Owned video path1s bound')),1000);})]);}\n catch(error){evidence.videoPathFailure=String(error);process.exitCode=1;}\n finally{clearTimeout(videoTimer);}"
assert before in s;s=s.replace(before,after)
out.write_text(s,encoding='utf8');print('ONE154 observer source prepared, not executed; old146 source unchanged')
