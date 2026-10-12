from pathlib import Path
r=Path(__file__).resolve().parents[2]
s=(r/'tools/overhaul-root-round-032/player044-candidate.mjs').read_text()
s=s.replace("clips:o?.activeClips,ownerMs", "clips:o?.activeClips,recoil:o?.movingRecoil,ownerMs")
s=s.replace("[['idle',[]],['walking',['KeyW']],['moving-fire',['KeyW','KeyF']],['upright-walking',['KeyW','KeyA']],['standard-walking',['KeyW']]]", "[['idle',[]],['stationary-fire',['KeyF']],['quad-moving-fire',['KeyW','KeyF']],['upright-moving-fire',['KeyW','KeyA','KeyF']],['standard-walking',['KeyW']]]")
s=s.replace("name==='upright-walking'", "name==='upright-moving-fire'")
s=s.replace("await page.waitForTimeout(2600);", "await page.waitForTimeout(name==='idle'?600:name==='stationary-fire'?1200:2600);")
s=s.replace("85s finite observation bound", "047 ONE85s finite observation bound; no automatic retry")
s=s.replace("recording:true,viewport", "scope:'Matched ordinarySoloLow route: stationary fire, then unobstructed spawn quadW+F before prior crate, uprightW+A+F diagonal, previewOFF. Original044later-crateblocked route remains preserved. No injected native state.',recording:true,viewport")
p=Path(__file__).with_name('player047-observe.mjs');assert not p.exists();p.write_text(s,encoding='utf8')
