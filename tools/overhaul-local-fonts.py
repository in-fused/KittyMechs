"""Vendor the existing UI font families unchanged with their upstream OFL."""
from pathlib import Path
import concurrent.futures, hashlib, json, urllib.request
root=Path(__file__).resolve().parents[1]
out=root/'public/assets/fonts';out.mkdir(parents=True,exist_ok=True)
def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'KittyMech-font-vendor'}),timeout=20) as response:return response.read()
commit=json.loads(fetch('https://api.github.com/repos/google/fonts/commits/main'))['sha']
files=[(family,prefix+weight+'.ttf') for family,prefix,weights in [('barlow','Barlow-',['Regular','Medium','SemiBold','Bold']),('barlowcondensed','BarlowCondensed-',['Regular','Medium','SemiBold','Bold','ExtraBold'])] for weight in weights]+[(f,'OFL.txt') for f in ['barlow','barlowcondensed']]
def vendor(item):
    family,name=item;url=f'https://raw.githubusercontent.com/google/fonts/{commit}/ofl/{family}/{name}';data=fetch(url)
    if name.endswith('.ttf') and data[:4] not in [b'\x00\x01\x00\x00',b'OTTO']:raise ValueError('Unexpected font header')
    if name=='OFL.txt' and b'SIL OPEN FONT LICENSE Version 1.1' not in data:raise ValueError('Expected upstream OFL missing')
    target=out/family/name;target.parent.mkdir(exist_ok=True);target.write_bytes(data)
    return {'file':target.relative_to(root).as_posix(),'source':url,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:records=list(executor.map(vendor,files))
(out/'manifest.json').write_text(json.dumps({'commit':commit,'license':'SIL OFL 1.1; unchanged upstream font binaries','files':records},indent=2))
print(json.dumps({'files':len(records),'bytes':sum(r['bytes'] for r in records),'commit':commit}))
