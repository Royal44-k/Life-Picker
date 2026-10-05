import {deflateSync} from 'node:zlib';
function crc(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;}
function chunk(type,body){const data=Buffer.concat([Buffer.from(type),body]),out=Buffer.alloc(body.length+12);out.writeUInt32BE(body.length);data.copy(out,4);out.writeUInt32BE(crc(data),out.length-4);return out;}
export function testPng(color=[90,135,74,255]){const header=Buffer.alloc(13);header.writeUInt32BE(2);header.writeUInt32BE(2,4);header[8]=8;header[9]=6;const line=Buffer.from([0,...color,...color]);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.concat([line,line]))),chunk('IEND',Buffer.alloc(0))]);}
