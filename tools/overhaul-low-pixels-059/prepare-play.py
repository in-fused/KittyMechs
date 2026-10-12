from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];here=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
old=r/'tools/overhaul-play-experience-057/capture.mjs';s=old.read_text().replace('Experience057','LowBudget059').replace('now-start>=18000','now-start>=12000')
s=s.replace('forward/back/side travel and upright transformation.', 'movement/stance and Low pixel-budget/report UI review; no upward-camera repeat.')
start=s.index(" await segment('rest'");end=s.index('\n}catch(error)',start)
s=s[:start]+''' await segment('rest',[],2000);await segment('forward',['KeyW'],3000);await segment('backward',['KeyS'],3000);
 await page.keyboard.press('KeyR');await segment('upright',['KeyW'],2000);await page.keyboard.press('KeyR');await segment('quadruped',['KeyS'],2000);e.frames=await frames;
 const report=page.getByRole('group',{name:'Renderer report',exact:true});e.buffers=[];
 const buffer=async(name)=>{phase=name;guard();await page.waitForFunction(()=>{const c=document.querySelector('canvas');return c&&c.width>0&&c.height>0&&c.width*c.height<=921600+4000;},null,{timeout:5000});await page.waitForTimeout(1500);const b=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight}));if(b.width*b.height>925600)throw Error('Low budget exceeded');e.buffers.push({name,...b,report:await report.innerText()});await page.screenshot({path:resolve(output,name+'.png')});};
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await buffer('report-1440');
 await page.setViewportSize({width:1920,height:1080});await buffer('report-1920');
 await page.setViewportSize({width:3840,height:2160});await buffer('report-3840');
 await page.setViewportSize({width:1440,height:900});await buffer('report-restored');await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();await segment('resumed',['KeyW'],1000);e.status='CAPTURED_REVIEW_REQUIRED';
''' +s[end:]
capture=here/'capture.mjs';assert not capture.exists();capture.write_text(s,encoding='utf8')
build=r/'.sites-runtime/overhaul-20261009/build-041';receipt=row(build/'receipt.json');assert receipt['sha256']=='5d8ceac51465cf20ae96e3c1c96d777595d0bb1ae3ff44d6160c0465e143eb10'
launch=here/'launch-play.py';assert not launch.exists();launch.write_text("from pathlib import Path\nimport hashlib,os,subprocess\nr=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261009/build-041/receipt.json'\nassert hashlib.sha256(p.read_bytes()).hexdigest()=='5d8ceac51465cf20ae96e3c1c96d777595d0bb1ae3ff44d6160c0465e143eb10'\nenv=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256(p.read_bytes()).hexdigest()\nraise SystemExit(subprocess.run(['node','tools/overhaul-low-pixels-059/capture.mjs','.sites-runtime/overhaul-20261010/low059-play'],cwd=r,env=env,creationflags=subprocess.CREATE_NO_WINDOW,timeout=115).returncode)\n",encoding='utf8')
rows=[]
for x in json.loads((build/'receipt.json').read_text())['files']:
 v=row(build/'playable-root'/x['path']);assert v['sha256']==x['sha256'] and v['bytes']==x['bytes'];rows.append(v)
for p in [Path(__file__),capture,launch,old,r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py',build/'receipt.json']:rows.append(row(p))
out=here/'play-seal.json';assert not out.exists();out.write_text(json.dumps({'files':rows,'command':['python','tools/overhaul-low-pixels-059/launch-play.py'],'scope':'ONE041 ordinary Low/public controls,12s rAF and ESC Settings/report at1440/1920/3840/restored/resume.80work30close120root20ready. No injection/IAB claim or camera-quality-gate retry.'},indent=2),encoding='utf8');print(row(out))
