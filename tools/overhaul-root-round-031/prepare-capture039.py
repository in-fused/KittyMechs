from pathlib import Path
r=Path(__file__).resolve().parents[2]
p=r/'tools/overhaul-art-player-039.mjs';assert not p.exists()
s=(r/'tools/overhaul-art-player-038.mjs').read_text().replace('art-player-038','art-player-039').replace('localhost:8804','localhost:8805').replace('Fresh build031 levelview038','Fresh build032 extraction039 and levelview038')
s=s.replace(" evidence.status='OBSERVATION_COMPLETE_INDEPENDENT_REVIEW_REQUIRED';", """ await aim(Math.PI/2);await sample('ordinary extraction west freight and transit facades');await host.screenshot({path:resolve(output,'extraction-west.png')});
 await aim(-Math.PI/2);await sample('ordinary extraction east switching facade');await host.screenshot({path:resolve(output,'extraction-east.png')});
 evidence.status='OBSERVATION_COMPLETE_INDEPENDENT_REVIEW_REQUIRED';""",1)
p.write_text(s)
print('039 public capture prepared; same combat/stances route plus actual west/east extraction views; no cooperative mission claim')
