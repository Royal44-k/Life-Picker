import type {Story,Scene,MediaAsset} from './model.ts';
import {hashText} from './planner.ts';
export interface LayoutIssue {kind:'missing-photo'|'source'|'ai-review'|'target'|'density'|'small-type'|'continuation'|'adjusted';pageId?:string;sceneIndex?:number;message:string;action:'page'|'source'|'review'|'target'|'none';severity:'error'|'notice'}
export function inspectLayout(story:Story,scenes:Scene[],assets:Pick<MediaAsset,'id'>[]):LayoutIssue[]{
 const out:LayoutIssue[]=[],sourceHash=hashText(story.source),stale=sourceHash!==story.sourceHash;
 if(stale)out.push({kind:'source',message:'原文已有修改，需要核对受影响页面后再导出。',action:'source',severity:'error'});
 if(story.aiReviewed===false||story.aiReviewed!==true&&story.warnings.some(w=>/^AI 已/.test(w)))out.push({kind:'ai-review',message:'AI 改写尚未标记核对，请检查数字、经历、引用和来源。',action:'review',severity:'notice'});
 if(story.settings.target&&scenes.length>story.settings.target)out.push({kind:'target',message:'实际排版 '+scenes.length+' 张，超过目标 '+story.settings.target+' 张；完整内容已保留。',action:'target',severity:'notice'});
 for(const page of story.pages){
  const sceneIndex=scenes.findIndex(s=>s.pageId===page.id),where={pageId:page.id,...(sceneIndex>=0?{sceneIndex}:{})};
  if(page.assetId&&!assets.some(a=>a.id===page.assetId))out.push({...where,kind:'missing-photo',message:'这页使用的照片不在本机素材库，请重新选择或移除引用。',action:'page',severity:'error'});
  if(!stale&&page.sourceRanges?.length&&page.sourceVersion!==sourceHash&&!page.retainedFromPrevious)out.push({...where,kind:'source',message:'这页的来源位置不属于当前原文，需要重新核对。',action:'source',severity:'error'});
 }
 const seen=new Set<string>();
 for(const scene of scenes){
  const where={pageId:scene.pageId,sceneIndex:scene.index},body=scene.lines.filter(l=>!l.decoration&&l.kind!=='heading');
  if(body.some(l=>l.size<=36))out.push({...where,kind:'small-type',message:body.some(l=>l.size<36)?'正文低于 36px，请放大字号或拆页。':'部分正文已到 36px 的下限，请在手机上确认阅读舒适。',action:'page',severity:'notice'});
  if(scene.textFrame&&scene.lines.length>=6){
   const top=scene.lines[0].y,used=scene.lines.reduce((n,l)=>n+l.lineHeight,0);
   if(used/Math.max(1,scene.height-145-top)>.88)out.push({...where,kind:'density',message:'这一张的文字较密，可缩短单页表达、调整模板或拆为续页。',action:'page',severity:'notice'});
  }
  if(scene.pageId&&seen.has(scene.pageId))out.push({...where,kind:'continuation',message:'此分镜延伸到了续图；导出包含这一张，可在分镜中继续拆分编辑。',action:'page',severity:'notice'});
  if(scene.pageId)seen.add(scene.pageId);
  if(scene.adjustments?.length)out.push({...where,kind:'adjusted',message:scene.adjustments.join(''),action:'page',severity:'notice'});
 }
 return out;
}
