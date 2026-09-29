import {studioUrl} from './helpers/studio-url.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext();const page=await context.newPage();
 await page.addInitScript(()=>{
  const options={theme:'lavender',ratio:'portrait',fontScale:1,author:'',series:'',accent:''};
  const drafts=[{id:'sixty',source:Array.from({length:60},(_,i)=>'第 '+(i+1)+' 页的真实内容').join('\n---\n'),options,updatedAt:3},
  {id:'too-many',source:Array.from({length:100},(_,i)=>'## 小标题 '+i+'\n\n这一段仍要保留。').join('\n\n'),options,updatedAt:2},
  {id:'ordinary',source:'# 一篇普通旧稿\n\n原始记录没有丢失。',options,updatedAt:1}];
  if(!localStorage.getItem('shiye:drafts:v1'))localStorage.setItem('shiye:drafts:v1',JSON.stringify({version:1,drafts}));
 });
 await page.goto(studioUrl(process.env.TEST_URL));
 await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor({timeout:8000});
 const result=await page.evaluate(async()=>{
  const db=await import('/src/studio/database.ts');
  const old=JSON.parse(localStorage.getItem('shiye:drafts:v1'));const copies=await db.allStories();
  await db.migrateLegacy();const again=await db.allStories();
  return {old,copies,again};
 });
 assert.equal(result.copies.length,3);
 for(const old of result.old.drafts)assert.equal(result.copies.find(s=>s.id==='legacy:'+old.id).source,old.source);
 assert.equal(result.copies.find(s=>s.id==='legacy:sixty').pages.length,60);
 assert.equal(result.copies.find(s=>s.id==='legacy:too-many').pages.length,0);
 assert.ok(result.copies.find(s=>s.id==='legacy:too-many').warnings.length);
 assert.equal(result.again.length,3);
 console.log('PASS legacy 60-page migration, oversized-plan source preservation, ordinary draft and idempotency');
}finally{await browser.close();}
