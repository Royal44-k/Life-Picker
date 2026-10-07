import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:5173',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?view=journal&new');await page.getByLabel('随心记文字').fill('自己的原话需要可靠地留下。');
 await page.getByRole('button',{name:'摘一句原话',exact:true}).click();await page.getByRole('button',{name:'选择原句：自己的原话需要可靠地留下。',exact:true}).click();
 async function failOnce(store){await page.evaluate(name=>{const original=IDBDatabase.prototype.transaction;let fail=true;IDBDatabase.prototype.transaction=function(names,mode,...args){const tx=original.call(this,names,mode,...args);if(fail&&mode==='readwrite'&&[].concat(names).includes(name)){fail=false;queueMicrotask(()=>tx.abort());}return tx;};},store);}
 await failOnce('journals');await page.getByRole('button',{name:'收进原话簿',exact:true}).click();await page.getByRole('dialog').getByRole('alert').waitFor();
 assert.equal(await page.getByRole('dialog').count(),1);assert.ok((await page.locator('.quote-selection').innerText()).includes('自己的原话需要可靠地留下。'));
 await page.getByRole('button',{name:'收进原话簿',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('link',{name:'原话簿 · 本页 1 句',exact:true}).click();await page.getByTestId('quote-card').waitFor();
 await failOnce('journals');await page.getByRole('button',{name:/移除原话：/}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByTestId('quote-card').count(),1);assert.equal(await page.getByRole('button',{name:'撤销移除原话',exact:true}).count(),0);
 // Another tab changes the source revision. A stale remove must not overwrite it.
 await page.evaluate(async()=>{const db=await import('/src/journal/database.ts'),entry=(await db.listEntries())[0];await db.saveEntry({...entry,text:entry.text+'\n另一窗口新增的内容。'},entry.revision);});
 await page.getByRole('button',{name:/移除原话：/}).click();await page.getByText(/另一窗口已更新/).waitFor();assert.equal(await page.getByTestId('quote-card').count(),1);
 await page.getByRole('button',{name:'重新读取原话',exact:true}).click();await page.getByText('已重新读取本机原话。',{exact:true}).waitFor();
 await page.getByRole('button',{name:/选择原话：/}).click();await page.getByRole('button',{name:'整理为新作品',exact:true}).click();await page.getByLabel('原话公开文案').fill('我继续补写了公开文案。');
 await failOnce('stories');await page.getByRole('button',{name:'另存到创作工作台',exact:true}).click();await page.getByRole('dialog').getByRole('alert').waitFor();assert.equal(await page.getByLabel('原话公开文案').inputValue(),'我继续补写了公开文案。');
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'下载当前文案',exact:true}).click();assert.ok((await dl).suggestedFilename().endsWith('.txt'));
 // An external deletion while the composition is open blocks publication but retains edits.
 await page.evaluate(async()=>{const db=await import('/src/journal/database.ts'),entry=(await db.listEntries())[0];await db.trashEntry(entry.id,entry.revision);});
 await page.getByRole('button',{name:'另存到创作工作台',exact:true}).click();await page.getByText(/所选原话或原记录已变化/).waitFor();assert.equal(await page.getByLabel('原话公开文案').inputValue(),'我继续补写了公开文案。');
 let asked=false;page.once('dialog',async d=>{asked=true;await d.dismiss();});await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();assert.equal(asked,true);assert.equal(await page.getByLabel('原话公开文案').count(),1);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 const stored=await page.evaluate(async()=>{const j=await import('/src/journal/database.ts'),s=await import('/src/studio/database.ts');return {entries:await j.listEntries(true),stories:await s.allStories()};});
 assert.equal(stored.entries[0].quotes.length,1);assert.ok(stored.entries[0].text.includes('另一窗口新增'));assert.equal(stored.stories.length,0);assert.deepEqual(errors,[]);
 console.log('PASS failed capture/remove/story saves retain input; revision conflict reloads; stale source cannot publish; edited composition close is guarded');
}finally{await browser.close();}
