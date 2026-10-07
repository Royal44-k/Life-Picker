import {validateEntry,validateMemory} from './model.ts';
import type {JournalEntry,MemoryAlbum} from './model.ts';
export const APPEARANCES=[
 {id:'leaf',name:'初见绿',hint:'第一次见面的嫩绿书签'},
 {id:'sky',name:'晴空蓝',hint:'换一枚清爽的蓝色书签'},
 {id:'blossom',name:'花朵邮票',hint:'收藏一句自己的原话后开启'},
 {id:'star',name:'星光书签',hint:'保存一本回忆册，或留下 30 页记录后开启'}
] as const;
export type Appearance=typeof APPEARANCES[number]['id'];
export const KEEPSAKES=[
 {id:'page',name:'日常的第一页',hint:'保存一条有内容的随心记'},
 {id:'quote',name:'自己的声音',hint:'收藏一句自己的原话'},
 {id:'memory',name:'回头看见光',hint:'确认保存一本回忆册'},
 {id:'ten',name:'十页小世界',hint:'积累 10 条有内容的记录'},
 {id:'thirty',name:'一叠自己的故事',hint:'积累 30 条有内容的记录'}
] as const;
export type Keepsake=typeof KEEPSAKES[number]['id'];
export interface CompanionProfile{version:1;revision:number;appearance:Appearance;earned:Keepsake[];updatedAt:number}
export interface CompanionProgress{pages:number;quotes:number;memories:number}
export function defaultCompanion():CompanionProfile{return {version:1,revision:0,appearance:'leaf',earned:[],updatedAt:0};}
export function appearanceAvailable(profile:CompanionProfile,id:Appearance){return id==='leaf'||id==='sky'||id==='blossom'&&profile.earned.includes('quote')||id==='star'&&(profile.earned.includes('memory')||profile.earned.includes('thirty'));}
export function validateCompanion(value:unknown):CompanionProfile{
 const p=value as CompanionProfile;
 if(!p||p.version!==1||!Number.isSafeInteger(p.revision)||p.revision<0||!APPEARANCES.some(a=>a.id===p.appearance)||!Number.isFinite(p.updatedAt)||p.updatedAt<0||!Array.isArray(p.earned)||p.earned.length>KEEPSAKES.length||p.earned.some(k=>!KEEPSAKES.some(item=>item.id===k))||new Set(p.earned).size!==p.earned.length)throw new Error('小拾资料格式无效，请保留备份后核对。');
 if(!appearanceAvailable(p,p.appearance))throw new Error('小拾装扮缺少对应纪念，请核对备份。');
 return {version:1,revision:p.revision,appearance:p.appearance,earned:[...p.earned],updatedAt:p.updatedAt};
}
export function advanceCompanion(profile:CompanionProfile,progress:CompanionProgress):CompanionProfile{
 validateCompanion(profile);if(Object.values(progress).some(n=>!Number.isSafeInteger(n)||n<0))throw new Error('小拾进度无效。');
 const earned=new Set(profile.earned);
 if(progress.pages>0)earned.add('page');if(progress.quotes>0)earned.add('quote');if(progress.memories>0)earned.add('memory');if(progress.pages>=10)earned.add('ten');if(progress.pages>=30)earned.add('thirty');
 if(earned.size===profile.earned.length)return profile;
 return {...profile,earned:KEEPSAKES.map(k=>k.id).filter(id=>earned.has(id)),revision:profile.revision+1,updatedAt:Date.now()};
}
export function progressFromRecords(entries:JournalEntry[],memories:MemoryAlbum[]):CompanionProgress{
 const saved=entries.map(validateEntry).filter(e=>e.revision>0&&!e.trashedAt&&(e.text.trim()||e.assetIds.length));
 return {pages:saved.length,quotes:saved.reduce((n,e)=>n+(e.quotes?.length||0),0),memories:memories.map(validateMemory).filter(m=>m.revision>0&&!m.trashedAt).length};
}
export function mergeCompanion(current:CompanionProfile,incoming:CompanionProfile):CompanionProfile{
 const local=validateCompanion(current),restored=validateCompanion(incoming),earned=new Set([...local.earned,...restored.earned]);
 return validateCompanion({...local,appearance:local.revision?local.appearance:restored.appearance,earned:KEEPSAKES.map(k=>k.id).filter(id=>earned.has(id)),revision:local.revision+1,updatedAt:Date.now()});
}
