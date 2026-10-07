import {makeId} from '../core/storage.ts';
import {validateEntry,validateQuote} from './model.ts';
import type {JournalEntry,JournalQuote} from './model.ts';

export interface QuoteRow{key:string;entryId:string;entryTitle:string;quote:JournalQuote;sourceChanged:boolean}
function editable(entry:JournalEntry){const e=validateEntry(entry);if(e.trashedAt)throw new Error('请先恢复原记录，再整理原话。');return e;}
export function addQuote(entry:JournalEntry,selection:string):JournalEntry{
 const e=editable(entry),text=selection.trim();
 if(!text)throw new Error('请先选择一句原话。');
 if(text.length>500)throw new Error('每句最多 500 字符，请缩短选择。');
 if(!e.text.includes(text))throw new Error('选择的文字已不在原文中，请重新选择。');
 return restoreQuote(e,{id:makeId(),text,sourceDate:e.date,createdAt:Date.now()},e.quotes?.length||0);
}
export function restoreQuote(entry:JournalEntry,value:JournalQuote,index:number):JournalEntry{
 const e=editable(entry),quote=validateQuote(value),quotes=[...(e.quotes||[])];
 if(quotes.some(q=>q.id===quote.id||q.text===quote.text))throw new Error('这句原话已经收藏了。');
 if(quotes.length>=20)throw new Error('这条记录已收藏 20 句，请先整理一下。');
 quotes.splice(Math.max(0,Math.min(quotes.length,Number.isInteger(index)?index:quotes.length)),0,quote);
 return validateEntry({...e,quotes});
}
export function removeQuote(entry:JournalEntry,id:string):JournalEntry{
 const e=editable(entry);if(!e.quotes?.some(q=>q.id===id))throw new Error('这句原话已不存在，请重新读取。');
 return {...e,quotes:e.quotes.filter(q=>q.id!==id)};
}
export function collectQuotes(entries:JournalEntry[]):QuoteRow[]{
 return entries.filter(e=>!e.trashedAt).flatMap(entry=>{
  const e=validateEntry(entry);return (e.quotes||[]).map(quote=>({key:e.id+'/'+quote.id,entryId:e.id,entryTitle:e.text.trim().split('\n')[0].replace(/^#+\s*/,'').slice(0,80)||'这一天的记录',quote,sourceChanged:!e.text.includes(quote.text)}));
 }).sort((a,b)=>b.quote.createdAt-a.quote.createdAt||a.key.localeCompare(b.key));
}
export function resolveQuotes(entries:JournalEntry[],keys:string[]):QuoteRow[]{
 if(!keys.length||keys.length>9)throw new Error('请选择 1～9 句原话。');
 if(new Set(keys).size!==keys.length)throw new Error('不能重复选择同一句原话。');
 const rows=new Map(collectQuotes(entries).map(row=>[row.key,row]));
 return keys.map(key=>{const row=rows.get(key);if(!row)throw new Error('所选原话或原记录已变化，请重新读取并选择。');return row;});
}
export function quotesToSource(rows:QuoteRow[]):string{
 if(!rows.length||rows.length>9)throw new Error('请选择 1～9 句原话。');
 return rows.map(row=>validateQuote(row.quote).text).join('\n\n---\n\n');
}
export function quoteCandidates(text:string):string[]{
 // Keep the source characters intact, including a closing quotation mark.
 const chunks=text.match(/[^\r\n。！？!?]+[。！？!?]+[”’」』）)]*|[^\r\n。！？!?]+/g)||[];
 return [...new Set(chunks.map(s=>s.trim()).filter(s=>s.length>0&&s.length<=500))].slice(0,40);
}
