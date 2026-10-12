from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
# Preserve the excluded073 camera bytes after restoring shipping043 camera.
p=r/'tools/overhaul-camera-073/preimages/CameraRig.tsx';b=p.read_bytes().replace(b'obstructionOrbit071',b'obstructionOrbit073').replace(b'ObstructionOrbit071',b'ObstructionOrbit073')
assert hashlib.sha256(b).hexdigest()=='4758837bb96702ef5cc77e79010f5d2abfada81ace4901490b8474bfcd9f1e07'
(h/'excluded-CameraRig073.tsx').write_bytes(b)
assert hashlib.sha256((r/'src/game/camera/CameraRig.tsx').read_bytes()).hexdigest()=='8c5579319b0397c7a945c19c5688063a91fff8e32c6ae1e2a5686c3c89906a2f'
paths={p for name in ['src','shared','server'] for p in (r/name).rglob('*') if p.is_file()}
paths.update(r/p for p in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','docs/overhaul/critic/render-rescue-074-source-review.md','tools/overhaul-root-round-027/run-seal.py','tools/overhaul-camera-073/cover-result.json','.sites-runtime/overhaul-20261010/camera073-cover/process-receipt.json','.sites-runtime/overhaul-20261010/rescue-hull071-tests/process-receipt.json'])
paths.update([Path(__file__),h/'excluded-CameraRig073.tsx'])
(h/'build-seal.json').write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'command':['npm.cmd','run','build'],'scope':'ONE074 render/rescue candidate only; camera071/073 excluded after return failure. No userlag/mission acceptance.'},indent=2))
