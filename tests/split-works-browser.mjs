import {chromium} from 'playwright';import assert from 'node:assert/strict';import {studioUrl} from './helpers/studio-url.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(studioUrl());await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 const original=await page.evaluate(async()=>{
  const db=await import('/src/studio/database.ts'),{planStory}=await import('/src/studio/planner.ts'),{DEFAULT_OPTIONS}=await import('/src/core/layout.ts');
  const s=planStory(Array.from({length:14},(_,i)=>'## 自己的第 '+(i+1)+' 段\n\n当时亲手记下的细节。').join('\n\n---\n\n'),DEFAULT_OPTIONS,{target:6,cover:false,toc:'no',ending:'none'});s.revision=await db.saveStory(s,0);return s;
 });await page.goto(studioUrl()+'&id='+original.id);await page.getByRole('button',{name:/排版检查 ·/}).click();await page.locator('dialog[open]').getByRole('button',{name:'拆成多篇 · 先看预览',exact:true}).click();
 await page.getByRole('button',{name:'保存这 3 篇新作品',exact:true}).waitFor();assert.equal(await page.locator('.next-split-preview').count(),3);
 await page.getByLabel('每篇最多图片').selectOption('9');await page.getByRole('button',{name:'保存这 2 篇新作品',exact:true}).waitFor();assert.equal(await page.locator('.next-split-preview').count(),2);
 await page.screenshot({path:'artifacts/split-preview-mobile.png'});
 await page.evaluate(()=>{const add=IDBObjectStore.prototype.add;let fails=true;window.__splitAdd=add;IDBObjectStore.prototype.add=function(...args){if(this.name==='stories'&&fails){fails=false;throw new DOMException('存储空间不足，测试失败保护','QuotaExceededError');}return add.apply(this,args);};});
 await page.getByRole('button',{name:'保存这 2 篇新作品',exact:true}).click();await page.locator('dialog[open]').getByRole('alert').waitFor();assert.equal(await page.locator('.next-split-preview').count(),2);
 const empty=await page.evaluate(async id=>(await(await import('/src/studio/database.ts')).allStories()).filter(s=>s.splitFrom?.id===id).length,original.id);assert.equal(empty,0);
 await page.getByRole('button',{name:'保存这 2 篇新作品',exact:true}).click();await page.getByText('已另存 2 篇作品，原作品完整保留。',{exact:true}).waitFor();
 const saved=await page.evaluate(async id=>{const all=await(await import('/src/studio/database.ts')).allStories();return {original:all.find(s=>s.id===id),parts:all.filter(s=>s.splitFrom?.id===id).sort((a,b)=>a.splitFrom.part-b.splitFrom.part)};},original.id);
 assert.deepEqual(saved.original,original);assert.equal(saved.parts.length,2);assert.deepEqual(saved.parts.flatMap(s=>s.pages.map(p=>p.source)),original.pages.map(p=>p.source));
 await page.getByRole('button',{name:'保存单图',exact:true}).click();await page.getByAltText('可长按保存的第 1 张图片').waitFor();assert.equal(await page.locator('.save-image').evaluate(i=>i.naturalWidth),1080);
 await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();await page.reload();await page.getByLabel('作品原文').waitFor();assert.equal(await page.getByLabel('作品原文').inputValue(),saved.parts[0].source);
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log('PASS mobile split preview/6-to-9 choice, failed-save retry, original preservation, full text order, independent refresh and actual PNG');
}finally{await browser.close();}
