import {studioUrl} from './helpers/studio-url.mjs';
import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto(studioUrl(process.env.TEST_URL));await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 const result=await page.evaluate(async()=>{
  const db=await import('/src/studio/database.ts');const p=await import('/src/studio/planner.ts');const options=(await import('/src/core/layout.ts')).DEFAULT_OPTIONS;
  const canvas=document.createElement('canvas');canvas.width=20;canvas.height=20;const blob=await new Promise(r=>canvas.toBlob(r));
  const photo={id:'used-photo',name:'used.png',type:blob.type,width:20,height:20,bytes:blob.size,blob,createdAt:1};
  await db.putAsset(photo);const story=p.planStory('自己的作品',options,{target:0,cover:false,ending:'none'});story.pages[0].assetId=photo.id;await db.saveStory(story,0);
  await db.trashAsset(photo.id);const hidden=!(await db.listAssets()).some(a=>a.id===photo.id);const kept=(await db.getAsset(photo.id)).blob.size===blob.size;
  let protectedError='';try{await db.deleteAssetPermanently(photo.id);}catch(e){protectedError=e.message;}
  await db.restoreAsset(photo.id);const restored=(await db.listAssets()).some(a=>a.id===photo.id);
  const unused={...photo,id:'unused-photo'};await db.putAsset(unused);
  let activeError='';try{await db.deleteAssetPermanently(unused.id);}catch(e){activeError=e.message;}
  await db.trashAsset(unused.id);await db.deleteAssetPermanently(unused.id);
  const gone=!(await db.getAsset(unused.id));
  const bad=p.planStory('不能引用已彻底删除的照片',options,{target:0,cover:false,ending:'none'});bad.pages[0].assetId=unused.id;
  let missing='';try{await db.saveStory(bad,0);}catch(e){missing=e.name;}
  const invalidSaved=(await db.allStories()).some(s=>s.id===bad.id);
  return {hidden,kept,protectedError,restored,activeError,gone,missing,invalidSaved};
 });
 assert.ok(result.hidden&&result.kept&&result.restored&&result.gone);assert.match(result.protectedError,/仍用于/);assert.match(result.activeError,/回收站/);assert.equal(result.missing,'MissingAssetError');assert.equal(result.invalidSaved,false);
 console.log('PASS recycle/restore, referenced-photo protection, permanent delete, atomic missing-photo write refusal');
}finally{await browser.close();}
