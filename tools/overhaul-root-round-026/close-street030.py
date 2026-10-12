from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2];rows=[]
for n in ['street030-seal.json','street030-result-seal.json']:
 rows+=json.loads((r/'tools/overhaul-root-round-026'/n).read_text(encoding='utf8'))['files']
for p in ['docs/overhaul/critic/rainline-street-030-code-review.md','docs/overhaul/critic/rainline-street-030-result-review.md']:
 b=(r/p).read_bytes();rows.append({'path':p,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
for x in rows:
 b=(r/x['path']).read_bytes();assert len(b)==x['bytes'] and hashlib.sha256(b).hexdigest()==x['sha256'],x['path']
o=r/'tools/overhaul-root-round-026/street030-closure.json';assert not o.exists();o.write_text(json.dumps({'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'jobs':0,'sourceWriters':0,'status':'PARTIAL_FUNCTIONAL_AND_STREET_INCREMENT_ACCEPTED_FULL_ROUTE_AND_ART_INCOMPLETE','files':rows,'limits':'Strict waypoint route failed by overshoot; actual movement continued through core. No obstruction proof, exact new prop destruction interaction, finished art, native pair contact, or Gate1 admission.'},indent=2),encoding='utf8');print(json.dumps({'files':len(rows),'sha256':hashlib.sha256(o.read_bytes()).hexdigest()}))
