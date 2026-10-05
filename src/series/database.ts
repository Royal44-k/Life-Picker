import {openDB,finish} from '../studio/database.ts';
import {validateSeries,validateSeriesSnapshot} from './model.ts';
import type {PersonalSeries} from './model.ts';
import type {Story} from '../studio/model.ts';
import {DEFAULT_SETTINGS} from '../studio/model.ts';
import {planStory} from '../studio/planner.ts';
import {createMeasure} from '../core/renderer.ts';
const key=(id:string)=>'series:'+id;
const range=()=>IDBKeyRange.bound('series:','series:\uffff');
export async function listSeries(includeArchived=false):Promise<PersonalSeries[]>{const db=await openDB(),tx=db.transaction('meta');let values:{series:unknown}[]=[];tx.objectStore('meta').getAll(range()).onsuccess=e=>{values=(e.target as IDBRequest).result;};return finish(db,tx,()=>values.map(v=>validateSeries(v.series)).filter(v=>includeArchived||!v.archived).sort((a,b)=>b.updatedAt-a.updatedAt));}
export async function saveSeries(value:PersonalSeries,expected:number):Promise<PersonalSeries>{
 const series=validateSeries(value);if(!Number.isSafeInteger(expected)||expected<0||series.revision!==expected)throw new Error('系列修订不一致，请重新读取。');const db=await openDB(),tx=db.transaction('meta','readwrite'),store=tx.objectStore('meta');let reason='',saved:PersonalSeries;
 store.get(key(series.id)).onsuccess=e=>{const previous=(e.target as IDBRequest).result;try{const old=previous?validateSeries(previous.series):null;if((old?.revision||0)!==expected)throw new Error('另一窗口已更新此系列，当前输入保留；请先下载输入，再载入已保存版本。');const put=()=>{saved={...series,revision:expected+1,updatedAt:Date.now()};store.put({id:key(series.id),series:saved});};if(old)put();else store.count(range()).onsuccess=e=>{if((e.target as IDBRequest).result>=50){reason='最多保存 50 个系列（含已停用）；请恢复已有系列使用。';tx.abort();}else put();};}catch(e){reason=(e as Error).message;tx.abort();}};
 try{return await finish(db,tx,()=>saved!);}catch(e){throw new Error(reason||(e as Error).message||'系列尚未保存，输入仍保留。');}
}
export function applySeriesToStory(story:Story,series:PersonalSeries|null,appearance:boolean):Story{
 if(!series){const next={...story,options:{...story.options,series:''}};delete next.series;return next;}const s=validateSeries(series);if(s.archived)throw new Error('这个系列已停用，请先恢复。');return {...story,series:validateSeriesSnapshot(s),options:{...(appearance?s.defaults:story.options),series:s.name}};
}
export async function createSeriesStory(definition:PersonalSeries,text:string):Promise<Story>{
 const expected=validateSeries(definition);const db=await openDB(),tx=db.transaction(['meta','stories'],'readwrite');let reason='',created:Story;
 tx.objectStore('meta').get(key(expected.id)).onsuccess=e=>{try{const row=(e.target as IDBRequest).result;if(!row)throw new Error('系列已不存在，请重新读取。');const current=validateSeries(row.series);if(current.archived||current.revision!==expected.revision)throw new Error('系列已停用或默认设置发生变化，请重新读取；文字仍保留。');created={...planStory(text,current.defaults,DEFAULT_SETTINGS,createMeasure(current.defaults)),series:validateSeriesSnapshot(current),revision:1};tx.objectStore('stories').add(created);}catch(e){reason=(e as Error).message;tx.abort();}};
 try{return await finish(db,tx,()=>created!);}catch(e){throw new Error(reason||(e as Error).message||'作品尚未创建，文字仍保留。');}
}
export async function mergeSeries(values:PersonalSeries[]):Promise<{added:number;kept:number}>{
 if(!values.length||values.length>50)throw new Error('系列备份需要 1～50 项。');const clean=values.map(validateSeries);if(clean.some(s=>s.revision<1)||new Set(clean.map(s=>s.id)).size!==clean.length)throw new Error('系列备份有未保存或重复定义。');const db=await openDB(),tx=db.transaction('meta','readwrite'),store=tx.objectStore('meta');let count=0,remaining=clean.length+1,reason='',kept=0;const added:PersonalSeries[]=[];
 const ready=()=>{if(--remaining)return;if(count+added.length>50){reason='恢复后超过 50 个系列，未写入任何内容。';tx.abort();return;}for(const s of added)store.add({id:key(s.id),series:s});};
 store.count(range()).onsuccess=e=>{count=(e.target as IDBRequest).result;ready();};for(const s of clean)store.get(key(s.id)).onsuccess=e=>{if((e.target as IDBRequest).result)kept++;else added.push(s);ready();};
 try{return await finish(db,tx,()=>({added:added.length,kept}));}catch(e){throw new Error(reason||(e as Error).message||'恢复失败，原系列保留。');}
}
