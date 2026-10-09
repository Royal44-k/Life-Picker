import type { Story, StorySettings, StoryPage } from './model.ts';
import type { CardOptions, MeasureText } from '../core/types.ts';
import { documentTitle, parseMarkdown } from '../core/markdown.ts';
import { makeId } from '../core/storage.ts';
import { roughMeasure } from './scene.ts';
import {paginateSource} from './pagination.ts';
import {indexSource} from './content.ts';
export function hashText(s:string){let n=2166136261;for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619);return (n>>>0).toString(36);}
export function newPage(source:string,role:StoryPage['role']='body',sourceIds:string[]=[]):StoryPage{return {id:makeId(),role,source,sourceIds,locked:false,diagram:'none',fit:'cover',focusX:.5,focusY:.5,layout:'plain'};}
export function splitContent(source:string,options:CardOptions,measure:MeasureText=roughMeasure,initialCode=false):string[]{
 return paginateSource(source,options,measure,initialCode).map(p=>p.text);
}
export function planStory(source:string,options:CardOptions,settings:StorySettings,measure:MeasureText=roughMeasure):Story{
  if(source.length>20000)throw new Error('每篇最多 20,000 字符。');
  const title=documentTitle(source);const pages:StoryPage[]=[];const warnings:string[]=[];
  if(source.trim()){
    if(settings.cover)pages.push(newPage(title,'cover',['title']));
    const parts=paginateSource(source,options,measure);
    for(const part of parts){
      const page=newPage(part.text,'body',[...new Set(part.references.map(r=>r.blockId))]);
      page.codeContinuation=part.codeContinuation;page.sourceRanges=part.references;page.sourceVersion=hashText(source);pages.push(page);
    }
    const headings=indexSource(source).headings.filter(b=>b.level===2);
    if(settings.toc==='yes'||(settings.toc!=='no'&&headings.length>=4&&pages.length>=8)){
      if(headings.length){
        const toc=newPage('## 这一篇，慢慢读\n\n'+headings.map((h,i)=>(i+1)+'. '+h.label).join('\n'),'toc',headings.map(h=>h.id));
        toc.tocEntries=headings.flatMap(h=>{const target=pages.find(p=>p.role==='body'&&p.sourceRanges?.some(r=>r.blockId===h.id&&r.start<=h.start));return target?[{label:h.label,targetPageId:target.id,occurrence:headings.filter(other=>other.label===h.label&&other.start<h.start&&target.sourceIds.includes(other.id)).length}]:[];});
        toc.sourceVersion=hashText(source);pages.splice(settings.cover?1:0,0,toc);
      }
    }
    if(settings.ending!=='none')pages.push(newPage(settings.ending==='question'?'## 也想听听你的经历\n\n你会怎样做？':settings.ending==='collect'?'## 留给下次的自己\n\n收藏这一页，需要时再翻回来。':'## 下次，继续分享\n\n'+(options.author||'欢迎关注')+'\n\n一起积累真实的经验。','ending'));
    if(settings.target&&pages.length>settings.target)warnings.push('完整内容需要 '+pages.length+' 页，超过目标 '+settings.target+' 页。可保留全部、拆为系列，或预览 AI 精简建议。');
    if(pages.length>60)throw new Error('超过 60 页，请拆成多篇作品。');
  }
  return {version:2,id:makeId(),revision:0,source,compiledSource:source,sourceHash:hashText(source),title,options:{...options},settings:{...settings},pages,warnings,updatedAt:Date.now()};
}
export function editPage(s:Story,id:string,change:Partial<StoryPage>):Story{
  const old=s.pages.find(p=>p.id===id);if(!old)throw new Error('没有找到这一页。');
  if(old.locked&&Object.keys(change).some(k=>k!=='locked'))throw new Error('这一页已锁定，请先解锁。');
  if(change.source&&change.source.length>20000)throw new Error('单页内容过长。');
  return {...s,pages:s.pages.map(p=>p.id===id?{...p,...change,id:p.id,tocEntries:change.source!==undefined||change.role!==undefined&&change.role!=='toc'?undefined:p.tocEntries}:p),updatedAt:Date.now()};
}
export function movePage(s:Story,id:string,delta:number):Story{
  const pages=[...s.pages];const from=pages.findIndex(p=>p.id===id);if(from<0)return s;
  const to=Math.min(pages.length-1,Math.max(0,from+delta));pages.splice(to,0,pages.splice(from,1)[0]);return {...s,pages,updatedAt:Date.now()};
}
function matchOriginalPage(page:StoryPage,candidates:StoryPage[]):StoryPage|undefined{
 const exact=candidates.find(old=>old.role===page.role&&old.source===page.source);
 if(exact)return exact;
 if(page.role==='cover')return candidates.find(old=>old.role==='cover');
 const scores=candidates.filter(old=>old.role===page.role).map(old=>{
  const shared=old.sourceIds.filter(id=>id.startsWith('block:')&&page.sourceIds.includes(id)).length;
  const semantic=shared/Math.max(1,old.sourceIds.length,page.sourceIds.length);
  const contained=old.source.trim()&&page.source.includes(old.source.trim())?old.source.trim().length/Math.max(1,page.source.length):0;
  return {old,score:Math.max(semantic,contained)};
 }).filter(x=>x.score>=.55).sort((a,b)=>b.score-a.score);
 return scores[0]&&(!scores[1]||scores[0].score>scores[1].score)?scores[0].old:undefined;
}

