import {safeSourceLink} from './credit.ts';
export interface SelectedRecordRef{id:string;revision:number;date:string}
export interface InspirationOrigin{version:1;source:{id:string;revision:number;title:string;url:string;author:string;checkedAt:number};records:SelectedRecordRef[];model:string;generatedAt:number}
export interface InspirationProposal{ideas:{title:string;angle:string;recordIds:string[]}[];draft:{title:string;sections:{heading:string;text:string;recordIds:string[]}[]};questions:string[]}
export interface InspirationResult extends Omit<InspirationOrigin,'version'>{proposal:InspirationProposal}
const idOK=(v:unknown)=>typeof v==='string'&&/^[\w:-]{1,100}$/.test(v);
const dateOK=(v:unknown)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;};
export function validateInspirationOrigin(value:unknown):InspirationOrigin{
 const o=value as InspirationOrigin,s=o?.source;
 if(!o||o.version!==1||!s||!idOK(s.id)||!Number.isSafeInteger(s.revision)||s.revision<1||typeof s.title!=='string'||!s.title.trim()||s.title.length>120||!safeSourceLink(s.url)||typeof s.author!=='string'||s.author.length>100||!Number.isSafeInteger(s.checkedAt)||s.checkedAt<0||typeof o.model!=='string'||!o.model.trim()||o.model.length>100||!Number.isSafeInteger(o.generatedAt)||o.generatedAt<0||!Array.isArray(o.records)||!o.records.length||o.records.length>3||new Set(o.records.map(r=>r?.id)).size!==o.records.length||o.records.some(r=>!r||!idOK(r.id)||!Number.isSafeInteger(r.revision)||r.revision<1||!dateOK(r.date)))throw new Error('创作来源或选材修订无效，请核对作品备份。');
 return {version:1,source:{id:s.id,revision:s.revision,title:s.title,url:s.url,author:s.author,checkedAt:s.checkedAt},records:o.records.map(r=>({id:r.id,revision:r.revision,date:r.date})),model:o.model,generatedAt:o.generatedAt};
}
export const proposalText=(p:InspirationProposal)=>'# '+p.draft.title+'\n\n'+p.draft.sections.map(s=>'## '+s.heading+'\n\n'+s.text).join('\n\n');
