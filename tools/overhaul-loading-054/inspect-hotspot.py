from pathlib import Path
import json
r=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261010/loading054-public'
for label in ['host','guest']:
 profile=json.loads((p/(label+'-startup.cpuprofile')).read_text(encoding='utf8'))
 nodes={n['id']:n for n in profile['nodes']};parent={c:n['id'] for n in nodes.values() for c in n.get('children',[])}
 hot=[n for n in nodes.values() if n['callFrame']['functionName']=='X' and 'three-' in n['callFrame']['url']]
 for n in hot:
  cf=n['callFrame'];asset=r/'.sites-runtime/overhaul-20261009/build-037/playable-root/dist'/cf['url'].split('8799/')[1]
  lines=asset.read_text(encoding='utf8').splitlines();line=lines[cf['lineNumber']];col=cf['columnNumber'];stack=[];i=n['id']
  while i in nodes:
   c=nodes[i]['callFrame'];stack.append({'name':c['functionName'],'url':c['url'],'line0':c['lineNumber'],'column0':c['columnNumber']})
   if i not in parent:break
   i=parent[i]
  print(json.dumps({'client':label,'node':n['id'],'source':line[max(0,col-180):col+550],'stack':stack[:18]}))
for label in ['host','guest']:
 a=json.loads((p/'analysis.json').read_text(encoding='utf8'))['clients'][label]
 print(json.dumps({'client':label,'assets':[v for v in a['assets'] if any(s in v.get('url','') for s in ['Pounce','Sentinel','identity','pounce','57'])],'lastOwners':a['lastSample'].get('owners'),'lastCamera':a['lastSample'].get('camera'),'overlay':a['lastSample'].get('overlay')}))
