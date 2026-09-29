import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://localhost:5173';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const context=await browser.newContext();const page=await context.newPage();
  await page.goto(base);await page.getByRole('heading',{name:'让好内容，自成一页。'}).waitFor();
  const manifest=await(await page.request.get(base+'/manifest.webmanifest')).json();assert.equal(manifest.display,'standalone');
  for(const icon of manifest.icons)assert.equal((await page.request.get(base+icon.src)).status(),200);
  assert.equal((await page.request.get(base+'/.env')).status(),404);
  assert.equal((await page.request.get(base+'/server/ai.mjs')).status(),404);
  await page.evaluate(()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('SW readiness timeout')),12000))]));
  await page.reload();await context.setOffline(true);await page.reload();
  await page.getByRole('heading',{name:'让好内容，自成一页。'}).waitFor();
  await page.getByLabel('文案编辑器',{exact:true}).fill('# 离线排版\n\n没有网络也能整理图文。');
  await page.getByRole('button',{name:/导出图片/}).click();await page.locator('.save-image').waitFor();
  assert.equal(await page.locator('.save-image').evaluate(img=>img.naturalWidth),1080);
  const result={offlineEditing:true,offlinePngExport:true,manifest:true,icons:true,privateFilesNotServed:true,scope:'Chromium on trustworthy localhost; not iPhone LAN HTTP offline'};
  await writeFile('artifacts/pwa-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
