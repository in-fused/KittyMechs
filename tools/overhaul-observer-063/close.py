from pathlib import Path
import json,hashlib,collections,statistics,subprocess
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;o=r/'.sites-runtime/overhaul-20261010/observer063-play'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
s=json.loads((h/'play-seal.json').read_text());assert all(row(r/x['path'])==x for x in s['files'])
e=json.loads((o/'evidence.json').read_text());groups=collections.defaultdict(list)
for x in e['samples']:groups[x['phase']].append(x)
a={'status':e['status'],'errors':e['errors'],'failure':e.get('failure'),'scope':'Actual single connected Low/Pounce ordinary movement,R and report. Read-only owner + video; neither native pad contact nor actual IAB lag qualification. Firstfailure stop; no further automatic play attempts.','buffers':e.get('buffers'), 'phases':[]}
for phase,ss in groups.items():
 owners=[next((d for d in x['owner'].get('diagnostics',[]) if d['actor']==x['input']['lastSent']['localId']),None) for x in ss]
 a['phases'].append({'phase':phase,'samples':len(ss),'wallMs':[ss[0]['wallMs'],ss[-1]['wallMs']],'firstNative':ss[0]['input'].get('native'),'lastNative':ss[-1]['input'].get('native'),'assetSHAs':sorted({d['assetSHA256'] for d in owners if d}),'modes':sorted({d['mode'] for d in owners if d}),'clips':sorted({c['name'] for d in owners if d for c in d['activeClips']}),'phases':[d['phase'] for d in owners if d],'failures':[d['firstFailure'] for d in owners if d and d['firstFailure']],'fpsRange':[min(x['performance']['fps'] for x in ss),max(x['performance']['fps'] for x in ss)]})
if e['frames']:
 f=sorted(e['frames']);a['rAFms']={'samples':len(f),'median':statistics.median(f),'p95':f[int(.95*(len(f)-1))],'p99':f[int(.99*(len(f)-1))],'mean':statistics.mean(f)}
(o/'analysis.json').write_text(json.dumps(a,indent=2),encoding='utf8')
# One bounded decode per stance from the owned completed video; no browser/world run.
ff='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
jobs=[]
if e['status']=='CAPTURED_REVIEW_REQUIRED':
 for phase in ['forward','upright']:
  t=(groups[phase][0]['wallMs']+300)/1000;cmd=[ff,'-hide_banner','-loglevel','error','-ss',str(t),'-i',e['video'],'-vf','fps=12,scale=480:300,tile=4x3','-frames:v','1',str(o/(phase+'-motion.png'))]
  p=subprocess.run(cmd,cwd=r,capture_output=True,timeout=20,creationflags=subprocess.CREATE_NO_WINDOW);jobs.append({'command':cmd,'exitCode':p.returncode,'stderr':p.stderr.decode('utf8',errors='replace')});assert p.returncode==0
(o/'decode-receipt.json').write_text(json.dumps(jobs,indent=2),encoding='utf8')
paths=[p for n in ['observer063-play','observer063-play-process'] for p in (r/'.sites-runtime/overhaul-20261010'/n).rglob('*') if p.is_file()];paths.extend([Path(__file__)])
out=h/'result-seal.json';assert not out.exists();out.write_text(json.dumps({'files':[row(p) for p in paths],'scope':a['scope']},indent=2),encoding='utf8');print(row(out));print(json.dumps({'status':a['status'],'failure':a['failure'],'rAFms':a.get('rAFms'),'phases':[(p['phase'],p['modes'],p['clips']) for p in a['phases']]}))
