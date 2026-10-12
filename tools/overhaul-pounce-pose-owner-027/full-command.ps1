$ErrorActionPreference = 'Stop'
# Root-only, independently cap at most300s and remaining budget before20:39cleanup.
& 'D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe' --background --factory-startup --python-exit-code 1 --python 'C:/Users/Taylor/Documents/GitHub/KittyMech-Web/assets/source/overhaul-pounce-pose-owner-027/author.py'
exit $LASTEXITCODE
