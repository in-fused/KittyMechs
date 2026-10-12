from pathlib import Path
import json, hashlib, datetime
r=Path(__file__).resolve().parents[2]
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
errors=[]
counts=[]
for name in ['player037-test-seal.json','player037-result-seal.json']:
    obj=json.loads((r/'tools/overhaul-root-round-029'/name).read_text())
    for row in obj['files']:
        p=r/row['path']
        if not p.is_file() or p.stat().st_size!=row['bytes'] or sha(p)!=row['sha256']:
            errors.append(row['path'])
    counts.append(len(obj['files']))
for kind in ['test','build','capture']:
    p=r/f'.sites-runtime/overhaul-20261010/player037-{kind}-process/process-receipt.json'
    obj=json.loads(p.read_text())
    assert obj['exitCode']==0 and not obj['failure']
    assert all(x['match'] for x in obj['inputsAfter'])
critic=r/'tools/overhaul-input-correction-037/critic-result-closure.json'
assert sha(critic)=='5ef672a3b1113fea23f9cd3667038466f16a485c5193e8fbb9ebb46d6e00116c'
assert sha(r/'docs/overhaul/critic/input-correction-player-037-result-review.md')=='2c19adaa06b4e7834cf4ff3c147b1341cad57bb6e000ab0d535e2100f2de5aac'
target=r/'tools/overhaul-root-round-029/closure.json'
assert not target.exists()
receipt={'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'VERIFIED' if not errors else 'STOP','counts':counts,'mismatches':errors,'promotion':'DENIED','recommendedBuild':28,'candidateBuild':30,'jobs':0,'writers':0,'criticClosureSHA256':sha(critic)}
target.write_text(json.dumps(receipt,indent=2))
print(json.dumps(receipt));raise SystemExit(bool(errors))
