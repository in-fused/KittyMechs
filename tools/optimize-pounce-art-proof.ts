/** Private evidence export; never writes the game's shipping/raw destinations. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const doc=await io.read('assets/source/pounce-art-v1/Pounce_Quadruped.candidate.glb');
await doc.transform(weld(),dedup(),prune(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
await io.write('assets/source/pounce-art-v1/Pounce_Quadruped.optimized-candidate.glb',doc);
console.log('Private optimized candidate written; shipping/raw models unchanged.');
