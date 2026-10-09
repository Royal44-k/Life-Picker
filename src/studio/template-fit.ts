import type {StoryPage,Story,Scene,SceneLine} from './model.ts';
import type {MeasureText} from '../core/types.ts';
import {textLines} from './scene.ts';
import {templateContract} from './template-contracts.ts';
export function fitProse(page:StoryPage,story:Story,measure:MeasureText,base:Scene){
 const make=(plain:boolean,compact:boolean,fontFactor:number)=>{
  const chosen=plain?{...page,template:undefined}:page,contract=templateContract(chosen.template);
  const profile=contract.geometry(base.height,chosen.role);let top=profile.top;
  const scene:Scene={...base,lines:[],shapes:[...base.shapes],warnings:[...base.warnings]};
  if(chosen.assetId){
   if(chosen.template==='photo-magazine'){scene.photo={x:88,y:190,w:440,h:base.height-355,fit:page.fit,focusX:page.focusX,focusY:page.focusY};top=216;profile.x=570;profile.width=422;profile.large=false;}
   else{const ph=Math.min(470,Math.round(base.height*.31));scene.photo={x:88,y:175,w:904,h:ph,fit:page.fit,focusX:page.focusX,focusY:page.focusY};top=175+ph+(compact?24:42);}
  }else if(chosen.template==='photo-magazine')scene.warnings.push('照片杂志还没有照片，当前完整展示文字；可在本页选择照片。');
  else if(chosen.role==='cover'&&!chosen.template)scene.shapes.push({kind:'rect',x:88,y:top-54,w:70,h:8,color:'accent'});
  if(compact&&!chosen.assetId)top=Math.min(top,176);
  scene.textFrame={x:profile.x,width:profile.width};
  const raw=textLines((page.codeContinuation?String.fromCharCode(96).repeat(3)+'\n':'')+page.source,{...story.options,fontScale:story.options.fontScale*profile.scale*fontFactor},measure,profile.width,profile.large,contract.bodyFont);
  const lines:SceneLine[]=[];let y=0,previous=0;
  for(const line of raw){
   y+=(line.y-previous)*(compact?.55:1);
   const lineHeight=compact?Math.ceil(line.size*(line.kind==='heading'||profile.large?1.3:1.5)):line.lineHeight;
   lines.push({...line,x:line.x+profile.x-88,y,lineHeight});y+=lineHeight;previous=line.y+line.lineHeight;
  }
  const adjustments=[...(plain&&page.template?['当前内容较长，已减少装饰，改用同角色文字布局。']:[]),...(compact?['已收紧非必要留白与行距。']:[]),...(fontFactor<1?['已在可读范围内微调字号，正文不低于 36px。']:[])];
  scene.adjustments=adjustments.length?adjustments:undefined;scene.warnings.push(...adjustments);
  return {page:chosen,base:scene,lines,top,fits:top+y<=base.height-145};
 };
 const variants:[boolean,boolean,number][]=[[false,false,1],[true,false,1],[true,true,1],[true,true,.95],[true,true,.90]];
 let candidate=make(...variants[0]);
 if(candidate.fits)return candidate;
 for(const variant of variants.slice(1)){candidate=make(...variant);if(candidate.fits)return candidate;}
 return candidate;
}
