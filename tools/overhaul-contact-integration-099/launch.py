from pathlib import Path
import os,subprocess,hashlib
r=Path(__file__).resolve().parents[2];env=dict(os.environ);env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256((r/'.sites-runtime/overhaul-20261009/build-049/receipt.json').read_bytes()).hexdigest()
raise SystemExit(subprocess.call(['node','--import','tsx','tools/overhaul-contact-play-100/capture.mjs','.sites-runtime/overhaul-20261010/contact099-candidate'],cwd=r,env=env))
