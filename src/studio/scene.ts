import type { Story, Scene, StoryPage, SceneLine } from './model.ts';
import type { MeasureText, CardOptions, CardLine } from '../core/types.ts';
import { parseMarkdown } from '../core/markdown.ts';
import { HEIGHTS, wrapText } from '../core/layout.ts';
import {templateLayout} from './template-layout.ts';
import {templateDecorate} from './templates.ts';
import {templateContract} from './template-contracts.ts';
import {fitProse} from './template-fit.ts';
export const roughMeasure:MeasureText=(s,size)=>Array.from(s).reduce((v,c)=>v+(/[\x00-\xff]/.test(c)?size*.57:size),0);
export function textLines(source:string,options:CardOptions,measure:MeasureText,width=904,cover=false,limits?:{min:number;max:number}):SceneLine[]{
  const lines:SceneLine[]=[];let y=0;
  for(const block of parseMarkdown(source)){
    if(block.kind==='break')continue;
    const heading=block.kind==='heading';
    const base=cover?76:heading?(block.level===1?58:48):block.kind==='code'?36:40;
    const size=Math.max(limits?.min||36,Math.min(!heading&&!cover?limits?.max||Infinity:Infinity,Math.round(base*options.fontScale)));
    const lineHeight=Math.ceil(size*(heading||cover?1.38:1.65));
    const weight=heading||cover||block.emphasis?700:400;
    const indent=block.kind==='list'||block.kind==='quote'?38:0;
    wrapText(block.text,width-indent-size,size,measure,weight,block.kind).forEach((text,i)=>{
      lines.push({headingAnchor:heading&&i===0?{label:block.text,level:block.level||1}:undefined,text,x:88+indent,y,size,lineHeight,kind:block.kind,weight,marker:i===0?block.marker:undefined,emphasis:block.emphasis});y+=lineHeight;
    });
    y+=heading?24:28;
  }
  return lines;
}
export function contentHeight(source:string,options:CardOptions,measure:MeasureText):number{
  const lines=textLines(source,options,measure);return lines.length?lines.at(-1)!.y+lines.at(-1)!.lineHeight:0;
}
export function pageCapacity(options:CardOptions){return HEIGHTS[options.ratio]-340;}
function diagramScene(page:StoryPage,story:Story,measure:MeasureText,base:Scene):Scene|null{
  const blocks=parseMarkdown(page.source).filter(b=>b.text.trim()&&b.kind!=='break');
  const heading=blocks[0]?.kind==='heading'?blocks.shift()!.text:'';
  const items=blocks.map(b=>b.text);
  const min=page.diagram==='pyramid'?3:2;const max=page.diagram==='pyramid'?5:6;
  if(items.length<min||items.length>max){base.warnings.push('此图解需要 '+min+'～'+max+' 项，当前以文字完整显示。');return null;}
  const titleLines=textLines(heading?'## '+heading:'',story.options,measure);
  const start=190+(titleLines.at(-1)?.y||0)+(titleLines.at(-1)?.lineHeight||0)+30;
  const rows=page.diagram==='compare'?Math.ceil(items.length/2):items.length;
  const slot=(base.height-155-start)/rows;
  const out:CardLine[]=[];const shapes:Scene['shapes']=[];
  if(heading)out.push(...titleLines.map(l=>({...l,y:l.y+190})));
  for(let i=0;i<items.length;i++){
    const y=start+(page.diagram==='compare'?Math.floor(i/2):i)*slot;
    const w=page.diagram==='pyramid'?Math.round(400+(460*i/(items.length-1))):page.diagram==='compare'?424:844;
    const x=page.diagram==='compare'?(i%2===0?88:568):(1080-w)/2;const size=Math.max(36,Math.round(40*story.options.fontScale));
    const texts=wrapText(items[i],w-110-size,size,measure,500);const lh=Math.ceil(size*1.5);
    if(texts.length*lh>slot-28){base.warnings.push('图解标签较长，已以文字完整显示；可缩短标签后再试。');return null;}
    if(page.diagram==='pyramid'){
      const top=Math.max(300,w-180);shapes.push({kind:'polygon',x,y,w,h:slot-12,color:'wash',points:[[540-top/2,y],[540+top/2,y],[x+w,y+slot-12],[x,y+slot-12]]});
    }else shapes.push({kind:'rect',x,y,w,h:slot-12,color:'wash'});
    if(page.diagram==='timeline'&&i<items.length-1)shapes.push({kind:'line',x:108,y:y+slot/2,w:0,h:slot,color:'accent'});
    texts.forEach((t,j)=>out.push({text:t,x:x+55,y:y+12+j*lh,size,lineHeight:lh,kind:'paragraph',weight:500,marker:page.diagram==='checklist'&&j===0?'□':undefined}));
  }
  return {...base,lines:out,shapes};
}
function layoutPages(story:Story,measure:MeasureText):Scene[]{
  const all:Scene[]=[];
  for(const originalPage of story.pages){
    let page=originalPage;
    const height=HEIGHTS[story.options.ratio];
    const base:Scene={id:page.id,pageId:page.id,lines:[],shapes:[],width:1080,height,index:0,total:0,role:page.role,warnings:[],assetId:page.assetId};
    if(page.template&&!templateContract(page.template).roles.includes(page.role)){base.warnings.push('此模板不适用于当前页面角色，已完整保留为文字布局。');page={...page,template:undefined};}
    const custom=templateLayout(page,story,measure,base);if(custom){all.push(custom);continue;}
    if(page.diagram!=='none'&&!page.template){
      const diagram=diagramScene(page,story,measure,base);
      if(diagram&&!page.assetId){all.push(diagram);continue;}
      if(page.assetId)base.warnings.push('图解与照片暂不叠放，已采用照片文字布局。');
    }
    const fitted=fitProse(page,story,measure,base);page=fitted.page;
    const {lines,top}=fitted;
    let scene=fitted.base;let y=top;let priorY=0;let continuation=0;
    for(const line of lines){
      const gap=line.y-priorY;
      if(y+gap+line.lineHeight>height-145&&scene.lines.length){
        all.push(templateDecorate(scene,page));continuation++;scene={...fitted.base,id:page.id+':'+continuation,lines:[],shapes:[],photo:undefined,assetId:undefined,warnings:['内容延伸至续页，可在分镜中拆分。']};y=190;
      }else y+=gap;
      scene.lines.push({...line,y});y+=line.lineHeight;priorY=line.y+line.lineHeight;
    }
    all.push(templateDecorate(scene,page));
  }
  if(all.length>60)throw new Error('排版超过 60 页，请拆成多篇作品。');
  return all.map((s,index)=>({...s,index,total:all.length}));
}


