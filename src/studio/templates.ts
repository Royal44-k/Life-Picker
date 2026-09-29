import type {Story,StoryPage,Scene,Shape} from './model.ts';
export const TEMPLATES=[
 {id:'headline',name:'大标题',hint:'把一个观点放大',sample:'## 从一个细节开始\n\n认真记下，才有自己的表达。'},
 {id:'quote',name:'引语卡',hint:'给一句原话留白',sample:'## 留给自己的话\n\n慢一点，也是在往前走。'},
 {id:'reading',name:'书摘札记',hint:'摘录与自己的理解',sample:'## 读到这里\n\n这段话让我想到今天的经历。\n\n把感受写下来，下次再读。'},
 {id:'essay',name:'轻短文',hint:'适合一段完整叙述',sample:'## 普通的一天\n\n走回家的路上，发现熟悉的街角开了一家小店。\n\n我停下来，认真看了一会儿。'},
 {id:'checklist',name:'行动清单',hint:'留下可以逐项尝试的事',sample:'## 今天的小行动\n\n- 拍一张自己喜欢的照片\n- 记下一个具体的观察\n- 问自己一个问题'},
 {id:'steps',name:'步骤流',hint:'由你确认先后顺序',sample:'## 从素材到作品\n\n留下一段原话\n\n选出一个重点\n\n整理成一组图文'},
 {id:'compare',name:'并列对比',hint:'把两边的内容放在一起看',sample:'## 两种记录方式\n\n随手记：先留下当时的感受。\n\n整理写：再补充背景与细节。'},
 {id:'data',name:'数字笔记',hint:'只突出原文已有的数值',sample:'## 本周的积累\n\n写下 3 段观察\n\n选出 5 张照片\n\n完成 1 篇分享'},
 {id:'timeline',name:'时间线',hint:'按你提供的顺序记录',sample:'## 一次小小的尝试\n\n周一：决定开始记录。\n\n周三：回看留下的细节。\n\n周日：整理成一篇作品。'},
 {id:'photo-magazine',name:'照片杂志',hint:'左边照片，右边故事',sample:'## 照片背后的故事\n\n选一张自己的照片，再写下当时发生了什么。'},
 {id:'memo',name:'手写便笺',hint:'像纸上随手留下的念头',sample:'## 一个小想法\n\n不必等事情变得特别，才值得记下。\n\n今天也有自己的细节。'},
 {id:'summary',name:'成果小结',hint:'把结果和发现整理成块',sample:'## 回看这次尝试\n\n完成的事：留下真实的细节。\n\n新的发现：普通日常也值得表达。\n\n下一步：继续记录。'}
] as const;
export type TemplateId=typeof TEMPLATES[number]['id'];
export const templateExists=(id:unknown):id is TemplateId=>TEMPLATES.some(t=>t.id===id);
export function applyTemplate(story:Story,id:string,template:TemplateId|undefined):Story{
 const page=story.pages.find(p=>p.id===id);if(!page)throw new Error('没有找到这一页。');
 if(page.locked)throw new Error('这一页已锁定，请先解锁。');
 if(template!==undefined&&!templateExists(template))throw new Error('模板不存在。');
 if(page.tocEntries&&template)throw new Error('自动目录保持清晰的目录布局；先改为手工导读才能套用模板。');
 return {...story,pages:story.pages.map(p=>p.id===id?{...p,template,diagram:'none' as const}:p),updatedAt:Date.now()};
}
export function templateProfile(page:StoryPage,height:number){
 const id=page.template;let x=88,width=904,top=190,scale=1,large=page.role==='cover';
 if(id==='headline'){top=height*.27;large=true;width=850;}
 if(id==='quote'){x=168;width=740;top=height*.26;scale=1.12;large=false;}
 if(id==='reading'){x=142;width=796;top=238;large=false;}
 if(id==='essay'){x=155;width=770;top=212;large=false;}
 if(id==='memo'){x=146;width=790;top=206;large=false;}
 return {x,width,top,scale,large};
}
export function templateDecorate(scene:Scene,page:StoryPage):Scene{
 const shapes:Shape[]=[...scene.shapes];const {height}=scene;
 if(page.template==='headline')shapes.push({kind:'line',x:88,y:height-185,w:210,h:0,color:'accent'});
 if(page.template==='quote')shapes.push({kind:'rect',x:108,y:scene.lines[0]?.y||230,w:8,h:Math.min(220,height*.2),color:'accent'});
 if(page.template==='reading'){shapes.push({kind:'rect',x:114,y:175,w:852,h:height-330,color:'wash'});shapes.push({kind:'line',x:128,y:175,w:0,h:height-330,color:'accent'});}
 if(page.template==='essay')shapes.push({kind:'line',x:970,y:190,w:0,h:height-355,color:'wash'});
 if(page.template==='memo'){
  shapes.push({kind:'line',x:126,y:180,w:0,h:height-330,color:'accent'});
  for(const line of scene.lines)shapes.push({kind:'line',x:145,y:line.y+line.lineHeight+2,w:790,h:0,color:'wash'});
 }
 return {...scene,shapes};
}
