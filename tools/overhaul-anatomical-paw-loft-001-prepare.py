"""Preserve one literal loft iterator correction; never alter an old packet."""
from pathlib import Path
import hashlib, json, datetime

root = Path(__file__).resolve().parents[1]
old = root / 'assets/source/overhaul-anatomical-paw-audit-001'
new = root / 'assets/source/overhaul-anatomical-paw-loft-001'
if new.exists():
    raise SystemExit('New packet already exists; no overwrite.')
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
expected = '1942e665a6070768b8ef9bf40f2dde00d92068f654559d6c3f017b7fef44d9d0'
assert sha(old / 'author.py') == expected
source = (old / 'author.py').read_text(encoding='utf-8')
before = 'vertices=[(cx+rx*math.cos(j*2*math.pi/n),cy+ry*math.sin(j*2*math.pi/n),z) for z,rx,ry in rings]'
after = 'vertices=[(cx+rx*math.cos(j*2*math.pi/n),cy+ry*math.sin(j*2*math.pi/n),z) for z,rx,ry in rings for j in range(n)]'
assert source.count(before) == 1
fixed = source.replace(before, after)
old_name = 'Pounce_AnatomicalPaw_Audit_001'
new_name = 'Pounce_AnatomicalPaw_Loft_001'
renamed = fixed.replace(old_name, new_name)
assert renamed.replace(new_name, old_name).replace(after, before) == source
new.mkdir()
(new / 'author.py').write_text(renamed, encoding='utf-8', newline='')
contract = (old / 'CONTRACT.md').read_text(encoding='utf-8')
contract = contract.replace('assets/source/overhaul-anatomical-paw-audit-001/author.py', 'assets/source/overhaul-anatomical-paw-loft-001/author.py')
contract += '\n\n## Explicit root literal factory correction\n\nRoot authorizes this distinct packet after audit001 closed12:37:48UTC. Same inclusive hard deadline12:53:29UTC. ONLY the missing radial iterator `for j in range(n)` is added to Shapes.loft vertices. The existing ring-major face indexing and frozen n/rings/radii define the intended vertex order. All geometry parameters, Boolean recipes, anatomy, UV/weights/bind, owner, timing, tolerances and interfaces are unchanged. Three master/raw filename strings are renamed; output folder derives from this new author path. Owner path and bytes remain the protected audit001 owner. Prior partial source and raw failure remain unchanged. No execution without independent exact-diff gate and root serial grant. First actual failure stops, no retry or additional helper/shape repair. Full source, motion, art and gameplay remain unaccepted.\n'
(new / 'CONTRACT.md').write_text(contract, encoding='utf-8', newline='')
owner = root / 'tools/overhaul-anatomical-paw-audit-001/source_owner.py'
assert sha(owner) == '265fe187ee155aa01043b15838b3c00aeb653676e767159c84dc5609a8cd7c84'
manifest = {'status':'LITERAL_FACTORY_CORRECTION_UNRUN', 'createdUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'hardDeadlineUtc':'2026-10-10T12:53:29Z', 'oldAuthorSha256':expected, 'newAuthorSha256':sha(new/'author.py'), 'before':before, 'after':after, 'namespaceStrings':{'before':old_name,'after':new_name,'occurrences':source.count(old_name)}, 'outsideExactChangesTextEqual':True, 'ownerPath':str(owner),'ownerSha256':sha(owner),'shapePoseParameterChanges':False,'sourceClearanceMotionArtNativeRuntime':'UNQUALIFIED'}
(new / 'diff-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
owned = [new/'author.py',new/'CONTRACT.md',new/'diff-manifest.json']
inputs = [old/'author.py',old/'CONTRACT.md',old/'seal.json',owner,root/'assets/source/overhaul-pounce-skinned-001/Pounce_Skinned_001.blend',root/'assets/source/overhaul-pounce-bind-extractor-001/extraction/mesh-00.json',root/'assets/source/overhaul-pounce-bind-extractor-001/extraction/paw-ownership.json',root/'.sites-runtime/overhaul-20261010/anatomical-paw-decision-001/measured.json']
rows = [{'path':str(p.relative_to(root)).replace('\\','/'),'bytes':p.stat().st_size,'sha256':sha(p)} for p in owned+inputs]
(new/'seal.json').write_text(json.dumps({'status':'FROZEN_UNRUN','createdUtc':manifest['createdUtc'],'files':rows,'ownedCount':len(owned)},indent=2),encoding='utf-8')
print(json.dumps({'packet':str(new),'sealSha256':sha(new/'seal.json'),'authorSha256':sha(new/'author.py'),'diffSha256':sha(new/'diff-manifest.json'),'ownedFiles':len(owned),'protectedInputs':len(inputs)}))
