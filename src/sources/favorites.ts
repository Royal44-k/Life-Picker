import {openDB,finish} from '../studio/database.ts';
const key='source-favorites-v1';
function ids(value:unknown):string[]{const data=value as {ids?:unknown};if(value===undefined)return [];if(!Array.isArray(data?.ids)||data.ids.length>100||data.ids.some(id=>typeof id!=='string'||!/^[\w:-]{1,100}$/.test(id))||new Set(data.ids).size!==data.ids.length)throw new Error('参考收藏列表暂不可用，原数据保留。');return [...data.ids];}
export async function readSourceFavorites():Promise<string[]>{const db=await openDB(),tx=db.transaction('meta');let value:unknown;tx.objectStore('meta').get(key).onsuccess=e=>{value=(e.target as IDBRequest).result;};return finish(db,tx,()=>ids(value));}
export async function setSourceFavorite(id:string,selected:boolean):Promise<string[]>{
 if(!/^[\w:-]{1,100}$/.test(id))throw new Error('参考标识无效。');const db=await openDB(),tx=db.transaction('meta','readwrite'),store=tx.objectStore('meta');let next:string[]=[],reason='';
 store.get(key).onsuccess=e=>{try{const old=ids((e.target as IDBRequest).result);next=selected?[...new Set([...old,id])]:old.filter(v=>v!==id);if(next.length>100)throw new Error('最多收藏 100 条参考，请先取消不需要的收藏。');store.put({id:key,ids:next});}catch(e){reason=(e as Error).message;tx.abort();}};
 try{return await finish(db,tx,()=>next);}catch(e){throw new Error(reason||(e as Error).message||'收藏尚未保存，请重试。');}
}
