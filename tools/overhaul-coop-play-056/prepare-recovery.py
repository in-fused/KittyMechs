from pathlib import Path
r=Path(__file__).resolve().parents[2]
s=(r/'tools/overhaul-loading-054/recovery037.py').read_text(encoding='utf8')
s=s.replace("'handoff-036']]","'handoff-036','handoff-037']]")
s=s.replace("dest=r/'.sites-runtime/overhaul-20261010/handoff-037'","dest=r/'.sites-runtime/overhaul-20261010/handoff-038'")
s=s.replace('continuation-verification-036.json','continuation-verification-037.json')
s=s.replace("out=r/'.sites-runtime/overhaul-20261010/continuation-verification-037.json'","out=r/'.sites-runtime/overhaul-20261010/continuation-verification-038.json'")
s=s.replace('036/files,037/files in order','036/files,037/files,038/files in order')
assert "'handoff-036','handoff-037']]" in s
(r/'tools/overhaul-coop-play-056/recovery038.py').write_text(s,encoding='utf8')
