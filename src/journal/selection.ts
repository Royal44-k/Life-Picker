import {validDate} from './model.ts';
import type {JournalEntry,MemoryItem} from './model.ts';
const iso=(date:Date)=>date.toISOString().slice(0,10);
export function memoryRange(kind:'week'|'month'|'year',anchor:string):{start:string;end:string}{
 if(!validDate(anchor))throw new Error('请选择有效日期。');
 const day=new Date(anchor+'T12:00:00Z'),start=new Date(day),end=new Date(day);
 if(kind==='week'){start.setUTCDate(day.getUTCDate()-(day.getUTCDay()+6)%7);end.setTime(start.getTime());end.setUTCDate(start.getUTCDate()+6);}
 else if(kind==='month'){start.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+1,0);}
 else{start.setUTCMonth(0,1);end.setUTCMonth(11,31);}
 return {start:iso(start),end:iso(end)};
}
export interface MemorySelection{start:string;end:string;count:number;locked:string[];excluded:string[];previous:string[]}
export function sampleMemories(entries:JournalEntry[],selection:MemorySelection,random=Math.random):JournalEntry[]{
 const {start,end,count,locked,excluded,previous}=selection;
 if(!validDate(start)||!validDate(end)||start>end)throw new Error('请选择有效的起止日期。');
 if(!Number.isInteger(count)||count<1||count>24)throw new Error('每组可选择 1～24 条记录。');
 const locks=new Set(locked),omit=new Set(excluded),old=new Set(previous);
 if(locks.size>count)throw new Error('锁定记录超过目标条数，请先解锁或增加条数。');
 const pool=entries.filter(e=>!e.trashedAt&&e.date>=start&&e.date<=end&&!omit.has(e.id)&&(e.text.trim()||e.assetIds.length));
 if([...locks].some(id=>!pool.some(e=>e.id===id)))throw new Error('锁定记录不在当前范围或已被移除，请重新选材。');
 const selected=pool.filter(e=>locks.has(e.id)),seen=new Set(selected.map(e=>JSON.stringify([e.date,e.text.trim(),e.assetIds]))),ids=new Set(selected.map(e=>e.id));
 const candidates=pool.filter(e=>{const key=JSON.stringify([e.date,e.text.trim(),e.assetIds]);if(ids.has(e.id)||seen.has(key))return false;ids.add(e.id);seen.add(key);return true;});
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999,random()))*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 const dates=new Set(selected.map(e=>e.date));
 while(selected.length<count&&candidates.length){candidates.sort((a,b)=>Number(dates.has(a.date))-Number(dates.has(b.date))||Number(old.has(a.id))-Number(old.has(b.id)));const next=candidates.shift()!;selected.push(next);dates.add(next.date);}
 return selected.sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt).map(e=>structuredClone(e));
}
export function snapshotState(item:MemoryItem,entries:JournalEntry[]):'current'|'changed'|'removed'{const e=entries.find(e=>e.id===item.entryId);return !e||e.trashedAt?'removed':e.revision!==item.entryRevision?'changed':'current';}
