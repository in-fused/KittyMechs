import json,collections
from pathlib import Path
r=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261010/contact134-public/evidence.json';d=json.loads(p.read_text());rows=[]
for name in dict.fromkeys(s['phase'] for s in d['samples']):
 samples=[s['sample'] for s in d['samples'] if s['phase']==name and s['sample']['feline']['enabled']];feet=[]
 for s in samples:
  a=next(a for a in s['actors'] if a['name']=='Contact134');o=next(o for o in s['feline']['diagnostics'] if o['actor']==a['id']);feet += o['feet']['feet']
 locked=[f for f in feet if f['mode']=='stance'];gaps=[abs(w['supportNormalGap']) for f in locked for w in f['skinWitness']['points'] if w['supportNormalGap'] is not None]
 rows.append({'phase':name,'footModes':dict(collections.Counter(f['mode'] for f in feet)),'stanceCount':len(locked),'maxStanceMarkerError':max((f['error'] for f in locked if f['error'] is not None),default=None),'maxStanceSkinSubsetGap':max(gaps,default=None),'retired':sum(f['reason']=='AUTHORED_STANCE_UNREACHABLE_RETIRED' for f in feet)})
(r/'.sites-runtime/overhaul-20261010/contact134-review/contact-summary.json').write_text(json.dumps({'scope':'Actual final weighted foot marker and saved skin subset; not a full-foot or nativepad certificate','phases':rows},indent=2));print(json.dumps(rows))
