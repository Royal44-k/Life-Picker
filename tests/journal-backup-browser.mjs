import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://localhost:5173');await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 const result=await page.evaluate(async()=>{
  const m=await import('/src/journal/model.ts'),b=await import('/src/journal/backup.ts'),db=await import('/src/journal/database.ts'),media=await import('/src/studio/database.ts');
  const canvas=document.createElement('canvas');canvas.width=20;canvas.height=30;const ctx=canvas.getContext('2d');ctx.fillStyle='#71a899';ctx.fillRect(0,0,20,30);const blob=await new Promise(r=>canvas.toBlob(r));
  const asset={id:'photo-one',name:'one.png',type:'image/png',width:20,height:30,bytes:blob.size,blob,createdAt:1};
  const first=m.newEntry('2026-09-28');first.text='第一条';first.assetIds=[asset.id];const second=m.newEntry('2026-09-29');second.text='后来的更新';second.followUpTo=first.id;
  const memory=m.newMemory('一段回忆',[first,second]);const zip=await b.makeJournalBundle([first,second],[memory],async()=>asset);const restored=b.restoreJournalIdentity(b.readJournalBundle(new Uint8Array(await zip.arrayBuffer())));await db.importJournalData(restored);
  const entries=await db.listEntries(),memories=await db.listMemories(),savedPhoto=await media.getAsset(restored.assets[0].id);const sameBytes=JSON.stringify([...new Uint8Array(await savedPhoto.blob.arrayBuffer())])===JSON.stringify([...new Uint8Array(await blob.arrayBuffer())]);
  const extra=m.newEntry('2026-09-30');extra.text='这条不应该部分写入';let conflict='';try{await db.importJournalData({...restored,entries:[extra,...restored.entries]});}catch(e){conflict=e.message;}
  const leaked=(await db.listEntries()).some(e=>e.id===extra.id);
  const invalid=b.restoreJournalIdentity(b.readJournalBundle(new Uint8Array(await zip.arrayBuffer())));invalid.assets[0].width=99;let badPhoto='';try{await db.importJournalData(invalid);}catch(e){badPhoto=e.message;}
  return {entries,memories,sameBytes,conflict,leaked,badPhoto,count:(await db.listEntries()).length};
 });
 assert.equal(result.entries.length,2);assert.equal(result.memories.length,1);assert.ok(result.sameBytes);assert.equal(result.entries.find(e=>e.text==='后来的更新').followUpTo,result.entries.find(e=>e.text==='第一条').id);assert.match(result.conflict,/冲突/);assert.equal(result.leaked,false);assert.match(result.badPhoto,/尺寸/);assert.equal(result.count,2);
 console.log('PASS journal/photo/memory backup restores real bytes and references; conflicting or corrupt imports write nothing');
}finally{await browser.close();}
