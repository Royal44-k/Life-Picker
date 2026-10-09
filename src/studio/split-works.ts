import type {Story,StoryPage} from './model.ts';
import type {MeasureText} from '../core/types.ts';
import {layoutStory,roughMeasure} from './scene.ts';
import {hashText} from './planner.ts';
import {makeId} from '../core/storage.ts';
import {indexSource,sourceReferences} from './content.ts';
import {validateStory} from './backup.ts';
export interface SplitWorkPlan {drafts:Story[];counts:number[];notes:string[]}
function partSource(pages:StoryPage[]){
 let source='';const ranges:{start:number;end:number}[]=[];
 for(const page of pages){
  if(source)source+='\n\n---\n\n';
  const fence=String.fromCharCode(96).repeat(3),prefix=page.codeContinuation?fence+'\n':'';
  const text=prefix+page.source;const start=source.length+prefix.length;
  source+=text;ranges.push({start,end:source.length});
  if(text.split('\n').filter(line=>/^\s*\x60\x60\x60/.test(line)).length%2)source+='\n'+fence;
 }
 return {source,ranges};
}
export function splitWorkPlan(story:Story,maxPages:6|9,measure:MeasureText=roughMeasure):SplitWorkPlan{
 if(maxPages!==6&&maxPages!==9)throw new Error('请选择每篇 6 或 9 张图片。');
 if(hashText(story.source)!==story.sourceHash||story.pages.some(p=>p.sourceRanges?.length&&p.sourceVersion!==story.sourceHash&&!p.retainedFromPrevious))throw new Error('请先核对原文更新，再拆成多篇。');
 if(!story.pages.length)throw new Error('请先生成分镜。');
 const pages=story.pages.filter(p=>!p.tocEntries),groups:{pages:StoryPage[];count:number}[]=[];
 if(!pages.length)throw new Error('没有可拆分的正文或手工页面。');
 for(const page of pages){
  let count:number;
  try{count=layoutStory({...story,pages:[page],settings:{...story.settings,target:0}},measure).length;}catch{throw new Error('部分分镜过长，请先拆为续页，再拆成多篇。');}
  if(count>maxPages)throw new Error('第 '+(story.pages.indexOf(page)+1)+' 个分镜需要 '+count+' 张图片，请先在编辑页中“拆为续页”。');
  const previous=groups.at(-1);
  if(previous&&previous.count+count<=maxPages&&previous.pages.at(-1)!.sourceIds.some(id=>page.sourceIds.includes(id))){previous.pages.push(page);previous.count+=count;}
  else groups.push({pages:[page],count});
 }
 const chunks:StoryPage[][]=[];let chunk:StoryPage[]=[],used=0;
 for(const group of groups){if(used+group.count>maxPages&&chunk.length){chunks.push(chunk);chunk=[];used=0;}chunk.push(...group.pages);used+=group.count;}
 if(chunk.length)chunks.push(chunk);
 if(chunks.length>10)throw new Error('本次会超过 10 篇，请先缩小拆分范围或选择 9 张。');
 const drafts=chunks.map((items,i)=>{
  const {source,ranges}=partSource(items),index=indexSource(source),version=hashText(source);
  const pages=items.map((p,j)=>{
   const references=sourceReferences(index,ranges[j].start,ranges[j].end);
   return {...structuredClone(p),id:makeId(),retainedFromPrevious:undefined,tocEntries:undefined,sourceRanges:references,sourceIds:[...new Set(references.map(r=>r.blockId))],sourceVersion:version};
  });
  const next:Story={version:2,id:makeId(),revision:0,title:story.title.slice(0,82)+'（'+(i+1)+'/'+chunks.length+'）',source,compiledSource:source,sourceHash:version,options:{...story.options},
   settings:{...story.settings,target:maxPages,cover:pages.some(p=>p.role==='cover'),toc:'no',ending:pages.some(p=>p.role==='ending')?story.settings.ending:'none'},
   pages,warnings:story.warnings.filter(w=>!/^完整内容需要.*超过目标/.test(w)),updatedAt:Date.now(),series:story.series,inspiration:story.inspiration,aiReviewed:story.aiReviewed,
   splitFrom:{id:story.id,revision:story.revision,part:i+1,total:chunks.length}};
  return validateStory(next);
 });
 const counts=drafts.map(d=>layoutStory(d,measure).length);
 if(counts.some(n=>n>maxPages))throw new Error('拆篇后的实际排版超过目标，请先整理过长的分镜。');
 return {drafts,counts,notes:['按已确认分镜顺序拆篇，原作品保留；不改写文字，不自动补封面。',...(story.pages.some(p=>p.tocEntries)?['整篇自动目录不带入短篇，避免指向别篇；手写导读会保留。']:[])]};
}
