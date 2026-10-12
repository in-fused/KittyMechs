from pathlib import Path
import json, hashlib, subprocess, datetime
from PIL import Image, ImageDraw
r=Path(__file__).resolve().parents[2]
source=r/'.sites-runtime/overhaul-20261010/coop201-public'
out=r/'.sites-runtime/overhaul-20261010/coop201-review';out.mkdir(exist_ok=False)
e=json.loads((source/'evidence.json').read_text(encoding='utf8'))
ff='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
report={'scope':'Saved ordinary two-client video derivation only; no new gameplay run. Video seconds are not native tick/contact clocks. Two-FPS snapshots may miss short pulse/contact events.','createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'videos':[]}
for role in ('host','guest'):
    video=Path(e[role+'Video']); before=hashlib.sha256(video.read_bytes()).hexdigest()
    frames=out/role;frames.mkdir()
    cmd=[ff,'-hide_banner','-loglevel','error','-i',str(video),'-vf','fps=2,scale=480:300','-threads','1',str(frames/'frame-%04d.jpg')]
    done=subprocess.run(cmd,capture_output=True,timeout=30,creationflags=subprocess.CREATE_NO_WINDOW)
    assert done.returncode==0,done.stderr.decode(errors='replace')
    paths=sorted(frames.glob('frame-*.jpg'));boards=[]
    for start in range(0,len(paths),36):
        board=Image.new('RGB',(2880,1920),'#161616');draw=ImageDraw.Draw(board)
        for j,p in enumerate(paths[start:start+36]):
            x=j%6*480;y=j//6*320;board.paste(Image.open(p),(x,y));draw.text((x+5,y+301),f'{role} saved video {(start+j)/2:.1f}s',fill='white')
        p=out/f'{role}-board-{start//36+1:02d}.jpg';board.save(p,quality=88);boards.append(p.relative_to(r).as_posix())
    assert hashlib.sha256(video.read_bytes()).hexdigest()==before
    report['videos'].append({'role':role,'path':str(video),'sha256':before,'frames':len(paths),'boards':boards,'command':cmd,'exitCode':done.returncode})
(out/'receipt.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps({'status':'SAVED_VIDEO_DERIVED','roles':[{'role':x['role'],'frames':x['frames'],'boards':x['boards']} for x in report['videos']]}))
