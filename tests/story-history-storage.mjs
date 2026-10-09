import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {studioUrl} from './helpers/studio-url.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto(studioUrl(process.env.TEST_URL));
 await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 const available=await page.evaluate(async()=>typeof(await import('/src/studio/database.ts')).listStoryHistory);
 assert.equal(available,'function','persistent story history must be available');
 const r=await page.evaluate(async()=>{
  const db=await import('/src/studio/database.ts'),p=await import('/src/studio/planner.ts');
  const options=(await import('/src/core/layout.ts')).DEFAULT_OPTIONS;
  const s=p.planStory('第一版原文',options,{target:0,cover:false,ending:'none'});
  let rev=await db.saveStory(s,0);const originalId=s.id;
  for(let i=0;i<40;i++)rev=await db.saveStory({...s,pages:[{...s.pages[0],source:'正在编辑 '+i}]},rev);
  const typed=await db.listStoryHistory(s.id);
  const first=typed.find(h=>h.story.pages[0].source==='第一版原文');
  const restored=await db.restoreStoryHistory(s.id,first.id,rev);
  const afterRestore=await db.listStoryHistory(s.id);
  let stale='';try{await db.restoreStoryHistory(s.id,first.id,rev);}catch(e){stale=e.message;}
  rev=restored.revision;
  for(let i=0;i<35;i++)rev=await db.saveStory({...restored,pages:[{...s.pages[0],source:'确认稿 '+i}]},rev,true);
  const bounded=await db.listStoryHistory(s.id);
  const canvas=document.createElement('canvas');canvas.width=10;canvas.height=10;const blob=await new Promise(r=>canvas.toBlob(r));
  const a={id:'history-photo',name:'旧稿照片.png',type:blob.type,width:10,height:10,bytes:blob.size,blob,createdAt:1};
  await db.putAsset(a);
  const withPhoto={...restored,pages:[{...s.pages[0],assetId:a.id}]};rev=await db.saveStory(withPhoto,rev,true);
  rev=await db.saveStory({...restored,pages:[{...s.pages[0],source:'现在不放照片'}]},rev,true);
  await db.trashAsset(a.id);let photoProtected='';try{await db.deleteAssetPermanently(a.id);}catch(e){photoProtected=e.message;}
  const refs=(await db.otherAssetUsage())[a.id];
  const photoVersion=(await db.listStoryHistory(s.id)).find(h=>h.story.pages.some(p=>p.assetId===a.id));
  const raw=await db.openDB(),tx=raw.transaction('assets','readwrite');tx.objectStore('assets').delete(a.id);await db.finish(raw,tx,()=>undefined);
  let missingRestore='';try{await db.restoreStoryHistory(s.id,photoVersion.id,rev);}catch(e){missingRestore=e.name;}
  const missingKept=(await db.allStories()).find(x=>x.id===s.id).pages[0].source==='现在不放照片';
  await db.putAsset(a);await db.trashAsset(a.id);
  const beforeFailure=JSON.stringify(await db.listStoryHistory(s.id));
  const realPut=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(...args){if(this.name==='meta'&&String(args[0]?.id).startsWith('story-history:'))throw new DOMException('Test quota','QuotaExceededError');return realPut.apply(this,args);};
  let failed='';try{await db.saveStory({...restored,pages:[{...s.pages[0],source:'不应保存'}]},rev,true);}catch(e){failed=e.message;}
  finally{IDBObjectStore.prototype.put=realPut;}
  const afterFailure=JSON.stringify(await db.listStoryHistory(s.id));
  const current=(await db.allStories()).find(x=>x.id===s.id);
  await db.clearStoryHistory(s.id,rev);await db.deleteAssetPermanently(a.id);
  return {missingRestore,missingKept,originalId,typed:typed.length,first:!!first,restored,retained:afterRestore.some(h=>h.story.pages[0].source==='正在编辑 39'),stale,bounded:bounded.length,photoProtected,refs:refs?.length,failed,atomic:beforeFailure===afterFailure,current:current.pages[0].source,cleared:(await db.listStoryHistory(s.id)).length,deleted:!(await db.getAsset(a.id))};
 });
 assert.equal(r.missingRestore,'MissingAssetError');assert.ok(r.missingKept);assert.ok(r.first);assert.ok(r.typed<5,'typing must not evict useful old versions');assert.equal(r.restored.id,r.originalId);assert.equal(r.restored.pages[0].source,'第一版原文');assert.ok(r.retained);assert.match(r.stale,/另一窗口|已变化/);assert.equal(r.bounded,30);assert.match(r.photoProtected,/历史/);assert.ok(r.refs);assert.ok(r.failed);assert.ok(r.atomic);assert.equal(r.current,'现在不放照片');assert.equal(r.cleared,0);assert.ok(r.deleted);
 await page.reload();const current=await page.evaluate(async id=>(await(await import('/src/studio/database.ts')).allStories()).find(s=>s.id===id),r.originalId);assert.equal(current.pages[0].source,'现在不放照片');
 console.log('PASS persistent restore, typing coalescing, retention bound, conflict/quota atomicity and historical photo protection');
}finally{await browser.close();}
