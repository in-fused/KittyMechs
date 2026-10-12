import {readFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {AnimationClip,Bone,BufferAttribute,BufferGeometry,Group,InterpolateDiscrete,InterpolateLinear,Interpolant,Matrix4,MeshBasicMaterial,QuaternionKeyframeTrack,Skeleton,SkinnedMesh,VectorKeyframeTrack} from 'three';
/** Numerical fixture from actual decoded glTF arrays/hierarchy/inverse binds.
 * It does not emulate textures or claim browser GLTFLoader validation. */
export async function loadRig250(path:string){
 await MeshoptDecoder.ready;const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(await readFile(path)),root=doc.getRoot();
 const joints=new Set(root.listSkins().flatMap(s=>s.listJoints())),objects=new Map(root.listNodes().map(n=>{const o=joints.has(n)?new Bone():new Group();o.name=n.getName();o.position.fromArray(n.getTranslation());o.quaternion.fromArray(n.getRotation());o.scale.fromArray(n.getScale());return [n,o] as const;}));
 for(const [n,o] of objects)for(const c of n.listChildren())o.add(objects.get(c)!);
 const model=new Group();for(const n of root.listScenes()[0].listChildren())model.add(objects.get(n)!);model.updateMatrixWorld(true);
 for(const [n,o] of objects){const mesh=n.getMesh(),skin=n.getSkin();if(!mesh||!skin)continue;const inverse=skin.getInverseBindMatrices()!.getArray()!,bones=skin.listJoints().map(j=>objects.get(j) as Bone),skeleton=new Skeleton(bones,bones.map((_,i)=>new Matrix4().fromArray(inverse,i*16)));
  for(const p of mesh.listPrimitives()){const geometry=new BufferGeometry();for(const [semantic,key] of [['POSITION','position'],['JOINTS_0','skinIndex'],['WEIGHTS_0','skinWeight']] as const){const a=p.getAttribute(semantic)!;geometry.setAttribute(key,new BufferAttribute(a.getArray()! as ConstructorParameters<typeof BufferAttribute>[0],a.getElementSize(),a.getNormalized()));}const m=new SkinnedMesh(geometry,new MeshBasicMaterial());m.name=mesh.getName();o.add(m);m.bind(skeleton,new Matrix4());}
 }
 model.updateMatrixWorld(true);
 const clips=root.listAnimations().map(a=>new AnimationClip(a.getName(),-1,a.listChannels().map(c=>{const s=c.getSampler()!,path=c.getTargetPath()!,property=path==='rotation'?'quaternion':path==='translation'?'position':path;if(!['rotation','translation','scale'].includes(path)||!['LINEAR','STEP','CUBICSPLINE'].includes(s.getInterpolation()))throw Error('143_FIXTURE_UNSUPPORTED_CHANNEL');const name=c.getTargetNode()!.getName()+'.'+property,t=s.getInput()!.getArray()!,v=s.getOutput()!.getArray()!,interpolation=s.getInterpolation()==='STEP'?InterpolateDiscrete:InterpolateLinear;const track=path==='rotation'?new QuaternionKeyframeTrack(name,t,v,interpolation):new VectorKeyframeTrack(name,t,v,interpolation);if(s.getInterpolation()==='CUBICSPLINE'){const factory:any=function(this:any,result:any){return new GLTFCubicSplineInterpolant(this.times,this.values,this.getValueSize()/3,result);};factory.isInterpolantFactoryMethodGLTFCubicSpline=true;(track as any).createInterpolant=factory;}return track;})));return {model,clips};
}

// Exact installed primary Three GLTFLoader vector cubic formula; numerical fixture only.
const Base250:any=Interpolant;
class GLTFCubicSplineInterpolant extends Base250 {

	constructor( parameterPositions:any, sampleValues:any, sampleSize:any, resultBuffer:any ) {

		super( parameterPositions, sampleValues, sampleSize, resultBuffer );

	}

	copySampleValue_( index:any ) {

		// Copies a sample value to the result buffer. See description of glTF
		// CUBICSPLINE values layout in interpolate_() function below.

		const result = this.resultBuffer,
			values = this.sampleValues,
			valueSize = this.valueSize,
			offset = index * valueSize * 3 + valueSize;

		for ( let i = 0; i !== valueSize; i ++ ) {

			result[ i ] = values[ offset + i ];

		}

		return result;

	}

	interpolate_( i1:any, t0:any, t:any, t1:any ) {

		const result = this.resultBuffer;
		const values = this.sampleValues;
		const stride = this.valueSize;

		const stride2 = stride * 2;
		const stride3 = stride * 3;

		const td = t1 - t0;

		const p = ( t - t0 ) / td;
		const pp = p * p;
		const ppp = pp * p;

		const offset1 = i1 * stride3;
		const offset0 = offset1 - stride3;

		const s2 = - 2 * ppp + 3 * pp;
		const s3 = ppp - pp;
		const s0 = 1 - s2;
		const s1 = s3 - pp + p;

		// Layout of keyframe output values for CUBICSPLINE animations:
		//   [ inTangent_1, splineVertex_1, outTangent_1, inTangent_2, splineVertex_2, ... ]
		for ( let i = 0; i !== stride; i ++ ) {

			const p0 = values[ offset0 + i + stride ]; // splineVertex_k
			const m0 = values[ offset0 + i + stride2 ] * td; // outTangent_k * (t_k+1 - t_k)
			const p1 = values[ offset1 + i + stride ]; // splineVertex_k+1
			const m1 = values[ offset1 + i ] * td; // inTangent_k+1 * (t_k+1 - t_k)

			result[ i ] = s0 * p0 + s1 * m0 + s2 * p1 + s3 * m1;

		}

		return result;

	}

}

