from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];source=(r/'tests/moving-recoil-047.test.ts').resolve();target=(r/'tools/overhaul-moving-recoil-047/unrun-source-proof047.test.txt').resolve()
assert source.is_relative_to(r) and target.is_relative_to(r) and not target.exists()
expected='73945225cea86306d28384dc59bd925d95e1cada17e3386ee6131965d13ee43b';assert hashlib.sha256(source.read_bytes()).hexdigest()==expected
shutil.move(source,target);assert hashlib.sha256(target.read_bytes()).hexdigest()==expected and not source.exists()
o={'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'originalPath':'tests/moving-recoil-047.test.ts','preservedPath':target.relative_to(r).as_posix(),'bytes':target.stat().st_size,'sha256':expected,'status':'UNRUN_SOURCE_PROOF_QUARANTINED_UNCHANGED','reason':'Same original034 top-level decoder rejects STEP as observed050. Sourceproof never executed/admitted. Preserve exact text outside automatic test collection; no test repair or gate waiver.'}
(r/'tools/overhaul-moving-recoil-047/proof-quarantine-receipt.json').write_text(json.dumps(o,indent=2));print(json.dumps(o))
