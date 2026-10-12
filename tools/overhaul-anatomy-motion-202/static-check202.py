import ast,json,pathlib,hashlib
root=pathlib.Path(__file__).resolve().parents[2];folder=root/'tools/overhaul-anatomy-motion-202';source=root/'assets/source/overhaul-anatomy-motion-202'
files=sorted(list(folder.glob('*.py'))+list(source.glob('*.py')));rows=[]
for path in files:
 tree=ast.parse(path.read_text(encoding='utf-8-sig'),filename=str(path));rows.append({'path':str(path.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'ast':'PASS','functionCalls':sorted({n.func.id if isinstance(n.func,ast.Name) else n.func.attr for n in ast.walk(tree) if isinstance(n,ast.Call) and isinstance(n.func,(ast.Name,ast.Attribute))})})
(folder/'static-source-check202.json').write_text(json.dumps({'status':'STATIC_AST_PASS_NO_BLENDER_IMPORT_OR_EXECUTION','files':rows},indent=2),encoding='utf8');print(json.dumps({'status':'STATIC_AST_PASS','pythonFiles':len(rows)}))
