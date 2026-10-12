from pathlib import Path
r=Path(__file__).resolve().parents[2]
s=(r/'tools/overhaul-root-round-030/recovery030.py').read_text()
s=s.replace("['handoff-027','handoff-029']","['handoff-027','handoff-029','handoff-030']")
s=s.replace("dest=r/'.sites-runtime/overhaul-20261010/handoff-030'","dest=r/'.sites-runtime/overhaul-20261010/handoff-031'")
s=s.replace("continuation-verification-029.json","continuation-verification-030.json")
s=s.replace("out=r/'.sites-runtime/overhaul-20261010/continuation-verification-030.json'","out=r/'.sites-runtime/overhaul-20261010/continuation-verification-031.json'")
s=s.replace('overlay027/files,029/files,030/files in order','overlay027/files,029/files,030/files,031/files in order')
s=s.replace('Frozen030/031 share','Frozen030/031/032 share')
p=r/'tools/overhaul-root-round-031/recovery031.py';assert not p.exists();p.write_text(s)
print('Prepared recovery031 chain007/027/029/030/031; not copied or verified yet')
