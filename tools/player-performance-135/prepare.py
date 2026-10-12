from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
prior=r/'.sites-runtime/overhaul-20261009/build-054'
assert sha(prior/'receipt.json')=='a01b5b3b633d1897b39f0946e0b3fe89868a1b11428214c0a5d6020c2849a524'
source=r/'tools/player-integration-134'
capture=(source/'capture.mjs').read_text().replace('Contact134','Motion135').replace('integrated contact132 reversal/moving-R review','movement-cost candidate regression review')
capture=capture.replace('hp:a.hp,stance:a.stance','hp:a.hp,stance:a.stance,nativePose:a.nativePose')
capture=capture.replace("await segment('final-idle',[],650);", "await segment('final-idle',[],650);await segment('quad-turn-left',['KeyA'],900);await segment('quad-turn-right',['KeyD'],900);")
# The same public route/controls and owner contract are retained. This is a
# regression capture; it cannot certify the affected client's performance.
(h/'capture.mjs').write_text(capture)
launch=(source/'launch.py').read_text().replace('build-054','build-055').replace('player-integration-134','player-performance-135').replace('contact134-public','motion135-public')
(h/'launch.py').write_text(launch)
freeze=(source/'freeze054.py').read_text().replace("build-053","build-054").replace("build-054'\n", "build-055'\n",1)
# Explicit original/new path binding, independent of replacement ordering.
freeze=freeze.replace("old=r/'.sites-runtime/overhaul-20261009/build-054';new=r/'.sites-runtime/overhaul-20261009/build-055'", "old=r/'.sites-runtime/overhaul-20261009/build-054';new=r/'.sites-runtime/overhaul-20261009/build-055'")
freeze=freeze.replace('77df6f7e6f94672ce94eb16299d0613b6efbd569e87f722dcc0cb498e8f7e259','a01b5b3b633d1897b39f0946e0b3fe89868a1b11428214c0a5d6020c2849a524')
freeze=freeze.replace('src/game/entities/movingRFfeet067.ts','shared/ownedCharacterMotion.ts').replace('overhaul-contact-132','overhaul-performance-135')
freeze=freeze.replace('UNADMITTED054 contact132 acquisition/retirement lifecycle;053 anatomy/gait and nativegame retained.', 'UNADMITTED055 within-query movement-cost candidate;054 anatomy/gait and nativegame retained.')
(h/'freeze055.py').write_text(freeze)
seal=(source/'prepare-play.py').read_text().replace('build-054','build-055').replace("['movement','mission']","['movement']").replace("['overhaul-contact-132','overhaul-coop-133']","['overhaul-performance-135']").replace('integration134-source-review.md','performance135-source-review.md').replace('frozen054','frozen055')
seal=seal.replace("'tools/player-integration-134/'", "'tools/player-performance-135/'")
seal=seal.replace("Movement90root80inclusive; mission480root450inclusive.", "Movement90root80inclusive. No mission retry.")
(h/'prepare-play.py').write_text(seal)
print('Prepared one movement regression observation and one frozen candidate; neither run.')
