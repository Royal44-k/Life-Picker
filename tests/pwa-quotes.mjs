import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://localhost:5181',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?view=mine');await page.getByRole('link',{name:/原话簿/}).waitFor();await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);
 await page.getByRole('link',{name:/原话簿/}).click();await page.getByRole('heading',{name:'原话簿',exact:true}).waitFor();
 await page.getByRole('link',{name:'去随心记',exact:true}).click();await page.getByRole('button',{name:'记一笔',exact:true}).click();
 await page.getByLabel('随心记文字').fill('没有网络，也能记录。\n把自己的话，慢慢写成作品。');
 await page.getByRole('button',{name:'摘一句原话',exact:true}).click();
 const original=page.getByLabel('选择原话的原文');await original.evaluate(el=>{el.focus();el.setSelectionRange(0,el.value.indexOf('\n'));document.dispatchEvent(new Event('selectionchange'));});
 await page.waitForFunction(()=>document.querySelector('.quote-selection p')?.textContent==='没有网络，也能记录。');
 await page.getByRole('button',{name:'收进原话簿',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'摘一句原话',exact:true}).click();await page.getByRole('button',{name:'选择原句：把自己的话，慢慢写成作品。',exact:true}).click();await page.getByRole('button',{name:'收进原话簿',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('link',{name:'原话簿 · 本页 2 句',exact:true}).click();await page.getByTestId('quote-card').nth(1).waitFor();await page.reload();await page.getByTestId('quote-card').nth(1).waitFor();
 await page.getByRole('button',{name:'选择原话：没有网络，也能记录。',exact:true}).click();await page.getByRole('button',{name:'选择原话：把自己的话，慢慢写成作品。',exact:true}).click();await page.screenshot({path:'artifacts/quotes-selected-mobile.jpg',type:'jpeg',quality:75});
 await page.getByRole('button',{name:'整理为新作品',exact:true}).click();assert.equal(await page.getByLabel('原话公开文案').inputValue(),'没有网络，也能记录。\n\n---\n\n把自己的话，慢慢写成作品。');
 await page.getByRole('button',{name:'另存到创作工作台',exact:true}).click();await page.getByLabel('作品原文').waitFor();
 await page.getByRole('button',{name:'保存单图',exact:true}).click();await page.getByLabel('选择要保存的图片').selectOption('1');
 const img=page.getByAltText('可长按保存的第 2 张图片');await img.waitFor();await page.waitForFunction(()=>document.querySelector('img.save-image')?.naturalWidth===1080);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载 PNG',exact:true}).click();const file=await download;assert.ok(file.suggestedFilename().endsWith('-02.png'));await file.saveAs('artifacts/quotes-page-02.png');
 const png=await readFile(await file.path());assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1440);
 await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();await page.goto(base+'/guide-v1.4.html');await page.getByRole('heading',{name:/把自己写过的话/}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS cached production opens quotes offline, manual text selection/saves/reloads/new work, exact page 2 PNG 1080×1440, offline guide');
}finally{await browser.close();}
