from pathlib import Path
import hashlib,os,subprocess,json
r=Path(__file__).resolve().parents[2];env=os.environ.copy()
env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256((r/'.sites-runtime/overhaul-20261009/build-054/receipt.json').read_bytes()).hexdigest()
env['KITTYMECH_ASSET_SHA']=json.loads((r/'.sites-runtime/overhaul-20261009/build-054/playable-root/src/game/entities/identity57Runtime121Manifest.json').read_text())['sha256']
raise SystemExit(subprocess.call(['node','tools/player-integration-134/capture.mjs','.sites-runtime/overhaul-20261010/contact134-public'],cwd=r,env=env))
