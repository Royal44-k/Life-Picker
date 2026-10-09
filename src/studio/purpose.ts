import {parseMarkdown} from '../core/markdown.ts';
import type {StoryPage,StoryPurpose} from './model.ts';
import type {TemplateId} from './templates.ts';
export const PURPOSES:Record<StoryPurpose,{name:string;hint:string}>={
 knowledge:{name:'知识分享',hint:'说明一个观点，补上自己的例子和依据。'},
 tutorial:{name:'操作教程',hint:'把实际步骤写清楚，再补充注意事项。'},
 life:{name:'生活记录',hint:'留下照片、时间和当时的感受，不必提炼成道理。'},
 product:{name:'产品介绍',hint:'说明真实场景与特点，数字和效果保留可核实的依据。'}
};
export function purposeAdvice(page:StoryPage,purpose:StoryPurpose='knowledge'):{template?:TemplateId;reason:string}{
 if(page.role!=='body'&&page.role!=='diagram'||page.tocEntries)return {reason:''};
 const blocks=parseMarkdown((page.codeContinuation?String.fromCharCode(96).repeat(3)+'\n':'')+page.source).filter(b=>b.kind!=='break'&&b.text.trim());
 const items=blocks[0]?.kind==='heading'?blocks.slice(1):blocks;
 const simple=items.length>=2&&items.length<=6&&items.every(b=>b.kind!=='code'&&b.kind!=='heading');
 if(blocks.some(b=>b.kind==='code'))return {reason:'本页包含代码，保留文字卡便于阅读和复制。'};
 if(page.assetId&&purpose==='life')return {template:'photo-magazine',reason:'本页已有自己的照片，可让画面与当时的文字并排。'};
 if(simple&&purpose==='tutorial'&&items.every((b,i)=>b.kind==='list'&&/^\d+[.)]$/.test(b.marker||'')&&Number.parseInt(b.marker!)===i+1))return {template:'steps',reason:'原文已按 1、2 的顺序列出步骤，可保留先后顺序画成步骤流。'};
 if(simple&&purpose==='life'&&items.every(b=>/^(?:\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?|\d{1,2}月\d{1,2}日|(?:周|星期)[一二三四五六日天])(?:[：:\s]|$)/.test(b.text)))return {template:'timeline',reason:'每段都提供了日期或星期，可按原文顺序展示为时间线；请核对实际日期。'};
 if(simple&&purpose==='product'&&items.every(b=>/[0-9０-９]/.test(b.text)))return {template:'data',reason:'每段已有数值，可突出原有数字；排版不会核实其真实性，请保留证据。'};
 if(simple&&items.every(b=>b.kind==='list'&&/^\[[ xX]\]/.test(b.text)))return {template:'checklist',reason:'原文明确列出了勾选项，可呈现为行动清单。'};
 return {template:purpose==='life'?'memo':'essay',reason:purpose==='tutorial'?'暂未看到明确的连续步骤编号，先保留完整说明。':purpose==='product'?'先完整呈现场景与描述，数字和效果需要你提供依据。':purpose==='life'?'保留当时的语气，像便笺一样收好这段日常。':'先完整说明观点与例子，不把并列内容推断为层级关系。'};
}
