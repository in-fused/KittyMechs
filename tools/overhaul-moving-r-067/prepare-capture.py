from pathlib import Path
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
s=(r/'tools/overhaul-observer-063/capture.mjs').read_text().replace('Observer063','MovingR067')
s=s.replace('now-start>=22000','now-start>=27000').replace('size:{width:960,height:600}','size:{width:1440,height:900}')
start=s.index(" await segment('rest'");end=s.index(" const report=",start)
s=s[:start]+''' await segment('stage-clear-beacon',['KeyW'],2000);await segment('settle',[],1200);
 await page.keyboard.press('KeyR');await segment('standing-up',[],1200);await page.keyboard.press('KeyR');await segment('standing-down',[],1200);
 await page.keyboard.down('KeyW');try{await segment('forward',[],1200);await page.keyboard.press('KeyR');await segment('moving-up',[],1700);await page.keyboard.press('KeyR');await segment('moving-down',[],1700);}finally{await page.keyboard.up('KeyW');}
 await page.keyboard.down('KeyS');try{await segment('backward',[],1000);await page.keyboard.press('KeyR');await segment('backward-up',[],1700);await page.keyboard.press('KeyR');await segment('backward-down',[],1700);}finally{await page.keyboard.up('KeyS');}
 await page.keyboard.down('KeyW');await page.keyboard.down('KeyJ');try{await segment('turning',[],1000);await page.keyboard.press('KeyR');await segment('turning-up',[],1700);await page.keyboard.press('KeyR');await segment('turning-down',[],1700);}finally{await page.keyboard.up('KeyW');await page.keyboard.up('KeyJ');}
 await segment('left',['KeyA'],1200);await segment('right',['KeyD'],1200);await segment('final-rest',[],1500);e.frames=await frames;
''' +s[end:]
s=s.replace('movement/stance and Low pixel-budget/report UI review; no upward-camera repeat.','Standing/moving/backward/turning R and foot stance/swing/replant review; no upward-camera repeat.')
# Only the already qualified Low1440 report is needed here; no duplicate resize gate.
start=s.index(" await page.setViewportSize({width:1920");end=s.index("await page.getByRole('button',{name:'Close settings'",start)
s=s[:start]+" "+s[end:]
p=h/'capture.mjs';assert not p.exists();p.write_text(s,encoding='utf8');print('067 public-control capture prepared, unexecuted; candidate build/source gate still pending')
