// tools/overhaul-native-integration-222/registry-fixture.ts
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { Group, Mesh as Mesh2, BoxGeometry, MeshBasicMaterial } from "three";

// src/game/camera/visualEnvelope.ts
import { Box3, InterleavedBufferAttribute, Matrix4, Mesh, SkinnedMesh, Vector3 } from "three";
var preparations = /* @__PURE__ */ new WeakMap();
var samples = /* @__PURE__ */ new WeakMap();
var INVERSE_ARITHMETIC_ERROR = 1e-8;
function fail(message) {
  throw new Error(`Visual envelope: ${message}`);
}
function finiteMatrix(matrix, label, computedInverse = false) {
  const e = matrix.elements;
  for (let i = 0; i < 16; i++) if (!Number.isFinite(e[i])) fail(`${label} is nonfinite`);
  if (e[3] !== 0 || e[7] !== 0 || e[11] !== 0 || (computedInverse ? Math.abs(e[15] - 1) > INVERSE_ARITHMETIC_ERROR : e[15] !== 1)) fail(`${label} is not affine`);
}
function sameMatrix(matrix, expected, label) {
  for (let i = 0; i < 16; i++) if (matrix.elements[i] !== expected[i]) fail(`${label} changed; reprepare`);
}
function attributeArray(attribute) {
  return attribute instanceof InterleavedBufferAttribute ? attribute.data.array : attribute.array;
}
function attributeVersion(attribute) {
  return attribute instanceof InterleavedBufferAttribute ? attribute.data.version : attribute.version;
}
function requireAttribute(geometry, name, size, count) {
  const attribute = geometry.getAttribute(name);
  if (!attribute || attribute.itemSize !== size || attribute.count < 1 || !Number.isInteger(attribute.count) || count !== void 0 && attribute.count !== count) fail(`invalid ${name} attribute`);
  return attribute;
}
function rejectMorphs(mesh) {
  const morphs = mesh.geometry.morphAttributes;
  for (const name in morphs) if (morphs[name]?.length) fail(`unsupported morph ${name}`);
  if (mesh.morphTargetInfluences?.length) fail("unsupported morph influences");
}
function attachedInverse(mesh, scratch) {
  if (mesh.bindMode !== "attached") fail("only attached skin binding is supported");
  finiteMatrix(mesh.matrixWorld, "mesh world");
  finiteMatrix(mesh.bindMatrixInverse, "attached inverse", true);
  scratch.copy(mesh.matrixWorld).invert();
  for (let i = 0; i < 16; i++) if (scratch.elements[i] !== mesh.bindMatrixInverse.elements[i]) fail("attached inverse is stale or inconsistent; update world matrices before sampling");
  scratch.multiplyMatrices(mesh.matrixWorld, mesh.bindMatrixInverse);
  for (let i = 0; i < 16; i++) if (Math.abs(scratch.elements[i] - (i % 5 === 0 ? 1 : 0)) > INVERSE_ARITHMETIC_ERROR) fail("attached inverse is stale or inconsistent; update world matrices before sampling");
}
function prepared(envelope2) {
  const value = preparations.get(envelope2);
  if (!value) fail("unknown preparation");
  return value;
}
function prepareVisualEnvelope(root) {
  const entries = [], meshes = [], boneEntries = /* @__PURE__ */ new Map();
  const skeletonRecords = /* @__PURE__ */ new Map();
  const point = new Vector3(), local = new Vector3(), scratch = new Matrix4();
  let vertexCount = 0, staticMeshCount = 0;
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    if ("isInstancedMesh" in node || "isBatchedMesh" in node) fail("unsupported instanced/batched mesh");
    rejectMorphs(node);
    const position = requireAttribute(node.geometry, "position", 3);
    const attributes = [{ name: "position", attribute: position, array: attributeArray(position), version: attributeVersion(position) }];
    const binding = { mesh: node, geometry: node.geometry, attributes };
    meshes.push(binding);
    vertexCount += position.count;
    if (node instanceof SkinnedMesh) {
      attachedInverse(node, scratch);
      finiteMatrix(node.bindMatrix, "bind matrix");
      if (node.bindMatrix.determinant() === 0) fail("singular bind matrix");
      const skeleton = node.skeleton;
      if (!skeleton || !skeleton.bones.length || skeleton.bones.length !== skeleton.boneInverses.length) fail("invalid skeleton binding");
      for (const bone of skeleton.bones) {
        if (!bone?.isBone) fail("invalid bone owner");
        finiteMatrix(bone.matrixWorld, "bone world");
      }
      const indices = requireAttribute(node.geometry, "skinIndex", 4, position.count), weights = requireAttribute(node.geometry, "skinWeight", 4, position.count);
      if (indices.normalized) fail("normalized joint indices are unsupported");
      for (const [name, attribute] of [["skinIndex", indices], ["skinWeight", weights]]) attributes.push({ name, attribute, array: attributeArray(attribute), version: attributeVersion(attribute) });
      let record = skeletonRecords.get(skeleton);
      const validateSkeleton = !record;
      if (record) {
        if (skeleton.bones.length !== record.bones.length || skeleton.boneInverses.length !== record.inverses.length) fail("skeleton layout changed during preparation");
        for (let i = 0; i < skeleton.bones.length; i++) {
          if (skeleton.bones[i] !== record.bones[i]) fail("bone owner changed during preparation");
          sameMatrix(skeleton.boneInverses[i], record.inverses[i], "bone inverse");
        }
      } else {
        record = { skeleton, bones: skeleton.bones.slice(), inverses: skeleton.boneInverses.map((matrix) => {
          finiteMatrix(matrix, "bone inverse", true);
          if (matrix.determinant() === 0) fail("singular bone inverse");
          return Array.from(matrix.elements);
        }) };
        skeletonRecords.set(skeleton, record);
      }
      binding.skin = { ...record, bind: Array.from(node.bindMatrix.elements), validateSkeleton };
      for (let vertex = 0; vertex < position.count; vertex++) {
        point.fromBufferAttribute(position, vertex);
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) fail("nonfinite authored position");
        let sum = 0;
        for (let slot = 0; slot < 4; slot++) {
          const weight = weights.getComponent(vertex, slot), index = indices.getComponent(vertex, slot);
          if (!Number.isFinite(weight) || weight < 0) fail("nonfinite or negative skin weight");
          if (!Number.isInteger(index) || index < 0 || index >= skeleton.bones.length) fail("invalid joint index");
          sum += weight;
        }
        if (sum !== 1) fail("skin weights must sum exactly to one");
        for (let slot = 0; slot < 4; slot++) if (weights.getComponent(vertex, slot) > 0) {
          const index = indices.getComponent(vertex, slot), bone = skeleton.bones[index];
          let entry = boneEntries.get(bone);
          if (!entry) {
            entry = { node: bone, box: new Box3() };
            boneEntries.set(bone, entry);
            entries.push(entry);
          }
          local.copy(point).applyMatrix4(node.bindMatrix).applyMatrix4(skeleton.boneInverses[index]);
          if (!Number.isFinite(local.x) || !Number.isFinite(local.y) || !Number.isFinite(local.z)) fail("nonfinite bone-local position");
          entry.box.expandByPoint(local);
        }
      }
    } else {
      const box = new Box3();
      staticMeshCount++;
      for (let vertex = 0; vertex < position.count; vertex++) {
        point.fromBufferAttribute(position, vertex);
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) fail("nonfinite static position");
        box.expandByPoint(point);
      }
      entries.push({ node, box });
    }
  });
  if (!entries.length) fail("no supported visual geometry");
  const envelope2 = Object.freeze({ boneCount: boneEntries.size, staticMeshCount, vertexCount, cornerCount: entries.length * 8 });
  preparations.set(envelope2, { entries, meshes, scratch });
  return envelope2;
}
function createVisualEnvelopeSample(envelope2) {
  prepared(envelope2);
  const sample = { bounds: new Box3(), corners: Array.from({ length: envelope2.cornerCount }, () => new Vector3()) };
  samples.set(sample, envelope2);
  return sample;
}
function sampleVisualEnvelope(envelope2, out) {
  const data = prepared(envelope2);
  if (samples.get(out) !== envelope2 || out.corners.length !== envelope2.cornerCount) fail("sample belongs to a different preparation");
  for (const binding of data.meshes) {
    const mesh = binding.mesh;
    if (mesh.geometry !== binding.geometry) fail("geometry changed; reprepare");
    rejectMorphs(mesh);
    for (const saved of binding.attributes) {
      const current = mesh.geometry.getAttribute(saved.name);
      if (current !== saved.attribute || attributeArray(current) !== saved.array || attributeVersion(current) !== saved.version) fail("geometry attributes changed; reprepare");
    }
    if (binding.skin) {
      if (!(mesh instanceof SkinnedMesh) || mesh.skeleton !== binding.skin.skeleton) fail("skeleton changed; reprepare");
      attachedInverse(mesh, data.scratch);
      sameMatrix(mesh.bindMatrix, binding.skin.bind, "bind matrix");
      if (binding.skin.validateSkeleton) {
        const skeleton = mesh.skeleton;
        if (skeleton.bones.length !== binding.skin.bones.length || skeleton.boneInverses.length !== binding.skin.inverses.length) fail("skeleton layout changed");
        for (let i = 0; i < skeleton.bones.length; i++) {
          if (skeleton.bones[i] !== binding.skin.bones[i]) fail("bone owner changed");
          sameMatrix(skeleton.boneInverses[i], binding.skin.inverses[i], "bone inverse");
        }
      }
    }
  }
  for (const entry of data.entries) finiteMatrix(entry.node.matrixWorld, "sampled world");
  out.bounds.makeEmpty();
  let corner = 0;
  for (const entry of data.entries) {
    const min = entry.box.min, max = entry.box.max;
    for (let i = 0; i < 8; i++) {
      const point = out.corners[corner++];
      point.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).applyMatrix4(entry.node.matrixWorld);
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) fail("nonfinite sampled corner");
      out.bounds.expandByPoint(point);
    }
  }
  return out;
}

