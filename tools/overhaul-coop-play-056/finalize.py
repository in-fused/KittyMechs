from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
review=r/'docs/overhaul/critic/coop-play-056-result-review.md';audit=r/'docs/overhaul/coop-play-056-control-audit.md'
assert review.is_file() and audit.is_file()
raw=r/'tools/overhaul-coop-play-056/result-seal.json'
assert row(raw)['sha256']=='922127575286f9a1219b081f85d2d24db22806132d579ea94f766664f37aff35'
for x in json.loads(raw.read_text())['files']:assert row(r/x['path'])==x,x['path']
paths=[raw,review,audit,r/'.sites-runtime/overhaul-20261010/coop056-cleanup-verification.json',Path(__file__),r/'tools/overhaul-coop-play-056/derive.py',r/'tools/overhaul-coop-play-056/cleanup.ps1']+sorted((r/'.sites-runtime/overhaul-20261010/coop056-motion').glob('*'))
dest=r/'tools/overhaul-coop-play-056/final-result-seal.json';assert not dest.exists()
dest.write_text(json.dumps({'scope':'056 closed first-failure normal mission, originals unchanged, bounded own-video derivatives, independent review and source-only control audit. Full overhaul incomplete.','files':[row(p) for p in paths]},indent=2),encoding='utf8')
print(json.dumps(row(dest)))
