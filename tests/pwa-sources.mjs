import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();page.setDefaultTimeout(9000);
 await page.goto((process.env.TEST_URL||'http://localhost:5181')+'/?view=sources');await page.getByRole('heading',{name:'把启发，连同出处收好。'}).waitFor();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);await page.reload();
 await page.getByRole('alert').filter({hasText:'暂时连接不到电脑来源库'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'连接来源库',exact:true}).isDisabled(),false);
 const cached=await page.evaluate(async()=>{const names=await caches.keys();return (await Promise.all(names.map(async n=>(await(await caches.open(n)).keys()).map(r=>r.url)))).flat();});
 assert.equal(cached.some(url=>url.includes('/api/sources/')),false);
 await page.getByRole('navigation',{name:'主要入口'}).getByRole('link',{name:'我的',exact:true}).click();await page.getByRole('heading',{name:/自己的积累/}).waitFor();
 await page.getByRole('link',{name:/随心记与记录备份/}).click();await page.getByRole('button',{name:'记一笔',exact:true}).click();await page.getByLabel('随心记文字').fill('离线仍可记下自己的生活');await page.getByText('已保存到本机',{exact:true}).waitFor();
 console.log('PASS production source page fails clearly offline, caches no private source API data, and still allows offline personal journaling.');
}finally{await browser.close();}
