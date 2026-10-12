from pathlib import Path
r=Path(__file__).resolve().parents[2]
s=(r/'tools/overhaul-root-round-035/recovery036.py').read_text(encoding='utf8')
s=s.replace("'handoff-035']]","'handoff-035','handoff-036']]")
s=s.replace("dest=r/'.sites-runtime/overhaul-20261010/handoff-036'","dest=r/'.sites-runtime/overhaul-20261010/handoff-037'")
s=s.replace('continuation-verification-035.json','continuation-verification-036.json')
s=s.replace('continuation-verification-036.json\';assert not out.exists()', 'continuation-verification-037.json\';assert not out.exists()')
s=s.replace('035/files,036/files in order','035/files,036/files,037/files in order')
out=r/'tools/overhaul-loading-054/recovery037.py';assert not out.exists();out.write_text(s,encoding='utf8')
print('Prepared source delta037; not copied yet.')
