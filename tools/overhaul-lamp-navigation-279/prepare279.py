from pathlib import Path
import shutil,json,re
R=Path(__file__).resolve().parents[2];H=Path(__file__).parent
for path in ['shared/navigation.ts','tools/overhaul-coop-177/planner.mjs','tools/overhaul-coop-177/geometry-source.mjs']:
 shutil.copy2(R/path,H/'preimages'/Path(path).name)
n=(R/'shared/navigation.ts').read_text(encoding='utf-8');n="import {lampNavigationBlocked279} from './lampNavigation279';\n"+n
needle="        const box=propCollider(prop);if(!box)continue;"
assert needle in n;n=n.replace(needle,"        if(prop.kind==='lamp'){if(lampNavigationBlocked279(prop,at,at,{minY:at.y-1,maxY:at.y+2.2},CLEARANCE)){free=false;break;}continue;}\n"+needle)
insert='''  private lampSegmentFree279(a:Vec3,b:Vec3):boolean {
    const band={minY:Math.min(a.y,b.y)-1,maxY:Math.max(a.y,b.y)+2.2};
    for(let x=Math.floor((Math.min(a.x,b.x)-18)/64);x<=Math.floor((Math.max(a.x,b.x)+18)/64);x++)for(let z=Math.floor((Math.min(a.z,b.z)-18)/64);z<=Math.floor((Math.max(a.z,b.z)+18)/64);z++){
      const id=x+','+z;let props=this.props.get(id);if(!props){props=generateChunk(this.seed,x,z).props;this.props.set(id,props);}
      for(const prop of props)if(prop.kind==='lamp'&&this.propActive(prop)&&lampNavigationBlocked279(prop,a,b,band,CLEARANCE))return false;
    }return true;
  }
'''
n=n.replace('  private nearest(p:Cell):Cell|undefined {',insert+'  private nearest(p:Cell):Cell|undefined {')
n=n.replace('    return [...first,...street,...last];','    const route=[...first,...street,...last];let prior=from;for(const next of route){if(!this.lampSegmentFree279(prior,next))return [];prior=next;}return route;')
needle='        const value=cost.get(id)!+Math.hypot(dx,dz);';assert needle in n;n=n.replace(needle,'        if(!this.lampSegmentFree279(this.point(current),this.point(next)))continue;\n'+needle)
(H/'navigation279.ts').write_text(n,encoding='utf-8')
fixture=re.sub(r"from '(\./(?!lampNavigation279)[^']+)'",lambda m:"from '../../shared/"+m.group(1)[2:]+"'",n);(H/'navigation279.fixture.ts').write_text(fixture,encoding='utf-8')
g=(R/'tools/overhaul-coop-177/geometry-source.mjs').read_text(encoding='utf-8');g="import {lampNavigationBlocked279} from '../../shared/lampNavigation279.ts';\n"+g
needle="if(['crane','cargo','tower','pipes','wall'].includes(q.kind))";assert needle in g;g=g.replace(needle,"if(q.kind==='lamp'){if(lampNavigationBlocked279(q,p,p,{minY:ground+.05,maxY:ground+QUADRUPED_HEIGHT+.08},clearance)){g.lastBlock={kind:'RETAINED_LAMP_TRIMESH',owner:q.id??id+':lamp',prop:q,point:p,clearance};return noteBlock(g);}continue;}"+needle)
(H/'geometry-source279.mjs').write_text(g,encoding='utf-8')
gf=g.replace("from '../../shared/lampNavigation279.ts'","from './lampNavigation279.ts'").replace("from '../../shared/navigation.ts'","from './navigation279.fixture.ts'");(H/'geometry-source279.fixture.mjs').write_text(gf,encoding='utf-8')
p=(R/'tools/overhaul-coop-177/planner.mjs').read_text(encoding='utf-8');p="import {lampNavigationBlocked279} from '../../shared/lampNavigation279.ts';\n"+p
needle="if(['crane','cargo','tower','pipes','wall'].includes(q.kind))";assert needle in p;p=p.replace(needle,"if(q.kind==='lamp'){if(lampNavigationBlocked279(q,a,b,{minY,maxY},r))return {clear:false,blocker:{kind:'RETAINED_LAMP_TRIMESH',owner:q.id??q.kind,prop:q},terrain};continue;}"+needle)
(H/'planner279.mjs').write_text(p,encoding='utf-8');pf=p.replace("from '../../shared/lampNavigation279.ts'","from './lampNavigation279.ts'").replace("from './geometry-source.mjs'","from './geometry-source279.fixture.mjs'").replace("from './terrain-base.mjs'","from '../overhaul-coop-177/terrain-base.mjs'");(H/'planner279.fixture.mjs').write_text(pf,encoding='utf-8')
(H/'tsconfig279.json').write_text(json.dumps({'extends':'../../tsconfig.json','include':['lampNavigation279.ts','navigation279.fixture.ts','lamp279.test.ts']},indent=2),encoding='utf-8')
(H/'patch-manifest279.json').write_text(json.dumps({'writer':'CLOSED','sourceOnly':True,'aliases':[{'canonical':'shared/lampNavigation279.ts','source':'tools/overhaul-lamp-navigation-279/lampNavigation279.ts'},{'canonical':'shared/navigation.ts','source':'tools/overhaul-lamp-navigation-279/navigation279.ts'},{'canonical':'tools/overhaul-coop-177/planner.mjs','source':'tools/overhaul-lamp-navigation-279/planner279.mjs'},{'canonical':'tools/overhaul-coop-177/geometry-source.mjs','source':'tools/overhaul-lamp-navigation-279/geometry-source279.mjs'}],'mustBindAuthoritativeNPC':'server/Simulation import of canonical shared/navigation.ts must also resolve candidate; client-only overlay does not upgrade retained062 server NPCs','noChanges':['native colliders','propCollider','terrain','arrival','hulls','search limits','pulse limits']},indent=2),encoding='utf-8')
