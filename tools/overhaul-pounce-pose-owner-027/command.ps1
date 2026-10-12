$ErrorActionPreference = 'Stop'
# Root-only serial launch. Root owns external 60s timeout, kill and observed wait.
& 'D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe' --background --factory-startup --python-exit-code 1 --python 'C:/Users/Taylor/Documents/GitHub/KittyMech-Web/assets/source/overhaul-pounce-pose-owner-027/diagnostic.py'
exit $LASTEXITCODE
