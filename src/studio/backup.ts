import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {isOptions} from '../core/storage.ts';
import type {Story, MediaAsset} from './model.ts';
const idOK=(v:unknown)=>typeof v==='string'&&/^[\w:-]{1,100}$/.test(v);
export function validateStory(value:unknown):Story{
 const s=value as Story;
 if(!s||s.version!==2||!idOK(s.id)||!Number.isInteger(s.revision)||s.revision<0||typeof s.source!=='string'||s.source.length>20000||typeof s.sourceHash!=='string'||typeof s.title!=='string'||s.title.length>200||!isOptions(s.options)||!Number.isFinite(s.updatedAt))throw new Error('作品格式不正确，未导入。');
 if(!s.settings||![0,6,9].includes(s.settings.target)||typeof s.settings.cover!=='boolean'||!['none','question','follow','collect'].includes(s.settings.ending)||!['auto','yes','no',undefined].includes(s.settings.toc))throw new Error('作品编排设置无效。');
 if(!Array.isArray(s.pages)||s.pages.length>60||!Array.isArray(s.warnings)||s.warnings.length>100||s.warnings.some(w=>typeof w!=='string'||w.length>1000))throw new Error('作品页数或提示无效。');
 const ids=new Set<string>();let total=0;
 for(const p of s.pages){
  if(!p||!idOK(p.id)||ids.has(p.id)||!['cover','toc','body','diagram','ending'].includes(p.role)||typeof p.source!=='string'||p.source.length>20000||typeof p.locked!=='boolean'||!['none','pyramid','steps','compare','timeline','checklist'].includes(p.diagram)||!['plain','quote','photo'].includes(p.layout)||!['cover','contain'].includes(p.fit)||![p.focusX,p.focusY].every(v=>Number.isFinite(v)&&v>=0&&v<=1)||p.assetId!==undefined&&!idOK(p.assetId)||!Array.isArray(p.sourceIds)||p.sourceIds.length>200||p.sourceIds.some(v=>typeof v!=='string'||v.length>200))throw new Error('页面数据无效，未导入。');
  ids.add(p.id);total+=p.source.length;
 }
 if(total>60000)throw new Error('作品内容过多，请分开备份。');
 return structuredClone(s);
}
export async function makeBundle(s:Story,get:(id:string)=>Promise<MediaAsset|undefined>):Promise<Blob>{
 validateStory(s);
 const files:Record<string,Uint8Array>={};const assets:Omit<MediaAsset,'blob'>[]=[];let bytes=0;
 for(const id of new Set(s.pages.flatMap(p=>p.assetId?[p.assetId]:[]))){
  const a=await get(id);if(!a)throw new Error('作品照片缺失，请重新选择后再备份。');
  const {blob,...meta}=a;assets.push(meta);const data=new Uint8Array(await blob.arrayBuffer());bytes+=data.length;
  if(bytes>50_000_000)throw new Error('照片超过 50 MB，请分成较小的作品备份。');
  files['media/'+id]=data;
 }
 files['manifest.json']=strToU8(JSON.stringify({format:'shiye-story',version:1,story:s,assets}));
 return new Blob([zipSync(files,{level:0}) as Uint8Array<ArrayBuffer>],{type:'application/zip'});
}
export function readBundle(bytes:Uint8Array):{story:Story;assets:MediaAsset[]}{
 if(bytes.length>55_000_000)throw new Error('备份超过 55 MB。');
 let files:Record<string,Uint8Array>;
 try{let total=0;files=unzipSync(bytes,{filter:f=>{total+=f.originalSize;if(total>60_000_000||f.originalSize>20_000_000)throw new Error('too large');return true;}});}catch{throw new Error('无法读取备份，请选择拾页导出的作品 ZIP。');}
 if(!files['manifest.json']||files['manifest.json'].length>2_000_000)throw new Error('缺少作品清单。');
 let data;try{data=JSON.parse(strFromU8(files['manifest.json']));}catch{throw new Error('作品清单损坏。');}
 if(data.format!=='shiye-story'||data.version!==1||!Array.isArray(data.assets)||data.assets.length>60)throw new Error('不是受支持的拾页备份。');
 const story=validateStory(data.story);const assets:MediaAsset[]=[];const seen=new Set();
 for(const a of data.assets){
  if(!a||!idOK(a.id)||seen.has(a.id)||typeof a.name!=='string'||a.name.length>200||!['image/jpeg','image/png','image/webp'].includes(a.type)||!Number.isInteger(a.width)||!Number.isInteger(a.height)||a.width<1||a.height<1||a.width>4096||a.height>4096||!Number.isFinite(a.createdAt))throw new Error('照片信息无效。');
  const bytes=files['media/'+a.id];if(!bytes||bytes.length!==a.bytes||bytes.length>8_000_000)throw new Error('照片缺失或过大。');
  seen.add(a.id);assets.push({...a,blob:new Blob([bytes as Uint8Array<ArrayBuffer>],{type:a.type})});
 }
 if(story.pages.some(p=>p.assetId&&!seen.has(p.assetId)))throw new Error('备份中缺少照片，未导入。');
 return {story,assets};
}
