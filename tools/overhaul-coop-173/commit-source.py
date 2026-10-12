from pathlib import Path
p=Path('tools/overhaul-coop-173/motion-scheduler.mjs');t=p.read_text();t=t.replace("if(['down','press'].includes(method)&&token&&token.active!==name)throw Error('173 parked pilot public input ownership violation');return value.apply(k,args);","if(['down','press'].includes(method)&&token){if(token.active!==name)throw Error('173 parked pilot public input ownership violation');if(token.state!=='COMMITTED')throw Error('173 active public input lacks certified committed leg');}return value.apply(k,args);")
t=t.replace("Object.assign(receipt,{state:'COMMITTED',room:s.room", "Object.assign(receipt,{state:'HANDOFF_READY',room:s.room")
t=t.replace("token.goal=structuredClone(plan.point??plan.target);token.certificate", "token.state='COMMITTED';token.goal=structuredClone(plan.point??plan.target);token.certificate")
p.write_text(t)
