import type {Story,StoryPage} from './model.ts';
import type {MeasureText} from '../core/types.ts';
import {planStory,hashText} from './planner.ts';
import {indexSource} from './content.ts';
import {parseMarkdown} from '../core/markdown.ts';
import {roughMeasure} from './scene.ts';
export type UpdateChoice='keep'|'replace'|'append';
export interface SourceUpdateRow {id:string;status:'unchanged'|'changed'|'added'|'removed'|'review';oldPages:StoryPage[];newPages:StoryPage[];locked:boolean;position:number}
export interface SourceUpdatePlan {fingerprint:string;rows:SourceUpdateRow[];fresh:Story}
const fingerprint=(s:Story)=>hashText(JSON.stringify([s.id,s.source,s.sourceHash,s.pages,s.settings,s.options]));
const content=(p:StoryPage)=>p.role==='body'||p.role==='diagram';
const blocks=(s:string)=>indexSource(s).blocks.filter(b=>b.kind!=='blank'&&b.kind!=='break');
export function buildSourceUpdate(story:Story,measure:MeasureText=roughMeasure):SourceUpdatePlan{
 const fresh=planStory(story.source,story.options,story.settings,measure),rows:SourceUpdateRow[]=[];
 const base=story.compiledSource??(hashText(story.source)===story.sourceHash?story.source:undefined);
 const before=base===undefined?[]:blocks(base),after=blocks(story.source),oldPages=story.pages.filter(content),newPages=fresh.pages.filter(content);
 const oldIds=new Set(before.map(b=>b.id)),newIds=new Set(after.map(b=>b.id));
 const duplicate=(items:ReturnType<typeof blocks>)=>new Set(items.map(b=>b.id.replace(/:\d+$/,''))).size!==items.length;
 const common=after.filter(b=>oldIds.has(b.id)).map(b=>before.findIndex(o=>o.id===b.id));
 const uncertain=base===undefined||hashText(base)!==story.sourceHash||duplicate(before)||duplicate(after)||common.some((n,i)=>i>0&&n<common[i-1])||oldPages.some(p=>!p.sourceRanges?.length||p.sourceIds.some(id=>!oldIds.has(id)));
 const add=(old:StoryPage[],next:StoryPage[],status:SourceUpdateRow['status'],position:number)=>rows.push({id:'update:'+rows.length,status,oldPages:old,newPages:next,locked:old.some(p=>p.locked),position});
 if(uncertain&&oldPages.length)add(oldPages,newPages,'review',story.pages.findIndex(content));
 else{
  const count=oldPages.length+newPages.length,parent=Array.from({length:count},(_,i)=>i);
  const root=(n:number):number=>parent[n]===n?n:(parent[n]=root(parent[n]));
  const join=(ids:number[])=>{for(let i=1;i<ids.length;i++)parent[root(ids[i])]=root(ids[0]);};
  const oldNodes=(id:string)=>oldPages.flatMap((p,i)=>p.sourceIds.includes(id)?[i]:[]);
  const newNodes=(id:string)=>newPages.flatMap((p,i)=>p.sourceIds.includes(id)?[i+oldPages.length]:[]);
  for(const b of before)join([...oldNodes(b.id),...newNodes(b.id)]);
  const anchors=after.flatMap((b,j)=>oldIds.has(b.id)?[{i:before.findIndex(o=>o.id===b.id),j}]:[]);
  let oi=0,ni=0;
  for(const anchor of [...anchors,{i:before.length,j:after.length}]){
   join([...before.slice(oi,anchor.i).flatMap(b=>oldNodes(b.id)),...after.slice(ni,anchor.j).flatMap(b=>newNodes(b.id))]);oi=anchor.i+1;ni=anchor.j+1;
  }
  const groups=new Map<number,{old:StoryPage[];next:StoryPage[]}>();
  for(let i=0;i<count;i++){const key=root(i),g=groups.get(key)||{old:[],next:[]};if(i<oldPages.length)g.old.push(oldPages[i]);else g.next.push(newPages[i-oldPages.length]);groups.set(key,g);}
  for(const g of groups.values()){
   let position=g.old.length?Math.min(...g.old.map(p=>story.pages.indexOf(p))):story.pages.length;
   if(!g.old.length){
    const at=Math.min(...g.next.map(p=>fresh.pages.indexOf(p)));
    
    const following=newPages.filter(p=>fresh.pages.indexOf(p)>at).find(p=>oldPages.some(o=>o.sourceIds.some(id=>p.sourceIds.includes(id))));
    if(following){const o=oldPages.find(o=>o.sourceIds.some(id=>following.sourceIds.includes(id)))!;position=story.pages.indexOf(o)-.5+at/10000;}else position+=at/10000;
   }
   const unchanged=g.old.length>0&&g.old.length===g.next.length&&g.old.every(p=>p.sourceIds.every(id=>newIds.has(id)))&&g.next.every(p=>p.sourceIds.every(id=>oldIds.has(id)));
   add(g.old,g.next,!g.old.length?'added':!g.next.length?'removed':unchanged?'unchanged':'changed',position);
  }
 }
 for(const role of ['cover','toc','ending'] as const){
  const old=story.pages.filter(p=>p.role===role),next=fresh.pages.filter(p=>p.role===role);if(!old.length&&!next.length)continue;
  add(old,next,JSON.stringify(old.map(p=>p.source))===JSON.stringify(next.map(p=>p.source))?'unchanged':!old.length?'added':!next.length?'removed':'changed',old.length?story.pages.indexOf(old[0]):role==='cover'?-2:role==='toc'?-1:story.pages.length+1);
 }
 return {fingerprint:fingerprint(story),rows:rows.sort((a,b)=>a.position-b.position),fresh};
}
function retained(page:StoryPage):StoryPage{
 return {...page,sourceRanges:undefined,sourceIds:[],sourceVersion:undefined,retainedFromPrevious:true};
}
function rebase(page:StoryPage,story:Story):StoryPage{
 const before=story.compiledSource??story.source,old=indexSource(before),next=indexSource(story.source);
 const ranges=page.sourceRanges?.map(r=>{
  const a=old.blocks.find(b=>b.id===r.blockId),b=next.blocks.find(b=>b.id===r.blockId);if(!a||!b)throw new Error('来源对应关系已变化，请重新检查。');
  return {...r,start:b.start+r.start-a.start,end:b.start+r.end-a.start};
 });
 return {...page,sourceRanges:ranges,sourceVersion:ranges?hashText(story.source):page.sourceVersion};
}
export function applySourceUpdate(story:Story,plan:SourceUpdatePlan,choices:Record<string,string>):Story{
 if(fingerprint(story)!==plan.fingerprint)throw new Error('作品或原文已变化，请重新检查更新。');
 const placed:{page:StoryPage;position:number}[]=[];
 const place=(page:StoryPage,position:number)=>placed.push({page,position});
 for(const row of plan.rows){
  if(row.status==='unchanged'){row.oldPages.forEach(p=>place(rebase(p,story),story.pages.indexOf(p)));continue;}
  const choice=choices[row.id];if(!['keep','replace','append'].includes(choice))throw new Error('请为每组受影响页面选择处理方式，再确认更新。');
  if(choice==='replace'&&row.locked)throw new Error('页面已锁定，请先解锁，或明确保留旧页。');
  if(choice==='keep'||choice==='append')row.oldPages.forEach(p=>place(retained(p),story.pages.indexOf(p)));
  if(choice==='replace'||choice==='append'){
   const next=row.newPages.map(p=>{
    const old=choice==='replace'&&row.oldPages.length===1&&row.newPages.length===1?row.oldPages[0]:undefined;
    return old?{...p,id:old.id,assetId:old.assetId,fit:old.fit,focusX:old.focusX,focusY:old.focusY,template:old.template,layout:old.layout,diagram:old.diagram}:p;
   });
   const start=choice==='append'&&row.oldPages.length?Math.max(...row.oldPages.map(p=>story.pages.indexOf(p)))+.25:row.position;
   next.forEach((p,i)=>place(p,choice==='replace'&&row.oldPages.length===next.length?story.pages.indexOf(row.oldPages[i]):start));
  }
 }
 const pages=placed.sort((a,b)=>a.position-b.position).map(item=>item.page);
 if(pages.length>60)throw new Error('确认后超过 60 页，请减少新增内容或分成多篇。');
 // Directory entries derive from the chosen pages, including handwritten headings.
 const tocEntries=pages.filter(content).flatMap(p=>{
  const seen=new Map<string,number>();
  return parseMarkdown((p.codeContinuation?'\x60\x60\x60\n':'')+p.source).filter(b=>b.kind==='heading'&&b.level===2).map(b=>{
   const occurrence=seen.get(b.text)||0;seen.set(b.text,occurrence+1);return {label:b.text,targetPageId:p.id,occurrence};
  });
 });
 const retainedCount=pages.filter(p=>p.retainedFromPrevious).length;
 return {...story,compiledSource:story.source,sourceHash:hashText(story.source),title:plan.fresh.title,pages:pages.map(p=>p.tocEntries?{...p,tocEntries}:p),
 warnings:[...plan.fresh.warnings,...(retainedCount?[retainedCount+' 页已由你确认保留旧表达，与新原文分开。']:[]),...(pages.some(p=>p.assetId)?['已保留对应照片，请核对更新后的图文搭配。']:[])],updatedAt:Date.now()};
}
