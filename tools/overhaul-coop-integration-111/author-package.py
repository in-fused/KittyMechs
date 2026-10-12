"""111 metadata/import route correction only; never runs observation or game jobs."""
from pathlib import Path
import hashlib,json
R=Path(__file__).resolve().parents[2];H=Path(__file__).resolve().parent
OLD='a7f4259eaa7f8398b9bd68bcf7302905195981ff283e6e04ae72e2a6da70abfe';NEW='671036323a86d63b5b65bbf66dc74f239079bd2f7d27d4d08833cf5d45576b4a'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(R).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
old=R/'tools/overhaul-coop-controller-103'
for name in ['controller.mjs','mission-capture.mjs']:
 text=(old/name).read_text(encoding='utf8').replace('103','111').replace(OLD,NEW)
 if name=='mission-capture.mjs':
  text=text.replace("origin+'/?debug=1&overhaul=1'","origin+'/?debug=1'").replace("url.searchParams.set('overhaul','1');","url.searchParams.delete('overhaul');")
 assert OLD not in text and '20261010' in text if name=='mission-capture.mjs' else OLD not in text
 (H/name).write_text(text,encoding='utf8')
for name in ['prepare.py','preflight.py','launch.py']:
 text=(R/'tools/overhaul-coop-integration-107'/name).read_text(encoding='utf8').replace('overhaul-coop-controller-103','overhaul-coop-integration-111').replace('overhaul-coop-integration-107','overhaul-coop-integration-111').replace('coop107','coop111').replace('build-050','build-051').replace('7fb23695439b41446cfb120174ffde92c13091e9506fff3ab56142eeaea19c76',NEW).replace('HTTP050','HTTP051').replace('050 verified','051 verified').replace('new103','new111')
 text=text.replace("['tools/overhaul-coop-integration-111','tools/overhaul-coop-integration-111']","['tools/overhaul-coop-integration-111']")
 (H/name).write_text(text,encoding='utf8')
receipt=R/'.sites-runtime/overhaul-20261009/build-051/receipt.json';assert row(receipt)['sha256']==NEW
deps=json.loads((old/'source-handoff.json').read_text())['dependencies'];dependencies=[]
for d in deps:
 p=R/d['path']
 if 'build-049' in d['path']:p=receipt
 current=row(p)
 if d['path'].startswith(('shared/','src/','package')):
  frozen=receipt.parent/'playable-root'/d['path'];assert row(frozen)['sha256']==current['sha256'],('CURRENT_FROZEN051_SOURCE_MISMATCH',d['path'])
  current['frozenPath']=frozen.relative_to(R).as_posix()
 dependencies.append(current)
protected=[row(old/n) for n in ['controller.mjs','mission-capture.mjs','source-seal.json','source-handoff.json','HANDOFF.md']]
protected.extend(row(R/'tools/overhaul-coop-integration-107'/n) for n in ['prepare.py','preflight.py','launch.py'])
for p in ['src/game/entities/identity57Runtime005.ts','src/game/entities/identity57Runtime106Manifest.json','src/game/entities/identity57Runtime106Asset.ts','src/game/entities/identity57Runtime034Actor.tsx','src/game/GameCanvas.tsx','src/game/camera/CameraRig.tsx']:
 current=row(R/p);frozen=receipt.parent/'playable-root'/p;assert current['sha256']==row(frozen)['sha256'];current['frozenPath']=frozen.relative_to(R).as_posix();dependencies.append(current)
handoff={'writer':'CLOSED','status':'SOURCE_READY_SYNTAX_PENDING_PUBLIC_UNRUN','requiredReceipt':NEW,'origin':'http://localhost:8799','publicEntry':'http://localhost:8799/?debug=1','serverPID':349380,'serverSession':13822,'bounds':{'workMs':420000,'cleanupMs':30000,'inclusiveMs':450000,'supervisorMs':480000,'readinessMs':20000},'onlyChanges':['Receipt051/import path/observer identity/output metadata and plain public URL','Current dependency hashes matched frozen051; all gameplay/ACK/retry/assertion/time/tolerance code preserved'],'dependencies':dependencies,'protected':protected,'rootCommand':['node','--import','tsx','tools/overhaul-coop-integration-111/mission-capture.mjs','.sites-runtime/overhaul-20261010/coop111-public'],'lateJoin':'Not added: would alter preserved103 two-client flow; remains unqualified','scope':'ONE complete ordinary public mission; mandatory organic down/revive, real AI squad failure/rising-E checkpoint retry, all objectives/alive3Dextract/win/exact publication parity. Full goal INCOMPLETE.'}
(H/'source-handoff.json').write_text(json.dumps(handoff,indent=2)+'\n',encoding='utf8')
print(json.dumps({'receipt':NEW,'dependencies':len(dependencies),'protected':len(protected)}))
