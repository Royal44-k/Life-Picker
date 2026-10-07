import {chromium} from 'playwright';import assert from 'node:assert/strict';import {createServer} from 'node:http';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {resolve,join,sep} from 'node:path';import {createHash} from 'node:crypto';
import {createSourceStore} from '../server/source-store.mjs';import {createSourceJobs} from '../server/source-jobs.mjs';import {createSourceHandler} from '../server/source-api.mjs';import {testPng} from './helpers/png.mjs';
const parent=resolve(tmpdir()),root=await mkdtemp(join(parent,'shiye-collection-races-')),store=await createSourceStore({root:join(root,'catalog')});
const images=[testPng(),testPng([190,130,120,255])],hashes=images.map(b=>createHash('sha256').update(b).digest('hex'));
const draft=i=>({kind:'asset',sourceId:'open-doodles',originalUrl:'https://www.opendoodles.com/race-'+i+'.png',title:'并发素材 '+i,summary:'自己的理解',rights:{usage:'reusable',license:'CC0-1.0',licenseUrl:'https://www.opendoodles.com/about',evidence:'明确许可'},asset:{url:'https://www.opendoodles.com/race-'+i+'.png',type:'image/png',sha256:hashes[i],bytes:images[i].length}});
const original=await store.create(draft(0));let releaseAcquire,releasePut,putArrived=false;
const acquireGate=new Promise(r=>releaseAcquire=r),putGate=new Promise(r=>releasePut=r);
const assets={manifest:[{id:'0',sourceId:'open-doodles',title:'并发素材 0'},{id:'1',sourceId:'open-doodles',title:'并发素材 1'}],acquire:async id=>{await acquireGate;return {draft:draft(Number(id))};},read:async sha=>images[hashes.indexOf(sha)]};
const jobs=await createSourceJobs({root:join(root,'jobs'),getStore:()=>store,assets}),handler=createSourceHandler(store,'12345678',{jobs,assets}),server=createServer((req,res)=>void handler(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const api='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:920}});page.setDefaultTimeout(6000);
 await page.route('**/api/sources/**',async route=>{const request=route.request(),url=new URL(request.url()),headers={...request.headers(),origin:api};delete headers.host;const response=await route.fetch({url:api+url.pathname,headers});if(request.method()==='PUT'&&url.pathname.endsWith('/records/'+original.id)){putArrived=true;await putGate;}await route.fulfill({response});});
 await page.goto((process.env.TEST_URL||'http://localhost:5173')+'/?view=sources');await page.getByLabel('电脑连接码').fill('12345678');await page.getByRole('button',{name:'连接来源库',exact:true}).click();
 const panel=page.getByRole('region',{name:'公开素材检查'});await panel.getByRole('button',{name:'检查公开素材更新',exact:true}).click();await panel.getByText('正在核验公开素材',{exact:true}).waitFor();
 await page.getByRole('button',{name:'查看来源：并发素材 0',exact:true}).click();await page.getByLabel('自己的概括',{exact:true}).fill('这份修改必须保存，同时还要看到新素材');await page.getByRole('button',{name:'保存修改并重新审核',exact:true}).click();
 const end=Date.now()+5000;while(!putArrived&&Date.now()<end)await new Promise(r=>setTimeout(r,20));assert.equal(putArrived,true);
 releaseAcquire();await jobs.waitForIdle();await panel.getByText('检查完成',{exact:true}).waitFor();releasePut();await page.getByText('已保存到电脑来源库',{exact:true}).waitFor();
 await panel.getByRole('button',{name:'刷新任务状态',exact:true}).click();await page.getByRole('button',{name:'查看来源：并发素材 1',exact:true}).waitFor();
 assert.equal(await page.getByLabel('自己的概括',{exact:true}).inputValue(),'这份修改必须保存，同时还要看到新素材');
 await page.getByRole('button',{name:'收起',exact:true}).click();
 await page.evaluate(id=>{
  const realFetch=window.fetch,realTimeout=window.setTimeout;let shortened=false;
  window.setTimeout=(handler,delay,...args)=>{if(delay===20000&&!shortened)return realTimeout(()=>{shortened=true;window.previewDeadlineFired=true;handler(...args);},25);return realTimeout(handler,delay,...args);};
  window.fetch=(url,init)=>String(url)==='/api/sources/assets/'+id?new Promise((_resolve,reject)=>{window.rejectOldPreview=()=>reject(new DOMException('Late aborted response','AbortError'));init.signal.addEventListener('abort',()=>{window.oldPreviewAborted=true;},{once:true});}):realFetch(url,init);
 },original.id);
 await page.getByRole('button',{name:'查看来源：并发素材 0',exact:true}).click();await page.waitForFunction(()=>window.oldPreviewAborted===true&&window.previewDeadlineFired===true);
 await page.getByRole('button',{name:'查看来源：并发素材 1',exact:true}).click();await page.getByRole('img',{name:'素材预览：并发素材 1',exact:true}).waitFor();
 await page.evaluate(()=>window.rejectOldPreview());await page.evaluate(()=>new Promise(r=>setTimeout(r,50)));
 assert.equal(await page.getByRole('img',{name:'素材预览：并发素材 1',exact:true}).isVisible(),true);
 assert.equal(await page.locator('.source-asset-preview').getByRole('alert').count(),0);
 console.log('PASS collection results are refreshed after an overlapping editor save, and an obsolete timed-out image cannot replace the current preview.');
}finally{releaseAcquire();releasePut();jobs.close();await jobs.waitForIdle();await browser.close();await new Promise(r=>server.close(r));assert.ok(resolve(root).startsWith(parent+sep+'shiye-collection-races-'));await rm(root,{recursive:true,force:true});}
