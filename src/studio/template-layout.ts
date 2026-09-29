import type {Story,StoryPage,Scene,SceneLine,Shape} from './model.ts';
import type {MeasureText} from '../core/types.ts';
import {parseMarkdown} from '../core/markdown.ts';
import {textLines} from './scene.ts';
import {wrapText} from '../core/layout.ts';
export function templateLayout(page:StoryPage,story:Story,measure:MeasureText,base:Scene):Scene|null{
 const id=page.template;if(!id||!['steps','checklist','compare','data','timeline','summary'].includes(id))return null;
 if(page.assetId){base.warnings.push('这个结构使用文字布局；已保留照片与完整文字，改用照片文字排版。');return null;}
 const blocks=parseMarkdown((page.codeContinuation?'```\n':'')+page.source).filter(b=>b.kind!=='break'&&b.text.trim());
 const title=blocks[0]?.kind==='heading'?blocks.shift():undefined;
 if(id==='data'&&blocks.some(b=>!/[0-9０-９]/.test(b.text))){base.warnings.push('没有为每项提供明确数值，已用文字完整显示，不生成或推算数据。');return null;}
 if(blocks.length<2||blocks.length>6||blocks.some(b=>b.kind==='heading'||b.kind==='code')){base.warnings.push('此结构适合 2～6 个独立段落或列表项，当前按文字完整显示。');return null;}
 const titleLines=title?textLines('#'.repeat(title.level||2)+' '+title.text,story.options,measure):[];
 const start=titleLines.length?200+titleLines.at(-1)!.y+titleLines.at(-1)!.lineHeight+42:200;
 const two=id==='compare'||id==='data';const rows=two?Math.ceil(blocks.length/2):blocks.length;
 const slot=(base.height-155-start)/rows;const lines:SceneLine[]=titleLines.map(l=>({...l,y:l.y+190})),shapes:Shape[]=[];
 for(let i=0;i<blocks.length;i++){
  const x=two?88+(i%2)*468:id==='timeline'?174:id==='steps'?186:116;
  const y=start+(two?Math.floor(i/2):i)*slot;
  const width=two?436:id==='steps'?780:id==='timeline'?790:848;
  const padding=id==='data'?24:20;
  const source=blocks[i].text;
  const size=Math.max(36,Math.round((id==='data'?54:40)*story.options.fontScale)),lineHeight=Math.ceil(size*1.65);
  const itemLines=wrapText(source,width-padding*2-size,size,measure,id==='data'?700:400,'paragraph').map((text,j)=>({text,x:88,y:j*lineHeight,size,lineHeight,kind:'paragraph' as const,weight:id==='data'?700:400}));
  const itemHeight=itemLines.at(-1)!.y+itemLines.at(-1)!.lineHeight;
  if(itemHeight>slot-50){base.warnings.push('此页文字较长，已转为完整文字排版，可先拆为续页再尝试模板。');return null;}
  if(id==='checklist'){
   shapes.push({kind:'rect',x:88,y:y+14,w:22,h:22,color:'accent'});
   shapes.push({kind:'line',x:128,y:y+slot-16,w:836,h:0,color:'wash'});
  }else if(id==='timeline'){
   shapes.push({kind:'rect',x:111,y:y+15,w:18,h:18,color:'accent'});
   if(i<blocks.length-1)shapes.push({kind:'line',x:120,y:y+32,w:0,h:slot-15,color:'wash'});
  }else if(id==='steps'){
   shapes.push({kind:'rect',x:88,y,w:72,h:66,color:'wash'});
   lines.push({text:String(i+1).padStart(2,'0'),x:101,y:y+10,size:32,lineHeight:45,kind:'paragraph',weight:700});
   shapes.push({kind:'line',x:188,y:y+slot-18,w:780,h:0,color:'wash'});
  }else if(id==='summary'){
   shapes.push({kind:'rect',x:88,y,w:904,h:slot-18,color:'wash'});
   shapes.push({kind:'rect',x:88,y,w:8,h:slot-18,color:'accent'});
  }else{
   shapes.push({kind:'rect',x,y,w:width,h:slot-18,color:'wash'});
   shapes.push({kind:'line',x:x+padding,y:y+12,w:id==='data'?70:width-padding*2,h:0,color:'accent'});
  }
  lines.push(...itemLines.map(l=>({...l,x:x+padding+(l.x-88),y:y+25+l.y,weight:id==='data'?700:l.weight})));
 }
 return {...base,lines,shapes};
}
