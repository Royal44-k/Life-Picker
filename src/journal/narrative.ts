import type {MemoryAlbum} from './model.ts';import {hashText} from '../studio/planner.ts';import {parseNarrativeDraft} from './narrative-schema.mjs';import type {NarrativeDraft} from './narrative-schema.mjs';
export interface MemoryNarrativeData{version:1;basis:string;connections:{entryId:string;text:string}[];closing:string;reviewed:boolean;origin:'manual'|'ai';model?:string}
export interface NarrativeProposal{revision:string;draft:NarrativeDraft;reviewed:boolean;origin:'manual'|'ai';model?:string}
export function memoryBasis(album:MemoryAlbum){return hashText(JSON.stringify([album.title,album.items]));}
export function narrativeVersion(album:MemoryAlbum){return hashText(JSON.stringify([album.id,album.title,album.intro||'',album.items,album.narrative]));}
export function narrativeState(album:MemoryAlbum):'none'|'current'|'stale'|'unreviewed'{return !album.narrative?'none':album.narrative.basis!==memoryBasis(album)?'stale':!album.narrative.reviewed?'unreviewed':'current';}
export function validateNarrative(value:unknown,ids:string[]):MemoryNarrativeData{
 const n=value as MemoryNarrativeData;if(!n||typeof n!=='object'||Object.keys(n).some(k=>!['version','basis','connections','closing','reviewed','origin','model'].includes(k))||n.version!==1||typeof n.basis!=='string'||!/^[a-z0-9]{1,20}$/.test(n.basis)||typeof n.reviewed!=='boolean'||!['manual','ai'].includes(n.origin)||n.model!==undefined&&(typeof n.model!=='string'||!n.model||n.model.length>100))throw Error('回忆串联文字格式无效。');
 parseNarrativeDraft({opening:'',connections:n.connections,closing:n.closing},ids);return structuredClone(n);
}
export function initialNarrativeDraft(album:MemoryAlbum):NarrativeDraft{return {opening:album.intro||'',connections:album.items.map(i=>({entryId:i.entryId,text:album.narrative?.connections.find(c=>c.entryId===i.entryId)?.text||''})),closing:album.narrative?.closing||''};}
export function applyMemoryNarrative(album:MemoryAlbum,proposal:NarrativeProposal):MemoryAlbum{
 if(proposal.revision!==narrativeVersion(album))throw Error('本册文字或选材已变化，旧串联建议不会覆盖当前版本。');if(!proposal.reviewed)throw Error('请先核对串联文字与本册经历、数字和感受是否相符。');
 if(!['manual','ai'].includes(proposal.origin))throw Error('串联文字来源无效。');const draft=parseNarrativeDraft(proposal.draft,album.items.map(i=>i.entryId));
 if(![draft.opening,draft.closing,...draft.connections.map(c=>c.text)].some(s=>s.trim()))throw Error('请先写一点开场、过渡或结尾。');
 if(album.items.reduce((n,i)=>n+i.text.length,0)+draft.opening.length+draft.closing.length+draft.connections.reduce((n,c)=>n+c.text.length,0)>16000)throw Error('本册连同串联文字超过 16,000 字符，请精简或拆册。');
 const narrative=validateNarrative({version:1,basis:memoryBasis(album),connections:draft.connections,closing:draft.closing,reviewed:true,origin:proposal.origin,...(proposal.model?{model:proposal.model}:{})},album.items.map(i=>i.entryId));
 return {...album,intro:draft.opening,narrative};
}
export function reconcileNarrative(album:MemoryAlbum):MemoryAlbum{
 if(!album.narrative)return album;const n=album.narrative;return {...album,narrative:{...n,connections:album.items.map(i=>({entryId:i.entryId,text:n.connections.find(c=>c.entryId===i.entryId)?.text||''})),reviewed:n.reviewed&&n.basis===memoryBasis(album)}};
}
export function confirmMemoryNarrative(album:MemoryAlbum):MemoryAlbum{
 if(!album.narrative)return album;const next=reconcileNarrative(album);return {...next,narrative:{...next.narrative!,basis:memoryBasis(next),reviewed:true}};
}
