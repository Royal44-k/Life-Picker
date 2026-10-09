import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto((process.env.TEST_URL||'http://localhost:5184')+'/?view=templates');await page.getByRole('button',{name:'预览开放主题：暖纸讲义',exact:true}).click();await page.getByLabel('开放主题文字').fill('## 尚未保存的唯一原稿\n\n这段输入在等待写入期间也要保护。');
const protectedOnLeave=()=>page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});return !dispatchEvent(e);});assert.equal(await protectedOnLeave(),true);
await page.evaluate(()=>{const original=indexedDB.open.bind(indexedDB);let hold=true;indexedDB.open=(...args)=>{const req=original(...args);if(hold){hold=false;req.addEventListener('success',e=>{e.stopImmediatePropagation();window.__releaseOpen=()=>req.onsuccess?.(e);},{once:true});}return req;};});
await page.getByRole('button',{name:'用开放主题另存作品',exact:true}).click();await page.waitForFunction(()=>typeof window.__releaseOpen==='function');await page.getByRole('button',{name:'正在保存…',exact:true}).waitFor();
assert.equal(await protectedOnLeave(),true,'pending IndexedDB save must retain unload protection');
await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();assert.equal(await page.getByLabel('开放主题文字').count(),1);
await page.evaluate(()=>window.__releaseOpen());await page.getByLabel('作品原文').waitFor();assert.match(await page.getByLabel('作品原文').inputValue(),/尚未保存的唯一原稿/);assert.equal(await protectedOnLeave(),false);console.log('PASS open-template unload remains protected while save is pending; close blocked, successful save navigates with complete text');
}finally{await browser.close();}
