from pathlib import Path
import json,hashlib,sys
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
mode=sys.argv[1];assert mode in ['syntax','public']
review=r/'docs/overhaul/critic/coop111-source-review.md';assert 'APPROVE' in review.read_text(encoding='utf8') and 'CLOSED' in review.read_text(encoding='utf8')
paths={p for n in ['tools/overhaul-coop-integration-111'] for p in (r/n).rglob('*') if p.is_file() and not p.name.endswith('-seal.json') and '__pycache__' not in p.parts}
source=json.loads((r/'tools/overhaul-coop-integration-111/source-seal.json').read_text());assert source['writer']=='CLOSED'
for x in source['files']:assert row(r/x['path'])['sha256']==x['sha256'];paths.add(r/x['path'])
paths.update(r/p for p in ['tools/overhaul-coop-integration-111/source-seal.json','tools/overhaul-root-round-027/run-seal.py','tools/overhaul-root-round-033/run-mission-seal045.py','tools/overhaul-play-ready.mjs','package.json','package-lock.json']);paths.add(review)
root=r/'.sites-runtime/overhaul-20261009/build-051';assert row(root/'receipt.json')['sha256']=='671036323a86d63b5b65bbf66dc74f239079bd2f7d27d4d08833cf5d45576b4a';paths.add(root/'receipt.json');protected=[row(root/'playable-root'/x['path']) for x in json.loads((root/'receipt.json').read_text())['files']]
if mode=='public':
 p=r/'.sites-runtime/overhaul-20261010/coop111-syntax/process-receipt.json';v=json.loads(p.read_text());assert v['exitCode']==0 and v['failure'] is None and all(x['match'] for x in v['inputsAfter']);paths.add(p);paths.add(r/'.sites-runtime/overhaul-20261010/coop111-preflight.json')
p=h/(mode+'-seal.json');assert not p.exists();p.write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'protected':protected,'command':['python','tools/overhaul-coop-integration-111/launch.py',mode],'scope':'ONE new111 public two-client checkpoint/revive/retry/fullmission observation, no build/game mutation/repeat. Unexpected firstfailureSTOP; planned enemy defeat is a bounded required mechanic phase only.'},indent=2));print(mode+' sealed')


