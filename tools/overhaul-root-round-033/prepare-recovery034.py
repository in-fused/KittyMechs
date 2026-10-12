from pathlib import Path
r=Path(__file__).resolve().parents[2]
s=(r/'tools/overhaul-root-round-032/recovery033.py').read_text()
s=s.replace("'handoff-032']]", "'handoff-032','handoff-033']]")
s=s.replace("dest=r/'.sites-runtime/overhaul-20261010/handoff-033'", "dest=r/'.sites-runtime/overhaul-20261010/handoff-034'")
s=s.replace('continuation-verification-032.json','continuation-verification-033.json')
s=s.replace("out=r/'.sites-runtime/overhaul-20261010/continuation-verification-033.json'", "out=r/'.sites-runtime/overhaul-20261010/continuation-verification-034.json'")
s=s.replace('032/files,033/files in order','032/files,033/files,034/files in order')
assert "'handoff-032','handoff-033']" in s
assert 'continuation-verification-034.json' in s
p=Path(__file__).with_name('recovery034.py');assert not p.exists();p.write_text(s)
