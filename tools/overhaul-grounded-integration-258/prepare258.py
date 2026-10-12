from pathlib import Path
import hashlib, json, subprocess, ast

r = Path(__file__).resolve().parents[2]
f = Path(__file__).resolve().parent
base = r / 'tools/overhaul-grounded-integration-252'
g = r / 'tools/overhaul-grounded-motion-256'

def row(p):
    data = p.read_bytes()
    return {'path': p.relative_to(r).as_posix(), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

assert not (f / 'binding.json').exists()
candidate = json.loads((g / 'source-seal.json').read_text(encoding='utf-8'))
assert candidate['writer'] == 'CLOSED'
for item in candidate['files']:
    assert row(r / item['path']) == item, item['path']

# Reuse the already admitted asset/startup contracts; generate no source snapshot.
for name in ['plugin252.mjs', 'build252.mjs', 'supervise252.py']:
    target = f / name.replace('252', '258')
    assert not target.exists()
    text = (base / name).read_text(encoding='utf-8').replace('252', '258')
    if name == 'plugin252.mjs':
        text = text.replace("canonical={canvas:", "canonical={actor:clean(resolve('tools/overhaul-native-integration-222/NativeActor222.tsx')),canvas:")
        text = text.replace("[['canvas',", "[['actor',/\\/NativeActor(?:\\d+)?\\.tsx$/],['canvas',")
    target.write_text(text, encoding='utf-8')

rows = json.loads((base / 'binding.json').read_text(encoding='utf-8'))['files']
rows += candidate['files'] + [row(g / 'source-seal.json')]
overrides = []
for canonical, path in [
    ('src/game/GameCanvas.tsx', 'tools/overhaul-shader-startup-232/GameCanvas232.tsx'),
    ('tools/overhaul-shader-startup-232/shaderStartup232.tsx', 'tools/overhaul-shader-variant-240/shaderStartup240.tsx'),
    ('tools/overhaul-native-integration-222/nativeOwner218.ts', 'tools/overhaul-grounded-motion-256/nativeOwner256.ts'),
    ('tools/overhaul-native-integration-222/NativeActor222.tsx', 'tools/overhaul-grounded-motion-256/NativeActor256.tsx'),
]:
    item = row(r / path)
    overrides.append({'canonical': canonical, **item})
    rows.append(item)
for p in f.iterdir():
    if p.is_file() and p.name not in ['binding.json', 'source-seal.json']:
        rows.append(row(p))
rows = list({item['path']: item for item in rows}.values())
scope = 'One private258 integration of unchanged-pose ownership optimization256; actual cost/gameplay approval pending; original221 asset resource caveat retained.'
(f / 'binding.json').write_text(json.dumps({'writer':'CLOSED','scope':scope,'files':rows,'overrides':overrides},indent=2),encoding='utf-8')
for name in ['prepare258.py', 'supervise258.py']:
    ast.parse((f / name).read_text(encoding='utf-8'))
for name in ['plugin258.mjs', 'build258.mjs']:
    subprocess.run(['node', '--check', str(f / name)], cwd=r, check=True)
files = [row(p) for p in sorted(f.iterdir()) if p.is_file() and p.name != 'source-seal.json']
(f / 'source-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':scope,'files':files},indent=2),encoding='utf-8')
print(json.dumps({'writer':'CLOSED','inputs':len(rows),'sourceSeal':row(f/'source-seal.json')}))
