import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {assessContinuation162,geometryFromRead162,blockArrivalWitness162} from './arrival-contract.mjs';
const input='.sites-runtime/overhaul-20261010/coop159-public/evidence.json',bytes=readFileSync(input),e=JSON.parse(bytes),failure=e.failureReceipt,prior=e.planning151.at(-2).to,read=failure.read;
describe('162 exact saved arrival/corridor contract',()=>{
 it('predicts the saved static rejection before any movement and refuses an unsafe first-leg escape',()=>{
  expect(read.tick).toBe(13596);const result=assessContinuation162(read,prior,failure.to);
  expect(result.status).toBe('INFEASIBLE_AT_SAVED_READ');expect(result.path).toBeNull();expect(result.arrivalAccepted).toBe(true);expect(result.nominalClear).toBe(true);expect(result.nominalSegmentClear).toBe(true);expect(result.currentClear).toBe(false);expect(result.actualSegmentClear).toBe(false);expect(result.currentBlocker.owner).toBe(failure.blocker.owner);expect(result.actualSegmentBlocker.owner).toBe(failure.blocker.owner);expect(result.actualSegmentBlocker.point.x).toBeCloseTo(failure.blocker.point.x,12);expect(result.endpoint.entireDiskOutsideThisOwner).toBe(false);
  // Independent world-aligned box arithmetic for this exact yaw0 owner.
  const b=failure.blocker,south=b.position[2]-b.halfExtents[2]-2.85;
  expect(read.actor.position.z).toBeGreaterThan(south);expect(prior.z).toBeLessThan(south);expect(south-prior.z).toBeLessThan(1.1);expect(result.arrivalError).toBeCloseTo(.6049163339575426,12);
  writeFileSync(new URL('./arrival-receipt.json',import.meta.url),JSON.stringify({writer:'CLOSED',scope:'EXACT_RETAINED13596_COMPILED_GEOMETRY_NO_NATIVE_PUBLIC_PLAY',input,inputSha256:createHash('sha256').update(bytes).digest('hex'),result,independent:{expandedSouth:south,nominalEdgeGap:south-prior.z,actualEnvelopePenetration:read.actor.position.z-south}},null,2));
 });
 it('rejects unsafe tolerated endpoints while retaining the unchanged disk and clearance',()=>{
  const b=geometryFromRead162(read).blocks.find(b=>b.id===failure.blocker.owner),unsafe=blockArrivalWitness162(b,prior),hypotheticalSafe={x:prior.x,z:b.position[2]-b.halfExtents[2]-2.85-1.1-.1},safe=blockArrivalWitness162(b,hypotheticalSafe);
  expect(unsafe.edgeDistance).toBeCloseTo(.041077879370145176,10);expect(safe.entireDiskOutsideThisOwner).toBe(true);expect(safe.arrival).toBe(1.1);expect(safe.clearance).toBe(2.85);
 });
 it('does not treat a moving hypothetical origin as a settled route start or ignore the first-failure guard',()=>{
  const moving=structuredClone(read);moving.actor.velocity.x=.2;expect(assessContinuation162(moving,prior,failure.to).status).toBe('CURRENT_ORIGIN_NOT_SETTLED');expect(()=>assessContinuation162(read,prior,failure.to,()=>{throw Error('first genuine failure');})).toThrow('first genuine failure');
 });
});
