import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true}),base=process.env.TEST_URL||'http://localhost:5184';
try{for(const [id,name]of [['gaia','暖纸讲义'],['white','白纸蓝标']]){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?view=templates');if(process.env.OFFLINE==='1'){await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();}
 await page.getByRole('button',{name:'预览开放主题：'+name}).click();await page.getByText('查看作者、许可与改动',{exact:true}).click();assert.match(await page.locator('dialog[open]').innerText(),/MIT/);
 const href=await page.getByRole('link',{name:'完整 MIT 许可'}).getAttribute('href');assert.match(await page.evaluate(async url=>(await fetch(url)).text(),href),/Permission is hereby granted/);
 const source='## 我自己的开放主题作品\n\n写下当天真正发生的小事。\n\n保留具体的数字 3 和原话。';await page.getByLabel('开放主题文字').fill(source);
 if(id==='gaia')await page.screenshot({path:'artifacts/open-template-mobile.png'});
 await page.getByRole('button',{name:'用开放主题另存作品',exact:true}).click();await page.getByLabel('作品原文').waitFor();assert.equal(await page.getByLabel('作品原文').inputValue(),source);await page.reload();await page.getByRole('tab',{name:'样式',exact:true}).click();assert.equal(await page.getByRole('button',{name:'选择'+(id==='gaia'?'暖纸':'白纸')+'主题',exact:true}).getAttribute('class'),'selected');
 await page.getByRole('button',{name:'保存单图',exact:true}).click();await page.getByLabel('选择要保存的图片').selectOption('1');await page.getByAltText('可长按保存的第 2 张图片').waitFor();assert.equal(await page.locator('.save-image').evaluate(i=>i.naturalWidth),1080);const dl=page.waitForEvent('download');await page.getByRole('button',{name:'下载 PNG',exact:true}).click();assert.match((await dl).suggestedFilename(),/-02\.png$/);assert.deepEqual(errors,[]);await context.close();
 }console.log('PASS both open themes: editable content, source/license, saved palette, refresh and page2 PNG'+(process.env.OFFLINE==='1'?' fully offline':''));
}finally{await browser.close();}
