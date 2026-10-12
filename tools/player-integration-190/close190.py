from pathlib import Path
import hashlib,json,shutil,datetime,os
r=Path(__file__).resolve().parents[2]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
prior=r/'.sites-runtime/overhaul-20261010/handoff-069'
assert sha(prior/'manifest.json')=='1523f8d5bcd53af888807b854d142dda370f30369afc005e4110ca54f44d47f5'
packets={'overhaul-pad-witness-188':'2de79d477926a6bb67c1efeda75435cf446d1a1959b1f55f3e2862251bb83e5f','overhaul-phase-contact-189':'0c4037d763f17d3b07ffd86d07f596592c75df14cf42d919ec46ef333c881e56'}
paths=['docs/overhaul/player-integration-190-handoff.md','docs/overhaul/critic/contact190-source-review.md']
for packet,expected in packets.items():
 seal=r/'tools'/packet/'source-seal.json';assert sha(seal)==expected
 data=json.loads(seal.read_text());assert data['writer']=='CLOSED'
 for row in data['files']:
  assert sha(r/row['path'])==row['sha256'],row['path']
  paths.append(row['path'])
 paths.extend(p.relative_to(r).as_posix() for p in seal.parent.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
paths.extend(p.relative_to(r).as_posix() for p in (r/'tools/player-integration-190').rglob('*') if p.is_file() and '__pycache__' not in p.parts)
assert 'DENY' in (r/'docs/overhaul/critic/contact190-source-review.md').read_text()
dest=r/'.sites-runtime/overhaul-20261010/handoff-070';dest.mkdir(exist_ok=False);rows=[]
for name in sorted(set(paths)):
 p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
old=json.loads((prior/'manifest.json').read_text())
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'190 rejected/incomplete188/189 source preserved BEFORE restoring exact062. No new build or public play. Human Low lag unresolved. Full goal incomplete.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
verification={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-070.json').write_text(json.dumps(verification,indent=2),encoding='utf8')
base=r/'.sites-runtime/overhaul-20261009/build-062/playable-root'
name='src/game/entities/sourceCoordination164.ts';p=r/name
assert sha(p)=='649c322b311ba6c65ce84c1dad37b7c832bde1f4c0a53bec6eb0c9191ffaac91'
assert sha(dest/'files'/name)==sha(p)
tmp=p.with_name(p.name+'.restore190');shutil.copy2(base/name,tmp);os.replace(tmp,p)
helper=r/'src/game/entities/phaseSourceFeet189.ts';assert helper.resolve().parent==(r/'src/game/entities').resolve()
assert sha(helper)=='1fee071e570819f96de6307a4926e9e3b8dea355f4a1aa1247b6018f72a6ecd8'
assert sha(dest/'files'/helper.relative_to(r))==sha(helper);helper.unlink()
receipt=json.loads((base.parent/'receipt.json').read_text());frozen=0;current=0
for row in receipt['files']:
 assert sha(base/row['path'])==row['sha256'];frozen+=1
 if row['path'].startswith(('src/','shared/','server/')):
  assert sha(r/row['path'])==row['sha256'],row['path'];current+=1
out={'status':'RESTORED_EXACT062','utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'preservedBeforeRestore':verification,'runtimeRowsMatched':current,'frozenRowsMatched':frozen,'restoredPath':name,'restoredSHA256':sha(p),'removedUnusedHelper':'src/game/entities/phaseSourceFeet189.ts','serverUnchanged':{'PID':370280,'session':9510,'port':8799}}
(r/'tools/player-integration-190/restoration190.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))
