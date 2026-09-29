import type { Story, StorySettings, StoryPage } from './model.ts';
import type { CardOptions, MeasureText } from '../core/types.ts';
import { documentTitle } from '../core/markdown.ts';
import { makeId } from '../core/storage.ts';
import { contentHeight, pageCapacity, roughMeasure } from './scene.ts';
export function hashText(s:string){let n=2166136261;for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619);return (n>>>0).toString(36);}
export function newPage(source:string,role:StoryPage['role']='body',sourceIds:string[]=[]):StoryPage{return {id:makeId(),role,source,sourceIds,locked:false,diagram:'none',fit:'cover',focusX:.5,focusY:.5,layout:'plain'};}
function regions(source:string):string[]{
  const out:string[]=[];let lines:string[]=[];let code=false;
  for(const line of source.replace(/\r\n?/g,'\n').split('\n')){
    if(/^\s*~~~/.test(line)||/^\s*```/.test(line))code=!code;
    if(!code&&/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)){if(lines.join('\n').trim())out.push(lines.join('\n').trim());lines=[];}
    else {if(!code&&/^#{2,6}\s+/.test(line)&&lines.join('\n').trim()){out.push(lines.join('\n').trim());lines=[];}lines.push(line);}
  }
  if(lines.join('\n').trim())out.push(lines.join('\n').trim());return out;
}
export function splitContent(source:string,options:CardOptions,measure:MeasureText=roughMeasure):string[]{
  const capacity=pageCapacity(options);const out:string[]=[];
  for(const region of regions(source)){
    let rest=region;let continued=false;
    const measured=(s:string)=>contentHeight((continued?'```\n':'')+s,options,measure);
    while(rest){
      if(measured(rest)<=capacity){out.push(rest);break;}
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
    const headings=[...source.matchAll(/^##\s+(.+)$/gm)].map(m=>m[1]);
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
  const locked=s.pages.map((p,i)=>({p,i})).filter(({p})=>p.locked);
  for(const {p,i}of locked){const same=next.pages.findIndex(n=>n.role===p.role&&n.source===p.source);if(same>=0)next.pages.splice(same,1);next.pages.splice(Math.min(i,next.pages.length),0,p);}
  if(locked.length)next.warnings.push('锁定页已保留；新编排内容完整保留，请检查是否存在重复页。');
  if(next.pages.length>60)throw new Error('保留锁定页后超过 60 页，请先整理作品。');
  return {...next,id:s.id,revision:s.revision};
}
