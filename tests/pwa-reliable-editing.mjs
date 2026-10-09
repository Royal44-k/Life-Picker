import {chromium} from 'playwright';import assert from 'node:assert/strict';import {studioUrl} from './helpers/studio-url.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();page.on('dialog',d=>d.accept());
 await page.goto(studioUrl());await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();
 await page.getByRole('button',{name:'新建作品',exact:true}).click();await page.getByLabel('作品原文').fill('## 甲\n\n原文第一版。');await page.getByRole('button',{name:'生成分镜',exact:true}).click();await page.getByText('已保存到本机',{exact:true}).waitFor();
 await page.getByRole('button',{name:'作品历史',exact:true}).click();await page.getByRole('button',{name:'保留当前版本',exact:true}).click();await page.getByText('当前版本已保留。',{exact:true}).waitFor();await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
 await page.getByRole('tab',{name:'原文',exact:true}).click();await page.getByLabel('作品原文').fill('## 甲\n\n原文第二版。');await page.getByRole('button',{name:'生成分镜',exact:true}).click();await page.getByLabel('这组页面的处理方式').selectOption('replace');await page.getByRole('button',{name:'确认页面更新',exact:true}).click();await page.getByRole('heading',{name:'检查原文更新',exact:true}).waitFor({state:'hidden'});
 await page.reload();await page.getByRole('button',{name:'作品历史',exact:true}).click();await page.getByRole('button',{name:/查看版本 .*手动保留/}).click();assert.match(await page.getByLabel('历史页面文字').inputValue(),/原文第一版/);
 await page.getByRole('button',{name:'恢复这个版本',exact:true}).click();await page.getByRole('heading',{name:'作品历史',exact:true}).waitFor({state:'hidden'});await page.getByRole('tab',{name:'原文',exact:true}).click();assert.match(await page.getByLabel('作品原文').inputValue(),/原文第一版/);
 await page.getByRole('button',{name:'保存单图',exact:true}).click();await page.locator('.save-image').waitFor();assert.equal(await page.locator('.save-image').evaluate(img=>img.naturalWidth),1080);
 console.log('PASS production offline history, source-update confirmation, restore and actual PNG');
}finally{await browser.close();}
