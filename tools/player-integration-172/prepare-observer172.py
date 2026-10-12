from pathlib import Path
import shutil
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;old=r/'tools/player-integration-166'
pre=h/'preimages';pre.mkdir(exist_ok=False)
for name in ['play166.mjs','assert-coordination166.mjs','observe166.py']:shutil.copy2(old/name,pre/name)
p=(old/'play166.mjs').read_text(encoding='utf8').replace('166','172')
p=p.replace("scope:'ONE172 assembled164 final-role/support/affine candidate and167 shared zoom, fresh default10m/wheel then ordinary6m ON/OFF plus side departure. Record current yaw/phase/mount and ON owner timing; OFF owner timing unavailable. No world contact qualification. No contact/body-clearance/art/humanlag/fullgoal qualification.'", "scope:'ONE newly assembled168+171. Cold OFF then ON sustained6s forward4s reverse/stop/movingR/reaction, public OFFtoggle/resume same sustainedcycle plus jump. Preserve ordinary combat and source policy. Read-only diagnostics; actual quality and human lag require separate review.'")
p=p.replace('70000','100000').replace('70s work bound','100s work bound').replace('90000','120000').replace('90s inclusive cleanup','120s inclusive cleanup')
p=p.replace("setChecked(true);await page.getByRole('button',{name:'Close settings'", "setChecked(false);await page.getByRole('button',{name:'Close settings'",1)
start="await page.waitForTimeout(400);const defaultCamera=await read('on-default-camera');"
replacement="""await page.waitForTimeout(400);await read('off-cold-start');await page.waitForTimeout(600);await read('off-cold-rest');await page.screenshot({path:resolve(output,'off-cold-start.png')});
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();await page.waitForTimeout(400);const defaultCamera=await read('on-default-camera');"""
assert start in p;p=p.replace(start,replacement)
p=p.replace("prefix+'-forward',['KeyW'],1600,true", "prefix+'-forward',['KeyW'],6000,true").replace("prefix+'-reverse',['KeyS'],1600,true", "prefix+'-reverse',['KeyS'],4000,true")
(h/'play172.mjs').write_text(p,encoding='utf8')
q=(old/'assert-coordination166.mjs').read_text(encoding='utf8').replace('166','172');(h/'assert-coordination172.mjs').write_text(q,encoding='utf8')
print('New172 observer and exact166 preimages prepared; no browser launched')
