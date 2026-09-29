import type {Story,MediaAsset} from './model.ts';
import {validateStory} from './backup.ts';
import {loadDrafts} from '../core/storage.ts';
import {planStory} from './planner.ts';
import {DEFAULT_SETTINGS} from './model.ts';
const DB='shiye-studio-v2';
export function openDB():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 let failed=false;const req=indexedDB.open(DB,2);
 req.onupgradeneeded=()=>{for(const name of ['stories','assets','meta','journals','memories'])if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name,{keyPath:'id'});};
 req.onsuccess=()=>{if(failed){req.result.close();return;}req.result.onversionchange=()=>req.result.close();resolve(req.result);};req.onerror=()=>reject(new Error('无法打开本机存储，请关闭无痕模式或备份后释放空间。'));req.onblocked=()=>{failed=true;reject(new Error('另一窗口正在升级存储，请关闭后重试。'));};
});}
export function finish<T>(db:IDBDatabase,tx:IDBTransaction,result:()=>T):Promise<T>{return new Promise((resolve,reject)=>{tx.oncomplete=()=>{db.close();try{resolve(result());}catch(e){reject(e);}};tx.onerror=()=>{};tx.onabort=()=>{db.close();reject(tx.error||new Error('保存中断，当前修改尚未保存。'));};});}
export async function allStories():Promise<Story[]>{const db=await openDB();const tx=db.transaction('stories');let rows:Story[]=[];tx.objectStore('stories').getAll().onsuccess=e=>{rows=(e.target as IDBRequest).result;};return finish(db,tx,()=>rows.map(validateStory).sort((a,b)=>b.updatedAt-a.updatedAt));}
export async function saveStory(story:Story,expected:number):Promise<number>{
 validateStory(story);const db=await openDB();const tx=db.transaction(['stories','assets'],'readwrite');const store=tx.objectStore('stories');
 let next=0,conflict=false,missing=false;
 store.get(story.id).onsuccess=e=>{
  const old=(e.target as IDBRequest).result as Story|undefined;
  if((old?.revision||0)!==expected){conflict=true;tx.abort();return;}
  const ids=[...new Set(story.pages.flatMap(p=>p.assetId?[p.assetId]:[]))];let remaining=ids.length;
  const put=()=>{next=expected+1;store.put({...story,revision:next});};
  if(!remaining){put();return;}
  for(const id of ids)tx.objectStore('assets').get(id).onsuccess=e=>{
   if(!(e.target as IDBRequest).result){missing=true;tx.abort();return;}
   if(--remaining===0)put();
  };
 };
 try{return await finish(db,tx,()=>next);}catch(e){
  if(conflict)throw new Error('另一窗口已更新此作品。请先备份当前修改，再刷新；不会覆盖新版本。');
  if(missing){const error=new Error('照片已在另一窗口被彻底删除。请为相关页面重新选择照片或选择“不放照片”，再保存。');error.name='MissingAssetError';throw error;}
  throw e;
 }
}