export function rebuildStory(s:Story,source:string,measure:MeasureText=roughMeasure):Story{
  const next=planStory(source,s.options,s.settings,measure);
  const used=new Set<string>(),remapped=new Map<string,string>();
  next.pages=next.pages.map(p=>{
    const old=matchOriginalPage(p,s.pages.filter(old=>!old.locked&&!used.has(old.id)));
    if(!old)return p;used.add(old.id);remapped.set(p.id,old.id);if(old.assetId&&old.source!==p.source)next.warnings.push('已根据对应来源保留照片，请核对图文对应。');
    return {...p,id:old.id,assetId:old.assetId,fit:old.fit,focusX:old.focusX,focusY:old.focusY,diagram:old.diagram,layout:old.layout,template:old.template};
  });
  const changedPhotos=s.pages.filter(p=>p.assetId&&!p.locked&&!used.has(p.id));
  if(changedPhotos.length)next.warnings.push(changedPhotos.length+' 个含照片页面的内容结构已变化，照片仍在素材库，请重新选择搭配。');
  const locked=s.pages.map((p,i)=>({p,i})).filter(({p})=>p.locked);
  for(const {p,i}of locked){const same=next.pages.findIndex(n=>n.role===p.role&&n.source===p.source);if(same>=0){remapped.set(next.pages[same].id,p.id);next.pages.splice(same,1);}next.pages.splice(Math.min(i,next.pages.length),0,p);}
  next.pages=next.pages.map(p=>({...p,tocEntries:p.tocEntries?.map(e=>{let id=e.targetPageId;const seen=new Set<string>();while(remapped.has(id)&&!seen.has(id)){seen.add(id);id=remapped.get(id)!;}return {...e,targetPageId:id};})}));
  if(locked.length)next.warnings.push('锁定页已保留；新编排内容完整保留，请检查是否存在重复页。');
  if(next.pages.length>60)throw new Error('保留锁定页后超过 60 页，请先整理作品。');
  return {...next,id:s.id,revision:s.revision};
}
// AI source excerpts are independent of printable page capacity.
export function sourceBlocks(source:string):{id:string;text:string}[]{
 if(source.length>20000)throw new Error('每篇最多 20,000 字符。');
 const out:{id:string;text:string}[]=[];let current='';let offset=0;
 const flush=()=>{if(current){out.push({id:'source:'+offset+':'+hashText(current),text:current});offset+=current.length;current='';}};
 for(const part of new Intl.Segmenter('zh-CN',{granularity:'grapheme'}).segment(source)){
  if(current.length+part.segment.length>1200)flush();current+=part.segment;
  if(current.length>=700&&current.endsWith('\n\n'))flush();
 }
 flush();return out;
}

