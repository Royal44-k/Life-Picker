import {openDB,finish} from '../studio/database.ts';
import {defaultCompanion,validateCompanion,advanceCompanion,progressFromRecords,appearanceAvailable} from './companion-profile.ts';
import type {CompanionProfile,Appearance} from './companion-profile.ts';
export const COMPANION_KEY='shiye:companion:v1';
export async function readCompanion():Promise<CompanionProfile>{
 const db=await openDB(),tx=db.transaction('meta');let row:{profile:unknown}|undefined;
 tx.objectStore('meta').get(COMPANION_KEY).onsuccess=e=>{row=(e.target as IDBRequest).result;};
 return finish(db,tx,()=>row?validateCompanion(row.profile):defaultCompanion());
}
export async function syncCompanion():Promise<CompanionProfile>{
 const db=await openDB(),tx=db.transaction(['meta','journals','memories'],'readwrite');let remaining=3,result:CompanionProfile,reason='';
 const records:Record<string,unknown>={};
 function receive(name:string,value:unknown){
  records[name]=value;if(--remaining)return;
  try{
   const row=records.meta as {profile:unknown}|undefined,current=row?validateCompanion(row.profile):defaultCompanion();
   result=advanceCompanion(current,progressFromRecords(records.journals as Parameters<typeof progressFromRecords>[0],records.memories as Parameters<typeof progressFromRecords>[1]));
   if(result!==current)tx.objectStore('meta').put({id:COMPANION_KEY,profile:result});
  }catch(e){reason=(e as Error).message;tx.abort();}
 }
 tx.objectStore('meta').get(COMPANION_KEY).onsuccess=e=>receive('meta',(e.target as IDBRequest).result);
 for(const name of ['journals','memories'])tx.objectStore(name).getAll().onsuccess=e=>receive(name,(e.target as IDBRequest).result);
 try{return await finish(db,tx,()=>result);}catch(e){throw reason?new Error(reason):e;}
}
export async function saveAppearance(appearance:Appearance,expected:number):Promise<CompanionProfile>{
 if(!Number.isSafeInteger(expected)||expected<0)throw new Error('小拾资料修订无效。');
 const db=await openDB(),tx=db.transaction('meta','readwrite');let result:CompanionProfile,reason='';
 tx.objectStore('meta').get(COMPANION_KEY).onsuccess=e=>{
  try{
   const row=(e.target as IDBRequest).result,current=row?validateCompanion(row.profile):defaultCompanion();
   if(current.revision!==expected)throw new Error('另一窗口更新了小拾资料，请重新读取后再选择；不会覆盖新装扮。');
   if(!appearanceAvailable(current,appearance))throw new Error('这款装扮尚未开启，请先核对纪念。');
   result=validateCompanion({...current,appearance,revision:current.revision+1,updatedAt:Date.now()});
   tx.objectStore('meta').put({id:COMPANION_KEY,profile:result});
  }catch(e){reason=(e as Error).message;tx.abort();}
 };
 try{return await finish(db,tx,()=>result);}catch(e){throw reason?new Error(reason):e;}
}
