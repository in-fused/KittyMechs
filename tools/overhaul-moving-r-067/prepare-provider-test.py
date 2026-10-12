from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
p=r/'tools/overhaul-moving-r-support-067';s=json.loads((p/'source-seal.json').read_text());assert all(row(r/x['path'])==x for x in s['files']+s['protected'])
paths={r/x['path'] for x in s['files']+s['protected']};paths.update([p/'source-seal.json',p/'source-handoff.json',Path(__file__),r/'tools/overhaul-root-round-027/run-seal.py',r/'package.json',r/'package-lock.json',r/'docs/overhaul/critic/moving-r-support-067-source-review.md'])
out=h/'provider-test-seal.json';assert not out.exists();out.write_text(json.dumps({'files':[row(v) for v in sorted(paths)],'command':json.loads((p/'source-handoff.json').read_text())['rootTestCommand'],'scope':'ONE realRapier fixedsupport067 fixture, cap30; no gait/native contact or performance approval.'},indent=2),encoding='utf8');print(row(out))
