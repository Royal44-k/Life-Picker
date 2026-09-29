import {studioUrl} from './helpers/studio-url.mjs';
import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  if(sessionStorage.getItem('migration-setup'))return;
  sessionStorage.setItem('migration-setup','yes');
  window.__migrationReady=new Promise((resolve,reject)=>{
   const req=indexedDB.open('shiye-studio-v2',1);req.onupgradeneeded=()=>{for(const name of ['stories','assets','meta'])req.result.createObjectStore(name,{keyPath:'id'});};
   req.onsuccess=()=>{const db=req.result,tx=db.transaction(['assets','meta'],'readwrite');tx.objectStore('assets').put({id:'old-photo',name:'older.png',type:'image/png',width:10,height:10,bytes:12,blob:new Blob(['original-raw']),createdAt:1});tx.objectStore('meta').put({id:'preserve-me',value:'old metadata'});tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=reject;};req.onerror=reject;
  });
 });
 await page.goto(studioUrl());await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 const result=await page.evaluate(async()=>{await window.__migrationReady;const db=await import('/src/studio/database.ts');const a=await db.getAsset('old-photo'),handle=await db.openDB(),stores=[...handle.objectStoreNames],version=handle.version;const tx=handle.transaction('meta');let meta;tx.objectStore('meta').get('preserve-me').onsuccess=e=>meta=e.target.result;await db.finish(handle,tx,()=>{});return {stores,version,raw:await a.blob.text(),meta};});
 assert.equal(result.version,2);assert.deepEqual(result.stores,['assets','journals','memories','meta','stories']);assert.equal(result.raw,'original-raw');assert.equal(result.meta.value,'old metadata');console.log('PASS schema upgrade adds record stores and preserves existing photo bytes and metadata');
}finally{await browser.close();}
