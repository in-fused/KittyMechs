from pathlib import Path
r=Path(__file__).resolve().parents[2]
s=(r/'tools/overhaul-coop-play-056/recovery038.py').read_text(encoding='utf8')
s=s.replace("'handoff-037']]","'handoff-037','handoff-038']]")
s=s.replace("dest=r/'.sites-runtime/overhaul-20261010/handoff-038'","dest=r/'.sites-runtime/overhaul-20261010/handoff-039'")
s=s.replace('continuation-verification-037.json','continuation-verification-038.json')
s=s.replace("out=r/'.sites-runtime/overhaul-20261010/continuation-verification-038.json'","out=r/'.sites-runtime/overhaul-20261010/continuation-verification-039.json'")
s=s.replace('037/files,038/files in order','037/files,038/files,039/files in order')
assert "'handoff-037','handoff-038']]" in s
(r/'tools/overhaul-play-experience-057/recovery039.py').write_text(s,encoding='utf8')
