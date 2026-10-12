from pathlib import Path
import subprocess,json,hashlib,time
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent
p=subprocess.run(['npm.cmd','run','storage:clean'],cwd=r,capture_output=True,timeout=25)
assert p.returncode==0,p.stdout.decode('utf-8',errors='replace')
budget=json.loads(p.stdout.decode('utf-8-sig')[p.stdout.decode('utf-8-sig').index('{'):]);assert budget['ArtifactGiB']<=48 and budget['HistoryGiB']<=2 and budget['CFreeGiB']>=30 and budget['DFreeGiB']>=100
start=time.monotonic();test=subprocess.run(['node','--import','tsx','tools/overhaul-spatial-fixture-282/test282.ts'],cwd=r,capture_output=True,timeout=30)
(f/'terminal282.json').write_text(json.dumps({'writer':'CLOSED','exitCode':test.returncode,'elapsedSeconds':time.monotonic()-start,'capSeconds':30,'stdout':test.stdout.decode('utf-8',errors='replace'),'stderr':test.stderr.decode('utf-8',errors='replace'),'storage':budget},indent=2),encoding='utf-8')
def row(p):
    b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
pre=json.loads((r/'tools/overhaul-spatial-render-281/preimage281.json').read_text(encoding='utf-8'));assert row(r/pre['source']['path'])==pre['source'];assert row(r/pre['candidate']['path'])==pre['candidate']
(f/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','status':'SOURCE_CANDIDATE_UNADMITTED' if test.returncode==0 else 'FIRST_NUMERIC_FAILURE_STOP','files':[row(p) for p in sorted(f.iterdir()) if p.is_file() and p.name!='source-seal.json']},indent=2),encoding='utf-8')
print(json.dumps({'exitCode':test.returncode,'terminal':row(f/'terminal282.json'),'sourceSeal':row(f/'source-seal.json')}));raise SystemExit(test.returncode)
