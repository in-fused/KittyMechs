from pathlib import Path
import subprocess,json,hashlib
r=Path(__file__).resolve().parents[2];source=r/'.sites-runtime/overhaul-20261010/coop-play-053-public';out=r/'.sites-runtime/overhaul-20261010/coop-play-053-motion';out.mkdir(exist_ok=False)
e=json.loads((source/'evidence.json').read_text());proc=r/'.sites-runtime/overhaul-20261010/coop-play-053-process';q=json.loads((proc/'process-receipt.json').read_text());assert q['inclusiveBoundObserved'] and all(x['match'] for x in q['inputsAfter'])
ffmpeg='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';commands=[]
with (out/'stdout.txt').open('wb') as f:
 for label,key in [('host','hostVideo'),('guest','guestVideo')]:
  video=Path(e[key]).resolve();assert video.is_relative_to(source.resolve()) and video.is_file()
  cmd=[ffmpeg,'-hide_banner','-loglevel','error','-i',str(video),'-vf','fps=1,scale=240:-1,tile=8x6','-frames:v','1',str(out/(label+'-startup.png'))];commands.append(cmd)
  p=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT,timeout=20,creationflags=subprocess.CREATE_NO_WINDOW);assert p.returncode==0
(out/'derivative-receipt.json').write_text(json.dumps({'commands':commands,'scope':'Original own-view recordings,1frame/second from start, no retiming or injected frames. Records startup failure only, not actual mission or movement acceptance.'},indent=2))
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
paths=[p for folder in [source,out,proc] for p in folder.rglob('*') if p.is_file()]+[Path(__file__),r/'tools/overhaul-root-round-035/extraction052-public-result-seal.json']
p=Path(__file__).with_name('coop053-final-result-seal.json');assert not p.exists();o={'files':[row(p) for p in paths],'scope':'ONE053 failed actual public mission, both own videos/PNGs/startup boards, nativeparity100. Noobjective or counterexample observed.'};p.write_text(json.dumps(o,indent=2));print(json.dumps({'files':len(paths),'bytes':sum(x['bytes'] for x in o['files']),'sha256':row(p)['sha256']}))
