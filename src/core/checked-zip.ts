import {strFromU8,unzipSync} from 'fflate';
const table=Uint32Array.from({length:256},(_,n)=>{let value=n;for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;return value>>>0;});
function crc32(bytes:Uint8Array){let value=0xffffffff;for(const byte of bytes)value=table[(value^byte)&255]^(value>>>8);return (value^0xffffffff)>>>0;}
/** Check bounded central/local metadata and CRCs. CRC detects damage, not authorship. */
export function readCheckedZip(bytes:Uint8Array,{maxBytes,maxEntry,maxFiles}:{maxBytes:number;maxEntry:number;maxFiles:number}){
 const fail=():never=>{throw new Error('无法读取备份：文件损坏、校验不一致或超过大小限制，未导入任何内容。');};
 if(bytes.length<22||bytes.length>maxBytes)fail();const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const u16=(offset:number)=>view.getUint16(offset,true),u32=(offset:number)=>view.getUint32(offset,true);
 let end=bytes.length-22;while(end>=Math.max(0,bytes.length-65557)&&(u32(end)!==0x06054b50||end+22+u16(end+20)!==bytes.length))end--;if(end<Math.max(0,bytes.length-65557))fail();
 const count=u16(end+10),directory=u32(end+16),directorySize=u32(end+12);if(u16(end+4)||u16(end+6)||u16(end+8)!==count||!count||count>maxFiles||directory+directorySize!==end)fail();
 const entries=new Map<string,{size:number;crc:number}>(),ranges:{start:number;end:number}[]=[];let cursor=directory,total=0;
 for(let i=0;i<count;i++){
  if(cursor+46>end||u32(cursor)!==0x02014b50)fail();const flags=u16(cursor+8),method=u16(cursor+10),crc=u32(cursor+16),packed=u32(cursor+20),size=u32(cursor+24),nameLength=u16(cursor+28),extra=u16(cursor+30),comment=u16(cursor+32),local=u32(cursor+42),next=cursor+46+nameLength+extra+comment;
  if(next>end||u16(cursor+34)||flags&0x41||![0,8].includes(method)||!nameLength||size>maxEntry||packed>maxBytes)fail();total+=size;if(total>maxBytes)fail();
  const nameBytes=bytes.subarray(cursor+46,cursor+46+nameLength),name=strFromU8(nameBytes);if(!/^(manifest\.json|media\/[\w:-]{1,100})$/.test(name)||entries.has(name))fail();
  if(local+30>directory||u32(local)!==0x04034b50||u16(local+6)!==flags||u16(local+8)!==method||u16(local+26)!==nameLength)fail();const body=local+30+u16(local+26)+u16(local+28);if(body+packed>directory)fail();
  if(nameBytes.some((v,n)=>bytes[local+30+n]!==v))fail();if(!(flags&8)&&(u32(local+14)!==crc||u32(local+18)!==packed||u32(local+22)!==size))fail();if(method===0&&packed!==size)fail();
  entries.set(name,{size,crc});ranges.push({start:local,end:body+packed});cursor=next;
 }
 if(cursor!==end)fail();ranges.sort((a,b)=>a.start-b.start);if(ranges.some((r,i)=>i>0&&r.start<ranges[i-1].end))fail();
 let files:Record<string,Uint8Array>;try{files=unzipSync(bytes);}catch{return fail();}if(Object.keys(files).length!==entries.size)fail();
 for(const [name,entry] of entries){const raw=files[name];if(!raw||raw.length!==entry.size||crc32(raw)!==entry.crc)fail();}return files;
}