// src/game/camera/visualRegistry.ts
import { Vector3 as Vector32 } from "three";
var visuals = /* @__PURE__ */ new Map();
function hasCompletedCameraVisual044(id2, generation) {
  const entry = visuals.get(id2);
  return !!entry && entry.generation === generation && entry.result.frameClock >= 0;
}
function registerCameraVisual(id2, root, envelope2, generation, provider = { create: () => createVisualEnvelopeSample(envelope2), sample: (out) => sampleVisualEnvelope(envelope2, out) }) {
  const sample = provider.create(), anchors = ["head", "FL_upper", "FR_upper"].map((name) => root.getObjectByName(name)).filter((a) => !!a), entry = { root, anchors, anchorPoints: anchors.map(() => new Vector32()), generation, envelope: envelope2, sample, provider, result: { bounds: sample.bounds, corners: sample.corners, anchors: [], frameClock: -1 } };
  visuals.set(id2, entry);
  return () => {
    if (visuals.get(id2) === entry) visuals.delete(id2);
  };
}
function completeCameraVisual(id2, root, frameClock, generation) {
  const entry = visuals.get(id2);
  if (entry?.root === root && entry.generation === generation && Number.isFinite(frameClock)) entry.result.frameClock = frameClock;
}
function ownsCameraVisual222(id2, root, generation) {
  const entry = visuals.get(id2);
  return !!entry && entry.root === root && entry.generation === generation;
}
function inspectCameraVisual222(id2, scene2) {
  const entry = visuals.get(id2), prefix = `native222:${id2}:`, visibility = (root) => {
    const ancestors = [];
    for (let p = root; p; p = p.parent) ancestors.push({ uuid: p.uuid, name: p.name, visible: p.visible });
    return { uuid: root.uuid, name: root.name, rootVisible: root.visible, effectiveVisible: ancestors.every((p) => p.visible), ancestors };
  };
  const roots = /* @__PURE__ */ new Map();
  if (scene2) scene2.traverse((o) => {
    if (o.name.startsWith(prefix)) roots.set(o.uuid, visibility(o));
  });
  if (entry) roots.set(entry.root.uuid, visibility(entry.root));
  const winningProvider = entry ? { ...visibility(entry.root), generation: entry.generation, frameClock: entry.result.frameClock, kind: entry.root.name.startsWith(prefix) ? "named-native222" : "standard-or-unlabelled" } : null;
  return { actor: id2, winningProvider, roots: [...roots.values()], visibleRootCount: [...roots.values()].filter((o) => o.effectiveVisible).length, duplicateVisibleRoots: [...roots.values()].filter((o) => o.effectiveVisible).length > 1, scope: "CURRENT_WINNER_AND_NAMED_NATIVE_ROOTS_READONLY_NOT_PIXEL_PROOF" };
}

