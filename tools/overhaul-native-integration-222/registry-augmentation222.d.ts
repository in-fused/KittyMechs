import '../../src/game/camera/visualRegistry';
import type {Object3D} from 'three';
import type {inspectCameraVisual222 as Inspector222} from './visualRegistry222';
declare module '../../src/game/camera/visualRegistry' {
 export function ownsCameraVisual222(id:string,root:Object3D,generation:number):boolean;
 export const inspectCameraVisual222:typeof Inspector222;
}
