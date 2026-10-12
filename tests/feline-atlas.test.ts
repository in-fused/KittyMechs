import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

// Decode the actual WebP container dimensions, not filenames or a source receipt.
function webp(bytes:Buffer){
  expect(bytes.toString('ascii',0,4)).toBe('RIFF');expect(bytes.toString('ascii',8,12)).toBe('WEBP');
  let cursor=12;
  while(cursor+8<=bytes.length){
    const type=bytes.toString('ascii',cursor,cursor+4),size=bytes.readUInt32LE(cursor+4),p=cursor+8;
    if(type==='VP8L'){
      expect(bytes[p]).toBe(0x2f);const bits=bytes.readUInt32LE(p+1);
      return{width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1,lossless:true};
    }
    if(type==='VP8 '){
      expect([...bytes.subarray(p+3,p+6)]).toEqual([0x9d,1,0x2a]);
      return{width:bytes.readUInt16LE(p+6)&0x3fff,height:bytes.readUInt16LE(p+8)&0x3fff,lossless:false};
    }
    cursor=p+size+(size&1);
  }
  throw new Error('No actual WebP image payload');
}
describe('original feline PBR transport',()=>{
  it('ships three shared1024 maps under the transport budget with lossless packed data',()=>{
    let total=0;
    for(const kind of ['albedo','normal','orm']){
      const bytes=readFileSync(`public/assets/textures/feline-${kind}-v1.webp`),data=webp(bytes);
      expect(data.width).toBe(1024);expect(data.height).toBe(1024);
      if(kind!=='albedo')expect(data.lossless).toBe(true);
      expect(bytes.length).toBeGreaterThan(1000);total+=bytes.length;
    }
    expect(total).toBeLessThanOrEqual(900000);
  });
});
