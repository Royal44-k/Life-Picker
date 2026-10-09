import type {Story} from './model.ts';
import {validateStory} from './backup.ts';
export interface StoryHistoryEntry {id:string;savedAt:number;reason:string;story:Story}
export interface StoryHistoryRow {id:string;kind:'story-history';storyId:string;entries:StoryHistoryEntry[]}
export const historyKey=(id:string)=>'story-history:'+id;
export function readHistory(value:unknown,id:string):StoryHistoryRow{
 if(value===undefined)return {id:historyKey(id),kind:'story-history',storyId:id,entries:[]};
 const row=value as StoryHistoryRow;
 if(!row||row.id!==historyKey(id)||row.storyId!==id||row.kind!=='story-history'||!Array.isArray(row.entries)||row.entries.length>30)throw new Error('作品历史损坏，请先备份当前作品；未覆盖已有数据。');
 const seen=new Set<string>();
 for(const entry of row.entries){
  if(!entry||typeof entry.id!=='string'||seen.has(entry.id)||!Number.isFinite(entry.savedAt)||typeof entry.reason!=='string'||entry.reason.length>100||validateStory(entry.story).id!==id)throw new Error('作品历史损坏，请先备份当前作品；未覆盖已有数据。');
  seen.add(entry.id);
 }
 return structuredClone(row);
}
function structure(s:Story){return JSON.stringify([s.options,s.settings,s.pages.map(p=>[p.id,p.role,p.assetId,p.template,p.diagram,p.locked]),s.series]);}
export function archiveHistory(row:StoryHistoryRow,old:Story|undefined,next:Story,force=false,now=Date.now()):StoryHistoryRow{
 if(!old)return row;
 const structural=structure(old)!==structure(next),last=row.entries.at(-1);
 if(last&&!force&&!structural&&now-last.savedAt<120000)return row;
 return rememberHistory(row,old,force?'操作前版本':structural?'调整前版本':'自动保留',now);
}
export function rememberHistory(row:StoryHistoryRow,story:Story,reason='手动保留',now=Date.now()):StoryHistoryRow{
 const id=story.id+':'+story.revision;if(row.entries.some(e=>e.id===id))return row;
 return {...row,entries:[...row.entries.slice(-29),{id,savedAt:now,reason,story:structuredClone(story)}]};
}
export function historyPhotos(rows:unknown[]):{assetId:string;id:string;title:string}[]{
 return rows.flatMap(value=>{
  const row=value as StoryHistoryRow;if(typeof row?.id!=='string'||!row.id.startsWith('story-history:'))return [];
  const valid=readHistory(row,row.id.slice('story-history:'.length));
  const ids=new Set(valid.entries.flatMap(e=>e.story.pages.flatMap(p=>p.assetId?[p.assetId]:[])));
  return [...ids].map(assetId=>({assetId,id:row.id,title:'历史版本 · '+(valid.entries.at(-1)?.story.title||'作品')}));
 });
}
