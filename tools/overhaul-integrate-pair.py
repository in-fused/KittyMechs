from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'shared/simulation.ts'
s=p.read_text(encoding='utf-8')
if 'private releasePair(' not in s:
    marker='  private beginStrike('
    assert s.count(marker)==1
    s=s.replace(marker,(root/'tools/overhaul-pair-methods.txt').read_text(encoding='utf-8')+'\n'+marker)
old="      if(amount>0&&target.hp>0){target.velocity.x-=hit.normal.x*hit.impulse;target.velocity.z-=hit.normal.z*hit.impulse;target.velocity.y+=Math.max(1.5,-hit.normal.y*hit.impulse);if(hit.kind==='tackle'&&target.climb)this.detachClimb(target,this.physics.get(target.id)!);}"
new="""      if(amount>0&&target.hp>0){
        const source=this.actors.get(hit.owner)!,pair=createPair(source,target,this.time,hit.normal,hit.actionId);
        if(pair){this.endStrike(source);this.endStrike(target);source.pair=pair[0];target.pair=pair[1];source.velocity.x=source.velocity.z=target.velocity.x=target.velocity.z=0;}
        else {target.velocity.x-=hit.normal.x*hit.impulse;target.velocity.z-=hit.normal.z*hit.impulse;target.velocity.y+=Math.max(1.5,-hit.normal.y*hit.impulse);if(hit.kind==='tackle'&&target.climb)this.detachClimb(target,this.physics.get(target.id)!);}
      }"""
assert s.count(old)==1
s=s.replace(old,new)
s=s.replace('    const attacker=this.actors.get(owner);','    const attacker=this.actors.get(owner);\n    if(target.pair&&target.pair.other!==owner&&amount>=10)this.releasePair(target);')
s=s.replace('    if(target.hp===0) {','    if(target.hp===0) {\n      this.releasePair(target,true);')
p.write_text(s,encoding='utf-8')
