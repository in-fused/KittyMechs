from pathlib import Path
import subprocess,json,hashlib
r=Path(__file__).resolve().parents[2]
source=r/'.sites-runtime/overhaul-20261010/player047-baseline';out=r/'.sites-runtime/overhaul-20261010/player047-baseline-motion';out.mkdir(exist_ok=False)
videos=list(source.glob('*.webm'));assert len(videos)==1
ffmpeg='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
commands=[]
with (out/'stdout.txt').open('wb') as f:
 for name,offset in [('quad-moving-fire-approx',14.5),('upright-moving-fire-approx',18.8)]:
  cmd=[ffmpeg,'-hide_banner','-loglevel','error','-ss',str(offset),'-i',str(videos[0]),'-vf','fps=12,scale=240:-1,tile=8x6','-frames:v','1',str(out/(name+'.png'))];commands.append(cmd)
  p=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT,timeout=20,creationflags=subprocess.CREATE_NO_WINDOW);assert p.returncode==0
(out/'derivative-receipt.json').write_text(json.dumps({'commands':commands,'scope':'Actual original video boards. Offsets approximate browser RAF timestamps, not a synchronized per-frame bone/contact certificate. Entire original video retained.'},indent=2))
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
process=r/'.sites-runtime/overhaul-20261010/player047-baseline-process';q=json.loads((process/'process-receipt.json').read_text());assert q['inclusiveBoundObserved'] and all(x['match'] for x in q['inputsAfter'])
paths=[p for folder in [source,out,process] for p in folder.rglob('*') if p.is_file()]+[Path(__file__),r/'tools/overhaul-root-round-034/player047-baseline-seal.json',r/'docs/overhaul/critic/moving-recoil-048-baseline-source-review.md']
s={'files':[row(p) for p in paths],'scope':'ONE unchanged036 matched ordinaryLow movement/fire baseline for futureconditional049; no candidate/missile/contact/performance admission.'}
p=Path(__file__).with_name('player047-baseline-result-seal.json');assert not p.exists();p.write_text(json.dumps(s,indent=2));print(json.dumps({'files':len(paths),'bytes':sum(x['bytes'] for x in s['files']),'sha256':row(p)['sha256'],'originalVideo':row(videos[0])}))