export async function getAsset(id:string):Promise<MediaAsset|undefined>{const db=await openDB();const tx=db.transaction('assets');let a:MediaAsset|undefined;tx.objectStore('assets').get(id).onsuccess=e=>{a=(e.target as IDBRequest).result;};return finish(db,tx,()=>a);}
export async function listAssets(includeTrashed=false):Promise<MediaAsset[]>{const db=await openDB();const tx=db.transaction('assets');let a:MediaAsset[]=[];tx.objectStore('assets').getAll().onsuccess=e=>{a=(e.target as IDBRequest).result;};return finish(db,tx,()=>a.filter(asset=>includeTrashed||!asset.trashedAt).sort((a,b)=>b.createdAt-a.createdAt));}
export async function putAsset(asset:MediaAsset):Promise<void>{
 const db=await openDB();const tx=db.transaction('assets','readwrite');const store=tx.objectStore('assets');let full=false;
 store.get(asset.id).onsuccess=e=>{
  if((e.target as IDBRequest).result){store.put(asset);return;}
  store.count().onsuccess=e=>{if((e.target as IDBRequest).result>=100){full=true;tx.abort();return;}store.put(asset);};
 };
 try{await finish(db,tx,()=>undefined);}catch(e){if(full)throw new Error('本机照片已达 100 张（含回收站）。请在回收站永久删除未使用的照片后再添加；已有作品保留。');throw e;}
}
export async function importStory(story:Story,assets:MediaAsset[]):Promise<void>{
 validateStory(story);const db=await openDB();const tx=db.transaction(['stories','assets'],'readwrite');
 const s=tx.objectStore('stories');s.get(story.id).onsuccess=e=>{if((e.target as IDBRequest).result){tx.abort();return;}s.put(story);for(const a of assets)tx.objectStore('assets').put(a);};
 return finish(db,tx,()=>undefined);
}
export async function migrateLegacy():Promise<void>{
 const prior=await openDB();const read=prior.transaction('meta');let done=false;
 read.objectStore('meta').get('v1-migrated').onsuccess=e=>{done=!!(e.target as IDBRequest).result;};
 if(await finish(prior,read,()=>done))return;
 const copies=loadDrafts().map(d=>{
  const settings={...DEFAULT_SETTINGS,cover:false,toc:'no' as const,ending:'none' as const};
  let copy:Story;
  try{copy=planStory(d.source,d.options,settings);}
  catch{copy={...planStory('',d.options,settings),source:d.source,title:d.source.replace(/^#+\s*/,'').split('\n')[0].slice(0,100)||'待整理的旧稿',warnings:['旧稿原文已完整复制，但超过新编排容量。请分成多篇，或从经典版继续处理。']};}
  return {...copy,id:'legacy:'+d.id,updatedAt:d.updatedAt};
 });
 const db=await openDB();const tx=db.transaction(['stories','meta'],'readwrite');const meta=tx.objectStore('meta');
 meta.get('v1-migrated').onsuccess=e=>{if((e.target as IDBRequest).result)return;for(const s of copies)tx.objectStore('stories').put(s);meta.put({id:'v1-migrated',at:Date.now()});};
 return finish(db,tx,()=>undefined);
}

export async function importStories(stories:Story[]):Promise<void>{
 if(!stories.length||stories.length>10)throw new Error('每次导入 1～10 篇作品。');
 const ids=new Set<string>();for(const s of stories){validateStory(s);if(ids.has(s.id))throw new Error('作品已存在，本次导入未写入。');ids.add(s.id);}
 const db=await openDB();const tx=db.transaction('stories','readwrite');const store=tx.objectStore('stories');let conflict=false;
 for(const s of stories)store.get(s.id).onsuccess=e=>{
  if((e.target as IDBRequest).result){conflict=true;tx.abort();return;}
  store.put({...s,revision:1});
 };
 try{await finish(db,tx,()=>undefined);}catch(e){if(conflict)throw new Error('作品已存在，本次导入未写入。');throw e;}
}


export async function assetUsage(id:string):Promise<{id:string;title:string}[]>{
 return (await allStories()).filter(s=>s.pages.some(p=>p.assetId===id)).map(s=>({id:s.id,title:s.title}));
}
async function updateTrash(id:string,trashed:boolean):Promise<void>{
 const db=await openDB();const tx=db.transaction('assets','readwrite');const store=tx.objectStore('assets');let missing=false;
 store.get(id).onsuccess=e=>{
  const asset=(e.target as IDBRequest).result as MediaAsset|undefined;
  if(!asset){missing=true;tx.abort();return;}
  if(trashed)asset.trashedAt=Date.now();else delete asset.trashedAt;
  store.put(asset);
 };
 try{await finish(db,tx,()=>undefined);}catch(e){if(missing)throw new Error('照片已不存在，请刷新素材库。');throw e;}
}
export const trashAsset=(id:string)=>updateTrash(id,true);
export const restoreAsset=(id:string)=>updateTrash(id,false);
export async function otherAssetUsage():Promise<Record<string,{id:string;title:string}[]>>{
 const db=await openDB(),tx=db.transaction(['journals','memories']);const result:Record<string,{id:string;title:string}[]>={};
 for(const store of ['journals','memories'])tx.objectStore(store).getAll().onsuccess=e=>{
  for(const row of (e.target as IDBRequest).result){
   const ids:string[]=store==='journals'?row.assetIds:row.items.flatMap((i:{assetIds:string[]})=>i.assetIds);
   for(const id of new Set(ids))(result[id]??=[]).push({id:store+':'+row.id,title:store==='journals'?'随心记 · '+row.date+(row.trashedAt?'（回收站）':''):'回忆册 · '+row.title});
  }
 };return finish(db,tx,()=>result);
}
export async function deleteAssetPermanently(id:string):Promise<void>{
 const db=await openDB();const tx=db.transaction(['assets','stories','journals','memories'],'readwrite');let reason='';
 const assets=tx.objectStore('assets');
 assets.get(id).onsuccess=e=>{
  const asset=(e.target as IDBRequest).result as MediaAsset|undefined;if(!asset)return;
  if(!asset.trashedAt){reason='请先将照片移入回收站；已恢复的照片不会被直接删除。';tx.abort();return;}
  let remaining=3;const uses:string[]=[];
  for(const name of ['stories','journals','memories'])tx.objectStore(name).getAll().onsuccess=e=>{
   const rows=(e.target as IDBRequest).result;
   const count=rows.filter((row:Story&{assetIds:string[];items:{assetIds:string[]}[]})=>name==='stories'?row.pages.some(p=>p.assetId===id):name==='journals'?row.assetIds.includes(id):row.items.some(i=>i.assetIds.includes(id))).length;
   if(count)uses.push(count+' 个'+(name==='stories'?'作品':name==='journals'?'随心记':'回忆册'));
   if(--remaining===0){if(uses.length){reason='照片仍用于 '+uses.join('、')+'，请先从这些内容中移除照片。';tx.abort();}else assets.delete(id);}
  };
 };
 try{await finish(db,tx,()=>undefined);}catch(e){if(reason)throw new Error(reason);throw e;}
}
