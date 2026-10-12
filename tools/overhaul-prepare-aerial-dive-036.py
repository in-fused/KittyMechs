from pathlib import Path
p=Path(__file__).with_name('overhaul-art-player-036.mjs');s=p.read_text(encoding='utf8')
old="await sample('deliberate downward look before attack');s=await state();const priorDiveId=s.a.strikeProcessed;await host.keyboard.press('ShiftLeft');"
new="await sample('deliberate downward look before aerial dive');s=await state();const priorDiveId=s.a.strikeProcessed,priorDiveJump=s.a.jumpProcessed,diveLife=s.a.jumpEpoch;await host.keyboard.press('Space');await wait('actual deliberate dive aerial launch',s=>!s.a.grounded&&s.a.jumpEpoch===diveLife&&s.a.jumpProcessed>priorDiveJump,4000);await host.keyboard.press('ShiftLeft');"
assert old in s;s=s.replace(old,new,1);p.write_text(s,encoding='utf8')
