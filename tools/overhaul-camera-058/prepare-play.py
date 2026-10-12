from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];here=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
old=r/'tools/overhaul-play-experience-057/capture.mjs';s=old.read_text()
s=s.replace('Experience057','Experience058').replace('now-start>=18000','now-start>=24000')
s=s.replace("e.frames=await frames;e.status=", "await page.keyboard.press('KeyV');await segment('level-view',[],800);await segment('look-up',['KeyI'],900);await segment('look-down',['KeyK'],1800);await page.keyboard.press('KeyV');await segment('level-again',[],800);await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.screenshot({path:resolve(output,'renderer-report.png')});await page.getByRole('button',{name:'Close settings',exact:true}).click();e.frames=await frames;e.status=")
s=s.replace('forward/back/side travel and upright transformation.', 'forward/back/side travel, upright transformation, public I/K pitch limits and V reset, visible renderer report.')
capture=here/'capture.mjs';assert not capture.exists();capture.write_text(s,encoding='utf8')
build=r/'.sites-runtime/overhaul-20261009/build-040';receipt=row(build/'receipt.json');assert receipt['sha256']=='99fc6e628c99e635cf8f4a04cadbb5cd4787096cb24a41e3358d68f7b9a4061f'
launch=here/'launch-play.py';assert not launch.exists();launch.write_text("from pathlib import Path\nimport hashlib,os,subprocess\nr=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261009/build-040/receipt.json'\nassert hashlib.sha256(p.read_bytes()).hexdigest()=='99fc6e628c99e635cf8f4a04cadbb5cd4787096cb24a41e3358d68f7b9a4061f'\nenv=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256(p.read_bytes()).hexdigest()\nraise SystemExit(subprocess.run(['node','tools/overhaul-camera-058/capture.mjs','.sites-runtime/overhaul-20261010/camera058-play'],cwd=r,env=env,creationflags=subprocess.CREATE_NO_WINDOW,timeout=115).returncode)\n",encoding='utf8')
rows=[]
for x in json.loads((build/'receipt.json').read_text())['files']:
 v=row(build/'playable-root'/x['path']);assert v['sha256']==x['sha256'] and v['bytes']==x['bytes'];rows.append(v)
for p in [Path(__file__),capture,launch,old,r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py',build/'receipt.json']:rows.append(row(p))
out=here/'play-seal.json';assert not out.exists();out.write_text(json.dumps({'files':rows,'command':['python','tools/overhaul-camera-058/launch-play.py'],'scope':'ONE040 ordinary controls/public Low/newPounce,24s rAF;80work30close120root20ready. No injections or performance approval.'},indent=2),encoding='utf8');print(row(out))
