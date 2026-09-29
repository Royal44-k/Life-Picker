import type {Story,StoryPage} from './model.ts';
import {editPage,hashText} from './planner.ts';
export function pageVersion(story:Story,page:StoryPage){return hashText(JSON.stringify([story.id,story.source,page]));}
export function applyPageSuggestion(story:Story,id:string,result:{text:string;revision:string}):Story{
 const page=story.pages.find(p=>p.id===id);if(!page)throw new Error('目标页面已不存在，请重新选择。');
 if(page.locked)throw new Error('本页已锁定，请先解锁后重新生成建议。');
 if(pageVersion(story,page)!==result.revision)throw new Error('本页或原文已变化，旧建议不会覆盖当前修改；请重新生成。');
 if(!result.text.trim()||result.text.length>8000)throw new Error('单页建议内容无效。');
 return editPage(story,id,{source:result.text,codeContinuation:false});
}
