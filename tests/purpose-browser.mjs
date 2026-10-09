import {chromium} from 'playwright';import assert from 'node:assert/strict';import {studioUrl} from './helpers/studio-url.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let sent,wrong=true,calls=0;
 await page.route('**/api/status',r=>r.fulfill({json:{deepseek:true}}));
 await page.route('**/api/storyboard',r=>{calls++;sent=r.request().postDataJSON();return r.fulfill({json:{sourceHash:sent.sourceHash,requestVersion:sent.requestVersion,settings:{...sent.settings,purpose:wrong?'life':sent.settings.purpose},pages:[{role:'body',source:sent.source,sourceIds:[sent.blocks[0].id],diagram:'none'}]}});});
 await page.goto(studioUrl());await page.getByRole('button',{name:'新建作品',exact:true}).click();
 await page.getByLabel('创作目的').selectOption('tutorial');await page.getByLabel('目标篇幅').selectOption('6');
 await page.getByLabel('生成独立封面',{exact:true}).uncheck();await page.getByLabel('目录设置').selectOption('no');
 const source='## 自己试过的顺序\n\n1. 先记录素材\n2. 再核对文字';await page.getByLabel('作品原文').fill(source);
 await page.getByRole('button',{name:'生成分镜',exact:true}).click();await page.getByText('已保存到本机',{exact:true}).waitFor();
 await page.getByRole('button',{name:'编辑第 1 页',exact:true}).click();await page.getByRole('button',{name:'试用推荐模板 · 步骤流',exact:true}).click();
 assert.equal(await page.getByLabel('本页文字').inputValue(),source);assert.equal(calls,0);
 await page.getByRole('button',{name:'锁定本页',exact:true}).click();await page.getByRole('button',{name:'保存并关闭',exact:true}).click();
 await page.reload();await page.getByLabel('创作目的').waitFor();assert.equal(await page.getByLabel('创作目的').inputValue(),'tutorial');
 const stored=await page.evaluate(async()=>{const id=new URL(location.href).searchParams.get('id');return(await(await import('/src/studio/database.ts')).allStories()).find(s=>s.id===id);});
 assert.equal(stored.pages[0].template,'steps');assert.ok(stored.pages[0].locked);assert.equal(stored.source,source);
 await page.getByLabel('创作目的').selectOption('product');await page.getByRole('tab',{name:'分镜',exact:true}).click();await page.getByRole('button',{name:'编辑第 1 页',exact:true}).click();
 assert.equal(await page.getByLabel('本页文字').inputValue(),source);assert.ok(await page.getByRole('button',{name:/试用推荐模板/}).isDisabled());
 await page.screenshot({path:'artifacts/purpose-mobile.png'});await page.getByRole('button',{name:'保存并关闭',exact:true}).click();
 await page.getByRole('tab',{name:'原文',exact:true}).click();await page.getByRole('button',{name:'AI 编辑成篇 · 先看建议',exact:true}).click();await page.getByLabel('分镜 AI 连接码').fill('12345678');
 await page.getByRole('button',{name:'生成分镜建议',exact:true}).click();await page.getByText('AI 返回的设置与本次选择不一致，未应用。',{exact:true}).waitFor();
 assert.equal(sent.settings.purpose,'product');assert.equal(await page.getByRole('button',{name:'应用为新作品',exact:true}).count(),0);
 wrong=false;await page.getByRole('button',{name:'生成分镜建议',exact:true}).click();await page.getByLabel('AI 第 1 页').waitFor();await page.getByRole('button',{name:'应用为新作品',exact:true}).click();
 await page.getByText('已保存到本机',{exact:true}).waitFor();assert.equal(calls,2);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log('PASS purpose persistence, explicit recommendation without mutation/payment, lock preservation and AI purpose echo guard');
}finally{await browser.close();}
