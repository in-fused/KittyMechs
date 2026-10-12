from pathlib import Path
import re
r=Path(__file__).resolve().parents[2];s=(r/'tools/overhaul-street-player-030.mjs').read_text(encoding='utf8')
s=s.replace('street-player-030','art-player-035').replace("origin='http://localhost:8801'","origin='http://localhost:8802'")
s=re.sub("scope:'[^']*'","scope:'Fresh build029 material034 and actual-height closer camera; full public supported sequence and ordinary dynamically steered district route. No source032 native contact admission; independent art/gameplay review required.'",s,count=1)
s=s.replace("await p.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(value);","await p.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(value);if(value){const distance=await p.getByRole('slider',{name:'Feline preview camera distance',exact:true}).inputValue();if(distance!=='6')throw Error('Expected explicit persisted6m feline preference');}")
start=s.index(' for(const [x,z] of [[0,-8]');end=s.index(" evidence.status='OBSERVATION_COMPLETE_INDEPENDENT_REVIEW_REQUIRED';",start)
s=s[:start]+''' for(const [x,z] of [[0,-42],[0,-76],[0,-108]]){
  const deadline=Date.now()+16000;await host.bringToFront();await host.keyboard.down('KeyW');
  try{while(true){guard();s=await state();const dx=x-s.a.position.x,dz=z-s.a.position.z;if(Math.hypot(dx,dz)<2.5)break;if(Date.now()>deadline)throw Error('Ordinary public destination not reached '+z);const heading=Math.atan2(-dx,-dz),delta=Math.atan2(Math.sin(heading-s.r.camera.movementYaw),Math.cos(heading-s.r.camera.movementYaw));if(Math.abs(delta)>.035){const key=delta>0?'KeyJ':'KeyL';await host.keyboard.down(key);try{await host.waitForTimeout(Math.min(90,Math.max(20,Math.abs(delta)*230)));}finally{await host.keyboard.up(key);}}else await host.waitForTimeout(90);}}
  finally{await host.keyboard.up('KeyW');}
  await sample('ordinary dynamically steered road destination '+z);
 }
''' +s[end:]
o=r/'tools/overhaul-art-player-035.mjs';assert not o.exists();o.write_text(s,encoding='utf8')
