from pathlib import Path
import json,hashlib,urllib.request
r=Path(__file__).resolve().parents[2]
review=r/'docs/overhaul/critic/playability154-gameplay-review.md'
assert hashlib.sha256(review.read_bytes()).hexdigest()=='5cb77faa03efc0fbe61b312e93e98a63cf1401d9417e9652b6377330b62467fd'
assert 'RETAIN_LIMITED_SOURCE_PLAYABLE' in review.read_text(encoding='utf8')
b=r/'.sites-runtime/overhaul-20261009/build-058'
receipt=hashlib.sha256((b/'receipt.json').read_bytes()).hexdigest()
assert receipt=='34d18375f05622f2eedbc269419ede6359b843e3a23b62d38d772478563717cf'
health=json.load(urllib.request.urlopen('http://localhost:8799/health',timeout=5));assert health['rooms']==health['players']==0
html=urllib.request.urlopen('http://localhost:8799/',timeout=5).read()
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:
 assert meta in html;html=html.replace(meta,b'')
assert html==(b/'playable-root/dist/index.html').read_bytes()
out=b/'acceptance150.json';assert not out.exists()
out.write_text(json.dumps({'status':'RETAIN_LIMITED_SOURCE_PLAYABLE','receiptSHA256':receipt,'review':review.relative_to(r).as_posix(),'reviewSHA256':hashlib.sha256(review.read_bytes()).hexdigest(),'public':'http://localhost:8799/','ownedPID':367324,'trackedExecSession':20472,'httpIdentityVerified':True,'rollback':'build-056 preserved/stopped','incomplete':['convincing contact and fluid feline movement','detailed art','unsupported-action actual recovery','affected-client extreme Lowest lag','full cooperative lifecycle','full finite overhaul scope']},indent=2),encoding='utf8')
p=r/'docs/overhaul/resource-limit-handoff-20261010.md'
prefix='> CURRENT CONTINUATION150 CLOSED: RETAIN_LIMITED_SOURCE_PLAYABLE058 sole8799 PID367324/server20472, receipt34d18375f05622f2eedbc269419ede6359b843e3a23b62d38d772478563717cf. Actual154 bothrig movement/reversal/movingR visible, native13actor clock/pause/teardown completed; all699input hashes match. Independent critic5cb77faa03efc0fbe61b312e93e98a63cf1401d9417e9652b6377330b62467fd still DENYcontact/fluidmotion/art/fullscope; humanLowestlag unresolved. Explicit source154 contact-unqualified policy deliberately replaces rejected143. Failed147/152 preserved; co-op151 west checkpoint observed,153 blocked by ordinary opticalaim before exposure algorithm; wholemission incomplete, no replay. Exact docs/overhaul/player-playability-150-handoff.md controls. Sourceoverlay060 requires continuation-verification-060 VERIFIED, orderedparents through059 then060, NEVER028.056 rollback preserved/stopped,057 rejected. Allwriters/reviews/browserjobs CLOSED, only058 publicserver live. Full finitegoal ACTIVE/INCOMPLETE. Earlier entries historical.\n\n'
assert not p.read_text(encoding='utf8').startswith(prefix)
p.write_text(prefix+p.read_text(encoding='utf8'),encoding='utf8')
print('Limited058 acceptance saved separately; immutable receipt/source unchanged; current handoff pointer updated')
