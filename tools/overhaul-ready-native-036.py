from pathlib import Path
p=Path(__file__).with_name('overhaul-art-player-036.mjs');s=p.read_text(encoding='utf8')
n=' const observedGuest=await read(guest)'
a=" await guest.waitForFunction(()=>window.kittyMechDebug.snapshot().actors.some(a=>a.name==='PreviewGuest'&&a.lastInput>0&&a.hp>0&&!a.pair),undefined,{timeout:5000,polling:100});\n const observedGuest=await read(guest)"
assert n in s;s=s.replace(n,a,1);p.write_text(s,encoding='utf8')
