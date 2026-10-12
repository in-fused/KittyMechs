from pathlib import Path
import datetime,json,hashlib,os,shutil,sys
r=Path(__file__).resolve().parents[2]
base=r/'.sites-runtime/overhaul-20261009/preserved-007'
layers=[r/'.sites-runtime/overhaul-20261010'/n for n in ['handoff-027','handoff-029','handoff-030']]
dest=r/'.sites-runtime/overhaul-20261010/handoff-031'
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()
if sys.argv[1]=='copy':
    assert not dest.exists()
    v=json.loads((r/'.sites-runtime/overhaul-20261010/continuation-verification-030.json').read_text());assert v['status']=='VERIFIED'
    assert sha(layers[-1]/'manifest.json')==v['manifestSHA256']
    old={x['path']:x for x in json.loads((base/'manifest.json').read_text())['files']}
    for layer in layers:
        m=json.loads((layer/'manifest.json').read_text());assert sha(base/'manifest.json')==m['baseManifestSha256'];old.update({x['path']:x for x in m['files']})
    dest.mkdir();rows=[];excluded={'.git','node_modules','.sites-runtime','test-results','test-results-online','playwright-report','__pycache__'}
    for folder,dirs,names in os.walk(r):
        dirs[:]=[d for d in dirs if d not in excluded]
        for name in names:
            source=Path(folder)/name;rel=source.relative_to(r).as_posix();digest=sha(source)
            if rel in old and old[rel]['sha256'].lower()==digest:continue
            target=dest/'files'/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
            assert sha(target)==digest and sha(source)==digest,rel
            rows.append({'path':rel,'bytes':target.stat().st_size,'sha256':digest})
    o={'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base':str(base),'baseManifestSha256':sha(base/'manifest.json'),'parents':[{'path':str(p),'manifestSHA256':sha(p/'manifest.json')} for p in layers],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Restore preserved-007/files, overlay027/files,029/files,030/files,031/files in order; no deletions. Large editable assets remain in verified027. Original evidence/playable roots stay at original paths. Never restore incomplete028. Frozen030/031/032 share SHA-verified immutable files; do not edit either frozen root.'}
    (dest/'manifest.json').write_text(json.dumps(o,indent=2));print(json.dumps({'files':o['count'],'bytes':o['bytes']}))
elif sys.argv[1]=='verify':
    m=json.loads((dest/'manifest.json').read_text());errors=[];assert sha(base/'manifest.json')==m['baseManifestSha256']
    for p in m['parents']:assert sha(Path(p['path'])/'manifest.json')==p['manifestSHA256']
    for x in m['files']:
        for side,p in [('copy',dest/'files'/x['path']),('current',r/x['path'])]:
            if not p.is_file() or p.stat().st_size!=x['bytes'] or sha(p)!=x['sha256']:errors.append({'path':x['path'],'side':side})
    out=r/'.sites-runtime/overhaul-20261010/continuation-verification-031.json';assert not out.exists()
    o={'verifiedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'VERIFIED' if not errors else 'STOP','files':m['count'],'bytes':m['bytes'],'manifestSHA256':sha(dest/'manifest.json'),'baseAndParentsManifestsUnchanged':True,'mismatches':errors,'scope':m['scope']};out.write_text(json.dumps(o,indent=2));print(json.dumps(o));raise SystemExit(bool(errors))
else:raise SystemExit('copy or verify only')
