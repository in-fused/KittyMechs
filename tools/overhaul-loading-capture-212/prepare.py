from pathlib import Path
import hashlib,json
r=Path('.');p=r/'tools/overhaul-loading-capture-212'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
source=r/'tools/overhaul-readiness-211/source-seal211.json';receipt=r/'.sites-runtime/overhaul-20261011/readiness211-private/build-process-receipt.json';critic=r/'docs/overhaul/critic/readiness211-source-review.md'
assert row(source)['sha256']=='0c579f94b28e3560b27c90b578e98243622074e9c14e9e3aefad05a3bac3da47'
assert row(critic)['sha256']=='eb8c9fdb833accba821d92e1e61695589c7e349950432e55dd8cff778ffe2719'
s=json.loads(source.read_text());b=json.loads(receipt.read_text());assert b['status']=='TERMINAL' and b['exitCode']==0 and b['protectedMatch'] and all(x['match'] for x in b['sourceAfter'])
rows=s['files']+s['protectedInputs']+b['outputs']+[row(source),row(receipt),row(critic)]
frozen=r/'.sites-runtime/overhaul-20261009/build-062/receipt.json'
# Exact retained receipt identity. All files in its immutable playable root.
assert row(frozen)['sha256']=='5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c'
rows.append(row(frozen));f=json.loads(frozen.read_text())
for x in f['files']:rows.append({'path':(frozen.parent/'playable-root'/x['path']).as_posix(),'bytes':x['bytes'],'sha256':x['sha256']})
rows.append(row(r/'tools/overhaul-coop-204/source-seal.json'))
for scope in ['src','shared','server']:
 for x in (r/scope).rglob('*'):
  if x.is_file():rows.append(row(x))
for x in rows:assert row(r/x['path'])==x,x['path']
unique={x['path']:x for x in rows}
(p/'binding.json').write_text(json.dumps({'writer':'CLOSED','scope':'Private211 dist and source; retained062 native/assets; source204 unchanged','files':list(unique.values()),'worker208Excluded':True,'critic':row(critic)},indent=2)+'\n',encoding='utf-8')
# Static-only public selector byte preservation (including non-ASCII invite).
original=(r/'tools/overhaul-coop-204/mission-capture.mjs').read_text(encoding='utf-8');capture=(p/'capture.mjs').read_text(encoding='utf-8')
selectors=['Open settings','Graphics quality','Pounce feline prototype','Close settings','Pilot callsign','CO-OP','Select Pounce','Select theater','Host on arena server','COPY INVITE ↗','Squad invite','JOIN SQUAD']
assert all(t in original and t in capture for t in selectors)
(p/'static-receipt.json').write_text(json.dumps({'writer':'CLOSED','status':'PASS','sourceBuildRowsMatch':len(unique),'selectorUTF8Match':selectors,'scope':'Source identity/selector checks only; no browser/gameplay run'},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'PASS','protectedRows':len(unique),'buildReceipt':row(receipt)}))
