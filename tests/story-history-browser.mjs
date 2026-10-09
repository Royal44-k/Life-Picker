import {chromium} from 'playwright';import assert from 'node:assert/strict';
import {studioUrl} from './helpers/studio-url.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(studioUrl());
 await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 const id=await page.evaluate(async()=>{
  const db=await import('/src/studio/database.ts'),p=await import('/src/studio/planner.ts'),o=(await import('/src/core/layout.ts')).DEFAULT_OPTIONS;
  const s=p.planStory('# 要保留的旧稿\n\n第一版的具体经历。',o,{target:0,cover:false,ending:'none'});
  const r=await db.saveStory(s,0);await db.saveStory({...s,pages:[{...s.pages[0],source:'## 最新手改页\n\n修改后的表达。'}]},r,true);return s.id;
 });
 const url=new URL(studioUrl());url.searchParams.set('id',id);await page.goto(url.toString());await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 const button=page.getByRole('button',{name:'作品历史',exact:true});
 assert.equal(await button.count(),1,'history must have an accessible entry');
 await button.click();await page.getByRole('heading',{name:'作品历史',exact:true}).waitFor();
 await page.getByRole('button',{name:/查看版本 1 /}).click();
 assert.match(await page.getByLabel('历史页面文字').inputValue(),/第一版的具体经历/);
 page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'恢复这个版本',exact:true}).click();
 await page.getByRole('heading',{name:'作品历史',exact:true}).waitFor({state:'hidden'});
 await page.reload();const s=await page.evaluate(async id=>(await(await import('/src/studio/database.ts')).allStories()).find(s=>s.id===id),id);assert.match(s.pages[0].source,/第一版的具体经历/);
 await button.click();await page.getByRole('button',{name:/查看版本 2 /}).click();
 assert.match(await page.getByLabel('历史页面文字').inputValue(),/修改后的表达/);
 await page.getByRole('button',{name:'保留当前版本',exact:true}).click();await page.getByText('当前版本已保留。',{exact:true}).waitFor();
 await page.screenshot({path:'artifacts/history-mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS mobile history entry, read-only preview, recover previous, refresh and preserve pre-restore version');
}finally{await browser.close();}
