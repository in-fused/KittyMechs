from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
for name in ['visual035-build-seal.json','visual035-result-seal.json']:
 s=json.loads((r/'tools/overhaul-root-round-027'/name).read_text());rows+=s.get('files',[])+s.get('protected',[])
for x in rows:
 p=r/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'].lower(),x['path']
for f in ['art035-build-process','art035-capture-process']:
 s=json.loads((r/'.sites-runtime/overhaul-20261010'/f/'process-receipt.json').read_text());assert s['inclusiveBoundObserved'] and all(x['match'] for x in s['inputsAfter'])
review=r/'docs/overhaul/critic/pounce-art-player-035-result-review.md';assert review.is_file()
o=r/'tools/overhaul-root-round-027/visual035-closure.json';assert not o.exists()
j={'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'035 build passed but browser failed at opening pin; no runtime quality approval or retry','checks':len(rows),'mismatches':0,'heavyJobs':0,'rootWriters':0,'review':str(review.relative_to(r)),'reviewSHA256':sha(review),'recommended':'build028 port8801','unapprovedCandidate':'build029 port8802'}
o.write_text(json.dumps(j,indent=2));print(json.dumps({'sha256':sha(o),**j}))
