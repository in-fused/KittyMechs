from pathlib import Path
import hashlib,json,shutil
r=Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def row(path):
 p=r/path;return {'path':path,'bytes':p.stat().st_size,'sha256':sha(p)}
hpath=r/'tools/overhaul-startup-rig-055/source-handoff.json';assert sha(hpath)=='f7b528775bfaeb3b1da86fdf293a7a802c67cf23f744fe48f4f546df4cd8d30a'
h=json.loads(hpath.read_text(encoding='utf8'))
review=r/'docs/overhaul/critic/startup-rig-055-source-review.md';assert review.exists()
assert 'APPROVE' in review.read_text(encoding='utf8').upper(),'Root must inspect exact critic scope before adoption'
assert not (r/'src/game/entities/identity57Runtime034Asset.ts').exists()
for x in h['protected']+h['files']:
 assert row(x['path'])=={k:x[k] for k in ['path','bytes','sha256']},x['path']
prior=json.loads((r/'tools/overhaul-root-round-035/extraction052-build-final-seal.json').read_text(encoding='utf8'))
for x in prior['files']+prior.get('protected',[]):assert row(x['path'])==x,x['path']
out=r/'tools/overhaul-startup-rig-055/adoption.json';assert not out.exists()
for x in h['adoption']:shutil.copy2(r/x['source'],r/x['destination'])
out.write_text(json.dumps({'scope':'055 source adopted; live037 frozen unchanged; no public approval','files':[row(x['destination']) for x in h['adoption']],'reviewSHA256':sha(review)},indent=2),encoding='utf8')
# Preserve all baseline runtime/source inputs, refreshing the two intentional
# edits; add exact new helper, candidate, author provenance and critic gate.
paths={x['path'] for x in prior['files']+prior.get('protected',[])}
paths.update(x['destination'] for x in h['adoption'])
paths.update(x['path'] for x in h['files']+h['protected'])
paths.update(['tools/overhaul-startup-rig-055/source-handoff.json','tools/overhaul-startup-rig-055/adopt-and-seal.py','tools/overhaul-startup-rig-055/adoption.json','docs/overhaul/critic/startup-rig-055-source-review.md'])
inputs=[row(p) for p in sorted(paths)]
for name,cmd in [('test',h['rootTestCommand']),('build',h['rootBuildCommand'])]:
 p=r/f'tools/overhaul-startup-rig-055/{name}-seal.json';assert not p.exists()
 p.write_text(json.dumps({'files':inputs,'command':cmd,'scope':'055 exactly one focused technical check; tests cannot approve actual startup/player experience'},indent=2),encoding='utf8')
print(json.dumps({'adopted':len(h['adoption']),'inputRows':len(inputs),'live':'unchanged037'}))
