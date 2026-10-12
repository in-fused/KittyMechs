from pathlib import Path
import json,hashlib,statistics,collections
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;o=r/'.sites-runtime/overhaul-20261010'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
s=json.loads((h/'play-seal.json').read_text());assert all(row(r/x['path'])==x for x in s['files'])
e=json.loads((o/'moving-r067-play/evidence.json').read_text());frames=sorted(e['frames'][1:]);owners=[next((d for d in x['owner']['diagnostics'] if d['actor']==x['input']['lastSent']['localId']),None) for x in e['samples']];owners=[x for x in owners if x];cost=sorted(x['lastOwnerMs'] for x in owners)
summary={'status':e['status'],'pageErrors':e['errors'],'samples':len(e['samples']),'rAF':{'n':len(frames),'medianMs':statistics.median(frames),'p95Ms':frames[int(len(frames)*.95)],'p99Ms':frames[int(len(frames)*.99)]},'localOwnerCost':{'medianMs':statistics.median(cost),'p95Ms':cost[int(len(cost)*.95)],'maxEverMs':max(x['maxOwnerMs'] for x in owners)},'modes':dict(collections.Counter(x['mode'] for x in owners)),'ownerFailures':[x['firstFailure'] for x in owners if x['firstFailure']],'buffers':e['buffers'],'scope':'Actual043 automatedEdge observation only; quality pending independent critic; IAB severe lag unresolved.'}
(h/'play-summary.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
paths={p for n in ['moving-r067-play','moving-r067-observer-process','moving-r067-build','moving-r067-controller','moving-r067-typecheck'] for p in (o/n).rglob('*') if p.is_file()}
paths.update([h/'controller-check-result.json',h/'play-summary.json',Path(__file__),h/'extract-review.py',o/'live043-http-verification.json',r/'.sites-runtime/overhaul-20261009/build-043/receipt.json'])
p=h/'result-seal.json';assert not p.exists();p.write_text(json.dumps({'files':[row(x) for x in sorted(paths)],'scope':summary['scope']},indent=2),encoding='utf8');print(json.dumps({'summary':summary,'seal':row(p)}))
