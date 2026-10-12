import original from './data/city-fracture-v1.json';
import shapes from './data/city-fracture-shapes-v2.json';
import type {CityFractureAsset} from './cityFracture';

function template(id:'post'|'face'|'slab'):CityFractureAsset {
  const source=shapes.templates.find(t=>t.id===id);
  if(!source)throw Error(`Missing city fracture template: ${id}`);
  return {schema:shapes.schema,template:`source-shape-v2/${id}`,seed:shapes.source.seed,
    fragmentCount:shapes.fragmentCount,contentSha256:shapes.contentSha256,pieces:source.pieces};
}
/** One immutable catalog is shared by authority, cosmetic pool and peer view.
 * The original bulk bake and all new shape-bake provenance remain intact. */
export const cityFractureCatalog:CityFractureAsset={...original,shapes:{post:template('post'),face:template('face'),slab:template('slab')}};
