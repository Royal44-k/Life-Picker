import {stripLinkCredentials} from '../sources/links.mjs';
import type {CardOptions} from '../core/types.ts';
import {isOptions,makeId} from '../core/storage.ts';
import {DEFAULT_OPTIONS} from '../core/layout.ts';
export const WRITING_TONES=['真诚自然','专业清晰','活泼俏皮','温柔治愈','简洁有力'] as const;
export type WritingTone=typeof WRITING_TONES[number];
export interface SeriesSnapshot{id:string;revision:number;name:string;topic:string;tone:WritingTone}
export interface PersonalSeries extends SeriesSnapshot{version:1;defaults:CardOptions;archived:boolean;createdAt:number;updatedAt:number}
export interface Publication{version:1;url:string|null;date:string|null;observedOn:string|null;metrics:{views:number|null;likes:number|null;favorites:number|null;comments:number|null};reflection:string;nextIdea:string;updatedAt:number}
const idOK=(v:unknown)=>typeof v==='string'&&/^[\w:-]{1,100}$/.test(v);
const textOK=(v:unknown,n:number,required=false)=>typeof v==='string'&&v.length<=n&&(!required||!!v.trim());
const timeOK=(v:unknown)=>Number.isSafeInteger(v)&&(v as number)>=0;
const dateOK=(v:unknown)=>{if(v===null)return true;if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;};
export function validateSeriesSnapshot(value:unknown):SeriesSnapshot{const s=value as SeriesSnapshot;if(!s||!idOK(s.id)||!Number.isSafeInteger(s.revision)||s.revision<1||!textOK(s.name,40,true)||!textOK(s.topic,1000)||!WRITING_TONES.includes(s.tone))throw new Error('系列信息无效，请核对名称、主题与语气。');return {id:s.id,revision:s.revision,name:s.name,topic:s.topic,tone:s.tone};}
export function validateSeries(value:unknown):PersonalSeries{const s=value as PersonalSeries;if(!s||s.version!==1||!Number.isSafeInteger(s.revision)||s.revision<0||!isOptions(s.defaults)||s.defaults.series!==s.name||typeof s.archived!=='boolean'||!timeOK(s.createdAt)||!timeOK(s.updatedAt))throw new Error('系列定义无效，请保留原文件后检查。');return {...validateSeriesSnapshot({...s,revision:Math.max(1,s.revision)}),revision:s.revision,version:1,defaults:{...s.defaults},archived:s.archived,createdAt:s.createdAt,updatedAt:s.updatedAt};}
export function newSeries():PersonalSeries{return {version:1,id:makeId(),revision:0,name:'',topic:'',tone:'真诚自然',defaults:{...DEFAULT_OPTIONS,theme:'forest',author:'',series:''},archived:false,createdAt:Date.now(),updatedAt:Date.now()};}
export function cleanPublicationUrl(value:unknown):string|null{
 if(value===null||value==='')return null;if(typeof value!=='string'||value.length>2048)throw new Error('发布链接过长或格式无效。');let u:URL;try{u=new URL(value);}catch{throw new Error('请填写完整的 http 或 https 发布链接。');}if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new Error('发布链接不支持此协议或包含登录口令。');
 stripLinkCredentials(u);return u.toString();
}
export function validatePublication(value:unknown):Publication{
 const p=value as Publication;if(!p||p.version!==1||!dateOK(p.date)||!dateOK(p.observedOn)||!p.metrics||['views','likes','favorites','comments'].some(k=>{const n=p.metrics[k as keyof Publication['metrics']];return n!==null&&(!Number.isSafeInteger(n)||n<0||n>1_000_000_000_000);})||!textOK(p.reflection,3000)||!textOK(p.nextIdea,1000)||!timeOK(p.updatedAt))throw new Error('发布回看信息无效：日期需真实，互动数为非负整数，未知时请留空。');
 return {version:1,url:cleanPublicationUrl(p.url),date:p.date,observedOn:p.observedOn,metrics:{views:p.metrics.views,likes:p.metrics.likes,favorites:p.metrics.favorites,comments:p.metrics.comments},reflection:p.reflection,nextIdea:p.nextIdea,updatedAt:p.updatedAt};
}
export function emptyPublication():Publication{return {version:1,url:null,date:null,observedOn:null,metrics:{views:null,likes:null,favorites:null,comments:null},reflection:'',nextIdea:'',updatedAt:Date.now()};}
