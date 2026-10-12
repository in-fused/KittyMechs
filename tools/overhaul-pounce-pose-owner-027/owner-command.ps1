$ErrorActionPreference = 'Stop'
# Root serial only, independently capped60s inclusive startup/cleanup.
& 'D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe' --background --factory-startup --python-exit-code 1 --python 'C:/Users/Taylor/Documents/GitHub/KittyMech-Web/assets/source/overhaul-pounce-pose-owner-027/owner_validation.py'
exit $LASTEXITCODE
