from pathlib import Path
import hashlib,json,ast
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;sha=lambda b:hashlib.sha256(b).hexdigest();rows={}
def bind(name,expected=None):
 b=(r/name).read_bytes();assert expected is None or sha(b)==expected,name;rows[name]={'path':name,'bytes':len(b),'sha256':sha(b)};return b
for name,digest in [
 ('tools/overhaul-build-envelope-226/protected-inputs.json','9a76a367f367d41aaa5ef9b6f43876b1f99179d90d5de29a683814f2728d0b3a'),
 ('tools/overhaul-native-idle-230/source-seal.json','bcd0a01100b2a2cb4e86410bb38af9a891807c11e679eed8a8d1250b000b93c7'),
 ('tools/overhaul-shader-startup-232/source-seal.json',None)]:
 data=json.loads(bind(name,digest));assert data['writer']=='CLOSED'
 for row in data['files']:bind(row['path'],row['sha256'])
canvas='tools/overhaul-shader-startup-232/GameCanvas232.tsx';owner='tools/overhaul-native-idle-230/nativeOwner230.ts';assert canvas in rows and owner in rows
assert rows[owner]['sha256']=='d9fd180751f5985b07dea3486c88a6d0491932ef6b7bbd96ab619b5aeeb30db9'
bind('docs/overhaul/startup229-design-reassessment.md','259faf46e9f300b3f54bde74f39e40e4ff6d1d5392dcb7b034eb2b781159fbbe')
bind('.sites-runtime/overhaul-20261011/shader233-capability/evidence.json')
old=(r/'tools/overhaul-build-envelope-226/run-build226.py').read_bytes();(f/'run-build226-preimage.py').write_bytes(old)
s='\n'.join(old.decode().splitlines())+'\n';s=s.replace('KITTYMECH_226_BUILD_APPROVED','KITTYMECH_234_BUILD_APPROVED').replace('build-supervisor226','startup234-supervisor').replace('tools/overhaul-build-envelope-226/protected-inputs.json','tools/overhaul-startup-integration-234/binding.json').replace('tools/overhaul-native-admission-225/build225.mjs','tools/overhaul-startup-integration-234/build234.mjs').replace('native225-private','startup234-private')
s=s.replace('for pid in ids.ids[:ids.count]:owned[str(pid)]=creation(pid)',"for pid in ids.ids[:ids.count]:\n    stamp=creation(pid)\n    if stamp is not None:owned.setdefault(str(pid),stamp)")
ast.parse(s);(f/'supervise234.py').write_text(s,encoding='utf8',newline='\n')
for p in sorted(f.iterdir()):
 if p.is_file() and p.name not in ['binding.json','source-seal.json']:bind(p.relative_to(r).as_posix())
binding={'writer':'CLOSED','scope':'ONE_PRIVATE234_COMBINED_SHADER232_IDLE230_SOURCE_ONLY; completeprotected222/225/220+originalruntime; fullart/errors/20s unchanged','canvas':rows[canvas],'owner':rows[owner],'files':list(rows.values())}
(f/'binding.json').write_text(json.dumps(binding,indent=2),encoding='utf8')
print(json.dumps({'status':'STATIC_BINDING_READY','files':len(rows),'canvasSHA256':rows[canvas]['sha256'],'ownerSHA256':rows[owner]['sha256'],'jobs':0}))
