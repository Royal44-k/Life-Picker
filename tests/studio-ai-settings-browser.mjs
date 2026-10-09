import {chromium} from 'playwright';import assert from 'node:assert/strict';import {studioUrl} from './helpers/studio-url.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});let sent;
 await page.route('**/api/status',r=>r.fulfill({json:{deepseek:true}}));
 await page.route('**/api/storyboard',r=>{sent=r.request().postDataJSON();return r.fulfill({json:{sourceHash:sent.sourceHash,requestVersion:sent.requestVersion,settings:sent.settings,pages:[{role:'body',source:'## 从真实素材出发\n\n一个确认过的细节。',sourceIds:[sent.blocks[0].id],diagram:'none'}]}});});
 await page.goto(studioUrl());await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 await page.getByRole('button',{name:'新建作品',exact:true}).click();await page.getByLabel('作品原文').fill('一个确认过的细节。');
 await page.getByLabel('生成独立封面',{exact:true}).uncheck();await page.getByLabel('目录设置').selectOption('no');
 await page.getByRole('button',{name:'AI 编辑成篇 · 先看建议',exact:true}).click();await page.getByLabel('分镜 AI 连接码').fill('12345678');
 await page.getByRole('button',{name:'生成分镜建议',exact:true}).click();await page.getByLabel('AI 第 1 页').waitFor();
 assert.deepEqual(sent.settings,{target:0,cover:false,toc:'no',ending:'none'});assert.ok(sent.requestVersion);
 await page.getByLabel('附带本作品使用的照片（最多 3 张）').check();
 assert.ok(await page.getByRole('button',{name:'应用为新作品',exact:true}).isDisabled(),'changed request settings must invalidate prior suggestions');
 await page.getByLabel('附带本作品使用的照片（最多 3 张）').uncheck();await page.getByRole('button',{name:'应用为新作品',exact:true}).click();
 await page.getByText('已保存到本机',{exact:true}).waitFor();
 const s=await page.evaluate(async()=>{const id=new URL(location.href).searchParams.get('id');return(await(await import('/src/studio/database.ts')).allStories()).find(s=>s.id===id);});
 assert.deepEqual(s.pages.map(p=>p.role),['body']);assert.equal(s.settings.cover,false);assert.equal(s.settings.toc,'no');assert.equal(s.settings.ending,'none');
 console.log('PASS mobile AI request settings, stale preview blocking and applied page roles');
}finally{await browser.close();}