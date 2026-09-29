import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://localhost:5173');await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 const result=await page.evaluate(async()=>{
  const db=await import('/src/studio/database.ts'),j=await import('/src/journal/database.ts'),m=await import('/src/journal/model.ts');
  const canvas=document.createElement('canvas');canvas.width=10;canvas.height=10;const blob=await new Promise(r=>canvas.toBlob(r));const photo={id:'journal-photo',name:'sky.png',type:'image/png',width:10,height:10,bytes:blob.size,blob,createdAt:1};await db.putAsset(photo);
  const entry=m.newEntry('2026-09-29');entry.text='写下今天的真实经历';entry.assetIds=[photo.id];const revision=await j.saveEntry(entry,0);
  let conflict='';try{await j.saveEntry({...entry,text:'另一个窗口的旧修改'},0);}catch(e){conflict=e.message;}
  const loaded=(await j.listEntries())[0];await db.trashAsset(photo.id);let protectedByEntry='';try{await db.deleteAssetPermanently(photo.id);}catch(e){protectedByEntry=e.message;}
  const album=m.newMemory('我的一天',[loaded]);await j.saveMemory(album,0);await j.trashEntry(entry.id,revision);
  const hidden=(await j.listEntries()).length===0;let protectedByTrashedEntry='';try{await db.deleteAssetPermanently(photo.id);}catch(e){protectedByTrashedEntry=e.message;}
  const removed=(await j.listEntries(true))[0];await j.deleteEntryPermanently(removed.id,removed.revision);
  let protectedByMemory='';try{await db.deleteAssetPermanently(photo.id);}catch(e){protectedByMemory=e.message;}
  const memories=await j.listMemories();await j.deleteMemory(memories[0].id,memories[0].revision);await db.deleteAssetPermanently(photo.id);
  const gone=!(await db.getAsset(photo.id));const invalid=m.newEntry('2026-09-29');invalid.text='缺图';invalid.assetIds=[photo.id];let missing='';try{await j.saveEntry(invalid,0);}catch(e){missing=e.name;}
  return {revision,conflict,loaded,protectedByEntry,hidden,protectedByTrashedEntry,protectedByMemory,gone,missing,entries:(await j.listEntries()).length};
 });
 assert.equal(result.revision,1);assert.match(result.conflict,/另一窗口/);assert.equal(result.loaded.text,'写下今天的真实经历');assert.match(result.protectedByEntry,/随心记/);assert.ok(result.hidden);assert.match(result.protectedByTrashedEntry,/随心记/);assert.match(result.protectedByMemory,/回忆/);assert.ok(result.gone);assert.equal(result.missing,'MissingAssetError');assert.equal(result.entries,0);
 console.log('PASS journals/memories transactions, revision conflicts, recycle references and missing-photo refusal');
}finally{await browser.close();}
