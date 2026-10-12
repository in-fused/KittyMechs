from pathlib import Path
import hashlib,json,sys
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
a=r/'tools/overhaul-coop-play-076';review=r/'docs/overhaul/critic/coop076-source-review.md'
assert review.exists() and 'APPROVE' in review.read_text(encoding='utf8')
paths={p for p in a.rglob('*') if p.is_file()};paths.update([Path(__file__),h/'launch.py',review,r/'docs/overhaul/coop-play-076-source-handoff.md',r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py'])
paths.update(r/p for p in ['package.json','package-lock.json'])
paths.add(h/'syntax.py')
source=json.loads((a/'source-seal.json').read_text())
assert all(row(r/x['path'])['sha256']==x['sha256'].lower() for x in source['files'])
paths.update(r/x['path'] for x in source['files'])
root=r/'.sites-runtime/overhaul-20261009/build-045'
paths.update([root/'receipt.json',root/'playable-checkpoint.json',r/'.sites-runtime/overhaul-20261010/live045-http-verification.json'])
protected=[row(root/'playable-root'/x['path']) for x in json.loads((root/'receipt.json').read_text())['files']]
mode=sys.argv[1];assert mode in ['syntax','play']
command=['python','tools/overhaul-coop-integration-076/syntax.py'] if mode=='syntax' else ['python','tools/overhaul-coop-integration-076/launch.py']
p=h/(mode+'-seal.json');assert not p.exists();p.write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'protected':protected,'command':command,'scope':'ONE small normal waypoint convergence observation. No production change/full mission or tolerance waiver.60s work+20cleanup within100root.'},indent=2))
print(mode+' sealed')