// tools/overhaul-native-integration-222/registry-fixture.ts
var scene = new Group();
var native = new Group();
var standardParent = new Group();
var standard = new Group();
native.name = "native222:fixture-actor:source-fixture";
scene.add(native, standardParent);
standardParent.add(standard);
for (const root of [native, standard]) root.add(new Mesh2(new BoxGeometry(1, 2, 1), new MeshBasicMaterial()));
scene.updateMatrixWorld(true);
var id = "fixture-actor";
var envelope = prepareVisualEnvelope(native);
var standardEnvelope = prepareVisualEnvelope(standard);
var rows = [];
var firstNativeCleanup = registerCameraVisual(id, native, envelope, 7);
completeCameraVisual(id, native, 1, 7);
assert(ownsCameraVisual222(id, native, 7));
var standardCleanup = registerCameraVisual(id, standard, standardEnvelope, 7);
completeCameraVisual(id, standard, 2, 7);
assert(!ownsCameraVisual222(id, native, 7));
assert(inspectCameraVisual222(id, scene).duplicateVisibleRoots);
rows.push({ stage: "STANDARD_REPLACES_NATIVE", inspection: inspectCameraVisual222(id, scene) });
standardParent.visible = false;
var before = JSON.stringify({ native: native.matrixWorld.elements, standard: standard.matrixWorld.elements });
var hidden = inspectCameraVisual222(id, scene);
assert.equal(hidden.winningProvider?.kind, "standard-or-unlabelled");
assert.equal(hidden.winningProvider?.rootVisible, true);
assert.equal(hidden.winningProvider?.effectiveVisible, false);
assert.equal(JSON.stringify({ native: native.matrixWorld.elements, standard: standard.matrixWorld.elements }), before);
rows.push({ stage: "HIDDEN_STANDARD_WINNER_READONLY", inspection: hidden });
standardCleanup();
assert.equal(hasCompletedCameraVisual044(id, 7), false);
assert.equal(typeof firstNativeCleanup, "function");
var oldRefWouldSkipReregistration = !!firstNativeCleanup;
assert.equal(oldRefWouldSkipReregistration, true);
assert.equal(ownsCameraVisual222(id, native, 7), false);
rows.push({ stage: "STANDARD_UNMOUNT_LOST_OWNER_DESPITE_NATIVE_CLEANUP_REF", oldRefWouldSkipReregistration, inspection: inspectCameraVisual222(id, scene) });
firstNativeCleanup();
var restored = registerCameraVisual(id, native, envelope, 7);
completeCameraVisual(id, native, 3, 7);
assert(ownsCameraVisual222(id, native, 7));
assert(hasCompletedCameraVisual044(id, 7));
standardCleanup();
firstNativeCleanup();
assert(ownsCameraVisual222(id, native, 7));
assert.equal(ownsCameraVisual222(id, standard, 7), false);
assert.equal(ownsCameraVisual222(id, native, 8), false);
rows.push({ stage: "FRESH_NATIVE_WINNER_COMPLETED", inspection: inspectCameraVisual222(id, scene) });
var nextGen = registerCameraVisual(id, native, envelope, 8);
completeCameraVisual(id, native, 4, 7);
assert.equal(hasCompletedCameraVisual044(id, 8), false);
restored();
assert(ownsCameraVisual222(id, native, 8));
completeCameraVisual(id, native, 5, 8);
assert(hasCompletedCameraVisual044(id, 8));
nextGen();
assert.equal(inspectCameraVisual222(id, scene).winningProvider, null);
for (const root of [native, standard]) root.traverse((o) => {
  if (o instanceof Mesh2) {
    o.geometry.dispose();
    o.material.dispose();
  }
});
await writeFile("tools/overhaul-native-integration-222/registry-fixture-receipt.json", JSON.stringify({ writer: "CLOSED", status: "PASS", scope: "Actual ThreeGroup and original canonical registry module loaded with private implementation; lifecycle/map ownership only, no nativeworld/React/gameplay/contact/pixel qualification", contactQualified: false, rows, restorationAndGenerationNegatives: true }, null, 2) + "\n");
console.log(JSON.stringify({ status: "REGISTRY_OWNERSHIP_PASS", contactQualified: false, actualGameplay: false }));
