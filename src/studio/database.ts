import type {Story,MediaAsset} from './model.ts';
import {validateStory} from './backup.ts';
import {loadDrafts} from '../core/storage.ts';
import {planStory} from './planner.ts';
import {DEFAULT_SETTINGS} from './model.ts';
const DB='shiye-studio-v2';
function openDB():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 const req=indexedDB.open(DB,1);
 req.onupgradeneeded=()=>{for(const name of ['stories','assets','meta'])req.result.createObjectStore(name,{keyPath:'id'});};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(new Error('无法打开本机存储，请关闭无痕模式或备份后释放空间。'));req.onblocked=()=>reject(new Error('另一窗口正在升级存储，请关闭后重试。'));
});}
function finish<T>(db:IDBDatabase,tx:IDBTransaction,result:()=>T):Promise<T>{return new Promise((resolve,reject)=>{tx.oncomplete=()=>{db.close();resolve(result());};tx.onerror=()=>{};tx.onabort=()=>{db.close();reject(tx.error||new Error('保存中断，当前修改尚未保存。'));};});}
export async function allStories():Promise<Story[]>{const db=await openDB();const tx=db.transaction('stories');let rows:Story[]=[];tx.objectStore('stories').getAll().onsuccess=e=>{rows=(e.target as IDBRequest).result;};return finish(db,tx,()=>rows.map(validateStory).sort((a,b)=>b.updatedAt-a.updatedAt));}
export async function saveStory(story:Story,expected:number):Promise<number>{
 validateStory(story);const db=await openDB();const tx=db.transaction('stories','readwrite');const store=tx.objectStore('stories');let next=0;let conflict=false;
 store.get(story.id).onsuccess=e=>{const old=(e.target as IDBRequest).result as Story|undefined;if((old?.revision||0)!==expected){conflict=true;tx.abort();return;}next=expected+1;store.put({...story,revision:next});};
 try{return await finish(db,tx,()=>next);}catch(e){if(conflict)throw new Error('另一窗口已更新此作品。请先备份当前修改，再刷新；不会覆盖新版本。');throw e;}
}
export async function getAsset(id:string):Promise<MediaAsset|undefined>{const db=await openDB();const tx=db.transaction('assets');let a:MediaAsset|undefined;tx.objectStore('assets').get(id).onsuccess=e=>{a=(e.target as IDBRequest).result;};return finish(db,tx,()=>a);}
export async function listAssets():Promise<MediaAsset[]>{const db=await openDB();const tx=db.transaction('assets');let a:MediaAsset[]=[];tx.objectStore('assets').getAll().onsuccess=e=>{a=(e.target as IDBRequest).result;};return finish(db,tx,()=>a.sort((a,b)=>b.createdAt-a.createdAt));}
export async function putAsset(asset:MediaAsset):Promise<void>{const db=await openDB();const tx=db.transaction('assets','readwrite');const store=tx.objectStore('assets');store.count().onsuccess=e=>{if((e.target as IDBRequest).result>=100){tx.abort();return;}store.put(asset);};return finish(db,tx,()=>undefined);}
export async function importStory(story:Story,assets:MediaAsset[]):Promise<void>{
 validateStory(story);const db=await openDB();const tx=db.transaction(['stories','assets'],'readwrite');
 const s=tx.objectStore('stories');s.get(story.id).onsuccess=e=>{if((e.target as IDBRequest).result){tx.abort();return;}s.put(story);for(const a of assets)tx.objectStore('assets').put(a);};
 return finish(db,tx,()=>undefined);
}
export async function migrateLegacy():Promise<void>{
 const old=loadDrafts();const copies=old.map(d=>({...planStory(d.source,d.options,DEFAULT_SETTINGS),id:'legacy:'+d.id,updatedAt:d.updatedAt}));
 const db=await openDB();const tx=db.transaction(['stories','meta'],'readwrite');const meta=tx.objectStore('meta');
 meta.get('v1-migrated').onsuccess=e=>{if((e.target as IDBRequest).result)return;for(const s of copies)tx.objectStore('stories').put(s);meta.put({id:'v1-migrated',at:Date.now()});};
 return finish(db,tx,()=>undefined);
}
