from pathlib import Path
import hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
p=r/'tools/player-experience-158/play158.mjs'
assert hashlib.sha256(p.read_bytes()).hexdigest()=='50bbab5c611fed034edc7ec8dd07db9f6cc777dd7663fcc91d863a6cda32dc37'
s=p.read_text(encoding='utf8').replace('playability158-public','playability166-public').replace('Playable158','Playable166')
s=s.replace('ONE158 source155 heading/phase/mount candidate, default6m ON/OFF plus ordinary side departure.','ONE166 assembled164 final-role/support/affine candidate and167 shared zoom, fresh default10m/wheel then ordinary6m ON/OFF plus side departure.')
s=s.replace("await distance('Feline preview camera distance');",'')
needle=" await page.keyboard.press('KeyV');\n const segment="
insert=""" await page.waitForTimeout(400);const defaultCamera=await read('on-default-camera');
 if(defaultCamera.camera.preferredDistance!==10)throw Error('Fresh shared default camera distance is not10m');
 await page.screenshot({path:resolve(output,'default-camera.png')});
 await page.mouse.move(720,450);await page.mouse.wheel(0,200);await page.waitForTimeout(400);const zoomed=await read('on-wheel-out');
 if(zoomed.camera.preferredDistance!==12)throw Error('Preview mouse-wheel zoom did not reach12m');
 await page.screenshot({path:resolve(output,'wheel-out.png')});
 await page.mouse.wheel(0,-200);await page.waitForTimeout(400);const returned=await read('on-wheel-return');
 if(returned.camera.preferredDistance!==10)throw Error('Preview mouse-wheel return did not reach10m');
 evidence.sharedCamera167={defaultDistance:10,wheelOut:12,wheelReturn:10,actualPublicWheelObserved:true,scope:'Preferred distance only; actual framing judged separately.'};
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await distance('Camera distance');await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();
 await page.keyboard.press('KeyV');
 const segment="""
assert needle in s;s=s.replace(needle,insert,1)
needle="await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(false);await distance('Camera distance');"
insert="const beforeToggle=await page.getByLabel('Camera distance',{exact:true}).inputValue();await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(false);const afterToggle=await page.getByLabel('Camera distance',{exact:true}).inputValue();if(beforeToggle!==afterToggle||afterToggle!=='6')throw Error('Model toggle changed shared camera distance');evidence.sharedCamera167.togglePreservedDistance=Number(afterToggle);"
assert needle in s;s=s.replace(needle,insert)
q=h/'play166.mjs';assert not q.exists();q.write_text(s,encoding='utf8');print('ONE166 observer derived immutable158; default/wheel/toggle plus164 gate; UNRUN')
