from pathlib import Path
import json,hashlib,os,shutil
r=Path(__file__).resolve().parents[2];old=r/'.sites-runtime/overhaul-20261009/build-052';new=r/'.sites-runtime/overhaul-20261009/build-053'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(old/'receipt.json')=='240028ed01ae67d4c0e391aea2a221106dd507883815e47ec076be23243e6fb0'
prior=json.loads((old/'receipt.json').read_text());mapping={x['path'].casefold():x for x in prior['files']}
paths={x['path'].casefold():x['path'] for x in prior['files'] if not x['path'].startswith('dist/')}
for p in (r/'src').rglob('*'):
 if p.is_file():name=p.relative_to(r).as_posix();paths.setdefault(name.casefold(),name)
for p in (r/'dist').rglob('*'):
 if p.is_file():name=p.relative_to(r).as_posix();paths[name.casefold()]=name
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':sha(r/p)} for p in sorted(paths.values())]
changed=[x['path'] for x in rows if x['path'].startswith(('src/','shared/','server/')) and (x['path'].casefold() not in mapping or mapping[x['path'].casefold()]['sha256']!=x['sha256'])]
allowed=['src/game/camera/visualEnvelope.ts','src/game/camera/weightedVisualEnvelope007.ts','src/game/entities/identity57Runtime005.ts','src/game/entities/movingRFfeet067.ts','src/game/entities/authoredFootfalls123.ts','src/game/entities/identity57Runtime034Actor.tsx','src/game/GameCanvas.tsx','src/game/entities/identity57Runtime121Asset.ts','src/game/entities/identity57Runtime121Manifest.json']
assert {x.casefold() for x in changed}=={x.casefold() for x in allowed},changed
manifest=json.loads((r/'src/game/entities/identity57Runtime121Manifest.json').read_text())
assert manifest['publicURL']=='/assets/models/Pounce_Anatomy121Batched.glb'
assert sha(r/('dist'+manifest['publicURL']))==manifest['sha256']
name='dist'+manifest['publicURL'];paths[name.casefold()]=name
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':sha(r/p)} for p in sorted(paths.values())]
new.mkdir(exist_ok=False);(new/'receipt.json').write_text(json.dumps({'scope':'UNADMITTED053 new121 exact-attribute compatible material/attribute batched skin +123footfall +128mandatory45browsercontract +122within-sample skeletonvalidation. Existing052 aim/nativegame retained. Ordinarytemporalreview mandatory; actualIABlag/fullgoal incomplete.','files':rows},indent=2));dest=new/'playable-root';dest.mkdir();links=copies=0
for x in rows:
 target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'].casefold())
 if previous and previous['sha256']==x['sha256']:
  source=old/'playable-root'/previous['path'];assert sha(source)==x['sha256'];os.link(source,target);links+=1
 else:shutil.copy2(r/x['path'],target);copies+=1
 assert sha(target)==x['sha256']
assert all(sha(old/'playable-root'/x['path'])==x['sha256'] for x in prior['files'])
out={'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable052Hardlinks':links,'changedCopies':copies,'changedSource':changed,'receiptSHA256':sha(new/'receipt.json')};(new/'playable-checkpoint.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))
