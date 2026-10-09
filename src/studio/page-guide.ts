import type {Story,StoryPage,StoryPurpose} from './model.ts';import {purposeAdvice} from './purpose.ts';import {parseMarkdown} from '../core/markdown.ts';import {hashText,editPage} from './planner.ts';import type {TemplateId} from './templates.ts';
export interface PageGuideData{reason:string;evidence:string[];prompts:string[];template?:TemplateId;canAppend:boolean}
export function guideForPage(page:StoryPage,purpose:StoryPurpose='knowledge'):PageGuideData{
 const blocks=parseMarkdown(page.source),code=!!page.codeContinuation||blocks.some(b=>b.kind==='code'),advice=purposeAdvice(page,purpose);
 const evidence=page.source.split(/\n+/).map(s=>s.trim()).filter(Boolean).slice(0,3).map(s=>Array.from(s).slice(0,100).join(''));
 const data:PageGuideData={reason:advice.reason||'这页还可以补充一个属于你的具体细节。',evidence,prompts:['这页最想让读者记住的，是哪一个具体细节？','有没有一句当时的原话，能让这页更像你自己的表达？'],template:advice.template,canAppend:!code&&!page.tocEntries};
 if(page.tocEntries)return {...data,reason:'这是根据现有章节生成的目录，页码会随最终排版更新。',prompts:['章节名称是否能让读者看懂内容？','需要调整导读时，可以回到原文修改对应标题。'],template:undefined};
 if(code)return {...data,reason:'本页包含代码，先保留完整的文字和缩进；补充说明请在本页文字中放到代码块之外。',prompts:['这段代码需要什么前置条件？','读者怎样确认这一步已经成功？'],template:undefined};
 if(page.role==='cover')return {...data,reason:'这页承担封面任务，可让标题说清楚读者会读到什么；无需夸大效果。',prompts:['读完这篇，你希望读者获得哪一个具体帮助？','哪一句自己的经历或观察，最能说明这篇的主题？'],template:undefined};
 if(page.role==='ending')return {...data,reason:'这页承担收尾任务，可以回到主题，再留下一个简单的问题或行动。',prompts:['你愿意邀请读者先尝试哪一个小行动？','你还想继续探索什么，愿意留给下一篇？'],template:undefined};
 if(advice.template==='steps')return {...data,prompts:['哪一步最容易出错？你当时是怎么处理的？','完成这些步骤后，怎样检查结果符合预期？']};
 if(advice.template==='timeline')return {...data,prompts:['两次记录之间，你留意到了什么变化？','哪一个带日期的瞬间，值得再补上一句细节？']};
 if(page.assetId)return {...data,reason:advice.reason+' 这里只知道你选了照片，没有分析画面。',prompts:['这张照片里，你自己最想记住哪个细节？','照片没有拍到的声音或感受，是什么？']};
 if(/[0-9０-９]/.test(page.source))return {...data,prompts:['这里的数字来自哪次观察或测量？可以补充依据吗？','这些结果是在什么条件下得到的？']};
 if(!page.source.trim())return {...data,prompts:['这一页，你最想讲的真实小事是什么？','可以先写一句当时的原话吗？']};return data;
}
export function guideVersion(story:Story,id:string){return hashText(JSON.stringify([story.id,story.source,story.settings.purpose,story.pages.find(p=>p.id===id)]));}
export function appendGuidedAnswer(story:Story,id:string,answer:string,revision:string):Story{
 const page=story.pages.find(p=>p.id===id);if(!page)throw Error('目标页面已不存在。');if(page.locked)throw Error('本页已锁定，请先解锁。');if(guideVersion(story,id)!==revision)throw Error('本页或原文已变化，请回到当前页面重新核对，旧回答未重复加入。');
 if(!guideForPage(page,story.settings.purpose).canAppend)throw Error('自动目录或代码页请在对应原文中补充说明。');
 if(typeof answer!=='string'||!answer.trim()||answer.length>1500)throw Error('请填写 1～1,500 字符的回答。');const clean=answer.trim();if(page.source.trim()===clean||page.source.trimEnd().endsWith('\n\n'+clean))throw Error('这段回答已经在页末，不需要重复加入。');
 const source=page.source+(page.source.trim()?'\n\n':'')+clean;if(source.length>20000)throw Error('本页文字较长，请先拆页再补充回答。');return editPage(story,id,{source});
}