function generatedToc(story:Story,scenes:Scene[]){
 const warnings=new Map<string,string[]>();
 const pages=story.pages.map(page=>{
  if(page.role!=='toc'||!page.tocEntries)return page;
  const notes:string[]=[];
  const rows=page.tocEntries.flatMap((entry,order)=>{
   const related=scenes.filter(s=>s.pageId===entry.targetPageId);
   if(!related.length){notes.push('有目录项对应的页面已移除，已从目录隐藏。');return [];}
   const matching=related.flatMap(s=>s.lines.filter(l=>l.headingAnchor?.level===2&&l.headingAnchor.label===entry.label).map(()=>s));
   const target=matching[entry.occurrence||0]||related[0];
   if(!matching[entry.occurrence||0])notes.push('有目录标题经过修改，请核对目录描述；页码仍指向对应页面。');
   return [{label:entry.label,number:target.index+1,order}];
  }).sort((a,b)=>a.number-b.number||a.order-b.order);
  const title=parseMarkdown(page.source).find(b=>b.kind==='heading')?.text||'这一篇，慢慢读';
  const source='## '+title+'\n\n'+(rows.length?rows.map(r=>r.label+'  ·  第 '+r.number+' 页').join('\n\n'):'目录对应的页面已被移除。');
  warnings.set(page.id,[...new Set(notes)]);return {...page,source};
 });
 return {pages,warnings};
}
export function layoutStory(story:Story,measure:MeasureText):Scene[]{
 let working=story;
 for(let attempt=0;attempt<6;attempt++){
  const scenes=layoutPages(working,measure),generated=generatedToc(story,scenes);
  if(generated.pages.every((p,i)=>p.source===working.pages[i].source)){
   return scenes.map(s=>({...s,warnings:[...s.warnings,...(generated.warnings.get(s.pageId||'')||[]),...(s.index===0&&story.settings.target&&scenes.length>story.settings.target?['实际排版为 '+scenes.length+' 页，超过目标 '+story.settings.target+' 页；内容完整保留。']:[])]}));
  }
  working={...story,pages:generated.pages};
 }
 throw new Error('目录页码尚未稳定，请简化目录或改为手工导读后再导出。');
}
