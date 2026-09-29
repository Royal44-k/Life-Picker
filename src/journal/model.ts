import {makeId} from '../core/storage.ts';
import type {CardOptions} from '../core/types.ts';
import type {Story} from '../studio/model.ts';
import {newPage,planStory} from '../studio/planner.ts';
export interface JournalEntry{version:1;id:string;revision:number;date:string;text:string;assetIds:string[];tags:string[];starred:boolean;followUpTo?:string;createdAt:number;updatedAt:number;trashedAt?:number}
export interface MemoryItem{entryId:string;entryRevision:number;date:string;text:string;assetIds:string[]}
export interface MemoryAlbum{version:1;id:string;revision:number;title:string;intro?:string;items:MemoryItem[];createdAt:number;updatedAt:number;trashedAt?:number}
const idOK=(v:unknown):v is string=>typeof v==='string'&&/^[\w:-]{1,100}$/.test(v);
export function validDate(value:unknown):value is string{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
function assetsOK(value:unknown):value is string[]{return Array.isArray(value)&&value.length<=10&&value.every(idOK)&&new Set(value).size===value.length;}
export function newEntry(date:string):JournalEntry{return {version:1,id:makeId(),revision:0,date,text:'',assetIds:[],tags:[],starred:false,createdAt:Date.now(),updatedAt:Date.now()};}
export function validateEntry(value:unknown):JournalEntry{
 const e=value as JournalEntry;
 if(!e||e.version!==1||!idOK(e.id)||!Number.isInteger(e.revision)||e.revision<0||typeof e.text!=='string'||e.text.length>20000||!assetsOK(e.assetIds)||typeof e.starred!=='boolean'||!Number.isFinite(e.createdAt)||!Number.isFinite(e.updatedAt)||e.trashedAt!==undefined&&!Number.isFinite(e.trashedAt))throw new Error('随心记格式无效，请保留原文件后重新检查。');
 if(!validDate(e.date))throw new Error('记录日期无效。');
 if(!Array.isArray(e.tags)||e.tags.length>12||e.tags.some(t=>typeof t!=='string'||!t.trim()||t.length>24)||new Set(e.tags).size!==e.tags.length)throw new Error('标签最多 12 个，每个不超过 24 字符。');
 if(e.followUpTo!==undefined&&(!idOK(e.followUpTo)||e.followUpTo===e.id))throw new Error('续记引用无效。');
 return structuredClone(e);
}
export function validateMemory(value:unknown):MemoryAlbum{
 const m=value as MemoryAlbum;
 if(!m||m.version!==1||!idOK(m.id)||!Number.isInteger(m.revision)||m.revision<0||typeof m.title!=='string'||!m.title.trim()||m.title.length>100||!Number.isFinite(m.createdAt)||!Number.isFinite(m.updatedAt)||m.trashedAt!==undefined&&!Number.isFinite(m.trashedAt))throw new Error('回忆册格式无效。');
 if(!Array.isArray(m.items)||!m.items.length||m.items.length>24)throw new Error('回忆内容需要 1～24 条记录。');
 if(m.intro!==undefined&&(typeof m.intro!=='string'||m.intro.length>4000))throw new Error('开场文字最多 4,000 字符。');
 const ids=new Set<string>();let length=m.intro?.length||0,photos=0;
 for(const item of m.items){if(!item||!idOK(item.entryId)||ids.has(item.entryId)||!Number.isInteger(item.entryRevision)||item.entryRevision<0||!validDate(item.date)||typeof item.text!=='string'||!assetsOK(item.assetIds)||!item.text.trim()&&!item.assetIds.length)throw new Error('回忆内容无效。');ids.add(item.entryId);length+=item.text.length;photos+=item.assetIds.length;}
 if(length>16000||photos>30)throw new Error('这组回忆内容较多，请分成几册（每册最多 16,000 字符、30 张照片）。');
 return structuredClone(m);
}
export function newMemory(title:string,entries:JournalEntry[]):MemoryAlbum{
 if(!entries.length)throw new Error('请先选择有内容的记录。');
 const now=Date.now();return validateMemory({version:1,id:makeId(),revision:0,title,createdAt:now,updatedAt:now,items:entries.map(entry=>{const e=validateEntry(entry);if(e.trashedAt)throw new Error('请先恢复回收站里的记录。');return {entryId:e.id,entryRevision:e.revision,date:e.date,text:e.text,assetIds:[...e.assetIds]};})});
}
function attachPhotos(story:Story,ids:string[],date:string){
 if(!ids.length)return story;
 const pages=[...story.pages];if(!pages.length)pages.push(newPage('## '+date));pages[0]={...pages[0],assetId:ids[0],layout:'photo'};
 ids.slice(1).forEach((id,i)=>pages.push({...newPage(date+' · 照片 '+(i+2)),assetId:id,layout:'photo'}));return {...story,pages};
}
export function entryToStory(entry:JournalEntry,options:CardOptions):Story{
 const e=validateEntry(entry);if(e.trashedAt)throw new Error('请先恢复这条记录。');if(!e.text.trim()&&!e.assetIds.length)throw new Error('先写一点文字或选择照片。');
 return attachPhotos(planStory(e.text||'## '+e.date,options,{target:0,cover:false,toc:'no',ending:'none'}),e.assetIds,e.date);
}
export function memoryToStory(album:MemoryAlbum,options:CardOptions):Story{
 const m=validateMemory(album);const opening='# '+m.title+(m.intro?'\n\n'+m.intro:'');const source=opening+'\n\n'+m.items.map(item=>'## '+item.date+'\n\n'+item.text).join('\n\n---\n\n');
 const story=planStory(source,options,{target:0,cover:false,toc:'no',ending:'none'});
 const openingPages=planStory(opening,options,{target:0,cover:false,toc:'no',ending:'none'}).pages.map(p=>({...p,sourceRanges:undefined,sourceVersion:undefined}));
 const pages=openingPages.concat(m.items.flatMap(item=>attachPhotos(planStory('## '+item.date+'\n\n'+item.text,options,{target:0,cover:false,toc:'no',ending:'none'}),item.assetIds,item.date).pages.map(p=>({...p,sourceIds:['journal:'+item.entryId],sourceRanges:undefined,sourceVersion:undefined}))));
 if(pages.length>60)throw new Error('回忆图文超过 60 页，请减少本册记录。');return {...story,title:m.title,pages};
}
