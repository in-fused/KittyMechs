from pathlib import Path
p=Path('tools/overhaul-coop-173/motion-scheduler.mjs');t=p.read_text().replace('actor?.downed&&p.name!==name&&downedPhase','actor?.downed&&p.name!==active.name&&downedPhase').replace('||!positionEqual(a.position,p.position)||speed(a)>.12','||speed(a)>.12||a.lastInput<p.packet.input.seq&&!p.downed')
t=t.replace("else if(a.hp<=0||a.downed||a.hp<r.hp)throw Error('173 damage invalidates motion commitment; release and STOP');", "else if(a.hp<=0||a.downed){const error=Error('173 actor downed invalidates living motion commitment');error.actorDowned=true;throw error;}else if(a.hp<r.hp)throw Error('173 damage invalidates motion commitment; release and STOP');")
p.write_text(t)
