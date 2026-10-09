import {OPEN_DESIGNS} from './open-designs.ts';import {planStory} from './planner.ts';import {DEFAULT_OPTIONS} from '../core/layout.ts';import type {Ratio,MeasureText} from '../core/types.ts';
export {OPEN_DESIGNS} from './open-designs.ts';
export function createOpenTemplate(id:typeof OPEN_DESIGNS[number]['id'],source:string,ratio:Ratio='portrait',measure?:MeasureText){
 const design=OPEN_DESIGNS.find(d=>d.id===id);if(!design)throw new Error('开放模板不存在。');
 const story=planStory(source,{...DEFAULT_OPTIONS,theme:design.theme,ratio,series:'我的表达'},{target:0,cover:true,toc:'no',ending:'none'},measure);
 return {...story,pages:story.pages.map(p=>({...p,template:design.id,diagram:'none' as const}))};
}
