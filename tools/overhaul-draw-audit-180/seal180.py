from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
paths=[p for p in h.iterdir() if p.is_file() and p.name not in ['source-seal.json','public-seal.json']]
paths.extend(r/name for name in ['package.json','package-lock.json','tools/overhaul-play-ready.mjs','tools/overhaul-root-round-027/run-seal.py','node_modules/three/src/renderers/webgl/WebGLIndexedBufferRenderer.js','node_modules/three/src/renderers/webgl/WebGLBufferRenderer.js'])
b=r/'.sites-runtime/overhaul-20261009/build-061';assert sha(b/'receipt.json')=='0f85163eac0dbc7047caf84ae725b094f38b1ca3ceccc3ee0bfbb9b4bb612215'
protected=[row(b/'receipt.json')]
for x in json.loads((b/'receipt.json').read_text())['files']:
 p=b/'playable-root'/x['path'];assert sha(p)==x['sha256'] and p.stat().st_size==x['bytes'];protected.append(row(p))
out=h/'source-seal.json';assert not out.exists();out.write_text(json.dumps({'writer':'CLOSED','scope':'Read-only test-page draw attribution; no production changes or gameplay acceptance. Fixture limited/API delegation counts; actual browser gate required.','files':[row(p) for p in paths],'protected':protected},indent=2),encoding='utf8');print(sha(out))
