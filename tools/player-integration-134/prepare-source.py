from pathlib import Path
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
s=(r/'tools/player-integration-125/capture.mjs').read_text()
s=s.replace('Anatomy125','Contact134').replace('Pounce anatomy121 actualnewskin/footfall/contact/moving-R review','Pounce integrated contact132 reversal/moving-R review')
start=s.index(" await segment('idle'");end=s.index(" await page.keyboard.press('Escape')",start)
s=s[:start]+''' await segment('idle',[],450);await segment('quad-forward',['KeyW'],1400);await segment('quad-stop',[],450);await segment('quad-reverse',['KeyS'],1400);await segment('reverse-stop',[],450);
 await page.keyboard.down('KeyW');await page.keyboard.press('KeyR');try{await segment('moving-R-up',[],900);}finally{await page.keyboard.up('KeyW');}
 await segment('upright-forward',['KeyW'],1000);await segment('upright-stop',[],450);await segment('upright-reverse',['KeyS'],1000);await segment('upright-reverse-stop',[],450);
 await page.keyboard.down('KeyS');await page.keyboard.press('KeyR');try{await segment('moving-R-down-reverse',[],900);}finally{await page.keyboard.up('KeyS');}
 await segment('quad-return',['KeyW'],900);await segment('final-idle',[],650);
'''+s[end:]
s=s.replace("await segment('standard-plain-forward',['KeyW'],1800)","await segment('standard-plain-forward',['KeyW'],900)")
(h/'capture.mjs').write_text(s)
s=(r/'tools/player-integration-125/launch.py').read_text().replace('build-053','build-054').replace('player-integration-125/capture.mjs','player-integration-134/capture.mjs').replace('anatomy125-public','contact134-public');(h/'launch.py').write_text(s)
print('Fresh shorter hull-clear route source generated; no game or browser job')
