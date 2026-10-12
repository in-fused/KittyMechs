from pathlib import Path
r=Path(__file__).resolve().parents[2]
s=(r/'tools/overhaul-root-round-033/recovery034.py').read_text()
s=s.replace("'handoff-032','handoff-033']","'handoff-032','handoff-033','handoff-034']")
s=s.replace("handoff-034'","handoff-035'",1) if False else s
s=s.replace("dest=r/'.sites-runtime/overhaul-20261010/handoff-034'","dest=r/'.sites-runtime/overhaul-20261010/handoff-035'")
s=s.replace('continuation-verification-033.json','continuation-verification-034.json').replace("out=r/'.sites-runtime/overhaul-20261010/continuation-verification-034.json'","out=r/'.sites-runtime/overhaul-20261010/continuation-verification-035.json'")
s=s.replace('033/files,034/files in order','033/files,034/files,035/files in order')
p=Path(__file__).with_name('recovery035.py');assert not p.exists();p.write_text(s)
