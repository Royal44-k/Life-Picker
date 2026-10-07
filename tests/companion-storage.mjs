import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true}),base=process.env.TEST_URL||'http://localhost:5182';
try{
 const page=await browser.newPage();await page.goto(base+'/?view=companion');await page.getByRole('button',{name:'预览装扮：晴空蓝'}).waitFor();
 const result=await page.evaluate(async()=>{
  const s=await import('/src/journal/companion-store.ts'),d=await import('/src/studio/database.ts'),j=await import('/src/journal/database.ts'),m=await import('/src/journal/model.ts'),q=await import('/src/journal/quotes.ts');
  const first={...m.newEntry('2026-10-07'),text:'我留下自己的声音。'};first.revision=await j.saveEntry(first,0);const p=await s.syncCompanion();const sky=await s.saveAppearance('sky',p.revision);
  let conflict='';try{await s.saveAppearance('leaf',p.revision);}catch(e){conflict=e.message;}
  const quoted=q.addQuote(first,'自己的声音');quoted.revision=await j.saveEntry(quoted,first.revision);const earned=await s.syncCompanion();
  const next={...m.newEntry('2026-09-03'),revision:1,text:'新恢复的一页。'},incoming={...earned,appearance:'star',earned:[...earned.earned,'memory']};
  let collision='';try{await j.importJournalData({entries:[next,quoted],memories:[],assets:[],companion:incoming});}catch(e){collision=e.message;}
  const rolled=await s.readCompanion(),rowsAfterCollision=await j.listEntries();
  const original=IDBObjectStore.prototype.put;let inject=true;IDBObjectStore.prototype.put=function(value,...args){const r=original.call(this,value,...args);if(inject&&this.name==='meta'&&value.id===s.COMPANION_KEY){inject=false;queueMicrotask(()=>this.transaction.abort());}return r;};
  let failure='';try{await s.saveAppearance('blossom',earned.revision);}catch(e){failure=e.message;}finally{IDBObjectStore.prototype.put=original;}
  const afterFailure=await s.readCompanion();
  const corrupt=await d.openDB(),tx=corrupt.transaction('meta','readwrite');tx.objectStore('meta').put({id:s.COMPANION_KEY,profile:{bad:true}});await d.finish(corrupt,tx,()=>undefined);
  let corruptError='';try{await j.importJournalData({entries:[next],memories:[],assets:[],companion:incoming});}catch(e){corruptError=e.message;}
  const rowsAfterCorrupt=await j.listEntries();
  const repair=await d.openDB(),t=repair.transaction('meta','readwrite');t.objectStore('meta').put({id:s.COMPANION_KEY,profile:earned});await d.finish(repair,t,()=>undefined);
  await j.importJournalData({entries:[next],memories:[],assets:[],companion:incoming});const merged=await s.readCompanion();
  await j.trashEntry(first.id,quoted.revision);await s.syncCompanion();const kept=await s.readCompanion();
  return {conflict,collision,rolled,earned,rowsAfterCollision:rowsAfterCollision.length,failure,afterFailure,corruptError,rowsAfterCorrupt:rowsAfterCorrupt.length,merged,kept,sky};
 });
 assert.match(result.conflict,/另一窗口/);assert.match(result.collision,/冲突/);assert.deepEqual(result.rolled,result.earned);assert.equal(result.rowsAfterCollision,1);assert.match(result.failure,/中断/);assert.deepEqual(result.afterFailure,result.earned);assert.match(result.corruptError,/格式无效/);assert.equal(result.rowsAfterCorrupt,1);assert.equal(result.merged.appearance,'sky');assert.ok(result.merged.earned.includes('memory'));assert.ok(result.kept.earned.includes('quote'));assert.equal(result.kept.appearance,'sky');
 console.log('PASS companion revision conflicts, failed writes, genuine awards, non-revocation, atomic restore/collision/corrupt metadata and local appearance preservation');
}finally{await browser.close();}
