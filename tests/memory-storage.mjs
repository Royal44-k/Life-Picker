import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage();await page.goto('http://localhost:5173/?view=journal');
 const result=await page.evaluate(async()=>{
  const db=await import('/src/journal/database.ts'),m=await import('/src/journal/model.ts'),media=await import('/src/studio/database.ts');
  const c=document.createElement('canvas');c.width=c.height=10;const blob=await new Promise(r=>c.toBlob(r));await media.putAsset({id:'memory-photo',name:'a.png',type:'image/png',width:10,height:10,bytes:blob.size,blob,createdAt:1});
  const e={...m.newEntry('2026-09-01'),text:'这一刻',assetIds:['memory-photo']},album=m.newMemory('九月',[e]);let rev=await db.saveMemory(album,0),guard='';
  try{await db.deleteMemory(album.id,rev);}catch(e){guard=e.message;}
  if(!guard)return {guard};
  rev=await db.trashMemory(album.id,rev);const hidden=(await db.listMemories()).length===0,kept=(await db.listMemories(true)).length===1;
  await media.trashAsset('memory-photo');let protectedPhoto='';try{await media.deleteAssetPermanently('memory-photo');}catch(e){protectedPhoto=e.message;}
  rev=await db.restoreMemory(album.id,rev);const restored=(await db.listMemories())[0];let conflict='';try{await db.trashMemory(album.id,1);}catch(e){conflict=e.message;}
  rev=await db.trashMemory(album.id,rev);await db.deleteMemory(album.id,rev);await media.deleteAssetPermanently('memory-photo');
  return {guard,hidden,kept,protectedPhoto,restored:restored.items[0].text,conflict,gone:(await db.listMemories(true)).length===0};
 });assert.match(result.guard,/回收站/);assert.ok(result.hidden&&result.kept&&result.gone);assert.match(result.protectedPhoto,/回忆/);assert.equal(result.restored,'这一刻');assert.match(result.conflict,/另一窗口/);console.log('PASS memory recycle/restore/conflict and photo protection until permanent deletion');
}finally{await browser.close();}
