import {chromium} from 'playwright';import assert from 'node:assert/strict';import {studioUrl} from './helpers/studio-url.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await page.goto(studioUrl());await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();
 await page.getByRole('button',{name:'新建作品',exact:true}).click();await page.getByLabel('创作目的').selectOption('life');await page.getByLabel('目标篇幅').selectOption('6');await page.getByLabel('生成独立封面',{exact:true}).uncheck();await page.getByLabel('目录设置').selectOption('no');
 const source=Array.from({length:14},(_,i)=>'## 离线记录'+(i+1)+'\n\n自己写下的生活细节。').join('\n\n---\n\n');await page.getByLabel('作品原文').fill(source);await page.getByRole('button',{name:'生成分镜',exact:true}).click();await page.getByText('已保存到本机',{exact:true}).waitFor();
 await page.getByRole('button',{name:/排版检查 ·/}).click();await page.locator('dialog[open]').getByRole('button',{name:'拆成多篇 · 先看预览',exact:true}).click();await page.getByLabel('每篇最多图片').selectOption('9');await page.getByRole('button',{name:'保存这 2 篇新作品',exact:true}).click();await page.getByText('已另存 2 篇作品，原作品完整保留。',{exact:true}).waitFor();
 await page.reload();await page.getByLabel('创作目的').waitFor();assert.equal(await page.getByLabel('创作目的').inputValue(),'life');
 await page.getByRole('button',{name:'保存单图',exact:true}).click();await page.getByAltText('可长按保存的第 1 张图片').waitFor();assert.equal(await page.locator('.save-image').evaluate(i=>i.naturalWidth),1080);const dl=page.waitForEvent('download');await page.getByRole('button',{name:'下载 PNG',exact:true}).click();assert.match((await dl).suggestedFilename(),/-01\.png$/);await page.getByRole('button',{name:'关闭弹窗'}).click();
 await page.getByRole('button',{name:'作品库',exact:true}).click();await page.locator('.next-library button').filter({has:page.getByText('离线记录1',{exact:true})}).click();await page.getByRole('tab',{name:'原文',exact:true}).click();assert.equal(await page.getByLabel('作品原文').inputValue(),source);
 await page.goto(new URL('/guide-v1.7.html',studioUrl()).href);await page.getByRole('heading',{name:'让每一页，更合适。',exact:true}).waitFor();
 console.log('PASS production offline purpose, actual layout checks, atomic split, original preservation, refresh, downloaded PNG and v1.7 guide');
}finally{await browser.close();}
