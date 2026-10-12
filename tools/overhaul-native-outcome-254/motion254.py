from pathlib import Path
import subprocess,json
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[2];run=r/'.sites-runtime/shader-startup-238';assert run.is_junction();out=run/'review254';movie=run/'public251/page@9c2922953a4efcf05549c37a55b072b6.webm'
ff='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';receipts=[]
for label,start in [('moving-up',32),('moving-down',37),('steering',51)]:
 folder=out/label;folder.mkdir(exist_ok=False);p=subprocess.run([ff,'-v','error','-ss',str(start),'-i',str(movie),'-t','3','-vf','fps=12','-frames:v','36',str(folder/'frame-%03d.png')],capture_output=True,timeout=20);assert p.returncode==0,p.stderr.decode(errors='replace');paths=sorted(folder.glob('*.png'));assert len(paths)==36
 sheet=Image.new('RGB',(1860,1680))
 for i,q in enumerate(paths):
  im=Image.open(q).convert('RGB').crop((330,280,640,560));ImageDraw.Draw(im).text((5,5),f'{start+i/12:.3f}s',fill='white');sheet.paste(im,((i%6)*310,(i//6)*280))
 sheet.save(out/(label+'-ordered36.png'));receipts.append({'label':label,'interval':[start,start+3],'frames':36,'ffmpegExit':0,'crop':[330,280,640,560],'FPS':12})
(out/'motion-decode-receipt.json').write_text(json.dumps({'writer':'CLOSED','movie':movie.relative_to(r).as_posix(),'identity':'ROOT_VERIFIED_Controls251Host_HUD_IN_FULLFRAME_VIDEO1','scope':'CPU original251 video samples; no replay, scripted pose or game mutation','limitations':'Video intervals are approximate labels and not exact native/wallclock; sampled cadence can alias. Camera framing can move body outside crop; full-frame originals retained.','segments':receipts},indent=2),encoding='utf-8')
print('Three originalhost native12FPS motion grids CLOSED; no new game run')
