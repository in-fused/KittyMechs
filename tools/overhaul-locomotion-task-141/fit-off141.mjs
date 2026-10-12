import {readFile,writeFile} from 'node:fs/promises';
const measurements=JSON.parse(await readFile('tools/overhaul-locomotion-task-141/off-measurements141.json','utf8'));
// Exactly current OFF felineMotion.ts Pounce source metadata, not adjusted fits.
const table={FelineWalk:{duty:.7,offsets:{FL:0,FR:.5,HL:.75,HR:.25},distance:.8*.72/.7},FelineTrot:{duty:.55,offsets:{FL:0,FR:.5,HL:.5,HR:0},distance:.8*1.1/.55},FelineGallop:{duty:.44,offsets:{FL:0,FR:.08,HL:.46,HR:.54},distance:.8*1.66/.44},FelineUprightWalkLong:{duty:.70,offsets:{HL:0,HR:.5},distance:.8*1.15/.70},FelineUprightStride:{duty:.57,offsets:{HL:0,HR:.5},distance:.8*1.48/.57}};
const clips=[];
for(const [name,gait] of Object.entries(table)){
 const clip=measurements.clips.find(c=>c.name===name),limbs={};
 for(const [limb,offset] of Object.entries(gait.offsets)){
  const groups=[];let group=[];
  for(const row of clip.rows){const p=((row.phase-offset)%1+1)%1;if(row.phase<1&&p<gait.duty)group.push(row);else if(group.length){groups.push(group);group=[];}}if(group.length)groups.push(group);groups.sort((a,b)=>b.length-a.length);
  const rows=groups[0],xs=rows.map(r=>r.phase),zs=rows.map(r=>r.limbs[limb].paw[2]),mx=xs.reduce((a,b)=>a+b)/xs.length,mz=zs.reduce((a,b)=>a+b)/zs.length;
  const slope=xs.reduce((sum,x,i)=>sum+(x-mx)*(zs[i]-mz),0)/xs.reduce((sum,x)=>sum+(x-mx)**2,0),intercept=mz-slope*mx;
  limbs[limb]={samples:rows.length,firstPhase:xs[0],lastPhase:xs.at(-1),nativeDistance:-.8*slope,expectedNativeDistance:gait.distance,maxStanceResidualMeters:.8*Math.max(...zs.map((z,i)=>Math.abs(z-(intercept+slope*xs[i])))),maxSourceReachRatio:Math.max(...rows.map(r=>r.limbs[limb].reachRatio)),heightRange:.8*(Math.max(...rows.map(r=>r.limbs[limb].paw[1]))-Math.min(...rows.map(r=>r.limbs[limb].paw[1])))};
 }
 clips.push({name,gait,limbs});
}
const receipt={writer:'CLOSED',inputSHA256:measurements.inputSHA256,provenance:'Actual decoded OFF paw pivots and unchanged current metadata; linear least-squares diagnostic, not a contact certificate',clips};
await writeFile('tools/overhaul-locomotion-task-141/off-stance-fit141.json',JSON.stringify(receipt,null,2));process.stdout.write(JSON.stringify(receipt)+'\n');
