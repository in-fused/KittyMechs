/**1024×512,4×2 slots,256 each,2px edge extrusion; standalone maps flipY=false.
 * Coordinates describe the payload, not gutters or neighboring designs. */
export function cityAtlasRect(slot:number):[number,number,number,number]{
  const x=(slot%4)*256,y=Math.floor(slot/4)*256;
  return [(x+2)/1024,(y+2)/512,(x+254)/1024,(y+254)/512];
}
