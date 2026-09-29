import type { Story, StorySettings, StoryPage } from './model.ts';
import type { CardOptions, MeasureText } from '../core/types.ts';
import { documentTitle, parseMarkdown } from '../core/markdown.ts';
import { makeId } from '../core/storage.ts';
import { contentHeight, pageCapacity, roughMeasure } from './scene.ts';
export function hashText(s:string){let n=2166136261;for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619);return (n>>>0).toString(36);}
export function newPage(source:string,role:StoryPage['role']='body',sourceIds:string[]=[]):StoryPage{return {id:makeId(),role,source,sourceIds,locked:false,diagram:'none',fit:'cover',focusX:.5,focusY:.5,layout:'plain'};}
function regions(source:string,initialCode=false):string[]{
  const out:string[]=[];let lines:string[]=[];let code=initialCode;
  for(const line of source.replace(/\r\n?/g,'\n').split('\n')){
    if(/^\s*```/.test(line))code=!code;
    if(!code&&/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)){if(lines.join('\n').trim())out.push(lines.join('\n').trim());lines=[];}
    else {if(!code&&/^#{2,6}\s+/.test(line)&&lines.join('\n').trim()){out.push(lines.join('\n').trim());lines=[];}lines.push(line);}
  }
  if(lines.join('\n').trim())out.push(lines.join('\n').trim());return out;
}
export function splitContent(source:string,options:CardOptions,measure:MeasureText=roughMeasure,initialCode=false):string[]{
  const capacity=pageCapacity(options);const out:string[]=[];let continued=initialCode;
  for(const region of regions(source,initialCode)){
    let rest=region;
    const measured=(s:string)=>contentHeight((continued?'```\n':'')+s,options,measure);
    while(rest){
      if(measured(rest)<=capacity){out.push(rest);if([...rest.matchAll(/^\s*```/gm)].length%2)continued=!continued;break;}
      const segments=Array.from(new Intl.Segmenter('zh-CN',{granularity:'grapheme'}).segment(rest));
      let lo=1,hi=segments.length;
      while(lo<hi){const mid=Math.ceil((lo+hi)/2);const end=mid===segments.length?rest.length:segments[mid].index;
        if(measured(rest.slice(0,end))<=capacity)lo=mid;else hi=mid-1;}
      const maxEnd=lo===segments.length?rest.length:segments[lo].index;let end=maxEnd;
      const before=rest.slice(0,maxEnd);
      const breaks=[...before.matchAll(/\n\n(?=.)/g)].map(m=>m.index!);
      const preferred=breaks.filter(n=>n>maxEnd*.45).at(-1);
      if(preferred)end=preferred;
      else {const sentence=[...before.matchAll(/[。！？!?]\s*/g)].at(-1);if(sentence&&sentence.index!>maxEnd*.65)end=sentence.index!+sentence[0].length;}
      if(end<=0)throw new Error('内容无法分页，请检查字号。');
      const chunk=rest.slice(0,end);out.push(chunk);if([...chunk.matchAll(/^\s*```/gm)].length%2)continued=!continued;rest=rest.slice(end);
      if(preferred)rest=rest.replace(/^\n\n/,'');
      if(out.length>60)throw new Error('超过 60 页，请拆成多篇作品。');
    }
  }
  return out;
}
export function planStory(source:string,options:CardOptions,settings:StorySettings,measure:MeasureText=roughMeasure):Story{
  if(source.length>20000)throw new Error('每篇最多 20,000 字符。');
  const title=documentTitle(source);const pages:StoryPage[]=[];const warnings:string[]=[];
  if(source.trim()){
    if(settings.cover)pages.push(newPage(title,'cover',['title']));
    const parts=splitContent(source,options,measure);
    let inCode=false;
    for(let i=0;i<parts.length;i++){const page=newPage(parts[i],'body',[i+':'+hashText(parts[i])]);page.codeContinuation=inCode;pages.push(page);if([...parts[i].matchAll(/^\s*```/gm)].length%2)inCode=!inCode;}
    const headings=parseMarkdown(source).filter(b=>b.kind==='heading'&&b.level===2).map(b=>b.text);
    if(settings.toc==='yes'||(settings.toc!=='no'&&headings.length>=4&&pages.length>=8)){
      if(headings.length)pages.splice(settings.cover?1:0,0,newPage('## 这一篇，慢慢读\n\n'+headings.map((t,i)=>(i+1)+'. '+t).join('\n'),'toc',['headings']));
    }
    if(settings.ending!=='none')pages.push(newPage(settings.ending==='question'?'## 也想听听你的经历\n\n你会怎样做？':settings.ending==='collect'?'## 留给下次的自己\n\n收藏这一页，需要时再翻回来。':'## 下次，继续分享\n\n'+(options.author||'欢迎关注')+'\n\n一起积累真实的经验。','ending'));
    if(settings.target&&pages.length>settings.target)warnings.push('完整内容需要 '+pages.length+' 页，超过目标 '+settings.target+' 页。可保留全部、拆为系列，或预览 AI 精简建议。');
    if(pages.length>60)throw new Error('超过 60 页，请拆成多篇作品。');
  }
  return {version:2,id:makeId(),revision:0,source,sourceHash:hashText(source),title,options:{...options},settings:{...settings},pages,warnings,updatedAt:Date.now()};
}
export function editPage(s:Story,id:string,change:Partial<StoryPage>):Story{
  const old=s.pages.find(p=>p.id===id);if(!old)throw new Error('没有找到这一页。');
  if(old.locked&&Object.keys(change).some(k=>k!=='locked'))throw new Error('这一页已锁定，请先解锁。');
  if(change.source&&change.source.length>20000)throw new Error('单页内容过长。');
  return {...s,pages:s.pages.map(p=>p.id===id?{...p,...change,id:p.id}:p),updatedAt:Date.now()};
}
export function movePage(s:Story,id:string,delta:number):Story{
  const pages=[...s.pages];const from=pages.findIndex(p=>p.id===id);if(from<0)return s;
  const to=Math.min(pages.length-1,Math.max(0,from+delta));pages.splice(to,0,pages.splice(from,1)[0]);return {...s,pages,updatedAt:Date.now()};
}
export function rebuildStory(s:Story,source:string,measure:MeasureText=roughMeasure):Story{
  const next=planStory(source,s.options,s.settings,measure);
  const used=new Set<string>();
  next.pages=next.pages.map(p=>{
    const old=s.pages.find(old=>!old.locked&&!used.has(old.id)&&old.role===p.role&&(old.source===p.source||p.role==='cover'));
    if(!old)return p;used.add(old.id);
    return {...p,id:old.id,assetId:old.assetId,fit:old.fit,focusX:old.focusX,focusY:old.focusY,diagram:old.diagram,layout:old.layout};
  });
  const changedPhotos=s.pages.filter(p=>p.assetId&&!p.locked&&!used.has(p.id));
  if(changedPhotos.length)next.warnings.push(changedPhotos.length+' 个含照片页面的内容结构已变化，照片仍在素材库，请重新选择搭配。');
  const locked=s.pages.map((p,i)=>({p,i})).filter(({p})=>p.locked);
  for(const {p,i}of locked){const same=next.pages.findIndex(n=>n.role===p.role&&n.source===p.source);if(same>=0)next.pages.splice(same,1);next.pages.splice(Math.min(i,next.pages.length),0,p);}
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
 const chunks=splitContent(page.source,story.options,measure,page.codeContinuation);
 if(chunks.length<2)return story;
 let inCode=!!page.codeContinuation;
 const parts=chunks.map((source,i)=>{
  const part=i===0?{...page,source}:newPage(source,'body',page.sourceIds);
  part.codeContinuation=inCode;
  if([...source.matchAll(/^\s*```/gm)].length%2)inCode=!inCode;
  return part;
 });
 const pages=[...story.pages];pages.splice(pages.findIndex(p=>p.id===id),1,...parts);
 if(pages.length>60)throw new Error('拆分后超过 60 页。');
 return {...story,pages,updatedAt:Date.now()};
}
