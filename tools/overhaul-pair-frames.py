"""Chronological gameplay frames for contact review; no pose or pixel synthesis."""
from pathlib import Path
import json,re,subprocess,imageio_ffmpeg
folder=Path('.sites-runtime/overhaul-20261009/duel-004');e=json.loads((folder/'evidence.json').read_text())
video=sorted(folder.glob('*.webm'),key=lambda p:p.stat().st_size,reverse=True)[0]
exe=imageio_ffmpeg.get_ffmpeg_exe();out=folder/'review-frames';out.mkdir(exist_ok=True)
info=subprocess.run([exe,'-i',str(video)],capture_output=True,text=True).stderr
records=[]
for style in ['quadruped','upright']:
    samples=[s for s in e['history'] if any(a.get('pair') and a['pair']['style']==style for a in s['actors'])]
    if not samples:continue
    approximate=max(0,samples[0]['wall']/1000-2)
    subprocess.run([exe,'-y','-ss',str(approximate),'-i',str(video),'-t','5','-vf','fps=8','-frames:v','40',str(out/(style+'-%02d.png'))],check=True,capture_output=True)
    records.append({'style':style,'firstSnapshotTime':samples[0]['time'],'videoSeekSeconds':approximate,'note':'Approximate video alignment: browser performance origin was not exported; inspect chronological frames/video rather than claiming same-frame snapshot proof.'})
(out/'alignment.json').write_text(json.dumps({'video':str(video),'metadata':info[-1300:],'ranges':records},indent=2))
print(json.dumps({'video':str(video),'frames':len(list(out.glob('*.png'))),'ranges':records}))
