"""Animation-only GLB merge: retain original scene JSON and binary prefix exactly."""
from pathlib import Path
import json,struct,hashlib,copy
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
def read(p):
 b=p.read_bytes();magic,version,length=struct.unpack_from('<III',b);assert magic==0x46546c67 and version==2 and length==len(b)
 at=12;chunks=[]
 while at<len(b):
  n,t=struct.unpack_from('<II',b,at);at+=8;chunks.append((t,b[at:at+n]));at+=n
 assert [t for t,_ in chunks]==[0x4e4f534a,0x004e4942]
 return json.loads(chunks[0][1]),chunks[1][1],b
def run():
 manifest=json.loads((ROOT/'src/game/entities/identity57Runtime121Manifest.json').read_text())
 records=json.loads((ROOT/'assets/source/overhaul-stance-gait-194/authored-motion-records194.json').read_text())
 base,bb,bfile=read(ROOT/('public'+manifest['publicURL']));raw,rb,rfile=read(ROOT/'tools/overhaul-stance-gait-194/output/Pounce_Motion194.raw.glb')
 assert len(base['buffers'])==len(raw['buffers'])==1
 selected={r['name'] for r in records};assert len(selected)==6
 out=copy.deepcopy(base);binary=bytearray(bb);nodes={n.get('name'):i for i,n in enumerate(base['nodes'])};assert len(nodes)==len(base['nodes'])
 views={};accessors={}
 def accessor(i):
  if i in accessors:return accessors[i]
  a=copy.deepcopy(raw['accessors'][i]);assert not a.get('sparse') and not a.get('extensions')
  v=a['bufferView']
  if v not in views:
   bv=copy.deepcopy(raw['bufferViews'][v]);assert bv.get('buffer',0)==0 and not bv.get('extensions')
   start=bv.get('byteOffset',0);n=bv['byteLength'];assert start+n<=len(rb)
   while len(binary)%4:binary.append(0)
   bv['buffer']=0;bv['byteOffset']=len(binary);binary.extend(rb[start:start+n]);views[v]=len(out['bufferViews']);out['bufferViews'].append(bv)
  a['bufferView']=views[v];accessors[i]=len(out['accessors']);out['accessors'].append(a);return accessors[i]
 for i,old in enumerate(base['animations']):
  if old['name'] not in selected:continue
  matches=[a for a in raw['animations'] if a['name']==old['name']];assert len(matches)==1
  new=copy.deepcopy(matches[0]);assert not new.get('extensions')
  for s in new['samplers']:
   assert not s.get('extensions');s['input']=accessor(s['input']);s['output']=accessor(s['output'])
  for c in new['channels']:
   assert not c.get('extensions') and not c['target'].get('extensions')
   name=raw['nodes'][c['target']['node']]['name'];assert name in nodes;c['target']['node']=nodes[name]
  out['animations'][i]=new
 out['buffers'][0]['byteLength']=len(binary)
 for key in set(base)-{'buffers','bufferViews','accessors','animations'}:assert out[key]==base[key],key
 assert out['bufferViews'][:len(base['bufferViews'])]==base['bufferViews'] and out['accessors'][:len(base['accessors'])]==base['accessors']
 assert bytes(binary[:len(bb)])==bb
 assert all(a==out['animations'][i] for i,a in enumerate(base['animations']) if a['name'] not in selected)
 j=json.dumps(out,separators=(',',':'),ensure_ascii=False).encode();j+=b' '*((-len(j))%4);binary+=b'\0'*((-len(binary))%4)
 b=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary
 output=HERE/'Pounce_Motion196.glb';output.write_bytes(b);decoded,db,_=read(output);assert decoded==out and db[:len(bb)]==bb
 receipt={'status':'RAW_GLB_MERGE_PRESERVES_BASE_SCENE_AND_BINARY','baseSHA256':sha(bfile),'rawSHA256':sha(rfile),'outputSHA256':sha(b),'outputBytes':len(b),'baseBytes':len(bfile),'addedBytes':len(b)-len(bfile),'selected':sorted(selected),'retainedAnimations':39,'retainedNodes':len(base['nodes']),'addedAccessors':len(accessors),'addedBufferViews':len(views),'gameAdmission':'UNADMITTED_PENDING_DECODE_AND_SOURCE_VISUAL_REVIEW'}
 (HERE/'merge-receipt196.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
if __name__=='__main__':run()
