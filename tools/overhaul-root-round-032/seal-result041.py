from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
paths=set()
for folder in ['identity041-test-process','identity041-build-process','identity041-public-process','mission-identity-041-public','mission-identity-041-motion']:
 paths.update(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010'/folder).rglob('*') if p.is_file())
paths.update(['.sites-runtime/overhaul-20261009/build-033/receipt.json','.sites-runtime/overhaul-20261009/build-033/playable-checkpoint.json','tools/overhaul-mission-identity-041/source-handoff.json'])
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':hashlib.sha256((r/p).read_bytes()).hexdigest()} for p in sorted(paths)]
p=r/'tools/overhaul-root-round-032/identity041-result-seal.json';assert not p.exists()
p.write_text(json.dumps({'frozenUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'scope':'041 actual sourceidentity test/build/public first attempt and originalpixels/nativehistory preserved. No automatic retry; independent actual mission/art/contact/fullscope acceptance remains required.'},indent=2))
print(json.dumps({'rows':len(rows),'bytes':sum(x['bytes'] for x in rows)}))


