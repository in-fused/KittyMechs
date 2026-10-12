from pathlib import Path
import subprocess,hashlib,json
r=Path(__file__).resolve().parents[2]
source=r/'.sites-runtime/overhaul-20261010/coop-play-045-public'
out=r/'.sites-runtime/overhaul-20261010/coop-play-045-motion';out.mkdir(exist_ok=False)
videos=list(source.glob('*.webm'));assert len(videos)==1
ffmpeg=Path('C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe')
with (out/'stdout.txt').open('wb') as f:
 p=subprocess.run([str(ffmpeg),'-hide_banner','-loglevel','error','-i',str(videos[0]),'-vf','fps=1/3,scale=320:-1,tile=5x3','-frames:v','1',str(out/'staging.png')],stdout=f,stderr=subprocess.STDOUT,timeout=40,creationflags=subprocess.CREATE_NO_WINDOW)
assert p.returncode==0
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
paths=[p for folder in [source,out,r/'.sites-runtime/overhaul-20261010/coop-play-045-process'] for p in folder.rglob('*') if p.is_file()]
paths += [r/'docs/overhaul/critic/coop-play-045-source-review.md',r/'tools/overhaul-root-round-033/coop045-public-seal.json',Path(__file__)]
receipt=json.loads((r/'.sites-runtime/overhaul-20261010/coop-play-045-process/process-receipt.json').read_text());assert all(x['match'] for x in receipt['inputsAfter']) and receipt['inclusiveBoundObserved']
seal={'files':[row(p) for p in paths],'scope':'045 first actual failed guest startup; no mission completion. Original video, native keys/publication histories and all first failures retained. Staging board derived from original host video only; guest has no footage.'}
target=Path(__file__).with_name('coop045-result-seal.json');assert not target.exists();target.write_text(json.dumps(seal,indent=2));print(json.dumps({'files':len(paths),'bytes':sum(x['bytes'] for x in seal['files']),'sealSHA256':row(target)['sha256'],'originalVideo':row(videos[0])}))
