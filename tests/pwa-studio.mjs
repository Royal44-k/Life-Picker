import {studioUrl} from './helpers/studio-url.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://localhost:5181';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();
 await page.goto(studioUrl(base));await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 const manifest=await(await page.request.get(base+'/manifest.webmanifest')).json();assert.equal(manifest.display,'standalone');
 assert.equal((await page.request.get(base+'/.env')).status(),404);
 assert.equal((await page.request.get(base+'/server/ai.mjs')).status(),404);
 await page.evaluate(()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('SW timeout')),12000))]));
 await page.reload();await context.setOffline(true);await page.reload();
 await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 await page.getByRole('button',{name:'新建作品',exact:true}).click();
 await page.getByLabel('作品原文').fill('# 离线也能整理\n\n自己的记录，在本机继续排版。');
 await page.getByRole('button',{name:'生成分镜',exact:true}).click();
 await page.getByRole('tab',{name:'预览',exact:true}).click();
 await page.getByRole('button',{name:'保存单图',exact:true}).click();
 await page.locator('.save-image').waitFor();
 assert.equal(await page.locator('.save-image').evaluate(img=>img.naturalWidth),1080);
 const result={newStudioOfflineEditing:true,newStudioOfflineExport:true,privateFilesNotServed:true,scope:'Chromium localhost secure context, not real iPhone'};
 await writeFile('artifacts/pwa-v1.1-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
