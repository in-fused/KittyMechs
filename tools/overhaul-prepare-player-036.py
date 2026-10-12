from pathlib import Path
p=Path(__file__).with_name('overhaul-art-player-036.mjs');s=p.read_text(encoding='utf8')
s=s.replace('170000','140000').replace('Cumulative170s','Cumulative140s')
begin=s.index(' const protectionEndsAfter=');end=s.index(" await aim('peer');",begin)
a=""" const observedGuest=await read(guest),guestActor=observedGuest.snapshot.actors.find(a=>a.name==='PreviewGuest');if(!guestActor||guestActor.lastInput<=0||guestActor.hp<=0||guestActor.pair)throw Error('Guest first native input not admitted');const protectionEndsAfter=observedGuest.snapshot.time+2.5;evidence.spawnProtectionWait={actor:guestActor.id,life:guestActor.jumpEpoch,lastInput:guestActor.lastInput,observedNativeTime:observedGuest.snapshot.time,conservativeUntil:protectionEndsAfter};await wait('same-life native guest protection expires',s=>{const g=s.b;if(!g||g.id!==guestActor.id||g.jumpEpoch!==guestActor.jumpEpoch||g.hp<=0||g.pair)throw Error('Guest protection wait lifecycle changed');return s.r.snapshot.time>=protectionEndsAfter;},5000);await sample('actual admitted guest input and native time beyond protection');
"""
s=s[:begin]+a+s[end:];p.write_text(s,encoding='utf8')
