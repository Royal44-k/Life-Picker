function calendarDate(value:unknown):value is string{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'0001-01-01')return false;
 const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function localToday(){const date=new Date();return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
export function validateCapturedDate(value:unknown):string|undefined{
 if(value===undefined)return undefined;if(!calendarDate(value))throw new Error('照片拍摄日期无效，未保存或导入。');return value;
}
export function capturedDateFromExif(value:unknown,today=localToday()):string|undefined{
 if(typeof value!=='string')return undefined;
 const parts=/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);if(!parts)return undefined;
 const date=parts[1]+'-'+parts[2]+'-'+parts[3];
 if(!calendarDate(date)||date>today||Number(parts[4])>23||Number(parts[5])>59||Number(parts[6])>59)return undefined;
 return date;
}
export async function readPhotoDate(file:Blob|Uint8Array):Promise<string|undefined>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const data=await Promise.race([
   import('exifr').then(({default:exifr})=>exifr.parse(file,{pick:['DateTimeOriginal'],gps:false,ifd1:false,interop:false,makerNote:false,userComment:false,xmp:false,icc:false,iptc:false,jfif:false,reviveValues:false,translateValues:false,chunkLimit:5})),
   new Promise<undefined>(resolve=>{timer=setTimeout(()=>resolve(undefined),3000);})
  ]);
  return capturedDateFromExif(data?.DateTimeOriginal);
 }catch{return undefined;}finally{if(timer)clearTimeout(timer);}
}
