import {chromium} from 'playwright';import assert from 'node:assert/strict';import {studioUrl} from './helpers/studio-url.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto(studioUrl());await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 assert.equal(await page.evaluate(async()=>typeof(await import('/src/studio/database.ts')).saveSplitWorks),'function');
 const result=await page.evaluate(async()=>{
  const db=await import('/src/studio/database.ts'),{planStory}=await import('/src/studio/planner.ts'),{splitWorkPlan}=await import('/src/studio/split-works.ts'),{DEFAULT_OPTIONS}=await import('/src/core/layout.ts');
  const canvas=document.createElement('canvas');canvas.width=20;canvas.height=20;const blob=await new Promise(r=>canvas.toBlob(r));const asset={id:'split-photo',name:'记录.png',type:'image/png',width:20,height:20,bytes:blob.size,blob,createdAt:1};await db.putAsset(asset);
  let s=planStory(Array.from({length:14},(_,i)=>'自己的记录 '+i).join('\n\n---\n\n'),DEFAULT_OPTIONS,{target:6,cover:false,ending:'none',toc:'no'});s.pages[0].assetId=asset.id;s.revision=await db.saveStory(s,0);
  let p=splitWorkPlan(s,6);const before=JSON.stringify((await db.allStories()).find(x=>x.id===s.id));
  const add=IDBObjectStore.prototype.add;let calls=0;IDBObjectStore.prototype.add=function(...args){if(this.name==='stories'&&++calls===2)throw new DOMException('quota','QuotaExceededError');return add.apply(this,args);};
  let quota='';try{await db.saveSplitWorks(s.id,s.revision,p.drafts);}catch(e){quota=e.message;}finally{IDBObjectStore.prototype.add=add;}
  const partial=(await db.allStories()).filter(x=>p.drafts.some(d=>d.id===x.id)).length;
  const unchanged=before===JSON.stringify((await db.allStories()).find(x=>x.id===s.id));
  const prior=s.revision;s={...s,title:'后来补充的标题'};s.revision=await db.saveStory(s,prior);let stale='';try{await db.saveSplitWorks(s.id,prior,p.drafts);}catch(e){stale=e.message;}
  p=splitWorkPlan(s,6);const raw=await db.openDB(),tx=raw.transaction('assets','readwrite');tx.objectStore('assets').delete(asset.id);await db.finish(raw,tx,()=>undefined);
  let missing='';try{await db.saveSplitWorks(s.id,s.revision,p.drafts);}catch(e){missing=e.message;}await db.putAsset(asset);
  const beforeFinal=JSON.stringify((await db.allStories()).find(x=>x.id===s.id));
  const attempts=await Promise.allSettled([db.saveSplitWorks(s.id,s.revision,p.drafts),db.saveSplitWorks(s.id,s.revision,p.drafts)]);
  const all=await db.allStories();return {quota,partial,unchanged,stale,missing,success:attempts.filter(x=>x.status==='fulfilled').length,created:all.filter(x=>p.drafts.some(d=>d.id===x.id)).length,expected:p.drafts.length,originalKept:beforeFinal===JSON.stringify(all.find(x=>x.id===s.id)),revisions:all.filter(x=>p.drafts.some(d=>d.id===x.id)).map(x=>x.revision)};
 });
 assert.ok(result.quota);assert.equal(result.partial,0);assert.ok(result.unchanged);assert.match(result.stale,/变化|更新/);assert.match(result.missing,/照片/);assert.equal(result.success,1);assert.equal(result.created,result.expected);assert.ok(result.originalKept);assert.ok(result.revisions.every(r=>r===1));
 console.log('PASS split works atomicity, quota rollback, source revision guard, missing photo protection and duplicate submission');
}finally{await browser.close();}