export function splitPage(story:Story,id:string,measure:MeasureText=roughMeasure):Story{
 const page=story.pages.find(p=>p.id===id);if(!page)throw new Error('没有找到这一页。');
 if(page.locked)throw new Error('这一页已锁定，请先解锁。');
 if(page.tocEntries)throw new Error('自动目录会按实际页数续页，无需手工拆分。');
 const chunks=splitContent(page.source,story.options,measure,page.codeContinuation);
 if(chunks.length<2)return story;
 let inCode=!!page.codeContinuation;
 const parts=chunks.map((source,i)=>{
  const part=i===0?{...page,source}:newPage(source,'body',page.sourceIds);
  part.template=page.template;part.sourceVersion=page.sourceVersion;part.sourceRanges=page.sourceRanges;part.codeContinuation=inCode;
  if([...source.matchAll(/^\s*```/gm)].length%2)inCode=!inCode;
  return part;
 });
 const pages=[...story.pages];pages.splice(pages.findIndex(p=>p.id===id),1,...parts);
 if(pages.length>60)throw new Error('拆分后超过 60 页。');
 return relinkDirectory(story,[page.id],parts,pages);
}


function relinkDirectory(story:Story,oldIds:string[],replacement:StoryPage[],pages:StoryPage[]):Story{
 const original=story.pages.filter(p=>oldIds.includes(p.id));
 const headings=(p:StoryPage,label:string)=>parseMarkdown((p.codeContinuation?'```\n':'')+p.source).filter(b=>b.kind==='heading'&&b.level===2&&b.text===label);
 return {...story,pages:pages.map(p=>({...p,tocEntries:p.tocEntries?.map(entry=>{
  if(!oldIds.includes(entry.targetPageId))return entry;
  const at=original.findIndex(p=>p.id===entry.targetPageId);
  const occurrence=original.slice(0,at).reduce((n,p)=>n+headings(p,entry.label).length,0)+(entry.occurrence||0);
  const targets=replacement.flatMap(p=>headings(p,entry.label).map((_,i)=>({page:p.id,occurrence:i})));
  const target=targets[occurrence]||{page:replacement[0].id,occurrence:0};
  return {...entry,targetPageId:target.page,occurrence:target.occurrence};
 })})),updatedAt:Date.now()};
}
export function mergePage(story:Story,id:string):Story{
 const pos=story.pages.findIndex(p=>p.id===id),page=story.pages[pos],next=story.pages[pos+1];
 if(!page||!next)throw new Error('没有可合并的下一页。');
 if(page.locked||next.locked)throw new Error('页面已锁定，请先解锁。');
 if(page.tocEntries||next.tocEntries)throw new Error('自动目录会自行续页；先改为手工导读，再合并。');
 if(page.assetId&&next.assetId)throw new Error('两页都含照片，请先选择要保留的照片。');
 const source=page.source+(next.codeContinuation?'':'\n\n')+next.source;
 if(source.length>20000)throw new Error('合并后超过单页 20,000 字符，原页面已保留。');
 const photo=page.assetId?page:next;
 const merged={...page,source,sourceVersion:page.sourceVersion===next.sourceVersion?page.sourceVersion:undefined,assetId:photo.assetId,fit:photo.fit,focusX:photo.focusX,focusY:photo.focusY,
  sourceIds:[...new Set([...page.sourceIds,...next.sourceIds])],sourceRanges:[...(page.sourceRanges||[]),...(next.sourceRanges||[])]};
 const pages=[...story.pages];pages.splice(pos,2,merged);
 return relinkDirectory(story,[page.id,next.id],[merged],pages);
}
