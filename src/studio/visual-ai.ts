import type {Story} from './model.ts';import {hashText} from './planner.ts';import {applyTemplate} from './templates.ts';import {parseVisualStyle,validateVisualRole} from './visual-schema.mjs';import type {VisualStyle} from './visual-schema.mjs';
export type VisualSuggestion=VisualStyle&{revision:string};
export function visualVersion(story:Story,pageId:string){return hashText(JSON.stringify([story.id,story.source,story.sourceHash,story.settings,story.options,story.pages,pageId]));}
export function applyVisualSuggestion(story:Story,pageId:string,result:VisualSuggestion):Story{
 const page=story.pages.find(p=>p.id===pageId);if(!page)throw Error('目标页面已不存在。');if(page.locked||page.tocEntries)throw Error('本页已锁定或为自动目录，不能应用视觉建议。');
 if(result.revision!==visualVersion(story,pageId))throw Error('作品内容、照片或设置已变化，旧建议不会覆盖当前修改。');
 const style=parseVisualStyle({theme:result.theme,accent:result.accent,template:result.template,reason:result.reason});validateVisualRole(style.template,page.role);
 const paletteChanged=style.theme!==story.options.theme||style.accent.toLowerCase()!==story.options.accent.toLowerCase();
 if(paletteChanged&&story.pages.some(p=>p.locked))throw Error('作品含锁定页，请保持整篇配色不变。');
 const template=style.template==='plain'?undefined:style.template;
 if(!paletteChanged&&template===page.template&&page.diagram==='none')throw Error('建议与当前样式相同，可以直接保留当前版本。');
 const next=applyTemplate(story,pageId,template);return {...next,options:paletteChanged?{...story.options,theme:style.theme,accent:style.accent}:{...story.options}};
}
