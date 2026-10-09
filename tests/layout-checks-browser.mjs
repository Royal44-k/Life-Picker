import {chromium} from 'playwright';import assert from 'node:assert/strict';import {studioUrl} from './helpers/studio-url.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(studioUrl());await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 const id=await page.evaluate(async()=>{
  const db=await import('/src/studio/database.ts'),{planStory}=await import('/src/studio/planner.ts'),{DEFAULT_OPTIONS}=await import('/src/core/layout.ts');
  const s=planStory(Array.from({length:8},(_,i)=>'## 笔记 '+i+'\n\n自己留下的观察。').join('\n\n---\n\n'),DEFAULT_OPTIONS,{target:6,cover:false,toc:'no',ending:'none'});s.aiReviewed=false;
  await db.saveStory(s,0);return s.id;
 });await page.goto(studioUrl()+'&id='+id);
 await page.getByRole('button',{name:/排版检查 ·/}).click();await page.getByText(/实际排版 8 张/).waitFor();
 await page.getByRole('button',{name:'我已核对 AI 改写与来源',exact:true}).click();await page.getByText('已记录你的核对确认',{exact:true}).waitFor();
 await page.getByRole('button',{name:'保留全部 · 改为自动篇幅',exact:true}).click();await page.getByText(/暂未发现上述排版问题/).waitFor();
 await page.getByRole('button',{name:'关闭弹窗'}).click();await page.reload();await page.getByLabel('目标篇幅').waitFor();assert.equal(await page.getByLabel('目标篇幅').inputValue(),'0');
 const stored=await page.evaluate(async id=>(await(await import('/src/studio/database.ts')).allStories()).find(s=>s.id===id),id);assert.ok(stored.aiReviewed);assert.equal(stored.pages.length,8);
 await page.getByRole('tab',{name:'分镜',exact:true}).click();await page.getByRole('button',{name:'编辑第 1 页',exact:true}).click();await page.getByLabel('本页文字').fill('自己的记录。'.repeat(60));await page.getByRole('button',{name:'保存并关闭',exact:true}).click();
 await page.getByRole('button',{name:/排版检查 ·/}).click();await page.locator('dialog[open]').getByText(/收紧|微调/).first().waitFor();await page.screenshot({path:'artifacts/layout-checks-mobile.png'});
 await page.getByRole('button',{name:'检查对应分镜',exact:true}).first().click();assert.equal(await page.getByLabel('本页文字').inputValue(),'自己的记录。'.repeat(60));await page.getByRole('button',{name:'保存并关闭',exact:true}).click();
 await page.getByRole('button',{name:'保存单图',exact:true}).click();await page.getByAltText('可长按保存的第 1 张图片').waitFor();assert.equal(await page.locator('.save-image').evaluate(i=>i.naturalWidth),1080);await page.getByRole('button',{name:'关闭弹窗'}).click();
 await page.getByRole('tab',{name:'原文',exact:true}).click();await page.getByLabel('作品原文').fill(stored.source+'\n\n新的观察');await page.getByRole('button',{name:/排版检查 ·/}).click();await page.getByRole('button',{name:'回到原文核对',exact:true}).click();assert.ok(await page.getByLabel('作品原文').isVisible());assert.ok(await page.getByRole('button',{name:'保存单图',exact:true}).isDisabled());
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log('PASS actual-page layout checks, persisted AI confirmation, target resolution, page navigation, source guard and real PNG');
}finally{await browser.close();}
