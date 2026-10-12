from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(r/'.sites-runtime/overhaul-20261009/build-055/receipt.json')=='1df161ac7c9c0857f47a554f9ce2ff7e1de37f293efdd95a5101a61720104ddc'
source=r/'tools/player-performance-135'
for name in ['capture.mjs','launch.py','extract-review.py','review-output.py']:
 s=(source/name).read_text().replace('Motion135','Render136').replace('player-performance-135','player-render-136').replace('motion135-','render136-').replace('build-055','build-056').replace('movement-cost candidate regression review','background ordering visual regression review')
 (h/name).write_text(s)
s=(source/'freeze055.py').read_text().replace('build-054','build-055').replace("new=r/'.sites-runtime/overhaul-20261009/build-055'","new=r/'.sites-runtime/overhaul-20261009/build-056'")
s=s.replace('a01b5b3b633d1897b39f0946e0b3fe89868a1b11428214c0a5d6020c2849a524','1df161ac7c9c0857f47a554f9ce2ff7e1de37f293efdd95a5101a61720104ddc').replace('shared/ownedCharacterMotion.ts','src/game/effects/WeatherSky.tsx').replace('overhaul-performance-135','player-render-136').replace('UNADMITTED055 within-query movement-cost candidate;054 anatomy/gait and nativegame retained.','UNADMITTED056 background far-depth/order candidate;055 movement and nativegame retained.')
(h/'freeze056.py').write_text(s)
s=(source/'prepare-play.py').read_text().replace('build-055','build-056').replace('player-performance-135','player-render-136').replace('overhaul-performance-135','player-render-136').replace('performance135-source-review.md','render136-raster-review.md').replace('frozen055','frozen056')
(h/'prepare-play.py').write_text(s)
paths=['src/game/effects/WeatherSky.tsx','tools/player-render-136/raster.mjs','tools/player-render-136/raster-browser.js','docs/overhaul/critic/render136-source-review.md','docs/overhaul/critic/render136-raster-review.md']
(h/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','files':[{'path':p,'bytes':(r/p).stat().st_size,'sha256':sha(r/p)} for p in paths]},indent=2))
print('136 source closed; one candidate build/freeze/visual observation prepared, not yet run.')
