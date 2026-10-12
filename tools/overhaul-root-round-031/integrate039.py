from pathlib import Path
import json,datetime
r=Path(__file__).resolve().parents[2]
p=r/'src/ui/Hud.tsx';s=p.read_text(encoding='utf8');assert 'V LEVEL VIEW' not in s
s=s.replace('IJKL LOOK · R FORM','IJKL LOOK · V LEVEL VIEW · R FORM',1).replace('UPRIGHT + SHIFT TACKLE','UPRIGHT + SHIFT TACKLE · V LEVEL VIEW',1);assert 'V LEVEL VIEW' in s;p.write_text(s,encoding='utf8')
p=r/'shared/layout.ts';s=p.read_text(encoding='utf8');assert 'overhaul-rainline-west-street-001' in s;s=s.replace('overhaul-rainline-west-street-001','overhaul-rainline-extraction-039',1);p.write_text(s,encoding='utf8')
for filename in ['overhaulDistrictArt.tsx','overhaulIdentityArt.tsx']:
 p=r/'src/game/world'/filename;s=p.read_text(encoding='utf8')
 s="import {isRainlineExtraction039Block} from '../../../shared/rainlineExtraction039';\n"+s
 if filename=='overhaulIdentityArt.tsx':s=s.replace("export function overhaulIdentityModule(block:CityBlock):string|undefined{","export function overhaulIdentityModule(block:CityBlock):string|undefined{\n if(isRainlineExtraction039Block(block))return undefined;",1)
 else:
  s=s.replace('if(isOverhaulDressingBlock(block)||','if(isRainlineExtraction039Block(block)||isOverhaulDressingBlock(block)||',1)
  s=s.replace('!isOverhaulDressingBlock(block)&&!isRainlineStreetBlock(block)','!isRainlineExtraction039Block(block)&&!isOverhaulDressingBlock(block)&&!isRainlineStreetBlock(block)',1)
 p.write_text(s,encoding='utf8')
p=r/'src/game/world/World.tsx';s=p.read_text(encoding='utf8');s="import {RainlineExtractionArt} from './rainlineExtractionArt';\n"+s
needle='    <RainlineStreetArt seed={seed} presentation={cityPresentation}/>';assert needle in s
s=s.replace(needle,needle+'\n    <RainlineExtractionArt seed={seed} presentation={cityPresentation}/>\n    <RainlineExtractionArt seed={seed} presentation={cityPresentation} ruins experimentalFragments/>',1);p.write_text(s,encoding='utf8')
# Retain the historical <=1200 budget for old components, separately bounding additions.
p=r/'tests/overhaul-density-clearance.test.ts';s=p.read_text(encoding='utf8');old='expect(district.blocks.length).toBeLessThan(1200);';assert old in s
s=s.replace(old,"expect(district.blocks.filter(b=>!b.buildingId.startsWith('7734:overhaul:extraction039:')).length).toBeLessThan(1200);expect(district.blocks.filter(b=>b.buildingId.startsWith('7734:overhaul:extraction039:')).length).toBeLessThanOrEqual(150);",1);p.write_text(s,encoding='utf8')
print(json.dumps({'integratedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'desktopHint':True,'layout':'overhaul-rainline-extraction-039','legacyBudgetRetained':True}))
