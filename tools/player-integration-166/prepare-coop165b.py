from pathlib import Path
import hashlib,json,sys,subprocess
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
old=h/'coop166-seal.json';d=json.loads(old.read_text())
for x in d['files']+d['protected']:
 p=r/x['path'];assert sha(p)==x['sha256'] and p.stat().st_size==x['bytes'],x['path']
failed=r/'.sites-runtime/overhaul-20261010/coop165-public-observation';receipt=json.loads((failed/'process-receipt.json').read_text());stdout=(failed/'stdout.txt').read_text()
assert receipt['exitCode']==1 and receipt['elapsedSeconds']<10 and all(x['match'] for x in receipt['inputsAfter'])
assert "ENOENT" in stdout and "playable-root\\receipt.json" in stdout and not (r/'.sites-runtime/overhaul-20261010/coop165-public').exists()
review=r/'docs/overhaul/critic/playability166-coop-launch-review.md';assert sha(review)==sys.argv[1] and 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8') and 'CLOSED' in review.read_text(encoding='utf8')
subprocess.run([sys.executable,str(h/'verify-public166.py')],cwd=r,check=True)
d['files'].extend(row(p) for p in [old,h/'prepare-coop165b.py',h/'launch-coop165b.py',h/'verify-public166.py',review,failed/'process-receipt.json',failed/'stdout.txt'])
d['command']=[sys.executable,'tools/player-integration-166/launch-coop165b.py'];d['scope']='ONE actual165 mission after root environment-only path correction; previous attempt exited before browser/world. Original165 source/bounds immutable, first actual failure stops.'
p=h/'coop165b-seal.json';assert not p.exists();p.write_text(json.dumps(d,indent=2),encoding='utf8');print('Correct parent build root sealed; no mission source alteration')
