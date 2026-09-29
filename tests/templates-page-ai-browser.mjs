import {studioUrl} from './helpers/studio-url.mjs';
import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let paid=0;await page.route('**/api/page-ai',async route=>{paid++;const data=route.request().postDataJSON();assert.ok(!('history' in data));assert.equal(data.context.length,0);await route.fulfill({status:200,json:{text:'## 自己的观察\n\n我走了 3 公里，拍下 2 张喜欢的照片。',revision:data.revision}});});
 await page.route('**/api/status',route=>route.fulfill({json:{deepseek:true}}));
 await page.goto(studioUrl());await page.getByRole('button',{name:'新建作品',exact:true}).click();
 await page.getByLabel('作品原文').fill('## 自己的观察\n\n我走了 3 公里。\n\n拍了 2 张照片。\n\n留下 1 个问题。');await page.getByRole('button',{name:'生成分镜',exact:true}).click();await page.getByText('已保存到本机',{exact:true}).waitFor();
 const original=await page.evaluate(async()=>{const db=await import('/src/studio/database.ts');return (await db.allStories()).find(s=>s.id===localStorage.getItem('shiye:studio:active'));});
 await page.getByRole('tab',{name:'样式',exact:true}).click();await page.getByRole('button',{name:'选择结构模板 · 12 种'}).click();
 assert.equal(await page.locator('.next-template-grid>button').count(),12);await page.getByLabel('模板目标分镜').selectOption(original.pages[1].id);
 await page.getByRole('button',{name:'预览数字笔记模板'}).click();await page.getByRole('heading',{name:'套用你的内容后'}).scrollIntoViewIfNeeded();
 await page.screenshot({path:'artifacts/template-preview-mobile.jpg',type:'jpeg',quality:60});await page.getByRole('button',{name:'应用到第 2 分镜'}).click();await page.getByText('已保存到本机',{exact:true}).waitFor();
 const actual=await page.evaluate(async()=>{const db=await import('/src/studio/database.ts');return (await db.allStories()).find(s=>s.id===localStorage.getItem('shiye:studio:active'));});
 assert.equal(actual.pages[1].template,'data');assert.equal(actual.pages[1].source,original.pages[1].source);assert.deepEqual(actual.pages[0],original.pages[0]);assert.equal(paid,0);
 await page.getByRole('tab',{name:'分镜',exact:true}).click();await page.getByRole('button',{name:'编辑第 2 页',exact:true}).click();
 await page.getByRole('button',{name:'AI 只改这一页 · 先看建议'}).click();await page.getByLabel('单页 AI 连接码').fill('12345678');
 await page.getByRole('button',{name:'生成单页建议',exact:true}).click();await page.getByLabel('单页 AI 建议').waitFor();
 await page.screenshot({path:'artifacts/page-ai-mobile.jpg',type:'jpeg',quality:60});await page.getByRole('button',{name:'应用到当前页',exact:true}).click();
 assert.equal(await page.getByLabel('本页文字').inputValue(),'## 自己的观察\n\n我走了 3 公里，拍下 2 张喜欢的照片。');await page.getByRole('button',{name:'保存并关闭'}).click();
 await page.getByRole('button',{name:'撤销上一步'}).click();await page.getByText('已保存到本机',{exact:true}).waitFor();
 const undone=await page.evaluate(async()=>{const db=await import('/src/studio/database.ts');return (await db.allStories()).find(s=>s.id===localStorage.getItem('shiye:studio:active'));});assert.equal(undone.pages[1].source,original.pages[1].source);assert.equal(undone.source,original.source);
 await page.getByRole('button',{name:'编辑第 2 页',exact:true}).click();await page.getByRole('button',{name:'锁定本页',exact:true}).click();assert.equal(await page.getByRole('button',{name:'AI 只改这一页 · 先看建议'}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:/更换本页模板/}).isDisabled(),true);
 await page.getByRole('button',{name:'解锁本页',exact:true}).click();await page.getByRole('button',{name:'AI 只改这一页 · 先看建议'}).click();
 let release;const gate=new Promise(r=>release=r);await page.unroute('**/api/page-ai');await page.route('**/api/page-ai',async route=>{const data=route.request().postDataJSON();await gate;try{await route.fulfill({json:{text:'取消后的结果不能应用',revision:data.revision}});}catch{}});
 await page.getByRole('button',{name:'生成单页建议',exact:true}).click();await page.getByRole('button',{name:'正在生成 · 取消本次'}).click();release();await page.getByText('已取消或等待超时，当前页面保持不变。',{exact:true}).waitFor();assert.equal(await page.getByLabel('单页 AI 建议').count(),0);
 await page.getByRole('button',{name:'关闭弹窗'}).click();
 // Simulate a real IndexedDB transaction abort: keep editor open until a successful retry.
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;window.__transaction=original;let fail=true;IDBDatabase.prototype.transaction=function(names,mode,...args){const tx=original.call(this,names,mode,...args);if(fail&&mode==='readwrite'&&[].concat(names).includes('stories')){fail=false;queueMicrotask(()=>tx.abort());}return tx;};});
 await page.getByLabel('本页文字').fill('## 未保存的修改\n\n不能误报保存成功。');await page.getByRole('button',{name:'保存并关闭'}).click();await page.locator('dialog[open]').getByText(/修改尚未保存/).first().waitFor();assert.equal(await page.getByLabel('本页文字').count(),1);
 await page.locator('dialog[open]').getByRole('button',{name:'重试保存',exact:true}).click();await page.getByRole('button',{name:'保存并关闭'}).click();await page.locator('dialog[open]').waitFor({state:'hidden'});
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log('PASS template real preview and target-only application; AI opt-in payload, review/apply/undo/lock/cancel; failed save stays editable with retry');
}finally{await browser.close();}
