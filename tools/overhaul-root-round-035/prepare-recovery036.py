from pathlib import Path
r=Path(__file__).resolve().parents[2];s=(r/'tools/overhaul-root-round-034/recovery035.py').read_text()
s=s.replace("'handoff-033','handoff-034']","'handoff-033','handoff-034','handoff-035']")
s=s.replace("dest=r/'.sites-runtime/overhaul-20261010/handoff-035'","dest=r/'.sites-runtime/overhaul-20261010/handoff-036'")
s=s.replace('continuation-verification-034.json','continuation-verification-035.json').replace("out=r/'.sites-runtime/overhaul-20261010/continuation-verification-035.json'","out=r/'.sites-runtime/overhaul-20261010/continuation-verification-036.json'")
s=s.replace('034/files,035/files in order','034/files,035/files,036/files in order')
p=Path(__file__).with_name('recovery036.py');assert not p.exists();p.write_text(s)
