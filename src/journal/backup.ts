import {validateCapturedDate} from '../studio/photo-date.ts';
import {validateCompanion} from './companion-profile.ts';
import type {CompanionProfile} from './companion-profile.ts';
import {validateSourceCredit} from '../sources/credit.ts';
import {readCheckedZip} from '../core/checked-zip.ts';
import {zipSync,strToU8,strFromU8} from 'fflate';
import type {MediaAsset} from '../studio/model.ts';
import {makeId} from '../core/storage.ts';
import {validateEntry,validateMemory} from './model.ts';
import type {JournalEntry,MemoryAlbum} from './model.ts';
export interface JournalBundle{companion?:CompanionProfile;entries:JournalEntry[];memories:MemoryAlbum[];assets:MediaAsset[]}
const idOK=(id:unknown)=>typeof id==='string'&&/^[\w:-]{1,100}$/.test(id);
function records(entries:unknown,memories:unknown){
 if(!Array.isArray(entries)||entries.length>200||!Array.isArray(memories)||memories.length>50)throw new Error('每份备份最多 200 条随心记和 50 本回忆册，请分批导出。');
 const cleanEntries=entries.map(validateEntry),cleanMemories=memories.map(validateMemory);
 if(new Set(cleanEntries.map(e=>e.id)).size!==cleanEntries.length||new Set(cleanMemories.map(m=>m.id)).size!==cleanMemories.length)throw new Error('备份有重复记录。');return {entries:cleanEntries,memories:cleanMemories};
}
function usedPhotos(entries:JournalEntry[],memories:MemoryAlbum[]){return new Set([...entries.flatMap(e=>e.assetIds),...memories.flatMap(m=>m.items.flatMap(i=>i.assetIds))]);}
export async function makeJournalBundle(entries:JournalEntry[],memories:MemoryAlbum[],resolve:(id:string)=>Promise<MediaAsset|undefined>,companion?:CompanionProfile):Promise<Blob>{
 const clean=records(entries,memories);if(!entries.length&&!memories.length)throw new Error('还没有可备份的记录。');
 const ids=usedPhotos(clean.entries,clean.memories);if(ids.size>100)throw new Error('照片超过 100 张，请分批备份。');
 const files:Record<string,Uint8Array>={},assets:Omit<MediaAsset,'blob'>[]=[];let bytes=0;
 for(const id of ids){const a=await resolve(id);if(!a)throw new Error('记录中的照片缺失，请先重新选择后再备份。');validateCapturedDate(a.capturedDate);if(a.sourceCredit!==undefined)validateSourceCredit(a.sourceCredit);const {blob,...meta}=a;delete meta.trashedAt;const raw=new Uint8Array(await blob.arrayBuffer());bytes+=raw.length;if(bytes>50_000_000)throw new Error('照片超过 50 MB，请选择更少的记录分批备份。');files['media/'+id]=raw;assets.push(meta);}
 const manifest=strToU8(JSON.stringify({format:'shiye-journal',version:1,...clean,assets,...(companion?{companion:validateCompanion(companion)}:{})}));if(manifest.length>8_000_000)throw new Error('记录文字较多，请分批备份。');files['manifest.json']=manifest;
 return new Blob([zipSync(files,{level:0}) as Uint8Array<ArrayBuffer>],{type:'application/zip'});
}
export function readJournalBundle(bytes:Uint8Array):JournalBundle{
 if(bytes.length>60_000_000)throw new Error('备份超过 60 MB，请选择分批导出的文件。');let files:Record<string,Uint8Array>;
 files=readCheckedZip(bytes,{maxBytes:60_000_000,maxEntry:8_000_000,maxFiles:101});
 if(!files['manifest.json'])throw new Error('缺少随心记备份清单。');let data;try{data=JSON.parse(strFromU8(files['manifest.json']));}catch{throw new Error('备份清单损坏。');}
 if(data.format!=='shiye-journal'||data.version!==1||!Array.isArray(data.assets)||data.assets.length>100)throw new Error('不是受支持的随心记备份。');
 const clean=records(data.entries,data.memories),seen=new Set<string>();const assets:MediaAsset[]=[];
 for(const a of data.assets){
  validateCapturedDate(a?.capturedDate);
  if(a?.sourceCredit!==undefined)a.sourceCredit=validateSourceCredit(a.sourceCredit);
  if(!a||!idOK(a.id)||seen.has(a.id)||typeof a.name!=='string'||a.name.length>200||!['image/jpeg','image/png','image/webp'].includes(a.type)||!Number.isInteger(a.width)||!Number.isInteger(a.height)||a.width<1||a.height<1||a.width>4096||a.height>4096||!Number.isFinite(a.createdAt))throw new Error('照片信息无效。');
  const raw=files['media/'+a.id];if(!raw||raw.length!==a.bytes||raw.length>8_000_000)throw new Error('备份照片缺失或过大。');seen.add(a.id);assets.push({...a,trashedAt:undefined,blob:new Blob([raw as Uint8Array<ArrayBuffer>],{type:a.type})});
 }
 if([...usedPhotos(clean.entries,clean.memories)].some(id=>!seen.has(id)))throw new Error('备份缺少被记录使用的照片。');return {...clean,assets,...(data.companion!==undefined?{companion:validateCompanion(data.companion)}:{})};
}
export function restoreJournalIdentity(bundle:JournalBundle):JournalBundle{
 const clean=records(bundle.entries,bundle.memories),photos=new Map(bundle.assets.map(a=>[a.id,makeId()])),entries=new Map(clean.entries.map(e=>[e.id,makeId()]));
 function ref(id:string){if(!entries.has(id))entries.set(id,makeId());return entries.get(id)!;}
 function mapPhotos(ids:string[]){return ids.map(id=>{const next=photos.get(id);if(!next)throw new Error('恢复时缺少照片映射。');return next;});}
 return {...(bundle.companion!==undefined?{companion:validateCompanion(bundle.companion)}:{}),entries:clean.entries.map(e=>({...e,id:ref(e.id),revision:Math.max(1,e.revision),followUpTo:e.followUpTo?ref(e.followUpTo):undefined,assetIds:mapPhotos(e.assetIds)})),memories:clean.memories.map(m=>({...m,id:makeId(),revision:Math.max(1,m.revision),items:m.items.map(i=>({...i,entryRevision:clean.entries.some(e=>e.id===i.entryId&&e.revision===0&&i.entryRevision===0)?1:i.entryRevision,entryId:ref(i.entryId),assetIds:mapPhotos(i.assetIds)}))})),assets:bundle.assets.map(a=>({...a,id:photos.get(a.id)!,trashedAt:undefined}))};
}
