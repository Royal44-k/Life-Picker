// Minimal real JPEG APP1 / TIFF with DateTimeOriginal, optionally inserted into a decodable JPEG.
export function jpegWithDate(value,jpeg=new Uint8Array([255,216,255,217])){
 const raw=new TextEncoder().encode(value+'\0'),tiff=new Uint8Array(44+raw.length),view=new DataView(tiff.buffer);
 tiff.set([73,73]);view.setUint16(2,42,true);view.setUint32(4,8,true);view.setUint16(8,1,true);view.setUint16(10,0x8769,true);view.setUint16(12,4,true);view.setUint32(14,1,true);view.setUint32(18,26,true);
 view.setUint16(26,1,true);view.setUint16(28,0x9003,true);view.setUint16(30,2,true);view.setUint32(32,raw.length,true);view.setUint32(36,44,true);tiff.set(raw,44);
 const segment=new Uint8Array(10+tiff.length);segment.set([255,225]);new DataView(segment.buffer).setUint16(2,8+tiff.length);segment.set([69,120,105,102,0,0],4);segment.set(tiff,10);
 const result=new Uint8Array(jpeg.length+segment.length);result.set(jpeg.subarray(0,2));result.set(segment,2);result.set(jpeg.subarray(2),2+segment.length);return result;
}
