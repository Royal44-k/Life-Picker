import {chromium} from 'playwright';import assert from 'node:assert/strict';import {createServer} from 'node:http';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {resolve,join,sep} from 'node:path';import {createHash} from 'node:crypto';
import {createSourceStore} from '../server/source-store.mjs';import {createSourceJobs} from '../server/source-jobs.mjs';import {createSourceHandler} from '../server/source-api.mjs';import {testPng} from './helpers/png.mjs';
const parent=resolve(tmpdir()),root=await mkdtemp(join(parent,'shiye-collection-ui-')),store=await createSourceStore({root:join(root,'catalog')});
const images=[testPng(),testPng([191,133,125,255])],hashes=images.map(image=>createHash('sha256').update(image).digest('hex'));
let release,broken=true;const gate=new Promise(r=>release=r);
const manifest=[{id:'first',sourceId:'open-doodles',title:'核验后的第一张插画'},{id:'second',sourceId:'open-doodles',title:'暂时不可用的插画'}];
const assets={manifest,acquire:async id=>{await gate;const index=id==='first'?0:1;if(index===1&&broken)throw new Error('官网文件链接发生变化，请重新核验。');return {draft:{kind:'asset',sourceId:'open-doodles',originalUrl:'https://www.opendoodles.com/'+id+'.png',title:manifest[index].title,summary:'搭配自己的表达',rights:{usage:'reusable',license:'CC0-1.0',licenseUrl:'https://www.opendoodles.com/about',evidence:'已核对许可'},asset:{url:'https://www.opendoodles.com/'+id+'.png',type:'image/png',sha256:hashes[index],bytes:images[index].length}}};},read:async sha=>{const i=hashes.indexOf(sha);if(i<0)throw new Error('Unknown file');return images[i];}};
const jobs=await createSourceJobs({root:join(root,'jobs'),getStore:()=>store,assets}),handler=createSourceHandler(store,'12345678',{jobs,assets}),server=createServer((req,res)=>void handler(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const api='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/sources/**',async route=>{const url=new URL(route.request().url()),headers={...route.request().headers(),origin:api};delete headers.host;const response=await route.fetch({url:api+url.pathname,headers});await route.fulfill({response});});
 await page.goto('http://localhost:5173/?view=sources');await page.getByLabel('电脑连接码').fill('12345678');await page.getByRole('button',{name:'连接来源库',exact:true}).click();
 const panel=page.getByRole('region',{name:'公开素材检查'});await panel.waitFor();await panel.getByRole('button',{name:'检查公开素材更新',exact:true}).click();await panel.getByText('正在核验公开素材',{exact:true}).waitFor();assert.equal(jobs.status().running,true);release();
 await panel.getByText('部分完成',{exact:true}).waitFor();await panel.getByText('新增 1 · 更新 0 · 已有 0 · 略过 0 · 失败 1',{exact:true}).waitFor();
 await page.getByRole('button',{name:'查看来源：核验后的第一张插画',exact:true}).click();
 const preview=page.getByRole('img',{name:'素材预览：核验后的第一张插画'});await preview.waitFor();await page.waitForFunction(()=>document.querySelector('.source-asset-preview img')?.naturalWidth===2);
 assert.equal((await fetch(api+'/api/sources/public-assets/'+(await store.list())[0].id)).status,404);
 await page.getByLabel('我已打开来源并核对内容与使用范围').check();await page.getByRole('button',{name:'通过审核',exact:true}).click();await page.getByText('审核已通过',{exact:true}).waitFor();
 assert.equal((await fetch(api+'/api/sources/public-assets/'+(await store.list())[0].id)).status,200);
 await panel.getByLabel('每日 09:00 自动检查').click();await page.waitForFunction(()=>!document.querySelector('[aria-label="每日 09:00 自动检查"]').checked);assert.equal(jobs.status().enabled,false);
 await page.getByLabel('自己的概括',{exact:true}).fill('手动检查也要保留这段尚未保存的想法');broken=false;
 await panel.getByRole('button',{name:'检查公开素材更新',exact:true}).click();await panel.getByText('新增 1 · 更新 0 · 已有 1 · 略过 0 · 失败 0',{exact:true}).waitFor();assert.equal(await page.getByLabel('自己的概括',{exact:true}).inputValue(),'手动检查也要保留这段尚未保存的想法');
 await panel.getByText('检查完成',{exact:true}).waitFor();assert.equal((await store.list()).length,2);assert.equal((await store.published()).length,1);
 await panel.getByRole('button',{name:'检查公开素材更新',exact:true}).click();await panel.getByText('新增 0 · 更新 0 · 已有 2 · 略过 0 · 失败 0',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 await page.screenshot({path:'artifacts/source-collection-mobile.jpg',type:'jpeg',quality:80,fullPage:true});
 console.log('PASS mobile collection progress, partial failures, zero-new result, schedule toggle, authenticated pending preview, approved public asset, and background refresh preserves unsaved analysis.');
}finally{release();jobs.close();await jobs.waitForIdle();await browser.close();await new Promise(r=>server.close(r));assert.ok(resolve(root).startsWith(parent+sep+'shiye-collection-ui-'));await rm(root,{recursive:true,force:true});}
