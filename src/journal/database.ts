import {validateCapturedDate} from '../studio/photo-date.ts';
import {COMPANION_KEY} from './companion-store.ts';
import {defaultCompanion,validateCompanion,mergeCompanion} from './companion-profile.ts';
import {loadImage} from '../studio/media.ts';
import {openDB,finish} from '../studio/database.ts';
import {validateEntry,validateMemory} from './model.ts';
import type {JournalEntry,MemoryAlbum} from './model.ts';
type RecordType=JournalEntry|MemoryAlbum;
async function saveRecord(name:'journals'|'memories',value:RecordType,expected:number):Promise<number>{
 const data=name==='journals'?validateEntry(value):validateMemory(value);
 if(name==='journals'&&expected===0&&!(data as JournalEntry).text.trim()&&!(data as JournalEntry).assetIds.length)throw new Error('先写一点文字或选择照片，再保存记录。');
 const ids=[...new Set(name==='journals'?(data as JournalEntry).assetIds:(data as MemoryAlbum).items.flatMap(i=>i.assetIds))];
 const db=await openDB(),tx=db.transaction([name,'assets'],'readwrite'),store=tx.objectStore(name);let conflict=false,missing=false,next=0;
 store.get(data.id).onsuccess=e=>{
  const old=(e.target as IDBRequest).result as RecordType|undefined;
  if((old?.revision||0)!==expected){conflict=true;tx.abort();return;}
  const put=()=>{next=expected+1;store.put({...data,revision:next,updatedAt:Date.now()});};let remaining=ids.length;if(!remaining){put();return;}
  for(const id of ids)tx.objectStore('assets').get(id).onsuccess=e=>{if(!(e.target as IDBRequest).result){missing=true;tx.abort();return;}if(--remaining===0)put();};
 };
 try{return await finish(db,tx,()=>next);}catch(e){if(conflict)throw new Error('另一窗口已更新这条内容。请先备份当前文字，再重新打开，不会覆盖新版本。');if(missing){const error=new Error('所选照片已不存在，请重新选择或移除后再保存。');error.name='MissingAssetError';throw error;}throw e;}
}
export const saveEntry=(entry:JournalEntry,expected:number)=>saveRecord('journals',entry,expected);
export const saveMemory=(memory:MemoryAlbum,expected:number)=>saveRecord('memories',memory,expected);
export async function listEntries(includeTrashed=false):Promise<JournalEntry[]>{
 const db=await openDB(),tx=db.transaction('journals');let entries:JournalEntry[]=[];tx.objectStore('journals').getAll().onsuccess=e=>{entries=(e.target as IDBRequest).result;};return finish(db,tx,()=>entries.map(validateEntry).filter(e=>includeTrashed||!e.trashedAt).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt));
}
export async function listMemories(includeTrashed=false):Promise<MemoryAlbum[]>{const db=await openDB(),tx=db.transaction('memories');let rows:MemoryAlbum[]=[];tx.objectStore('memories').getAll().onsuccess=e=>{rows=(e.target as IDBRequest).result;};return finish(db,tx,()=>rows.map(validateMemory).filter(m=>includeTrashed||!m.trashedAt).sort((a,b)=>b.updatedAt-a.updatedAt));}
async function trash(name:'journals'|'memories',id:string,expected:number,trashed:boolean){
 const db=await openDB(),tx=db.transaction(name,'readwrite'),store=tx.objectStore(name);let error='',revision=0;
 store.get(id).onsuccess=e=>{const entry=(e.target as IDBRequest).result as RecordType|undefined;
  if(!entry){error='记录已不存在，请刷新列表。';tx.abort();return;}if(entry.revision!==expected){error='另一窗口已更新这条记录，请重新打开后再操作。';tx.abort();return;}
  revision=expected+1;store.put({...entry,trashedAt:trashed?Date.now():undefined,revision,updatedAt:Date.now()});
 };try{return await finish(db,tx,()=>revision);}catch(e){if(error)throw new Error(error);throw e;}
}
export const trashEntry=(id:string,expected:number)=>trash('journals',id,expected,true);
export const restoreEntry=(id:string,expected:number)=>trash('journals',id,expected,false);
async function remove(name:'journals'|'memories',id:string,expected:number){
 const db=await openDB(),tx=db.transaction(name,'readwrite'),store=tx.objectStore(name);let error='';
 store.get(id).onsuccess=e=>{const record=(e.target as IDBRequest).result;if(!record)return;if(record.revision!==expected){error='另一窗口已更新这条内容，请重新打开后再删除。';tx.abort();return;}if(!record.trashedAt){error='请先将记录移入回收站。';tx.abort();return;}store.delete(id);};
 try{await finish(db,tx,()=>undefined);}catch(e){if(error)throw new Error(error);throw e;}
}
export const deleteEntryPermanently=(id:string,expected:number)=>remove('journals',id,expected);
export const trashMemory=(id:string,expected:number)=>trash('memories',id,expected,true);
export const restoreMemory=(id:string,expected:number)=>trash('memories',id,expected,false);
export const deleteMemory=(id:string,expected:number)=>remove('memories',id,expected);

export async function importJournalData(bundle:import('./backup.ts').JournalBundle):Promise<void>{
 const entries=bundle.entries.map(validateEntry),memories=bundle.memories.map(validateMemory),companion=bundle.companion===undefined?undefined:validateCompanion(bundle.companion);
 if(entries.length>200||memories.length>50||bundle.assets.length>100)throw new Error('备份条目过多，请分批恢复。');
 const photos=new Set(bundle.assets.map(a=>a.id));
 if([...entries.flatMap(e=>e.assetIds),...memories.flatMap(m=>m.items.flatMap(i=>i.assetIds))].some(id=>!photos.has(id)))throw new Error('恢复的记录缺少照片。');
 for(const asset of bundle.assets){validateCapturedDate(asset.capturedDate);const decoded=await loadImage(asset.blob);if(decoded.naturalWidth!==asset.width||decoded.naturalHeight!==asset.height)throw new Error('照片尺寸不一致，未恢复任何记录。');}
 const db=await openDB(),tx=db.transaction(['journals','memories','assets','meta'],'readwrite');let conflict=false,profileError='';
 if(companion)tx.objectStore('meta').get(COMPANION_KEY).onsuccess=e=>{try{const row=(e.target as IDBRequest).result,current=row?validateCompanion(row.profile):defaultCompanion();tx.objectStore('meta').put({id:COMPANION_KEY,profile:mergeCompanion(current,companion)});}catch(e){profileError=(e as Error).message;tx.abort();}};
 for(const [name,rows] of [['journals',entries],['memories',memories],['assets',bundle.assets]] as const){
  const ids=new Set<string>();for(const row of rows){if(ids.has(row.id)){conflict=true;tx.abort();break;}ids.add(row.id);const store=tx.objectStore(name);store.get(row.id).onsuccess=e=>{if((e.target as IDBRequest).result){conflict=true;tx.abort();return;}store.put(row);};}if(conflict)break;
 }
 try{await finish(db,tx,()=>undefined);}catch(e){if(profileError)throw new Error(profileError);if(conflict)throw new Error('恢复内容与已有记录冲突，未写入；请重新读取备份。');throw e;}
}
