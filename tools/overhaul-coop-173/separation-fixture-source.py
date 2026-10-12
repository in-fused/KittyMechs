from pathlib import Path
p=Path('tools/overhaul-coop-173/phased.test.mjs');t=p.read_text().replace("block:'fixture',position:{x:-7,y:1,z:9.3}","block:0,position:{x:-7,y:1,z:9.3}");p.write_text(t)
p=Path('tools/overhaul-coop-173/interaction-separation.mjs');t=p.read_text().replace('maxTravel:3,oneLeg:true,lastRadius', 'maxTravel:3,oneLeg:true,waypointBudget:{limit:12,used:1,remaining:11},lastRadius');p.write_text(t)
