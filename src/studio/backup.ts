import {validateCapturedDate} from './photo-date.ts';
import {validateSeriesSnapshot,validatePublication} from '../series/model.ts';
import {validateInspirationOrigin} from '../sources/inspiration-model.ts';
import {validateSourceCredit} from '../sources/credit.ts';
import {readCheckedZip} from '../core/checked-zip.ts';
import {zipSync,strToU8,strFromU8} from 'fflate';
import {isOptions,makeId} from '../core/storage.ts';
import type {Story, MediaAsset} from './model.ts';
import {templateExists} from './templates.ts';
const idOK=(v:unknown)=>typeof v==='string'&&/^[\w:-]{1,100}$/.test(v);
export function validateStory(value:unknown):Story{
 const s=value as Story;
 if(!s||s.version!==2||!idOK(s.id)||!Number.isInteger(s.revision)||s.revision<0||typeof s.source!=='string'||s.source.length>20000||typeof s.sourceHash!=='string'||typeof s.title!=='string'||s.title.length>200||!isOptions(s.options)||!Number.isFinite(s.updatedAt))throw new Error('作品格式不正确，未导入。');
 if(!s.settings||![0,6,9].includes(s.settings.target)||typeof s.settings.cover!=='boolean'||!['none','question','follow','collect'].includes(s.settings.ending)||!['auto','yes','no',undefined].includes(s.settings.toc))throw new Error('作品编排设置无效。');
 if(!Array.isArray(s.pages)||s.pages.length>60||!Array.isArray(s.warnings)||s.warnings.length>100||s.warnings.some(w=>typeof w!=='string'||w.length>1000))throw new Error('作品页数或提示无效。');
 const ids=new Set<string>();let total=0;
 for(const p of s.pages){
  if(!p||!idOK(p.id)||ids.has(p.id)||!['cover','toc','body','diagram','ending'].includes(p.role)||typeof p.source!=='string'||p.source.length>20000||typeof p.locked!=='boolean'||!['none','pyramid','steps','compare','timeline','checklist'].includes(p.diagram)||!['plain','quote','photo'].includes(p.layout)||!['cover','contain'].includes(p.fit)||![p.focusX,p.focusY].every(v=>Number.isFinite(v)&&v>=0&&v<=1)||p.assetId!==undefined&&!idOK(p.assetId)||!Array.isArray(p.sourceIds)||p.sourceIds.length>200||p.sourceIds.some(v=>typeof v!=='string'||v.length>200))throw new Error('页面数据无效，未导入。');
  if(p.template!==undefined&&!templateExists(p.template))throw new Error('页面模板无效。');
  if(p.sourceVersion!==undefined&&(typeof p.sourceVersion!=='string'||p.sourceVersion.length>100))throw new Error('页面来源版本无效。');
  if(p.codeContinuation!==undefined&&typeof p.codeContinuation!=='boolean')throw new Error('代码续页标记无效。');
  if(p.sourceRanges!==undefined&&(!Array.isArray(p.sourceRanges)||p.sourceRanges.length>200||p.sourceRanges.some(r=>!r||typeof r.blockId!=='string'||r.blockId.length>100||!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<0||r.end<r.start||r.end>20000)))throw new Error('页面来源位置无效。');
  if(p.tocEntries!==undefined&&(!Array.isArray(p.tocEntries)||p.tocEntries.length>1000||p.tocEntries.some(e=>!e||typeof e.label!=='string'||e.label.length>20000||!idOK(e.targetPageId)||e.occurrence!==undefined&&(!Number.isInteger(e.occurrence)||e.occurrence<0||e.occurrence>1000))||p.tocEntries.reduce((n,e)=>n+e.label.length,0)>20000))throw new Error('目录链接无效。');
  ids.add(p.id);total+=p.source.length;
 }
 if(total>60000)throw new Error('作品内容过多，请分开备份。');
 return {...structuredClone(s),...(s.series!==undefined?{series:validateSeriesSnapshot(s.series)}:{}),...(s.publication!==undefined?{publication:validatePublication(s.publication)}:{}),...(s.inspiration!==undefined?{inspiration:validateInspirationOrigin(s.inspiration)}:{})};
}
export async function makeBundle(s:Story,get:(id:string)=>Promise<MediaAsset|undefined>):Promise<Blob>{
 s=validateStory(s);
 const files:Record<string,Uint8Array>={};const assets:Omit<MediaAsset,'blob'>[]=[];let bytes=0;
 for(const id of new Set(s.pages.flatMap(p=>p.assetId?[p.assetId]:[]))){
  const a=await get(id);if(!a)throw new Error('作品照片缺失，请重新选择后再备份。');
  validateCapturedDate(a.capturedDate);if(a.sourceCredit!==undefined)validateSourceCredit(a.sourceCredit);const {blob,...meta}=a;delete meta.trashedAt;assets.push(meta);const data=new Uint8Array(await blob.arrayBuffer());bytes+=data.length;
  if(bytes>50_000_000)throw new Error('照片超过 50 MB，请分成较小的作品备份。');
  files['media/'+id]=data;
 }
 files['manifest.json']=strToU8(JSON.stringify({format:'shiye-story',version:1,story:s,assets}));
 return new Blob([zipSync(files,{level:0}) as Uint8Array<ArrayBuffer>],{type:'application/zip'});
}
export function readBundle(bytes:Uint8Array):{story:Story;assets:MediaAsset[]}{
 if(bytes.length>55_000_000)throw new Error('备份超过 55 MB。');
 let files:Record<string,Uint8Array>;
 files=readCheckedZip(bytes,{maxBytes:60_000_000,maxEntry:20_000_000,maxFiles:61});
 if(!files['manifest.json']||files['manifest.json'].length>2_000_000)throw new Error('缺少作品清单。');
 let data;try{data=JSON.parse(strFromU8(files['manifest.json']));}catch{throw new Error('作品清单损坏。');}
 if(data.format!=='shiye-story'||data.version!==1||!Array.isArray(data.assets)||data.assets.length>60)throw new Error('不是受支持的拾页备份。');
 const story=validateStory(data.story);const assets:MediaAsset[]=[];const seen=new Set();
 for(const a of data.assets){
  validateCapturedDate(a?.capturedDate);
  if(a?.sourceCredit!==undefined)a.sourceCredit=validateSourceCredit(a.sourceCredit);
  if(!a||!idOK(a.id)||seen.has(a.id)||typeof a.name!=='string'||a.name.length>200||!['image/jpeg','image/png','image/webp'].includes(a.type)||!Number.isInteger(a.width)||!Number.isInteger(a.height)||a.width<1||a.height<1||a.width>4096||a.height>4096||!Number.isFinite(a.createdAt))throw new Error('照片信息无效。');
  const bytes=files['media/'+a.id];if(!bytes||bytes.length!==a.bytes||bytes.length>8_000_000)throw new Error('照片缺失或过大。');
  seen.add(a.id);assets.push({...a,trashedAt:undefined,blob:new Blob([bytes as Uint8Array<ArrayBuffer>],{type:a.type})});
 }
 if(story.pages.some(p=>p.assetId&&!seen.has(p.assetId)))throw new Error('备份中缺少照片，未导入。');
 return {story,assets};
}


export function restoreIdentity(story:Story,assetIds:Map<string,string>):Story{
 validateStory(story);
 const pages=new Map(story.pages.map(p=>[p.id,makeId()]));
 const restored={...story,id:makeId(),revision:0,updatedAt:Date.now(),pages:story.pages.map(p=>{
  if(p.assetId&&!assetIds.has(p.assetId))throw new Error('恢复时缺少照片映射，未导入。');
  return {...p,id:pages.get(p.id)!,assetId:p.assetId?assetIds.get(p.assetId):undefined,
   tocEntries:p.tocEntries?.map(e=>({...e,targetPageId:pages.get(e.targetPageId)||e.targetPageId}))};
 })};
 return validateStory(restored);
}
