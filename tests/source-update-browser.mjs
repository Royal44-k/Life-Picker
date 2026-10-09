import {chromium} from 'playwright';import assert from 'node:assert/strict';import {studioUrl} from './helpers/studio-url.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(studioUrl());await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 const id=await page.evaluate(async()=>{
 const db=await import('/src/studio/database.ts'),p=await import('/src/studio/planner.ts'),o=(await import('/src/core/layout.ts')).DEFAULT_OPTIONS;
 let s=p.planStory('## 甲\n\n甲的原文。\n\n---\n\n## 乙\n\n乙的原文。',o,{target:0,cover:false,ending:'none',toc:'no'});
 s=p.editPage(s,s.pages[0].id,{source:'## 甲\n\n不能丢的手写句子'});s={...s,source:s.source.replace('乙的原文。','乙的新经历。')};await db.saveStory(s,0);return s.id;});
 const url=new URL(studioUrl());url.searchParams.set('id',id);await page.goto(url.toString());await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 await page.getByRole('button',{name:'生成分镜',exact:true}).click();
 await page.getByRole('heading',{name:'检查原文更新',exact:true}).waitFor({timeout:3000});
 const apply=page.getByRole('button',{name:'确认页面更新',exact:true});assert.ok(await apply.isDisabled());
 await page.getByLabel('这组页面的处理方式').selectOption('replace');await apply.click();
 await page.getByRole('heading',{name:'检查原文更新',exact:true}).waitFor({state:'hidden'});
 await page.getByText('已保存到本机',{exact:true}).waitFor();await page.reload();
 const s=await page.evaluate(async id=>(await(await import('/src/studio/database.ts')).allStories()).find(s=>s.id===id),id);
 assert.equal(s.pages.length,2);assert.match(s.pages[0].source,/不能丢的手写句子/);assert.match(s.pages[1].source,/乙的新经历/);
 const hist=await page.evaluate(async id=>(await(await import('/src/studio/database.ts')).listStoryHistory(id)).map(e=>e.story),id);
 assert.ok(hist.some(s=>s.pages[1].source.includes('乙的原文')));
 console.log('PASS source update decisions preserve manual page and create recoverable pre-update version');
}finally{await browser.close();}
