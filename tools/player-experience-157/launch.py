import subprocess,os
env=dict(os.environ,KITTYMECH_BUILD_RECEIPT='34d18375f05622f2eedbc269419ede6359b843e3a23b62d38d772478563717cf')
p=subprocess.run(['node','tools/player-experience-157/camera-baseline.mjs'],env=env,timeout=45,creationflags=subprocess.CREATE_NO_WINDOW)
raise SystemExit(p.returncode)
